import 'package:sqflite/sqflite.dart' as sqflite;
import 'package:uuid/uuid.dart';
import '../db/database.dart';

class ResourceRepository {
  final _uuid = const Uuid();

  // Atomically writes a resource and its corresponding sync operation
  Future<void> saveResource({
    required String id,
    required String resourceType,
    required String jsonPayload,
    required String createdBy,
    String operation = 'CREATE',
  }) async {
    final db = await DatabaseHelper.instance.database;

    await db.transaction((txn) async {
      // 1. Write or update LocalResource
      final existing = await txn.query(
        'local_resources',
        where: 'id = ?',
        whereArgs: [id],
      );

      int version = 1;
      if (existing.isNotEmpty) {
        version = (existing.first['version_id'] as int) + 1;
      }

      await txn.insert(
        'local_resources',
        {
          'id': id,
          'resource_type': resourceType,
          'json': jsonPayload,
          'version_id': version,
          'sync_status': 'PENDING',
          'updated_at': DateTime.now().toIso8601String(),
          'created_by': createdBy,
          'is_deleted': operation == 'DELETE' ? 1 : 0,
        },
        conflictAlgorithm: sqflite.ConflictAlgorithm.replace,
      );

      // 2. Write SyncOperation
      final opId = _uuid.v4();
      final idempotencyKey = _uuid.v4();

      await txn.insert(
        'sync_queue',
        {
          'id': opId,
          'resource_id': id,
          'resource_type': resourceType,
          'operation': operation,
          'timestamp': DateTime.now().toIso8601String(),
          'retry_count': 0,
          'status': 'PENDING',
          'last_error': null,
          'idempotency_key': idempotencyKey,
        },
      );
    });
  }

  Future<List<Map<String, dynamic>>> getPendingOperations() async {
    final db = await DatabaseHelper.instance.database;
    return await db.query(
      'sync_queue',
      where: 'status IN (?, ?)',
      whereArgs: ['PENDING', 'FAILED'],
      orderBy: 'timestamp ASC',
    );
  }

  Future<Map<String, dynamic>?> getResource(String id) async {
    final db = await DatabaseHelper.instance.database;
    final result = await db.query(
      'local_resources',
      where: 'id = ?',
      whereArgs: [id],
    );
    if (result.isNotEmpty) return result.first;
    return null;
  }
}
