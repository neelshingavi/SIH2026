# SIH-26133 — PHASE 1 MASTER IMPLEMENTATION PROMPT

# REAL OFFLINE-FIRST CLINICAL DATA FOUNDATION

You are continuing work on the SIH-26133 project **Setu**.

Repository:

https://github.com/neelshingavi/SIH2026

Phase 0 was a forensic audit of the repository.

The audit established that the current Flutter application does NOT have real offline persistence. It uses in-memory state / `pendingSyncs`, meaning clinical data disappears when the application is killed. The backend also does not yet have a genuine offline synchronization protocol.

The goal of this phase is to replace that fake behavior with a **real, production-grade offline-first foundation**.

IMPORTANT:

Do not treat this as "add SQLite."

We are building the foundation for a rural healthcare system where patient data may be collected with no internet connectivity and later synchronized safely.

---

# 0. NON-NEGOTIABLE PRINCIPLES

The implementation MUST satisfy all of these:

1. Offline operation must work without network access.
2. Data must survive application restart.
3. Every locally-created clinical resource must have a stable globally unique ID.
4. Local writes must be durable before the UI reports success.
5. Every mutation must be represented in a durable synchronization queue.
6. Synchronization must be retryable.
7. Synchronization must be idempotent.
8. Duplicate submissions must not create duplicate clinical resources.
9. Synchronization must never silently delete clinical data.
10. Failed synchronization must remain inspectable.
11. The user must be able to see synchronization status.
12. The backend must distinguish new resources from updates.
13. Conflicts must be detected rather than silently overwritten.
14. The system must preserve FHIR resource semantics.
15. Offline data must remain usable even if HAPI FHIR is temporarily unavailable.
16. The architecture must support eventual migration from prototype to production infrastructure.

Do NOT implement a fake offline mode.

Do NOT use:

* `pendingSyncs += 1`
* fake timers
* `Future.delayed`
* random mock sync completion
* hardcoded "offline success"
* UI-only offline indicators
* in-memory queues
* static mock data pretending to be synchronized

---

# 1. FIRST: RE-INSPECT THE CURRENT CODE

Before modifying anything, inspect the current implementation again.

Read:

* `frontline-app/pubspec.yaml`
* `frontline-app/lib/main.dart`
* `frontline-app/lib/**`
* triage services
* dynamic form renderer
* API clients
* backend sync service
* patient service
* FHIR integration
* OpenAPI
* FHIR shapes
* implementation plan

Find every location where the existing fake offline implementation occurs.

Create a short migration map:

```text
OLD MOCK IMPLEMENTATION
        ↓
NEW PRODUCTION IMPLEMENTATION
```

Do not duplicate functionality.

Remove obsolete fake mechanisms after the real implementation is working.

---

# 2. CHOOSE AND JUSTIFY THE LOCAL DATABASE

Use **Drift + SQLite** unless there is a compelling technical reason not to.

Add the necessary dependencies and configure code generation correctly.

The local database must NOT simply reproduce the backend's relational schema.

The key abstraction is:

```text
FHIR resources
+
local synchronization metadata
```

The application should be capable of storing FHIR-compatible resources locally.

---

# 3. DESIGN THE LOCAL DATA MODEL

Create a robust local persistence model.

At minimum implement:

## `local_resources`

Fields should conceptually include:

* local primary key
* FHIR resource type
* FHIR resource ID
* resource JSON
* resource version / version metadata
* created locally timestamp
* last modified timestamp
* sync state
* deleted/tombstone state
* source device identifier
* last synchronized version
* last synchronization timestamp
* retry count
* last sync error
* conflict state

Do NOT blindly copy these exact fields if the existing architecture suggests a better design.

The important distinction is:

```text
FHIR resource identity
≠
local database identity
≠
sync operation identity
```

Preserve this separation.

---

# 4. DESIGN THE SYNC QUEUE

Create a durable synchronization queue.

Conceptually:

```text
sync_queue
```

Each operation must have:

* operation ID
* resource type
* resource ID
* operation type
* payload/reference
* created timestamp
* retry count
* next retry timestamp
* status
* last error
* idempotency key
* device ID

Supported operations:

```text
CREATE
UPDATE
DELETE
```

Do not assume DELETE can simply erase the local record.

For healthcare data, deletion must be represented safely.

Use tombstones where appropriate.

---

# 5. USE FHIR RESOURCE IDs CORRECTLY

Every locally-created resource must receive its UUID BEFORE it is persisted.

Example:

```text
Patient/{uuid}
Encounter/{uuid}
Observation/{uuid}
Condition/{uuid}
ServiceRequest/{uuid}
Task/{uuid}
MedicationRequest/{uuid}
```

The server must preserve that resource identity when accepting the resource.

Do NOT use:

```text
PAT-123
PAT-124
random display IDs
auto-increment IDs
```

as the canonical distributed identity.

This is critical for offline synchronization.

---

# 6. CREATE A LOCAL REPOSITORY ABSTRACTION

Do not allow UI widgets to directly manipulate Drift tables.

Create a clean architecture:

```text
UI
 ↓
Application / Use Case
 ↓
Repository
 ↓
Local FHIR Store
 ↓
Sync Queue
```

Example conceptual interfaces:

```text
PatientRepository
EncounterRepository
ObservationRepository
ReferralRepository
ResourceRepository
SyncRepository
```

The exact architecture may differ.

The important requirement is:

> UI code must not know whether the application is online or offline.

A user should simply perform a clinical action.

The application decides:

```text
persist locally
→ queue mutation
→ synchronize when possible
```

---

# 7. IMPLEMENT OFFLINE-FIRST WRITE SEMANTICS

Every clinical write must follow this sequence:

```text
USER ACTION
    ↓
VALIDATE
    ↓
CREATE FHIR RESOURCE
    ↓
WRITE RESOURCE TO LOCAL DB
    ↓
WRITE SYNC OPERATION
    ↓
COMMIT TRANSACTION
    ↓
UPDATE UI
```

The local transaction must ensure:

```text
resource exists
AND
sync operation exists
```

or neither exists.

Never allow:

```text
resource saved
but queue missing
```

or:

```text
queue exists
but resource missing
```

This must be atomic.

---

# 8. IMPLEMENT REAL CONNECTIVITY DETECTION

Do not rely exclusively on a Wi-Fi icon toggle.

Implement a connectivity abstraction.

The application should distinguish:

```text
ONLINE
OFFLINE
SYNCING
DEGRADED
SYNC_ERROR
```

Important:

Network connectivity does NOT necessarily mean backend availability.

For example:

```text
Wi-Fi connected
        ↓
API unavailable
```

must behave differently from:

```text
API reachable
```

Therefore the sync layer should perform actual backend reachability checks.

---

# 9. IMPLEMENT THE SYNC ENGINE

Create a real synchronization service.

Conceptually:

```text
Connectivity Monitor
        ↓
Sync Coordinator
        ↓
Pending Queue
        ↓
Batch
        ↓
Backend
        ↓
Result Processing
        ↓
Local State Update
```

Synchronization should:

1. detect connectivity
2. discover pending operations
3. order operations deterministically
4. batch them safely
5. send them to backend
6. process each result
7. mark successful operations as synchronized
8. retain failed operations
9. retry failures
10. expose errors to the UI

Do not simply:

```text
POST everything
→ clear queue
```

---

# 10. IMPLEMENT IDEMPOTENCY

This is mandatory.

Imagine the device sends:

```text
CREATE Patient/abc
```

The request reaches the server.

The server successfully writes it.

The network response is lost.

The device retries.

The server MUST NOT create a second patient.

Use an idempotency mechanism based on stable operation/resource identity.

Document exactly how this works.

---

# 11. IMPLEMENT RETRY WITH BACKOFF

Implement safe retries.

Example conceptual policy:

```text
attempt 1 → immediate
attempt 2 → short delay
attempt 3 → longer delay
attempt 4 → exponential backoff
...
```

Do not retry indefinitely at high frequency.

Persist retry metadata.

A failed operation must survive:

* app restart
* device restart
* network loss

---

# 12. IMPLEMENT CONFLICT DETECTION

Do NOT implement naive:

```text
last write wins
```

for clinical resources.

At minimum support optimistic concurrency/version detection.

Example:

Device A:

```text
Patient/123 version 4
```

Device B:

```text
Patient/123 version 4
```

A updates → version 5.

B attempts update against version 4.

The backend should detect:

```text
CONFLICT
```

rather than silently overwriting A.

Store the conflict locally.

Expose:

```text
CONFLICT_REQUIRES_REVIEW
```

as a state.

Do not build an elaborate clinical merge algorithm in this phase.

The goal is safe conflict detection.

---

# 13. IMPLEMENT SERVER-SIDE SYNC ENDPOINT

Create a proper synchronization API.

For example:

```text
POST /sync/push
```

and, where appropriate:

```text
GET /sync/pull
```

or equivalent.

The exact API design should follow the existing architecture and OpenAPI contract where possible.

The push endpoint should accept a batch of operations/resources.

The response should provide per-operation results.

Conceptually:

```json
{
  "results": [
    {
      "operationId": "...",
      "resourceId": "...",
      "status": "APPLIED"
    },
    {
      "operationId": "...",
      "resourceId": "...",
      "status": "CONFLICT"
    }
  ]
}
```

Do not use one global success/failure response for the entire batch.

---

# 14. SERVER-SIDE IDEMPOTENCY

The backend must persist enough information to recognize repeated operations.

A retry of the same operation must return the previous result instead of performing the mutation again.

Implement this at the backend level.

Do not rely only on the Flutter application to prevent duplicates.

---

# 15. PRESERVE FHIR

The sync system must be resource-oriented.

Do not introduce a proprietary clinical data model merely to make syncing easier.

The canonical payload should remain compatible with:

```text
FHIR R4
```

For example:

```text
Patient
Encounter
Observation
Condition
ServiceRequest
Task
MedicationRequest
DiagnosticReport
CarePlan
```

Do not migrate Referral or Teleconsult in this phase yet.

That is Phase 2.

However, the offline architecture MUST be designed so those future FHIR resources can use the same persistence/sync infrastructure.

---

# 16. IMPLEMENT RESOURCE VERSIONING

The local store must retain enough metadata to understand:

```text
local version
server version
last synchronized version
```

Do not invent a fake version number without understanding the backend's FHIR versioning model.

If HAPI FHIR's versioning is used, integrate with it properly.

Document:

```text
local version
→ server version
→ conflict detection
```

---

# 17. IMPLEMENT PULL SYNCHRONIZATION

Do not only implement push.

The device must eventually receive changes made elsewhere.

Design:

```text
server changes
       ↓
pull
       ↓
compare/version check
       ↓
apply locally
       ↓
update local store
```

For this phase, a minimal functional pull implementation is required.

Do not build an unnecessarily complex distributed database.

But it must be real.

---

# 18. HANDLE DELETIONS SAFELY

Do not physically delete synchronized clinical resources from the local database simply because the server says they were deleted.

Use appropriate tombstone semantics.

Make deletion auditable.

Clinical data should never disappear silently.

---

# 19. BUILD SYNC OBSERVABILITY

The frontend must show useful synchronization state.

Example:

```text
✓ All records synchronized

↻ Syncing 4 records...

⚠ 2 records waiting for retry

! 1 record requires conflict review

Offline — 7 records stored safely on device
```

Do not use meaningless:

```text
"Online"
```

as the only indicator.

The user should be able to understand:

* whether data is safe
* how many records are pending
* whether synchronization failed
* whether intervention is required

---

# 20. BUILD A SYNC DIAGNOSTICS SCREEN

Add a development/admin diagnostic screen.

Show:

* current connectivity
* backend reachability
* local database status
* pending operations
* successful operations
* failed operations
* retry count
* conflicts
* last successful sync
* last failed sync
* queue size

This will also become extremely useful during the SIH demonstration.

Do not expose sensitive patient data unnecessarily.

---

# 21. MAKE THE SYSTEM TESTABLE

Create automated tests.

At minimum:

### Test 1 — Offline patient creation

```text
disable network
create patient
verify DB contains patient
verify queue contains CREATE
```

### Test 2 — App restart

```text
create patient offline
terminate app
restart
verify patient exists
verify sync queue exists
```

### Test 3 — Reconnect

```text
create patient offline
restore network
run sync
verify server resource exists
verify queue marked complete
```

### Test 4 — Duplicate retry

```text
send operation
simulate lost response
send same operation again
verify only one server resource exists
```

### Test 5 — Failed backend

```text
backend unavailable
attempt sync
verify operation remains pending
verify retry metadata updated
```

### Test 6 — Conflict

```text
server version changes
local update uses stale version
verify conflict is detected
verify local data is not silently overwritten
```

### Test 7 — Pull

```text
resource modified on server
device synchronizes
verify local resource updates
```

### Test 8 — Atomicity

Simulate failure between resource write and queue write.

Verify the database does not end up inconsistent.

---

# 22. AIRPLANE-MODE DEMO REQUIREMENT

The implementation MUST support this exact demonstration:

```text
1. Start application
2. Show patient list
3. Enable airplane mode
4. Create a NEW patient
5. Capture vitals
6. Save encounter
7. Show "Offline — safely stored"
8. Completely kill application
9. Reopen application
10. Patient is still present
11. Encounter is still present
12. Disable airplane mode
13. Application detects connectivity
14. Synchronization starts
15. Backend receives resources
16. Dashboard eventually shows the same patient
17. Sync status becomes "All records synchronized"
```

This must be a REAL end-to-end flow.

No mocks.

No fake delays.

No pre-seeded data.

No manual backend intervention.

---

# 23. REMOVE THE OLD MOCK

After the new system is verified:

REMOVE:

* `pendingSyncs`
* fake sync counters
* fake 2-second synchronization
* fake offline persistence
* fake connectivity-driven state transitions
* any mock that exists solely to simulate offline behavior

Do not leave the old implementation as dead duplicate code.

---

# 24. ERROR HANDLING

Every failure should have an explicit state.

Examples:

```text
NETWORK_UNAVAILABLE
BACKEND_UNAVAILABLE
VALIDATION_ERROR
AUTHENTICATION_ERROR
CONFLICT
SERVER_ERROR
MALFORMED_RESOURCE
RETRY_EXHAUSTED
```

Do not catch exceptions and silently ignore them.

Do not display raw stack traces to users.

Log useful diagnostic information without logging sensitive patient data.

---

# 25. SECURITY PREPARATION

Full authentication is Phase 2.

However, do not design Phase 1 in a way that makes authentication impossible later.

The sync protocol must have a clear place for:

```text
authenticated user
facility
device
```

Do not hardcode credentials.

Do not embed production secrets in Flutter.

Use environment/configuration abstractions.

---

# 26. DATA OWNERSHIP

Every locally-created resource should carry enough provenance to determine:

```text
who created it
where it was created
which device created it
when it was created
```

Use FHIR-compatible provenance concepts where appropriate.

Do not create fake clinical facts.

---

# 27. PERFORMANCE REQUIREMENTS

The app must remain responsive with at least:

```text
500 patients
5,000+ FHIR resources
1,000 pending sync operations
```

Do not load the entire local database into memory.

Use pagination/indexing.

Add indexes for common lookups:

* resource type
* resource ID
* sync state
* modified timestamp
* queue status

---

# 28. DOCUMENT THE ARCHITECTURE

Update the implementation documentation with the REAL architecture.

Include:

```text
Flutter
  ↓
Use Cases
  ↓
Repositories
  ↓
Drift SQLite
  ↓
Sync Queue
  ↓
Sync Coordinator
  ↓
NestJS Gateway
  ↓
FHIR Server
```

Also document:

* offline write flow
* push flow
* pull flow
* retry flow
* idempotency
* conflict detection
* tombstones
* versioning

Do NOT document functionality that has not actually been implemented.

---

# 29. DO NOT DO THESE THINGS IN PHASE 1

Do NOT:

* implement teleconsultation
* implement LiveKit
* migrate referrals
* migrate teleconsultation
* build RBAC
* build district analytics
* add AI diagnosis
* add chatbot
* redesign the entire UI
* add unnecessary microservices
* add blockchain
* add random AI features
* replace FHIR with a custom model

Those are later phases.

This phase is about creating the **trustworthy data foundation**.

---

# 30. DEFINITION OF DONE

Phase 1 is complete ONLY if all of these are true:

### Persistence

* [ ] SQLite/Drift implemented
* [ ] patient data survives app restart
* [ ] encounter data survives app restart
* [ ] FHIR resources survive app restart

### Offline

* [ ] application works without network
* [ ] no fake offline counters
* [ ] clinical writes work offline
* [ ] pending mutations survive restart

### Sync

* [ ] push implemented
* [ ] pull implemented
* [ ] retry implemented
* [ ] idempotency implemented
* [ ] per-operation status implemented

### Safety

* [ ] no silent data loss
* [ ] conflict detection implemented
* [ ] deletion/tombstone strategy implemented
* [ ] provenance metadata preserved

### Backend

* [ ] sync endpoint implemented
* [ ] batch processing implemented
* [ ] duplicate operations handled safely
* [ ] errors returned per operation

### UX

* [ ] offline status visible
* [ ] pending count visible
* [ ] sync progress visible
* [ ] sync errors visible
* [ ] conflict state visible

### Testing

* [ ] offline persistence test
* [ ] restart test
* [ ] reconnect test
* [ ] duplicate retry test
* [ ] conflict test
* [ ] pull test
* [ ] failure/retry test
* [ ] atomicity test

### Demonstration

The complete:

```text
AIRPLANE MODE
→ CREATE PATIENT
→ CREATE ENCOUNTER
→ KILL APP
→ REOPEN
→ RESTORE INTERNET
→ SYNC
→ SERVER
→ DASHBOARD
```

flow must work with real data.

---

# 31. FINAL REPORT

After implementation, do NOT simply say "Phase 1 completed."

Provide:

## Files Changed

List every file.

## Architecture Changes

Explain the new architecture.

## Database Schema

Show the Drift tables and their purpose.

## Sync Protocol

Explain push/pull/idempotency/retry/conflict handling.

## API Changes

List new/modified endpoints.

## FHIR Handling

Explain exactly what resources are persisted and synchronized.

## Tests

List every test and its result.

## Demo Procedure

Give exact steps to demonstrate offline-first functionality.

## Remaining Risks

Be brutally honest.

## Phase 2 Recommendation

Recommend the next phase based on the ACTUAL implementation, not the original plan.

STOP after the report.

Do not begin Phase 2 automatically.
