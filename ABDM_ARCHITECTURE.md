# ABDM Architecture

## Setu & ABDM Conceptual Model
This document details the mapping between Setu concepts and ABDM (Ayushman Bharat Digital Mission) concepts.

### High-level Flow
```text
Setu Frontline App
        ↓
Setu Gateway (ABDM Gateway Adapter)
        ↓
FHIR / HAPI (Clinical Data Repository)
        ↓
ABDM-compatible exchange layer
```

### Concept Mapping
- **Patient identity:** 
  - Internal: Setu Patient UUID, FHIR Patient.id.
  - External: ABHA identifier (optional, linked via Identity Service).
- **Clinical records:**
  - Standard FHIR resources (Observation, Encounter, DiagnosticReport, etc.) stored in HAPI FHIR.
- **Consent:**
  - Internal: FHIR Consent resources managing data sharing logic.
  - External: ABDM Consent Artefact (EXTERNAL DEPENDENCY).
- **Health information provider (HIP):** Setu acts as a HIP when sharing records.
- **Health information user (HIU):** Setu acts as a HIU when requesting records.
- **Health information exchange (HIE):** Mediated via the `HealthInformationExchangeService` which generates FHIR Bundles.
- **Health record sharing:** Exchanging FHIR Bundles based on validated Consent.
- **Audit:** AuditEvent resources tracking all exchanges and consent validations.
