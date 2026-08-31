import 'dart:io';
import 'dart:convert';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:crypto/crypto.dart';

part 'database.g.dart';

// ---------------------------------------------------------------------------
// TABLES
// ---------------------------------------------------------------------------

@TableIndex(name: 'idx_resource_type', columns: {#resourceType})
@TableIndex(name: 'idx_sync_status', columns: {#syncStatus})
@TableIndex(name: 'idx_resource_updated', columns: {#updatedAt})
class LocalResources extends Table {
  /// FHIR resource ID (e.g. Patient/uuid)
  TextColumn get id => text()();

  /// FHIR resourceType (Patient, Encounter, …)
  TextColumn get resourceType => text()();

  /// Full FHIR JSON payload
  TextColumn get jsonPayload => text()();

  /// Local version counter (incremented on every mutation)
  IntColumn get versionId => integer().withDefault(const Constant(1))();

  /// The server's versionId at the last successful sync
  IntColumn get lastSyncedVersionId => integer().nullable()();

  /// Sync lifecycle: PENDING | SYNCED | CONFLICT | FAILED | DELETED
  TextColumn get syncStatus =>
      text().withDefault(const Constant('PENDING'))();

  /// Detailed conflict state: null | CONFLICT_REQUIRES_REVIEW
  TextColumn get conflictState => text().nullable()();

  /// Server resource JSON at the time of conflict (for side-by-side review)
  TextColumn get conflictPayload => text().nullable()();

  /// Last error message from sync attempt
  TextColumn get lastSyncError => text().nullable()();

  /// When this resource was first created locally
  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// When this resource was last modified locally
  DateTimeColumn get updatedAt =>
      dateTime().withDefault(currentDateAndTime)();

  /// When this resource was last successfully synced to the server
  DateTimeColumn get lastSyncedAt => dateTime().nullable()();

  /// Who created this resource (Practitioner reference)
  TextColumn get createdBy => text().nullable()();

  /// Stable device identifier (UUID persisted in secure storage)
  TextColumn get deviceId => text().nullable()();

  /// Facility scope (from authenticated user context)
  TextColumn get facilityId => text().nullable()();

  /// Soft-delete / tombstone flag
  BoolColumn get isDeleted =>
      boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(
    name: 'idx_sync_op_status_retry',
    columns: {#status, #nextRetryTimestamp})
@TableIndex(name: 'idx_sync_op_resource', columns: {#resourceId})
class SyncOperations extends Table {
  /// Unique operation ID (UUID)
  TextColumn get id => text()();

  /// Foreign key → LocalResources.id
  TextColumn get resourceId => text()();

  TextColumn get resourceType => text()();

  /// CREATE | UPDATE | DELETE
  TextColumn get operation => text()();

  /// Stable idempotency key: sha256(resourceId + operation + facilityId)
  TextColumn get idempotencyKey => text()();

  /// Device that queued this operation
  TextColumn get deviceId => text().nullable()();

  DateTimeColumn get createdAt =>
      dateTime().withDefault(currentDateAndTime)();

  IntColumn get retryCount =>
      integer().withDefault(const Constant(0))();

  DateTimeColumn get nextRetryTimestamp =>
      dateTime().withDefault(currentDateAndTime)();

  /// PENDING | FAILED | COMPLETED | CONFLICT
  TextColumn get status =>
      text().withDefault(const Constant('PENDING'))();

  TextColumn get lastError => text().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

// ---------------------------------------------------------------------------
// DATABASE
// ---------------------------------------------------------------------------

@DriftDatabase(tables: [LocalResources, SyncOperations])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  AppDatabase.forTesting(QueryExecutor executor) : super(executor);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
        },
        onUpgrade: (m, from, to) async {
          if (from < 2) {
            // Add columns introduced in schema v2
            await m.addColumn(
                localResources, localResources.lastSyncedVersionId);
            await m.addColumn(localResources, localResources.lastSyncedAt);
            await m.addColumn(localResources, localResources.conflictState);
            await m.addColumn(localResources, localResources.conflictPayload);
            await m.addColumn(localResources, localResources.lastSyncError);
            await m.addColumn(syncOperations, syncOperations.deviceId);
          }
        },
        beforeOpen: (details) async {
          await customStatement('PRAGMA foreign_keys = ON');
          await customStatement('PRAGMA journal_mode = WAL');
        },
      );

  // ---------------------------------------------------------------------------
  // QUERY HELPERS
  // ---------------------------------------------------------------------------

  /// Returns operations that are due for processing (PENDING or FAILED with
  /// nextRetryTimestamp <= now), ordered by creation time (dependencies first).
  Future<List<SyncOperation>> getPendingOperations() {
    final now = DateTime.now();
    return (select(syncOperations)
          ..where((t) =>
              (t.status.equals('PENDING') | t.status.equals('FAILED')) &
              t.nextRetryTimestamp.isSmallerOrEqualValue(now))
          ..orderBy([
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.asc)
          ]))
        .get();
  }

  Future<List<SyncOperation>> getConflictingOperations() {
    return (select(syncOperations)
          ..where((t) => t.status.equals('CONFLICT'))
          ..orderBy([
            (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc)
          ]))
        .get();
  }

  Future<int> getPendingCount() async {
    final ops = await getPendingOperations();
    return ops.length;
  }

  Future<int> getSyncedCount() async {
    final rows = await (select(localResources)
          ..where((t) => t.syncStatus.equals('SYNCED')))
        .get();
    return rows.length;
  }

  Future<int> getConflictCount() async {
    final ops = await getConflictingOperations();
    return ops.length;
  }

  Future<void> markOperationFailed(
      String id, String error, int currentRetryCount) {
    // Exponential backoff capped at 1 hour: 2^retryCount * 5 seconds
    final delaySeconds = (1 << currentRetryCount) * 5;
    final cappedDelay = delaySeconds > 3600 ? 3600 : delaySeconds;
    final nextRetry = DateTime.now().add(Duration(seconds: cappedDelay));

    return (update(syncOperations)..where((t) => t.id.equals(id))).write(
      SyncOperationsCompanion(
        status: const Value('FAILED'),
        lastError: Value(error),
        retryCount: Value(currentRetryCount + 1),
        nextRetryTimestamp: Value(nextRetry),
      ),
    );
  }

  Future<void> markOperationCompleted(String opId, String resourceId) async {
    final now = DateTime.now();
    await transaction(() async {
      await (update(syncOperations)..where((t) => t.id.equals(opId))).write(
        const SyncOperationsCompanion(status: Value('COMPLETED')),
      );
      await (update(localResources)
            ..where((t) => t.id.equals(resourceId)))
          .write(
        LocalResourcesCompanion(
          syncStatus: const Value('SYNCED'),
          lastSyncedAt: Value(now),
        ),
      );
    });
  }

  Future<void> markOperationConflict(
      String opId, String resourceId, String? serverPayload) async {
    await transaction(() async {
      await (update(syncOperations)..where((t) => t.id.equals(opId))).write(
        const SyncOperationsCompanion(status: Value('CONFLICT')),
      );
      await (update(localResources)
            ..where((t) => t.id.equals(resourceId)))
          .write(
        LocalResourcesCompanion(
          syncStatus: const Value('CONFLICT'),
          conflictState: const Value('CONFLICT_REQUIRES_REVIEW'),
          conflictPayload: Value(serverPayload),
        ),
      );
    });
  }

  /// Upsert a resource received from the server during pull.
  Future<void> upsertFromServer({
    required String id,
    required String resourceType,
    required String jsonPayload,
    required int serverVersionId,
  }) async {
    await into(localResources).insertOnConflictUpdate(
      LocalResourcesCompanion.insert(
        id: id,
        resourceType: resourceType,
        jsonPayload: jsonPayload,
        versionId: Value(serverVersionId),
        lastSyncedVersionId: Value(serverVersionId),
        syncStatus: const Value('SYNCED'),
        lastSyncedAt: Value(DateTime.now()),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Deterministic idempotency key
// ---------------------------------------------------------------------------

/// Generates a stable idempotency key from (resourceId + operation + facilityId).
/// The same inputs always produce the same key, so retries are safe.
String buildIdempotencyKey(
    String resourceId, String operation, String facilityId) {
  final input = '$resourceId:$operation:$facilityId';
  final bytes = utf8.encode(input);
  final digest = sha256.convert(bytes);
  return digest.toString();
}

// ---------------------------------------------------------------------------
// CONNECTION
// ---------------------------------------------------------------------------

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'setu_local.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
