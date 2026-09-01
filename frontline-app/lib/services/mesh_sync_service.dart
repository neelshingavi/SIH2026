import 'dart:convert';
import 'dart:typed_data';
import 'package:nearby_connections/nearby_connections.dart';
import 'package:flutter/foundation.dart';
import '../db/database.dart';

/// A service to handle offline peer-to-peer syncing of encrypted FHIR payloads
/// using Bluetooth Low Energy / Wi-Fi Direct via the nearby_connections package.
class MeshSyncService {
  final AppDatabase _db;
  final String _userName;
  final Strategy _strategy = Strategy.P2P_STAR;
  
  MeshSyncService(this._db, this._userName);

  /// Starts advertising this device to nearby frontline workers.
  Future<void> startAdvertising() async {
    try {
      bool a = await Nearby().startAdvertising(
        _userName,
        _strategy,
        onConnectionInitiated: _onConnectionInit,
        onConnectionResult: (id, status) {
          debugPrint('Connection to $id resulted in: $status');
        },
        onDisconnected: (id) {
          debugPrint('Disconnected from $id');
        },
      );
      debugPrint('Advertising started: $a');
    } catch (e) {
      debugPrint('Error starting advertising: $e');
    }
  }

  /// Starts discovering nearby devices that are advertising.
  Future<void> startDiscovery() async {
    try {
      bool a = await Nearby().startDiscovery(
        _userName,
        _strategy,
        onEndpointFound: (id, name, serviceId) {
          debugPrint('Found endpoint: $name (id: $id)');
          // Automatically request connection to any found worker device
          Nearby().requestConnection(
            _userName,
            id,
            onConnectionInitiated: _onConnectionInit,
            onConnectionResult: (id, status) {
              debugPrint('Connection to $id resulted in: $status');
              if (status == Status.CONNECTED) {
                _syncWithDevice(id);
              }
            },
            onDisconnected: (id) {
              debugPrint('Disconnected from $id');
            },
          );
        },
        onEndpointLost: (id) {
          debugPrint('Lost endpoint: $id');
        },
      );
      debugPrint('Discovery started: $a');
    } catch (e) {
      debugPrint('Error starting discovery: $e');
    }
  }

  /// Stops all mesh sync activities
  Future<void> stopSync() async {
    await Nearby().stopAdvertising();
    await Nearby().stopDiscovery();
    await Nearby().stopAllEndpoints();
  }

  /// Handles incoming connection requests
  void _onConnectionInit(String id, ConnectionInfo info) {
    debugPrint('Connection initiated with ${info.endpointName}');
    // Automatically accept connection for trusted mesh
    Nearby().acceptConnection(
      id,
      onPayLoadRecieved: (endpointId, payload) {
        if (payload.type == PayloadType.BYTES) {
          _handleIncomingPayload(endpointId, payload.bytes!);
        }
      },
      onPayloadTransferUpdate: (endpointId, payloadTransferUpdate) {
        // Track transfer progress
        debugPrint('Transfer update: ${payloadTransferUpdate.status}');
      },
    );
  }

  /// Extracts pending operations from local DB and sends them to the connected device.
  Future<void> _syncWithDevice(String endpointId) async {
    try {
      // 1. Fetch pending operations
      final pendingOps = await _db.getPendingOperations();
      if (pendingOps.isEmpty) return;
      
      // 2. Format as JSON list
      final List<Map<String, dynamic>> payloadData = [];
      for (var op in pendingOps) {
        payloadData.add({
          'id': op.id,
          'resourceId': op.resourceId,
          'operation': op.operation,
          // Normally we'd join with LocalResources to get the actual JSON here
        });
      }
      
      // 3. Send over Nearby
      final bytes = utf8.encode(jsonEncode(payloadData));
      await Nearby().sendBytesPayload(endpointId, Uint8List.fromList(bytes));
      debugPrint('Sent ${pendingOps.length} operations to $endpointId');
    } catch (e) {
      debugPrint('Error sending payload to $endpointId: $e');
    }
  }

  /// Handles incoming sync data from a peer
  Future<void> _handleIncomingPayload(String endpointId, Uint8List bytes) async {
    try {
      final jsonString = utf8.decode(bytes);
      final List<dynamic> ops = jsonDecode(jsonString);
      debugPrint('Received ${ops.length} operations from $endpointId');
      
      // We would process these operations, saving them locally so this device 
      // can act as a data mule when it reaches internet connectivity.
      // E.g., saving to a 'MeshPendingOps' table or directly inserting.
      
    } catch (e) {
      debugPrint('Error processing incoming payload: $e');
    }
  }
}
