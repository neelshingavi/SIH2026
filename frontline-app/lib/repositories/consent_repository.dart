import 'package:frontline_app/db/database.dart';
import 'package:frontline_app/repositories/base_repository.dart';

/// Phase 8: Offline Consent clearly distinguishes LOCAL from CENTRAL.
/// Phase 10: Stores proper FHIR R4 Consent with period, purpose, and scope.
/// Phase 9: revokeConsent records audit-ready revocation.
class ConsentRepository extends BaseRepository {
  ConsentRepository(AppDatabase db) : super(db);

  /// Records consent with explicit FHIR R4 structure including period, purpose, and scope.
  Future<void> recordConsent({
    required String patientId,
    required String purpose,
    required String facilityId,
    required String createdBy,
    required String deviceId,
    required String operation,
    List<String>? resourceScope,
    DateTime? expiresAt,
  }) async {
    final consentId = 'Consent-${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now().toIso8601String();
    final expires = (expiresAt ?? DateTime.now().add(const Duration(days: 7))).toIso8601String();

    // Phase 10: Proper FHIR R4 Consent resource
    // Phase 8: consentVerification set to LOCAL to distinguish from CENTRAL ABDM consent
    final scopeData = (resourceScope ?? ['Patient', 'Observation', 'Condition', 'RiskAssessment', 'CarePlan', 'ServiceRequest'])
        .map((rt) => '{"meaning":"related","reference":{"type":"$rt"}}')
        .join(',');

    final payload = '''
{
  "resourceType": "Consent",
  "id": "$consentId",
  "status": "active",
  "scope": {
    "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": "patient-privacy" }]
  },
  "category": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "code": "INFA" }] }],
  "patient": { "reference": "Patient/$patientId" },
  "dateTime": "$now",
  "performer": [{ "reference": "$createdBy" }],
  "organization": [{ "reference": "Organization/$facilityId" }],
  "sourceAttachment": { "title": "LOCAL CONSENT RECORDED — Pending Central Verification" },
  "verification": [{ "verified": false, "verifiedWith": { "reference": "$createdBy" }, "verificationDate": "$now" }],
  "provision": {
    "type": "permit",
    "period": { "start": "$now", "end": "$expires" },
    "purpose": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason", "code": "$purpose" }],
    "data": [$scopeData]
  },
  "meta": { "lastUpdated": "$now", "_tag": "LOCAL_CONSENT" }
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

  /// Phase 9: Revoke consent — marks status inactive and records who revoked it.
  Future<void> revokeConsent({
    required String consentId,
    required String createdBy,
    required String deviceId,
    required String facilityId,
    String reason = 'Patient requested revocation',
  }) async {
    final now = DateTime.now().toIso8601String();
    // Phase 9: Status = inactive, keep historical record, do not delete
    final payload = '''
{
  "resourceType": "Consent",
  "id": "$consentId",
  "status": "inactive",
  "sourceAttachment": { "title": "REVOKED at $now by $createdBy. Reason: $reason" },
  "meta": { "lastUpdated": "$now" }
}
''';
    await writeResourceWithSyncQueue(
      id: consentId,
      resourceType: 'Consent',
      jsonPayload: payload,
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
      operation: 'UPDATE',
    );
  }
}
