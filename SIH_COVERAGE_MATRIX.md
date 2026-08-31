# SIH COVERAGE MATRIX

| Requirement           | Feature        | Actual Code | Test | Evidence | Status |
| --------------------- | -------------- | ----------- | ---- | -------- | ------ |
| Offline healthcare    | SQLite + Sync  | `sync_coordinator.dart`, `database.dart`, `sync.service.ts` | E2E App restart test | SQLite persists `LocalResources`. Background flush on connectivity via Gateway. | VERIFIED |
| Rural access          | Frontline app  | `main.dart`, offline caches | Manual | ASHA worker can complete ANC forms fully offline. | VERIFIED |
| Referral continuity   | FHIR Task      | `CarePathwayService` -> `ReferralService` | Integration | STAT SLAs tracked against `Task.authoredOn`. Breach creates care gap. | VERIFIED |
| Teleconsultation      | LiveKit        | `TeleconsultRoomScreen` | Integration | Generates secure JWTs scoping user to explicit `Task` bounds. | PARTIAL |
| Diagnostics           | ServiceRequest | `DiagnosticRequestScreen` | Manual | Produces `ServiceRequest`. Evaluates missing review on `DiagnosticReport` (Phase 14). | VERIFIED |
| Medicine availability | Inventory      | `InventoryScreen`, `AlertEngine` | Manual | Displays `OUT_OF_STOCK` correctly based on local cache timestamp. | VERIFIED |
| High-risk care        | RiskAssessment | `TriageService` -> `RiskAssessment` | E2E | Escalate to STAT referral using exact protocol rules (Pre-eclampsia HBP). | VERIFIED |
| Care gaps             | Pathway engine | `CarePathwayService` | E2E | Evaluates missing Tasks against expected evidence for gaps. | VERIFIED |
| Multilingual          | i18n           | `AppLocalizations` (Flutter) | Manual | L10n engine configured. | VERIFIED |
| Interoperability      | FHIR           | `fhir.service.ts` | E2E | Entire backend delegates to HAPI FHIR using explicit REST definitions. | VERIFIED |
| Security              | RBAC + scope   | `roles.guard.ts` | Unit tests | Blocks unauthorized JWT access correctly. | VERIFIED |
| Accountability        | AuditEvent     | `AuditService` | E2E | Correlated logging of every modification across FHIR. | VERIFIED |
