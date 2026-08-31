import 'package:frontline_app/db/database.dart';
import 'package:frontline_app/repositories/base_repository.dart';

class ConsentRepository extends BaseRepository {
  ConsentRepository(AppDatabase db) : super(db);

  Future<void> recordConsent({
    required String patientId,
    required String purpose,
    required String facilityId,
    required String createdBy,
    required String deviceId,
    required String operation,
  }) async {
    final consentId = 'Consent-\${DateTime.now().millisecondsSinceEpoch}';
    final payload = '''
    {
      "resourceType": "Consent",
      "id": "\$consentId",
      "status": "active",
      "patient": { "reference": "Patient/\$patientId" },
      "organization": [{ "reference": "Organization/\$facilityId" }],
      "provision": {
        "type": "permit",
        "purpose": [{ "code": "\$purpose" }]
      }
    }
    ''';
    await writeResourceWithSyncQueue(
      id: consentId,
      resourceType: 'Consent',
      jsonPayload: payload,
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
      operation: operation,
    );
  }

  Future<void> revokeConsent({
    required String consentId,
    required String createdBy,
    required String deviceId,
    required String facilityId,
  }) async {
    // In a full implementation, we'd pull the existing resource and modify its status.
    // For this prototype, we'll queue a DELETE or UPDATE operation.
    await writeResourceWithSyncQueue(
      id: consentId,
      resourceType: 'Consent',
      jsonPayload: '{"resourceType":"Consent","id":"\$consentId","status":"inactive"}',
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
      operation: 'UPDATE',
    );
  }
}
