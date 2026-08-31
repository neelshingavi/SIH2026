import 'package:uuid/uuid.dart';
import 'package:drift/drift.dart';
import '../db/database.dart';

abstract class BaseRepository {
  final AppDatabase db;
  final Uuid uuid = const Uuid();

  BaseRepository(this.db);

  Future<void> saveResourceAtomically({
    required String id,
    required String resourceType,
    required String jsonPayload,
    required String createdBy,
    required String deviceId,
    required String facilityId,
    String operation = 'CREATE',
  }) async {
    await db.transaction(() async {
      // 1. Upsert LocalResource
      final existing = await (db.select(db.localResources)..where((t) => t.id.equals(id))).getSingleOrNull();
      int version = existing != null ? existing.versionId + 1 : 1;

      await db.into(db.localResources).insert(
        LocalResourcesCompanion.insert(
          id: id,
          resourceType: resourceType,
          jsonPayload: jsonPayload,
          versionId: Value(version),
          syncStatus: const Value('PENDING'),
          createdBy: Value(createdBy),
          deviceId: Value(deviceId),
          facilityId: Value(facilityId),
          isDeleted: Value(operation == 'DELETE'),
        ),
        mode: InsertMode.insertOrReplace,
      );

      // 2. Queue SyncOperation
      final opId = uuid.v4();
      final idempotencyKey = uuid.v4();

      await db.into(db.syncOperations).insert(
        SyncOperationsCompanion.insert(
          id: opId,
          resourceId: id,
          resourceType: resourceType,
          operation: operation,
          idempotencyKey: idempotencyKey,
        ),
      );
    });
  }
}
