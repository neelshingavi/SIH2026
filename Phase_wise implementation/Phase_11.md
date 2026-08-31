# SIH-26133 — PHASE 11 MASTER PROMPT

# NATIONAL INTEROPERABILITY + ABDM-GRADE HEALTH DATA EXCHANGE + PATIENT-CENTRIC LONGITUDINAL RECORD

## MISSION

Phase 11 transforms Setu from a robust standalone clinical platform into an **interoperable, patient-centric health information exchange layer**.

The objective is NOT to add superficial ABDM buttons.

The objective is to make the existing Setu architecture capable of securely exchanging meaningful clinical information across:

```text
ASHA
ANM
Sub-Centre
PHC
CHC
District Hospital
Specialist
Laboratory
Pharmacy
District Administration
Patient
```

while preserving:

```text
FHIR correctness
patient identity
consent
provenance
security
facility boundaries
offline capability
auditability
clinical safety
```

---

# CRITICAL RULE

Do NOT fake ABDM integration.

Do NOT create fake ABHA numbers.

Do NOT create fake consent artefacts.

Do NOT claim connection to ABDM gateways unless an actual external endpoint is configured and successfully tested.

If a national service is unavailable in the development environment:

```text
IMPLEMENT THE REAL ADAPTER INTERFACE
+
IMPLEMENT A LOCAL SANDBOX ADAPTER
+
CLEARLY LABEL IT SANDBOX
```

Never present sandbox behavior as production interoperability.

---

# PHASE 0 — DEEP INTEROPERABILITY AUDIT

Before modifying code, inspect the entire repository again.

Pay special attention to:

```text
FHIR resources
FHIR references
Patient identifiers
Organization
Practitioner
PractitionerRole
Encounter
Observation
Condition
RiskAssessment
CarePlan
ServiceRequest
Task
MedicationRequest
MedicationDispense
DiagnosticReport
Provenance
AuditEvent
Consent
DocumentReference
Bundle
```

Also inspect:

```text
OpenAPI
FHIR shapes
implementation plans
sync protocol
authentication
facility model
user model
audit model
```

Search globally for:

```text
ABHA
ABDM
HIP
HIU
HIE-CM
Consent
ConsentManager
FHIR
Bundle
DocumentReference
Provenance
Identifier
```

Create:

```text
PHASE_11_INTEROPERABILITY_AUDIT.md
```

---

# PHASE 1 — PATIENT IDENTITY MODEL

The current UUID model is useful internally but is not sufficient as a national interoperability identity strategy.

Design a layered identity model:

```text
Internal Patient UUID
        +
Facility identifiers
        +
External identifiers
        +
ABHA identifier when legitimately available
```

Never replace the internal UUID with ABHA.

---

# PHASE 2 — PATIENT IDENTIFIER MODEL

Create an explicit identifier abstraction.

Conceptually:

```text
Patient.identifier[]
```

must support:

```text
system
value
type
assigner
use
period
```

Examples:

```text
Setu Patient ID
ABHA
Facility Patient ID
External Health ID
```

Do not use raw strings scattered across the codebase.

---

# PHASE 3 — PATIENT IDENTITY SERVICE

Create a centralized identity service responsible for:

```text
patient registration
identifier lookup
duplicate detection
identity linking
identity verification
identity resolution
```

No individual feature should implement its own patient matching algorithm.

---

# PHASE 4 — DUPLICATE PATIENT RESOLUTION

Upgrade the existing duplicate check.

Do NOT rely only on:

```text
name
```

Consider:

```text
name
date of birth
gender
phone
address
existing identifiers
facility
```

The output should classify:

```text
NO_MATCH
POSSIBLE_MATCH
HIGH_CONFIDENCE_MATCH
```

Do not automatically merge patients.

---

# PHASE 5 — IDENTITY CONFIDENCE

Every identity match should have:

```text
match score
matching attributes
algorithm version
timestamp
actor
```

Example:

```text
MATCH_CONFIDENCE = 0.94
```

But do not present the number as medical certainty.

---

# PHASE 6 — HUMAN IDENTITY RESOLUTION

When ambiguous:

```text
Patient A
Patient B
```

show the authorized health worker:

```text
Why they appear similar
Which identifiers match
Which fields differ
```

Require human confirmation before linking.

---

# PHASE 7 — SAFE IDENTITY MERGING

Do not physically delete the losing Patient resource.

Use an appropriate identity-linking mechanism.

Preserve:

```text
original identifiers
original resource IDs
merge actor
merge timestamp
reason
```

Every merge must be reversible where technically appropriate.

---

# PHASE 8 — ORGANIZATION MODEL

Ensure facilities are represented as FHIR:

```text
Organization
```

rather than only application-specific database records.

Represent:

```text
Sub-centre
PHC
CHC
District Hospital
Laboratory
Pharmacy
```

using appropriate organization relationships.

---

# PHASE 9 — PRACTITIONER MODEL

Represent health workers using:

```text
Practitioner
PractitionerRole
```

where appropriate.

Do not encode all identity information only inside JWT claims.

JWT can provide authorization context.

FHIR should represent clinical actors.

---

# PHASE 10 — CARE TEAM MODEL

Where useful, represent:

```text
CareTeam
```

for longitudinal patient care.

Example:

```text
ASHA
↓
ANM
↓
Medical Officer
↓
Specialist
↓
Pharmacist
```

This should allow the system to explain who is responsible for different parts of care.

---

# PHASE 11 — TERMINOLOGY ARCHITECTURE

Audit every hardcoded clinical code.

Search:

```text
BP
ANC
anemia
hypertension
pregnancy
medication
lab
referral
risk
```

Do not scatter arbitrary strings.

---

# PHASE 12 — FHIR CODE SYSTEMS

Where applicable use:

```text
CodeSystem
ValueSet
Coding
CodeableConcept
```

rather than free-form strings.

---

# PHASE 13 — CLINICAL TERMINOLOGY SERVICE

Create a terminology abstraction capable of:

```text
validateCode
lookup
translate
expandValueSet
```

It may initially use local cached terminology.

Do not create fake terminology mappings merely to make the UI look complete.

---

# PHASE 14 — TERMINOLOGY VERSIONING

Clinical terminology must have:

```text
system
version
effective date
```

when relevant.

A clinical record should remain interpretable even if terminology evolves later.

---

# PHASE 15 — OFFLINE TERMINOLOGY CACHE

Frontline workers must be able to perform required clinical workflows without connectivity.

Cache only the terminology required by the application's workflows.

Include:

```text
version
checksum
last updated
```

---

# PHASE 16 — FHIR PROFILE STRATEGY

Review whether important resources conform to appropriate profiles.

Create:

```text
FHIR_PROFILE_MATRIX.md
```

For each resource document:

```text
Resource
Profile
Mandatory fields
Identifiers
References
Terminology
Validation status
```

---

# PHASE 17 — FHIR VALIDATION

Introduce actual FHIR validation where practical.

Validate:

```text
Patient
Encounter
Observation
Condition
RiskAssessment
CarePlan
ServiceRequest
Task
MedicationRequest
MedicationDispense
DiagnosticReport
Consent
Provenance
AuditEvent
```

Invalid resources must not silently enter the canonical FHIR store.

---

# PHASE 18 — VALIDATION ERROR UX

When a resource fails FHIR validation:

Do NOT show:

```text
Something went wrong.
```

Show an actionable error:

```text
Clinical record could not be synchronized.

Reason:
Observation is missing required effective date.

Status:
Saved locally.
Will retry after correction.
```

Do not lose the local record.

---

# PHASE 19 — FHIR BUNDLE ARCHITECTURE

Implement appropriate FHIR Bundles for transactional/exchange workflows.

For example:

```text
Patient
Encounter
Observation
RiskAssessment
ServiceRequest
Task
```

may be exchanged as a coherent package where appropriate.

Do not blindly bundle everything.

---

# PHASE 20 — TRANSACTIONAL BUNDLE SAFETY

Where a Bundle is used transactionally:

```text
all succeed
OR
transaction fails
```

Ensure partial clinical state is not incorrectly represented as complete.

---

# PHASE 21 — DOCUMENT EXCHANGE

For appropriate longitudinal summaries, support:

```text
DocumentReference
```

and/or appropriate clinical document representation.

The objective is to allow a receiving facility to understand:

```text
who the patient is
what happened
what was found
what was prescribed
what remains pending
```

---

# PHASE 22 — CLINICAL SUMMARY

Create a generated patient summary using actual FHIR data.

It should summarize:

```text
Patient
Active conditions
Recent encounters
Recent observations
Risk assessments
Active referrals
Medications
Diagnostics
Care gaps
```

Do not invent missing information.

---

# PHASE 23 — PROVENANCE

Every clinically important generated resource should have appropriate provenance.

Capture:

```text
agent
actor
organization
activity
timestamp
target resource
```

Distinguish:

```text
human-generated
system-generated
rule-engine-generated
imported
externally received
```

---

# PHASE 24 — PROVENANCE FOR TRIAGE

For a RiskAssessment created by the deterministic rule engine:

Record:

```text
rule ID
rule version
input source
actor
facility
timestamp
```

The provenance must allow the decision to be reconstructed.

---

# PHASE 25 — PROVENANCE FOR IMPORTED DATA

Imported external records must clearly identify:

```text
source organization
source system
received timestamp
original identifier
```

Never make imported data appear as if Setu generated it.

---

# PHASE 26 — CONSENT MODEL

Implement a real consent abstraction.

Represent:

```text
Consent
```

with:

```text
patient
purpose
scope
recipient
period
status
provision
```

---

# PHASE 27 — CONSENT STATES

Support:

```text
REQUESTED
ACTIVE
REVOKED
EXPIRED
DENIED
```

with deterministic transitions.

---

# PHASE 28 — CONSENT-AWARE EXCHANGE

Before releasing patient data externally:

Evaluate:

```text
patient consent
purpose
recipient
resource scope
time validity
```

If consent is insufficient:

```text
BLOCK
```

and create an auditable event.

---

# PHASE 29 — CONSENT WITH OFFLINE OPERATION

Define safe behavior when:

```text
patient needs urgent care
AND
connectivity is unavailable
```

Do not allow a simplistic consent check to block emergency clinical care.

Implement a clearly defined emergency/break-glass policy.

---

# PHASE 30 — BREAK-GLASS

Implement explicit emergency access.

Require:

```text
reason
actor
patient
timestamp
scope
```

Log it prominently.

Do not make break-glass equivalent to normal access.

---

# PHASE 31 — BREAK-GLASS REVIEW

Create an administrative review workflow for emergency accesses.

A reviewer should be able to see:

```text
who
why
what data
when
```

---

# PHASE 32 — ABDM ADAPTER ARCHITECTURE

Create a clean abstraction:

```text
HealthExchangeAdapter
```

with operations conceptually such as:

```text
discoverPatient
requestConsent
checkConsent
exportHealthRecord
importHealthRecord
publishRecord
```

Do not hardcode ABDM-specific logic throughout clinical services.

---

# PHASE 33 — SANDBOX ADAPTER

Create:

```text
SandboxHealthExchangeAdapter
```

for local demonstration.

It must be explicitly labeled:

```text
SANDBOX
```

and must never claim to communicate with national infrastructure.

---

# PHASE 34 — PRODUCTION ADAPTER

Create the interface boundary for a genuine production exchange adapter.

If actual credentials/endpoints are unavailable:

```text
implement interface
implement configuration
implement validation
DO NOT fake successful external calls
```

---

# PHASE 35 — EXCHANGE STATE MACHINE

Every external exchange operation should have explicit states:

```text
CREATED
QUEUED
SENDING
SENT
ACKNOWLEDGED
REJECTED
FAILED
RETRYING
CANCELLED
```

Never represent:

```text
local queue entry
```

as:

```text
externally delivered
```

---

# PHASE 36 — EXCHANGE RECEIPTS

Every successful external exchange should produce a durable receipt containing:

```text
request ID
external transaction ID
resource/bundle ID
timestamp
destination
status
```

---

# PHASE 37 — EXCHANGE RETRY

Use the same reliability principles as sync:

```text
idempotency
backoff
retry classification
dead-letter state
```

---

# PHASE 38 — EXTERNAL DATA IMPORT

Imported records must first pass through:

```text
authentication
validation
identity resolution
consent
provenance
deduplication
```

before entering the patient's longitudinal record.

---

# PHASE 39 — IMPORTED DATA QUARANTINE

If identity is uncertain:

```text
DO NOT ATTACH RECORD AUTOMATICALLY.
```

Place it into a review state.

---

# PHASE 40 — CROSS-FACILITY LONGITUDINAL RECORD

A patient moving from:

```text
Village
↓
PHC
↓
District Hospital
↓
Specialist
```

should retain a coherent longitudinal history.

Demonstrate that this works using FHIR references rather than duplicated application-specific records.

---

# PHASE 41 — REFERRAL + INTEROPERABILITY

Upgrade the referral workflow:

```text
ServiceRequest
↓
Task
↓
Encounter
↓
DiagnosticReport
↓
CarePlan
```

The originating facility must be able to receive clinically relevant outcomes.

---

# PHASE 42 — REFERRAL COMPLETION

Do not mark a referral completed merely because:

```text
Task.status = completed
```

where clinical completion requires evidence.

Define the completion criteria.

---

# PHASE 43 — CLOSED-LOOP CLINICAL RECORD

Demonstrate:

```text
ASHA identifies risk
↓
Referral
↓
Specialist
↓
Consultation
↓
Diagnosis/findings
↓
Treatment
↓
Follow-up
↓
Originating worker
```

with actual FHIR resources.

---

# PHASE 44 — DIAGNOSTIC INTEROPERABILITY

Model:

```text
ServiceRequest
Specimen
Observation
DiagnosticReport
```

where appropriate.

Do not collapse every laboratory concept into Observation.

---

# PHASE 45 — MEDICATION INTEROPERABILITY

Audit:

```text
MedicationRequest
MedicationDispense
MedicationStatement / appropriate equivalent
```

and their references.

A prescription is not proof of dispensing.

---

# PHASE 46 — CARE PLAN INTEROPERABILITY

Ensure CarePlan activities reference actual:

```text
ServiceRequest
Task
MedicationRequest
Appointment
Encounter
```

where applicable.

---

# PHASE 47 — PATIENT-CENTRIC TIMELINE

Upgrade the existing timeline so every event displays:

```text
date
resource type
clinical meaning
actor
facility
status
source
```

Do not display internal database implementation details.

---

# PHASE 48 — SOURCE BADGES

Where useful, visually distinguish:

```text
Setu
External facility
Imported
Specialist
Laboratory
Pharmacy
```

This increases trust in the longitudinal record.

---

# PHASE 49 — DATA CORRECTION

Design safe correction workflows.

Do not silently mutate historical clinical facts.

Where appropriate:

```text
new corrected resource
+
provenance
+
reason
```

rather than destructive overwrite.

---

# PHASE 50 — CLINICAL HISTORY IMMUTABILITY

Audit all update/delete operations on historical clinical data.

Critical clinical events should remain reconstructable.

---

# PHASE 51 — AUDIT VS PROVENANCE

Clearly separate:

```text
AuditEvent
```

from:

```text
Provenance
```

Document the purpose of each.

---

# PHASE 52 — SECURITY AUDIT

Audit every exchange endpoint for:

```text
IDOR
facility leakage
patient enumeration
consent bypass
role bypass
replay
duplicate import
```

---

# PHASE 53 — DATA MINIMIZATION

External systems should receive only the minimum necessary data for the declared purpose.

Do not export the entire patient record automatically.

---

# PHASE 54 — DATA EXPORT PREVIEW

Before an authorized export, show:

```text
Patient
Purpose
Destination
Resources
Data categories
Consent
```

where appropriate.

---

# PHASE 55 — EXPORT AUDIT

Every export must create an audit event containing:

```text
actor
patient
purpose
recipient
resource count
timestamp
consent state
result
```

---

# PHASE 56 — IMPORT/EXPORT DASHBOARD

Create an operational dashboard showing:

```text
Pending exchanges
Successful
Failed
Rejected
Consent blocked
Identity review
Retrying
```

Do not expose unnecessary PHI.

---

# PHASE 57 — INTEROPERABILITY OBSERVABILITY

Add metrics:

```text
exchange_requests_total
exchange_success_total
exchange_failure_total
exchange_rejected_total
consent_denied_total
identity_review_total
FHIR_validation_failure_total
FHIR_import_total
FHIR_export_total
```

---

# PHASE 58 — DATA QUALITY DASHBOARD

Track:

```text
missing identifiers
invalid terminology
FHIR validation failures
duplicate candidates
unresolved identities
incomplete referrals
stale records
```

---

# PHASE 59 — DATA QUALITY SCORE

Create a meaningful data-quality indicator.

It must be based on measurable conditions.

Do NOT create an arbitrary percentage.

Document the formula.

---

# PHASE 60 — PATIENT RECORD COMPLETENESS

Identify missing clinical elements.

Example:

```text
Pregnancy encounter exists
BUT
required ANC observations missing
```

This can generate a data-quality warning.

Do not confuse data-quality gaps with clinical care gaps.

---

# PHASE 61 — CLINICAL GAP VS DATA GAP

Explicitly distinguish:

```text
CARE_GAP
```

from:

```text
DATA_QUALITY_GAP
```

Example:

```text
Follow-up not performed
=
CARE GAP

Follow-up performed but not recorded
=
DATA QUALITY GAP
```

---

# PHASE 62 — DISTRICT DATA QUALITY

District administrators should see aggregate:

```text
FHIR validation failures
sync failures
identity duplicates
missing clinical data
unresolved referrals
```

without unnecessary patient-level PHI.

---

# PHASE 63 — NATIONAL-SCALE SIMULATION

Create deterministic simulation data for:

```text
10 facilities
100 facilities
1000 facilities
```

where practical.

Measure:

```text
FHIR resources
sync volume
exchange volume
query latency
```

Do not claim national-scale performance unless actually tested.

---

# PHASE 64 — INTEROPERABILITY LOAD TEST

Simulate multiple facilities exchanging records simultaneously.

Measure:

```text
throughput
latency
failure rate
queue growth
FHIR load
```

---

# PHASE 65 — OFFLINE + INTEROPERABILITY

Test:

```text
offline patient creation
offline referral
offline clinical assessment
offline consent capture where permitted
reconnect
sync
external exchange
```

The exchange must happen only after the appropriate local/server state and consent conditions are satisfied.

---

# PHASE 66 — EXCHANGE FAILURE CHAOS

Simulate:

```text
external service unavailable
timeout
duplicate response
malformed response
invalid FHIR
identity mismatch
consent revoked during exchange
```

Expected behavior must be deterministic and auditable.

---

# PHASE 67 — CONSENT REVOCATION RACE

Test:

```text
Consent ACTIVE
↓
Export begins
↓
Consent revoked
```

Define exactly whether the operation:

```text
continues
OR
is cancelled
```

based on the actual exchange protocol and legal/clinical semantics.

Document the behavior.

---

# PHASE 68 — SECURITY THREAT MODEL

Create:

```text
THREAT_MODEL.md
```

Threat actors:

```text
compromised device
malicious worker
compromised facility
external attacker
stolen token
malicious insider
malformed external system
```

Map:

```text
threat
attack
control
test
```

---

# PHASE 69 — TRUST BOUNDARIES

Document:

```text
Patient/device
↓
Flutter
↓
Internet
↓
Gateway
↓
FHIR
↓
External exchange
```

and identify every trust boundary.

---

# PHASE 70 — ZERO-TRUST PRINCIPLES

Do not trust:

```text
client facilityId
client role
client patient ownership
client timestamps
external identifiers
```

Validate at the server boundary.

---

# PHASE 71 — PATIENT ENUMERATION PROTECTION

Audit endpoints such as:

```text
patient search
duplicate detection
timeline
FHIR lookup
```

against enumeration attacks.

---

# PHASE 72 — PHI LOGGING AUDIT

Scan logs for:

```text
patient names
phone numbers
ABHA
addresses
clinical diagnoses
medical observations
```

Remove unnecessary PHI from logs.

---

# PHASE 73 — PHI ERROR RESPONSE AUDIT

API errors must not leak:

```text
patient existence
internal IDs
FHIR internals
database structure
```

to unauthorized users.

---

# PHASE 74 — INTEROPERABILITY DOCUMENTATION

Create:

```text
INTEROPERABILITY_GUIDE.md
```

Include:

```text
FHIR architecture
profiles
identifiers
terminology
consent
provenance
exchange lifecycle
sandbox
production adapter
```

---

# PHASE 75 — ARCHITECTURE DIAGRAM

Create/update:

```text
ARCHITECTURE.md
```

with:

```text
Frontline App
      ↓
Offline SQLite
      ↓
Sync Engine
      ↓
API Gateway
      ↓
Auth/RBAC
      ↓
Clinical Services
      ↓
HAPI FHIR
      ↓
Postgres

               ↘
              Exchange Adapter
                    ↓
              External Health Network
```

Also include:

```text
Consent
Provenance
Audit
Observability
```

as cross-cutting concerns.

---

# PHASE 76 — FINAL NATIONAL-LEVEL DEMO

Create:

```text
PHASE_11_INTEROPERABILITY_DEMO.md
```

Scenario:

```text
1. Jane Doe registered at rural Sub-Centre
2. Internal Setu ID created
3. Clinical assessment performed offline
4. Emergency risk identified
5. Referral created
6. Patient reaches PHC
7. PHC accesses longitudinal history
8. Specialist consultation occurs
9. Specialist records findings
10. Diagnostic request created
11. Diagnostic result arrives
12. Medication prescribed
13. Medication dispensed
14. Follow-up CarePlan created
15. Patient record is prepared for external exchange
16. Consent evaluated
17. Export generated
18. Exchange receipt recorded
19. Provenance recorded
20. Originating facility sees updated outcome
```

---

# PHASE 77 — FAILURE DEMO

Repeat the above while:

```text
network is interrupted
FHIR temporarily unavailable
exchange unavailable
consent revoked
identity ambiguous
```

The system must degrade safely.

---

# PHASE 78 — JUDGE-FACING INTEROPERABILITY VIEW

Create a technical screen showing:

```text
Patient Identity
FHIR Resources
Consent
Provenance
Exchange Status
Audit Trail
```

The purpose is to let judges understand that the system is not a collection of disconnected UI screens.

---

# PHASE 79 — REMOVE INTEROPERABILITY THEATRE

Search for:

```text
ABDM
ABHA
consent
exchange
FHIR
```

and verify every implementation is either:

```text
REAL
SANDBOX
INTERFACE ONLY
```

Clearly label each.

No fake green checkmarks.

---

# PHASE 80 — FINAL VALIDATION

Run:

```text
flutter analyze
flutter test

npm run lint
npm run build
npm test
npm run test:e2e
```

Run actual FHIR validation tests.

Run security tests.

Run interoperability tests.

Run offline tests.

Run consent tests.

Run identity tests.

---

# PHASE 81 — FINAL TRACEABILITY

Create:

```text
PHASE_11_TRACEABILITY.md
```

Map:

```text
Requirement
↓
FHIR resource
↓
API
↓
Frontend
↓
Security rule
↓
Consent rule
↓
Test
↓
Evidence
```

---

# PHASE 82 — FINAL ARTIFACTS

Create:

```text
PHASE_11_INTEROPERABILITY_AUDIT.md
FHIR_PROFILE_MATRIX.md
INTEROPERABILITY_GUIDE.md
THREAT_MODEL.md
ARCHITECTURE.md
PHASE_11_INTEROPERABILITY_DEMO.md
PHASE_11_TRACEABILITY.md
PHASE_11_FINAL_REPORT.md
```

---

# PHASE 83 — FINAL REPORT FORMAT

Return:

## 1. Executive Summary

## 2. Existing Architecture Audit

## 3. Patient Identity Architecture

## 4. FHIR Interoperability

## 5. Terminology

## 6. Consent

## 7. Break-Glass

## 8. Provenance

## 9. Auditability

## 10. External Exchange Architecture

## 11. Sandbox vs Real Integration

## 12. Security Threat Model

## 13. Data Quality

## 14. Performance

## 15. Offline Interoperability

## 16. Failure Testing

## 17. E2E Results

## 18. Test Evidence

## 19. REAL vs SANDBOX vs INTERFACE-ONLY vs UNVERIFIED

## 20. Production Readiness

## 21. SIH Requirement Traceability

## 22. Remaining P0/P1 Risks

## 23. Final Judge Demonstration

## 24. Architecture Summary

---

# ABSOLUTE RULES

1. Do not fake ABDM.
2. Do not fabricate ABHA identities.
3. Do not fabricate consent.
4. Do not fabricate external exchange success.
5. Do not fabricate performance numbers.
6. Do not fabricate FHIR compliance.
7. Do not silently merge patients.
8. Do not silently overwrite historical clinical data.
9. Do not expose PHI unnecessarily.
10. Do not weaken offline guarantees.
11. Do not bypass existing RBAC.
12. Do not bypass facility isolation.
13. Do not create parallel proprietary clinical models where FHIR already models the concept.
14. Do not replace working functionality merely for architectural aesthetics.
15. Every claim in the final report must be backed by an actual test, command, artifact, or clearly marked as unverified.

---

# STOP CONDITION

After completing Phase 11:

STOP.

Do NOT begin Phase 12.

Return the complete Phase 11 report and wait for further instructions.
