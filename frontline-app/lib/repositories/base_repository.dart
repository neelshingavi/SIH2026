import 'package:drift/drift.dart';
import '../db/database.dart';
import 'package:uuid/uuid.dart';

abstract class BaseRepository {
  final AppDatabase db;
  final Uuid _uuid = const Uuid();

  BaseRepository(this.db);

  /// Atomically writes a FHIR resource AND its sync queue entry.
  ///
  /// Idempotency key is deterministic: sha256(resourceId:operation:facilityId).
  /// This means retrying the same logical operation always uses the SAME key,
  /// ensuring the backend can detect duplicate submissions.
  Future<void> writeResourceWithSyncQueue({
    required String id,
    required String resourceType,
    required String jsonPayload,
    required String createdBy,
    required String deviceId,
    required String facilityId,
    String operation = 'CREATE',
  }) async {
    // Build deterministic idempotency key from stable inputs
    final idemKey = buildIdempotencyKey(id, operation, facilityId);

    await db.transaction(() async {
      // 1. Read existing version if present
      final existing = await (db.select(db.localResources)
            ..where((t) => t.id.equals(id)))
          .getSingleOrNull();
      final newVersion = existing != null ? existing.versionId + 1 : 1;

      // 2. Upsert LocalResource
      await db.into(db.localResources).insert(
        LocalResourcesCompanion.insert(
          id: id,
          resourceType: resourceType,
          jsonPayload: jsonPayload,
          versionId: Value(newVersion),
          syncStatus: const Value('PENDING'),
          createdBy: Value(createdBy),
          deviceId: Value(deviceId),
          facilityId: Value(facilityId),
          isDeleted: Value(operation == 'DELETE'),
        ),
        mode: InsertMode.insertOrReplace,
      );

      // 3. Queue SyncOperation
      final opId = _uuid.v4();
      await db.into(db.syncOperations).insert(
        SyncOperationsCompanion.insert(
          id: opId,
          resourceId: id,
          resourceType: resourceType,
          operation: operation,
          idempotencyKey: idemKey,
          deviceId: Value(deviceId),
        ),
      );
    });
  }
}
