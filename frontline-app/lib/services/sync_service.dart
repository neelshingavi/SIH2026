import 'dart:convert';
import 'package:http/http.dart' as http;
import '../db/database.dart';

import '../config/env.dart';

class SyncService {
  final String gatewayUrl = AppConfig.gatewayBaseUrl;

  Future<void> syncPendingRecords() async {
    final db = await DatabaseHelper.instance.database;
    
    // 1. Fetch pending records
    final pending = await db.query(
      'local_resources',
      where: 'sync_status = ?',
      whereArgs: ['PENDING'],
    );

    if (pending.isEmpty) return;

    // 2. Prepare payload
    final payload = pending.map((row) => {
      'id': row['id'],
      'resourceType': row['resource_type'],
      'json': row['json'],
      'versionId': row['version_id'],
      'updatedAt': row['updated_at'],
      'createdBy': row['created_by'],
    }).toList();

    try {
      // 3. Send to Gateway
      final response = await http.post(
        Uri.parse('$gatewayUrl/sync/push'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final results = jsonDecode(response.body) as List;
        
        // 4. Process results and mark as SYNCED or CONFLICT
        for (var result in results) {
          final status = result['status']; // 'ACCEPTED' or 'CONFLICT'
          final newStatus = status == 'ACCEPTED' ? 'SYNCED' : 'CONFLICT';
          final newVersion = result['serverVersion'];

          await db.update(
            'local_resources',
            {
              'sync_status': newStatus,
              'version_id': newVersion,
            },
            where: 'id = ?',
            whereArgs: [result['id']],
          );
        }
      }
    } catch (e) {
      print('Sync failed: $e');
      // Remain PENDING, will retry on next connectivity event
    }
  }

  // A helper method to save a new resource locally and trigger sync queue
  Future<void> saveLocalResource(Map<String, dynamic> fhirResource, String createdBy) async {
    final db = await DatabaseHelper.instance.database;
    
    final resourceType = fhirResource['resourceType'];
    final id = fhirResource['id'];

    await db.insert('local_resources', {
      'id': id,
      'resource_type': resourceType,
      'json': jsonEncode(fhirResource),
      'version_id': 1,
      'sync_status': 'PENDING',
      'updated_at': DateTime.now().toIso8601String(),
      'created_by': createdBy,
    });

    await db.insert('sync_queue', {
      'resource_id': id,
      'operation': 'CREATE',
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
}
