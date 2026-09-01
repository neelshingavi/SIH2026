# SYSTEM FAILURE MODEL (Phase 8)

## 1. Flutter Client (Mobile Application)
* **What if unavailable?** Offline first architecture ensures clinical data capture continues. Sync pauses until connectivity is restored.
* **What if it crashes halfway through an operation?** Local mutations use SQLite transactions. If it crashes mid-triage, the local transaction rolls back. No partial FHIR resources or orphaned sync queue operations.
* **What if request succeeds but response is lost?** Client will retry `PUSH`. Server's Idempotency checks will recognize the operation UUID, process no state changes, and re-acknowledge success.

## 2. NestJS Gateway API
* **What if unavailable?** Flutter queues operations locally. Real-time HIE and Teleconsultation are disabled.
* **What if request is duplicated?** The Gateway enforces idempotency using `idempotencyKey` provided by the Flutter client. Subsequent requests return the original response without mutating state.
* **What if server restarts?** Background tasks (like `HieOutboxService`) reload state from the database. In-flight stateless requests fail and are retried by clients with backoff.

## 3. SQLite (Client Local Database)
* **What if unavailable?** Device storage failure requires re-login and fresh pull from the server.
* **What if corrupted?** User must clear app data. No central data is lost because local operations are synchronized.

## 4. HAPI FHIR (Clinical Data Repository)
* **What if unavailable?** NestJS Gateway `FhirService` trips its Circuit Breaker. NestJS returns 503 Service Unavailable. Gateway `SyncService` fails gracefully and tells the mobile client to retry later.
* **What if slow?** NestJS HTTP timeouts (configured in `FhirService`) prevent hanging connections. Circuit breaker opens if latency exceeds thresholds consistently.
* **What if returns malformed data?** `FhirService` uses strict typing. If it fails, NestJS returns an internal error.

## 5. PostgreSQL (App metadata, outbox, audit)
* **What if unavailable?** NestJS cannot process new logins or durable outbox writes. Returns 503.
* **What if slow?** Connection pool limits wait times.

## 6. ABDM / External HIE (Health Information Exchange)
* **What if unavailable?** `HieOutboxService` queues `SUBMITTED` transactions. The Reconciliation job explicitly checks state via polling.
* **What if it fails after our commit?** The transaction state is marked as `FAILED`. A Care Gap (`RECORD_SHARE_FAILED`) is generated to notify the clinician.

## 7. LiveKit (Teleconsultation)
* **What if unavailable?** Room creation fails. Gateway returns `EXTERNAL_SERVICE_UNAVAILABLE`. Clinician is notified that teleconsultation is currently down. Fallback to physical referral.

## Guarantees
* **At-least-once delivery**: All clinical data created offline is guaranteed to sync to the server eventually.
* **Idempotent mutations**: Retrying a sync operation will never create duplicate clinical resources.
* **Durable local writes**: Every operation is transactionally written to SQLite before being queued for sync.
* **No silent clinical data loss**: Any failure in external sharing generates a Care Gap.
