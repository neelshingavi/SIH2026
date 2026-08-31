# SIH-26133 — PHASE 4 MASTER IMPLEMENTATION PROMPT

# CLINICAL INTELLIGENCE + HIGH-RISK FOLLOW-UP + CONTINUITY ENGINE

You are continuing development of **Setu** in:

https://github.com/neelshingavi/SIH2026

Do NOT blindly implement the previous Phase 4 recommendation of "Analytics & District Dashboards."

That is premature.

Phase 3 already established the critical operational backbone:

```text
Patient
   ↓
Encounter
   ↓
Clinical observations
   ↓
Triage
   ↓
ServiceRequest
   ↓
Task
   ↓
Referral
   ↓
Teleconsultation
   ↓
Clinical outcome
   ↓
Counter-referral
   ↓
Follow-up
```

Now the platform needs to become intelligent.

The goal of Phase 4 is:

> HELP A FRONTLINE HEALTH WORKER IDENTIFY RISK, EXPLAIN WHY THE PATIENT NEEDS ESCALATION, CREATE THE APPROPRIATE CARE/FOLLOW-UP WORKFLOW, AND ENSURE THE PATIENT DOES NOT DISAPPEAR AFTER THE ENCOUNTER.

This phase must remain:

* clinically explainable
* human-supervised
* FHIR-driven
* offline-first
* secure
* auditable
* deterministic where safety matters
* useful to ASHA/ANM/PHC workers
* appropriate for rural Maharashtra

DO NOT build a generic chatbot.

DO NOT build an "AI doctor."

DO NOT replace clinicians.

DO NOT make diagnosis claims unsupported by validated clinical protocols.

---

# 0. FIRST — RE-AUDIT PHASE 3

Before modifying anything, inspect the actual repository.

Do NOT trust the Phase 3 report.

Verify:

* ServiceRequest
* Task
* referral state machine
* destination routing
* SLA
* teleconsult
* LiveKit
* facility authorization
* FHIR references
* offline referral sync
* audit events
* counter-referral
* follow-up
* existing triage implementation

Find:

* fake data
* hardcoded statuses
* hardcoded clinical rules
* mock dashboards
* static UI
* insecure endpoints
* incorrect FHIR resource usage
* duplicate business logic
* frontend-only validation
* missing tests
* race conditions
* offline synchronization bugs

Fix Phase 3 blockers before beginning Phase 4.

---

# 1. UNDERSTAND THE ACTUAL SIH REQUIREMENT

The SIH-26133 problem specifically identifies:

* long travel distances
* shortage of specialists
* irregular diagnostics
* fragmented records
* delayed referrals
* limited awareness
* constrained staff/equipment
* movement between sub-centres, PHCs, rural hospitals and district hospitals
* lack of continuity
* connectivity problems
* language barriers
* health literacy
* affordability

The expected solution explicitly includes:

* assisted teleconsultation
* appointment/queue management
* digital triage
* longitudinal records
* referral tracking
* diagnostic coordination
* medicine availability
* high-risk patient follow-up
* facility dashboards
* multilingual interaction
* emergency escalation
* interoperable health records

Reference:

SIH-26133:
https://sih2026.vuce.in/en/ps/SIH26133

Do not attempt to implement every feature superficially.

Phase 4 should focus deeply on:

```text
DIGITAL TRIAGE
+
EXPLAINABLE RISK STRATIFICATION
+
HIGH-RISK FOLLOW-UP
+
CARE PLAN
+
ESCALATION
+
CONTINUITY
```

---

# 2. CRITICAL SAFETY PRINCIPLE

Setu is NOT an autonomous medical decision-maker.

Never implement:

```text
"AI says patient has disease X."
```

Instead implement:

```text
"Protocol-based assessment identified these risk indicators."
```

The platform should support:

```text
OBSERVE
   ↓
ASSESS
   ↓
EXPLAIN
   ↓
RECOMMEND
   ↓
CLINICIAN CONFIRMS
   ↓
ACTION
```

The clinician remains responsible for the decision.

---

# 3. REPLACE HARD-CODED TRIAGE LOGIC

Inspect the existing:

```text
triage_service.dart
```

and all backend triage logic.

If rules are hardcoded as:

```text
if (spo2 < ...)
if (bp > ...)
if (...)
```

embedded directly in Dart/TypeScript business logic, refactor them.

Create a versioned rule model.

Example:

```text
ClinicalRule
├── id
├── version
├── condition
├── severity
├── recommendation
├── explanation
├── requiredAction
├── applicablePopulation
├── effectiveFrom
└── source
```

Rules must be versioned.

Never silently change clinical rules.

---

# 4. RULE ENGINE

Implement a deterministic rule evaluation engine.

The engine should accept:

```text
FHIR Patient
FHIR Encounter
FHIR Observation
FHIR Condition
FHIR MedicationStatement / MedicationRequest
```

and produce:

```text
RiskAssessment
+
explanations
+
recommended actions
```

The output must be deterministic.

Same input + same rule version = same result.

---

# 5. CLINICAL RULE REPRESENTATION

Prefer a declarative representation.

For example:

```json
{
  "id": "example-rule",
  "version": "1.0.0",
  "population": "adult",
  "when": {
    "...": "..."
  },
  "severity": "HIGH",
  "recommendation": "Clinical review required",
  "explanation": [
    "Observed value exceeded configured threshold"
  ]
}
```

Do NOT invent clinical thresholds.

Use only:

* validated guidelines
* approved protocols
* officially sourced thresholds
* clinician-approved demo rules

Every rule should have a provenance/source field.

---

# 6. RULE VERSIONING

A clinical rule must never be an anonymous piece of code.

Display:

```text
Assessment protocol
Version
Last updated
Source
```

Example:

```text
Maternal risk assessment
Protocol v1.2
Updated: ...
Source: approved clinical protocol
```

Do not fabricate a government guideline citation.

If a rule is a prototype demonstration rule, label it explicitly:

```text
DEMO PROTOCOL — NOT FOR CLINICAL DEPLOYMENT
```

---

# 7. EXPLAINABLE TRIAGE RESULT

Do NOT output only:

```text
HIGH RISK
```

Instead produce:

```text
HIGH RISK

Why?

• Observation X triggered risk rule
• Observation Y increased risk
• Patient belongs to high-risk population

Recommended next action:

→ Medical Officer review

Suggested urgency:

URGENT

Reason:

Patient requires timely clinical assessment.

[Review]
[Refer]
```

The explanation must be derived from actual evaluated rules.

---

# 8. RISK LEVELS

Define an explicit risk model.

For example:

```text
ROUTINE
ATTENTION
HIGH
EMERGENCY
```

But do not allow arbitrary UI strings.

Risk must have machine-readable semantics.

The exact terminology should be finalized against the clinical protocol used by the system.

---

# 9. RISK ≠ DIAGNOSIS

This distinction must be enforced throughout the product.

Correct:

```text
"Risk indicators detected."
```

Incorrect:

```text
"You have pre-eclampsia."
```

unless a qualified clinician has actually diagnosed it and it exists as a FHIR Condition.

The engine may identify:

```text
risk indicator
```

but must not create unsupported diagnoses automatically.

---

# 10. CLINICIAN CONFIRMATION

When triage produces:

```text
HIGH
```

the Medical Officer must be able to:

```text
Accept assessment
Modify assessment
Dismiss assessment
Add clinical reasoning
Escalate
Refer
Schedule follow-up
```

The system must record:

```text
actor
timestamp
facility
rule version
original recommendation
final clinician decision
```

---

# 11. FHIR RISK MODEL

Determine the appropriate FHIR representation.

Investigate:

* RiskAssessment
* Observation
* Condition
* ClinicalImpression
* CarePlan

Do NOT create:

```text
RiskScoreEntity
```

as the clinical source of truth.

If an operational projection is required, clearly distinguish it from the canonical FHIR record.

---

# 12. HIGH-RISK PATIENT REGISTRY

This is a major feature.

Create a real high-risk worklist.

A frontline worker should see:

```text
HIGH-RISK PATIENTS

1. Patient A
   HIGH
   Follow-up due today
   Last contact: 2 days ago

2. Patient B
   ATTENTION
   Follow-up overdue by 3 days

3. Patient C
   HIGH
   Referral awaiting acceptance
```

Everything must come from persisted data.

No hardcoded patients.

---

# 13. CARE PLAN

A high-risk patient should not merely have:

```text
risk = HIGH
```

Create a structured care workflow.

Use FHIR `CarePlan` where appropriate.

Conceptually:

```text
Patient
   ↓
RiskAssessment
   ↓
CarePlan
   ├── referral
   ├── follow-up
   ├── observation
   ├── appointment
   └── education
```

---

# 14. FOLLOW-UP TASKS

Follow-up must become actionable.

Create appropriate FHIR Tasks/activities.

Example:

```text
FOLLOW-UP DUE

Patient:
Reason:
Assigned worker:
Due:
Priority:

[Start Follow-up]
```

The worker should be able to record:

```text
CONTACTED
VISITED
NOT_REACHABLE
REFERRED
COMPLETED
```

Do not create arbitrary statuses without defining their relationship to the underlying workflow.

---

# 15. FOLLOW-UP PRIORITIZATION

The frontline worker should not have to inspect 100 patients manually.

Prioritize:

```text
Emergency
↓
High risk
↓
SLA breach
↓
Follow-up overdue
↓
Due today
↓
Upcoming
```

Make the prioritization explainable.

Example:

```text
Priority: CRITICAL

Because:
• High-risk assessment
• Follow-up overdue
• Referral still pending
```

---

# 16. FOLLOW-UP ESCALATION

If a high-risk patient is not followed up:

```text
Due
 ↓
Reminder
 ↓
Overdue
 ↓
Escalation
```

Escalation should be configurable.

Example:

```text
ASHA
 ↓
ANM
 ↓
Medical Officer
```

Do not hardcode one organizational hierarchy if the platform claims to support multiple facility structures.

---

# 17. MISSED FOLLOW-UP

Support:

```text
PATIENT NOT REACHED
```

This is NOT the same as:

```text
FOLLOW-UP COMPLETED
```

Record:

* attempts
* timestamps
* actor
* reason
* next action

---

# 18. OFFLINE FOLLOW-UP

This must work offline.

Scenario:

```text
ASHA goes into village
        ↓
No internet
        ↓
Opens high-risk worklist
        ↓
Patient visit
        ↓
Records observations
        ↓
Completes follow-up
        ↓
Creates next task
        ↓
Returns online
        ↓
Sync
```

The system must preserve all records after app restart.

---

# 19. PATIENT JOURNEY

Build a visual longitudinal journey.

Example:

```text
JAN 10
Patient registered
      ↓
JAN 15
Risk identified
      ↓
JAN 15
Referral created
      ↓
JAN 15
Referral accepted
      ↓
JAN 16
Teleconsultation
      ↓
JAN 16
Clinical outcome
      ↓
JAN 23
Follow-up
      ↓
FEB 05
Follow-up completed
```

This should be generated from actual FHIR resources.

Do NOT build a fake timeline array.

---

# 20. "CARE GAP" ENGINE

Introduce a care-gap concept.

A care gap means:

```text
Required next action
exists
but
has not happened.
```

Examples:

```text
Referral created
→ not accepted

Referral accepted
→ consultation not completed

High-risk patient
→ follow-up overdue

Diagnostic requested
→ result missing

Follow-up due
→ no contact recorded
```

This becomes one of the strongest differentiators of the platform.

---

# 21. CARE GAP DASHBOARD

For a frontline worker:

```text
MY CARE GAPS

🔴 3 Critical
🟠 5 High
🟡 8 Due Soon
```

For a Medical Officer:

```text
FACILITY CARE GAPS

Referral delays
Follow-up gaps
Diagnostic gaps
Unresolved high-risk patients
```

For district administrators:

```text
FACILITY
↓
CARE GAP
↓
AGE
↓
SLA
↓
STATUS
```

Do not build a generic analytics dashboard.

Build a **care-gap dashboard**.

---

# 22. EMERGENCY ESCALATION

If the triage protocol produces emergency-level risk:

The workflow should immediately emphasize:

```text
EMERGENCY REVIEW REQUIRED
```

Actions:

```text
[Call Medical Officer]
[Create Emergency Referral]
[View Emergency-Capable Facilities]
```

Do NOT claim the system has called an emergency service unless it actually has.

---

# 23. FACILITY CAPABILITY + CLINICAL NEED

Integrate Phase 3 routing with Phase 4 risk.

Example:

```text
Risk:
HIGH

Need:
Obstetric evaluation

Destination requirements:
✓ Obstetrics
✓ Emergency capability
✓ Ultrasound
✓ Specialist access
```

Then route using real facility capability data.

Do not recommend a facility that cannot provide the required service.

---

# 24. QUEUE-AWARE CARE

Use Phase 3 facility routing.

When appropriate, show:

```text
Facility A
18 km
Obstetrics ✓
Queue: 3
Teleconsult ✓

Facility B
11 km
Obstetrics ✓
Queue: 17
Teleconsult unavailable
```

The final decision remains with the clinician.

---

# 25. APPOINTMENT INTEGRATION

Do NOT build appointments as an isolated feature.

Connect:

```text
Referral
   ↓
Task
   ↓
Appointment
   ↓
Encounter
```

Clearly distinguish:

```text
planned event
```

from:

```text
actual clinical encounter
```

---

# 26. MULTILINGUAL UX FOUNDATION

SIH explicitly calls out language barriers.

Do not attempt to build a massive translation engine.

Instead create a localization architecture.

Support:

```text
English
Marathi
Hindi
```

at minimum if feasible.

Externalize:

* UI labels
* triage explanations
* action labels
* error messages
* follow-up instructions

Do NOT hardcode user-facing clinical strings throughout Dart/TypeScript.

---

# 27. CLINICAL LANGUAGE

The frontline UI should avoid unnecessarily technical language.

Instead of:

```text
ServiceRequest.status = active
```

show:

```text
Referral is active
```

Instead of:

```text
Task.status = ready
```

show:

```text
Waiting for facility acceptance
```

Keep the underlying FHIR semantics intact.

---

# 28. VOICE-READY ARCHITECTURE

Do not build a fake AI voice assistant.

Prepare the architecture for future voice interaction.

For example:

```text
Voice input
   ↓
Speech-to-text
   ↓
Structured field extraction
   ↓
Human confirmation
   ↓
FHIR resource
```

The current phase may implement only the interfaces needed for this architecture.

If actual speech recognition is implemented, it must not silently convert uncertain speech into clinical facts.

---

# 29. CLINICAL DATA PROVENANCE

Every important clinical fact should be traceable.

For example:

```text
SpO2 = 91%

Source:
Pulse oximeter

Recorded by:
ANM

Facility:
PHC X

Time:
...

Rule:
Risk protocol v1.0
```

Do not manufacture device provenance if the value was manually entered.

---

# 30. OBSERVATION QUALITY

Introduce data-quality indicators.

Examples:

```text
MEASURED
SELF_REPORTED
IMPORTED
ESTIMATED
```

Only use categories supported by the actual data model.

Do not pretend a manually entered value came from a medical device.

---

# 31. DATA VALIDATION

Frontend validation is not enough.

Validate clinical input on the server where appropriate.

Reject impossible values.

Examples:

* impossible dates
* malformed FHIR references
* invalid observation structures
* invalid patient references

Do not silently "fix" clinical values.

---

# 32. DUPLICATE PATIENT SAFETY

Extend Phase 2 duplicate detection.

Do NOT automatically merge patients.

Potential duplicate:

```text
POSSIBLE DUPLICATE
```

Then:

```text
Compare records
```

and allow authorized human resolution.

Audit every merge/link operation if implemented.

---

# 33. PRIVACY

Do not expose unnecessary patient information on:

* dashboards
* notifications
* referral lists
* shared screens

Use minimum necessary information.

Especially for:

```text
public dashboards
```

Never show identifiable patient data in aggregate district analytics.

---

# 34. OFFLINE SECURITY

Audit the local SQLite implementation.

Determine whether sensitive clinical data is encrypted at rest.

If not:

Implement an appropriate encrypted local store or encryption layer.

Do not claim:

```text
secure offline storage
```

unless it is actually encrypted and key-managed appropriately.

Do not store encryption keys beside the database.

---

# 35. RULE UPDATE MODEL

A rural worker may be offline when clinical rules are updated.

Implement:

```text
Rule version
↓
download when online
↓
local cache
↓
evaluate offline
```

The application must know:

```text
Current rule version
```

and record which version generated an assessment.

Do NOT silently evaluate an old rule as though it were current.

---

# 36. RULE ROLLBACK

If a rule version is defective:

The backend should be able to deactivate it.

Already-created clinical assessments must remain immutable historically.

Do not retroactively rewrite history.

---

# 37. AUDIT EVENTS

Add explicit events:

```text
TRIAGE_STARTED
TRIAGE_COMPLETED
RISK_IDENTIFIED
CLINICIAN_REVIEWED_RISK
RISK_ACCEPTED
RISK_OVERRIDDEN
CARE_PLAN_CREATED
FOLLOWUP_CREATED
FOLLOWUP_COMPLETED
FOLLOWUP_MISSED
CARE_GAP_CREATED
CARE_GAP_RESOLVED
EMERGENCY_ESCALATED
```

Audit:

```text
actor
facility
timestamp
patient/resource
rule version
decision
```

Do not put unnecessary clinical payloads into generic logs.

---

# 38. SECURITY TESTING

Add actual tests for:

```text
Unauthorized risk assessment
Cross-facility patient access
Cross-facility follow-up modification
Unauthorized care-plan modification
Unauthorized referral escalation
Unauthorized rule modification
```

---

# 39. CLINICAL SAFETY TESTING

Create test cases for:

```text
normal input
boundary input
missing observation
contradictory observations
stale observation
offline assessment
old rule version
rule update
rule rollback
clinician override
```

The purpose is to ensure the engine fails safely.

---

# 40. OFFLINE TEST MATRIX

Actually test:

```text
Create patient offline
Create encounter offline
Record observation offline
Run triage offline
Create care plan offline
Create follow-up offline
Create referral offline
Kill application
Restart
Verify everything survives
Reconnect
Sync
Verify server state
```

This should become the flagship technical demonstration.

---

# 41. END-TO-END SCENARIO

Build one polished maternal/high-risk or chronic-care scenario.

Use ONLY clinically defensible demonstration rules.

Example structure:

```text
1. ASHA opens Setu

2. App is offline

3. Existing patient is opened

4. New observations are recorded

5. Triage engine evaluates data

6. Setu displays:

   HIGH-RISK INDICATORS DETECTED

7. Setu explains why

8. Medical Officer reviews

9. Medical Officer confirms escalation

10. CarePlan created

11. Referral created

12. Best capable facilities shown

13. Referral accepted

14. Teleconsultation performed

15. Specialist documents outcome

16. Counter-referral generated

17. Follow-up task created

18. ASHA later visits patient

19. Follow-up completed offline

20. App reconnects

21. Everything synchronizes

22. Patient timeline now shows the complete journey
```

This should be the flagship demo.

---

# 42. DO NOT ADD GENERIC AI CHAT

Explicitly reject implementation of:

```text
ChatGPT medical chatbot
AI doctor
symptom chatbot
generic RAG chatbot
```

unless there is a specific validated use case.

The platform's intelligence should first be:

```text
structured
explainable
auditable
deterministic
protocol-driven
```

---

# 43. DO NOT ADD BLOCKCHAIN

Do not introduce blockchain for:

* FHIR records
* referral tracking
* audit logs
* patient identity

It does not solve the core SIH problem.

---

# 44. DO NOT ADD CRYPTOGRAPHIC GIMMICKS

Do not introduce unnecessary:

* NFTs
* tokens
* cryptocurrency
* blockchain consensus
* decentralized storage

Focus on healthcare workflow.

---

# 45. DEMO-FIRST UX

The system must be understandable to a judge in under 30 seconds.

The home screen should communicate:

```text
TODAY

🔴 Emergency
🟠 High-risk patients
🔵 Pending referrals
🟡 Follow-ups due
🟢 Completed care
```

Then allow drill-down.

Do not make judges navigate five menus to understand the system.

---

# 46. THE "ONE PATIENT JOURNEY" PRINCIPLE

Every major module must connect to the same patient journey.

Do NOT create disconnected demos:

```text
Triage demo
Referral demo
Teleconsult demo
Dashboard demo
```

Instead:

```text
ONE PATIENT
     ↓
ONE LONGITUDINAL RECORD
     ↓
ONE CONTINUOUS CARE JOURNEY
```

Every screen should be showing another view of the same underlying FHIR data.

---

# 47. PRODUCTION ARCHITECTURE REVIEW

After implementation inspect:

* module boundaries
* circular dependencies
* duplicated business logic
* frontend/backend rule duplication
* FHIR reference consistency
* transaction boundaries
* sync semantics
* audit coverage
* error handling
* retry handling
* idempotency
* authorization

Refactor where necessary.

---

# 48. OBSERVABILITY

Add structured metrics:

```text
triage_evaluation_ms
risk_assessment_count
high_risk_count
referral_creation_latency
care_gap_count
followup_completion_rate
followup_overdue_count
```

Do not put PHI into metrics labels.

---

# 49. TESTING REQUIREMENT

Do NOT say:

> "The code is structured to pass."

Actually run tests.

At minimum:

### Backend

* unit tests
* service tests
* authorization tests
* FHIR validation tests
* rule engine tests
* care-gap tests

### Flutter

* repository tests
* offline tests
* sync tests
* triage tests
* localization tests

### E2E

Run:

```text
offline
→ triage
→ risk
→ care plan
→ referral
→ teleconsult
→ outcome
→ follow-up
→ sync
```

---

# 50. DEFINITION OF DONE

Phase 4 is complete ONLY when:

## Clinical Intelligence

* [ ] deterministic rule engine
* [ ] versioned rules
* [ ] rule provenance
* [ ] explainable results
* [ ] clinician confirmation
* [ ] clinician override
* [ ] FHIR-compatible risk representation
* [ ] no autonomous diagnosis

## High-Risk Care

* [ ] high-risk registry
* [ ] CarePlan
* [ ] follow-up Tasks
* [ ] prioritization
* [ ] overdue detection
* [ ] escalation
* [ ] missed follow-up handling

## Care Gaps

* [ ] referral gaps
* [ ] diagnostic gaps where data exists
* [ ] follow-up gaps
* [ ] SLA gaps
* [ ] gap resolution
* [ ] explainable priority

## Continuity

* [ ] longitudinal patient journey
* [ ] referral outcome
* [ ] counter-referral
* [ ] follow-up
* [ ] complete FHIR linkage

## Offline

* [ ] assessment offline
* [ ] care plan offline
* [ ] follow-up offline
* [ ] survives restart
* [ ] sync
* [ ] conflict handling

## Safety

* [ ] no autonomous diagnosis
* [ ] clinician confirmation
* [ ] rule versioning
* [ ] provenance
* [ ] audit
* [ ] secure local storage

## UX

* [ ] English
* [ ] Marathi foundation
* [ ] simple frontline workflow
* [ ] clear risk explanations
* [ ] care-gap dashboard
* [ ] one-patient journey

---

# 51. FINAL REPORT

After implementation produce:

## A. Phase 3 Forensic Audit

Do not simply say Phase 3 is correct.

List actual findings.

## B. Clinical Intelligence Architecture

Show:

```text
FHIR
 ↓
Rule Engine
 ↓
RiskAssessment
 ↓
Clinician Review
 ↓
CarePlan
```

## C. Rule Model

Show how rules are:

* stored
* versioned
* evaluated
* updated
* rolled back

## D. Safety Model

Explain how the system avoids autonomous diagnosis.

## E. High-Risk Workflow

Show:

```text
Risk
 ↓
Review
 ↓
CarePlan
 ↓
Follow-up
 ↓
Escalation
```

## F. Care Gap Engine

Explain how unresolved actions are detected.

## G. Offline Clinical Workflow

Explain how triage and follow-up continue without connectivity.

## H. FHIR Model

List every FHIR resource introduced and why.

## I. Security

Explain:

* authorization
* facility isolation
* audit
* offline encryption

## J. Tests

List ONLY tests that were actually executed.

Include:

```text
test
result
```

Do not fabricate passing results.

## K. Demo

Provide a precise 7–10 minute SIH demonstration.

The demo must tell ONE patient story.

## L. SIH Mapping

Create a table:

```text
SIH requirement
→ Setu feature
→ actual implementation
→ evidence/demo
```

Cover:

* accessibility
* continuity
* specialist shortage
* delayed referrals
* diagnostics
* medicine availability if currently implemented
* high-risk follow-up
* connectivity
* multilingual interaction
* emergency escalation
* interoperability
* accountability

Clearly mark unsupported features rather than pretending they exist.

## M. Remaining Risks

Be brutally honest.

## N. Phase 5 Recommendation

Do NOT automatically recommend analytics.

Inspect the actual implementation first and recommend the highest-impact remaining gap.

STOP.
