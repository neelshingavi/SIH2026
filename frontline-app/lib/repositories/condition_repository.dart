import 'dart:convert';
import 'base_repository.dart';

class ConditionRepository extends BaseRepository {
  ConditionRepository(super.db);

  Future<String> createCondition({
    required String id,
    required String patientId,
    required String severity,
    required String note,
    required String createdBy,
    required String deviceId,
    required String facilityId,
  }) async {
    final payload = {
      "resourceType": "Condition",
      "id": id,
      "subject": {"reference": "Patient/$patientId"},
      "severity": {"text": severity},
      "note": [{"text": note}]
    };

    await saveResourceAtomically(
      id: id,
      resourceType: 'Condition',
      jsonPayload: jsonEncode(payload),
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
    );
    return id;
  }
}
