# SIH-26133 — PHASE 13 MASTER PROMPT

# NATIONAL INTEROPERABILITY + CONSENT + ABDM-READY HEALTH INFORMATION EXCHANGE

## MISSION

Phase 13 transforms Setu from a strong standalone FHIR healthcare platform into an **interoperable, consent-aware, standards-driven rural health information exchange platform**.

The objective is NOT to create another mock ABDM integration.

The objective is to make the architecture capable of integrating with India's digital health ecosystem while maintaining:

```text
FHIR correctness
consent
privacy
identity safety
auditability
provenance
offline resilience
facility isolation
clinical safety
```

The final architecture should demonstrate that Setu can eventually participate in:

```text
ABDM ecosystem
Health Information Exchange
Health Records
ABHA-linked workflows
consent-based sharing
FHIR interoperability
longitudinal patient records
```

without fabricating external integrations.

---

# ABSOLUTE RULE

DO NOT FAKE ABDM.

DO NOT CREATE FAKE ABHA NUMBERS.

DO NOT CLAIM LIVE ABDM CONNECTIVITY.

DO NOT CLAIM PRODUCTION SANDBOX ACCESS UNLESS ACTUALLY VERIFIED.

DO NOT SEND REAL PHI TO EXTERNAL SERVICES.

DO NOT IMPLEMENT A "MOCK API" AND CALL IT ABDM.

If an external dependency cannot actually be connected:

```text
IMPLEMENT THE CORRECT ADAPTER INTERFACE
+
IMPLEMENT A LOCAL/TEST PROVIDER
+
CLEARLY LABEL IT AS SIMULATED
```

The architecture must make the boundary obvious.

---

# PHASE 1 — REPOSITORY FORENSIC AUDIT

Inspect the entire repository again.

Search for:

```text
ABDM
ABHA
HIP
HIU
HIE
consent
healthId
health_id
patient identifier
identifier
OAuth
token
FHIR
Bundle
DocumentReference
Composition
Consent
Provenance
AuditEvent
```

Also inspect:

```text
FHIR service
patient service
authentication
authorization
sync
referral
teleconsult
analytics
audit
Flutter local DB
```

Create:

```text
PHASE_13_INTEROPERABILITY_AUDIT.md
```

Classify every existing interoperability feature as:

```text
REAL
FHIR-COMPLIANT
ADAPTER
SIMULATED
MOCK
UNVERIFIED
```

---

# PHASE 2 — INTEROPERABILITY ARCHITECTURE

Create:

```text
INTEROPERABILITY_ARCHITECTURE.md
```

Architecture:

```text
                    SETU
                     |
              NestJS Gateway
                     |
          ┌──────────┴──────────┐
          |                     |
     Clinical FHIR          Identity/Auth
          |                     |
       HAPI FHIR          Consent/Access
          |
    Interoperability Layer
          |
   ┌──────┼────────┐
   |      |        |
 ABDM    Other    Local
 Adapter  FHIR    Systems
```

The interoperability layer must isolate external ecosystem-specific protocols from the clinical domain.

---

# PHASE 3 — FHIR VERSION AUDIT

Determine exactly which FHIR version the project currently uses.

Verify:

```text
FHIR version
profiles
resource schemas
FHIR JSON
FHIR REST API
search parameters
Bundle handling
references
identifiers
extensions
```

Do not assume.

Document the actual version.

---

# PHASE 4 — FHIR PROFILE VALIDATION

Audit these resources:

```text
Patient
Encounter
Observation
Condition
RiskAssessment
CarePlan
Task
ServiceRequest
MedicationRequest
MedicationDispense
DiagnosticReport
DocumentReference
Consent
Provenance
AuditEvent
```

For each verify:

```text
required fields
references
identifier
status
code
subject
encounter
authoredOn
performer
requester
reason
```

Create:

```text
FHIR_CONFORMANCE_MATRIX.md
```

---

# PHASE 5 — FHIR REFERENCE INTEGRITY

Build validation for:

```text
Patient/UUID
Encounter/UUID
Observation/UUID
Task/UUID
ServiceRequest/UUID
CarePlan/UUID
```

Detect:

```text
missing references
broken references
wrong resource type
cross-patient references
cross-facility references
```

These must be rejected before external exchange.

---

# PHASE 6 — FHIR BUNDLE ENGINE

Implement proper FHIR Bundle generation.

Support appropriate bundle types such as:

```text
transaction
batch
document
collection
```

based on actual use cases.

Never manually concatenate arbitrary JSON and call it a FHIR bundle.

---

# PHASE 7 — TRANSACTION BUNDLE

Implement a clinical transaction bundle for a flagship workflow:

```text
Patient
+
Encounter
+
Observation
+
RiskAssessment
+
Condition
+
CarePlan
+
ServiceRequest
+
Task
```

The bundle must preserve references.

---

# PHASE 8 — BUNDLE VALIDATION

Before sending a bundle:

```text
validate structure
validate references
validate resource types
validate identifiers
validate required fields
validate patient linkage
validate authorization
```

Reject invalid bundles.

---

# PHASE 9 — DOCUMENT-STYLE HEALTH RECORD

Create a longitudinal clinical document representation.

Potential structure:

```text
Composition
├── Patient
├── Encounter
├── Clinical findings
├── Risk assessment
├── Care plan
├── Referral
├── Medication
└── Follow-up
```

Ensure the document is generated from actual FHIR resources.

---

# PHASE 10 — CLINICAL DOCUMENT GENERATION

Create:

```text
ClinicalDocumentService
```

It should generate a reproducible clinical summary from FHIR.

Input:

```text
Patient/{id}
```

Output:

```text
FHIR Bundle / Composition
```

---

# PHASE 11 — DOCUMENT PROVENANCE

Every generated clinical document must identify:

```text
author
organization
timestamp
source resources
generation version
```

---

# PHASE 12 — PROVENANCE

Use FHIR `Provenance` for significant clinical transformations.

Example:

```text
Observation
      ↓
Triage Rule
      ↓
RiskAssessment
      ↓
ServiceRequest
```

The relationship must be traceable.

---

# PHASE 13 — RULE ENGINE PROVENANCE

For every automated clinical rule:

Store:

```text
ruleId
ruleVersion
executionTimestamp
inputResourceIds
outputResourceIds
```

Example:

```text
rule-anc-bp
version 1.1.0
```

Never lose the exact protocol version responsible for a clinical output.

---

# PHASE 14 — CONSENT ARCHITECTURE

Create:

```text
ConsentService
```

using FHIR `Consent`.

Model:

```text
who
what
why
when
purpose
recipient
scope
status
```

---

# PHASE 15 — CONSENT STATES

Support:

```text
ACTIVE
REVOKED
EXPIRED
PENDING
```

with clear transitions.

---

# PHASE 16 — CONSENT ENFORCEMENT

Consent must not be decorative.

When accessing protected clinical information:

```text
Authentication
↓
Authorization
↓
Facility scope
↓
Consent policy
↓
FHIR access
```

A valid JWT alone must not automatically imply permission to share patient data externally.

---

# PHASE 17 — BREAK-GLASS

Design a controlled emergency access mechanism.

Possible flow:

```text
Emergency
↓
Authorized clinician requests break-glass
↓
Reason required
↓
Access granted
↓
AuditEvent generated
↓
Post-event review
```

Do NOT implement unrestricted bypass.

---

# PHASE 18 — BREAK-GLASS AUDIT

Record:

```text
actor
patient
reason
timestamp
resources accessed
facility
authorization context
```

---

# PHASE 19 — ABHA IDENTITY BOUNDARY

Create a dedicated identity abstraction:

```text
HealthIdentityService
```

Do not make the entire system depend directly on ABHA.

Support:

```text
internal patient UUID
external health identifier
identifier system
identifier value
verification status
```

---

# PHASE 20 — IDENTIFIER SAFETY

Never use:

```text
phone number
Aadhaar number
name
date of birth
```

as the primary database identity.

The canonical patient identity remains the platform's stable UUID.

External identifiers remain mapped identifiers.

---

# PHASE 21 — PATIENT IDENTITY LINKING

Implement controlled linking:

```text
Local Patient
      ↓
Identity Verification
      ↓
External Health Identifier
      ↓
Link
```

The operation must require authorization.

---

# PHASE 22 — DUPLICATE IDENTITY PROTECTION

Extend existing duplicate detection.

Check:

```text
name
DOB
gender where appropriate
verified external identifier
facility records
```

Never automatically merge two patients solely based on name similarity.

---

# PHASE 23 — IDENTITY CONFIDENCE

Return:

```text
EXACT_MATCH
POSSIBLE_MATCH
NO_MATCH
INSUFFICIENT_DATA
```

Never force a match when confidence is inadequate.

---

# PHASE 24 — IDENTITY AUDIT

Every link/unlink operation generates:

```text
AuditEvent
Provenance
```

where appropriate.

---

# PHASE 25 — CONSENTED HEALTH DATA SHARING

Create:

```text
HealthRecordShareService
```

Flow:

```text
Patient
↓
Consent
↓
Authorized requester
↓
FHIR record selection
↓
Bundle generation
↓
Validation
↓
Exchange
↓
Audit
```

---

# PHASE 26 — MINIMUM NECESSARY DATA

Do not export:

```text
entire patient record
```

by default.

Allow selection based on purpose.

Example:

```text
Referral
→
relevant observations
risk assessment
condition
medications
care plan
```

---

# PHASE 27 — PURPOSE OF USE

Every external sharing request should specify a purpose.

Examples:

```text
TREATMENT
REFERRAL
CONSULTATION
FOLLOW_UP
EMERGENCY
```

---

# PHASE 28 — PURPOSE ENFORCEMENT

Use purpose to determine which data can be shared.

Example:

```text
REFERRAL
→ clinical information relevant to referral
```

not:

```text
REFERRAL
→ entire lifetime record
```

---

# PHASE 29 — DATA MINIMIZATION

Create a reusable:

```text
DataMinimizationPolicy
```

that determines which FHIR resources are necessary for a given workflow.

---

# PHASE 30 — FHIR EXPORT

Implement controlled export:

```text
GET /patient/:id/export
```

or equivalent architecture consistent with the project.

Output:

```text
FHIR Bundle
```

not proprietary JSON.

---

# PHASE 31 — EXPORT AUTHORIZATION

Require:

```text
JWT
role
facility scope
consent
purpose
```

before export.

---

# PHASE 32 — EXPORT AUDIT

Record:

```text
patient
requester
purpose
resources exported
timestamp
destination
consent reference
```

---

# PHASE 33 — IMPORT ENGINE

Implement:

```text
FHIRImportService
```

for externally supplied FHIR bundles.

Pipeline:

```text
Receive
↓
Authenticate
↓
Validate
↓
Normalize
↓
Reference check
↓
Identity resolution
↓
Duplicate detection
↓
Consent validation
↓
Persist
↓
Audit
```

---

# PHASE 34 — IMPORT NEVER TRUSTS INPUT

Treat external FHIR as untrusted.

Validate:

```text
resource type
JSON structure
references
identifiers
codes
timestamps
profiles
```

---

# PHASE 35 — IMPORT CONFLICTS

If external data conflicts with local records:

```text
DO NOT silently overwrite.
```

Create:

```text
IMPORT_CONFLICT
```

and route to an authorized resolution workflow.

---

# PHASE 36 — CONFLICT RESOLUTION

Support:

```text
KEEP_LOCAL
ACCEPT_EXTERNAL
MERGE
REVIEW_REQUIRED
```

Only authorized roles can finalize.

---

# PHASE 37 — CONFLICT AUDIT

Every conflict decision must retain:

```text
original
incoming
decision
actor
reason
timestamp
```

---

# PHASE 38 — CONSENT REVOCATION

When consent is revoked:

```text
future sharing
must stop
```

Do not pretend that previously delivered records can magically be deleted from another system.

Clearly distinguish:

```text
future access
previously disclosed information
```

---

# PHASE 39 — CONSENT EXPIRATION

Implement automatic expiration.

Do not allow stale consent to remain ACTIVE indefinitely.

---

# PHASE 40 — CONSENT UI

Create a clear patient/health-worker consent view.

Display:

```text
Who can access?
What can they access?
Why?
Until when?
```

Avoid legalistic walls of text.

---

# PHASE 41 — OFFLINE CONSENT

Design offline consent capture.

The app should support:

```text
consent captured offline
↓
local FHIR Consent
↓
sync
↓
server verification
```

Clearly distinguish:

```text
LOCALLY CAPTURED
SERVER VERIFIED
```

---

# PHASE 42 — OFFLINE CONSENT SAFETY

If an offline consent cannot be verified against current server state:

Do not automatically assume it overrides newer server-side revocation.

Implement deterministic conflict handling.

---

# PHASE 43 — CONSENT CONFLICT

Example:

```text
Device:
Consent ACTIVE

Server:
Consent REVOKED
```

When device reconnects:

```text
server state wins
↓
local access policy updated
↓
conflict audited
```

---

# PHASE 44 — ACCESS DECISION ENGINE

Create:

```text
AccessDecisionService
```

Input:

```text
actor
role
facility
patient
resource
purpose
consent
emergency status
```

Output:

```text
ALLOW
DENY
REQUIRES_BREAK_GLASS
REQUIRES_CONSENT
```

---

# PHASE 45 — CENTRALIZE AUTHORIZATION

Do not scatter consent logic across controllers.

All sensitive health-data access should pass through the authorization layer.

---

# PHASE 46 — FHIR SEARCH SECURITY

Audit all FHIR search endpoints.

Prevent users from querying arbitrary:

```text
Patient
Observation
Condition
Task
MedicationRequest
```

outside their permitted scope.

---

# PHASE 47 — SEARCH FILTER ENFORCEMENT

Facility and authorization restrictions must be applied server-side.

Never rely on:

```text
Flutter UI filtering
Next.js UI filtering
```

for security.

---

# PHASE 48 — PATIENT TIMELINE SECURITY

Patient timeline must enforce the same access policy as direct FHIR access.

A timeline endpoint must not become an authorization bypass.

---

# PHASE 49 — EVERYTHING SECURITY

Audit `$everything`.

Ensure:

```text
authorized patient
authorized facility
authorized purpose
consent
```

are evaluated before returning longitudinal data.

---

# PHASE 50 — TELECONSULT DATA SHARING

Connect teleconsultation to the interoperability model.

Represent:

```text
consultation
participants
purpose
encounter
referral
clinical findings
```

using appropriate FHIR resources.

Do not create a second proprietary clinical record.

---

# PHASE 51 — TELECONSULT CONSENT

Before consultation:

```text
verify authorization
verify consent requirements
verify referral context
```

---

# PHASE 52 — TELECONSULT PROVENANCE

Record:

```text
who initiated
who joined
patient
referral
consultation timestamp
facility
```

without storing unnecessary sensitive media metadata.

---

# PHASE 53 — DOCUMENT REFERENCES

If consultation produces:

```text
clinical summary
specialist note
report
prescription
```

represent it using appropriate FHIR resources such as:

```text
DocumentReference
Composition
Observation
MedicationRequest
CarePlan
```

as appropriate.

---

# PHASE 54 — CLINICAL SUMMARY

After specialist consultation:

```text
Specialist findings
↓
FHIR resources
↓
linked to Encounter
↓
linked to Referral
↓
available in longitudinal timeline
```

---

# PHASE 55 — REFERRAL INTEROPERABILITY

Referral exchange must preserve:

```text
ServiceRequest
Task
Patient
reason
priority
clinical context
requester
performer
```

---

# PHASE 56 — CLOSED LOOP EXCHANGE

Demonstrate:

```text
ASHA
↓
Referral
↓
PHC
↓
Specialist
↓
Teleconsult
↓
Clinical findings
↓
Treatment
↓
Follow-up
↓
Originating worker
```

All represented through interoperable clinical resources.

---

# PHASE 57 — EXTERNAL SYSTEM ADAPTER

Create an adapter interface:

```text
HealthExchangeAdapter
```

Methods should cover concepts such as:

```text
authenticate
requestConsent
discoverPatient
exportHealthRecord
importHealthRecord
```

Adapt naming to the actual architecture.

---

# PHASE 58 — PROVIDER ABSTRACTION

Implement:

```text
LocalTestExchangeProvider
```

for development/demo.

If actual ABDM credentials/endpoints are unavailable:

```text
DO NOT PRETEND THIS IS ABDM.
```

Label it:

```text
SIMULATED EXCHANGE PROVIDER
```

---

# PHASE 59 — REAL VS SIMULATED BOUNDARY

Create:

```text
INTEGRATION_STATUS.md
```

Table:

```text
Component
Status
Evidence
```

Examples:

```text
FHIR server              REAL
Local consent            REAL
JWT                      REAL
FHIR export              REAL
ABDM production exchange UNVERIFIED
ABHA verification        UNVERIFIED
```

Use actual repository evidence.

---

# PHASE 60 — API CONTRACTS

Update OpenAPI.

Document:

```text
consent
FHIR export
FHIR import
identity linking
health record sharing
exchange adapters
```

---

# PHASE 61 — ERROR MODEL

Create consistent interoperability errors:

```text
INVALID_FHIR
CONSENT_REQUIRED
CONSENT_REVOKED
IDENTITY_UNRESOLVED
DUPLICATE_PATIENT
FHIR_REFERENCE_INVALID
EXTERNAL_EXCHANGE_UNAVAILABLE
ACCESS_DENIED
BREAK_GLASS_REQUIRED
```

---

# PHASE 62 — ERROR SAFETY

Never expose:

```text
database errors
stack traces
FHIR server internals
JWT details
patient data
```

in client-facing errors.

---

# PHASE 63 — RATE LIMITING

Protect:

```text
FHIR export
FHIR import
patient search
identity matching
consent operations
```

from abuse.

---

# PHASE 64 — REPLAY PROTECTION

Sensitive exchange operations must use:

```text
request ID
idempotency key
timestamp
```

where appropriate.

---

# PHASE 65 — EXCHANGE AUDIT

Every external health-data exchange must generate an immutable audit record.

Track:

```text
requester
patient
purpose
consent
direction
resource types
result
timestamp
request ID
```

---

# PHASE 66 — AUDIT IMMUTABILITY

Ensure audit logs cannot be modified through normal application APIs.

---

# PHASE 67 — AUDIT SEARCH

Authorized administrators should be able to search:

```text
patient
actor
facility
purpose
date
action
result
```

---

# PHASE 68 — AUDIT PRIVACY

Do not place complete clinical payloads inside audit logs.

Audit:

```text
what happened
who did it
when
why
```

not:

```text
entire patient record
```

---

# PHASE 69 — ENCRYPTION

Audit data-at-rest protection.

Ensure sensitive local mobile data is not stored casually in:

```text
plain-text preferences
logs
temporary files
debug output
```

---

# PHASE 70 — MOBILE SECRET STORAGE

Audit:

```text
JWT
refresh token
keys
identifiers
consent state
```

Use secure platform storage where appropriate.

---

# PHASE 71 — LOG REDACTION

Search the entire repository for:

```text
console.log
print
logger
debug
```

and identify possible PHI leakage.

Examples:

```text
patient name
phone
ABHA
clinical diagnosis
vitals
```

must not appear in ordinary logs.

---

# PHASE 72 — PHI LOGGING TEST

Create automated tests proving that representative clinical requests do not leak PHI into application logs.

---

# PHASE 73 — FHIR VALIDATION TESTS

Add tests for:

```text
valid Patient
invalid Patient
broken Observation reference
invalid Bundle
invalid Consent
invalid Provenance
cross-patient reference
```

---

# PHASE 74 — CONSENT TESTS

Test:

```text
ACTIVE → ALLOW
REVOKED → DENY
EXPIRED → DENY
MISSING → CONSENT_REQUIRED
EMERGENCY → BREAK_GLASS
```

---

# PHASE 75 — IDENTITY TESTS

Test:

```text
exact match
possible duplicate
no match
duplicate identifier
unlink
unauthorized link
```

---

# PHASE 76 — FACILITY ISOLATION TESTS

Verify:

```text
Facility A
cannot export
cannot search
cannot import into
cannot modify
```

Facility B patients without authorization.

---

# PHASE 77 — ROLE TESTS

Verify access independently for:

```text
ASHA
ANM
CHO
Medical Officer
Specialist
Pharmacist
District Admin
```

based on actual roles in the repository.

Do not invent roles that do not exist.

---

# PHASE 78 — OFFLINE INTEROPERABILITY TEST

Simulate:

```text
offline
↓
capture Consent
↓
capture Patient
↓
capture Observation
↓
capture Referral
↓
restart application
↓
reconnect
↓
sync
↓
server validates
```

---

# PHASE 79 — OFFLINE REVOCATION TEST

Simulate:

```text
Device A:
Consent ACTIVE

Server:
Consent REVOKED

Device reconnects
```

Verify the secure state wins.

---

# PHASE 80 — EXTERNAL EXCHANGE FAILURE

Simulate external exchange outage.

Verify:

```text
clinical capture continues
local records remain intact
retry queue works
no data loss
no false success
```

---

# PHASE 81 — PARTIAL EXCHANGE FAILURE

Simulate:

```text
Bundle contains 10 resources
7 accepted
3 rejected
```

Verify deterministic handling.

Do not mark the entire exchange successful.

---

# PHASE 82 — IDEMPOTENT EXCHANGE

Retry the exact same request.

Verify:

```text
no duplicate clinical records
no duplicate audit events where inappropriate
```

---

# PHASE 83 — FHIR SEARCH PERFORMANCE

Benchmark:

```text
Patient search
everything
timeline
export
```

with realistic datasets.

---

# PHASE 84 — LONGITUDINAL RECORD PERFORMANCE

Test patients with:

```text
10 resources
100 resources
1,000 resources
```

Ensure timeline rendering remains usable.

---

# PHASE 85 — MOBILE PERFORMANCE

Ensure large patient histories are:

```text
paged
lazy loaded
cached appropriately
```

Do not load the patient's entire lifetime history into memory unnecessarily.

---

# PHASE 86 — DATA MINIMIZATION PERFORMANCE

Do not retrieve resources that are not needed for the requested workflow.

---

# PHASE 87 — CONSENT UI/UX

Design a judge-visible consent flow:

```text
Patient
↓
What will be shared?
↓
Why?
↓
With whom?
↓
For how long?
↓
Consent
```

---

# PHASE 88 — CONSENT REVOCATION UI

Allow appropriate users/patients to understand:

```text
active consents
expired consents
revoked consents
```

---

# PHASE 89 — HEALTH RECORD SHARING UI

Create a clear interface:

```text
Share Clinical Summary
```

Show:

```text
recipient
purpose
resources
consent
expiry
```

before confirmation.

---

# PHASE 90 — IMPORT UI

For external records:

```text
External record received
↓
Identity match
↓
Preview
↓
Conflicts
↓
Accept / Review
```

Never silently merge external records.

---

# PHASE 91 — LONGITUDINAL TIMELINE

Upgrade the timeline to distinguish:

```text
LOCAL
EXTERNALLY RECEIVED
EXTERNALLY SHARED
```

where appropriate.

---

# PHASE 92 — SOURCE TRANSPARENCY

Every imported clinical event should show its source organization/system where appropriate.

---

# PHASE 93 — DATA LINEAGE

For every derived clinical summary:

```text
source resources
↓
transformation
↓
output
```

must be reconstructable.

---

# PHASE 94 — CLINICAL SUMMARY REPRODUCIBILITY

Given the same FHIR dataset and same generator version:

```text
same input
→
same summary
```

unless explicitly time-dependent.

---

# PHASE 95 — INTEROPERABILITY DEMO

Create:

```text
PHASE_13_INTEROPERABILITY_DEMO.md
```

Flagship scenario:

```text
1. Jane Doe exists in Setu.

2. ASHA captures emergency ANC data offline.

3. Rule engine generates RiskAssessment.

4. Referral is created.

5. Specialist receives referral.

6. Specialist conducts teleconsultation.

7. Specialist generates clinical findings.

8. Setu builds longitudinal clinical summary.

9. Authorized user requests record sharing.

10. Consent is checked.

11. Minimum necessary resources are selected.

12. FHIR Bundle is generated.

13. Bundle passes validation.

14. Exchange adapter receives it.

15. AuditEvent records the exchange.

16. Simulated external provider returns acknowledgement.

17. External record is imported into another authorized facility.

18. Identity resolution finds the correct patient.

19. Imported record appears in timeline.

20. All actions remain traceable through Provenance/AuditEvent.
```

---

# PHASE 96 — ABDM HONESTY DEMO

The UI must clearly distinguish:

```text
FHIR INTEROPERABILITY
REAL
```

from:

```text
ABDM LIVE EXCHANGE
NOT CONNECTED
```

if that is the actual state.

A judge should respect this more than a fake integration.

---

# PHASE 97 — INTEROPERABILITY DASHBOARD

Create an admin panel showing:

```text
FHIR Server
CONNECTED

FHIR Validation
HEALTHY

Consent Service
HEALTHY

Exchange Adapter
SIMULATED / CONNECTED

Pending Exchanges
N

Failed Exchanges
N

Last Successful Exchange
timestamp
```

All values must be real.

---

# PHASE 98 — EXCHANGE MONITORING

Track:

```text
success rate
failure rate
latency
pending
retry count
```

---

# PHASE 99 — EXCHANGE QUEUE

Implement durable exchange queue where appropriate:

```text
PENDING
PROCESSING
COMPLETED
FAILED
RETRYING
DEAD_LETTER
```

---

# PHASE 100 — DEAD LETTER HANDLING

After repeated failures:

```text
DEAD_LETTER
```

and require human/administrative intervention.

Never retry forever.

---

# PHASE 101 — FINAL SECURITY REVIEW

Perform repository-wide searches for:

```text
hardcoded token
hardcoded password
secret
API key
ABHA
patient data
phone
email
console.log
TODO
FIXME
localhost
allow all
CORS
```

Classify every finding.

---

# PHASE 102 — PRODUCTION CONFIGURATION

Separate:

```text
development
testing
production
```

configuration.

No production secret should live in source control.

---

# PHASE 103 — DEPLOYMENT DOCUMENTATION

Create:

```text
INTEROPERABILITY_DEPLOYMENT.md
```

Document:

```text
FHIR server
database
authentication
consent
external exchange
secrets
TLS
monitoring
backup
audit
```

---

# PHASE 104 — DISASTER RECOVERY

Document:

```text
FHIR backup
database backup
audit backup
sync recovery
exchange queue recovery
```

---

# PHASE 105 — BUSINESS CONTINUITY

Simulate:

```text
FHIR unavailable
exchange unavailable
internet unavailable
analytics unavailable
```

Clinical operations must degrade gracefully.

---

# PHASE 106 — FINAL TRACEABILITY

Create:

```text
PHASE_13_TRACEABILITY.md
```

Map:

```text
SIH requirement
↓
FHIR implementation
↓
Consent
↓
Authorization
↓
Interoperability
↓
Audit
↓
Test
↓
Demo evidence
```

---

# PHASE 107 — FINAL ARTIFACTS

Create:

```text
PHASE_13_INTEROPERABILITY_AUDIT.md
INTEROPERABILITY_ARCHITECTURE.md
FHIR_CONFORMANCE_MATRIX.md
CONSENT_MODEL.md
IDENTITY_MODEL.md
INTEGRATION_STATUS.md
INTEROPERABILITY_DEPLOYMENT.md
PHASE_13_INTEROPERABILITY_DEMO.md
PHASE_13_TRACEABILITY.md
PHASE_13_FINAL_REPORT.md
```

---

# PHASE 108 — FINAL REPORT

Return:

## 1. Executive Summary

## 2. Existing Interoperability Audit

## 3. FHIR Conformance

## 4. FHIR Bundle Architecture

## 5. Longitudinal Clinical Record

## 6. Consent Architecture

## 7. Identity Architecture

## 8. Health Data Sharing

## 9. Import / Export

## 10. ABDM Integration Boundary

## 11. Security

## 12. Privacy

## 13. Provenance

## 14. Audit

## 15. Offline Interoperability

## 16. Conflict Resolution

## 17. Performance

## 18. Failure Testing

## 19. Test Evidence

## 20. REAL vs SIMULATED vs UNVERIFIED

## 21. Production Readiness

## 22. SIH Traceability

## 23. Remaining P0/P1 Risks

## 24. Final Judge Demo

---

# ABSOLUTE RULES

1. Never fake ABDM.
2. Never fabricate ABHA identities.
3. Never fabricate consent.
4. Never silently share PHI.
5. Never export more data than necessary.
6. Never automatically merge uncertain identities.
7. Never trust external FHIR input.
8. Never bypass facility authorization.
9. Never bypass role authorization.
10. Never treat UI filtering as security.
11. Never store secrets in source control.
12. Never place PHI in normal logs.
13. Never silently overwrite conflicting clinical data.
14. Never make external exchange availability a prerequisite for local clinical care.
15. Never claim production interoperability without evidence.
16. Every external exchange must be auditable.
17. Every automated transformation must have provenance.
18. Every consent decision must be enforceable.
19. Every FHIR bundle must be validated.
20. Clearly distinguish REAL / FHIR-COMPLIANT / ADAPTER / SIMULATED / MOCK / UNVERIFIED.

---

# STOP CONDITION

After completing Phase 13:

STOP.

Do NOT begin Phase 14.

Return the complete Phase 13 final report with:

```text
Files changed
Architecture changes
FHIR resources added/modified
Consent model
Identity model
Security changes
Tests
Performance measurements
Integration status
Demo procedure
Known limitations
P0/P1 risks
```

Then wait for further instructions.
