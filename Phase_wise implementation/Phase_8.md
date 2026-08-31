# SIH-26133 — PHASE 8 MASTER PROMPT

# PRODUCTION HARDENING + OBSERVABILITY + DISASTER RECOVERY + CLINICAL SAFETY

Repository:

https://github.com/neelshingavi/SIH2026

---

# MISSION

Phase 8 is NOT a feature-development phase.

The purpose is to make the existing Setu platform:

* reliable
* observable
* recoverable
* deterministic
* clinically safe
* resilient to network failure
* resilient to backend failure
* resistant to duplicate operations
* resistant to corrupted data
* demonstrably production-grade

The final question we must be able to answer is:

> "If this system is deployed across thousands of rural workers and something goes wrong, how do you know, how do you recover, and how do you prove that no patient data or clinical action was silently lost?"

Do not create superficial dashboards.

Do not add fake metrics.

Do not add dummy monitoring.

Every metric, alert, recovery mechanism and safety mechanism must be connected to actual application behavior.

---

# PHASE 0 — COMPLETE FORENSIC AUDIT

Before changing code, inspect the entire repository.

Audit:

```text
frontline-app/
core-gateway/
portals/
HAPI FHIR integration
SQLite
Postgres
Sync
Authentication
Referral
Teleconsultation
CarePathway
Diagnostics
Medication
Inventory
Consent
HIE
Analytics
Alerts
AuditEvent
Notifications
```

Search globally for:

```text
TODO
FIXME
mock
fake
dummy
random
hardcoded
localhost
console.log
print(
catch
throw
retry
timeout
setTimeout
Timer
Future.delayed
```

Also search for:

```text
unhandled exceptions
silent catches
unsafe JSON parsing
missing null handling
race conditions
duplicate writes
non-transactional mutations
```

Create:

```text
PHASE_8_PRE_AUDIT.md
```

Classify findings:

```text
P0 = data loss / patient safety / security
P1 = major reliability failure
P2 = degraded functionality
P3 = engineering quality
```

Do not fix yet.

---

# PHASE 1 — SYSTEM FAILURE MODEL

Create:

```text
FAILURE_MODEL.md
```

Model every important dependency:

```text
Flutter
SQLite
Network
NestJS
Postgres
HAPI FHIR
LiveKit
External HIE / ABDM adapter
Notification service
```

For each dependency answer:

```text
What if unavailable?
What if slow?
What if returns malformed data?
What if it crashes halfway through an operation?
What if request succeeds but response is lost?
What if request is duplicated?
What if client crashes?
What if server restarts?
What if database becomes unavailable?
```

---

# PHASE 2 — RELIABILITY PRINCIPLES

Establish explicit system guarantees.

Examples:

```text
At-least-once delivery
Idempotent mutations
Durable local writes
No silent clinical data loss
No duplicate clinical events
No unauthorized cross-facility access
Server remains source of truth where applicable
Offline client remains usable for permitted workflows
```

Document what the system guarantees and what it does NOT guarantee.

Never claim exactly-once delivery unless technically implemented.

---

# PHASE 3 — CORRELATION / REQUEST ID

Standardize request tracing.

Every request should have:

```text
requestId
userId
facilityId
timestamp
route
duration
status
```

Propagate:

```text
Flutter
 ↓
NestJS
 ↓
FHIR
 ↓
external services
```

where technically possible.

Do not put PHI inside request IDs.

---

# PHASE 4 — STRUCTURED LOGGING

Replace ad-hoc logs with structured logs.

Example:

```json
{
  "timestamp": "...",
  "level": "INFO",
  "service": "sync",
  "event": "SYNC_BATCH_COMPLETED",
  "requestId": "...",
  "facilityId": "...",
  "operationCount": 10,
  "durationMs": 420
}
```

Never log:

```text
patient name
ABHA
phone number
clinical diagnosis
clinical notes
FHIR resource body
JWT
access token
LiveKit token
```

unless explicitly required for secure debugging.

---

# PHASE 5 — LOG LEVELS

Define:

```text
DEBUG
INFO
WARN
ERROR
SECURITY
CLINICAL
```

Clinical safety events must be distinguishable from infrastructure events.

Example:

```text
CLINICAL_RISK_IDENTIFIED
REFERRAL_ESCALATION_REQUIRED
MEDICATION_GAP_DETECTED
FOLLOWUP_OVERDUE
```

---

# PHASE 6 — ERROR TAXONOMY

Create standard error categories.

Example:

```text
AUTH_ERROR
AUTHORIZATION_ERROR
NETWORK_ERROR
TIMEOUT
FHIR_VALIDATION_ERROR
FHIR_NOT_FOUND
FHIR_CONFLICT
DATABASE_ERROR
SYNC_ERROR
CONSENT_ERROR
EXCHANGE_ERROR
CLINICAL_RULE_ERROR
```

Do not return raw internal exceptions to the frontend.

---

# PHASE 7 — SAFE ERROR RESPONSES

API responses should contain:

```text
errorCode
message
requestId
retryable
```

Example:

```json
{
  "errorCode": "FHIR_CONFLICT",
  "message": "The clinical record was modified elsewhere.",
  "requestId": "...",
  "retryable": false
}
```

Never expose:

```text
stack traces
database SQL
internal paths
secrets
tokens
```

---

# PHASE 8 — RETRY ARCHITECTURE

Audit every retry mechanism.

Retries must distinguish:

```text
retryable
non-retryable
```

Retry:

```text
network timeout
temporary 5xx
connection failure
```

Do NOT blindly retry:

```text
400
401
403
FHIR validation errors
consent denial
clinical conflicts
```

---

# PHASE 9 — EXPONENTIAL BACKOFF

Implement bounded exponential backoff with jitter.

Example conceptual model:

```text
1s
2s
4s
8s
16s
max
```

Never create infinite aggressive retry loops.

---

# PHASE 10 — CIRCUIT BREAKER

Implement circuit breaker behavior for:

```text
HAPI FHIR
LiveKit
external exchange
notification provider
```

States:

```text
CLOSED
OPEN
HALF_OPEN
```

When HAPI is down:

```text
do not hammer HAPI
```

Queue operations appropriately.

---

# PHASE 11 — SYNC ENGINE HARDENING

Deeply audit:

```text
sync_queue
sync coordinator
push
pull
conflict
retry
idempotency
```

Test:

```text
offline
online
online → offline
offline → online
server restart
app restart
duplicate push
partial batch failure
```

---

# PHASE 12 — ATOMIC LOCAL TRANSACTIONS

Every clinical mutation must follow:

```text
FHIR resource
+
sync queue entry
```

inside one SQLite transaction.

Guarantee:

```text
resource exists → operation exists
```

and:

```text
operation exists → resource exists
```

No orphan queue records.

No orphan clinical records.

---

# PHASE 13 — CRASH CONSISTENCY TEST

Simulate application termination during:

```text
patient creation
triage submission
referral creation
medication creation
diagnostic request
follow-up completion
consent recording
```

After restart:

```text
no data loss
no duplicate operation
queue recoverable
```

---

# PHASE 14 — SERVER-SIDE IDEMPOTENCY

Every mutation must have stable idempotency.

Test:

```text
same operation sent:
1x
2x
10x
100x
```

Expected:

```text
one clinical mutation
multiple safe acknowledgements
```

---

# PHASE 15 — PARTIAL BATCH FAILURE

Example:

```text
Batch:
1 Patient
2 Observation
3 Condition
4 Referral
5 MedicationRequest
```

Suppose:

```text
1 SUCCESS
2 SUCCESS
3 CONFLICT
4 SUCCESS
5 TIMEOUT
```

The server must return per-operation status.

The client must:

```text
mark 1 synced
mark 2 synced
mark 3 conflict
mark 4 synced
retry 5
```

Never retry the entire batch blindly.

---

# PHASE 16 — SYNC ORDERING

Ensure dependent resources are synchronized safely.

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

Do not allow:

```text
Task
```

to arrive before its referenced clinical context when that would cause invalid references or failed processing.

---

# PHASE 17 — DEAD LETTER QUEUE

Introduce:

```text
FAILED_PERMANENTLY
```

or an equivalent dead-letter mechanism.

An operation should enter dead-letter handling after bounded retries.

Expose:

```text
operationId
errorCode
retryCount
lastAttempt
```

to authorized operators.

Never silently discard failed clinical operations.

---

# PHASE 18 — SYNC RECONCILIATION

Create a reconciliation mechanism.

Periodically compare:

```text
Local pending operations
Server acknowledged operations
FHIR resources
```

Detect:

```text
missing
duplicate
orphaned
stuck
conflicted
```

operations.

---

# PHASE 19 — STUCK QUEUE DETECTION

Detect queues where:

```text
PENDING > threshold
PROCESSING > timeout
FAILED > threshold
```

Generate operational alerts.

---

# PHASE 20 — DATA INTEGRITY CHECKS

Create automated integrity checks for:

```text
FHIR references
Patient references
Task ownership
ServiceRequest relationships
CarePlan references
MedicationRequest references
DiagnosticReport references
Consent references
Provenance
```

---

# PHASE 21 — FHIR VALIDATION

Every FHIR resource entering HAPI should be validated appropriately.

At minimum verify:

```text
resourceType
id
meta
required fields
references
status
coding
dates
```

Do not accept arbitrary JSON simply because it parses.

---

# PHASE 22 — FHIR VERSION CONSISTENCY

Verify the entire system uses one explicit FHIR version.

Document:

```text
FHIR version
HAPI version
profiles
validation strategy
```

Do not mix incompatible resource definitions.

---

# PHASE 23 — CLINICAL RULE ENGINE SAFETY

Audit the Phase 4 triage engine.

Every clinical rule must contain:

```text
ruleId
version
input criteria
output
severity
rationale
source/protocol reference
effective date
```

Example:

```text
rule-anc-bp
version 1.1.0
```

---

# PHASE 24 — RULE VERSIONING

Never silently modify a clinical rule.

A patient's RiskAssessment must preserve:

```text
ruleId
ruleVersion
evaluationTimestamp
input snapshot or auditable evidence
```

This allows the system to answer:

> "Why was this patient classified as high risk?"

---

# PHASE 25 — RULE ENGINE DETERMINISM

Given identical:

```text
input
rule version
configuration
```

the engine must produce identical output.

Run deterministic tests.

No:

```text
random
current state
network
```

dependencies inside clinical classification unless explicitly required.

---

# PHASE 26 — CLINICAL SAFETY BOUNDARIES

The system must clearly distinguish:

```text
clinical decision support
```

from:

```text
autonomous diagnosis
```

UI language should never claim:

```text
AI diagnosed patient
```

Prefer:

```text
Risk identified
Protocol triggered
Clinical review required
```

---

# PHASE 27 — HUMAN OVERRIDE

Authorized clinicians must be able to override a rule outcome.

Require:

```text
override reason
actor
timestamp
original assessment
new assessment
```

Do not allow silent modification.

---

# PHASE 28 — CLINICAL ALERT ESCALATION

Create explicit escalation levels:

```text
INFO
ROUTINE
HIGH
URGENT
EMERGENCY
```

For emergency alerts:

```text
local notification
dashboard alert
referral escalation
audit event
```

must be coordinated.

---

# PHASE 29 — ALERT DEDUPLICATION

If the same emergency condition is evaluated repeatedly:

Do not generate:

```text
100 duplicate alerts
```

Create one active alert with:

```text
lastEvaluatedAt
occurrenceCount
status
```

---

# PHASE 30 — ALERT ACKNOWLEDGEMENT

Support:

```text
ACKNOWLEDGED
IN_PROGRESS
RESOLVED
ESCALATED
```

A notification disappearing is NOT equivalent to clinical resolution.

---

# PHASE 31 — MISSED ALERT DETECTION

Detect:

```text
EMERGENCY alert
+
no acknowledgement
```

after threshold.

Escalate to the next responsible role.

---

# PHASE 32 — CARE GAP RELIABILITY

Audit the Care Gap engine.

Every gap must have:

```text
gapId
patient
reason
evidence
severity
owner
createdAt
dueAt
status
resolution
```

---

# PHASE 33 — CARE GAP PROVENANCE

When a care gap is generated, store why.

Example:

```text
Gap:
TREATMENT_PENDING

Evidence:
MedicationRequest MR-123
createdAt: ...
No MedicationDispense found

Threshold:
12 hours
```

Do not create unexplained gaps.

---

# PHASE 34 — CARE GAP FALSE POSITIVE PROTECTION

Before creating a gap, verify:

```text
patient
resource
status
time
facility
exception conditions
```

Avoid declaring something overdue because of clock skew or stale local data.

---

# PHASE 35 — CLOCK MANAGEMENT

The system must distinguish:

```text
device time
server time
FHIR authoredOn
FHIR recorded time
```

Never rely blindly on device time for SLA enforcement.

Where possible:

```text
server timestamp = authoritative
```

---

# PHASE 36 — SLA ENGINE

Centralize SLA definitions.

Example:

```text
STAT
URGENT
ROUTINE
```

with:

```text
threshold
warning threshold
breach threshold
```

Do not duplicate SLA constants throughout the frontend/backend.

---

# PHASE 37 — TIMEZONE CONSISTENCY

Use explicit timezone handling.

Store timestamps in a consistent canonical format.

Display:

```text
local timezone
```

to users.

Test:

```text
date boundaries
midnight
DST environments
```

even if India is the primary deployment region.

---

# PHASE 38 — DISASTER RECOVERY

Create:

```text
DISASTER_RECOVERY.md
```

Define recovery for:

```text
Flutter device lost
Postgres lost
HAPI FHIR lost
NestJS crashed
LiveKit unavailable
network outage
```

---

# PHASE 39 — BACKUP STRATEGY

Document:

```text
Postgres backup
HAPI FHIR backup
audit log backup
configuration backup
```

Include:

```text
RPO
RTO
```

but only claim values that can actually be achieved.

---

# PHASE 40 — RESTORE TEST

Actually perform a restore test where possible.

Verify:

```text
FHIR resources recovered
audit recovered
sync idempotency recovered
no duplicate mutations after recovery
```

---

# PHASE 41 — DATABASE MIGRATION SAFETY

Audit all migrations.

Requirements:

```text
versioned
repeatable
backward-aware where necessary
non-destructive by default
```

Never modify production schema manually without migration tracking.

---

# PHASE 42 — ZERO-DOWNTIME THINKING

For backend deployments:

Design for:

```text
old client
+
new backend
```

compatibility where practical.

Sync protocol changes must be versioned.

---

# PHASE 43 — API VERSIONING

Introduce API versioning for critical interfaces:

```text
/sync
/referral
/patient
/consent
/exchange
```

Do not make breaking protocol changes silently.

---

# PHASE 44 — SYNC PROTOCOL VERSION

Include:

```text
protocolVersion
```

in sync requests.

Server should reject unsupported versions clearly.

---

# PHASE 45 — RATE LIMITING

Implement rate limits for:

```text
login
sync
patient search
FHIR query
teleconsult token
exchange
```

Prevent accidental or malicious request storms.

---

# PHASE 46 — ABUSE PROTECTION

Protect against:

```text
credential brute force
token abuse
sync flooding
patient enumeration
FHIR query abuse
```

---

# PHASE 47 — PATIENT ENUMERATION

Audit patient search.

Do not allow unrestricted:

```text
GET /patient?name=
```

or equivalent queries.

Apply:

```text
authorization
facility scope
rate limits
minimum search requirements
```

where appropriate.

---

# PHASE 48 — TELECONSULT RELIABILITY

Audit LiveKit flow.

Handle:

```text
token expired
connection lost
reconnect
camera permission denied
microphone permission denied
specialist disconnects
ASHA disconnects
server unavailable
```

---

# PHASE 49 — TELECONSULT STATE

Persist consultation state using appropriate FHIR resources / existing architecture.

Possible states:

```text
REQUESTED
READY
ACTIVE
INTERRUPTED
COMPLETED
CANCELLED
```

Do not infer consultation completion simply because the screen closed.

---

# PHASE 50 — TELECONSULT AUDIT

Record:

```text
joined
left
interrupted
completed
```

without recording audio/video.

Do not store video unless explicitly required and securely designed.

---

# PHASE 51 — OFFLINE TELECONSULT BEHAVIOR

When video is unavailable:

Do NOT pretend the consultation occurred.

Show:

```text
TELECONSULT UNAVAILABLE

Reason:
Connectivity unavailable

Available alternatives:
Call when network returns
Create referral
Record follow-up
```

---

# PHASE 52 — MEDICATION SAFETY

Audit MedicationRequest creation.

Verify:

```text
medication
dose
route
frequency
duration
status
requester
patient
```

where required.

---

# PHASE 53 — MEDICATION DISPENSE RECONCILIATION

Do not infer:

```text
prescribed = dispensed
```

They are separate events.

Care gap logic must distinguish:

```text
prescribed
dispensed
partially dispensed
not dispensed
cancelled
```

---

# PHASE 54 — INVENTORY CONSISTENCY

Inventory must clearly distinguish:

```text
cached
last updated
source facility
```

Example:

```text
Paracetamol

Available:
142

Last synchronized:
10:42

Status:
Cached
```

Never display stale inventory as live.

---

# PHASE 55 — STALE DATA WARNINGS

For offline information display:

Show:

```text
OFFLINE
Last updated 3h ago
```

rather than presenting stale information without context.

---

# PHASE 56 — DATA CLASSIFICATION

Classify stored data:

```text
PUBLIC
INTERNAL
SENSITIVE
CLINICAL
IDENTITY
SECURITY
```

Document:

```text
storage
logging
transmission
retention
```

requirements.

---

# PHASE 57 — LOCAL DATABASE SECURITY

Audit SQLite.

Implement appropriate protections for:

```text
device theft
backup extraction
filesystem access
debug builds
```

If full encryption is feasible, implement it.

If not, explicitly document the residual risk.

Never falsely claim encryption.

---

# PHASE 58 — SECURE STORAGE

Audit:

```text
JWT
refresh tokens
device secrets
facility identifiers
```

Ensure secrets are not stored in:

```text
SharedPreferences
plain files
SQLite
logs
source code
```

unless appropriately protected.

---

# PHASE 59 — SECRET SCANNING

Search the entire repository for:

```text
API_KEY
SECRET
PASSWORD
TOKEN
JWT
PRIVATE_KEY
LIVEKIT
DATABASE_URL
```

Remove credentials from source.

Use:

```text
environment variables
secret manager
deployment configuration
```

---

# PHASE 60 — SECURITY HEADERS

Audit backend HTTP security:

```text
CORS
Helmet/security headers
content type
request size limits
```

Do not allow:

```text
*
```

for production CORS unless explicitly justified.

---

# PHASE 61 — INPUT VALIDATION

Every externally supplied DTO must use strict validation.

Reject:

```text
unknown fields
malformed UUID
invalid FHIR resource
oversized payload
invalid enum
```

---

# PHASE 62 — PAYLOAD LIMITS

Set explicit limits for:

```text
sync batch
FHIR Bundle
patient search
exchange
file/document uploads
```

Prevent memory exhaustion.

---

# PHASE 63 — OBSERVABILITY METRICS

Create real metrics.

At minimum:

```text
sync_success_total
sync_failure_total
sync_conflict_total
sync_queue_depth
sync_latency
FHIR_request_latency
FHIR_error_total
referral_sla_breach_total
care_gap_open_total
care_gap_resolution_time
teleconsult_failure_total
exchange_failure_total
consent_denial_total
```

---

# PHASE 64 — BUSINESS METRICS

Add:

```text
referral completion rate
median referral acceptance time
emergency escalation response time
diagnostic turnaround time
medication dispense completion rate
follow-up completion rate
```

Every metric must be calculated from actual records.

---

# PHASE 65 — GOLDEN SIGNALS

Monitor:

```text
latency
traffic
errors
saturation
```

for every backend service.

---

# PHASE 66 — HEALTH ENDPOINT

Implement:

```text
/health
```

and:

```text
/readiness
```

where appropriate.

Distinguish:

```text
process alive
```

from:

```text
system ready
```

---

# PHASE 67 — DEPENDENCY HEALTH

Readiness should detect important dependencies appropriately:

```text
Postgres
HAPI FHIR
```

Do not make `/health` itself dependent on every external system.

---

# PHASE 68 — OPERATOR DASHBOARD

Create a real:

```text
System Health Dashboard
```

showing:

```text
API status
FHIR status
database status
sync backlog
failed operations
conflicts
SLA breaches
exchange failures
teleconsult availability
```

---

# PHASE 69 — INCIDENT TIMELINE

Allow operators to inspect:

```text
incident
↓
request IDs
↓
errors
↓
affected subsystem
↓
recovery
```

without exposing PHI unnecessarily.

---

# PHASE 70 — ALERTING

Create actionable alerts:

```text
FHIR unavailable
sync backlog growing
emergency referral SLA breach
database unavailable
exchange failure spike
teleconsult failure spike
```

Avoid alert spam.

---

# PHASE 71 — ALERT SEVERITY

Define:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

with response expectations.

---

# PHASE 72 — CLINICAL VS TECHNICAL INCIDENTS

Separate:

```text
Clinical safety incident
```

from:

```text
Infrastructure incident
```

Example:

```text
FHIR outage
```

is technical.

```text
Emergency referral not delivered
```

is potentially clinical safety critical.

---

# PHASE 73 — INCIDENT PLAYBOOKS

Create:

```text
RUNBOOK.md
```

with procedures for:

```text
HAPI outage
Postgres outage
sync backlog
FHIR conflict spike
LiveKit outage
external exchange outage
credential compromise
data corruption
emergency referral failure
```

---

# PHASE 74 — MANUAL RECOVERY TOOLS

Authorized operators should have safe recovery operations for:

```text
retry failed sync
requeue exchange
resolve conflict
acknowledge incident
```

Every operator mutation must be audited.

Never provide:

```text
DELETE PATIENT DATA
```

as a casual admin action.

---

# PHASE 75 — CONFLICT MANAGEMENT UI

Create a meaningful conflict UI.

Example:

```text
CLINICAL RECORD CONFLICT

Local version:
BP = 170/115

Server version:
BP = 150/95

Updated:
Server: 10:31
Local: 10:34

Choose:
Keep Server
Keep Local
Review
```

For clinical data, prefer human review over silent last-write-wins.

---

# PHASE 76 — CLINICAL CONFLICT PRIORITY

Not all conflicts are equal.

Classify:

```text
LOW
MEDIUM
HIGH
CRITICAL
```

Example:

```text
patient demographic typo → LOW

medication dose → HIGH

emergency risk assessment → CRITICAL
```

Critical clinical conflicts require explicit review.

---

# PHASE 77 — IMMUTABLE CLINICAL HISTORY

Do not overwrite historical clinical events when a correction is required.

Prefer:

```text
new corrected resource/event
+
Provenance
```

where appropriate.

Preserve auditability.

---

# PHASE 78 — DATA RETENTION

Document retention rules for:

```text
FHIR records
audit events
sync queue
exchange records
logs
metrics
```

Do not retain everything indefinitely.

---

# PHASE 79 — PRIVACY BY DESIGN

Audit every screen.

Ensure minimum necessary data is shown.

Example:

District dashboard:

```text
Emergency cases: 17
```

rather than:

```text
Jane Doe — pre-eclampsia
```

unless patient-level access is explicitly required.

---

# PHASE 80 — PERFORMANCE TESTING

Measure:

```text
patient search
timeline
FHIR $everything
sync push
sync pull
care gap calculation
analytics
referral routing
inventory
```

Test with realistic datasets:

```text
1,000 patients
10,000 patients
100,000 FHIR resources
```

where practical.

---

# PHASE 81 — LOAD TESTING

Stress:

```text
sync
FHIR queries
dashboard analytics
patient search
referrals
```

Record:

```text
p50
p95
p99
error rate
throughput
```

Do not invent numbers.

---

# PHASE 82 — MOBILE PERFORMANCE

Measure Flutter:

```text
app startup
SQLite writes
timeline rendering
large patient history
sync processing
memory usage
```

Avoid blocking the UI thread.

---

# PHASE 83 — BATTERY / DATA USAGE

Optimize background sync.

Avoid:

```text
constant polling
```

Prefer:

```text
connectivity-triggered
bounded periodic
manual sync
priority sync
```

where appropriate.

---

# PHASE 84 — ACCESSIBILITY

Audit critical workflows:

```text
triage
emergency escalation
referral
consent
teleconsult
care gaps
```

Ensure:

```text
large touch targets
clear severity
text alternatives
readable contrast
```

---

# PHASE 85 — MULTILINGUAL SAFETY

Ensure translated clinical alerts preserve meaning.

Do not mechanically translate medical severity incorrectly.

Critical terms must have reviewed translations.

---

# PHASE 86 — OFFLINE LANGUAGE PACKS

Critical clinical UI strings should be available offline.

Do not depend on network translation APIs.

---

# PHASE 87 — DEVICE COMPATIBILITY

Document minimum:

```text
Android version
iOS version if supported
RAM
storage
network assumptions
```

Test low-end Android behavior if possible.

---

# PHASE 88 — SECURITY TEST SUITE

Create automated tests for:

```text
401
403
IDOR
facility isolation
role isolation
patient enumeration
JWT expiry
token replay
rate limiting
malformed payload
oversized payload
FHIR injection-like malformed data
```

---

# PHASE 89 — CLINICAL TEST SUITE

Create deterministic tests for:

```text
normal ANC
high BP
severe BP
missing vitals
borderline values
conflicting measurements
stale measurements
duplicate observations
```

Every rule should have positive AND negative tests.

---

# PHASE 90 — END-TO-END FLAGSHIP TEST

Automate the complete Jane Doe scenario:

```text
offline login
patient creation
ANC assessment
risk identification
emergency escalation
referral
sync
specialist acceptance
teleconsult
diagnostic request
diagnostic result
medication
follow-up
care gap closure
audit verification
```

At the end assert:

```text
0 lost resources
0 duplicate resources
0 unauthorized accesses
0 unresolved emergency tasks
complete audit trail
```

---

# PHASE 91 — CHAOS TEST

Intentionally inject:

```text
network loss
FHIR outage
database restart
server restart
duplicate request
slow request
timeout
malformed response
expired token
conflict
```

during the flagship journey.

The patient journey must remain recoverable.

---

# PHASE 92 — DATA CORRUPTION TEST

Create controlled corruption scenarios:

```text
invalid reference
missing Patient
invalid status
malformed FHIR JSON
```

Verify:

```text
detected
quarantined
logged
recoverable
```

Never silently accept corrupted data.

---

# PHASE 93 — SECURITY INCIDENT TEST

Simulate:

```text
stolen JWT
cross-facility request
credential abuse
repeated failed login
```

Verify:

```text
blocked
audited
alerted
```

---

# PHASE 94 — DEPLOYMENT

Create production-like Docker Compose or deployment configuration.

Services:

```text
NestJS
Postgres
HAPI FHIR
LiveKit
frontend/portal
```

Use:

```text
environment configuration
health checks
restart policies
persistent volumes
```

---

# PHASE 95 — CONFIGURATION VALIDATION

Application startup must fail fast if required production configuration is missing.

Never silently fall back to:

```text
localhost
default secret
default password
development JWT secret
```

---

# PHASE 96 — DATABASE CONNECTION RESILIENCE

Implement:

```text
connection pooling
timeouts
retry policy
graceful failure
```

Do not create unlimited connections.

---

# PHASE 97 — GRACEFUL SHUTDOWN

NestJS must gracefully close:

```text
HTTP server
database connections
queues
FHIR connections
background workers
```

Flutter sync must safely stop background work where appropriate.

---

# PHASE 98 — ZERO DATA LOSS GATE

Prove:

```text
offline → kill app → restart → sync
```

and:

```text
request sent → response lost → retry
```

and:

```text
server restart during sync
```

do not lose clinical mutations.

---

# PHASE 99 — SECURITY GATE

Prove:

```text
unauthenticated request → rejected
wrong role → rejected
wrong facility → rejected
wrong patient scope → rejected
revoked consent → sharing blocked
```

---

# PHASE 100 — CLINICAL SAFETY GATE

Prove:

```text
emergency risk
→ emergency alert
→ escalation
→ referral
→ SLA
→ acknowledgement
→ completion
```

is traceable end-to-end.

---

# PHASE 101 — OBSERVABILITY GATE

A judge/operator should be able to answer:

```text
How many sync failures?
How many emergency referrals?
Which referrals breached SLA?
How many conflicts?
Is HAPI healthy?
Is sync backlog growing?
Are teleconsults failing?
Are exchanges failing?
```

using real dashboards.

---

# PHASE 102 — PRODUCTION READINESS SCORE

Create:

```text
PRODUCTION_READINESS.md
```

Score:

```text
Reliability
Security
Clinical Safety
FHIR
Offline
Interoperability
Observability
Disaster Recovery
Performance
Accessibility
```

For every score include evidence.

Do not give 100% simply because code exists.

---

# PHASE 103 — TRACEABILITY MATRIX

Create:

```text
PHASE_8_TRACEABILITY.md
```

Format:

```text
Requirement
↓
Implementation
↓
File
↓
Test
↓
Evidence
↓
Status
```

Status:

```text
VERIFIED
PARTIAL
UNVERIFIED
NOT IMPLEMENTED
```

---

# PHASE 104 — FINAL DOCUMENTATION

Create:

```text
PHASE_8_FINAL_REPORT.md
FAILURE_MODEL.md
DISASTER_RECOVERY.md
RUNBOOK.md
PRODUCTION_READINESS.md
PHASE_8_TRACEABILITY.md
```

---

# PHASE 105 — FINAL BUILD GATE

Actually execute:

```text
Flutter:
flutter pub get
flutter analyze
flutter test

Backend:
npm install
npm run build
npm test
npm run test:e2e

Portal:
npm install
npm run lint
npm run build
```

Also execute integration tests against:

```text
Postgres
HAPI FHIR
LiveKit
```

where available.

If something cannot be executed:

```text
STATE WHY.
```

Never claim:

```text
PASS
```

without execution evidence.

---

# PHASE 106 — FINAL JUDGE DEMONSTRATION

The final demo should not simply show screens.

Show system behavior.

## DEMO 1 — OFFLINE FAILURE

Turn network off.

Create emergency patient.

Kill application.

Restart.

Show:

```text
data survives
queue survives
risk survives
```

---

## DEMO 2 — NETWORK RECOVERY

Restore network.

Show:

```text
queue drains
FHIR receives records
idempotency works
```

---

## DEMO 3 — DUPLICATE REQUEST

Replay the same operation.

Show:

```text
one clinical event
```

---

## DEMO 4 — CONFLICT

Modify the same clinical record from two clients.

Show:

```text
CONFLICT
↓
human review
↓
resolution
```

---

## DEMO 5 — SECURITY

Attempt:

```text
Facility A
→ Facility B patient
```

Show:

```text
403
```

---

## DEMO 6 — CONSENT

Revoke consent.

Attempt exchange.

Show:

```text
BLOCKED
```

---

## DEMO 7 — FHIR

Open HAPI FHIR.

Show actual:

```text
Patient
Encounter
Observation
RiskAssessment
CarePlan
ServiceRequest
Task
DiagnosticReport
MedicationRequest
MedicationDispense
Consent
AuditEvent
Provenance
```

where implemented.

---

## DEMO 8 — OUTAGE

Stop HAPI.

Show:

```text
system detects outage
requests stop hammering HAPI
operations queue safely
operator dashboard shows incident
```

Restart HAPI.

Show:

```text
recovery
queue drains
```

---

## DEMO 9 — CLINICAL TRACE

Pick Jane Doe.

Show:

```text
Assessment
↓
Risk
↓
Escalation
↓
Referral
↓
Consent
↓
Exchange
↓
Teleconsult
↓
Diagnostics
↓
Medication
↓
Follow-up
```

Then show the corresponding:

```text
AuditEvent
Provenance
Task
FHIR resources
```

---

# PHASE 107 — FINAL ARCHITECTURE PRINCIPLE

The final system must embody:

```text
OFFLINE FIRST
+
FHIR NATIVE
+
CONSENT AWARE
+
CLINICALLY SAFE
+
SECURE
+
OBSERVABLE
+
RECOVERABLE
+
INTEROPERABLE
+
HUMAN IN THE LOOP
```

---

# FINAL RULE

DO NOT add another major feature after completing this phase.

The purpose of Phase 8 is to make every existing feature trustworthy.

If a feature is currently fake:

```text
REMOVE THE FAKE.
```

If a feature is partially implemented:

```text
LABEL IT PARTIAL.
```

If a production dependency is unavailable:

```text
CREATE A CLEAN ADAPTER.
```

If a test cannot actually execute:

```text
MARK IT UNVERIFIED.
```

Never optimize the report to look better.

Optimize the actual system.

At completion:

STOP.

Return a concise Phase 8 completion report containing:

1. Files changed
2. Critical vulnerabilities found
3. Critical vulnerabilities fixed
4. Reliability guarantees
5. Tests actually executed
6. Tests that could not be executed
7. Remaining P0/P1 risks
8. Production readiness score
9. Exact demo procedure
10. Recommended Phase 9

DO NOT START PHASE 9.
