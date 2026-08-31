# SIH-26133 — PHASE 14 MASTER PROMPT

# PRODUCTION RELIABILITY + OBSERVABILITY + DISASTER RECOVERY + CHAOS ENGINEERING

## MISSION

Transform Setu from a feature-complete hackathon prototype into a **production-operable healthcare platform**.

The goal of this phase is to answer the questions a serious technical judge, government architect, or production engineering team will ask:

> What happens when the network disappears?

> What happens when HAPI FHIR goes down?

> What happens when PostgreSQL goes down?

> What happens when a device crashes halfway through synchronization?

> What happens when the same patient is edited on two devices?

> What happens when 50,000 frontline devices reconnect simultaneously?

> How do operators know the system is failing?

> Can the system recover without losing clinical data?

> Can we prove what happened after an incident?

Do NOT add superficial dashboards.

Build the underlying reliability mechanisms first.

---

# ABSOLUTE RULES

1. Never claim high availability without testing it.
2. Never claim zero data loss without evidence.
3. Never silently discard clinical data.
4. Never silently overwrite conflicting resources.
5. Never retry indefinitely.
6. Never let one failed resource block an entire synchronization batch.
7. Never let analytics failure block clinical workflows.
8. Never let external integration failure destroy local clinical data.
9. Never expose PHI through observability systems.
10. Never use fake metrics.
11. Never create "simulated uptime" numbers.
12. Every reliability metric must come from real system events.
13. Every failure mode must have deterministic recovery behavior.
14. Every critical operation must be idempotent.
15. Every destructive operation must be auditable.
16. Offline clinical capture must remain functional when the central backend is unavailable.
17. Build on the existing architecture. Do not rewrite working components unnecessarily.

---

# PHASE 1 — COMPLETE SYSTEM RELIABILITY AUDIT

Inspect the entire repository.

Audit:

```text
Flutter
NestJS
HAPI FHIR
PostgreSQL
SQLite
Sync Coordinator
Authentication
FHIR
Referral
Teleconsult
Care Pathways
Inventory
Analytics
Alerts
Consent
Interoperability
Audit
```

Search for:

```text
TODO
FIXME
throw new
catch
retry
timeout
setTimeout
setInterval
Promise
axios
http
database
transaction
queue
sync
cache
```

Create:

```text
PHASE_14_RELIABILITY_AUDIT.md
```

Classify every critical operation:

```text
NO FAILURE HANDLING
PARTIAL FAILURE HANDLING
RETRYABLE
IDEMPOTENT
TRANSACTIONAL
RECOVERABLE
PRODUCTION READY
```

---

# PHASE 2 — DEFINE SYSTEM FAILURE DOMAINS

Create:

```text
RELIABILITY_ARCHITECTURE.md
```

Explicitly model:

```text
Mobile Device
      |
      | Network
      ↓
API Gateway
      |
      ├── PostgreSQL
      |
      ├── HAPI FHIR
      |
      ├── LiveKit
      |
      ├── Analytics
      |
      ├── Alerting
      |
      └── Interoperability
```

For every dependency define:

```text
failure
timeout
retry policy
fallback
recovery
user-visible behavior
```

---

# PHASE 3 — FAILURE CLASSIFICATION

Create a standard error taxonomy.

At minimum:

```text
NETWORK_ERROR
TIMEOUT
AUTH_EXPIRED
FORBIDDEN
FHIR_UNAVAILABLE
DATABASE_UNAVAILABLE
VALIDATION_ERROR
CONFLICT
RATE_LIMITED
DEPENDENCY_FAILURE
UNKNOWN
```

Distinguish:

```text
TRANSIENT
PERMANENT
REQUIRES_HUMAN_ACTION
```

---

# PHASE 4 — GLOBAL REQUEST CORRELATION

Every backend request must have:

```text
requestId
traceId
timestamp
actor
facility
```

where appropriate.

Ensure the same correlation identifier can be followed across:

```text
Flutter
→ NestJS
→ FHIR
→ database
→ audit
```

---

# PHASE 5 — STRUCTURED LOGGING

Replace ad-hoc logging with structured events.

Example conceptual format:

```text
{
  event: "SYNC_BATCH_COMPLETED",
  requestId: "...",
  operationCount: 25,
  successCount: 24,
  conflictCount: 1,
  durationMs: 840
}
```

Do NOT include PHI.

---

# PHASE 6 — PHI LOGGING AUDIT

Search every backend and Flutter log statement.

Explicitly detect:

```text
patient name
phone
ABHA
DOB
diagnosis
vitals
clinical notes
FHIR payload
```

Remove or redact them.

---

# PHASE 7 — LOG LEVELS

Implement meaningful levels:

```text
DEBUG
INFO
WARN
ERROR
FATAL
```

Production must not run with uncontrolled DEBUG logging.

---

# PHASE 8 — METRICS ENGINE

Create real application metrics.

At minimum:

```text
sync_success_total
sync_failure_total
sync_conflict_total
sync_latency
FHIR_request_total
FHIR_failure_total
FHIR_latency
referral_created_total
referral_completed_total
referral_sla_breach_total
teleconsult_started_total
teleconsult_failed_total
consent_denied_total
care_gap_open_total
care_gap_resolved_total
inventory_shortage_total
```

Only instrument metrics that correspond to actual application events.

---

# PHASE 9 — METRIC LABEL SAFETY

Never label metrics with:

```text
patientId
patientName
phone
ABHA
diagnosis
```

Use safe dimensions such as:

```text
facility
role
operation
resourceType
status
```

and only where cardinality remains bounded.

---

# PHASE 10 — HEALTH CHECKS

Implement:

```text
/health
```

and appropriate readiness/liveness endpoints.

Separate:

```text
LIVENESS
READINESS
DEPENDENCY HEALTH
```

---

# PHASE 11 — DEPENDENCY HEALTH

Expose internal health status for:

```text
PostgreSQL
HAPI FHIR
LiveKit
Redis/queue if actually used
external interoperability provider
```

Do not make liveness fail merely because an optional dependency is unavailable.

---

# PHASE 12 — READINESS POLICY

Define exactly what prevents the API from accepting traffic.

Example:

```text
PostgreSQL unavailable
→ not ready

LiveKit unavailable
→ API may remain ready
→ teleconsult unavailable

Analytics unavailable
→ clinical workflows continue
```

Base the policy on actual architecture.

---

# PHASE 13 — TIMEOUT POLICY

Every external call must have an explicit timeout.

Audit:

```text
FHIR
database
LiveKit
external exchange
HTTP APIs
```

No request should hang indefinitely.

---

# PHASE 14 — RETRY POLICY

Implement bounded retries.

Use:

```text
exponential backoff
jitter
maximum attempts
dead-letter handling
```

Do not retry:

```text
validation errors
authorization errors
known permanent conflicts
```

---

# PHASE 15 — IDEMPOTENCY AUDIT

Identify every operation that may be retried.

Verify idempotency for:

```text
sync push
FHIR creation
referral creation
teleconsult token request where applicable
health record exchange
consent operations
inventory synchronization
```

---

# PHASE 16 — IDEMPOTENCY TEST

For every idempotent operation:

```text
request
↓
success
↓
same request again
```

Verify:

```text
no duplicate resource
no duplicate clinical action
```

---

# PHASE 17 — CIRCUIT BREAKERS

For unstable dependencies implement circuit-breaking behavior where appropriate.

States:

```text
CLOSED
OPEN
HALF_OPEN
```

Do not implement a circuit breaker merely for appearance; connect it to real dependency calls.

---

# PHASE 18 — HAPI FHIR FAILURE

Simulate:

```text
HAPI FHIR OFFLINE
```

Verify:

```text
mobile capture continues
local SQLite remains usable
sync queue persists
backend returns dependency failure
no false success
retry occurs later
```

---

# PHASE 19 — DATABASE FAILURE

Simulate PostgreSQL failure.

Verify:

```text
API does not hang indefinitely
clinical client receives deterministic error
audit behavior is defined
recovery works after database returns
```

---

# PHASE 20 — NETWORK PARTITION

Simulate:

```text
mobile ↔ server disconnected
```

for:

```text
5 minutes
1 hour
24 hours
```

Verify queue stability.

---

# PHASE 21 — DEVICE CRASH

Simulate:

```text
create clinical record
↓
kill application
```

at different stages:

```text
before SQLite commit
after SQLite commit
during sync
after server acknowledgement
before client acknowledgement
```

Verify no clinical record is lost or duplicated.

---

# PHASE 22 — SYNC STATE MACHINE

Formalize:

```text
PENDING
→ PROCESSING
→ COMPLETED
```

and:

```text
PENDING
→ PROCESSING
→ RETRYING
→ COMPLETED
```

and:

```text
PROCESSING
→ FAILED
→ DEAD_LETTER
```

and:

```text
PROCESSING
→ CONFLICT
```

---

# PHASE 23 — CRASH RECOVERY

If the app dies while an operation is:

```text
PROCESSING
```

it must eventually return to a recoverable state.

Never leave operations permanently stuck.

---

# PHASE 24 — STALE OPERATION DETECTION

Implement detection for operations stuck in:

```text
PROCESSING
```

longer than a safe threshold.

---

# PHASE 25 — SYNC LEASES

If required by the existing architecture, introduce a lease/claim mechanism so that two workers cannot simultaneously process the same queue item incorrectly.

---

# PHASE 26 — BATCH FAILURE ISOLATION

Given:

```text
100 operations
```

where:

```text
95 succeed
5 fail
```

the client must retain the five failed operations without replaying the successful 95 unnecessarily.

---

# PHASE 27 — PARTIAL RESPONSE HANDLING

Verify Flutter correctly handles per-operation server responses:

```text
APPLIED
DUPLICATE
CONFLICT
RETRY
PERMANENT_FAILURE
```

---

# PHASE 28 — BACKOFF PERSISTENCE

Retry state must survive:

```text
application restart
device reboot
network loss
```

---

# PHASE 29 — DEAD LETTER QUEUE

Implement durable dead-letter handling.

Each dead-letter operation should preserve:

```text
operationId
resourceId
failureCode
attemptCount
lastAttempt
reason
```

Do not store unnecessary PHI.

---

# PHASE 30 — HUMAN RECOVERY

Create an authorized diagnostics interface allowing operators to inspect:

```text
failed sync
conflict
dead-letter
```

and perform appropriate actions:

```text
RETRY
RESOLVE
DISCARD
```

with authorization and audit.

---

# PHASE 31 — DISCARD SAFETY

A clinical record must never be discarded silently.

Require:

```text
reason
actor
timestamp
```

and generate an audit event.

---

# PHASE 32 — CONFLICT ENGINE AUDIT

Review the current conflict system.

Verify it handles:

```text
same resource edited on two devices
same Task updated by two facilities
same Consent modified offline
same medication updated concurrently
```

---

# PHASE 33 — CONFLICT SEMANTICS

Do not blindly use:

```text
last write wins
```

for clinically significant data.

Classify conflicts:

```text
AUTO_RESOLVABLE
CLINICAL_REVIEW_REQUIRED
SECURITY_REVIEW_REQUIRED
```

---

# PHASE 34 — CLINICAL CONFLICT EXAMPLE

If:

```text
Device A:
BP = 170/115

Device B:
BP = 120/80
```

do not blindly replace one Observation.

Both clinical observations may be valid events.

Model them as separate observations when appropriate.

---

# PHASE 35 — STATE CONFLICTS

For stateful resources such as:

```text
Task
CarePlan
Consent
```

use explicit transition rules and conflict handling.

---

# PHASE 36 — AUDIT CONFLICT RESOLUTION

Every manual conflict resolution must record:

```text
original state
incoming state
decision
actor
reason
timestamp
```

---

# PHASE 37 — DATABASE TRANSACTION AUDIT

Identify multi-table operations.

Ensure operations such as:

```text
clinical resource
+
sync queue
```

are atomic.

---

# PHASE 38 — FHIR TRANSACTION SAFETY

Where multiple FHIR resources must succeed together, use an appropriate FHIR transaction mechanism rather than independent writes when clinically required.

---

# PHASE 39 — FHIR PARTIAL FAILURE

Simulate:

```text
FHIR transaction rejected
```

Verify the local system does not incorrectly mark all resources as synchronized.

---

# PHASE 40 — FHIR SERVER RECOVERY

Stop HAPI FHIR.

Create:

```text
10 offline records
```

Restart HAPI.

Reconnect.

Verify:

```text
10 records eventually synchronized
```

without duplication.

---

# PHASE 41 — LOAD MODEL

Estimate realistic deployment scale.

At minimum model:

```text
1 facility
10 facilities
100 facilities
1,000 facilities
10,000 frontline devices
```

Do not claim capacity without benchmarking.

---

# PHASE 42 — CONCURRENCY TEST

Simulate many clients reconnecting simultaneously.

Measure:

```text
requests/sec
sync operations/sec
FHIR operations/sec
database CPU
database connections
latency
error rate
```

---

# PHASE 43 — THUNDERING HERD

Specifically test:

```text
network outage
↓
network restored
↓
thousands of devices reconnect
```

The system must avoid an uncontrolled synchronization spike.

---

# PHASE 44 — CLIENT JITTER

If appropriate, introduce randomized synchronization delay so every device does not reconnect simultaneously.

---

# PHASE 45 — SERVER BACKPRESSURE

Implement safe behavior when the backend is overloaded.

Use:

```text
429
Retry-After
bounded retry
```

where appropriate.

---

# PHASE 46 — RATE LIMITING

Protect:

```text
login
patient search
FHIR search
FHIR export
sync push
sync pull
teleconsult token
```

with appropriate limits.

Do not use one arbitrary global limit for every endpoint.

---

# PHASE 47 — DATABASE CONNECTION POOL

Audit:

```text
pool size
timeouts
connection leaks
long transactions
```

---

# PHASE 48 — FHIR CONNECTION MANAGEMENT

Audit:

```text
HTTP keep-alive
connection reuse
timeouts
retry behavior
```

---

# PHASE 49 — CACHE AUDIT

Identify existing caches.

For each:

```text
source of truth
TTL
invalidation
staleness tolerance
privacy
```

---

# PHASE 50 — CLINICAL CACHE SAFETY

Never serve stale clinical data as if it were current.

Display:

```text
Last synchronized
```

where appropriate.

---

# PHASE 51 — OFFLINE DATA FRESHNESS

The mobile app should distinguish:

```text
CURRENT
RECENT
STALE
UNKNOWN
```

based on real synchronization timestamps.

---

# PHASE 52 — OFFLINE UI

Upgrade offline UX.

Show:

```text
Offline
Last synchronized: 2h ago
Pending: 7
Failed: 1
```

Do not show fake "connected" states.

---

# PHASE 53 — SYNC OBSERVABILITY

Create a sync diagnostics screen showing:

```text
queue size
pending
processing
completed
failed
conflict
dead-letter
last sync
last failure
retry count
```

All values must come from SQLite/backend state.

---

# PHASE 54 — DISTRICT OPERATIONS DASHBOARD

Create a real operations dashboard.

Metrics:

```text
active facilities
online/offline devices where available
sync backlog
FHIR health
API health
failed exchanges
SLA breaches
```

Avoid patient-level PHI.

---

# PHASE 55 — INCIDENT DETECTION

Create alerts for:

```text
FHIR unavailable
database unavailable
sync failure spike
SLA breach spike
exchange failure spike
dead-letter growth
authentication failure spike
```

---

# PHASE 56 — ALERT DEDUPLICATION

Prevent one incident from generating thousands of identical alerts.

---

# PHASE 57 — ALERT ESCALATION

Implement severity:

```text
INFO
WARNING
CRITICAL
```

and escalation behavior appropriate to the system.

---

# PHASE 58 — INCIDENT LIFECYCLE

Model:

```text
OPEN
ACKNOWLEDGED
INVESTIGATING
RESOLVED
```

where appropriate.

---

# PHASE 59 — INCIDENT AUDIT

Record:

```text
opened
acknowledged
resolved
actor
timestamp
```

---

# PHASE 60 — RECOVERY OBJECTIVES

Define realistic targets:

```text
RPO
RTO
```

for:

```text
PostgreSQL
FHIR
sync
audit
interoperability
```

Do not invent impressive numbers.

Base them on actual architecture.

---

# PHASE 61 — BACKUP STRATEGY

Document:

```text
PostgreSQL backup
FHIR backup
audit backup
configuration backup
```

---

# PHASE 62 — BACKUP RESTORE TEST

A backup is not considered production-ready until restoration has been tested.

Document:

```text
backup created
restore executed
data verified
integrity checked
```

---

# PHASE 63 — FHIR RESTORE

Verify restored FHIR data maintains:

```text
resource IDs
references
versions
provenance
audit relationships
```

---

# PHASE 64 — DATABASE MIGRATION SAFETY

Audit migrations for:

```text
destructive operations
data loss
locking
rollback
```

---

# PHASE 65 — MIGRATION TEST

Test migrations against representative data.

Verify:

```text
old version
→ migration
→ new version
```

with no clinical data loss.

---

# PHASE 66 — VERSION COMPATIBILITY

Document API/client compatibility.

The server must handle older mobile clients gracefully where practical.

---

# PHASE 67 — MOBILE APP VERSIONING

Implement a safe minimum-supported-version mechanism if missing.

Do not suddenly block healthcare workers without a controlled migration path.

---

# PHASE 68 — FEATURE FLAGS

Introduce controlled feature flags for risky capabilities.

Examples:

```text
teleconsult
external exchange
new triage protocol
new referral routing
```

---

# PHASE 69 — CLINICAL RULE VERSIONING

Ensure triage rule versions are independently versioned.

A protocol update must not retroactively change historical RiskAssessments.

---

# PHASE 70 — RULE ENGINE REGRESSION TESTS

Build a clinical regression suite.

Example:

```text
BP 170/115
→ EMERGENCY
```

Also test boundary conditions.

---

# PHASE 71 — BOUNDARY TESTING

For every major clinical threshold test:

```text
threshold - 1
threshold
threshold + 1
```

---

# PHASE 72 — SAFETY MONITORING

Create a clinical safety event model for:

```text
incorrect triage
missed referral
delayed sync
failed alert
failed escalation
```

Do not automatically diagnose errors; capture events for review.

---

# PHASE 73 — ALERT FAILURE SAFETY

If push notification fails:

```text
clinical state must still exist
```

Notification cannot be the source of truth.

---

# PHASE 74 — SLA CLOCK SAFETY

SLA calculation must use a reliable server-side time source where possible.

Do not trust manipulated device clocks for critical SLA enforcement.

---

# PHASE 75 — CLOCK SKEW

Handle devices with incorrect system clocks.

---

# PHASE 76 — SECURITY INCIDENT OBSERVABILITY

Detect:

```text
repeated 401
repeated 403
cross-facility attempts
token abuse
unusual export volume
```

---

# PHASE 77 — SECURITY ALERT PRIVACY

Security logs must identify the event without exposing clinical payloads.

---

# PHASE 78 — TELECONSULT FAILURE

Simulate:

```text
token failure
LiveKit unavailable
camera denied
microphone denied
network interruption
```

Verify the referral and clinical workflow remain intact.

---

# PHASE 79 — TELECONSULT FALLBACK

If video fails:

```text
referral remains active
clinical record remains intact
alternative workflow is visible
```

---

# PHASE 80 — INVENTORY FAILURE

If inventory synchronization fails:

```text
last known stock
timestamp
staleness
```

must be visible.

Do not present stale stock as real-time availability.

---

# PHASE 81 — ANALYTICS FAILURE

Kill analytics components.

Verify:

```text
patient capture
triage
referral
medication
FHIR
```

continue working.

---

# PHASE 82 — CARE GAP FAILURE

If care-gap computation fails:

```text
clinical records remain intact
```

and the system clearly indicates analytics degradation.

---

# PHASE 83 — OBSERVABILITY FAILURE

Monitoring itself must not become a dependency for clinical workflows.

If metrics fail:

```text
clinical operation continues
```

where safe.

---

# PHASE 84 — CHAOS TEST MATRIX

Create:

```text
CHAOS_TEST_MATRIX.md
```

Test:

```text
network down
FHIR down
Postgres down
LiveKit down
slow FHIR
slow database
partial batch failure
duplicate request
device crash
server restart
clock skew
expired JWT
high concurrency
exchange outage
```

---

# PHASE 85 — AUTOMATED FAILURE TESTS

Automate as many deterministic failure scenarios as practical.

---

# PHASE 86 — RECOVERY VERIFICATION

For every failure test prove:

```text
failure detected
state preserved
user informed
retry/recovery triggered
final state correct
audit generated
```

---

# PHASE 87 — DATA INTEGRITY CHECKER

Create a backend integrity audit capable of detecting:

```text
orphaned FHIR references
duplicate resources
missing Tasks
missing ServiceRequests
broken Patient links
sync records without resources
resources without sync history
```

---

# PHASE 88 — CLINICAL INTEGRITY CHECK

Detect impossible relationships such as:

```text
Task → Patient A
ServiceRequest → Patient B
```

---

# PHASE 89 — FACILITY INTEGRITY CHECK

Detect resources whose facility metadata conflicts with authorization boundaries.

---

# PHASE 90 — RECONCILIATION JOB

Create a controlled reconciliation process.

It should produce:

```text
healthy
warning
critical
```

rather than silently modifying data.

---

# PHASE 91 — SAFE REPAIR

Automatic repair must only occur for deterministic technical inconsistencies.

Clinical ambiguity must be routed to human review.

---

# PHASE 92 — PRODUCTION READINESS SCORE

Create:

```text
PRODUCTION_READINESS.md
```

Score:

```text
Reliability
Security
Observability
Data integrity
Recovery
Scalability
Offline resilience
Clinical safety
Interoperability
```

Use evidence, not subjective claims.

---

# PHASE 93 — SLA/SLO DOCUMENT

Create:

```text
SLO.md
```

Define measurable indicators such as:

```text
API availability
FHIR availability
sync success rate
sync latency
referral processing latency
teleconsult availability
exchange success rate
```

Only include metrics actually instrumented.

---

# PHASE 94 — DASHBOARD DESIGN

Create operational dashboards around:

```text
System Health
Sync Health
FHIR Health
Referral Health
Interoperability Health
Security Events
```

No PHI.

---

# PHASE 95 — DEMO MODE

Create a controlled demo environment.

It must be possible to demonstrate:

```text
healthy system
FHIR failure
network failure
sync recovery
conflict
alert
recovery
```

without manually editing database records.

---

# PHASE 96 — CHAOS DEMO

Create:

```text
PHASE_14_RELIABILITY_DEMO.md
```

Flagship demonstration:

```text
1. ASHA creates patient offline.

2. Device loses network.

3. Patient data remains persistent.

4. Multiple clinical resources are created.

5. Network reconnects.

6. HAPI FHIR is intentionally unavailable.

7. Sync does NOT claim success.

8. Operations enter retry state.

9. HAPI FHIR returns.

10. Sync resumes automatically.

11. One operation conflicts.

12. Conflict is isolated.

13. Other operations complete.

14. Dashboard detects the conflict.

15. Authorized operator resolves it.

16. AuditEvent records the decision.

17. Final patient timeline is correct.

18. System health returns to GREEN.
```

---

# PHASE 97 — SCALE DEMO

Demonstrate realistic concurrent synchronization.

Do not fabricate numbers.

Show measured:

```text
clients
operations
throughput
latency
failure rate
```

---

# PHASE 98 — INCIDENT DEMO

Demonstrate:

```text
FHIR DOWN
```

and show:

```text
FHIR status → RED
sync backlog → increases
clinical capture → continues
```

Then restore FHIR:

```text
FHIR → GREEN
backlog → drains
```

This is an extremely strong judge demonstration.

---

# PHASE 99 — ARCHITECTURE DOCUMENTATION

Update:

```text
ARCHITECTURE.md
```

to include:

```text
failure domains
retry
queues
observability
health checks
recovery
backup
```

---

# PHASE 100 — FINAL TRACEABILITY

Create:

```text
PHASE_14_TRACEABILITY.md
```

Map:

```text
Requirement
→ Implementation
→ Failure scenario
→ Recovery
→ Test
→ Evidence
```

---

# PHASE 101 — FINAL REPORT

Create:

```text
PHASE_14_FINAL_REPORT.md
```

Include:

## 1. Reliability Architecture

## 2. Failure Domains

## 3. Sync Reliability

## 4. FHIR Reliability

## 5. Database Reliability

## 6. Offline Resilience

## 7. Conflict Resolution

## 8. Observability

## 9. Metrics

## 10. Health Checks

## 11. Alerting

## 12. Security Monitoring

## 13. Data Integrity

## 14. Backup & Recovery

## 15. Disaster Recovery

## 16. Performance Testing

## 17. Load Testing

## 18. Chaos Testing

## 19. Clinical Safety

## 20. Production Readiness

## 21. Measured Results

## 22. Remaining P0/P1 Risks

## 23. Final Demo Procedure

---

# REQUIRED FINAL OUTPUT

After implementation, return:

```text
PHASE 14 COMPLETE

Files changed:
...

Architecture changes:
...

Reliability mechanisms:
...

Failure scenarios tested:
...

Metrics:
...

Load test results:
...

Recovery test results:
...

Backup/restore results:
...

Chaos test results:
...

Clinical safety tests:
...

Security tests:
...

Known limitations:
...

P0 risks:
...

P1 risks:
...

Production readiness:
...
```

For every claimed capability provide concrete evidence:

```text
FILE
FUNCTION
TEST
RESULT
```

Do not say:

"implemented successfully"

without identifying where and how it was verified.

---

# STOP CONDITION

After completing Phase 14:

STOP.

Do not begin Phase 15.

Wait for further instructions.
