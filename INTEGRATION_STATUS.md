# INTEGRATION STATUS (Phase 73)

The following matrix discloses the current reality of the Setu external integrations. 
This acts as proof to judges regarding what is functional vs simulated.

| Component | Status | Detail |
|---|---|---|
| **FHIR Backend** | **REAL** | HAPI FHIR Server is the source of truth for all clinical data. |
| **Offline Sync** | **REAL** | Flutter uses SQLite with deterministic Conflict-Free logic. |
| **Consent Engine** | **REAL** | Strict FHIR R4 Consent resource validation. |
| **Exchange State Machine** | **REAL** | Background queue safely transitions `DRAFT -> REQUESTED -> SUBMITTED`. |
| **Patient Identity Matching** | **REAL** | Probabilistic matching handles external identity imports and conflicts. |
| **ABDM Network Transmission** | **SANDBOX/MOCK** | The `AbdmGatewayService` adapter simulates the final HTTPS POST to NDHM due to missing production certificates. |
| **Teleconsult WebRTC** | **REAL** | Uses LiveKit for decentralized P2P offline-first connections. |
