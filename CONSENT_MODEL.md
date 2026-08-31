# CONSENT MODEL (Phase 57)

## Architecture

Consent in Setu is represented as a FHIR R4 `Consent` resource with the following explicit fields:

### FHIR Consent Structure
```json
{
  "resourceType": "Consent",
  "status": "active | inactive",
  "scope": { "coding": [{ "code": "patient-privacy" }] },
  "patient": { "reference": "Patient/<id>" },
  "dateTime": "<ISO timestamp>",
  "performer": [{ "reference": "Practitioner/<id>" }],
  "organization": [{ "reference": "Organization/<recipientFacilityId>" }],
  "provision": {
    "type": "permit",
    "period": { "start": "<start>", "end": "<expiry>" },
    "purpose": [{ "system": "...", "code": "TREAT | REFERRAL | DIAGNOSTICS" }],
    "data": [{ "meaning": "related", "reference": { "type": "Patient" } }]
  }
}
```

## Consent States

| State | Meaning |
|---|---|
| `active` | Consent granted and valid |
| `inactive` | Consent revoked by patient |
| `requested` | (Future) awaiting patient response |
| `rejected` | Patient declined |
| `expired` | Period end passed (enforced by `checkActiveConsent`) |

## Purpose Codes

| Code | Meaning |
|---|---|
| `TREAT` | Treatment and care |
| `REFERRAL` | Specialist referral |
| `DIAGNOSTICS` | Diagnostic review |
| `MEDICATION` | Medication management |
| `TELECONSULT` | Teleconsultation |
| `EMERGENCY` | Emergency access |

## Key Rules

1. **Login ≠ Consent**: JWT authentication does not represent clinical data sharing consent.
2. **Offline Consent**: Recorded offline with `_tag: LOCAL_CONSENT`. Synced to server when connectivity returns. Gateway re-validates against FHIR on export.
3. **Revocation**: Sets status to `inactive`. Historical records preserved. Future exchange blocked.
4. **Expiry**: `provision.period.end` checked on every export. Expired = auto-denied.
5. **Scope**: `provision.data[]` lists explicit FHIR resource types permitted. Export is filtered accordingly.

## Audit Trail

Every consent action creates an `AuditEvent`:
- `CONSENT_GRANTED`
- `CONSENT_REVOKED`
- `CONSENT_CHECK_FAILED`
- `RECORD_EXPORT_FAILED` (when consent missing)
