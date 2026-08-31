# Phase 7 Pre-Audit

This document details the state of the repository before beginning Phase 7 implementation, searching for mocks/fakes in ABDM/Consent/HIE.

## Findings
1. **Consent:** Currently, there is no FHIR Consent resource implementation or explicit consent-capturing flow on the frontline app.
2. **HIE:** The `HealthInformationExchangeService` does not exist. There is no Outbox queue for HIE operations.
3. **ABDM / ABHA:** The patient model in the app and backend does not currently have fields explicitly distinguishing between internal UUID and ABHA number with linking states.
4. **Export / Import:** There are no endpoints for importing or exporting FHIR Bundles as clinical summaries for external entities.
5. **Purpose-based Access:** The `FacilityScopeGuard` handles facility bounds and emergency overrides, but there is no fine-grained `purposeOfUse` access control.
