import 'dart:convert';
import 'base_repository.dart';

class ObservationRepository extends BaseRepository {
  ObservationRepository(super.db);

  Future<String> createObservation({
    required String id,
    required String patientId,
    required String code,
    required dynamic value,
    required String createdBy,
    required String deviceId,
    required String facilityId,
  }) async {
    final payload = {
      "resourceType": "Observation",
      "id": id,
      "subject": {"reference": "Patient/$patientId"},
      "code": code,
      "value": value,
    };

    await saveResourceAtomically(
      id: id,
      resourceType: 'Observation',
      jsonPayload: jsonEncode(payload),
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
    );
    return id;
  }
}
