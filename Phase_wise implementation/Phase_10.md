# SIH-26133 — PHASE 10 MASTER PROMPT

# PRODUCTION HARDENING + DISTRICT-SCALE RELIABILITY + CLINICAL SAFETY

Repository:

https://github.com/neelshingavi/SIH2026

---

# MISSION

Phase 10 is the final production-hardening phase.

Do NOT add random new features.

Do NOT build another dashboard merely for visual appeal.

Do NOT create fake AI.

Do NOT create mock integrations.

Do NOT rewrite working architecture unnecessarily.

The objective is to prove that Setu can operate as a resilient, secure, observable, clinically safe platform across:

```text
poor connectivity
device restarts
duplicate requests
server failures
FHIR downtime
database failures
LiveKit downtime
external exchange downtime
high concurrency
stale data
conflicting updates
expired authentication
partial synchronization
large patient populations
```

The final system must behave like a real production healthcare platform rather than a hackathon demo.

---

# PHASE 0 — FULL SYSTEM FORENSIC AUDIT

Before changing anything, inspect the COMPLETE repository.

Audit:

```text
frontline-app
core-gateway
portals
FHIR integration
authentication
authorization
sync
referrals
teleconsult
triage
care pathways
care gaps
inventory
analytics
alerts
interoperability
consent
audit
provenance
database
Docker
deployment
configuration
tests
```

Search globally for:

```text
TODO
FIXME
mock
fake
dummy
hardcoded
random
setState
localhost
console.log
print(
throw new Error
catch
try
```

Also search for:

```text
password
secret
token
apiKey
privateKey
JWT
DATABASE_URL
LIVEKIT
FHIR
ABDM
```

Create:

```text
PHASE_10_PRE_AUDIT.md
```

Classify every important finding:

```text
P0 = patient-safety / data-loss / authorization failure
P1 = production-breaking reliability/security issue
P2 = significant engineering weakness
P3 = polish/documentation
```

---

# PHASE 1 — SYSTEM RELIABILITY CONTRACT

Create:

```text
RELIABILITY_CONTRACT.md
```

Define explicit guarantees.

Example:

```text
Patient data must never be silently lost.

Offline mutations must survive process termination.

Sync retries must be idempotent.

Unauthorized users must never access another facility.

Clinical decisions must be reproducible.

FHIR resources must remain traceable.

External exchange must never report false success.

Failures must become observable states.

Critical workflows must degrade safely.
```

---

# PHASE 2 — FAILURE MATRIX

Create:

```text
FAILURE_MODE_MATRIX.md
```

For every subsystem document:

```text
Component
Failure
User-visible behavior
Backend behavior
Recovery
Audit event
Alert
Data-loss risk
```

Cover:

```text
Flutter
SQLite
Sync
API Gateway
Postgres
HAPI FHIR
LiveKit
Exchange Adapter
Analytics
Notifications
```

---

# PHASE 3 — OFFLINE-FIRST CHAOS TESTING

The application must survive:

```text
offline
online
offline during write
online during write
process killed during write
process killed during sync
device reboot
network changes
slow network
intermittent network
```

Test:

```text
Create Patient
Create Encounter
Create Observation
Create RiskAssessment
Create Referral
Create CarePlan
Create MedicationRequest
```

while offline.

Kill the application.

Restart.

Verify every resource exists locally.

---

# PHASE 4 — ATOMIC LOCAL WRITE GUARANTEE

Verify:

```text
FHIR resource
+
sync queue entry
```

are created atomically.

Test forced failure between:

```text
resource insert
queue insert
```

Expected:

```text
BOTH COMMIT
OR
BOTH ROLLBACK
```

Never allow:

```text
resource exists but no queue entry
```

or:

```text
queue exists but resource missing
```

---

# PHASE 5 — SYNC CRASH RECOVERY

Simulate:

```text
push starts
operation 1 succeeds
operation 2 succeeds
operation 3 crashes
```

Restart.

Expected:

```text
1 and 2 are not duplicated
3 is retried
remaining queue continues
```

---

# PHASE 6 — IDEMPOTENCY HARDENING

Verify idempotency across:

```text
same request
same operationId
same idempotencyKey
different requestId
network retry
client retry
server retry
```

Never rely solely on:

```text
in-memory state
```

Idempotency must survive:

```text
server restart
```

---

# PHASE 7 — EXACTLY-ONCE SEMANTICS

Do NOT claim literal distributed exactly-once execution if the architecture cannot guarantee it.

Instead document:

```text
at-least-once delivery
+
idempotent processing
```

and prove that this provides effectively-once clinical mutation semantics.

---

# PHASE 8 — SYNC ORDERING

Verify dependency ordering.

Example:

```text
Patient
↓
Encounter
↓
Observation
↓
RiskAssessment
↓
ServiceRequest
↓
Task
```

Do not submit a dependent resource before its required referenced resource is available unless FHIR references and server semantics explicitly support it.

---

# PHASE 9 — SYNC DAG

Represent dependencies where required.

Example:

```text
Patient
 ├── Encounter
 │    ├── Observation
 │    └── RiskAssessment
 │
 └── ServiceRequest
      └── Task
```

Sync engine must handle dependency failure safely.

---

# PHASE 10 — PARTIAL SYNC

If 100 operations exist and operation 57 fails:

Do not mark:

```text
58–100 = completed
```

unless they were independently processed successfully.

Maintain per-operation state.

---

# PHASE 11 — RETRY POLICY

Implement explicit retry classification:

```text
RETRYABLE
NON_RETRYABLE
AUTH_FAILURE
CONFLICT
VALIDATION_FAILURE
DEPENDENCY_FAILURE
SERVER_FAILURE
```

Use exponential backoff with jitter.

Avoid infinite retry loops.

---

# PHASE 12 — DEAD LETTER QUEUE

Operations exceeding retry threshold must enter:

```text
DEAD_LETTER
```

Provide authorized operator visibility.

The user must never silently lose the operation.

---

# PHASE 13 — CONFLICT RESOLUTION

Audit all conflict handling.

Support:

```text
VERSION_CONFLICT
IDENTITY_CONFLICT
REFERENCE_CONFLICT
BUSINESS_RULE_CONFLICT
```

Do not simply overwrite server state.

---

# PHASE 14 — CLINICAL CONFLICT SAFETY

For clinical resources:

```text
RiskAssessment
Condition
MedicationRequest
CarePlan
DiagnosticReport
```

do NOT perform naive last-write-wins.

Conflicts must be surfaced to an appropriate human workflow where clinically necessary.

---

# PHASE 15 — AUDIT TRAIL FOR CONFLICTS

Every conflict should record:

```text
resource
local version
server version
actor
facility
timestamp
resolution
resolver
```

---

# PHASE 16 — AUTHENTICATION HARDENING

Audit:

```text
JWT expiration
refresh tokens
logout
token rotation
revocation
secure storage
clock skew
```

Test:

```text
expired JWT
malformed JWT
wrong issuer
wrong audience
wrong role
revoked session
```

---

# PHASE 17 — OFFLINE AUTHENTICATION SAFETY

Design a secure field-worker behavior when:

```text
JWT expires
AND
device is offline
```

Do not simply allow unlimited offline access.

Implement a bounded offline authorization model.

Document:

```text
maximum offline session
allowed actions
reauthentication requirement
risk-sensitive restrictions
```

---

# PHASE 18 — ROLE MATRIX

Create an exhaustive authorization matrix.

Roles:

```text
ASHA
ANM
CHO
MEDICAL_OFFICER
SPECIALIST
PHARMACIST
LAB_TECHNICIAN
DISTRICT_ADMIN
SYSTEM_ADMIN
```

For each role define access to:

```text
Patient
Clinical assessment
Referral
Teleconsult
Medication
Diagnostics
Care gaps
Analytics
Inventory
Exchange
Audit
```

---

# PHASE 19 — FACILITY ISOLATION

Test:

```text
Facility A
Facility B
District A
District B
```

Attempt:

```text
read
create
update
delete
referral
teleconsult
exchange
analytics
```

across boundaries.

Expected:

```text
403
```

where unauthorized.

---

# PHASE 20 — ADMIN PRIVILEGE REVIEW

District administrators must NOT automatically gain unrestricted patient-level access.

Separate:

```text
aggregate analytics
```

from:

```text
patient-level clinical access
```

---

# PHASE 21 — FHIR ACCESS CONTROL

Do not assume that securing NestJS automatically secures HAPI FHIR.

Verify:

```text
HAPI FHIR cannot be directly accessed by unauthorized clients.
```

FHIR access must occur through the intended security boundary.

---

# PHASE 22 — DATABASE SECURITY

Audit:

```text
credentials
connection pooling
TLS
least privilege
migrations
indexes
backups
```

No production secrets in:

```text
source
Docker files
Flutter assets
Git history
logs
```

---

# PHASE 23 — SECRET SCANNING

Run a repository-wide secret scan.

Search for:

```text
JWT_SECRET
PASSWORD
API_KEY
PRIVATE_KEY
LIVEKIT_SECRET
DATABASE_PASSWORD
```

Verify Git history as well as current files.

---

# PHASE 24 — ENVIRONMENT SEPARATION

Create clear environments:

```text
development
testing
staging
production
```

No production credentials inside development configuration.

---

# PHASE 25 — CONFIGURATION VALIDATION

Application startup should fail fast when mandatory configuration is missing.

Do not silently fall back to:

```text
localhost
default password
default secret
mock endpoint
```

---

# PHASE 26 — DATABASE FAILURE

Simulate:

```text
Postgres unavailable
```

Expected:

```text
API fails gracefully
Flutter retains offline data
no data corruption
clear operational error
automatic recovery
```

---

# PHASE 27 — FHIR SERVER FAILURE

Stop HAPI FHIR.

Expected:

```text
clinical capture continues offline
sync enters pending state
no data loss
retry after recovery
```

---

# PHASE 28 — FHIR LATENCY

Simulate slow HAPI responses.

Verify:

```text
timeouts
bounded retries
no request pile-up
```

---

# PHASE 29 — CIRCUIT BREAKER

For downstream dependencies:

```text
HAPI FHIR
LiveKit
external exchange
```

consider circuit-breaker behavior.

When dependency is repeatedly failing:

```text
OPEN
↓
cooldown
↓
HALF_OPEN
↓
CLOSED
```

Do not hammer a failing dependency.

---

# PHASE 30 — TELECONSULT FAILURE

Simulate:

```text
LiveKit unavailable
network loss
token expired
participant disconnect
camera denied
microphone denied
```

Expected:

```text
safe fallback
clear status
no false "consult completed"
```

---

# PHASE 31 — TELECONSULT CLINICAL RECORD

A teleconsult must generate appropriate clinical traceability.

Where clinically appropriate:

```text
Encounter
Task
Provenance
AuditEvent
```

should reflect the consultation.

Do not create a fake encounter simply because a video room opened.

---

# PHASE 32 — TELECONSULT COMPLETION

Distinguish:

```text
ROOM_JOINED
CONSULT_STARTED
CONSULT_INTERRUPTED
CONSULT_COMPLETED
```

Do not equate:

```text
joined = completed
```

---

# PHASE 33 — CLINICAL RULE ENGINE GOVERNANCE

Audit the triage engine.

Every clinical rule must have:

```text
ruleId
version
effectiveDate
inputs
logic
severity
rationale
source/protocol reference
```

---

# PHASE 34 — RULE VERSIONING

Never silently change:

```text
v1.1.0
```

rules.

A patient assessment must retain the rule version used for classification.

---

# PHASE 35 — RULE REPRODUCIBILITY

Given:

```text
same input
same rule version
```

the result must be deterministic.

Test this.

---

# PHASE 36 — CLINICAL OVERRIDE

If a clinician overrides a rule-generated recommendation:

Record:

```text
original recommendation
override
actor
reason
timestamp
```

Never silently replace the original clinical decision.

---

# PHASE 37 — HIGH-RISK SAFETY

Audit emergency workflow.

For:

```text
severe hypertension
suspected pre-eclampsia
```

ensure:

```text
RiskAssessment
↓
Emergency escalation
↓
ServiceRequest
↓
Task
↓
alert
```

cannot silently disappear.

---

# PHASE 38 — EMERGENCY ESCALATION FAILURE

If referral cannot sync:

The app must clearly state:

```text
NOT YET DELIVERED
```

rather than:

```text
REFERRED
```

---

# PHASE 39 — SLA ENGINE AUDIT

Verify SLA calculations use:

```text
server time
```

or a clearly defined authoritative clock.

Avoid client-clock manipulation.

---

# PHASE 40 — SLA STATE MACHINE

Define:

```text
ON_TRACK
WARNING
BREACHED
RESOLVED
```

Transitions must be deterministic.

---

# PHASE 41 — CARE GAP CORRECTNESS

Audit every care-gap rule.

For each gap document:

```text
trigger
required action
deadline
owner
resolution condition
```

---

# PHASE 42 — FALSE POSITIVE CONTROL

A care gap must disappear only when the actual clinical completion condition is satisfied.

Do not resolve gaps because:

```text
button clicked
```

unless the underlying FHIR Task/action has actually reached the correct state.

---

# PHASE 43 — MEDICINE WORKFLOW

Verify:

```text
MedicationRequest
↓
MedicationDispense
```

relationship.

A prescription must not be interpreted as medication actually dispensed.

---

# PHASE 44 — STOCK CONSISTENCY

Audit inventory calculations under:

```text
concurrent dispense
offline dispense
duplicate dispense
failed dispense
```

Prevent negative or impossible inventory states.

---

# PHASE 45 — INVENTORY RECONCILIATION

Provide a reconciliation mechanism between:

```text
local stock
server stock
dispensing events
```

---

# PHASE 46 — ANALYTICS CORRECTNESS

Every dashboard metric must have:

```text
definition
FHIR source
filter
aggregation
time window
```

Document this.

---

# PHASE 47 — NO MISLEADING ANALYTICS

Do not display:

```text
100% referral completion
```

if the underlying dataset is incomplete.

Expose:

```text
data freshness
coverage
last updated
```

---

# PHASE 48 — DATA FRESHNESS

Dashboards should display:

```text
Last updated
Data freshness
Source
```

when useful.

---

# PHASE 49 — AGGREGATION PRIVACY

District dashboards must avoid exposing unnecessary patient-level PHI.

Prefer:

```text
counts
rates
trends
geographic aggregates
```

for administrators.

---

# PHASE 50 — SMALL-CELL PRIVACY

Consider suppression of extremely small aggregates where showing them could identify patients.

---

# PHASE 51 — OBSERVABILITY

Implement structured logs containing:

```text
timestamp
level
service
requestId
operation
latency
status
```

Never include unnecessary PHI.

---

# PHASE 52 — DISTRIBUTED REQUEST TRACING

Propagate:

```text
X-Request-ID
```

across:

```text
Flutter
NestJS
FHIR
exchange
LiveKit-related backend operations
```

where applicable.

---

# PHASE 53 — METRICS

Implement meaningful metrics:

```text
sync_success_total
sync_failure_total
sync_conflict_total
sync_latency
FHIR_request_latency
FHIR_error_total
referral_created_total
referral_breached_total
teleconsult_started_total
teleconsult_failed_total
exchange_success_total
exchange_failure_total
care_gap_open_total
care_gap_resolved_total
```

---

# PHASE 54 — HEALTH CHECKS

Implement:

```text
liveness
readiness
dependency health
```

Do not report:

```text
healthy
```

when critical dependencies are unavailable if the application cannot actually serve requests.

---

# PHASE 55 — BACKUP & RESTORE

Document:

```text
Postgres backup
FHIR backup
audit backup
restore procedure
```

Test an actual restore in a non-production environment.

---

# PHASE 56 — DISASTER RECOVERY

Define:

```text
RPO
RTO
```

for:

```text
FHIR
Postgres
audit
```

Document realistic values.

Do not invent unrealistic guarantees.

---

# PHASE 57 — DATA RETENTION

Document retention requirements for:

```text
clinical resources
audit events
sync records
exchange records
logs
```

Do not blindly retain everything forever.

---

# PHASE 58 — DELETION SAFETY

Audit deletion semantics.

Clinical records must not disappear simply because a user deletes a UI object.

Use appropriate lifecycle semantics.

---

# PHASE 59 — API CONTRACT TESTING

Verify OpenAPI contracts against implementation.

Detect:

```text
missing endpoint
wrong response schema
wrong status code
incorrect field
```

---

# PHASE 60 — FHIR CONTRACT TESTING

For every important FHIR resource:

```text
valid
invalid
missing reference
invalid code
duplicate identifier
version conflict
```

---

# PHASE 61 — LOAD TESTING

Create realistic load scenarios.

Example:

```text
100 facilities
1,000 concurrent workers
10,000 patients
100,000 FHIR resources
```

Do not claim these numbers were tested unless actually executed.

If local hardware prevents full load:

run a smaller benchmark and document extrapolation separately.

---

# PHASE 62 — SYNC LOAD TEST

Simulate:

```text
100 devices reconnect simultaneously
```

Measure:

```text
throughput
latency
error rate
queue growth
FHIR pressure
```

---

# PHASE 63 — THUNDERING HERD PROTECTION

When connectivity returns to thousands of devices:

Do not allow every device to immediately hammer the backend.

Use:

```text
jitter
batching
backoff
rate limiting
```

---

# PHASE 64 — API RATE LIMITING

Protect:

```text
authentication
patient search
FHIR queries
sync
referral
teleconsult token
exchange
```

---

# PHASE 65 — REQUEST SIZE LIMITS

Prevent oversized:

```text
FHIR Bundle
sync batch
exchange package
```

from exhausting memory.

---

# PHASE 66 — INPUT VALIDATION

Every public API must validate:

```text
type
length
enum
UUID
FHIR structure
facility
role
```

before processing.

---

# PHASE 67 — ERROR TAXONOMY

Standardize API errors:

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
DEPENDENCY_FAILURE
RATE_LIMITED
INTERNAL_ERROR
```

Do not leak stack traces.

---

# PHASE 68 — FRONTEND ERROR UX

Every important failure should have:

```text
what happened
what is safe
what happens next
retry action
```

Avoid generic:

```text
Something went wrong
```

---

# PHASE 69 — OFFLINE UX AUDIT

Every clinical screen must clearly indicate:

```text
ONLINE
OFFLINE
SYNCING
PENDING
SYNCED
CONFLICT
FAILED
```

Never confuse:

```text
saved locally
```

with:

```text
submitted to server
```

---

# PHASE 70 — CLINICAL ACTION CONFIRMATION

For high-risk actions:

```text
Emergency referral
Medication
Clinical override
Consent
Break-glass
```

show explicit confirmation and resulting state.

---

# PHASE 71 — ACCESSIBILITY

Audit:

```text
font sizes
contrast
touch targets
screen reader semantics
error messages
language support
```

especially for frontline workers operating outdoors.

---

# PHASE 72 — LOW-END DEVICE PERFORMANCE

Profile the Flutter application on constrained hardware.

Measure:

```text
startup
database query
patient timeline
form rendering
sync
FHIR serialization
```

---

# PHASE 73 — DATABASE INDEXING

Inspect all frequent queries.

Ensure indexes exist for:

```text
patientId
resourceType
facilityId
syncStatus
updatedAt
task.status
task.owner
serviceRequest.status
```

where applicable.

Do not blindly index everything.

---

# PHASE 74 — FHIR QUERY PERFORMANCE

Audit `$everything` and other patient queries.

Prevent:

```text
unbounded result sets
large synchronous responses
repeated identical queries
```

Use appropriate pagination/caching.

---

# PHASE 75 — CACHING

Identify safe cache candidates:

```text
facility metadata
terminology
inventory snapshots
clinical protocols
```

Do NOT blindly cache sensitive dynamic patient data.

---

# PHASE 76 — CACHE INVALIDATION

Every cache must have:

```text
TTL
version
invalidation strategy
```

---

# PHASE 77 — DEPLOYMENT HARDENING

Create production-oriented:

```text
Dockerfiles
docker-compose.production.yml
environment.example
health checks
migration strategy
```

Do not include secrets.

---

# PHASE 78 — CONTAINER SECURITY

Audit:

```text
root execution
unnecessary packages
open ports
debug mode
secrets
health checks
```

---

# PHASE 79 — NETWORK TOPOLOGY

Document:

```text
Internet
↓
Reverse Proxy
↓
NestJS
↓
HAPI FHIR
↓
Postgres
```

FHIR/Postgres should not be unnecessarily exposed publicly.

---

# PHASE 80 — TLS

Document production TLS termination.

Ensure:

```text
Flutter → HTTPS
Portal → HTTPS
Gateway → secure downstream communication
```

where required.

---

# PHASE 81 — SECURITY HEADERS

Audit portal/API security headers:

```text
CSP
HSTS
X-Content-Type-Options
frame restrictions
referrer policy
```

as appropriate.

---

# PHASE 82 — DEPENDENCY AUDIT

Run:

```text
npm audit
flutter pub outdated
```

and equivalent dependency checks.

Classify vulnerabilities.

Do not blindly upgrade packages that break compatibility.

---

# PHASE 83 — SUPPLY-CHAIN SECURITY

Pin or constrain important dependency versions.

Document:

```text
Node
Flutter
Dart
Java
Postgres
HAPI FHIR
```

versions.

---

# PHASE 84 — TEST PYRAMID

Ensure coverage exists at:

```text
unit
integration
API
FHIR
security
E2E
failure
```

levels.

---

# PHASE 85 — REGRESSION TESTS

Create a single flagship E2E regression:

```text
Jane Doe
↓
offline registration
↓
ANC assessment
↓
170/115
↓
RiskAssessment EMERGENCY
↓
CarePlan
↓
ServiceRequest
↓
Task
↓
offline persistence
↓
reconnect
↓
sync
↓
specialist accepts
↓
teleconsult
↓
diagnostic request
↓
diagnostic result
↓
MedicationRequest
↓
MedicationDispense
↓
follow-up Task
↓
Care Gap
↓
resolution
↓
AuditEvent
↓
Provenance
```

---

# PHASE 86 — CHAOS SCENARIO

Repeat the entire Jane Doe workflow while injecting:

```text
network loss
FHIR downtime
duplicate request
expired token
conflict
LiveKit failure
```

The system must never lose the clinical state.

---

# PHASE 87 — SECURITY REGRESSION

Automate:

```text
cross-facility access
role escalation
expired JWT
replay request
duplicate sync
patient enumeration
unauthorized FHIR access
teleconsult IDOR
exchange IDOR
```

---

# PHASE 88 — CLINICAL SAFETY REGRESSION

Verify:

```text
Emergency risk
cannot silently disappear

Emergency referral
cannot falsely become delivered

MedicationRequest
cannot become MedicationDispense automatically

Care gap
cannot disappear without resolution evidence

Clinical override
cannot erase original recommendation
```

---

# PHASE 89 — OPERATIONAL RUNBOOKS

Create:

```text
RUNBOOK_SYNC_FAILURE.md
RUNBOOK_FHIR_FAILURE.md
RUNBOOK_DATABASE_FAILURE.md
RUNBOOK_LIVEKIT_FAILURE.md
RUNBOOK_EXCHANGE_FAILURE.md
RUNBOOK_SECURITY_INCIDENT.md
```

Each should explain:

```text
symptoms
diagnosis
commands
recovery
verification
rollback
```

---

# PHASE 90 — INCIDENT RESPONSE

Create:

```text
INCIDENT_RESPONSE.md
```

Define:

```text
severity
containment
investigation
audit preservation
recovery
postmortem
```

---

# PHASE 91 — PRODUCTION READINESS CHECKLIST

Create:

```text
PRODUCTION_READINESS_CHECKLIST.md
```

Categories:

```text
Security
Clinical Safety
FHIR
Offline
Sync
Infrastructure
Observability
Performance
Privacy
Interoperability
Disaster Recovery
Testing
```

Every item must be:

```text
PASS
FAIL
PARTIAL
NOT TESTED
NOT APPLICABLE
```

---

# PHASE 92 — EVIDENCE, NOT CLAIMS

For every critical capability provide evidence:

```text
command executed
test executed
result
timestamp
artifact/log
```

Never write:

```text
"production ready"
```

without evidence.

---

# PHASE 93 — PRODUCTION READINESS SCORE

Calculate a weighted score.

Example categories:

```text
Clinical Safety       20%
Security              20%
Reliability           15%
Offline/Sync          15%
FHIR/Interoperability 10%
Observability          5%
Performance            5%
Testing                5%
Operations             5%
```

Explain the score.

---

# PHASE 94 — DEMO MODE VS PRODUCTION MODE

Ensure the application has an explicit distinction between:

```text
DEMO
```

and:

```text
PRODUCTION
```

Demo mode must never accidentally be interpreted as production functionality.

---

# PHASE 95 — DEMO RESET

Create a safe reset mechanism for hackathon demonstration data.

It must NEVER be available to ordinary production users.

---

# PHASE 96 — JUDGE OBSERVABILITY

Create a technical demonstration panel that can show, in real time:

```text
Network state
Sync queue
FHIR resources
Referral state
SLA
Care gaps
Inventory
Exchange state
Audit events
System health
```

This should demonstrate the architecture rather than merely showing UI screenshots.

---

# PHASE 97 — ONE-CLICK DEMO ENVIRONMENT

Create a reproducible local demonstration environment.

Conceptually:

```text
docker compose up
```

should bring up required backend infrastructure where practical.

Document anything that cannot be containerized.

---

# PHASE 98 — DEMO DATA SEED

Create deterministic seed data:

```text
Jane Doe
PHC
District Hospital
Specialist
Pharmacist
Laboratory
```

Do not use random data.

---

# PHASE 99 — FINAL DEMO SCRIPT

Create:

```text
FINAL_JUDGE_DEMO.md
```

The demonstration should take approximately:

```text
8–12 minutes
```

and show:

```text
1. Offline
2. Clinical intelligence
3. Emergency escalation
4. Durable sync
5. Referral
6. Specialist workflow
7. Teleconsult
8. Diagnostics
9. Medication
10. Care gap
11. Interoperability
12. Audit/provenance
13. Failure recovery
```

---

# PHASE 100 — THE "KILL THE SYSTEM" DEMO

This is critical.

During the demonstration:

1. Create a patient offline.
2. Create an emergency assessment.
3. Create referral.
4. Kill the Flutter application.
5. Restart it.
6. Show data still exists.
7. Start sync.
8. Kill HAPI FHIR.
9. Show sync safely enters pending/retry state.
10. Restart HAPI FHIR.
11. Show recovery.
12. Show FHIR resources.
13. Show audit/provenance.

This demonstrates genuine engineering depth.

---

# PHASE 101 — FINAL ARCHITECTURAL REVIEW

Generate:

```text
FINAL_ARCHITECTURE.md
```

Include:

```text
Frontend
Offline storage
Sync
Gateway
Authentication
Authorization
FHIR
Clinical intelligence
Referral
Teleconsult
Diagnostics
Medication
Care gaps
Interoperability
Consent
Audit
Observability
Infrastructure
```

---

# PHASE 102 — TRACEABILITY MATRIX

Create:

```text
FINAL_TRACEABILITY_MATRIX.md
```

Map:

```text
SIH requirement
↓
user journey
↓
feature
↓
FHIR resource
↓
backend service
↓
frontend screen
↓
test
↓
evidence
```

---

# PHASE 103 — REMOVE DEMO CHEATS

Perform a final global search for:

```text
fake
mock
dummy
hardcoded
random
setTimeout
Future.delayed
static patient
static analytics
static referral
static inventory
static teleconsult
```

For every occurrence determine whether it is:

```text
legitimate test fixture
development fallback
production logic
```

Remove inappropriate shortcuts.

---

# PHASE 104 — FINAL SECURITY REVIEW

Inspect:

```text
authentication
authorization
IDOR
CSRF
CORS
injection
XSS
rate limits
JWT
secrets
FHIR access
file uploads
logs
PII
PHI
```

Fix P0/P1 issues.

---

# PHASE 105 — FINAL CLINICAL SAFETY REVIEW

Explicitly review:

```text
triage
risk classification
emergency referral
medication
diagnostics
care gaps
teleconsult
clinical overrides
consent
```

The system must assist healthcare workers.

It must NOT claim to replace medical professionals.

---

# PHASE 106 — FINAL BUILD GATE

Actually run:

```text
flutter analyze
flutter test

npm run build
npm test
npm run test:e2e

npm run lint
npm run build
```

Also run all critical integration/security/FHIR tests.

Do not claim PASS if the command was not executed.

---

# PHASE 107 — FINAL FAILURE GATE

Actually test:

```text
offline
app restart
sync interruption
duplicate sync
FHIR downtime
database downtime
LiveKit downtime
exchange downtime
expired JWT
cross-facility access
conflict
```

Record results.

---

# PHASE 108 — FINAL ARTIFACTS

Create:

```text
PHASE_10_PRE_AUDIT.md
RELIABILITY_CONTRACT.md
FAILURE_MODE_MATRIX.md
PRODUCTION_READINESS_CHECKLIST.md
FINAL_ARCHITECTURE.md
FINAL_TRACEABILITY_MATRIX.md
FINAL_JUDGE_DEMO.md
INCIDENT_RESPONSE.md
RUNBOOK_SYNC_FAILURE.md
RUNBOOK_FHIR_FAILURE.md
RUNBOOK_DATABASE_FAILURE.md
RUNBOOK_LIVEKIT_FAILURE.md
RUNBOOK_EXCHANGE_FAILURE.md
PHASE_10_FINAL_REPORT.md
```

---

# PHASE 109 — FINAL REPORT

Return ONLY:

## 1. Executive Summary

## 2. P0 Issues Found

## 3. P1 Issues Found

## 4. Critical Fixes

## 5. Reliability Improvements

## 6. Security Improvements

## 7. Clinical Safety Improvements

## 8. Offline/Sync Improvements

## 9. FHIR Improvements

## 10. Performance Results

## 11. Chaos/Fault-Injection Results

## 12. Security Test Results

## 13. E2E Test Results

## 14. Infrastructure Readiness

## 15. Backup/Recovery Status

## 16. REAL vs SANDBOX vs UNVERIFIED

## 17. Production Readiness Score

## 18. Remaining P0/P1 Risks

## 19. Exact Final Judge Demo

## 20. Final Architecture

DO NOT START PHASE 11.

STOP.
