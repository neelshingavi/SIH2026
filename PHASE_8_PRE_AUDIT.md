# PHASE 8 PRE-AUDIT

## 1. Scope
The repository was analyzed for production readiness, reliability, and clinical safety issues. The following components were reviewed:
- `frontline-app/` (Flutter Offline Client)
- `core-gateway/api/` (NestJS Gateway)

## 2. Findings

### P0 (Data Loss / Patient Safety)
- **Silent Catches in Sync**: In Flutter `sync_coordinator.dart`, some API errors might be caught silently without moving the operation to a dead-letter queue or alerting the user, potentially causing silent clinical data loss.
- **Rule Engine Determinism**: `CarePathwayService` evaluates risks dynamically based on current time (e.g. `Date.now()`). If the server processes a delayed sync 3 days later, the SLAs calculate incorrectly. Rule evaluation is currently coupled to ingestion time.
- **Lack of Atomic Transactions**: In `frontline-app`, creating a local resource and appending it to the sync queue are currently two separate drift queries, which could leave orphaned resources if the app crashes midway.

### P1 (Major Reliability)
- **No Circuit Breaker for HAPI FHIR**: The NestJS Gateway directly proxies requests to HAPI. If HAPI is down, the Gateway throws 500s back to the client. The Sync Coordinator will immediately retry, hammering the failing server.
- **Unhandled Database Exceptions**: Postgres connection drops are not handled gracefully in NestJS TypeORM setup.
- **Hardcoded Localhost**: `app.module.ts` contains `process.env.DB_HOST || 'localhost'`. This is a bad practice for production default values.

### P2 (Degraded Functionality)
- **No Standard Error Taxonomy**: API throws raw `HttpException` (e.g. `ForbiddenException`). There is no structured `{ errorCode, retryable }` payload.
- **Lack of Idempotency on Mutating Endpoints**: Some non-sync API endpoints (like HIE export) generate random UUIDs internally. If a network timeout occurs and the client retries, it might spawn duplicates.

### P3 (Engineering Quality)
- **Console Logs**: Widespread use of `print()` in Flutter and standard `Logger` in NestJS, but they are not structured JSON logs suitable for Datadog or ELK.
- **Missing Correlation IDs in Client**: Flutter doesn't inject `X-Correlation-ID` headers into its requests, breaking distributed tracing.

## 3. Recommended Actions
1. Implement atomic transactions in Flutter's `BaseRepository`.
2. Rewrite `SyncCoordinator` with exponential backoff and a dead-letter queue.
3. Build a structured logging service and global exception filter in NestJS to enforce `{ errorCode, message, retryable }`.
4. Wrap HAPI FHIR calls in a circuit breaker.
