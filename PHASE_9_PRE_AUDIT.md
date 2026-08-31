# PHASE 9 PRE-AUDIT

## 1. Scope
The repository was analyzed for national-scale interoperability, ABDM/HIE readiness, and consent-aware clinical exchange.

## 2. Findings

### P0 (Incorrect Clinical/Interoperability Behavior)
- **Consent Scope & Purpose**: The current `consent.service.ts` tracks if consent is "OBTAINED" but lacks explicit scope (e.g., which resources are authorized to be shared) and purpose (e.g., CARE, REFERRAL). This violates ABDM data minimization principles.
- **Data Lineage / Provenance**: We lack a robust linkage between the original local FHIR resource and its bundled representation in the HIE Outbox. Provenance tracking for external sources is weak.

### P1 (Major Exchange/Security Problem)
- **Exchange State Machine**: `HieOutboxService` tracks PENDING, PROCESSING, COMPLETED, but lacks the granular interoperability states defined in Phase 9 (e.g. `CONSENT_REQUIRED`, `SUBMITTED`, `AVAILABLE`, `RETRIEVED`).
- **Patient Identity Resolution**: The system currently does not have a formal `MATCH / POSSIBLE_MATCH` workflow for external patient identities.

### P2 (Incomplete Interoperability)
- **Adapter Pattern**: While we have `AbdmGatewayService`, it is tightly coupled in some places. We need a formal `HealthExchangeAdapter` interface to allow seamlessly swapping Sandbox vs Production implementations.
- **Continuity of Care Bundle**: HIE exports currently dump raw resources rather than structuring a proper FHIR document or clinical bundle per purpose.

## 3. Immediate Action Plan
- Define `HealthExchangeAdapter` interface.
- Upgrade Consent to FHIR R4 standard (Purpose & Scope).
- Implement the comprehensive Exchange State Machine.
