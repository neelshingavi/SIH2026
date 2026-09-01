# PHASE 8 PRE-AUDIT FORENSIC REPORT

## Overview
A comprehensive global grep search was conducted across the `frontline-app` (Flutter) and `core-gateway` (NestJS) repositories to identify reliability, observability, and safety issues as dictated by Phase 8.

## Findings

### P0 (Data Loss / Patient Safety / Security)
1. **Raw Error Throwing**: Several services (e.g., `abdm.controller.ts`, `diagnostics.service.ts`, `fhir.service.ts`, `stock.service.ts`) throw raw `new Error('...')`. These bypass structured error handling, potentially leaking stack traces or internal implementation details to the client.
2. **Missing Global Exception Filter**: There is no NestJS global exception filter converting all errors into a safe taxonomy (e.g., `errorCode`, `message`, `requestId`, `retryable`).
3. **Silent Catches in Flutter**: `sync_coordinator.dart` and `device_service.dart` contain empty `catch (_) {}` blocks. While commented as non-fatal, they hide critical diagnostic information when sync fails.

### P1 (Major Reliability Failure)
1. **Retry Architecture**: `HieOutboxService` does a naive retry (`task.retryCount++`) inside a `setInterval`. It lacks **exponential backoff with jitter** (Phase 9) and blind-retries all errors.
2. **Circuit Breaker**: `FhirService` instantiates a `CircuitBreaker` but it is not robustly wrapping all network calls to HAPI FHIR (Phase 10).
3. **Dead Letter Queue (DLQ)**: The sync engine marks operations as `FAILED` (or `FAILED_PERMANENTLY`) but lacks an operational endpoint to view these DLQ items (Phase 17).

### P2 (Degraded Functionality)
1. **Logging**: The gateway uses `this.logger.log()` but outputs unstructured text. Structured JSON logging (Phase 4) with `requestId` and `facilityId` is missing.
2. **Correlation IDs**: Flutter does not consistently send a correlation ID in headers for all HTTP requests, breaking trace continuity (Phase 3).
3. **Clinical Rule Determinism**: `TriageService` in Flutter evaluates rules but doesn't explicitly version them in the output `RiskAssessment` (Phase 24).

### P3 (Engineering Quality)
1. **Error Taxonomy**: Lack of standard error codes (e.g., `FHIR_VALIDATION_ERROR`, `SYNC_ERROR`) as requested in Phase 6.

## Next Steps
1. Create `FAILURE_MODEL.md`.
2. Implement global structured logging and correlation ID middleware.
3. Implement `GlobalExceptionFilter` for safe error taxonomies.
4. Refactor `SyncCoordinator` and `HieOutboxService` for exponential backoff and DLQ visibility.
5. Upgrade `TriageService` to include rule versions.
