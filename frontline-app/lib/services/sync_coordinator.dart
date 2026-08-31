import 'dart:async';
import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import '../db/database.dart';
import 'auth_service.dart';
import '../config/env.dart';

// ---------------------------------------------------------------------------
// SYNC STATUS
// ---------------------------------------------------------------------------

enum SyncStatus {
  /// No network connectivity detected
  offline,

  /// Network available, backend reachable, no pending operations
  allSynced,

  /// Actively uploading pending operations
  syncing,

  /// Network available but backend unreachable
  degraded,

  /// A sync attempt failed with an error
  syncError,

  /// One or more resources require conflict review
  conflictReview,
}

// ---------------------------------------------------------------------------
// SYNC COORDINATOR
// ---------------------------------------------------------------------------

/// Coordinates the offline-first synchronisation lifecycle.
///
/// Architecture:
///   Connectivity Monitor
///       ↓
///   SyncCoordinator (this class)
///       ↓  push
///   POST /sync/push  →  HAPI FHIR (via NestJS gateway)
///       ↓  pull
///   GET  /sync/pull?since=<watermark>  →  local upsert
class SyncCoordinator {
  final AppDatabase db;
  final AuthService _auth;
  final FlutterSecureStorage _storage;
  final Uuid _uuid;

  final String _baseUrl;
  final String _syncPushUrl;
  final String _syncPullUrl;

  static const _kLastPullWatermark = 'setu_last_pull_watermark';

  // Internal sync guard — prevents concurrent syncs
  bool _isSyncing = false;

  // Status stream
  final _statusController = StreamController<SyncStatus>.broadcast();
  Stream<SyncStatus> get statusStream => _statusController.stream;
  SyncStatus _currentStatus = SyncStatus.offline;

  SyncCoordinator(
    this.db, {
    AuthService? auth,
    FlutterSecureStorage? storage,
    Uuid? uuid,
  })  : _auth = auth ?? AuthService(),
        _storage = storage ?? const FlutterSecureStorage(),
        _uuid = uuid ?? const Uuid(),
        _baseUrl = AppConfig.gatewayBaseUrl,
        _syncPushUrl = AppConfig.syncPushUrl,
        _syncPullUrl = AppConfig.syncPullUrl;

  SyncStatus get currentStatus => _currentStatus;

  void _emit(SyncStatus status) {
    _currentStatus = status;
    if (!_statusController.isClosed) _statusController.add(status);
  }

  // ---------------------------------------------------------------------------
  // START / STOP LISTENING
  // ---------------------------------------------------------------------------

  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  void startListening() {
    _connectivitySub = Connectivity()
        .onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      final hasNetwork = results.contains(ConnectivityResult.mobile) ||
          results.contains(ConnectivityResult.wifi) ||
          results.contains(ConnectivityResult.ethernet);

      if (hasNetwork) {
        syncNow();
      } else {
        _emit(SyncStatus.offline);
      }
    });
  }

  void stopListening() {
    _connectivitySub?.cancel();
    _connectivitySub = null;
  }

  void dispose() {
    stopListening();
    _statusController.close();
  }

  // ---------------------------------------------------------------------------
  // BACKEND REACHABILITY
  // ---------------------------------------------------------------------------

  Future<bool> _isBackendReachable() async {
    try {
      final response = await http
          .get(Uri.parse('$_baseUrl/health'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // MAIN SYNC ENTRY POINT
  // ---------------------------------------------------------------------------

  Future<void> syncNow() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      // 1. Network check
      final connectivityResult = await Connectivity().checkConnectivity();
      if (connectivityResult.contains(ConnectivityResult.none)) {
        _emit(SyncStatus.offline);
        return;
      }

      // 2. Backend reachability check
      if (!await _isBackendReachable()) {
        _emit(SyncStatus.degraded);
        return;
      }

      // 3. Auth check
      final token = await _auth.getToken();
      if (token == null) {
        _emit(SyncStatus.syncError);
        return;
      }

      // 4. Push pending operations
      await _pushPending(token);

      // 5. Pull server changes
      await _pullData(token);

      // 6. Check for conflicts
      final conflictCount = await db.getConflictCount();
      if (conflictCount > 0) {
        _emit(SyncStatus.conflictReview);
      } else {
        final pendingCount = await db.getPendingCount();
        _emit(pendingCount > 0 ? SyncStatus.syncError : SyncStatus.allSynced);
      }
    } catch (_) {
      _emit(SyncStatus.syncError);
    } finally {
      _isSyncing = false;
    }
  }

  // ---------------------------------------------------------------------------
  // PUSH
  // ---------------------------------------------------------------------------

  Future<void> _pushPending(String token) async {
    final operations = await db.getPendingOperations();
    if (operations.isEmpty) return;

    _emit(SyncStatus.syncing);

    final batch = <Map<String, dynamic>>[];

    for (final op in operations) {
      final resource = await (db.select(db.localResources)
            ..where((t) => t.id.equals(op.resourceId)))
          .getSingleOrNull();
      if (resource == null) continue;

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
        },
      });
    }

    if (batch.isEmpty) return;

    final requestId = _uuid.v4();

    try {
      final response = await http
          .post(
            Uri.parse(_syncPushUrl),
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer $token',
              'X-Request-ID': requestId,
            },
            body: jsonEncode(batch),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseBody =
            jsonDecode(response.body) as Map<String, dynamic>;
        final results = (responseBody['results'] as List?) ?? [];

        for (final res in results) {
          final opId = res['operationId'] as String;
          final status = res['status'] as String;
          final resourceId = res['resourceId'] as String;
          final serverPayload = res['serverPayload'] as String?;

          switch (status) {
            case 'APPLIED':
            case 'ALREADY_APPLIED':
              await db.markOperationCompleted(opId, resourceId);
              break;
            case 'CONFLICT':
              await db.markOperationConflict(opId, resourceId, serverPayload);
              break;
            default:
              final op = operations.firstWhere((o) => o.id == opId,
                  orElse: () => operations.first);
              await db.markOperationFailed(opId, status, op.retryCount);
          }
        }
      } else {
        // HTTP-level failure — apply backoff to all operations
        for (final op in operations) {
          await db.markOperationFailed(
              op.id, 'HTTP ${response.statusCode}', op.retryCount);
        }
      }
    } catch (e) {
      // Network-level failure — apply backoff
      for (final op in operations) {
        await db.markOperationFailed(
            op.id, 'NetworkException: $e', op.retryCount);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // PULL (incremental, watermark-based)
  // ---------------------------------------------------------------------------

  Future<void> _pullData(String token) async {
    try {
      // Read last successful pull timestamp (watermark)
      final since =
          await _storage.read(key: _kLastPullWatermark) ?? '1970-01-01T00:00:00Z';

      final facilityId = await (db.select(db.localResources)
                ..where((t) => t.facilityId.isNotNull())
                ..limit(1))
              .getSingleOrNull()
              .then((r) => r?.facilityId) ??
          '';

      final uri = Uri.parse(_syncPullUrl).replace(queryParameters: {
        'since': since,
        if (facilityId.isNotEmpty) 'facilityId': facilityId,
      });

      final response = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'X-Request-ID': _uuid.v4(),
        },
      ).timeout(const Duration(seconds: 30));

      if (response.statusCode != 200) return;

      final body = jsonDecode(response.body) as Map<String, dynamic>;

      // Response is a FHIR Bundle
      final entries = (body['entry'] as List?) ?? [];

      for (final entry in entries) {
        final resource = entry['resource'] as Map<String, dynamic>?;
        if (resource == null) continue;

        final id = resource['id'] as String?;
        final resourceType = resource['resourceType'] as String?;
        if (id == null || resourceType == null) continue;

        final serverVersionId =
            int.tryParse(resource['meta']?['versionId']?.toString() ?? '') ?? 1;
        final jsonPayload = jsonEncode(resource);

        // Tombstone: if the resource was deleted on the server
        final isDeleted =
            resource['meta']?['tag']?.any((t) => t['code'] == 'deleted') ==
                true;

        if (isDeleted) {
          // Mark as DELETED locally using tombstone — do NOT erase
          await (db.update(db.localResources)
                ..where((t) => t.id.equals(id)))
              .write(const LocalResourcesCompanion(
            isDeleted: Value(true),
            syncStatus: Value('DELETED'),
          ));
        } else {
          // Upsert the server's version locally
          await db.upsertFromServer(
            id: id,
            resourceType: resourceType,
            jsonPayload: jsonPayload,
            serverVersionId: serverVersionId,
          );
        }
      }

      // Update watermark to now
      final watermark = DateTime.now().toUtc().toIso8601String();
      await _storage.write(key: _kLastPullWatermark, value: watermark);
    } catch (_) {
      // Pull failure is non-fatal — push data is safe, pull will retry
    }
  }
}
