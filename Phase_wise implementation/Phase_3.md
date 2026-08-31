# SIH-26133 — PHASE 3 MASTER IMPLEMENTATION PROMPT

# CLOSED-LOOP REFERRAL + CARE CONTINUITY + REAL TELECONSULTATION

You are continuing development of **Setu**, the SIH-26133 healthcare platform.

Repository:

https://github.com/neelshingavi/SIH2026

Phase 0:

* exposed the prototype's fake offline/FHIR/teleconsult architecture.

Phase 1:

* implemented durable offline persistence and synchronization.

Phase 2:

* implemented authentication
* RBAC
* facility scoping
* canonical FHIR persistence through HAPI FHIR
* longitudinal patient records
* audit logging
* secure sync

Now build the most important patient-flow capability:

# CLOSED-LOOP REFERRAL AND CARE CONTINUITY

Do NOT treat this as:

"add a referral page."

Build a complete referral lifecycle that ensures a patient does not disappear between healthcare facilities.

The SIH problem specifically identifies:

* delayed referrals
* fragmented records
* specialist shortages
* patients moving across levels of public healthcare
* limited connectivity
* need for continuity
* emergency escalation
* teleconsultation
* reduced travel and waiting time
* improved referral completion

The implementation must directly address those problems.

---

# 0. FIRST — AUDIT PHASE 2

Before writing code:

Inspect the actual Phase 2 implementation.

Verify:

* authentication
* JWT
* RBAC
* FacilityScopeGuard
* FHIR service
* HAPI FHIR integration
* Patient
* Encounter
* Observation
* Condition
* Organization
* Practitioner
* PractitionerRole
* Location
* Provenance
* AuditEvent
* sync authentication
* patient timeline

Do not trust the Phase 2 report.

Find anything incomplete.

Fix blocking defects before implementing referrals.

---

# 1. DESIGN THE REFERRAL DOMAIN CORRECTLY

Do NOT create:

```text
ReferralEntity
ReferralTable
ReferralStatus enum in Postgres
```

as the canonical clinical record.

Use FHIR resources.

The core referral model should be:

```text
ServiceRequest
      +
Task
      +
Encounter
      +
Patient
      +
Practitioner / PractitionerRole
      +
Organization / Location
```

FHIR `ServiceRequest` represents a request for a healthcare service, including referral/transfer-of-care scenarios. `Task` is appropriate for tracking the execution/fulfillment workflow around that request.

Reference:

https://hl7.org/fhir/R4/servicerequest.html

Do not misuse `Task` as a replacement for the clinical request itself.

---

# 2. REFERRAL RESOURCE MODEL

A referral should conceptually contain:

```text
ServiceRequest
├── id
├── status
├── intent
├── priority
├── category
├── code
├── subject → Patient
├── encounter → Encounter
├── requester → PractitionerRole
├── performer → receiving organization/facility
├── authoredOn
├── occurrence
├── reasonReference / reasonCode
├── supportingInfo
└── note
```

And a corresponding:

```text
Task
├── id
├── status
├── intent
├── priority
├── code
├── focus → ServiceRequest
├── for → Patient
├── requester
├── owner
├── location
├── authoredOn
├── lastModified
├── restriction
└── output
```

Use valid FHIR references.

Do not create custom JSON fields where FHIR already provides a suitable element.

---

# 3. REFERRAL STATE MACHINE

Design an explicit state machine.

Do NOT allow arbitrary frontend status strings.

Use states appropriate to the workflow.

For example:

```text
DRAFT
  ↓
ACTIVE
  ↓
ACCEPTED
  ↓
SCHEDULED
  ↓
IN_PROGRESS
  ↓
COMPLETED
```

with exceptional paths:

```text
ACTIVE
  ↓
REJECTED

ACCEPTED
  ↓
CANCELLED

SCHEDULED
  ↓
NO_SHOW

ACTIVE
  ↓
ESCALATED
```

The exact mapping must respect FHIR semantics.

Do not invent states that cannot be represented safely.

Where Setu needs application-specific workflow states, use appropriate FHIR extensions or a separate workflow projection rather than corrupting standard fields.

---

# 4. REFERRAL STATE TRANSITIONS MUST BE SERVER-ENFORCED

The frontend must NOT be able to send:

```text
status = COMPLETED
```

and magically complete a referral.

Implement transition validation.

For example:

```text
ACTIVE → ACCEPTED
```

may be performed by an authorized receiving facility.

But:

```text
ACTIVE → COMPLETED
```

should not be allowed without appropriate fulfillment evidence.

Every transition should have:

* authenticated actor
* role
* facility
* timestamp
* previous state
* new state
* reason where required
* audit event

---

# 5. REFERRAL CREATION FLOW

Implement:

```text
Frontline worker / Medical Officer
            ↓
Patient selected
            ↓
Current encounter selected
            ↓
Clinical reason
            ↓
Urgency
            ↓
Required specialty/service
            ↓
Destination selection
            ↓
Referral created
```

The destination should NOT be a hardcoded:

```text
"District Hospital"
```

string.

Use real FHIR Organization/Location/HealthcareService data.

---

# 6. FACILITY CAPABILITY MODEL

A major improvement over a basic referral system:

The system should know:

```text
What can this facility actually provide?
```

Model capabilities such as:

```text
Cardiology
Obstetrics
Pediatrics
General Medicine
Radiology
Ultrasound
Laboratory
Emergency care
Blood storage
Surgery
Teleconsultation
```

Use appropriate FHIR concepts where possible, such as:

* HealthcareService
* Location
* Organization
* PractitionerRole

Do not hardcode facility capabilities in frontend code.

---

# 7. INTELLIGENT DESTINATION SELECTION

When creating a referral, calculate candidate facilities.

Consider:

```text
clinical service required
+
facility capability
+
distance
+
current availability
+
queue/load
+
emergency capability
+
teleconsult availability
```

Do NOT implement a black-box AI recommendation.

Instead build an explainable routing score.

Example:

```text
Recommended facility

Rural Hospital A

✓ Obstetrics available
✓ Ultrasound available
✓ Teleconsult backup available
✓ Current queue: 4 patients
✓ Estimated travel: 18 km
✓ Emergency service available
```

The medical officer must remain in control.

Never automatically route a critically ill patient based solely on a numerical score.

---

# 8. EMERGENCY ESCALATION

This is critical.

If triage indicates emergency/high-risk conditions, the referral workflow should change.

Conceptually:

```text
NORMAL
→ standard referral

URGENT
→ priority referral

EMERGENCY
→ immediate escalation
```

For emergency cases:

* highlight emergency status
* prioritize destination
* avoid normal queue delays
* trigger facility notification
* show transport/escalation information where available
* create audit event
* preserve clinical context

Do not let the application pretend to dispatch an ambulance unless an actual integration exists.

If transport integration is unavailable, clearly show:

```text
Transport integration unavailable
Contact emergency service / facility
```

rather than faking it.

---

# 9. REFERRAL PACKET

A receiving clinician should NOT have to reconstruct the patient's history manually.

Generate a concise referral context from actual FHIR resources.

Example:

```text
REFERRAL SUMMARY

Patient
Age / Sex

Reason for referral
Urgency

Current encounter
Symptoms

Recent vitals
BP
Pulse
SpO2
Temperature

Relevant conditions

Current medications

Relevant investigations

Triage result

Reason for referral

Referring practitioner
Referring facility

Created
Timestamp
```

This should be generated from FHIR resources.

Do NOT duplicate the entire patient record into a proprietary referral table.

---

# 10. REFERRAL CONTEXT BUNDLE

Where useful, generate a FHIR Bundle containing the relevant resources.

For example:

```text
Bundle
├── Patient
├── Encounter
├── Observation(s)
├── Condition(s)
├── MedicationRequest(s)
├── DiagnosticReport(s)
├── ServiceRequest
└── Task
```

Do not include every historical resource blindly.

The receiving clinician should receive the clinically relevant context.

---

# 11. OFFLINE REFERRAL CREATION

This must work offline.

Scenario:

```text
No internet
   ↓
ASHA/ANM creates referral
   ↓
ServiceRequest created locally
   ↓
Task created locally
   ↓
Referral appears in local queue
   ↓
App closed
   ↓
App reopened
   ↓
Referral still exists
   ↓
Connectivity restored
   ↓
Referral synchronized
```

The referral must use the Phase 1 sync infrastructure.

Do not create a separate referral sync mechanism.

---

# 12. OFFLINE REFERRAL CONFLICTS

If a referral is modified by two facilities:

```text
Facility A
→ ACCEPTED

Facility B
→ CANCELLED
```

the system must detect incompatible transitions.

Do not silently overwrite.

Use the existing versioning/conflict system.

---

# 13. REFERRAL SLA ENGINE

This should become one of Setu's strongest features.

Calculate referral timing:

```text
created
accepted
scheduled
started
completed
```

Measure:

```text
time_to_accept
time_to_schedule
time_to_consult
time_to_completion
```

Do NOT hardcode a single universal SLA.

SLA should be configurable by:

* urgency
* referral type
* facility
* clinical program

For example:

```text
Emergency
→ immediate

Urgent
→ configurable short window

Routine
→ configurable window
```

Do not invent clinical thresholds.

The SLA system measures operational performance.

---

# 14. SLA BREACH DETECTION

If a referral exceeds its configured operational SLA:

```text
ACTIVE
   ↓
SLA WARNING
   ↓
SLA BREACHED
```

Generate:

* notification
* dashboard indicator
* audit event
* escalation where configured

Do not silently mark the referral as failed.

---

# 15. ESCALATION CHAIN

Create configurable escalation:

```text
Receiving facility
       ↓
Facility supervisor
       ↓
District coordinator
```

Only escalate according to configured rules.

Do not spam users.

---

# 16. REFERRAL DASHBOARD

Build separate views.

### Referring Facility

Show:

```text
My referrals
Pending acceptance
Accepted
Scheduled
Completed
SLA at risk
SLA breached
```

### Receiving Facility

Show:

```text
New referrals
Urgent referrals
Emergency referrals
Waiting acceptance
Today's scheduled referrals
Overdue referrals
```

### District

Show:

```text
Referral volume
Acceptance rate
Completion rate
Average acceptance time
Average completion time
SLA breach rate
Facility comparison
```

These metrics must be derived from actual FHIR resources.

Do not use hardcoded dashboard numbers.

---

# 17. REFERRAL SEARCH

Implement server-side filtering.

Support:

* patient
* source facility
* destination facility
* status
* priority
* date
* service/specialty
* SLA state

Do not download every referral to the browser and filter in JavaScript.

---

# 18. TELECONSULTATION — DO NOT BUILD A STANDALONE VIDEO APP

Teleconsultation is a mechanism to fulfill a clinical need.

It should be linked to the referral workflow.

Conceptually:

```text
ServiceRequest
      ↓
Task
      ↓
Teleconsultation requested
      ↓
Appointment / session
      ↓
LiveKit room
      ↓
Consultation
      ↓
Encounter / clinical documentation
      ↓
Task completed
```

Do not create:

```text
Teleconsult(id, patientId, roomId...)
```

as the canonical clinical record.

Use FHIR resources for the clinical workflow.

Infrastructure metadata such as LiveKit room/session IDs may live in a non-clinical operational store if necessary.

---

# 19. LIVEKIT ARCHITECTURE

Implement actual LiveKit WebRTC.

The browser/mobile client must NOT contain a LiveKit API secret.

Architecture:

```text
Client
   ↓
NestJS
   ↓
Authenticated token generation
   ↓
LiveKit
   ↓
WebRTC
```

The server generates room access tokens.

The client receives a short-lived token.

Do not expose LiveKit API credentials in:

* Flutter
* Next.js client bundles
* Git
* environment variables exposed to browser code

---

# 20. TELECONSULT ROOM SECURITY

A room must be scoped to a specific consultation.

Conceptually:

```text
consultation ID
      ↓
room ID
```

Only authorized participants can join.

Verify:

* user identity
* role
* referral
* facility
* patient
* consultation state

A user must not be able to change a room name in the URL and join another patient's consultation.

---

# 21. TELECONSULT ROLES

Support:

```text
PATIENT/FIELD WORKER
MEDICAL OFFICER
SPECIALIST
```

The exact role model should align with Phase 2.

The specialist should see:

* patient identity
* referral reason
* relevant observations
* conditions
* medications
* diagnostics
* referral history

before joining or during the consultation.

---

# 22. TELECONSULT WAITING ROOM

Build a real waiting room.

Show:

```text
Patient
Reason
Urgency
Referring facility
Wait time
Specialty
```

For specialist:

```text
Waiting
In consultation
Completed
```

Do not use static images.

No fake "video connected" state.

---

# 23. TELECONSULT CONNECTION STATES

Handle:

```text
CONNECTING
CONNECTED
RECONNECTING
DISCONNECTED
FAILED
COMPLETED
```

The UI must communicate these clearly.

Network loss must not corrupt the referral state.

---

# 24. TELECONSULTATION SESSION RECORD

Do not store clinical consultation content in LiveKit.

LiveKit provides communication infrastructure.

Clinical documentation should become FHIR resources.

For example:

```text
Encounter
    ↓
specialist consultation
    ↓
Observation / Condition / MedicationRequest / CarePlan
```

The exact resources should reflect what was actually documented.

---

# 25. CONSULTATION COMPLETION

The specialist should be able to:

* document assessment
* add clinical notes where appropriate
* create/update relevant clinical resources
* recommend follow-up
* recommend diagnostics
* recommend medication
* recommend in-person escalation
* complete consultation

The referral Task should only transition to completion when the appropriate workflow has been fulfilled.

Do not mark completion simply because the video call ended.

---

# 26. MISSED TELECONSULTATION

Support:

```text
NO_SHOW
CANCELLED
FAILED_CONNECTION
RESCHEDULE_REQUIRED
```

A failed WebRTC connection should NOT equal:

```text
clinical referral completed
```

---

# 27. TELECONSULT FALLBACK

This is extremely important for rural environments.

If:

```text
WebRTC unavailable
```

the workflow should not simply crash.

Show:

```text
Connection unavailable.
Continue referral workflow.
```

Allow:

* reschedule
* in-person referral
* alternative consultation mechanism if actually integrated

Do not fake fallback communication.

---

# 28. PATIENT CONTINUITY AFTER REFERRAL

When a referral is completed:

The originating facility must be able to see:

```text
Referral completed
       ↓
Specialist outcome
       ↓
New clinical findings
       ↓
Recommendations
       ↓
Follow-up plan
```

This is the "closed loop."

A referral is NOT complete merely because:

```text
destination accepted
```

It is complete when the required care/consultation is documented.

---

# 29. COUNTER-REFERRAL

Implement a return-to-origin workflow.

Example:

```text
PHC
 ↓
Rural Hospital
 ↓
Specialist
 ↓
Outcome
 ↓
Follow-up plan
 ↓
PHC
```

The originating provider should receive a structured outcome.

Use appropriate FHIR resources/references.

Do not create a proprietary "counterReferral" object if FHIR already supports the workflow.

---

# 30. FOLLOW-UP PLAN

A completed referral should be able to create a follow-up plan.

Potential resources:

```text
CarePlan
Appointment
Task
ServiceRequest
```

Use the correct resource for the specific workflow.

The system should show:

```text
Follow-up required
Due:
Assigned facility:
Responsible practitioner:
Status:
```

Do not create fake reminders that aren't persisted.

---

# 31. REFERRAL NOTIFICATIONS

Implement an internal notification abstraction.

Examples:

```text
New urgent referral
Referral accepted
Appointment scheduled
SLA at risk
SLA breached
Teleconsult ready
Referral completed
Counter-referral received
```

Do not claim SMS/WhatsApp integration unless actually implemented.

For now, an in-app notification system is sufficient.

---

# 32. CLINICAL SAFETY

Do not automatically decide:

```text
best hospital
best treatment
diagnosis
```

The platform provides operational decision support.

Clinical decisions remain with qualified healthcare professionals.

Every high-risk workflow should preserve:

```text
who made decision
when
where
why
```

---

# 33. AUDITABILITY

Audit:

```text
REFERRAL_CREATED
REFERRAL_ACCEPTED
REFERRAL_REJECTED
REFERRAL_SCHEDULED
REFERRAL_ESCALATED
REFERRAL_COMPLETED
REFERRAL_CANCELLED
TELECONSULT_REQUESTED
TELECONSULT_JOINED
TELECONSULT_COMPLETED
TELECONSULT_FAILED
COUNTER_REFERRAL_CREATED
FOLLOWUP_CREATED
```

Never log the actual video/audio content.

---

# 34. TELECONSULT PRIVACY

Do not record consultations by default.

Do not persist audio/video.

Do not capture screenshots.

If recording is ever implemented later, it requires a separate consent/privacy design.

For this phase:

```text
NO RECORDING
```

---

# 35. REAL-TIME EVENTS

Where appropriate, use WebSockets/SSE for:

```text
new referral
status change
teleconsult invitation
SLA alert
queue update
```

Do not make the entire application dependent on a WebSocket connection.

If real-time connectivity is unavailable:

```text
poll / refresh
```

should still work.

---

# 36. REFERRAL + OFFLINE + AUTHENTICATION

Test the combined system.

Scenario:

```text
Authenticated ASHA
       ↓
Offline
       ↓
Creates patient
       ↓
Creates encounter
       ↓
Creates urgent referral
       ↓
Kills app
       ↓
Reopens
       ↓
All data survives
       ↓
Network restored
       ↓
Authenticated sync
       ↓
HAPI FHIR
       ↓
Receiving facility
       ↓
Accepts referral
```

This is mandatory.

---

# 37. TELECONSULT END-TO-END DEMO

Build this exact scenario:

```text
1. ASHA/ANM creates patient
2. Capture clinical observations
3. Triage indicates high-risk
4. Medical Officer reviews
5. Medical Officer creates referral
6. System recommends capable facilities
7. Receiving facility accepts
8. Specialist is available
9. Teleconsultation is requested
10. Specialist receives patient context
11. Specialist joins LiveKit room
12. Medical Officer joins
13. Real video/audio connection established
14. Specialist documents consultation
15. Consultation ends
16. Clinical outcome is saved as FHIR
17. Referral becomes completed
18. Originating PHC receives counter-referral
19. Follow-up is created
20. District dashboard reflects completed referral
```

Every step must use real data.

No fake static image.

No mock referral status.

No hardcoded dashboard numbers.

---

# 38. FAILURE DEMONSTRATION

Also test:

### Network failure during referral creation

Referral must remain locally safe.

### Network failure during teleconsultation

Clinical referral must not be marked completed.

### Specialist rejects referral

Origin facility must see the reason.

### Specialist unavailable

System must provide rescheduling/escalation.

### Destination facility unavailable

System must show alternatives if supported.

### Duplicate retry

No duplicate referral.

### Concurrent update

Conflict must be detected.

---

# 39. PERFORMANCE

Measure:

* referral creation latency
* referral list latency
* patient context loading
* FHIR bundle generation
* teleconsult token generation
* LiveKit connection time

Do not prematurely optimize.

But identify obvious N+1 FHIR requests.

---

# 40. NO FAKE DATA

Remove from production paths:

* static referral lists
* hardcoded referral statuses
* Unsplash video image
* mock teleconsult records
* hardcoded facility capabilities
* hardcoded queue counts
* hardcoded district metrics

Synthetic seed data is allowed only as explicit development/test data.

---

# 41. TEST SUITE

Create actual automated tests.

### Referral

* create referral
* invalid transition
* authorized acceptance
* unauthorized acceptance
* cross-facility access
* duplicate creation
* cancellation
* completion
* SLA calculation
* SLA breach

### FHIR

* valid ServiceRequest
* valid Task
* valid references
* invalid resource rejection

### Offline

* create referral offline
* restart
* sync
* duplicate retry
* conflict

### Teleconsult

* unauthorized token generation
* authorized token generation
* wrong room access denied
* expired token
* consultation completion
* failed connection does not complete referral

### Security

* 401
* 403
* IDOR
* facility isolation

Actually RUN the tests.

Do not say "structured to pass."

---

# 42. DOCUMENT THE DOMAIN MODEL

Create documentation showing:

```text
Patient
   │
   ├── Encounter
   │
   ├── Observation
   │
   ├── Condition
   │
   ├── ServiceRequest
   │        │
   │        ↓
   │       Task
   │        │
   │        ↓
   │   Teleconsultation
   │        │
   │        ↓
   │    Encounter
   │        │
   │        ↓
   │    CarePlan
   │
   └── Follow-up
```

Explain why each resource exists.

---

# 43. DEFINITION OF DONE

Phase 3 is complete ONLY if:

### Referral

* [ ] ServiceRequest implemented
* [ ] Task implemented
* [ ] real FHIR references
* [ ] state machine
* [ ] server-side transitions
* [ ] source/destination facility
* [ ] urgency
* [ ] referral packet
* [ ] acceptance
* [ ] scheduling
* [ ] completion
* [ ] rejection
* [ ] cancellation
* [ ] SLA
* [ ] escalation
* [ ] counter-referral
* [ ] follow-up

### Offline

* [ ] referral creation works offline
* [ ] survives restart
* [ ] syncs
* [ ] conflict detection works

### Teleconsult

* [ ] real LiveKit
* [ ] secure server token
* [ ] authenticated room
* [ ] role-based access
* [ ] waiting room
* [ ] connection states
* [ ] specialist context
* [ ] consultation documentation
* [ ] completion workflow
* [ ] no fake video
* [ ] no recording

### Security

* [ ] facility isolation
* [ ] authorization
* [ ] audit
* [ ] room authorization

### Continuity

* [ ] originating facility sees outcome
* [ ] counter-referral
* [ ] follow-up
* [ ] actual longitudinal record

### Dashboard

* [ ] real referral data
* [ ] SLA metrics
* [ ] completion metrics
* [ ] no hardcoded numbers

---

# 44. FINAL REPORT

After implementation provide:

## A. Phase 2 Audit

What was actually verified/found.

## B. Referral Architecture

Show ServiceRequest + Task + supporting resources.

## C. State Machine

Show all transitions.

## D. Facility Routing

Explain capability-based destination selection.

## E. SLA Engine

Explain timing and escalation.

## F. Teleconsult Architecture

Explain:

Client → NestJS → LiveKit → WebRTC.

## G. Security Model

Explain referral authorization and room access.

## H. Offline Behavior

Explain how referrals synchronize.

## I. Closed-Loop Workflow

Show:

Referral created
→ accepted
→ fulfilled
→ outcome
→ counter-referral
→ follow-up.

## J. Tests

List ACTUALLY EXECUTED tests and results.

Do not claim tests passed if they were not run.

## K. Demo

Give exact 5–10 minute SIH demonstration procedure.

## L. Remaining Risks

Be brutally honest.

## M. Phase 4 Recommendation

Recommend the next phase based on actual implementation.

STOP.

Do not begin Phase 4 automatically.
