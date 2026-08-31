# CLINICAL SAFETY MODEL

Setu is a clinical decision-support and care-coordination system.

Automated rules identify risk indicators and recommended actions.

They do not independently establish a medical diagnosis.

Final clinical decisions remain with authorized healthcare professionals.

## Explainability and Fallback
- **Human-in-the-loop**: High-priority Care Gaps (like STAT referrals) must be manually marked as `accepted`, `rejected`, or `cancelled` by clinical officers (via `RolesGuard`). 
- **Override**: Medical Officers can override automated triage flags and prescribe alternative pathways inside the Teleconsultation `Task.output` and subsequent `Encounter`.
- **Explainability**: Every Care Gap includes a mandatory `reasonReference` linking directly to the precise `Observation`, `DiagnosticReport`, or `RiskAssessment` that triggered it, eliminating "black box" decisions.
- **Rule Versioning**: Clinical rules inherently log their underlying algorithm version inside `AuditEvent`.
- **Failure-safe**: If FHIR upstream sync is unavailable, offline UI gracefully falls back to cached limits but marks data as `Last known stock`, avoiding potentially harmful out-of-date assumptions for emergency medicine workflows.
