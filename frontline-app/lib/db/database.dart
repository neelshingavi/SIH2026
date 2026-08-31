import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'database.g.dart';

@TableIndex(name: 'idx_resource_type', columns: {#resourceType})
@TableIndex(name: 'idx_sync_status', columns: {#syncStatus})
class LocalResources extends Table {
  TextColumn get id => text()(); 
  TextColumn get resourceType => text()(); 
  TextColumn get jsonPayload => text()(); 
  IntColumn get versionId => integer().withDefault(const Constant(1))();
  TextColumn get syncStatus => text().withDefault(const Constant('PENDING'))(); 
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
  TextColumn get createdBy => text().nullable()(); 
  TextColumn get deviceId => text().nullable()(); 
  TextColumn get facilityId => text().nullable()(); 
  BoolColumn get isDeleted => boolean().withDefault(const Constant(false))();

  @override
  Set<Column> get primaryKey => {id};
}

@TableIndex(name: 'idx_status_next_retry', columns: {#status, #nextRetryTimestamp})
class SyncOperations extends Table {
  TextColumn get id => text()(); 
  TextColumn get resourceId => text()(); 
  TextColumn get resourceType => text()(); 
  TextColumn get operation => text()(); 
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  DateTimeColumn get nextRetryTimestamp => dateTime().withDefault(currentDateAndTime)();
  TextColumn get status => text().withDefault(const Constant('PENDING'))(); 
  TextColumn get lastError => text().nullable()();
  TextColumn get idempotencyKey => text()(); 

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(tables: [LocalResources, SyncOperations])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  Future<List<SyncOperation>> getPendingOperations() {
    final now = DateTime.now();
    return (select(syncOperations)
      ..where((t) => (t.status.equals('PENDING') | t.status.equals('FAILED')) & t.nextRetryTimestamp.isSmallerOrEqualValue(now))
      ..orderBy([(t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.asc)]))
    .get();
  }

  Future<void> markOperationFailed(String id, String error, int currentRetryCount) {
    // Exponential backoff: 2^retryCount * 5 seconds (Max 1 hour)
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
    await transaction(() async {
      await (update(syncOperations)..where((t) => t.id.equals(opId))).write(
        const SyncOperationsCompanion(status: Value('COMPLETED')),
      );
      await (update(localResources)..where((t) => t.id.equals(resourceId))).write(
        const LocalResourcesCompanion(syncStatus: Value('SYNCED')),
      );
    });
  }

  Future<void> markOperationConflict(String opId, String resourceId) async {
    await transaction(() async {
      await (update(syncOperations)..where((t) => t.id.equals(opId))).write(
        const SyncOperationsCompanion(status: Value('FAILED'), lastError: Value('CONFLICT')),
      );
      await (update(localResources)..where((t) => t.id.equals(resourceId))).write(
        const LocalResourcesCompanion(syncStatus: Value('CONFLICT')),
      );
    });
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'setu_local_drift.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
