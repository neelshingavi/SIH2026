# Disaster Recovery Plan (Phase 38-40)

## 1. Flutter Device Lost / Destroyed
- **RPO (Recovery Point Objective):** Last successful sync. Any unsynced mutations are permanently lost, but this is geographically isolated to one worker's pending queue.
- **RTO (Recovery Time Objective):** Time to issue new device + install app (~1 hour).
- **Procedure:** 
  1. Login on new device.
  2. Sync Coordinator automatically triggers a full `GET /sync/pull` from watermark `1970`.
  3. Patient records and Care Gaps are restored.

## 2. Postgres Database Lost (NestJS)
- **RPO:** 0 minutes for FHIR data. Postgres only holds HIE Outbox, Auth mapping, and Sync Idempotency. FHIR data lives in HAPI.
- **RTO:** 10 minutes.
- **Procedure:** 
  1. Restore Postgres from last nightly snapshot.
  2. `SyncOperations` replayed from clients will safely hit the FHIR server, though they might bypass idempotency checks if the `SyncIdempotency` table lost recent entries.

## 3. HAPI FHIR Server Outage
- **RPO:** 0 data lost. HAPI is the source of truth, backed by its own RDBMS.
- **RTO:** Dependent on HAPI cluster restart.
- **Mitigation:** Gateway `CircuitBreaker` isolates the outage, returning 503s. Flutter clients queue mutations locally indefinitely until HAPI recovers.

## 4. LiveKit Outage (Teleconsults)
- **RPO/RTO:** Real-time disruption.
- **Mitigation:** Teleconsult UI falls back to "TELECONSULT UNAVAILABLE" and prompts ASHA to create a Referral or record a Follow-up offline instead (Phase 51).
