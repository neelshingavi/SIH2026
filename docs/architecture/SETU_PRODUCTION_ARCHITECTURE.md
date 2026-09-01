# SETU PRODUCTION ARCHITECTURE

```text
┌─────────────────────────────┐
│      Frontline Flutter      │
│                             │
│ Forms / Timeline / Triage   │
│ Care Gaps / Referral        │
│ Diagnostics / Medicine     │
└──────────────┬──────────────┘
               │
        Offline Sync Layer
               │
               ↓
┌─────────────────────────────┐
│       NestJS Gateway        │
│                             │
│ Auth / RBAC / Scope         │
│ Sync / Pathway / Routing    │
│ Referral / Diagnostics     │
│ Inventory / Analytics      │
│ Audit / Alerts             │
└──────────────┬──────────────┘
               │
       FHIR API Boundary
               │
               ↓
┌─────────────────────────────┐
│         HAPI FHIR           │
│                             │
│ Canonical Clinical Record   │
└─────────────────────────────┘

Additional services:

LiveKit
Postgres
Observability
```

## Explanation
- **Frontline Flutter**: Responsible strictly for UI rendering, offline buffering in `LocalResources`, and `SyncOperations`. It holds no ultimate authority over data synchronization or clinical correctness once connected to the internet.
- **NestJS Gateway**: Orchestrates complex interactions spanning multiple FHIR models (e.g. Care Pathway state machine, Analytics). Ensures strict RBAC checks before mutating upstream endpoints.
- **HAPI FHIR**: The sole canonical Source of Truth. If it's not in HAPI, it didn't happen.
