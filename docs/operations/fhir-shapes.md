# Setu - FHIR Resource Shapes

This document defines the exact structures of the HL7 FHIR R4 resources used across the Setu platform, ensuring a single source of truth for the Frontline, Backend, and Portals teams.

## 1. Facility Hierarchy (`Organization`)

Models the real-world reporting hierarchy from Sub-centre up to District. Used for roll-up reporting in the District Dashboard.

```json
{
  "resourceType": "Organization",
  "id": "phc-hadapsar",
  "name": "PHC Hadapsar",
  "type": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/organization-type",
          "code": "prov",
          "display": "Healthcare Provider"
        },
        {
          "system": "setu-facility-tier",
          "code": "PHC",
          "display": "Primary Health Centre"
        }
      ]
    }
  ],
  "partOf": {
    "reference": "Organization/subdiv-pune-east"
  }
}
```

## 2. Patient Demographics (`Patient`)

```json
{
  "resourceType": "Patient",
  "id": "sunita-sharma-123",
  "identifier": [
    {
      "type": {
        "coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR"}]
      },
      "system": "https://abdm.gov.in/abha",
      "value": "91-1234-5678-9012"
    }
  ],
  "name": [
    {
      "use": "official",
      "text": "Sunita Sharma",
      "family": "Sharma",
      "given": ["Sunita"]
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+919876543210",
      "use": "mobile"
    }
  ],
  "gender": "female",
  "birthDate": "1998-05-15",
  "address": [
    {
      "line": ["House 42, Ward 3"],
      "city": "Hadapsar",
      "district": "Pune",
      "state": "Maharashtra",
      "postalCode": "411028"
    }
  ]
}
```

## 3. Encounter (`Encounter`)

Tracks a single visit at a specific facility.

```json
{
  "resourceType": "Encounter",
  "id": "encounter-123",
  "status": "finished",
  "class": {
    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
    "code": "AMB",
    "display": "ambulatory"
  },
  "priority": {
    "coding": [
      {
        "system": "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
        "code": "stat",
        "display": "STAT"
      }
    ]
  },
  "subject": {
    "reference": "Patient/sunita-sharma-123"
  },
  "participant": [
    {
      "type": [
        {
          "coding": [{"system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", "code": "ATND"}]
        }
      ],
      "individual": {
        "reference": "Practitioner/asha-worker-1"
      }
    }
  ],
  "period": {
    "start": "2026-08-20T10:00:00Z",
    "end": "2026-08-20T10:30:00Z"
  },
  "location": [
    {
      "location": {
        "reference": "Location/subcentre-room-1"
      }
    }
  ],
  "serviceProvider": {
    "reference": "Organization/subcentre-hadapsar"
  }
}
```

## 4. Vitals & Assessments (`Observation`)

Example: Systolic Blood Pressure.

```json
{
  "resourceType": "Observation",
  "id": "obs-bp-sys-1",
  "status": "final",
  "category": [
    {
      "coding": [{"system": "http://terminology.hl7.org/CodeSystem/observation-category", "code": "vital-signs"}]
    }
  ],
  "code": {
    "coding": [{"system": "http://loinc.org", "code": "8480-6", "display": "Systolic blood pressure"}]
  },
  "subject": {
    "reference": "Patient/sunita-sharma-123"
  },
  "encounter": {
    "reference": "Encounter/encounter-123"
  },
  "effectiveDateTime": "2026-08-20T10:15:00Z",
  "valueQuantity": {
    "value": 150,
    "unit": "mmHg",
    "system": "http://unitsofmeasure.org",
    "code": "mm[Hg]"
  }
}
```

## 5. Referral Tracking Lifecycle (`Task`)

Referrals are represented as a `ServiceRequest` paired with a tracking `Task`.

### State Machine Definition

The `Task.status` and `Task.businessStatus` dictate the lifecycle:

1. `CREATED`: Task created, awaiting pickup by destination.
   - `status`: `requested`
   - `businessStatus`: `null`
2. `ACCEPTED`: Destination facility acknowledges the referral.
   - `status`: `accepted`
   - `businessStatus`: `ACCEPTED`
3. `PATIENT_NOTIFIED`: ASHA confirms the patient has been told to travel.
   - `status`: `in-progress`
   - `businessStatus`: `PATIENT_NOTIFIED`
4. `TRAVELLED`: Patient is en route.
   - `status`: `in-progress`
   - `businessStatus`: `TRAVELLED`
5. `ARRIVED`: Patient arrives at the destination facility.
   - `status`: `in-progress`
   - `businessStatus`: `ARRIVED`
6. `CONSULTED`: Patient has seen the doctor.
   - `status`: `in-progress`
   - `businessStatus`: `CONSULTED`
7. `TREATMENT`: Active treatment.
   - `status`: `in-progress`
   - `businessStatus`: `TREATMENT`
8. `COMPLETED`: Episode concluded. (May spawn a `CarePlan` for follow-up).
   - `status`: `completed`
   - `businessStatus`: `COMPLETED`

### Example Resource (Accepted Referral)

```json
{
  "resourceType": "Task",
  "id": "task-referral-123",
  "status": "accepted",
  "intent": "order",
  "code": {
    "text": "Referral for suspected pre-eclampsia"
  },
  "focus": {
    "reference": "ServiceRequest/req-referral-123"
  },
  "for": {
    "reference": "Patient/sunita-sharma-123"
  },
  "requester": {
    "reference": "PractitionerRole/asha-role-1"
  },
  "owner": {
    "reference": "Organization/phc-hadapsar"
  },
  "businessStatus": {
    "text": "ACCEPTED"
  },
  "authoredOn": "2026-08-20T10:45:00Z",
  "restriction": {
    "period": {
      "end": "2026-08-21T10:45:00Z" 
    }
  }
}
```

## 6. Conditions & Flags (`Condition`)

Generated by the Triage Engine.

```json
{
  "resourceType": "Condition",
  "id": "cond-preeclampsia-risk",
  "clinicalStatus": {
    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-clinical", "code": "active"}]
  },
  "verificationStatus": {
    "coding": [{"system": "http://terminology.hl7.org/CodeSystem/condition-ver-status", "code": "unconfirmed"}]
  },
  "category": [
    {
      "coding": [{"system": "setu-triage-band", "code": "HIGH_RISK"}]
    }
  ],
  "code": {
    "text": "Suspected pre-eclampsia based on BP > 140/90"
  },
  "subject": {
    "reference": "Patient/sunita-sharma-123"
  },
  "encounter": {
    "reference": "Encounter/encounter-123"
  }
}
```
