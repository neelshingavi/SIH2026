import 'dart:convert';

// Simplified FHIR Models for the Prototype

class Patient {
  final String id;
  final String name;
  final String abhaId;
  final String gender;
  final String birthDate;

  Patient({
    required this.id,
    required this.name,
    required this.abhaId,
    required this.gender,
    required this.birthDate,
  });

  Map<String, dynamic> toJson() {
    return {
      "resourceType": "Patient",
      "id": id,
      "identifier": [
        {
          "system": "https://abdm.gov.in/abha",
          "value": abhaId
        }
      ],
      "name": [
        {"use": "official", "text": name}
      ],
      "gender": gender,
      "birthDate": birthDate
    };
  }
}

class Observation {
  final String id;
  final String code;
  final String display;
  final dynamic value;
  final String patientId;

  Observation({
    required this.id,
    required this.code,
    required this.display,
    required this.value,
    required this.patientId,
  });

  Map<String, dynamic> toJson() {
    return {
      "resourceType": "Observation",
      "id": id,
      "status": "final",
      "code": {
        "coding": [
          {"code": code, "display": display}
        ]
      },
      "subject": {"reference": "Patient/$patientId"},
      "valueQuantity": {"value": value} // simplified for prototype
    };
  }
}

class ReferralTask {
  final String id;
  final String patientId;
  final String status;
  final String priority;
  
  ReferralTask({
    required this.id,
    required this.patientId,
    required this.status,
    required this.priority,
  });

  Map<String, dynamic> toJson() {
    return {
      "resourceType": "Task",
      "id": id,
      "status": status,
      "intent": "order",
      "priority": priority,
      "for": {"reference": "Patient/$patientId"}
    };
  }
}
