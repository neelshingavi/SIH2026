# SIH-26133 — PHASE 6 MASTER PROMPT

# PRODUCTION HARDENING, CLINICAL SAFETY, INTEROPERABILITY & FULL-SYSTEM VERIFICATION

Repository:

https://github.com/neelshingavi/SIH2026

Problem Statement:

SIH-26133 — Accessibility and quality of public healthcare services, particularly in rural and underserved areas.

---

# IMPORTANT

STOP ADDING RANDOM FEATURES.

STOP OPTIMIZING FOR NUMBER OF SCREENS.

STOP CLAIMING "PRODUCTION READY" BECAUSE CODE COMPILES.

Phase 6 is a forensic engineering, clinical-safety, reliability, interoperability, security and end-to-end verification phase.

The goal is to transform the current prototype into something where a technically sophisticated SIH judge can inspect the architecture and conclude:

> "This is not a mock application. The team has actually engineered the difficult parts."

You must inspect the ENTIRE repository before modifying anything.

Treat every previous phase report as a CLAIM, NOT AS FACT.

If the report says something is implemented, verify the actual code.

If it is fake, incomplete, hardcoded, duplicated, unsafe, or only partially implemented, fix it.

---

# PHASE 0 — FULL FORENSIC RE-AUDIT

Inspect the complete repository:

```text
core-gateway/
frontline-app/
portals/
```

and all:

```text
*.ts
*.dart
*.tsx
*.yaml
*.json
*.md
Docker configuration
database migrations
tests
configuration
environment files
```

Do not inspect only the files mentioned in previous reports.

Search globally for:

```text
TODO
FIXME
mock
mocked
dummy
fake
sample
demo
static
hardcoded
placeholder
setState
random
Math.random
Date.now
localhost
TODO
console.log
print(
throw new Error
```

Also search for:

```text
Unsplash
static images
hardcoded patients
hardcoded facilities
hardcoded queues
hardcoded stock
hardcoded metrics
hardcoded clinical rules
hardcoded JWT
hardcoded facility IDs
hardcoded user IDs
```

Create:

```text
PHASE_6_FORENSIC_AUDIT.md
```

containing every discrepancy.

---

# PHASE 1 — REQUIREMENT TRACEABILITY

Create a formal traceability matrix.

For every important SIH requirement:

```text
Requirement
↓
User Journey
↓
UI
↓
Backend API
↓
Service
↓
FHIR resource
↓
Database/cache
↓
Audit
↓
Test
```

Example:

```text
High-risk pregnancy

ANC Form
↓
TriageService
↓
RiskAssessment
↓
CarePathwayService
↓
ServiceRequest
↓
Task
↓
Referral
↓
Teleconsult
↓
DiagnosticReport
↓
MedicationRequest
↓
Follow-up Task
↓
Encounter
↓
Care Gap closure
```

Every arrow must correspond to actual code.

---

# PHASE 2 — FHIR SOURCE-OF-TRUTH AUDIT

This is critical.

For every clinical object determine:

```text
What is the canonical source of truth?
```

It should normally be HAPI FHIR.

Audit:

```text
Patient
Encounter
Observation
Condition
RiskAssessment
CarePlan
ServiceRequest
Task
Appointment
DiagnosticReport
Specimen
MedicationRequest
MedicationDispense
AuditEvent
```

For each resource document:

```text
CREATE
READ
UPDATE
SEARCH
DELETE
SYNC
REFERENCES
AUTHORIZATION
AUDIT
```

Do not allow:

```text
Flutter SQLite
```

to become an alternative clinical source of truth.

SQLite is a local offline cache / working store.

HAPI FHIR is canonical when synchronization succeeds.

---

# PHASE 3 — FHIR REFERENCE INTEGRITY

Inspect every FHIR reference.

Examples:

```text
Observation.subject → Patient
Encounter.subject → Patient
RiskAssessment.subject → Patient
CarePlan.subject → Patient
ServiceRequest.subject → Patient
Task.focus → ServiceRequest
Task.for → Patient
DiagnosticReport.subject → Patient
DiagnosticReport.basedOn → ServiceRequest
MedicationRequest.subject → Patient
MedicationDispense.authorizingPrescription → MedicationRequest
```

Detect:

```text
broken references
non-existent references
wrong resource types
orphan resources
cross-facility references
duplicate identifiers
```

Build automated validation.

---

# PHASE 4 — FHIR PROFILE / VALIDATION LAYER

Do not merely check that JSON is valid.

Introduce FHIR validation wherever practical.

Validate:

```text
resourceType
id
meta
status
subject
performer
requester
references
dates
identifiers
codes
```

Where profiles are defined in the project, validate against those shapes.

Produce:

```text
FHIR_VALIDATION_REPORT.md
```

---

# PHASE 5 — OFFLINE-FIRST FORENSIC TEST

The offline workflow must survive:

```text
network loss
app kill
OS termination
app restart
partial sync
duplicate sync
server timeout
server unavailable
authentication expiry
conflict
```

Build an automated test scenario:

```text
OFFLINE

Create Patient
Create Encounter
Create Observations
Run Triage
Create RiskAssessment
Create CarePlan
Create ServiceRequest
Create Task

KILL APP

RESTART

Verify every resource exists.

RECONNECT

Sync.

Verify every resource exists on HAPI.

Verify references remain valid.

Verify no duplicate resources.

Verify no duplicate operations.
```

Do not declare success until this actually executes.

---

# PHASE 6 — SYNC ENGINE 2.0

Audit:

```text
push
pull
retry
backoff
idempotency
ordering
conflict
partial failure
authentication expiry
pagination
```

Implement proper retry strategy:

```text
TRANSIENT
→ exponential backoff
→ retry

PERMANENT
→ mark FAILED
→ user-visible resolution

CONFLICT
→ conflict workflow

AUTH FAILURE
→ refresh/re-authenticate

FHIR VALIDATION FAILURE
→ permanent failure + explanation
```

Never endlessly retry permanent failures.

---

# PHASE 7 — SYNC ORDERING

Clinical dependencies matter.

For example:

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

The sync engine must understand dependency ordering.

Do not blindly upload resources in arbitrary queue order.

---

# PHASE 8 — PULL SYNCHRONIZATION

Implement a robust pull strategy.

Do not use:

```text
GET everything
```

or:

```text
LIMIT 10000
```

as the synchronization strategy.

Use deterministic incremental synchronization.

Handle:

```text
watermark
pagination
lastUpdated
resource version
deleted resources
server clock differences
```

Document the algorithm.

---

# PHASE 9 — REAL CONFLICT RESOLUTION

Idempotency is NOT conflict resolution.

Implement:

```text
LOCAL VERSION
SERVER VERSION
CONFLICT
↓
COMPARE
↓
SAFE MERGE OR HUMAN REVIEW
```

Clinical resources must NEVER silently overwrite each other.

For example:

```text
LOCAL:
BP = 170/115

SERVER:
BP = 150/100
```

Do not pick one silently.

Display:

```text
Clinical data changed elsewhere.

Local:
170/115

Server:
150/100

Review required.
```

---

# PHASE 10 — CLINICAL SAFETY GATE

This is one of the most important phases.

Audit every automated clinical rule.

The system must clearly distinguish:

```text
RISK FLAG
```

from:

```text
DIAGNOSIS
```

The system should NOT claim:

```text
Patient has pre-eclampsia.
```

when the engine only detected:

```text
severe hypertension risk indicator
```

Use language such as:

```text
Emergency clinical risk detected.

Reason:
Severely elevated blood pressure triggered
ANC Emergency Protocol v1.1.0.

Clinical assessment required.
```

---

# PHASE 11 — CLINICIAN OVERRIDE

Every clinically significant recommendation must support:

```text
ACCEPT
OVERRIDE
DISMISS
ESCALATE
```

Where appropriate.

If overridden, record:

```text
who
when
what
previous recommendation
new decision
reason
```

using an auditable mechanism.

---

# PHASE 12 — CLINICAL RULE VERSIONING

Every rule must have:

```text
ruleId
version
effectiveFrom
effectiveTo
protocol
source
severity
rationale
```

Example:

```text
rule-anc-bp
version 1.1.0
ANC Emergency Protocol
```

Never allow rules to silently change.

A patient evaluated under:

```text
v1.1.0
```

must retain that provenance.

---

# PHASE 13 — CLINICAL RULE TEST MATRIX

Create exhaustive tests for:

```text
normal
borderline
high
severe
missing
invalid
negative
extreme
```

Do not only test:

```text
170/115
```

Test boundary conditions.

Example:

```text
159
160
161
169
170
171
```

and corresponding diastolic values.

---

# PHASE 14 — CARE PATHWAY DETERMINISM

For the same FHIR state:

```text
same input
+
same protocol version
```

the system must produce:

```text
same pathway state
same care gaps
same priority
```

No:

```text
randomness
```

No:

```text
time-dependent hidden behavior
```

unless time is explicitly part of the rule.

---

# PHASE 15 — CARE GAP CORRECTNESS

For every gap:

```text
Why was it created?
What evidence created it?
Who owns it?
When is it due?
What closes it?
```

must be answerable.

Example:

```text
Gap:
REFERRAL_SLA_BREACH

Evidence:
Task/{id}

Created:
10:00

Expected:
Acceptance before 11:00

Actual:
Not accepted

Owner:
Receiving facility

Resolution:
Task.status = accepted
```

---

# PHASE 16 — CARE GAP DUPLICATION

Run the gap engine repeatedly.

It must NOT create:

```text
100 identical gaps
```

for the same unresolved event.

Implement deterministic gap identity.

---

# PHASE 17 — CARE GAP RECOVERY

Test:

```text
gap created
↓
action completed
↓
gap resolved
↓
FHIR state changed
↓
engine runs again
```

The gap must remain resolved.

---

# PHASE 18 — SLA ENGINE AUDIT

Audit all SLA thresholds.

Do not hardcode arbitrary values throughout the code.

Centralize configuration.

Example:

```text
STAT
URGENT
ROUTINE
```

Each must have:

```text
threshold
warningThreshold
breachThreshold
businessCalendar if applicable
```

Make the reason visible.

---

# PHASE 19 — SMART ROUTING AUDIT

Verify routing actually uses:

```text
clinical capability
facility availability
distance
queue
urgency
teleconsult availability
SLA
```

No fake scoring.

No random values.

No hidden arbitrary weights.

Produce:

```text
ROUTING_EXPLANATION
```

Example:

```text
Recommended Facility A

Capability: +40
Availability: +25
Queue: +15
Distance: +10
Teleconsult: +10

Total: 100

Alternative Facility B: 82
```

Judges should understand why.

---

# PHASE 20 — ROUTING SAFETY

Routing must NEVER override clinical urgency.

For emergency cases:

```text
Emergency capability
```

must dominate:

```text
distance
queue
convenience
```

Do not send an emergency patient to a facility merely because it has a shorter queue.

---

# PHASE 21 — DIAGNOSTIC WORKFLOW VERIFICATION

Verify:

```text
ServiceRequest
↓
facility
↓
Appointment / queue
↓
Specimen / Procedure
↓
DiagnosticReport
↓
Observation
↓
clinician review
```

Every relationship must be represented correctly.

---

# PHASE 22 — DIAGNOSTIC RESULT REVIEW GAP

Implement and test:

```text
DiagnosticReport exists
+
clinician review absent
=
RESULT_REVIEW_PENDING
```

Then:

```text
review recorded
=
gap resolved
```

---

# PHASE 23 — MEDICINE WORKFLOW VERIFICATION

Verify:

```text
MedicationRequest
↓
availability
↓
dispensing
↓
MedicationDispense
```

Never infer:

```text
MedicationRequest exists
=
medicine dispensed
```

---

# PHASE 24 — STALE INVENTORY SAFETY

Every cached inventory item must include:

```text
lastUpdated
source
freshness
```

Offline UI must clearly state:

```text
Last known stock
```

NOT:

```text
Available now
```

unless the system actually has current connectivity/data.

---

# PHASE 25 — INVENTORY CONSISTENCY

Test:

```text
offline cached quantity = 10

server quantity = 0

device reconnects
```

Expected:

```text
server wins for current availability
```

but historical offline decisions remain auditable.

---

# PHASE 26 — MEDICINE SHORTAGE WORKFLOW

When stock is unavailable:

```text
MedicationRequest
↓
availability search
↓
nearest capable facility
↓
suggest destination
```

Never autonomously change medication.

---

# PHASE 27 — SECURITY PENETRATION TEST

Attempt:

```text
Facility A → Facility B patient
Facility A → Facility B referral
Facility A → Facility B diagnostic report
Facility A → Facility B inventory mutation
ASHA → MO-only action
MO → district-admin-only action
expired JWT
tampered JWT
missing JWT
replayed request
duplicate request
```

Every unauthorized path must fail.

---

# PHASE 28 — IDOR AUDIT

Do NOT rely only on:

```text
facilityId
```

in request bodies.

Derive authorization context from:

```text
JWT
FHIR ownership
Task owner
patient facility association
```

A malicious client must not be able to simply change:

```text
facilityId = FACILITY_B
```

and gain access.

---

# PHASE 29 — JWT / TOKEN SECURITY

Audit:

```text
expiry
refresh
rotation
logout
revocation
secure storage
offline expiry
```

Determine what happens when an ASHA's JWT expires while offline.

The application must support a safe offline authentication strategy.

Do not store passwords locally.

---

# PHASE 30 — AUDIT EVENT IMMUTABILITY

Verify AuditEvent records cannot be modified by ordinary application users.

Audit:

```text
who
what
when
where
requestId
resource
action
outcome
```

Do not log:

```text
passwords
JWTs
access tokens
unnecessary PHI
```

---

# PHASE 31 — REQUEST CORRELATION

Every important operation must have:

```text
X-Request-ID
```

or equivalent correlation.

Trace:

```text
Flutter
↓
NestJS
↓
HAPI
↓
FHIR resource
↓
AuditEvent
```

using the same correlation identifier.

---

# PHASE 32 — HAPI FAILURE TESTING

Simulate:

```text
HAPI unavailable
HAPI timeout
HAPI 500
HAPI 400
FHIR validation error
```

The application must:

```text
not crash
not lose offline data
not create duplicate operations
```

---

# PHASE 33 — LIVEKIT FAILURE TESTING

Test:

```text
LiveKit unavailable
token expired
camera unavailable
microphone unavailable
network loss
session interrupted
```

The user must receive clear fallback behavior.

---

# PHASE 34 — DASHBOARD DATA PROVENANCE

Every dashboard metric must have:

```text
source
query
time window
facility scope
calculation
lastUpdated
```

Example:

```text
Referral Completion Rate

92.4%

Source:
FHIR Task

Window:
01 Aug – 31 Aug

Facility:
PHC-001

Last calculated:
10:31 IST
```

---

# PHASE 35 — DASHBOARD DRILL-DOWN

Every important number must be actionable.

Example:

```text
7 SLA breaches
```

must open:

```text
7 actual unresolved cases
```

Do not create decorative analytics.

---

# PHASE 36 — PERFORMANCE

Measure:

```text
FHIR query latency
sync latency
offline write latency
dashboard query latency
care-gap computation time
patient timeline load time
```

Establish reasonable targets.

Optimize only after measuring.

---

# PHASE 37 — FHIR QUERY EFFICIENCY

Audit `$everything` usage.

Do not blindly request massive patient histories.

Implement:

```text
pagination
date ranges
resource filtering
caching
incremental loading
```

where appropriate.

---

# PHASE 38 — DATABASE PERFORMANCE

Inspect:

```text
indexes
foreign keys
unique constraints
query plans
N+1 queries
large JSON operations
```

Add indexes for:

```text
patient
facility
lastUpdated
task status
service request status
sync status
audit timestamp
```

where justified.

---

# PHASE 39 — MOBILE PERFORMANCE

Test:

```text
100 patients
1,000 resources
10,000 local resources
```

The timeline and search must remain usable.

Do not load the entire SQLite database into memory.

---

# PHASE 40 — DATA RETENTION

Define retention behavior for:

```text
sync queue
audit logs
cached FHIR resources
inventory cache
temporary files
failed operations
```

Do not delete clinical evidence merely because it was synchronized.

---

# PHASE 41 — PRIVACY AUDIT

Inspect every:

```text
log
notification
analytics event
error message
dashboard
API response
```

for unnecessary PHI.

---

# PHASE 42 — MULTILINGUAL CLINICAL SAFETY

Critical clinical terminology must use reviewed translations.

Audit:

```text
Emergency
High Risk
Referral
Diagnostic
Medicine
Follow-up
Care Gap
```

for:

```text
English
Marathi
Hindi
```

Do not dynamically translate clinical rules.

---

# PHASE 43 — ACCESSIBILITY

Audit the frontline app for:

```text
large touch targets
high contrast
clear emergency hierarchy
low literacy language
offline status visibility
error recovery
minimal typing
```

The interface is intended for frontline workers, not developers.

---

# PHASE 44 — DEMO DATA ISOLATION

Create:

```text
DEMO MODE
```

with clearly isolated data.

Provide:

```text
RESET DEMO
```

The demo must be deterministic.

---

# PHASE 45 — FLAGSHIP END-TO-END TEST

Actually execute this.

## Scenario

```text
ASHA
offline
```

creates:

```text
Patient
Encounter
BP Observation
RiskAssessment
```

Risk engine produces:

```text
EMERGENCY RISK
```

ASHA escalates.

System creates:

```text
CarePlan
ServiceRequest
Task
```

Network returns.

Resources synchronize.

Receiving facility accepts.

Specialist joins teleconsult.

Specialist creates diagnostic request.

Diagnostic facility receives it.

Result is generated.

DiagnosticReport + Observation arrive.

Clinician reviews result.

MedicationRequest created.

Inventory is unavailable.

System identifies another capable facility.

Medicine is dispensed.

Follow-up Task created.

ASHA goes offline again.

Follow-up Encounter recorded.

Task completed.

Care gap engine runs.

Expected result:

```text
NO OPEN CRITICAL CARE GAPS
```

---

# PHASE 46 — CHAOS TEST

Deliberately introduce:

```text
network loss
server restart
HAPI restart
duplicate requests
out-of-order sync
expired token
FHIR validation error
conflicting update
LiveKit failure
```

The patient journey must recover safely.

---

# PHASE 47 — SECURITY REGRESSION TEST

Run the complete authorization matrix automatically.

Do not rely on manual inspection.

---

# PHASE 48 — BUILD & TEST GATE

Run actual commands.

At minimum:

```text
Flutter:
flutter analyze
flutter test

NestJS:
npm run build
npm test
npm run test:e2e

Portal:
npm run build
npm run lint
```

If any command cannot execute, document exactly why.

Do NOT say:

> "Tests are expected to pass."

Report only actual results.

---

# PHASE 49 — CODE QUALITY GATE

Search for:

```text
dead code
unused services
duplicate logic
duplicate DTOs
duplicate models
unused dependencies
temporary workarounds
commented-out code
debug logs
hardcoded secrets
hardcoded URLs
```

Remove or properly configure them.

---

# PHASE 50 — CONFIGURATION HARDENING

Move environment-specific configuration into:

```text
environment variables
configuration service
secure secret management
```

Audit:

```text
HAPI URL
Postgres
JWT secret
LiveKit
facility configuration
FHIR configuration
API URLs
```

No secrets in source control.

---

# PHASE 51 — DEPLOYMENT REPRODUCIBILITY

Create a reproducible local environment.

Prefer:

```text
Docker Compose
```

for:

```text
Postgres
HAPI FHIR
NestJS
LiveKit
```

where practical.

A judge should be able to understand:

```text
docker compose up
```

and then launch the clients.

---

# PHASE 52 — HEALTH CHECKS

Implement health checks for:

```text
NestJS
Postgres
HAPI FHIR
LiveKit
```

Expose dependency status clearly to administrators.

---

# PHASE 53 — SYSTEM READINESS

Create:

```text
GET /health
GET /ready
```

with meaningful dependency checks.

Do not report:

```text
healthy
```

if the FHIR backend is unavailable.

---

# PHASE 54 — OBSERVABILITY

Track:

```text
sync_success
sync_failure
sync_conflict

fhir_success
fhir_failure

care_gap_created
care_gap_resolved
care_gap_breached

referral_created
referral_accepted
referral_completed

diagnostic_requested
diagnostic_completed
diagnostic_reviewed

medicine_requested
medicine_dispensed
medicine_stockout

teleconsult_started
teleconsult_failed
```

Do not include patient identifiers in metric labels.

---

# PHASE 55 — FAILURE BUDGET THINKING

For each critical workflow define:

```text
failure
user impact
recovery
data preservation
audit behavior
```

Example:

```text
HAPI unavailable

Impact:
No cloud synchronization.

Recovery:
Persist locally and retry.

Data loss:
None.

User notification:
Offline / Sync Pending.

Audit:
Local operation retained.
```

---

# PHASE 56 — FINAL SIH COVERAGE MATRIX

Create:

```text
SIH_COVERAGE_MATRIX.md
```

with:

| Requirement           | Feature        | Actual Code | Test | Evidence | Status |
| --------------------- | -------------- | ----------- | ---- | -------- | ------ |
| Offline healthcare    | SQLite + Sync  | ...         | ...  | ...      | ...    |
| Rural access          | Frontline app  | ...         | ...  | ...      | ...    |
| Referral continuity   | FHIR Task      | ...         | ...  | ...      | ...    |
| Teleconsultation      | LiveKit        | ...         | ...  | ...      | ...    |
| Diagnostics           | ServiceRequest | ...         | ...  | ...      | ...    |
| Medicine availability | Inventory      | ...         | ...  | ...      | ...    |
| High-risk care        | RiskAssessment | ...         | ...  | ...      | ...    |
| Care gaps             | Pathway engine | ...         | ...  | ...      | ...    |
| Multilingual          | i18n           | ...         | ...  | ...      | ...    |
| Interoperability      | FHIR           | ...         | ...  | ...      | ...    |
| Security              | RBAC + scope   | ...         | ...  | ...      | ...    |
| Accountability        | AuditEvent     | ...         | ...  | ...      | ...    |

Use ONLY:

```text
VERIFIED
PARTIAL
UNVERIFIED
NOT IMPLEMENTED
```

Never claim VERIFIED without executable evidence.

---

# PHASE 57 — ARCHITECTURE DOCUMENT

Create:

```text
SETU_PRODUCTION_ARCHITECTURE.md
```

containing:

```text
┌─────────────────────────────┐
│      Frontline Flutter      │
│                             │
│ Forms / Timeline / Triage   │
│ Care Gaps / Referral        │
│ Diagnostics / Medicine     │
└──────────────┬──────────────┘
               │
        Offline Sync Layer
               │
               ↓
┌─────────────────────────────┐
│       NestJS Gateway        │
│                             │
│ Auth / RBAC / Scope         │
│ Sync / Pathway / Routing    │
│ Referral / Diagnostics     │
│ Inventory / Analytics      │
│ Audit / Alerts             │
└──────────────┬──────────────┘
               │
       FHIR API Boundary
               │
               ↓
┌─────────────────────────────┐
│         HAPI FHIR           │
│                             │
│ Canonical Clinical Record   │
└─────────────────────────────┘

Additional services:

LiveKit
Postgres
Observability
```

Explain which system owns what.

---

# PHASE 58 — CLINICAL SAFETY STATEMENT

Create:

```text
CLINICAL_SAFETY_MODEL.md
```

Explicitly state:

```text
Setu is a clinical decision-support and care-coordination
system.

Automated rules identify risk indicators and recommended
actions.

They do not independently establish a medical diagnosis.

Final clinical decisions remain with authorized healthcare
professionals.
```

Document:

```text
human-in-the-loop
override
auditability
rule versioning
explainability
failure-safe behavior
```

---

# PHASE 59 — JUDGE DEMONSTRATION MODE

Create a 5–7 minute deterministic demo.

The demo should show:

### 0:00

Problem:

```text
Remote village
No connectivity
Fragmented healthcare
```

### 0:30

ASHA logs in.

### 0:45

Offline ANC assessment.

### 1:15

Emergency risk detected.

Show:

```text
WHY?
```

### 1:45

Escalation.

### 2:15

Reconnect.

Show:

```text
Offline → synchronized
```

### 2:45

Receiving facility accepts referral.

### 3:15

Live teleconsult.

### 3:45

Diagnostic request.

### 4:15

Diagnostic result.

### 4:45

Medicine availability.

### 5:15

Follow-up.

### 5:45

Care Gap Dashboard.

Show:

```text
OPEN: 3
```

Then resolve the remaining actions.

Finally:

```text
OPEN CRITICAL GAPS: 0
```

This is the emotional climax of the demo.

---

# PHASE 60 — JUDGE MODE "WHY SETU?"

The product should communicate these five differentiators:

## 1. OFFLINE FIRST

Not:

> "Works offline."

But:

> "Clinical workflows continue when connectivity disappears."

## 2. FHIR FIRST

Not:

> "We use FHIR."

But:

> "The patient's longitudinal clinical record remains interoperable across facilities."

## 3. CLOSED LOOP

Not:

> "We track referrals."

But:

> "Setu detects when the next required action did not happen."

## 4. EXPLAINABLE

Not:

> "AI predicts risk."

But:

> "Every risk flag explains which protocol rule triggered it."

## 5. ACCOUNTABLE

Not:

> "We have analytics."

But:

> "Every unresolved care action has an owner, SLA and audit trail."

---

# PHASE 61 — FINAL FORENSIC REPORT

Create:

```text
PHASE_6_FINAL_REPORT.md
```

Sections:

1. Executive Summary
2. Phase 5 Claims vs Actual Code
3. Architecture
4. FHIR Integrity
5. Offline Reliability
6. Sync Reliability
7. Clinical Safety
8. Care Pathway
9. Diagnostics
10. Medicine
11. Routing
12. Security
13. Privacy
14. Auditability
15. Performance
16. Observability
17. Test Results
18. SIH Coverage
19. Known Limitations
20. Production Readiness Score

---

# PHASE 62 — PRODUCTION READINESS SCORE

Score:

```text
Architecture             /10
Offline reliability      /10
FHIR interoperability    /10
Clinical safety           /10
Security                 /10
Care continuity          /10
Diagnostics              /10
Medicine                 /10
Performance              /10
Testing                  /10
Observability            /10
UX/accessibility         /10
```

But every score MUST include evidence.

Do not give:

```text
10/10
```

because something "looks good."

---

# FINAL RULE

DO NOT DECLARE PHASE 6 COMPLETE BECAUSE:

```text
npm run build
```

passes.

Phase 6 is complete ONLY when:

```text
the entire flagship patient journey works,
offline and online;

FHIR references remain valid;

sync survives failures;

conflicts are safe;

clinical rules are explainable;

care gaps are deterministic;

security boundaries hold;

diagnostics work;

medicine workflows work;

dashboards use real data;

audit trails are intact;

and the complete system has executable test evidence.
```

If something cannot be tested:

```text
MARK IT UNVERIFIED.
```

Do not fabricate verification.

At the end, STOP.

Do not start Phase 7.

Wait for review.
