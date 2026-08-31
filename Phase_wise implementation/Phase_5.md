# SIH-26133 — PHASE 5 MASTER IMPLEMENTATION PROMPT

# CARE PATHWAY ORCHESTRATION + DIAGNOSTICS + MEDICINE AVAILABILITY

Repository:

https://github.com/neelshingavi/SIH2026

Problem Statement:

SIH-26133 — Accessibility and quality of public healthcare services, particularly in rural and underserved areas.

DO NOT start by building generic analytics.

DO NOT create cosmetic dashboard charts.

DO NOT add random AI features.

The objective of Phase 5 is to transform Setu from:

```text
FHIR + Triage + Referral + Teleconsult + Follow-up
```

into:

```text
FHIR-BASED CLOSED-LOOP CARE ORCHESTRATION
```

The platform should understand:

```text
WHAT happened?
WHAT should happen next?
HAS it happened?
IF NOT, why?
WHO is responsible?
HOW urgent is it?
WHERE can it happen?
IS the required diagnostic/medicine available?
```

The system must remain:

* offline-first
* FHIR-first
* facility-scoped
* auditable
* explainable
* human-supervised
* production-oriented

---

# PHASE 0 — FORENSIC AUDIT BEFORE CODING

Do NOT trust the Phase 4 report.

Inspect the actual repository.

Verify:

### Clinical Intelligence

* TriageService
* rule definitions
* rule versioning
* rule provenance
* RiskAssessment
* clinician confirmation
* clinician override

### Care Gaps

* gap detection
* gap persistence
* gap lifecycle
* prioritization
* escalation
* resolution

### Follow-up

* CarePlan
* Task
* Encounter
* offline persistence
* synchronization

### Referral

* ServiceRequest
* Task
* SLA
* routing
* incoming/outgoing views
* counter-referral

### Teleconsultation

* LiveKit
* token authorization
* Task ownership
* audit

### Security

* JWT
* RBAC
* FacilityScopeGuard
* local storage
* audit events

### FHIR

Verify actual HAPI FHIR interaction.

Do not trust documentation.

Find every place where FHIR is:

* created
* read
* updated
* searched
* referenced
* synchronized

Identify any remaining:

* fake FHIR
* JSON blobs
* local-only canonical records
* hardcoded demo data
* static dashboard values
* mock queues
* mock diagnostics
* mock medicine inventory

Fix critical discrepancies before proceeding.

---

# PHASE 1 — INTRODUCE THE CARE PATHWAY MODEL

The current Care Gap Engine detects isolated problems.

Upgrade it into a pathway-aware system.

Create the conceptual model:

```text
CARE PATHWAY
    ↓
EXPECTED STEP
    ↓
EVIDENCE
    ↓
STATE
    ↓
CARE GAP
```

Example:

```text
HIGH_RISK_ANC_PATHWAY

1. Assessment
2. Risk identification
3. Medical Officer review
4. Referral
5. Referral acceptance
6. Specialist consultation
7. Clinical outcome
8. Care plan
9. Diagnostic completion
10. Treatment/medicine
11. Follow-up
12. Follow-up completion
```

Do NOT implement all pathways at once.

Implement a strong ANC/high-risk pathway first.

---

# PHASE 2 — PATHWAY STATE MACHINE

Create explicit pathway states.

Example:

```text
ASSESSMENT_PENDING
ASSESSMENT_COMPLETED
RISK_IDENTIFIED
CLINICIAN_REVIEW_PENDING
ESCALATION_REQUIRED
REFERRAL_PENDING
REFERRAL_ACCEPTED
CONSULTATION_PENDING
CONSULTATION_COMPLETED
DIAGNOSTICS_PENDING
TREATMENT_PENDING
FOLLOWUP_DUE
FOLLOWUP_OVERDUE
CARE_COMPLETED
```

Do not duplicate these states independently in multiple services.

Create one authoritative orchestration model.

Where possible, derive operational state from FHIR resources rather than inventing a second clinical truth.

---

# PHASE 3 — CARE GAP ENGINE 2.0

Replace simplistic condition checks with pathway rules.

A care gap should contain:

```text
gapId
patientReference
pathway
step
severity
priority
reason
expectedAction
responsibleRole
responsibleFacility
dueAt
createdAt
evidence
status
```

Example:

```text
CARE GAP

Patient:
Jane Doe

Pathway:
High-Risk ANC

Current Step:
Referral Pending

Expected:
Referral acceptance

Due:
12:30 PM

SLA:
1 hour

Priority:
CRITICAL

Responsible:
Receiving facility

Reason:
STAT referral has not been accepted within SLA.
```

---

# PHASE 4 — CARE GAP LIFECYCLE

Implement:

```text
OPEN
ACKNOWLEDGED
IN_PROGRESS
RESOLVED
DISMISSED
ESCALATED
```

Do NOT allow arbitrary state transitions.

Define:

```text
VALID_TRANSITIONS
```

and enforce them server-side.

---

# PHASE 5 — GAP EVIDENCE

Every gap must explain itself.

Example:

```text
WHY IS THIS A GAP?

✓ RiskAssessment exists
✓ Risk = EMERGENCY
✓ ServiceRequest exists
✓ Task created
✗ No accepting Task transition
✗ SLA exceeded
```

This is extremely important for judge demonstrations.

A dashboard should never simply say:

```text
Referral delayed
```

It should explain:

```text
Referral delayed because:
STAT referral created 1h 23m ago.
Receiving facility has not accepted it.
```

---

# PHASE 6 — GAP RESOLUTION MUST BE EVIDENCE-BASED

Never simply delete a gap.

When a gap is resolved:

```text
CARE GAP
   ↓
Resolution action
   ↓
FHIR resource updated/created
   ↓
Evidence recorded
   ↓
Gap marked RESOLVED
```

Example:

```text
FOLLOW-UP GAP

Resolve action:

Create follow-up Encounter

↓

FHIR Encounter created

↓

Gap resolved
```

Do NOT implement:

```text
delete gap from database
```

as the primary mechanism.

---

# PHASE 7 — DIAGNOSTIC COORDINATION

This is one of the largest remaining SIH requirements.

Build a proper diagnostic workflow.

The system must support:

```text
Clinical need
    ↓
Diagnostic request
    ↓
Find capable facility
    ↓
Availability
    ↓
Appointment / queue
    ↓
Sample / procedure
    ↓
Result
    ↓
Clinician review
    ↓
Care pathway update
```

Use appropriate FHIR resources.

Investigate:

* ServiceRequest
* DiagnosticReport
* Observation
* Specimen
* Appointment
* Task

Do not invent:

```text
DiagnosticEntity
```

as the clinical source of truth.

---

# PHASE 8 — DIAGNOSTIC REQUEST

A clinician should be able to create:

```text
Diagnostic Request

Patient:
Jane Doe

Investigation:
...

Priority:
STAT / URGENT / ROUTINE

Reason:
...

Requested by:
...

Destination:
...
```

Persist it using FHIR.

---

# PHASE 9 — DIAGNOSTIC CAPABILITY REGISTRY

Create facility capability data.

Example:

```text
PHC A

CBC       ✓
Blood Sugar ✓
Urine      ✓
Ultrasound ✗
X-Ray      ✗
```

Rural Hospital:

```text
CBC        ✓
Blood Sugar ✓
Ultrasound ✓
X-Ray      ✓
```

The routing engine should use this capability data.

Do not hardcode capabilities inside UI code.

---

# PHASE 10 — DIAGNOSTIC AVAILABILITY

Capability is not availability.

Distinguish:

```text
CAN PROVIDE
```

from:

```text
AVAILABLE NOW
```

and:

```text
AVAILABLE ON DATE
```

Example:

```text
Ultrasound

Facility A
Capability: YES
Available today: NO
Next slot: 03 Sep

Facility B
Capability: YES
Available today: YES
Queue: 4
```

This directly addresses the real-world access problem.

---

# PHASE 11 — DIAGNOSTIC CARE GAP

If:

```text
ServiceRequest exists
```

but:

```text
DiagnosticReport does not exist
```

after the appropriate time:

```text
DIAGNOSTIC CARE GAP
```

Example:

```text
🔴 Diagnostic pending

Investigation:
Ultrasound

Requested:
2 days ago

Expected:
Within 24 hours

Status:
No result received
```

This should automatically enter the Care Gap Engine.

---

# PHASE 12 — RESULT INGESTION

When a diagnostic result arrives:

```text
DiagnosticReport
     +
Observations
```

link them to:

```text
ServiceRequest
Encounter
Patient
```

Do not create disconnected results.

---

# PHASE 13 — RESULT REVIEW GAP

A result existing does not mean it was reviewed.

Detect:

```text
DiagnosticReport exists
BUT
clinician review missing
```

Create:

```text
RESULT_REVIEW_PENDING
```

This is an excellent real-world care-gap scenario.

---

# PHASE 14 — ABNORMAL RESULT ESCALATION

If a diagnostic result contains an abnormal finding:

DO NOT automatically diagnose.

Instead:

```text
ABNORMAL RESULT

Clinical review recommended.

[Review Result]
[Create Referral]
[Create Follow-up]
```

If the configured protocol supports an emergency escalation:

```text
Emergency protocol triggered.

Medical Officer review required.
```

---

# PHASE 15 — MEDICINE AVAILABILITY

The SIH problem explicitly includes medicine availability.

Build a facility medicine inventory capability.

At minimum:

```text
Medicine
Facility
Available quantity
Unit
Last updated
Expiry information where appropriate
Status
```

Do not expose patient-identifying information in inventory dashboards.

---

# PHASE 16 — MEDICINE REQUEST

Connect medicine need to the care pathway.

Example:

```text
Treatment Plan
     ↓
MedicationRequest
     ↓
Availability search
     ↓
Facility selection
     ↓
Dispensing
```

Use appropriate FHIR semantics.

Do not create a parallel clinical medication truth.

---

# PHASE 17 — MEDICINE SHORTAGE

If the prescribed/requested medicine is unavailable:

Create a care gap:

```text
MEDICINE_UNAVAILABLE
```

Example:

```text
⚠ Medicine unavailable

Medicine:
...

Required:
...

Facility:
PHC A

Available:
0

Nearest facility:
PHC B

Distance:
...
```

Then suggest alternatives ONLY if the clinical workflow explicitly permits authorized substitution.

Do not recommend drug substitutions autonomously.

---

# PHASE 18 — STOCK VISIBILITY

Inventory must support:

```text
IN STOCK
LOW STOCK
OUT OF STOCK
UNKNOWN
```

Do not treat stale inventory as current truth.

Display:

```text
Last updated:
2h ago
```

or equivalent.

---

# PHASE 19 — OFFLINE INVENTORY

The frontline app must cache relevant facility inventory.

Clearly distinguish:

```text
AVAILABLE
```

from:

```text
LAST KNOWN AVAILABLE
```

Example:

```text
⚠ Last updated 5 hours ago
```

Never claim real-time stock while offline.

---

# PHASE 20 — MEDICINE CARE GAP

If:

```text
MedicationRequest exists
```

but:

```text
dispensing evidence absent
```

after the expected window:

```text
MEDICATION_FULFILLMENT_GAP
```

This should enter the same Care Gap Engine.

---

# PHASE 21 — APPOINTMENT + QUEUE

Connect referral and diagnostics to actual appointment/queue workflows.

Model:

```text
ServiceRequest
      ↓
Appointment
      ↓
Encounter
```

and:

```text
Diagnostic ServiceRequest
      ↓
Appointment
      ↓
Procedure / DiagnosticReport
```

Clearly distinguish:

```text
scheduled
```

from:

```text
actually attended
```

---

# PHASE 22 — QUEUE INTELLIGENCE

For a frontline worker:

```text
SPECIALIST

Current queue:
4 patients

Estimated wait:
...

Teleconsult available:
YES
```

For diagnostics:

```text
Ultrasound
Queue:
6
Estimated wait:
...
```

Do not fake real-time waiting time.

If it is estimated, label it as estimated.

---

# PHASE 23 — SMART DESTINATION ROUTING

Upgrade Phase 3 routing.

Score destinations using actual data:

```text
clinical capability
+
availability
+
queue
+
distance
+
teleconsult availability
+
emergency capability
+
SLA
```

But do not create an opaque "AI score."

Show why a facility was recommended.

Example:

```text
RECOMMENDED

Rural Hospital A

Why:
✓ Required diagnostic available
✓ Obstetrics available
✓ Open today
✓ Queue: 3
✓ Teleconsult supported
✓ 18 km
```

---

# PHASE 24 — CARE PATHWAY ORCHESTRATOR

Create a backend service responsible for determining:

```text
current pathway state
expected next action
missing evidence
care gaps
responsible actor
```

Do NOT put this logic inside React/Flutter screens.

Do NOT duplicate it in mobile and backend.

---

# PHASE 25 — FHIR AS SOURCE OF CLINICAL TRUTH

Review every new feature.

Prefer:

```text
ServiceRequest
Task
Appointment
Encounter
Observation
DiagnosticReport
Specimen
MedicationRequest
CarePlan
RiskAssessment
```

where semantically appropriate.

Do not create unnecessary custom clinical entities.

Operational projections may exist for performance, but clearly distinguish:

```text
FHIR canonical record
```

from:

```text
read-model / cache / projection
```

---

# PHASE 26 — OFFLINE-FIRST DIAGNOSTICS

Test:

```text
offline
→ create diagnostic request
→ queue
→ kill application
→ restart
→ request survives
→ reconnect
→ sync
→ destination receives request
```

---

# PHASE 27 — OFFLINE MEDICINE WORKFLOW

Test:

```text
offline
→ view last-known inventory
→ record medicine requirement
→ create MedicationRequest
→ queue
→ restart
→ reconnect
→ sync
```

Clearly label stale stock data.

---

# PHASE 28 — CONFLICT RESOLUTION

Handle:

```text
Inventory changed remotely
while
worker was offline
```

Do NOT silently overwrite.

Example:

```text
LOCAL:
Medicine available = 10

SERVER:
Medicine available = 0
```

The app should surface:

```text
Inventory changed while offline.
Refreshing latest availability.
```

---

# PHASE 29 — MULTILINGUAL PRODUCTION FOUNDATION

Finish:

```text
English
Marathi
Hindi
```

for the core frontline workflow.

Translate:

* dashboard
* triage
* care gaps
* referrals
* diagnostics
* medicine
* emergency alerts
* follow-up

Do not machine-translate critical clinical explanations at runtime.

Use reviewed strings.

---

# PHASE 30 — PRIVACY

Audit all dashboards.

There should be three information levels:

```text
Frontline
Facility
District
```

District dashboards should be aggregate-first.

Never expose unnecessary patient identifiers.

---

# PHASE 31 — FACILITY OPERATIONS DASHBOARD

Now build dashboards.

But dashboards must be generated from actual workflow data.

Facility view:

```text
TODAY

Emergency cases       3
Referral gaps         7
Diagnostic gaps       5
Medicine shortages    4
Follow-ups overdue    12

Median referral time
Median diagnostic completion
Follow-up completion
```

Every number must be drillable.

Example:

```text
Referral gaps: 7

→ open list of the 7 actual cases
```

No decorative charts.

---

# PHASE 32 — DISTRICT QUALITY VIEW

District administrator should see:

```text
Facility
Referral completion
Diagnostic turnaround
Medicine availability
Follow-up completion
Care gaps
Emergency escalation
```

Do not show raw patient-level information by default.

---

# PHASE 33 — QUALITY METRICS

Implement meaningful metrics.

Examples:

```text
Referral completion rate
Median referral acceptance time
Median referral completion time
Diagnostic turnaround time
Result review time
Follow-up completion rate
Overdue follow-up rate
Medicine stockout rate
Care-gap resolution time
```

Do not calculate metrics from fake/demo values.

---

# PHASE 34 — ACCOUNTABILITY

Every metric must trace to underlying events.

For example:

```text
Referral completion rate
```

must be reproducible from:

```text
ServiceRequest
Task
Encounter
```

and not from a manually incremented counter.

---

# PHASE 35 — ALERT ENGINE

Create configurable alerts.

Examples:

```text
STAT referral breached
Emergency risk unresolved
Diagnostic result not reviewed
Medicine stockout
Follow-up overdue
```

Alerts should have:

```text
severity
recipient
createdAt
acknowledgedAt
resolvedAt
```

Do not spam users.

---

# PHASE 36 — NOTIFICATION SAFETY

Notifications should avoid PHI.

Bad:

```text
Jane Doe has suspected pre-eclampsia.
```

Better:

```text
Emergency clinical review required.
Open Setu to view assigned case.
```

---

# PHASE 37 — DEMO SCENARIO

Build ONE end-to-end flagship scenario.

Example:

```text
REMOTE VILLAGE
     ↓
ANC assessment
     ↓
Emergency risk detected
     ↓
MO review
     ↓
STAT referral
     ↓
Destination selection
     ↓
Specialist accepts
     ↓
Teleconsult
     ↓
Diagnostic request
     ↓
Diagnostic facility selected
     ↓
Result received
     ↓
MO reviews result
     ↓
Medication requested
     ↓
Medicine unavailable
     ↓
Alternative facility identified
     ↓
Medication fulfilled
     ↓
Follow-up scheduled
     ↓
ASHA visits offline
     ↓
Follow-up completed
     ↓
All care gaps closed
```

This should become the flagship SIH demonstration.

---

# PHASE 38 — DO NOT FAKE ANYTHING

The following are prohibited:

* fake queue numbers
* fake inventory counts
* static diagnostic results
* fake FHIR timelines
* hardcoded dashboard metrics
* fake LiveKit states
* simulated sync counters
* static care gaps
* fake patient journeys

If a feature is not implemented, display:

```text
Prototype / Not available
```

rather than pretending.

---

# PHASE 39 — PRODUCTION ERROR HANDLING

Every workflow must handle:

```text
network unavailable
HAPI unavailable
authentication expired
FHIR validation failure
duplicate request
conflict
timeout
partial batch failure
facility unavailable
stale inventory
expired appointment
```

Do not show raw stack traces to frontline users.

---

# PHASE 40 — OBSERVABILITY

Add metrics:

```text
care_gap_created
care_gap_resolved
referral_sla_breach
diagnostic_turnaround
medicine_stockout
followup_overdue
appointment_wait
sync_failure
FHIR_failure
```

Do not put patient identifiers into metric labels.

---

# PHASE 41 — TESTING

Actually execute tests.

Backend:

* unit
* integration
* authorization
* FHIR
* pathway
* care-gap
* diagnostic
* inventory
* medication
* SLA

Flutter:

* repository
* offline
* sync
* pathway
* localization
* stale-data handling

E2E:

```text
offline
→ assessment
→ risk
→ referral
→ consultation
→ diagnostic
→ medicine
→ follow-up
→ sync
→ dashboard
```

Do not report:

> "structured to pass."

Only report tests actually executed.

---

# PHASE 42 — SECURITY TEST MATRIX

Test:

```text
Facility A cannot access Facility B patient.

Facility A cannot modify Facility B referral.

ASHA cannot modify clinical rule definitions.

ASHA cannot override MO-only decisions.

Unauthorized user cannot view district-level sensitive data.

Expired JWT rejected.

Replay request handled idempotently.

Duplicate diagnostic request handled safely.

Inventory mutation authorized.

Medication fulfillment authorized.
```

---

# PHASE 43 — FHIR VALIDATION

Validate actual resources against FHIR expectations.

At minimum inspect:

```text
Patient
Encounter
Observation
RiskAssessment
CarePlan
ServiceRequest
Task
Appointment
DiagnosticReport
MedicationRequest
```

Verify:

* references
* status
* identifiers
* timestamps
* subject
* requester
* performer
* basedOn
* reasonReference / reason
* partOf
* encounter

Do not merely validate that JSON parses.

---

# PHASE 44 — DEMO MODE

Create a controlled demo dataset.

But make it explicit:

```text
DEMO DATA
```

Provide a reset mechanism.

The judge should be able to start the demonstration from a known state.

Do not mix demo records with production records.

---

# PHASE 45 — FINAL SIH COVERAGE MATRIX

Produce:

| SIH Requirement       | Setu Feature                    | Actual Implementation | Evidence |
| --------------------- | ------------------------------- | --------------------- | -------- |
| Rural access          | Offline frontline app           | ...                   | ...      |
| Specialist shortage   | Teleconsult                     | ...                   | ...      |
| Delayed referrals     | SLA + care gaps                 | ...                   | ...      |
| Fragmented records    | FHIR longitudinal record        | ...                   | ...      |
| Diagnostics           | Diagnostic coordination         | ...                   | ...      |
| Medicine availability | Inventory + medication workflow | ...                   | ...      |
| High-risk follow-up   | CarePlan + Task                 | ...                   | ...      |
| Emergency escalation  | Protocol-driven escalation      | ...                   | ...      |
| Language barriers     | Marathi/Hindi/English           | ...                   | ...      |
| Interoperability      | FHIR                            | ...                   | ...      |
| Quality               | Facility metrics                | ...                   | ...      |
| Accountability        | Audit + traceability            | ...                   | ...      |

Mark every item:

```text
IMPLEMENTED
PARTIAL
PROTOTYPE
NOT IMPLEMENTED
```

Never inflate coverage.

---

# PHASE 46 — FINAL QUALITY GATE

Before declaring Phase 5 complete, answer:

1. Can an ASHA work with no internet?
2. Can the patient journey survive app restart?
3. Can the patient move across facilities without losing context?
4. Can the system identify a missed clinical action?
5. Can it explain why the action is overdue?
6. Can it identify where the patient should go?
7. Can it tell whether diagnostics are actually available?
8. Can it tell whether medicine is actually available?
9. Can a clinician review and override recommendations?
10. Can every important action be audited?
11. Can a district administrator identify systemic bottlenecks?
12. Can every dashboard number be traced to underlying records?
13. Can Facility A access Facility B data?
14. Can stale offline information be distinguished from current information?
15. Does the system fail safely when dependencies are unavailable?

If any answer is "no", do not declare the phase production-grade.

---

# FINAL REPORT

Produce:

## A. Phase 4 Forensic Audit

Actual code findings.

## B. Care Pathway Architecture

Show:

```text
Patient
 ↓
Assessment
 ↓
Risk
 ↓
Referral
 ↓
Diagnostics
 ↓
Treatment
 ↓
Follow-up
 ↓
Outcome
```

## C. Care Gap Architecture

Explain:

```text
Expected action
 ↓
Evidence
 ↓
Gap
 ↓
Priority
 ↓
Owner
 ↓
Resolution
```

## D. Diagnostic Architecture

Show the FHIR resources and workflow.

## E. Medicine Architecture

Show inventory, request and fulfillment.

## F. Routing Architecture

Explain how capability, availability, queue, distance and urgency affect destination selection.

## G. Offline Architecture

Show how all new workflows survive offline operation.

## H. Security

Document authorization and facility isolation.

## I. Testing

List only tests actually executed.

## J. SIH Mapping

Map every requirement to actual evidence.

## K. Remaining Gaps

Be brutally honest.

## L. Phase 6 Recommendation

Do NOT automatically recommend another feature.

Inspect the entire implementation and determine the single highest-impact remaining weakness.

STOP.
