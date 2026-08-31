import 'dart:convert';
import 'base_repository.dart';

class EncounterRepository extends BaseRepository {
  EncounterRepository(super.db);

  Future<String> createEncounter({
    required String id,
    required String patientId,
    required String createdBy,
    required String deviceId,
    required String facilityId,
  }) async {
    final payload = {
      "resourceType": "Encounter",
      "id": id,
      "subject": {"reference": "Patient/$patientId"},
      "status": "finished",
    };

    await saveResourceAtomically(
      id: id,
      resourceType: 'Encounter',
      jsonPayload: jsonEncode(payload),
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
    );
    return id;
  }
}
