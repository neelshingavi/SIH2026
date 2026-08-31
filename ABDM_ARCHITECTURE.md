# PRODUCTION INTEROPERABILITY ARCHITECTURE

This architecture demonstrates the flow from the offline frontline app to the external health information exchange ecosystem.

```text
                    SETU

       ┌─────────────────────────┐
       │      Frontline App      │
       │ Offline-first Flutter   │
       └────────────┬────────────┘
                    │
                    ▼
       ┌─────────────────────────┐
       │      API Gateway        │
       │ Auth + RBAC + Security  │
       └────────────┬────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   ┌──────────────┐    ┌───────────────┐
   │   FHIR Core  │    │ Exchange Layer│
   │    HAPI FHIR │    │ Consent + HIE │
   └──────────────┘    └───────┬───────┘
                               │
                               ▼
                       External Ecosystem

              ┌─────────────────────────┐
              │ Clinical Intelligence   │
              │ Risk + Care Gaps + SLA  │
              └─────────────────────────┘

              ┌─────────────────────────┐
              │ Observability           │
              │ Audit + Metrics + Alert │
              └─────────────────────────┘
```

## Boundaries and Guarantees
1. **Offline Capture**: Data is captured offline and pushed to the Gateway via idempotent syncing.
2. **Deterministic Risk**: Local processing identifies gaps and escalates safely.
3. **Consent-Gated Exchange**: HIE operations will not fire unless explicit FHIR Consent exists.
4. **Adapter Pattern**: Setu communicates externally via the `HealthExchangeAdapter`, ensuring vendor neutrality (ABDM sandbox vs Production).
