# PHASE 7 TRACEABILITY MATRIX

| Requirement | Implementation | File / Component | FHIR Resource | Status |
|---|---|---|---|---|
| Phase 1: Conceptual Model | `ABDM_ARCHITECTURE.md` | Doc | N/A | VERIFIED |
| Phase 2-4: ABHA Identity UX | Implemented Identity Badge with `ABHA: Linked` | `patient_timeline_screen.dart` | Patient | VERIFIED |
| Phase 5-10: Consent Architecture | Explicit Consent with Scope & Period | `consent.service.ts`, `consent_repository.dart` | Consent | VERIFIED |
| Phase 7: Human Consent UX | WHY/WHAT/WHO/HOW LONG UI + Receipt | `consent_screen.dart` | Consent | VERIFIED |
| Phase 11: Exchange Service | `HieService`, `HieOutboxService` | `hie.service.ts`, `hie-outbox.service.ts` | Bundle | VERIFIED |
| Phase 13-14: Clinical Summary | Data minimization, Document Bundle | `hie.service.ts` | Bundle (document) | VERIFIED |
| Phase 18, 33: Timeline & Source | LOCAL, SHARED, IMPORTED tags | `patient_timeline_screen.dart` | Provenance / AuditEvent | VERIFIED |
| Phase 19-21: External Import & Provenance | `importClinicalSummary` injects Provenance | `hie.service.ts` | Provenance | VERIFIED |
| Phase 23-24: Security Boundary & RBAC | `RolesGuard`, `JwtAuthGuard` | `hie.controller.ts` | N/A | VERIFIED |
| Phase 25: Break-Glass Access | `BreakGlassService.emergencyAccess` | `break-glass.service.ts` | AuditEvent | VERIFIED |
| Phase 30-31: Outbox & Idempotency | `queueExport`, `idempotencyKey` | `hie-outbox.service.ts` | Task / AuditEvent | VERIFIED |
| Phase 36: Exchange Care Gaps | `RECORD_SHARE_FAILED` gap evaluation | `care-pathway.service.ts` | AuditEvent | VERIFIED |
| Phase 37-38: HIE Metrics | `getMetrics` endpoint | `hie.controller.ts`, `hie-outbox.service.ts` | N/A | VERIFIED |
| Phase 41: Emergency Priority | `queueExport` sorting by Priority | `hie-outbox.service.ts` | Task | VERIFIED |
| Phase 45-47: ABDM Adapter & Simulation | `AbdmGatewayService` with `mode` | `abdm-gateway.service.ts` | N/A | VERIFIED |
| Phase 57: Documentation | All required MD files created | Docs | N/A | VERIFIED |
