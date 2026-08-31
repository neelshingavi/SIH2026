import 'dart:convert';
import 'package:frontline_app/db/database.dart';
import 'package:uuid/uuid.dart';

class OfflineInventoryService {
  final AppDatabase db;

  OfflineInventoryService(this.db);

  // Sync inventory from backend (Called by SyncCoordinator)
  Future<void> saveInventoryCache(String facilityId, List<dynamic> inventoryData) async {
    final payload = jsonEncode(inventoryData);
    
    await db.into(db.localResources).insertOnConflictUpdate(
      LocalResourcesCompanion.insert(
        id: 'inventory_$facilityId',
        resourceType: 'InventoryCache',
        jsonPayload: payload,
        syncStatus: 'SYNCED', // It's just a local read-model
      )
    );
  }

  // Get locally cached inventory
  Future<List<dynamic>> getCachedInventory(String facilityId) async {
    final query = db.select(db.localResources)..where((t) => t.id.equals('inventory_$facilityId'));
    final result = await query.getSingleOrNull();

    if (result != null) {
      return jsonDecode(result.jsonPayload);
    }
    return [];
  }

  // Create an offline MedicationRequest
  Future<void> requestMedication(String patientId, String patientName, String medicationCode, String medicationName) async {
    final uuid = const Uuid().v4();
    final fhirResource = {
      'resourceType': 'MedicationRequest',
      'id': uuid,
      'status': 'active',
      'intent': 'order',
      'subject': {'reference': 'Patient/$patientId', 'display': patientName},
      'medicationCodeableConcept': {
        'coding': [{'system': 'http://snomed.info/sct', 'code': medicationCode, 'display': medicationName}],
        'text': medicationName
      },
      'authoredOn': DateTime.now().toIso8601String(),
    };

    // Save to local SQLite
    await db.into(db.localResources).insert(
      LocalResourcesCompanion.insert(
        id: uuid,
        resourceType: 'MedicationRequest',
        jsonPayload: jsonEncode(fhirResource),
        syncStatus: 'PENDING',
      )
    );

    // Queue for sync
    final opId = const Uuid().v4();
    await db.into(db.syncOperations).insert(
      SyncOperationsCompanion.insert(
        id: opId,
        resourceId: uuid,
        resourceType: 'MedicationRequest',
        operation: 'CREATE',
        idempotencyKey: const Uuid().v4(),
      )
    );
  }

  // Create an offline ServiceRequest (Diagnostics)
  Future<void> requestDiagnostic(String patientId, String patientName, String testCode, String testName) async {
    final uuid = const Uuid().v4();
    final fhirResource = {
      'resourceType': 'ServiceRequest',
      'id': uuid,
      'status': 'active',
      'intent': 'order',
      'subject': {'reference': 'Patient/$patientId', 'display': patientName},
      'code': {
        'coding': [{'system': 'http://loinc.org', 'code': testCode, 'display': testName}],
        'text': testName
      },
      'authoredOn': DateTime.now().toIso8601String(),
    };

    // Save to local SQLite
    await db.into(db.localResources).insert(
      LocalResourcesCompanion.insert(
        id: uuid,
        resourceType: 'ServiceRequest',
        jsonPayload: jsonEncode(fhirResource),
        syncStatus: 'PENDING',
      )
    );

    // Queue for sync
    final opId = const Uuid().v4();
    await db.into(db.syncOperations).insert(
      SyncOperationsCompanion.insert(
        id: opId,
        resourceId: uuid,
        resourceType: 'ServiceRequest',
        operation: 'CREATE',
        idempotencyKey: const Uuid().v4(),
      )
    );
  }
}
