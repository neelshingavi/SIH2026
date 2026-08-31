import 'dart:convert';
import 'base_repository.dart';

class PatientRepository extends BaseRepository {
  PatientRepository(super.db);

  Future<String> createPatient({
    required String id,
    required String name,
    required String createdBy,
    required String deviceId,
    required String facilityId,
  }) async {
    final payload = {
      "resourceType": "Patient",
      "id": id,
      "name": [{"text": name}]
    };

    await saveResourceAtomically(
      id: id,
      resourceType: 'Patient',
      jsonPayload: jsonEncode(payload),
      createdBy: createdBy,
      deviceId: deviceId,
      facilityId: facilityId,
    );
    return id;
  }
}
