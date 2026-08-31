# SIH-26133 — PHASE 2 MASTER IMPLEMENTATION PROMPT

# IDENTITY + SECURITY + TRUE FHIR CLINICAL CORE

You are continuing development of the **Setu** SIH-26133 healthcare platform.

Repository:

https://github.com/neelshingavi/SIH2026

Phase 0 established the major architectural gaps.

Phase 1 implemented a durable offline-first foundation using SQLite, a local resource store, a sync queue, idempotency and basic version conflict detection.

However, Phase 1 introduced an important transitional limitation:

The NestJS backend currently stores FHIR JSON blobs using TypeORM/PostgreSQL rather than using a genuine FHIR server as the authoritative clinical system.

Phase 2 must now establish:

1. Real identity
2. Authentication
3. Authorization
4. Facility scoping
5. Secure device/user context
6. Real FHIR-native clinical persistence
7. Canonical patient identity
8. Longitudinal patient record
9. Auditability
10. Secure synchronization

This phase is foundational.

Do NOT add AI/chatbots yet.

Do NOT add random features.

Do NOT implement fake ABDM integration.

Do NOT claim interoperability unless the implementation actually supports it.

---

# 0. FIRST — AUDIT PHASE 1

Before modifying code, inspect the actual Phase 1 implementation.

Verify:

* SQLite schema
* local_resources
* sync_queue
* resource repository
* sync coordinator
* sync controller
* sync service
* FHIR resource entity
* idempotency entity
* pull endpoint
* version handling
* all callers of sync APIs

Do not trust the Phase 1 report.

Verify the implementation.

Identify:

* race conditions
* incorrect transaction boundaries
* idempotency bugs
* versioning bugs
* duplicate resource risks
* authentication assumptions
* insecure endpoints
* hardcoded credentials
* insecure local storage
* missing indexes
* unsafe logging

Fix Phase 1 defects discovered during this audit before building Phase 2.

---

# 1. DEFINE THE AUTHORITATIVE DATA ARCHITECTURE

The current backend stores FHIR JSON in a custom TypeORM table.

Treat this as a TRANSITIONAL storage layer only.

The target architecture should be:

```text
Flutter / Portal
       ↓
NestJS API Gateway
       ↓
FHIR Service
       ↓
FHIR R4 Server
       ↓
PostgreSQL
```

If HAPI FHIR is already part of the repository/infrastructure, use it.

Do not create another custom FHIR server.

Do not duplicate the entire FHIR specification inside NestJS.

NestJS should act as:

* authentication boundary
* authorization boundary
* business orchestration layer
* synchronization gateway
* audit boundary
* integration layer

The FHIR server should own canonical FHIR resource persistence.

---

# 2. MIGRATE THE CANONICAL RESOURCE STORE

The current custom `fhir_resources` table is not the long-term source of truth.

Create a migration strategy:

```text
CURRENT

NestJS
  ↓
TypeORM
  ↓
fhir_resources JSONB


TARGET

NestJS
  ↓
FHIR API
  ↓
HAPI FHIR
```

Do not blindly delete the existing table.

First:

1. identify all resources currently stored there
2. determine resource types
3. migrate valid resources to HAPI FHIR
4. verify round-trip retrieval
5. verify IDs are preserved
6. verify references remain valid
7. only then remove dependency on the custom table

Keep a temporary migration adapter if necessary.

---

# 3. CREATE A CANONICAL FHIR RESOURCE SERVICE

Implement a clean abstraction such as:

```text
FHIRResourceService
```

Responsibilities:

* create resource
* read resource
* update resource
* conditional search
* version-aware update
* delete/tombstone where appropriate
* retrieve history
* validate resource
* retrieve patient record
* execute transaction/batch where appropriate

The frontend MUST NOT directly know the HAPI FHIR URL.

All access goes through the NestJS gateway.

---

# 4. FHIR VALIDATION

Do not accept arbitrary JSON just because it looks like FHIR.

At minimum validate:

* `resourceType`
* resource ID
* required fields
* references
* date/time formats
* primitive types
* supported resource types

Reject malformed resources.

Return structured validation errors.

Example:

```text
400 FHIR_VALIDATION_ERROR
```

with useful field-level information.

---

# 5. CANONICAL PATIENT IDENTITY

This is one of the most important parts of the entire project.

Design a proper patient identity strategy.

A Patient must have:

```text
FHIR Patient.id
```

as its canonical internal identifier.

Do NOT use:

```text
PAT-001
PAT-002
random display strings
```

as the distributed identity.

The local device must be able to create a Patient while offline.

Therefore:

```text
UUID generated locally
       ↓
Patient/{UUID}
       ↓
sync
       ↓
same Patient/{UUID} on server
```

---

# 6. PATIENT DUPLICATE DETECTION

UUID solves distributed identity.

It does NOT solve duplicate real-world patients.

Implement a patient matching layer.

Potential matching attributes:

* name
* date of birth / age
* sex
* phone
* address
* ABHA identifier when available
* other approved identifiers

Do not implement an unsafe automatic merge.

Instead produce:

```text
POSSIBLE_DUPLICATE
```

with confidence/reason information.

Example:

```text
Possible match found:

Ramesh Shinde
DOB: 12-03-1981
Village: XYZ

Existing patient:
Ramesh Shinde
DOB: 12-03-1981
Village: XYZ

[Use existing patient]
[Create new patient]
```

A healthcare worker or authorized clinician must make the final decision.

---

# 7. FACILITY HIERARCHY

Implement the actual healthcare facility hierarchy.

At minimum support:

```text
District
   ↓
District Hospital
   ↓
Rural Hospital
   ↓
PHC
   ↓
Sub-centre
```

Represent organizations using FHIR-compatible concepts.

Do NOT hardcode:

```text
PHC-001
PHC-002
```

throughout the application.

Create:

```text
Organization
Location
Practitioner
PractitionerRole
```

relationships.

---

# 8. USER IDENTITY

Introduce proper authenticated identities.

Roles should conceptually support:

```text
ASHA
ANM
CHO
MEDICAL_OFFICER
SPECIALIST
FACILITY_ADMIN
DISTRICT_OFFICER
SYSTEM_ADMIN
```

Do not overcomplicate the RBAC model.

But make it extensible.

---

# 9. JWT AUTHENTICATION

Implement proper authentication in NestJS.

Use:

```text
access token
refresh token
```

or another secure token architecture appropriate for the prototype.

Requirements:

* password hashing
* token expiration
* refresh handling
* logout/revocation strategy
* secure token storage
* authentication guards
* unauthorized response
* invalid token response

Do NOT hardcode JWT secrets.

Use environment variables.

Do NOT put secrets into Git.

---

# 10. RBAC

Implement route-level authorization.

Example:

```text
ASHA
→ create/update assigned patient data
→ cannot access district analytics


MEDICAL_OFFICER
→ view patients at assigned facility
→ manage encounters
→ create referrals


SPECIALIST
→ access referred patient context
→ conduct teleconsultation
→ provide consultation outcome


DISTRICT_OFFICER
→ district-level analytics
→ facility performance
→ no unrestricted clinical editing
```

Do not implement role checks only in the frontend.

Frontend hiding is NOT authorization.

Every protected backend endpoint must enforce authorization.

---

# 11. FACILITY-LEVEL DATA ISOLATION

This is more important than basic RBAC.

A user belonging to:

```text
PHC-A
```

must not be able to request:

```text
PHC-B
```

patients merely by changing:

```text
facilityId=PHC-B
```

Prevent IDOR.

Authorization must derive facility scope from the authenticated identity.

Do NOT trust:

```text
req.body.facilityId
req.query.facilityId
```

as proof of authorization.

---

# 12. HIERARCHICAL ACCESS

Implement controlled hierarchical visibility.

For example:

```text
Sub-centre
   ↓
Parent PHC

PHC
   ↓
Parent Rural Hospital

Rural Hospital
   ↓
District Hospital

District Officer
   ↓
District facilities
```

But do not give everyone access to everything.

Define explicit policy.

Document it.

---

# 13. AUDIT LOGGING

Implement immutable audit logging for sensitive operations.

At minimum capture:

* timestamp
* user
* role
* facility
* action
* resource type
* resource ID
* request ID
* result
* reason where appropriate

Examples:

```text
PATIENT_VIEWED
PATIENT_CREATED
PATIENT_UPDATED
ENCOUNTER_CREATED
OBSERVATION_CREATED
REFERRAL_CREATED
FHIR_RESOURCE_UPDATED
FHIR_RESOURCE_ACCESSED
SYNC_PERFORMED
CONFLICT_DETECTED
```

Never log:

* passwords
* access tokens
* refresh tokens
* complete PHI payloads unnecessarily

Audit records must not be casually editable by normal users.

---

# 14. REQUEST CORRELATION

Introduce a request ID / correlation ID.

Every API request should have a traceable identifier.

Example:

```text
X-Request-ID
```

This should appear in:

* backend logs
* sync results
* audit events
* errors

This becomes extremely useful for debugging distributed synchronization.

---

# 15. SECURE THE SYNC PROTOCOL

The Phase 1 sync endpoint must now become authenticated.

Every sync operation should have:

```text
authenticated user
facility
device
operation ID
FHIR resource
```

The backend must verify:

```text
Does this authenticated user have permission
to create/update this resource
for this facility?
```

Do NOT trust facility information supplied by the client.

---

# 16. DEVICE IDENTITY

Introduce a stable device identifier.

Conceptually:

```text
User
  ↓
Device
  ↓
Facility
```

A sync operation should be attributable to:

```text
user
device
facility
timestamp
```

Do not use a random device ID generated every app launch.

---

# 17. SECURE LOCAL STORAGE

Assess whether plain SQLite is acceptable for the prototype's threat model.

At minimum:

* no secrets in SQLite
* no access tokens in plaintext database
* no credentials stored in database
* sensitive configuration secured
* secure storage for tokens

Use platform secure storage where required.

If full database encryption is implemented, document exactly what it protects and what it does not.

Do not claim "HIPAA compliant" or "fully encrypted" without evidence.

---

# 18. FHIR RESOURCE SET

The canonical clinical model should support at least:

```text
Patient
Practitioner
PractitionerRole
Organization
Location
Encounter
Observation
Condition
MedicationRequest
ServiceRequest
Task
Appointment
DiagnosticReport
CarePlan
Consent
Provenance
```

Do not implement every FHIR resource.

Implement the subset needed for Setu's actual workflows.

---

# 19. PATIENT LONGITUDINAL RECORD

Replace the current mock patient history.

The patient profile must retrieve real FHIR data.

Conceptually:

```text
Patient
 ├── Encounters
 ├── Observations
 ├── Conditions
 ├── Medications
 ├── DiagnosticReports
 ├── ServiceRequests
 ├── Tasks
 ├── Appointments
 ├── CarePlans
 └── Provenance
```

Do not return hardcoded `_mockHistoryResponse`.

If no data exists, return an honest empty state.

---

# 20. PATIENT TIMELINE

Build a real timeline from FHIR resources.

Example:

```text
31 Aug 2026
ANC consultation
│
├─ BP 150/100
├─ Hb 9.2 g/dL
├─ High-risk triage
└─ Referral to Rural Hospital


14 Aug 2026
ANC follow-up
│
└─ BP 130/85
```

The timeline must be generated from actual resources.

---

# 21. PROVENANCE

For important clinical events, preserve:

```text
who
where
when
```

Use FHIR-compatible provenance concepts where appropriate.

For example:

```text
Observation
created by:
Practitioner X
at:
PHC Y
on:
timestamp
```

This is especially important in multi-facility workflows.

---

# 22. CONSENT

Introduce a basic consent model.

Do not create a fake "I agree" checkbox and call it consent management.

At minimum support:

```text
purpose
patient
status
timestamp
actor
scope
```

Use FHIR `Consent` where appropriate.

Define what the consent actually permits.

---

# 23. EMERGENCY ACCESS

Design a controlled emergency-access path.

Example:

A patient arrives at a facility where the normal access relationship is unavailable.

The system should allow authorized emergency access to the minimum required information.

But:

```text
Emergency access
≠
unrestricted access
```

Require:

* explicit reason
* audit event
* restricted scope
* post-event visibility

This directly supports the SIH requirement for emergency escalation.

---

# 24. FHIR VERSIONING

Use actual FHIR resource version semantics where available.

For updates:

```text
If-Match
ETag
versionId
```

or the correct HAPI FHIR mechanism.

Do not invent a parallel versioning system if FHIR already provides the required mechanism.

The local sync system may maintain its own metadata, but it must map correctly to server resource versions.

---

# 25. CONDITIONAL OPERATIONS

Where appropriate, support safe conditional operations.

Example:

```text
conditional patient search
```

to prevent duplicate creation when identity is already known.

Be careful with matching.

Never automatically merge patients solely on fuzzy matching.

---

# 26. REMOVE MOCK DATA

After real FHIR retrieval works, remove or isolate:

* `_mockHistoryResponse`
* hardcoded patient records
* hardcoded facility identifiers
* fake authentication
* fake users
* fake access control
* fake ABDM responses

Mock data may remain only inside explicit development/test fixtures.

Never silently fall back to mock healthcare data in production code.

This is a critical requirement.

---

# 27. ABDM — DO NOT FAKE IT

Do not implement a fake ABDM API and claim ABDM integration.

Instead create a clean interoperability boundary.

Document:

```text
Setu FHIR R4
      ↓
ABDM integration adapter
      ↓
ABDM ecosystem
```

If a real ABDM integration cannot be performed in this prototype, implement:

* standards-compatible FHIR resources
* explicit adapter interfaces
* valid resource mappings
* integration documentation
* test fixtures

Clearly label unavailable external integrations as:

```text
INTEGRATION BOUNDARY
```

not "LIVE ABDM."

---

# 28. API SECURITY

Audit every endpoint.

For every endpoint document:

```text
Authentication
Authorization
Facility scope
Allowed roles
Resource scope
Audit event
```

Create a matrix:

| Endpoint | Auth | Roles | Facility Scope | Audit |
| -------- | ---- | ----- | -------------- | ----- |

Pay particular attention to:

* patient endpoints
* sync
* referrals
* teleconsultation
* stock
* queue
* dashboard
* FHIR search
* FHIR resource access

---

# 29. SECURITY TESTS

Implement tests for:

### Unauthenticated access

```text
GET /patients
→ 401
```

### Invalid token

```text
→ 401
```

### Wrong role

```text
→ 403
```

### Cross-facility access

```text
PHC-A user
→ PHC-B patient
→ 403
```

### IDOR

Changing a patient ID must not bypass authorization.

### Sync authorization

A user must not be able to sync resources belonging to another facility.

### Audit

Sensitive operations generate audit events.

---

# 30. CLINICAL SAFETY BOUNDARY

Do not make the authentication/FHIR phase accidentally introduce unsafe clinical behavior.

The system should clearly distinguish:

```text
Clinical data
Decision support
Clinical decision
```

The platform may support clinicians.

It must not imply:

```text
AI diagnosed the patient
```

without appropriate validation.

---

# 31. DEMO SCENARIO

At the end of Phase 2, this must be demonstrable:

```text
ASHA logs in
      ↓
Assigned to Sub-centre A
      ↓
Creates patient offline
      ↓
Patient syncs
      ↓
Patient receives canonical FHIR ID
      ↓
PHC doctor logs in
      ↓
Doctor can access that patient
      ↓
Doctor cannot access PHC-B patient
      ↓
Doctor opens longitudinal timeline
      ↓
Real FHIR resources are displayed
      ↓
Every important action appears in audit log
```

This should be REAL.

No mock fallback.

No hardcoded patient history.

---

# 32. MIGRATION STRATEGY

Do not destroy Phase 1 data.

Create a controlled migration.

```text
Phase 1 custom FHIR JSON store
             ↓
validation
             ↓
FHIR server
             ↓
verification
             ↓
old store becomes deprecated
```

Document exactly when the old table becomes unused.

---

# 33. OBSERVABILITY

Add:

* structured logs
* request IDs
* sync IDs
* user IDs
* facility IDs
* resource IDs
* error codes
* audit IDs

Never log unnecessary PHI.

---

# 34. PERFORMANCE

Do not make the patient timeline require dozens of sequential network calls.

Use appropriate:

* batching
* FHIR search
* `_include`
* `_revinclude`
* `$everything`
* transaction/bundle operations

where appropriate and supported.

Measure actual API performance.

---

# 35. TEST DATA

Create realistic but clearly synthetic test data.

Example hierarchy:

```text
District: Pune-Demo
│
├── District Hospital
│
├── Rural Hospital A
│
├── PHC A
│   ├── Sub-centre A1
│   └── Sub-centre A2
│
└── PHC B
    ├── Sub-centre B1
    └── Sub-centre B2
```

Create:

* users
* practitioners
* facilities
* patients
* encounters
* observations
* referrals

Use synthetic data only.

---

# 36. DEFINITION OF DONE

Phase 2 is NOT complete unless:

### Authentication

* [ ] JWT authentication
* [ ] secure password handling
* [ ] token expiration
* [ ] protected APIs
* [ ] no hardcoded secrets

### Authorization

* [ ] RBAC
* [ ] facility scoping
* [ ] hierarchical access
* [ ] IDOR protection
* [ ] backend-enforced permissions

### Identity

* [ ] canonical FHIR Patient IDs
* [ ] stable UUIDs
* [ ] duplicate detection
* [ ] practitioner identity
* [ ] facility identity
* [ ] device identity

### FHIR

* [ ] real FHIR server integration
* [ ] Patient
* [ ] Encounter
* [ ] Observation
* [ ] Condition
* [ ] Practitioner
* [ ] Organization
* [ ] Location
* [ ] Provenance
* [ ] real longitudinal record

### Security

* [ ] audit logs
* [ ] request IDs
* [ ] secure token storage
* [ ] no PHI in unnecessary logs
* [ ] cross-facility isolation

### Sync

* [ ] authenticated sync
* [ ] facility-aware sync
* [ ] resource-level authorization
* [ ] version-aware updates

### Mock removal

* [ ] no hardcoded patient history
* [ ] no fake auth
* [ ] no silent FHIR fallback to mock data
* [ ] no fake ABDM claim

### Testing

* [ ] 401 test
* [ ] 403 test
* [ ] IDOR test
* [ ] cross-facility test
* [ ] FHIR validation test
* [ ] duplicate patient test
* [ ] audit test
* [ ] authenticated offline sync test

---

# 37. FINAL REPORT

After implementation, provide:

## A. Phase 1 Audit

What was actually found broken.

## B. Architecture Before

Current architecture.

## C. Architecture After

New architecture.

## D. Authentication Architecture

Explain users, tokens, roles and sessions.

## E. Authorization Matrix

Show roles × capabilities × facility scope.

## F. Patient Identity Model

Explain canonical IDs and duplicate detection.

## G. FHIR Architecture

Explain exactly which resources are now persisted through the FHIR server.

## H. Migration

Explain how the Phase 1 custom store was migrated/deprecated.

## I. Security

List vulnerabilities fixed.

## J. Tests

List actual tests run and results.

Do NOT claim tests passed if they were not actually executed.

## K. Demo Procedure

Provide a complete judge demonstration.

## L. Remaining Risks

Be brutally honest.

## M. Phase 3 Recommendation

Recommend the next phase based on the ACTUAL implementation.

STOP.

Do not automatically begin Phase 3.
