# SIH-26133 — PHASE 7 MASTER PROMPT

# ABDM INTEGRATION + CONSENT + HEALTH INFORMATION EXCHANGE + INTEROPERABILITY

Repository:

https://github.com/neelshingavi/SIH2026

---

# CORE OBJECTIVE

Phase 7 must transform Setu from a technically strong FHIR application into an interoperable digital-health platform.

Do NOT add superficial ABDM buttons.

Do NOT create fake ABDM APIs.

Do NOT create a mock ABHA number and call it integration.

Do NOT claim ABDM compliance unless the implementation actually follows the relevant specifications.

The goal is:

```text
Rural Frontline Worker
        ↓
Setu
        ↓
FHIR Clinical Record
        ↓
Consent / Authorization
        ↓
Health Information Exchange
        ↓
ABDM-compatible ecosystem
```

The architecture must remain functional even when external ABDM infrastructure is unavailable.

---

# PHASE 0 — FORENSIC AUDIT BEFORE CODING

Inspect the entire repository again.

Verify the current implementation of:

```text
Authentication
RBAC
Facility scoping
FHIR
HAPI FHIR
Sync
Offline storage
Care pathways
Referral
Diagnostics
Medication
Inventory
Teleconsultation
AuditEvent
Analytics
Notifications
```

Search globally for:

```text
mock
fake
dummy
hardcoded
placeholder
ABDM
ABHA
consent
health_id
healthId
HIU
HIP
HIE
FHIR
```

Do not assume previous phase reports are correct.

Produce:

```text
PHASE_7_PRE_AUDIT.md
```

---

# PHASE 1 — ABDM CONCEPTUAL MODEL

Before writing code, document the mapping between Setu and ABDM concepts.

Create:

```text
ABDM_ARCHITECTURE.md
```

Explain:

```text
Setu Frontline App
        ↓
Setu Gateway
        ↓
FHIR / HAPI
        ↓
ABDM-compatible exchange layer
```

Map relevant concepts carefully.

For example:

```text
Patient identity
Clinical records
Consent
Health information provider
Health information user
Health information exchange
Health record sharing
Audit
```

Do NOT invent terminology.

If an ABDM component cannot realistically be implemented locally, explicitly mark it:

```text
EXTERNAL DEPENDENCY
```

---

# PHASE 2 — ABHA / PATIENT IDENTITY MODEL

Separate these concepts:

```text
Internal Setu Patient UUID
FHIR Patient.id
ABHA identifier
Local facility identifier
Other identifiers
```

Never use ABHA as the primary database key.

The canonical internal model should support:

```text
Patient
 ├── Setu UUID
 ├── FHIR ID
 ├── ABHA identifier (optional)
 └── facility identifiers
```

Support patients who:

```text
have ABHA
do not have ABHA
cannot be verified immediately
are offline
```

---

# PHASE 3 — IDENTITY LINKING

Build a safe identity-linking workflow.

Example:

```text
ASHA creates patient offline
        ↓
Temporary Setu identity
        ↓
Connectivity restored
        ↓
Identity matching
        ↓
Possible ABHA linkage
```

Do not automatically merge patients based only on:

```text
name
phone number
```

Use:

```text
POSSIBLE MATCH
```

when confidence is insufficient.

---

# PHASE 4 — PATIENT IDENTITY UX

The frontline worker should clearly see:

```text
Setu Patient ID
ABHA linked / not linked
Identity verification state
```

Avoid exposing unnecessary identifiers.

Example:

```text
Jane Doe

Setu ID:
SETU-8F2A...

ABHA:
Linked

Identity:
Verified
```

For an unlinked patient:

```text
ABHA:
Not linked

Offline identity:
Verified locally
```

---

# PHASE 5 — CONSENT ARCHITECTURE

This is one of the most important components.

Design an explicit consent model.

Create:

```text
CONSENT_MODEL.md
```

Consent must represent:

```text
who
gave consent
for whom
what data
for what purpose
with whom
duration
createdAt
expiresAt
status
```

Where applicable, represent consent using FHIR `Consent`.

---

# PHASE 6 — CONSENT STATES

Support:

```text
REQUESTED
ACTIVE
REJECTED
REVOKED
EXPIRED
```

Never treat:

```text
login
```

as:

```text
clinical data sharing consent
```

These are different concepts.

---

# PHASE 7 — HUMAN CONSENT UX

Build a simple frontline consent workflow.

The ASHA should see:

```text
WHY IS DATA BEING SHARED?

Specialist consultation

WHAT WILL BE SHARED?

Clinical summary
Recent observations
Relevant reports

WHO WILL RECEIVE IT?

District Specialist Facility

HOW LONG?

Until consultation is completed
```

Then:

```text
ALLOW
DECLINE
```

---

# PHASE 8 — OFFLINE CONSENT

The consent workflow must work when offline where legally and operationally appropriate.

However:

```text
offline consent
```

must NOT pretend to be:

```text
central ABDM consent approval
```

Store:

```text
local consent event
timestamp
worker
patient
purpose
scope
```

Then synchronize when connectivity returns.

Clearly distinguish:

```text
LOCAL CONSENT RECORDED
```

from:

```text
CENTRAL CONSENT VERIFIED
```

---

# PHASE 9 — CONSENT REVOCATION

Implement:

```text
REVOKE SHARING
```

If consent is revoked:

```text
future sharing
```

must stop.

Do not silently delete historical clinical records.

Record:

```text
Consent status
Revocation time
Actor
Purpose
Audit event
```

---

# PHASE 10 — FHIR CONSENT RESOURCE

Where applicable, represent consent as:

```text
FHIR Consent
```

and link it appropriately to:

```text
Patient
CarePlan
ServiceRequest
Task
DiagnosticReport
```

Do not create arbitrary proprietary JSON when an appropriate FHIR representation exists.

---

# PHASE 11 — HEALTH INFORMATION EXCHANGE

Build an internal abstraction:

```text
HealthInformationExchangeService
```

Responsibilities:

```text
requestRecord
prepareRecord
checkConsent
authorize
export
import
audit
```

The service must not tightly couple the application to a single external provider.

---

# PHASE 12 — RECORD SHARING

Implement a complete workflow:

```text
Patient selected
        ↓
Consent checked
        ↓
Relevant clinical resources selected
        ↓
FHIR Bundle generated
        ↓
Bundle validated
        ↓
Recipient authorized
        ↓
Bundle transmitted
        ↓
AuditEvent recorded
```

---

# PHASE 13 — CLINICAL SUMMARY

Do not blindly share:

```text
$everything
```

for every use case.

Create a clinically relevant summary.

For referral:

```text
Patient
Relevant Conditions
Recent Vitals
RiskAssessment
Active CarePlan
ServiceRequest
Relevant DiagnosticReports
MedicationRequests
MedicationDispenses
```

Avoid unnecessary PHI.

---

# PHASE 14 — FHIR BUNDLE

Generate standards-compliant FHIR Bundles.

Support:

```text
Bundle.type = document
```

or another appropriate Bundle type depending on the actual workflow.

Ensure references are internally consistent.

Validate:

```text
Patient
Composition where required
Observations
Conditions
MedicationRequests
DiagnosticReports
CarePlan
ServiceRequest
```

---

# PHASE 15 — REFERRAL → HEALTH RECORD EXCHANGE

Connect the existing referral workflow to the exchange layer.

Current:

```text
ServiceRequest
↓
Task
↓
Specialist
```

Enhance:

```text
ServiceRequest
↓
Consent
↓
Clinical Summary
↓
Secure Exchange
↓
Receiving Facility
```

The receiving facility should receive enough context to safely act.

---

# PHASE 16 — DIAGNOSTIC RECORD EXCHANGE

Implement:

```text
DiagnosticReport
+
relevant Observations
+
Specimen where applicable
```

in the clinical exchange workflow.

Avoid sending unrelated patient history.

---

# PHASE 17 — MEDICATION RECORD EXCHANGE

Support exchange of:

```text
MedicationRequest
MedicationDispense
MedicationStatement / appropriate equivalent
```

where clinically appropriate.

Do not expose unrelated medication history unnecessarily.

---

# PHASE 18 — CONSENT-AWARE PATIENT TIMELINE

The timeline should distinguish:

```text
LOCAL RECORD
SHARED RECORD
IMPORTED RECORD
```

Example:

```text
Today
Emergency Risk
Source: Setu PHC

Yesterday
Diagnostic Report
Source: District Hospital

Last Week
Medication Dispensed
Source: PHC Pharmacy
```

---

# PHASE 19 — EXTERNAL RECORD IMPORT

Build an import abstraction.

External FHIR data should pass through:

```text
Validation
↓
Identity resolution
↓
Consent verification
↓
Reference validation
↓
Deduplication
↓
Local cache
↓
Timeline
```

Do not blindly insert external resources.

---

# PHASE 20 — EXTERNAL RECORD DEDUPLICATION

Detect:

```text
same Patient
same Observation
same DiagnosticReport
same MedicationRequest
```

using stable identifiers and references.

Never duplicate an imported clinical event every time synchronization runs.

---

# PHASE 21 — PROVENANCE

Every imported/shared clinical resource should preserve provenance where appropriate.

Track:

```text
source organization
source system
source timestamp
actor
transformation
```

Use FHIR `Provenance` where appropriate.

---

# PHASE 22 — AUDIT EVERYTHING

Audit:

```text
consent requested
consent granted
consent rejected
consent revoked

record requested
record exported
record imported

identity linked
identity unlinked

external exchange succeeded
external exchange failed
```

Never log sensitive payloads unnecessarily.

---

# PHASE 23 — SECURITY BOUNDARY

Create explicit authorization rules:

```text
Can ASHA view?
Can ASHA share?
Can MO view?
Can specialist view?
Can district admin view?
```

Authorization must depend on:

```text
role
facility
patient relationship
purpose
consent
```

not simply:

```text
JWT is valid
```

---

# PHASE 24 — PURPOSE-BASED ACCESS

Where practical, introduce:

```text
purposeOfUse
```

Examples:

```text
TREATMENT
REFERRAL
DIAGNOSTIC_REVIEW
FOLLOW_UP
EMERGENCY
```

A user's access should be explainable.

---

# PHASE 25 — BREAK-GLASS EMERGENCY ACCESS

Design an emergency override.

Example:

```text
Emergency patient
+
consent unavailable
```

may permit tightly controlled emergency access where appropriate.

But require:

```text
reason
actor
timestamp
patient
resources accessed
```

and generate a high-severity audit event.

Never create a silent bypass.

---

# PHASE 26 — BREAK-GLASS DASHBOARD

Administrators should be able to audit:

```text
Emergency override
Actor
Patient
Reason
Time
Facility
Resources accessed
```

---

# PHASE 27 — DATA MINIMIZATION

Audit every exchange.

For each resource ask:

```text
Is this required for this purpose?
```

If no:

```text
do not share
```

This should be reflected in the code, not merely documentation.

---

# PHASE 28 — CONSENT + OFFLINE CONFLICT

Test:

```text
Device offline:
CONSENT = ACTIVE

Server:
CONSENT = REVOKED
```

When reconnecting:

```text
server consent wins
```

and future sharing must stop.

Do not silently overwrite server consent state.

---

# PHASE 29 — EXCHANGE FAILURE

Simulate:

```text
external exchange unavailable
timeout
invalid response
consent revoked during exchange
FHIR validation failure
recipient unavailable
```

The system must preserve the local clinical workflow.

---

# PHASE 30 — OUTBOX FOR HEALTH INFORMATION EXCHANGE

Do not perform fragile network operations directly from the UI.

Use:

```text
Exchange Queue
```

with:

```text
PENDING
PROCESSING
COMPLETED
FAILED
REQUIRES_REVIEW
```

Support retry and idempotency.

---

# PHASE 31 — IDEMPOTENCY

Every exchange operation must have:

```text
exchangeId
requestId
idempotencyKey
```

Retrying the same exchange must not create duplicate clinical records.

---

# PHASE 32 — EXCHANGE RECEIPT

After successful sharing, provide:

```text
SHARED SUCCESSFULLY

Recipient:
District Hospital

Purpose:
Specialist consultation

Records:
6

Time:
10:32 IST

Reference:
EX-83F...
```

Do not expose unnecessary identifiers.

---

# PHASE 33 — PATIENT-CENTRIC RECORD ACCESS

Build a unified patient view:

```text
Setu records
+
imported records
+
shared records
```

Clearly identify the source.

---

# PHASE 34 — CROSS-FACILITY CONTINUITY

Demonstrate:

```text
Village Sub-Centre
        ↓
PHC
        ↓
District Hospital
        ↓
Specialist
        ↓
Diagnostic Centre
        ↓
Pharmacy
        ↓
Village follow-up
```

with the same patient's clinical journey remaining linked.

---

# PHASE 35 — STATE MACHINE INTEGRATION

Connect the exchange layer with the existing care pathway.

Example:

```text
ASSESSMENT_PENDING
↓
RISK_IDENTIFIED
↓
ESCALATION_REQUIRED
↓
REFERRAL_CREATED
↓
CONSENT_OBTAINED
↓
RECORD_SHARED
↓
REFERRAL_ACCEPTED
↓
TELECONSULT
↓
DIAGNOSTIC_REQUESTED
↓
RESULT_AVAILABLE
↓
TREATMENT_STARTED
↓
FOLLOW_UP_DUE
↓
FOLLOW_UP_COMPLETED
```

This becomes the flagship Setu care pathway.

---

# PHASE 36 — CARE GAP FROM DATA EXCHANGE

Create gaps for:

```text
CONSENT_PENDING
RECORD_SHARE_FAILED
REFERRAL_RECEIPT_NOT_CONFIRMED
EXTERNAL_RESULT_NOT_REVIEWED
```

Each must have:

```text
owner
SLA
evidence
resolution
audit
```

---

# PHASE 37 — DASHBOARD

Add interoperability metrics:

```text
Records Shared
Records Received
Exchange Success Rate
Exchange Failure Rate
Consent Approval Rate
Consent Revocation Rate
External Results Pending Review
Cross-Facility Referral Completion
```

Every metric must come from real data.

---

# PHASE 38 — DISTRICT ADMIN VIEW

Create:

```text
District Interoperability Dashboard
```

Show:

```text
Facilities Connected
Active Referrals
Pending Exchanges
Failed Exchanges
Pending Consent
Unreviewed Results
```

Never expose patient-level PHI in aggregate dashboards unless explicitly required.

---

# PHASE 39 — FACILITY CONNECTIVITY MAP

If geographic facility data exists, visualize:

```text
Village
Sub-centre
PHC
CHC
District Hospital
Diagnostic Centre
Pharmacy
```

and show:

```text
referral flow
queue
capability
connectivity
```

Use actual facility data.

No random coordinates.

---

# PHASE 40 — LOW-CONNECTIVITY OPTIMIZATION

Health information exchange must be optimized for rural connectivity.

Support:

```text
small payloads
compression where appropriate
resume/retry
background transmission
priority queues
```

Emergency clinical data must receive highest transmission priority.

---

# PHASE 41 — EMERGENCY PRIORITY

The exchange queue should prioritize:

```text
EMERGENCY
STAT
URGENT
ROUTINE
```

Example:

```text
10 routine records pending
+
1 emergency referral
```

Emergency referral must transmit first when connectivity returns.

---

# PHASE 42 — BANDWIDTH-AWARE MODE

If connectivity is poor:

Prioritize:

```text
Patient identity
Emergency observations
RiskAssessment
ServiceRequest
Task
```

Defer:

```text
large attachments
historical records
non-critical analytics
```

---

# PHASE 43 — ATTACHMENT STRATEGY

If reports/images/documents are supported:

Do NOT place large binary payloads directly inside FHIR JSON.

Design appropriate:

```text
Binary
DocumentReference
external object storage
metadata
```

architecture.

---

# PHASE 44 — INTEROPERABILITY TEST SERVER

Create a local test environment.

Prefer Docker Compose.

Example:

```text
Postgres
HAPI FHIR
NestJS
LiveKit
Mock external FHIR endpoint
```

The external FHIR endpoint should be clearly named:

```text
INTEROPERABILITY TEST SERVER
```

Do not call it:

```text
ABDM
```

unless it is actually an ABDM service.

---

# PHASE 45 — ABDM ADAPTER

Create an abstraction:

```text
AbdmGateway
```

with interfaces for:

```text
identity
consent
health information exchange
```

Do not scatter ABDM-specific HTTP calls throughout the application.

---

# PHASE 46 — REAL VS SIMULATED INTEGRATION

Every integration must have an explicit state:

```text
REAL
SANDBOX
LOCAL_SIMULATION
UNAVAILABLE
```

The UI and documentation must never represent:

```text
LOCAL_SIMULATION
```

as:

```text
ABDM CONNECTED
```

---

# PHASE 47 — ENVIRONMENT CONFIGURATION

Support:

```text
ABDM_MODE=disabled
ABDM_MODE=sandbox
ABDM_MODE=production
```

or an equivalent configuration mechanism.

Never hardcode external endpoints.

---

# PHASE 48 — SECURITY TESTS

Test:

```text
ASHA shares Facility B patient's record
ASHA shares without consent
expired consent
revoked consent
specialist accesses unrelated patient
district admin attempts mutation
replayed exchange
tampered exchange
expired JWT
invalid FHIR bundle
```

Every unauthorized path must fail.

---

# PHASE 49 — DATA LEAK TEST

Verify that:

```text
notifications
logs
analytics
errors
API responses
```

do not accidentally expose:

```text
ABHA
full name
phone
clinical diagnosis
clinical notes
```

unless required.

---

# PHASE 50 — FHIR BUNDLE VALIDATION TEST

For every generated Bundle:

```text
resourceType valid
references valid
Patient exists
no duplicate resources
no orphan references
consent relationship valid
provenance valid
```

---

# PHASE 51 — EXCHANGE CHAOS TEST

Simulate:

```text
offline
reconnect
timeout
retry
duplicate
server restart
partial response
consent revocation
authentication expiry
FHIR validation failure
```

No data loss.

No duplicate clinical events.

---

# PHASE 52 — FLAGSHIP ABDM-STYLE DEMO

Build the following deterministic demo.

## STEP 1

Jane Doe exists in Setu.

```text
ABHA:
Not Linked
```

## STEP 2

ASHA works offline.

Creates:

```text
ANC Encounter
BP Observation
RiskAssessment
```

## STEP 3

Emergency risk detected.

## STEP 4

ASHA initiates referral.

System asks:

```text
Why are we sharing?
```

## STEP 5

Consent recorded.

## STEP 6

Connectivity restored.

Setu synchronizes.

## STEP 7

Clinical summary generated.

## STEP 8

FHIR Bundle created.

## STEP 9

Receiving facility receives the record.

## STEP 10

Specialist accepts referral.

## STEP 11

Teleconsult occurs.

## STEP 12

Diagnostic request created.

## STEP 13

Diagnostic result arrives.

## STEP 14

Clinician reviews result.

## STEP 15

Medication workflow occurs.

## STEP 16

Follow-up Task created.

## STEP 17

Patient is followed up offline.

## STEP 18

Care Gap closes.

Final state:

```text
Clinical Journey: COMPLETE

Open Critical Gaps: 0

Records:
Interoperable

Consent:
Audited

Actions:
Traceable
```

---

# PHASE 53 — PATIENT VIEW OF SHARING

Build a conceptual patient-facing record:

```text
Your Health Information

Shared with:
District Hospital

Purpose:
Specialist consultation

Date:
01 Sep 2026

Status:
Completed
```

This demonstrates patient-centric data control.

---

# PHASE 54 — CLINICAL SUMMARY EXPORT

Allow authorized users to generate:

```text
FHIR Clinical Summary
```

with:

```text
Patient
Problems
Allergies where available
Medications
Recent observations
Recent diagnostics
CarePlan
Active referrals
Risk assessments
```

Only include clinically relevant information.

---

# PHASE 55 — EXPORT AUDIT

Every export must produce:

```text
AuditEvent
Provenance
Exchange record
```

---

# PHASE 56 — PERFORMANCE

Measure:

```text
FHIR Bundle generation
Consent validation
Exchange preparation
Upload
Import
Deduplication
Timeline rendering
```

Record actual measurements.

---

# PHASE 57 — DOCUMENTATION

Create:

```text
PHASE_7_FINAL_REPORT.md
ABDM_ARCHITECTURE.md
CONSENT_MODEL.md
HEALTH_INFORMATION_EXCHANGE.md
INTEROPERABILITY_MODEL.md
```

---

# PHASE 58 — TRACEABILITY MATRIX

Create:

```text
PHASE_7_TRACEABILITY.md
```

For every capability:

```text
Requirement
↓
UI
↓
API
↓
Service
↓
FHIR resource
↓
Security
↓
Audit
↓
Test
```

Status must be:

```text
VERIFIED
PARTIAL
UNVERIFIED
NOT IMPLEMENTED
```

Never use VERIFIED without executable evidence.

---

# PHASE 59 — BUILD GATE

Actually run:

```text
Flutter:
flutter analyze
flutter test

Backend:
npm run build
npm test
npm run test:e2e

Portal:
npm run build
npm run lint
```

If something cannot run, state why.

Never fabricate results.

---

# PHASE 60 — FINAL ARCHITECTURE

The final architecture should communicate:

```text
                     ┌─────────────────────┐
                     │  Frontline Flutter  │
                     │                     │
                     │ Offline Clinical    │
                     │ Care + Sync         │
                     └──────────┬──────────┘
                                │
                         Secure Gateway
                                │
                                ▼
                     ┌─────────────────────┐
                     │    NestJS Core      │
                     │                     │
                     │ Auth / RBAC         │
                     │ Care Pathways       │
                     │ Sync                │
                     │ Referral            │
                     │ Diagnostics         │
                     │ Medication         │
                     │ Consent             │
                     │ HIE                 │
                     │ Audit               │
                     └──────────┬──────────┘
                                │
                         FHIR Boundary
                                │
                                ▼
                     ┌─────────────────────┐
                     │     HAPI FHIR       │
                     │                     │
                     │ Canonical Record    │
                     └──────────┬──────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
             ABDM Adapter             LiveKit
                    │
                    ▼
             External HIE
```

Explain exactly which components are:

```text
LOCAL
SETU
FHIR
EXTERNAL
ABDM
SIMULATED
```

---

# PHASE 61 — FINAL PRODUCT POSITIONING

The product should now be explainable in one sentence:

> Setu is an offline-first, FHIR-native rural care-coordination platform that connects frontline workers, facilities, specialists, diagnostics and pharmacies into one auditable closed-loop patient journey, while enabling consent-aware interoperability with the broader digital-health ecosystem.

---

# PHASE 62 — FINAL JUDGE TEST

A judge should be able to ask:

### "Does it work offline?"

Demonstrate it.

### "What happens when the network comes back?"

Demonstrate synchronization.

### "Is this really FHIR?"

Open HAPI FHIR and show the actual resources.

### "What happens if two facilities modify the same record?"

Demonstrate conflict handling.

### "How do you prevent unauthorized access?"

Demonstrate RBAC + facility + patient relationship + consent.

### "What happens if consent is revoked?"

Demonstrate it.

### "Is this actually ABDM?"

Show:

```text
REAL
SANDBOX
SIMULATION
```

honestly.

### "What makes this different from a hospital management system?"

Demonstrate:

```text
offline-first
+
care pathway
+
closed-loop referral
+
care gaps
+
interoperability
+
consent
```

---

# FINAL RULE

Do NOT declare Phase 7 complete because:

```text
ABHA field exists
```

or:

```text
Consent screen exists
```

or:

```text
FHIR Bundle JSON exists
```

Phase 7 is complete only when:

```text
patient identity
+
consent
+
clinical summary
+
FHIR exchange
+
authorization
+
audit
+
offline behavior
+
cross-facility continuity
```

form one coherent, executable workflow.

If actual ABDM integration cannot be completed because production/sandbox credentials or external infrastructure are unavailable:

DO NOT FAKE IT.

Implement the adapter architecture and local interoperability simulation, clearly label it as simulation, and document exactly what remains external.

At the end:

STOP.

Do not start Phase 8.

Wait for review.
