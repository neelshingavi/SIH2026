# FAILURE MODEL

## 1. Flutter Client (`frontline-app`)
- **What if it crashes halfway through an operation?** 
  - *Current:* Potential orphaned local SQLite records without sync queue entries.
  - *Mitigation required:* Use SQLite transactions for all mutations.
- **What if the client loses network during sync?**
  - *Current:* Sync throws an exception and halts.
  - *Mitigation required:* Implement robust `retryable` checks and exponential backoff.

## 2. NestJS Gateway (`core-gateway`)
- **What if server restarts during processing?**
  - *Current:* The HIE outbox queue is stored in-memory (`private queue: ExchangeTask[] = []`). It will lose all pending tasks.
  - *Mitigation required:* Move HIE Outbox to Postgres.
- **What if a request succeeds but the response to the client is lost?**
  - *Current:* Client will retry. `SyncService` uses `SyncIdempotency` table which protects against duplicates for sync payloads, but other API endpoints might lack this.
  - *Mitigation required:* Expand idempotency checks globally.

## 3. HAPI FHIR (Source of Truth)
- **What if unavailable or slow?**
  - *Current:* Gateway throws 500s or hangs.
  - *Mitigation required:* Circuit breaker pattern. Queue non-critical reads/writes.

## 4. External Systems (ABDM, HIE)
- **What if they return malformed data?**
  - *Current:* `HieService` import assumes valid FHIR bundles.
  - *Mitigation required:* Strict validation before ingestion.

## 5. SQLite Database
- **What if database becomes corrupted?**
  - *Current:* App crashes.
  - *Mitigation required:* Ensure remote sync is the source of truth, allow local DB reset and full re-pull.
