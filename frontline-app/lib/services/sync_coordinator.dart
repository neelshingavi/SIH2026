import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';
import '../db/database.dart';
import 'auth_service.dart';

class SyncCoordinator {
  final AppDatabase db;
  final AuthService auth = AuthService();
  final String baseUrl = 'http://localhost:3001';
  final String syncUrl = 'http://localhost:3001/sync/push';
  final String pullUrl = 'http://localhost:3001/sync/pull';

  SyncCoordinator(this.db);

  bool _isSyncing = false;

  void startListening() {
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> result) {
      if (result.contains(ConnectivityResult.mobile) || result.contains(ConnectivityResult.wifi)) {
        syncNow();
      }
    });
  }

  Future<bool> _isBackendReachable() async {
    try {
      final response = await http.get(Uri.parse('\$baseUrl/health')).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final connectivityResult = await Connectivity().checkConnectivity();
      if (connectivityResult.contains(ConnectivityResult.none)) {
        return; // Offline
      }

      if (!(await _isBackendReachable())) {
        return; // Network is up, but backend is down
      }

      final token = await auth.getToken();
      if (token == null) {
        return; // Not logged in
      }

      // 1. Fetch pending operations due for retry
      final operations = await db.getPendingOperations();
      if (operations.isEmpty) return;

      final batch = <Map<String, dynamic>>[];

      for (var op in operations) {
        final resource = await (db.select(db.localResources)..where((t) => t.id.equals(op.resourceId))).getSingleOrNull();
        if (resource != null) {
          batch.add({
            'operationId': op.id,
            'operation': op.operation,
            'idempotencyKey': op.idempotencyKey,
            'resource': {
              'id': resource.id,
              'resourceType': resource.resourceType,
              'json': resource.jsonPayload,
              'versionId': resource.versionId,
              'updatedAt': resource.updatedAt.toIso8601String(),
              'createdBy': resource.createdBy,
              'deviceId': resource.deviceId,
              'facilityId': resource.facilityId,
              'isDeleted': resource.isDeleted,
            }
          });
        }
      }

      if (batch.isEmpty) return;

      final requestId = const Uuid().v4();

      // 2. Send to backend
      final response = await http.post(
        Uri.parse(syncUrl),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer \$token',
          'X-Request-ID': requestId,
        },
        body: jsonEncode(batch),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final Map<String, dynamic> responseBody = jsonDecode(response.body);
        final List<dynamic> results = responseBody['results'] ?? [];

        // 3. Process results per operation
        for (var res in results) {
          final opId = res['operationId'];
          final status = res['status'];
          final resourceId = res['resourceId'];

          if (status == 'APPLIED' || status == 'ALREADY_APPLIED') {
            await db.markOperationCompleted(opId, resourceId);
          } else if (status == 'CONFLICT') {
            await db.markOperationConflict(opId, resourceId);
          } else {
            // Other errors - apply exponential backoff
            final op = operations.firstWhere((o) => o.id == opId);
            await db.markOperationFailed(opId, status, op.retryCount);
          }
        }
      } else {
        // Request failure - apply exponential backoff to all
        for (var op in operations) {
          await db.markOperationFailed(op.id, 'HTTP \${response.statusCode}', op.retryCount);
        }
      }

      // 4. Implement basic pull
      await _pullData();

    } catch (e) {
      print('Sync failed: \$e');
      // If network failed entirely during request, apply backoff
      final operations = await db.getPendingOperations();
      for (var op in operations) {
        await db.markOperationFailed(op.id, 'Network exception', op.retryCount);
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _pullData() async {
    try {
      final response = await http.get(Uri.parse('\$pullUrl?since=2020-01-01T00:00:00Z'));
      if (response.statusCode == 200) {
        // stub
      }
    } catch (e) {
      print('Pull failed: \$e');
    }
  }
}

