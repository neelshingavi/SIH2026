Yes. I went much deeper than looking for generic “healthcare app” repositories. I searched specifically for projects that map to the **actual requirements of SIH 26133**: rural/community health workers, offline-first operation, longitudinal records, FHIR/ABDM, teleconsultation, triage, referrals, appointments/queues, maternal/child follow-up, medicine availability, diagnostics, and government dashboards.

One important distinction: **I would not clone one giant healthcare repo and try to modify it.** For a SIH prototype, the strongest approach is to take the *best proven implementation ideas/components from several mature open-source projects* and build one coherent prototype around them.

---

# 1. The repos I would actually use

Here is my ranking for your SIH prototype.

| Rank | Repository                          | SIH relevance | What I would take                                                             |
| ---- | ----------------------------------- | ------------- | ----------------------------------------------------------------------------- |
| 🥇   | **OpenSRP FHIR Core**               | ⭐⭐⭐⭐⭐         | Offline-first frontline-worker architecture + FHIR data model + dynamic forms |
| 🥈   | **OpenMRS Patient Management**      | ⭐⭐⭐⭐⭐         | Patient registration, appointments, queues, patient search                    |
| 🥉   | **OpenMRS Patient Queueing**        | ⭐⭐⭐⭐⭐         | Triage priority + queue state machine                                         |
| 4    | **DHIS2 Android Capture**           | ⭐⭐⭐⭐⭐         | Robust offline data collection/synchronization                                |
| 5    | **OpenLMIS Stock Management**       | ⭐⭐⭐⭐⭐         | Medicine inventory/stock movement model                                       |
| 6    | **ABDM Wrapper**                    | ⭐⭐⭐⭐⭐         | ABHA + HIP/HIU + consent + FHIR exchange                                      |
| 7    | **Bahmni**                          | ⭐⭐⭐⭐⭐         | Real-world Indian EMR workflow                                                |
| 8    | **HCW@Home**                        | ⭐⭐⭐⭐          | Teleconsultation/video/chat                                                   |
| 9    | **OpenSRP CHW Client**              | ⭐⭐⭐⭐          | ANC/PNC/child-health workflows                                                |
| 10   | **OpenMRS FHIR2**                   | ⭐⭐⭐⭐          | FHIR REST architecture                                                        |
| 11   | **MedCore**                         | ⭐⭐⭐⭐          | Excellent reference for triage, queues, labs, maternity, pharmacy             |
| 12   | **DHIS2 Core**                      | ⭐⭐⭐⭐          | Government analytics/dashboard architecture                                   |
| 13   | **CureIt**                          | ⭐⭐⭐           | Queue UX inspiration                                                          |
| 14   | **Foo Medical / Medplum**           | ⭐⭐⭐           | Modern FHIR-first patient UI                                                  |
| 15   | **OpenLMIS Reference Distribution** | ⭐⭐⭐           | Integrating stock/requisition/reporting components                            |

The key repositories below are the ones I'd actually study/code from.

---

# 2. 🥇 OpenSRP FHIR Core — probably the MOST important repo

[OpenSRP FHIR Core on GitHub](https://github.com/opensrp/fhircore?utm_source=chatgpt.com)

This is almost tailor-made for one of the hardest parts of your problem.

OpenSRP FHIR Core is an **offline-capable, mobile-first healthcare platform built around FHIR and WHO Smart Guidelines**. It handles healthcare workers, patients, care teams, FHIR-based forms, encrypted local storage and synchronization. ([GitHub][1])

### What you should take from it

Do **not** copy the entire application.

Take the architecture/ideas for:

### A. Offline-first patient record

Your frontline worker should be able to do:

```text
NO INTERNET

Open patient
     ↓
View previous history
     ↓
Record vitals
     ↓
Perform triage
     ↓
Create referral
     ↓
Schedule follow-up
     ↓
Everything stored locally
     ↓
Internet comes back
     ↓
Automatic synchronization
```

This directly addresses the SIH requirement for low-connectivity environments.

### B. FHIR-native patient model

Instead of creating:

```text
Patient
Vitals
Prescription
Lab
Referral
Appointment
```

as completely proprietary objects, structure your prototype around FHIR resources:

```text
Patient
Encounter
Observation
Condition
MedicationRequest
DiagnosticReport
ServiceRequest
Task
CarePlan
Appointment
Practitioner
Organization
```

This makes your architecture much more convincing to judges.

### C. Dynamic healthcare forms

The repo supports healthcare data collection through FHIR Structured Data Capture. ([GitHub][1])

For your prototype:

```text
ANC Assessment
Child Health Assessment
Diabetes Follow-up
Hypertension Follow-up
General Triage
```

can all be represented as configurable forms instead of hardcoding every screen.

### D. Healthcare-worker identity

The repo explicitly handles:

* HCWs
* CHWs
* care teams
* patients
* locations

which maps beautifully onto:

```text
ASHA
ANM
CHO
PHC Doctor
Specialist
District Hospital
District Admin
```

### Verdict

**Use this as the conceptual foundation for your mobile/frontline-worker application.**

---

# 3. 🥈 OpenMRS Patient Management

[OpenMRS Patient Management on GitHub](https://github.com/openmrs/openmrs-esm-patient-management?utm_source=chatgpt.com)

This repository is extremely relevant because it contains frontend modules for:

* patient registration
* patient search
* patient lists
* appointments
* outpatient queues
* active visits
* bed management

([GitHub][2])

### What to use

Your PHC dashboard should borrow this information architecture:

```text
PHC Dashboard

Today's patients
────────────────────────

Emergency        2
High Priority    5
Normal           18

Queue
────────────────────────
#01  Ramesh       Waiting
#02  Sunita       With Doctor
#03  Anita        Waiting
#04  Mahesh       Completed
```

And:

```text
Patient Search
      ↓
Patient Profile
      ↓
Appointments
      ↓
Active Visit
      ↓
Queue
      ↓
Consultation
```

### Particularly useful

The repository already separates:

```text
Patient Registration
Patient Search
Appointments
Service Queues
Active Visits
```

That's almost exactly the workflow you need.

---

# 4. 🥉 OpenMRS Patient Queueing

[OpenMRS Patient Queueing Module on GitHub](https://github.com/openmrs/openmrs-module-patientqueueing?utm_source=chatgpt.com)

This one is **very important for your prototype**.

The module supports:

* patient queues
* location-based queues
* provider assignment
* waiting/picked/completed states
* priority
* triage comments
* timestamps
* provider-to-provider communication

([GitHub][3])

### This is exactly how I would implement your queue

```text
REGISTERED
    ↓
TRIAGED
    ↓
WAITING
    ↓
CALLED
    ↓
IN CONSULTATION
    ↓
COMPLETED
```

With:

```text
priority = EMERGENCY
priority = HIGH
priority = NORMAL
```

And:

```text
queue_location

Registration
Vitals
Doctor
Lab
Pharmacy
Teleconsultation
Referral
```

### Very important SIH feature

Don't create one global queue.

Create a **patient journey queue**:

```text
Registration
      ↓
Vitals
      ↓
Triage
      ↓
Doctor
      ↓
Lab
      ↓
Pharmacy
```

This demonstrates actual reduction in waiting time.

---

# 5. DHIS2 Android Capture — best reference for offline operation

[DHIS2 Android Capture App on GitHub](https://github.com/dhis2/dhis2-android-capture-app?utm_source=chatgpt.com)

DHIS2's Android Capture app is specifically designed for offline data collection. It stores data locally and synchronizes when connectivity returns. It supports tracker programs, events, datasets, validation rules and program rules. ([GitHub][4])

DHIS2's documentation explicitly distinguishes intermittent connectivity from fully offline operation and recommends its Android Capture app for environments without reliable internet. ([GitHub][5])

### What you should steal conceptually

Your app should display:

```text
● Offline

Last synced:
Today, 10:42 AM

Pending:
7 records

[ Sync Now ]
```

And locally maintain:

```text
Local DB
   │
   ├── patients
   ├── observations
   ├── encounters
   ├── referrals
   ├── appointments
   └── sync_queue
                │
                ▼
        Internet available
                │
                ▼
         Sync Engine
                │
                ▼
         Central Server
```

### This is a huge SIH differentiator.

Most hackathon teams will make:

```text
React → API → Database
```

and call it "offline support."

You should actually demonstrate:

> **Turn internet off → create patient → perform triage → create referral → turn internet on → synchronization occurs.**

That is a powerful live demo.

---

# 6. OpenLMIS — medicine availability

This is another **must-use reference**.

[OpenLMIS Stock Management on GitHub](https://github.com/OpenLMIS/openlmis-stockmanagement?utm_source=chatgpt.com)

OpenLMIS is specifically designed for medical commodity distribution in low- and middle-income countries. Its stock-management service manages stock cards and stock movements. ([GitHub][6])

### Don't build a generic pharmacy.

Build:

```text
MEDICINE AVAILABILITY
```

For example:

```text
PHC HADAPSAR

Medicine                Stock       Status

Paracetamol             248         AVAILABLE
Amoxicillin              12         LOW
Metformin                0          OUT OF STOCK
ORS                     156         AVAILABLE
Insulin                   4         LOW
```

Then:

```text
Metformin
    ↓
Unavailable at PHC
    ↓
Nearby facilities
    ↓

Rural Hospital A       43 units
PHC B                  21 units
District Hospital      89 units
```

### The important concept from OpenLMIS

Use **stock movements**, not just:

```text
medicine.stock = 100
```

Model:

```text
RECEIVED
DISPENSED
TRANSFERRED
ADJUSTED
EXPIRED
DAMAGED
```

That makes your medicine module much more credible.

---

# 7. ABDM Wrapper — critical for India

[NHA ABDM Wrapper on GitHub](https://github.com/NHA-ABDM/ABDM-wrapper?utm_source=chatgpt.com)

This is one of the strongest repositories for making your prototype **India-specific rather than generic healthcare software**.

The wrapper includes:

### Patient

* patient storage
* patient retrieval
* consent details

### HIP

* linking
* discovery
* user-initiated linking
* scan and share
* FHIR-based data transfer

### HIU

* consent creation
* health-information exchange

([GitHub][7])

### Your prototype should show

```text
Patient
   │
   ▼
ABHA ID
   │
   ▼
Care Context
   │
   ▼
Consent
   │
   ▼
FHIR Health Record
```

You don't necessarily need to make the actual ABDM sandbox integration the core of your demo.

Instead, demonstrate:

> **"Our architecture is ABDM-ready."**

And have a simulated:

```text
ABHA: 91-XXXX-XXXX-XXXX

Linked Care Contexts

✓ PHC Pune
✓ District Hospital Pune
✓ Diagnostic Centre
```

---

# 8. Bahmni — VERY important because it is actually used in India

[Bahmni on GitHub](https://github.com/Bahmni?utm_source=chatgpt.com)

Bahmni is an open-source hospital/EMR platform built on OpenMRS, OpenELIS and Odoo. ([GitHub][8])

Its repositories include:

* EMR
* appointments
* laboratory
* FHIR
* patient management
* reports
* IPD
* medication
* clinical workflows

([GitHub][9])

And importantly, Bahmni has been deployed in low-resource environments, including India. A Bahmni project description says it has been used across 600+ facilities globally, including India and several other countries. ([GitHub][10])

### What I would take

Study its **clinical workflow**, not its entire codebase.

Your patient profile should resemble:

```text
PATIENT

Sunita Sharma
Female | 32 years
ABHA: XXXX

────────────────────────

Current Visit
  BP       150/95
  Pulse    82
  SpO₂     97%

Conditions
  Hypertension

Medications
  Amlodipine

Previous Visits
  12 Aug
  20 Jul
  16 Jun

Referrals
  District Hospital
```

### Particularly interesting

Bahmni also has FHIR-related modules, including FHIR export and diagnostic report extensions. ([GitHub][11])

---

# 9. HCW@Home — use this ONLY for teleconsultation

[HCW@Home on GitHub](https://github.com/HCW-home/hcw?utm_source=chatgpt.com)

This is a much better starting point for teleconsultation than building WebRTC from scratch.

It provides:

* video
* audio
* WebRTC
* chat
* file sharing
* screen sharing
* multi-party consultations
* patient invitations

([GitHub][12])

### Your flow

Don't make:

```text
Patient → Doctor
```

Make:

```text
Patient
   ↓
ANM / CHW
   ↓
Triage
   ↓
Specialist required?
   ↓ YES
Teleconsultation Request
   ↓
Specialist Queue
   ↓
Video Consultation
   ↓
Consultation Notes
   ↓
Prescription
   ↓
Follow-up / Referral
```

That's much more aligned with the problem statement.

---

# 10. OpenSRP CHW Client — excellent for ASHA/ANM workflows

[OpenSRP CHW Client on GitHub](https://github.com/opensrp/opensrp-client-chw?utm_source=chatgpt.com)

This is specifically a community-health-worker application.

It includes workflows for:

* child health
* antenatal care
* postnatal care
* malaria
* stock management
* family planning
* household registration
* peer-to-peer sync

([GitHub][13])

### This is extremely relevant to your SIH problem.

I'd take its **workflow philosophy** for:

```text
ASHA / ANM Home Visit
       ↓
Patient/Family
       ↓
Risk assessment
       ↓
ANC/PNC/Child assessment
       ↓
High-risk flag
       ↓
Referral
       ↓
Follow-up
```

### Example

```text
Pregnancy Follow-up

Gestational Age: 28 weeks

BP: 150/100
Hb: 8.2 g/dL
Swelling: YES

⚠ HIGH-RISK

Recommended:
→ PHC consultation
→ Doctor review
→ District referral
```

That is much more meaningful than a generic AI chatbot.

---

# 11. OpenMRS FHIR2

[OpenMRS FHIR2 on GitHub](https://github.com/openmrs/openmrs-module-fhir2?utm_source=chatgpt.com)

This provides a FHIR REST API for OpenMRS and is initially based around FHIR R4. ([GitHub][14])

### Use it for

Your backend API architecture:

```text
GET /fhir/Patient
GET /fhir/Observation
GET /fhir/Encounter
GET /fhir/Condition
GET /fhir/MedicationRequest
GET /fhir/DiagnosticReport
GET /fhir/ServiceRequest
GET /fhir/Task
```

You don't have to deploy OpenMRS itself.

Use the **FHIR resource structure**.

---

# 12. MedCore — surprisingly useful for your prototype

[MedCore on GitHub](https://github.com/Globussoft-Technologies/medcore?utm_source=chatgpt.com)

This is one of the repositories I'd inspect closely for **specific workflow ideas**.

It has:

### OPD

* appointments
* walk-in queue
* token generation
* live queue updates
* vulnerability flagging

### Emergency

* 5-level triage
* MEWS/GCS/RTS
* live emergency board

### Lab

* test ordering
* results
* critical-value alerts
* turnaround-time tracking

### Maternity

* antenatal workflow
* risk scoring
* partograph

### Pediatrics

* growth charts
* immunization

([GitHub][15])

### Don't copy the whole thing.

Take:

**Emergency triage → Lab → Maternity → Pediatric workflows.**

For your prototype, even a simplified triage engine is enough:

```text
Patient arrives

        ↓

SpO₂ < 90?
        │
       YES
        ↓
   EMERGENCY

BP > threshold?
        │
       YES
        ↓
    HIGH RISK

Otherwise
        ↓
     NORMAL
```

But be very careful to present prototype rules as **decision-support**, not autonomous diagnosis.

---

# 13. DHIS2 Core — government dashboard architecture

[DHIS2 Core on GitHub](https://github.com/dhis2/dhis2-core?utm_source=chatgpt.com)

DHIS2 is a massive open-source health information system supporting:

* data capture
* management
* validation
* analytics
* dashboards
* visualization
* GIS
* REST APIs
* Android clients

([GitHub][16])

### What you should borrow

Your district dashboard should look conceptually like:

```text
PUNE DISTRICT HEALTH DASHBOARD

────────────────────────────────────

Facilities             84
Patients today       12,842
Teleconsultations       326
Pending referrals       118
High-risk patients      742

────────────────────────────────────

Referral completion
██████████████████░░ 89%

Medicine availability
███████████████░░░░░ 76%

Average waiting time
             31 min

High-risk follow-up
█████████████████░░░ 84%
```

Then map facilities:

```text
                 DISTRICT
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
         PHC       PHC       PHC
          │         │         │
        SCs       SCs       SCs
```

---

# 14. OpenLMIS Reference UI

[OpenLMIS Reference UI on GitHub](https://github.com/OpenLMIS/openlmis-reference-ui?utm_source=chatgpt.com)

This one has an especially useful property for your use case:

**It is explicitly designed for offline and low-bandwidth environments.** ([GitHub][17])

Its modules include:

* authentication
* fulfillment
* reference data
* reporting
* requisitions
* UI components

So for your medicine dashboard, study its:

```text
Reference data
      ↓
Stock
      ↓
Requisition
      ↓
Fulfillment
      ↓
Reporting
```

architecture.

---

# 15. OpenLMIS Requisition

[OpenLMIS Requisition on GitHub](https://github.com/OpenLMIS/openlmis-requisition?utm_source=chatgpt.com)

This is useful for your **medicine shortage escalation**.

Imagine:

```text
PHC A

Paracetamol     20
ORS             15
Metformin        0  ← OUT OF STOCK
```

Instead of merely showing:

> Out of stock

your prototype can demonstrate:

```text
Metformin unavailable

        ↓

Create stock request

        ↓

District Pharmacy

        ↓

Approved

        ↓

Transferred to PHC

        ↓

Stock updated
```

That addresses **medicine availability visibility + accountability**.

---

# 16. CureIt — useful UX reference, NOT architecture

[CureIt on GitHub](https://github.com/aryamagarwal/cureit?utm_source=chatgpt.com)

This repository has:

* appointment booking
* live queue
* token/status management
* real-time updates
* consultation history

([GitHub][18])

### What I'd take

Only the UX idea:

```text
Your Token

       #17

Currently Serving

       #12

Estimated Wait

       24 min
```

This directly addresses:

> reduced travel and waiting time

But **don't base your backend architecture on this**. OpenMRS/DHIS2/OpenSRP are much stronger foundations.

---

# 17. Foo Medical / Medplum

[Foo Medical on GitHub](https://github.com/medplum/foomedical?utm_source=chatgpt.com)

This is a modern open-source medical application with:

* patient registration
* health records
* lab results
* medications
* vaccines
* vitals
* messaging
* care plans
* scheduling

and its data is represented using FHIR. ([GitHub][19])

### Use it for

**Modern UI inspiration.**

Particularly:

```text
Patient
 ├── Vitals
 ├── Labs
 ├── Medications
 ├── Conditions
 ├── Care Plans
 └── Appointments
```

---

# 18. The repo I DON'T want you to overlook: OpenHIM/OpenHIE ecosystem

For the eventual architecture, investigate the OpenHIE/OpenHIM ecosystem as an interoperability reference.

The key idea is:

```text
                Patient App
                     │
CHW App ─────────────┤
                     │
PHC EMR ─────────────┤
                     │
Lab ─────────────────┤
                     │
Pharmacy ────────────┤
                     ▼
             Interoperability
                  Layer
                     │
                     ▼
              FHIR / ABDM
```

This is much better than:

```text
Every system ↔ Every system
```

which becomes a nightmare.

---

# 19. There are also some VERY interesting India-specific repos

## ABDM FHIR examples

[ABDM FHIR Bundle Examples on GitHub](https://github.com/Nirmitee-tech/abdm-fhir-bundle-examples?utm_source=chatgpt.com)

This repository provides examples for six ABDM health-information types, including:

* OPConsultation
* Prescription
* DiagnosticReport
* DischargeSummary
* ImmunizationRecord
* WellnessRecord

([GitHub][20])

### Use this directly for your demo data.

For example:

```text
OPConsultation
Prescription
DiagnosticReport
WellnessRecord
```

can be your FHIR export options.

---

## ABDM V3 Postman Collection

[ABDM V3 Postman Collection on GitHub](https://github.com/Nirmitee-tech/abdm-v3-postman-collection?utm_source=chatgpt.com)

This covers ABDM V3 APIs across:

```text
M1 → ABHA
M2 → HIP
M3 → HIU
```

and includes sandbox/production environments. ([GitHub][21])

This is useful when you eventually want to demonstrate an actual ABDM sandbox interaction rather than a mock.

---

# 20. Interesting newer repo: CureNet

[CureNet on GitHub](https://github.com/labishbardiya/CureNet?utm_source=chatgpt.com)

This one is interesting because it combines:

* ABDM
* offline-first storage
* OCR
* FHIR
* multilingual AI
* document processing
* QR sharing

The project describes generating FHIR R4 bundles containing resources such as `Composition`, `Patient`, `Practitioner`, `Organization`, `Encounter`, `MedicationRequest`, `DiagnosticReport`, and `Observation`. ([GitHub][22])

### What I'd take

Not the whole AI assistant.

I'd take the idea:

```text
Paper prescription
       ↓
Camera
       ↓
OCR
       ↓
Structured data
       ↓
FHIR
       ↓
Patient record
```

This gives your prototype a very nice **"digitization of fragmented rural records"** feature.

---

# 21. A repo I would NOT prioritize

There are hundreds of GitHub repositories named things like:

```text
Hospital Management System
Doctor Appointment System
Telemedicine App
Healthcare Management
Medical Chatbot
```

Most are student CRUD applications.

For example, there are simple appointment/video-call projects such as Medi-Connect and Telemedicine-App. ([GitHub][23])

They can provide UI inspiration, but I would **not** build the SIH architecture around them.

The reason is simple:

They generally solve:

```text
Patient → Doctor → Appointment
```

while SIH 26133 is asking for:

```text
Community
   ↓
Sub-centre
   ↓
PHC
   ↓
Rural Hospital
   ↓
District Hospital
   ↓
Specialist
```

with continuity throughout the journey.

---

# 22. The architecture I recommend after studying these repos

This is where all the repositories come together.

## Layer 1 — Frontline Worker App

Base the architecture primarily on:

**OpenSRP FHIR Core + OpenSRP CHW Client + DHIS2 Android**

```text
┌─────────────────────────────────────┐
│       FRONTLINE WORKER APP          │
├─────────────────────────────────────┤
│ Patient Search                      │
│ Patient Registration                │
│ Household                           │
│ Vitals                              │
│ Digital Triage                      │
│ ANC / PNC                           │
│ Child Health                        │
│ Chronic Care                        │
│ Referral                            │
│ Follow-up                           │
│ Medicine Availability               │
└──────────────────┬──────────────────┘
                   │
              OFFLINE DB
                   │
             SYNC ENGINE
```

---

# 23. Layer 2 — PHC Dashboard

Use ideas from:

**OpenMRS Patient Management + Patient Queueing + Bahmni**

```text
┌─────────────────────────────────────────┐
│              PHC DASHBOARD              │
├─────────────────────────────────────────┤
│ Today's Patients     127                │
│ Waiting               18                │
│ High Risk              7                │
│ Emergency              2                │
├─────────────────────────────────────────┤
│ QUEUE                                   │
│                                         │
│ #17 Sunita       HIGH       Waiting     │
│ #18 Raj          NORMAL     Waiting     │
│ #19 Anita        EMERGENCY  Priority    │
└─────────────────────────────────────────┘
```

---

# 24. Layer 3 — Digital Triage

Take workflow ideas from:

**OpenMRS Queueing + MedCore**

The key is:

```text
Symptoms
Vitals
Medical history
Risk factors
       ↓
Triage Engine
       ↓
┌──────────┬──────────┬─────────────┐
│ Emergency│ High Risk│ Normal      │
└──────────┴──────────┴─────────────┘
```

Then:

```text
Emergency
    ↓
Immediate escalation

High Risk
    ↓
Doctor / specialist

Normal
    ↓
Routine queue
```

Don't market it as "AI diagnosis."

Market it as:

> **AI-assisted clinical triage and escalation support.**

---

# 25. Layer 4 — Teleconsultation

Use:

**HCW@Home**

Architecture:

```text
PHC
 │
 │ teleconsult request
 ▼
Specialist Queue
 │
 ▼
Doctor accepts
 │
 ▼
WebRTC
 │
 ├── Video
 ├── Audio
 ├── Chat
 └── File/Image
 │
 ▼
Consultation note
 │
 ▼
FHIR Encounter
```

---

# 26. Layer 5 — Longitudinal Patient Record

Use:

**OpenSRP FHIR Core + OpenMRS FHIR2 + Bahmni**

The patient's record becomes:

```text
PATIENT
│
├── Demographics
│
├── Conditions
│
├── Encounters
│    ├── PHC
│    ├── Rural Hospital
│    └── District Hospital
│
├── Observations
│    ├── BP
│    ├── SpO2
│    ├── Hb
│    └── Weight
│
├── Diagnostics
│
├── Medications
│
├── Referrals
│
├── Appointments
│
└── Care Plans
```

And export it as FHIR.

---

# 27. Layer 6 — Referral Tracking

This is one area where I would add your **own UX**, but use FHIR `Task`/workflow concepts.

The referral should have a lifecycle:

```text
CREATED
   ↓
ACCEPTED
   ↓
PATIENT NOTIFIED
   ↓
PATIENT TRAVELLED
   ↓
ARRIVED
   ↓
CONSULTED
   ↓
TREATMENT
   ↓
COMPLETED
   ↓
FOLLOW-UP
```

The dashboard should show:

```text
REFERRALS

Total             84

Pending           13
Accepted          61
Completed         48
Overdue            7
```

This is an excellent **accountability** feature.

---

# 28. Layer 7 — Medicine Availability

Use:

**OpenLMIS Stock Management**

```text
             DISTRICT
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
     PHC-A      PHC-B      RH-A
      │          │          │
   Medicine   Medicine   Medicine
    Stock       Stock      Stock
```

Then patient-facing:

```text
Prescription
      ↓
Medicine unavailable
      ↓
Nearby facility search
      ↓
Availability
      ↓
Directions
```

---

# 29. Layer 8 — Diagnostics

Use the clinical/FHIR concepts from:

**Bahmni + MedCore + FHIR**

Workflow:

```text
Doctor
  ↓
Diagnostic order
  ↓
Nearest available lab
  ↓
Sample collection
  ↓
Processing
  ↓
Result
  ↓
DiagnosticReport
  ↓
Doctor
  ↓
Patient record
```

For the prototype, you can show:

```text
Hb        8.2 g/dL       ⚠ LOW
Glucose   178 mg/dL      ⚠ HIGH
SpO₂      96%            ✓
```

---

# 30. Layer 9 — District Dashboard

Base it on:

**DHIS2**

Show:

```text
PUNE DISTRICT

Patients today                 12,842
Teleconsultations                  326
Referrals                           842
Referral completion                 89%
Average waiting time             31 min
High-risk follow-up                 84%

Medicine availability               76%
Diagnostic availability             81%
```

And then:

### Facility comparison

```text
Facility        Wait    Referral    Medicine
──────────────────────────────────────────────
PHC A           22m       94%         91%
PHC B           41m       81%         63%
PHC C           27m       89%         78%
PHC D           55m       72%         52%
```

This gives government officials something actionable.

---

# 31. The killer workflow for your SIH demo

I would build **one extremely polished patient journey** rather than 50 disconnected features.

## Patient: High-risk pregnant woman

### Step 1 — ASHA

```text
ASHA opens patient

Sunita
28 weeks pregnant

BP: 150/100
Hb: 8.2

⚠ HIGH RISK
```

### Step 2 — Offline

Turn off Wi-Fi.

ASHA records:

```text
Assessment
Referral
Follow-up
```

Everything works.

---

### Step 3 — Connectivity returns

```text
7 records pending synchronization

[SYNC]

✓ Patient synchronized
✓ Observation synchronized
✓ Referral synchronized
✓ Care plan synchronized
```

---

### Step 4 — PHC receives referral

Doctor sees:

```text
HIGH-RISK REFERRAL

Sunita Sharma
28 weeks

Reason:
BP 150/100
Hb 8.2

Previous history:
...
```

---

### Step 5 — Specialist required

Doctor clicks:

**Request Specialist Consultation**

```text
Available Specialists

Obstetrics
Dr. Mehta
Available now

[START TELECONSULT]
```

---

### Step 6 — Teleconsult

HCW@Home-style:

```text
┌──────────────────┐
│                  │
│   SPECIALIST     │
│                  │
└──────────────────┘

Patient vitals
Patient history
Previous reports

[Prescription]
[Referral]
[Complete]
```

---

### Step 7 — Referral to district hospital

```text
Referral created

PHC
 ↓
Rural Hospital
 ↓
District Hospital

Status:
ACCEPTED
```

---

### Step 8 — District hospital

The doctor receives the **same longitudinal record**.

No:

> "Bring your previous reports."

No:

> "What medicines are you taking?"

The information is already there.

---

### Step 9 — Follow-up

```text
FOLLOW-UP

Next visit:
02 September

Assigned:
ANM - PHC A

Status:
PENDING
```

---

### Step 10 — Government dashboard

The district administrator sees:

```text
HIGH-RISK MATERNAL CASE

Identified at:
Sub-centre

Consulted:
PHC

Specialist:
YES

Referral:
COMPLETED

Follow-up:
SCHEDULED
```

**That single story demonstrates almost the entire SIH problem statement.**

---

# 32. The actual repository stack I would use

If I were on your team, I'd divide it like this:

```text
                    YOUR SIH PLATFORM
                           │
       ┌───────────────────┼───────────────────┐
       │                   │                   │
       ▼                   ▼                   ▼
  FRONTLINE APP        PHC SYSTEM       DISTRICT DASHBOARD
       │                   │                   │
       │                   │                   │
 OpenSRP FHIR         OpenMRS/Bahmni       DHIS2
 FHIR Core            Patient Mgmt
       │                   │
       │                   │
 DHIS2 Android        Queueing
 Capture                  │
       │                   │
       └──────────────┬────┘
                      │
                      ▼
                 FHIR LAYER
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       ABDM         HAPI FHIR    FHIR APIs
       Wrapper
          │
          ▼
    NATIONAL HEALTH
       ECOSYSTEM


   TELECONSULTATION
          │
          ▼
      HCW@Home


   MEDICINE SUPPLY
          │
          ▼
       OpenLMIS


   DIAGNOSTICS
          │
          ▼
       FHIR/Bahmni
```

---

# 33. What I would actually clone/study

Don't clone 20 repositories into your project.

I'd make a research directory like:

```text
sih-research/

01-opensrp-fhircore
02-opensrp-chw
03-openmrs-patient-management
04-openmrs-queueing
05-dhis2-android
06-openlmis-stock
07-abdm-wrapper
08-bahmni
09-hcw-at-home
10-medcore
11-dhis2
12-abdm-fhir-examples
```

Then **your actual application remains a separate repository**.

---

# 34. My final priority ranking

### 🔴 MUST STUDY

**1. OpenSRP FHIR Core**

Offline + FHIR + frontline worker architecture. ([GitHub][1])

**2. OpenMRS Patient Management**

Patient + appointment + queue UX. ([GitHub][2])

**3. OpenMRS Patient Queueing**

Queue/priority/triage workflow. ([GitHub][3])

**4. OpenLMIS Stock Management**

Medicine stock and movement. ([GitHub][6])

**5. ABDM Wrapper**

India + ABHA + consent + FHIR exchange. ([GitHub][7])

**6. DHIS2 Android Capture**

Real offline operation. ([GitHub][4])

---

### 🟠 VERY IMPORTANT

**7. Bahmni**

Real-world EMR/Indian healthcare workflows. ([GitHub][8])

**8. OpenSRP CHW**

Maternal/child/community-health workflows. ([GitHub][13])

**9. HCW@Home**

Teleconsultation. ([GitHub][12])

**10. MedCore**

Triage + lab + maternity + pharmacy workflow ideas. ([GitHub][15])

---

### 🟡 REFERENCE / UI / ARCHITECTURE

**11. DHIS2 Core**

Government analytics. ([GitHub][16])

**12. OpenMRS FHIR2**

FHIR REST architecture. ([GitHub][14])

**13. OpenLMIS Reference UI**

Low-bandwidth inventory UX. ([GitHub][17])

**14. Foo Medical**

Modern FHIR UI. ([GitHub][19])

**15. ABDM FHIR Bundle Examples**

Actual ABDM-style demo records. ([GitHub][20])

---

# 35. One very important warning

**Do not claim that you "used OpenSRP/OpenMRS/DHIS2/ABDM" merely because you copied their UI or architecture.**

For the SIH presentation, say something like:

> **"Our architecture is inspired by proven open-source digital-health platforms including OpenSRP, OpenMRS, DHIS2 and OpenLMIS, while our prototype implements a unified rural-care workflow tailored to the SIH 26133 requirements."**

That is much more defensible.

Also check the licenses before directly incorporating code. Several of the strongest projects here are GPL/AGPL, while OpenSRP FHIR Core is Apache-2.0 and DHIS2 Core is BSD-3-Clause. ([GitHub][1])

---

## My strongest recommendation

**Do not try to make 15 features equally deep.**

For the SIH prototype, I'd make these **6 features exceptionally polished**:

```text
1. Offline-first Frontline Worker App
       ↓
2. Digital Triage + High-Risk Detection
       ↓
3. Unified Longitudinal FHIR Patient Record
       ↓
4. Referral Tracking Across Facilities
       ↓
5. Specialist Teleconsultation
       ↓
6. District Health Dashboard
```

Then add:

```text
Medicine availability
Diagnostics
Appointments/queues
Multilingual UI
ABHA/ABDM simulation
```

as supporting features.

That combination maps **almost one-to-one against the wording of SIH 26133**, while the repositories above give you proven implementations to study rather than inventing the architecture from scratch.

[1]: https://github.com/opensrp/fhircore?utm_source=chatgpt.com "GitHub - opensrp/fhircore: FHIR Core / OpenSRP 2 is a Kotlin application for delivering offline-capable, mobile-first healthcare project implementations from local community to national and international scale using FHIR and WHO Smart Guidelines on Android. · GitHub"
[2]: https://github.com/openmrs/openmrs-esm-patient-management?utm_source=chatgpt.com "GitHub - openmrs/openmrs-esm-patient-management: Frontend modules for patient management, including appointment scheduling, patient list management, registration, search and service queue management · GitHub"
[3]: https://github.com/openmrs/openmrs-module-patientqueueing?utm_source=chatgpt.com "GitHub - openmrs/openmrs-module-patientqueueing: This Module Provides functionality to Queue Patient In a Hospital with a health. Also care provider Dashboard to allow them to see the people in queue, message other providers and receive messages from other providers regarding patient care · GitHub"
[4]: https://github.com/dhis2/dhis2-android-capture-app?utm_source=chatgpt.com "GitHub - dhis2/dhis2-android-capture-app: DHIS 2 data and tracker capture app for Android · GitHub"
[5]: https://github.com/dhis2/dhis2-docs-implementation/blob/master/content/tracker_implementation/building-your-tracker-programs.md?utm_source=chatgpt.com "dhis2-docs-implementation/content/tracker_implementation/building-your-tracker-programs.md at master · dhis2/dhis2-docs-implementation · GitHub"
[6]: https://github.com/OpenLMIS/openlmis-stockmanagement?utm_source=chatgpt.com "GitHub - OpenLMIS/openlmis-stockmanagement: Stock Managment Service for OpenLMIS v3.1+ http://openlmis.org · GitHub"
[7]: https://github.com/NHA-ABDM/ABDM-wrapper?utm_source=chatgpt.com "GitHub - NHA-ABDM/ABDM-wrapper · GitHub"
[8]: https://github.com/bahmni?utm_source=chatgpt.com "Bahmni · GitHub"
[9]: https://github.com/orgs/Bahmni/repositories?utm_source=chatgpt.com "Bahmni repositories · GitHub"
[10]: https://github.com/Bahmni/openmrs-module-bahmniapps/issues/573?utm_source=chatgpt.com "[C4GT] Patient Portal to download patient record · Issue #573 · Bahmni/openmrs-module-bahmniapps · GitHub"
[11]: https://github.com/Bahmni/openmrs-module-fhir2Extension?utm_source=chatgpt.com "GitHub - Bahmni/openmrs-module-fhir2Extension · GitHub"
[12]: https://github.com/HCW-home/hcw/?utm_source=chatgpt.com "GitHub - HCW-home/hcw: New V6 rewrite HCW · GitHub"
[13]: https://github.com/opensrp/opensrp-client-chw?utm_source=chatgpt.com "GitHub - opensrp/opensrp-client-chw: Reference OpenSRP application for Community Health Workers (CHWs) · GitHub"
[14]: https://github.com/openmrs/openmrs-module-fhir2?utm_source=chatgpt.com "GitHub - openmrs/openmrs-module-fhir2: The FHIR REST API and related services for OpenMRS · GitHub"
[15]: https://github.com/Globussoft-Technologies/medcore?utm_source=chatgpt.com "GitHub - Globussoft-Technologies/medcore: MedCore — open-source HMS for clinics & hospitals · GitHub"
[16]: https://github.com/dhis2/dhis2-core?utm_source=chatgpt.com "GitHub - dhis2/dhis2-core: DHIS 2 Core. Written in Java. Contains the service layer and Web API. · GitHub"
[17]: https://github.com/OpenLMIS/openlmis-reference-ui?utm_source=chatgpt.com "GitHub - OpenLMIS/openlmis-reference-ui: The reference UI for the OpenLMIS project · GitHub"
[18]: https://github.com/aryamagarwal/cureit?utm_source=chatgpt.com "GitHub - aryamagarwal/cureit: Cureit is a user-friendly doctor appointment booking platform designed to eliminate the inconvenience of long waiting times and streamline the process of scheduling medical consultations. · GitHub"
[19]: https://github.com/medplum/foomedical?utm_source=chatgpt.com "GitHub - medplum/foomedical · GitHub"
[20]: https://github.com/Nirmitee-tech/abdm-fhir-bundle-examples?utm_source=chatgpt.com "GitHub - Nirmitee-tech/abdm-fhir-bundle-examples: Production-ready FHIR R4 bundle examples for all 6 ABDM hiTypes — OPConsultation, Prescription, DiagnosticReport, DischargeSummary, ImmunizationRecord, WellnessRecord · GitHub"
[21]: https://github.com/Nirmitee-tech/abdm-v3-postman-collection?utm_source=chatgpt.com "GitHub - Nirmitee-tech/abdm-v3-postman-collection: Complete Postman collection for ABDM V3 APIs — all endpoints, sandbox + production environments · GitHub"
[22]: https://github.com/labishbardiya/CureNet?utm_source=chatgpt.com "GitHub - labishbardiya/CureNet: CureNet AI — India's ABDM-native, offline-first clinical intelligence platform. Digitizes handwritten prescriptions and lab reports into FHIR R4 records using edge AI, with AES-256-GCM encrypted local storage. · GitHub"
[23]: https://github.com/Z3RO-O/Medi-Connect?utm_source=chatgpt.com "GitHub - Z3RO-O/Medi-Connect: Online doctor appointment booking & consultation app · GitHub"