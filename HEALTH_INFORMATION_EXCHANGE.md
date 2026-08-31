# HEALTH INFORMATION EXCHANGE (Phase 57)

## Internal Abstraction: HealthInformationExchangeService

The HIE layer in Setu is composed of two services:
- `HieService` — data preparation, consent check, bundle construction, provenance
- `HieOutboxService` — durable async exchange queue

Both implement responsibilities mandated by Phase 11:

| Responsibility | Implemented in |
|---|---|
| `checkConsent` | `HieService.exportClinicalSummary` via `ConsentService.checkActiveConsent` |
| `prepareRecord` | `HieService.exportClinicalSummary` (data minimization by purpose) |
| `export` | `HieOutboxService.queueExport` → `AbdmGatewayService` |
| `import` | `HieService.importClinicalSummary` |
| `audit` | `AuditService.logEvent` on every action |
| `identity validation` | `PatientIdentityService.resolveIdentity` on import |

## Exchange State Machine

```
DRAFT
  ↓
CONSENT_REQUIRED
  ↓
CONSENT_GRANTED
  ↓
REQUESTED
  ↓
SUBMITTED
  ↓
AVAILABLE
  ↓
COMPLETED
```

Failure states: `REJECTED`, `EXPIRED`, `CANCELLED`, `FAILED`

## Priority Queue

Emergency records always transmit first:
- `EMERGENCY` > `STAT` > `URGENT` > `ROUTINE`

## FHIR Bundle Strategy

- `Bundle.type = document` for continuity of care packages
- Includes: Patient, Observation, Condition, CarePlan, ServiceRequest, DiagnosticReport, MedicationRequest, RiskAssessment
- Data minimization: only active conditions, limited observations (10), limited encounters (5)
- Provenance resource injected on import to track external origin

## Integration Mode

Controlled by `ABDM_MODE` environment variable:
- `LOCAL_SIMULATION` — mock exchange, real FHIR bundles
- `SANDBOX` — NDHM sandbox (external dependency)
- `PRODUCTION` — requires real ABDM credentials (external dependency)

Current mode: **LOCAL_SIMULATION**
