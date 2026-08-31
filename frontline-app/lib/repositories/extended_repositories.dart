import 'package:uuid/uuid.dart';
import 'base_repository.dart';
import '../db/database.dart';

class MedicationRequestRepository extends BaseRepository {
  MedicationRequestRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String medication, String status, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'MedicationRequest',
      'id': id,
      'status': status,
      'subject': {'reference': 'Patient/\$patientId'},
      'medicationCodeableConcept': {'text': medication},
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'MedicationRequest', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class ServiceRequestRepository extends BaseRepository {
  ServiceRequestRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String intent, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'ServiceRequest',
      'id': id,
      'intent': intent,
      'subject': {'reference': 'Patient/\$patientId'},
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'ServiceRequest', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class TaskRepository extends BaseRepository {
  TaskRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String status, String intent, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'Task',
      'id': id,
      'status': status,
      'intent': intent,
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'Task', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class AppointmentRepository extends BaseRepository {
  AppointmentRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String status, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'Appointment',
      'id': id,
      'status': status,
      'participant': [{'actor': {'reference': 'Patient/\$patientId'}, 'status': 'accepted'}],
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'Appointment', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class DiagnosticReportRepository extends BaseRepository {
  DiagnosticReportRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String code, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'DiagnosticReport',
      'id': id,
      'status': 'final',
      'code': {'text': code},
      'subject': {'reference': 'Patient/\$patientId'},
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'DiagnosticReport', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class CarePlanRepository extends BaseRepository {
  CarePlanRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String title, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'CarePlan',
      'id': id,
      'status': 'active',
      'intent': 'plan',
      'title': title,
      'subject': {'reference': 'Patient/\$patientId'},
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'CarePlan', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}

class ProvenanceRepository extends BaseRepository {
  ProvenanceRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String targetRef, String recordedBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'Provenance',
      'id': id,
      'target': [{'reference': targetRef}],
      'recorded': DateTime.now().toIso8601String(),
      'agent': [{'who': {'reference': recordedBy}}],
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'Provenance', payload, 'CREATE', recordedBy, deviceId, facilityId);
  }
}

class ConsentRepository extends BaseRepository {
  ConsentRepository(AppDatabase db) : super(db);

  Future<void> create(String id, String patientId, String status, String scope, String createdBy, String deviceId, String facilityId) async {
    final payload = {
      'resourceType': 'Consent',
      'id': id,
      'status': status,
      'scope': {'coding': [{'code': scope}]},
      'patient': {'reference': 'Patient/\$patientId'},
      'meta': {'deviceId': deviceId, 'facilityId': facilityId},
    };
    await writeResourceWithSyncQueue(id, 'Consent', payload, 'CREATE', createdBy, deviceId, facilityId);
  }
}
