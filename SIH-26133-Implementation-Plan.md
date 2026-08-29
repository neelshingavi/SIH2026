# SIH 2026 — Problem Statement 26133
## Implementation Plan: Integrated Rural Care-Access & Quality Support Platform

**Codename:** `Setu` (सेतु — "bridge", between community and district hospital)

---

## 0. How to read this document

This plan is organized so a 4–6 person team can split work with clean contract boundaries on day one. Each module section specifies: responsibility, tech choice + justification, data model, API contract, and acceptance criteria for the demo. Section 12 gives the exact judge-facing demo script. Section 13 gives an engineer-by-engineer task split modeled on a 3–4 engineer parallel build.

Reference implementations studied (architecture/workflow only, not code copy — see §14 for licensing notes): OpenSRP FHIR Core, OpenMRS Patient Management + Queueing, DHIS2 Android Capture, OpenLMIS Stock Management, ABDM Wrapper, Bahmni, HCW@Home, MedCore.

---

## 1. Problem → Solution Traceability Matrix

| SIH requirement (verbatim theme) | Module | Section |
|---|---|---|
| Long travel distances, specialist shortages | Teleconsultation + facility-aware referral routing | §7 |
| Fragmented medical records across sub-centre → PHC → RH → DH | Longitudinal FHIR patient record | §6 |
| Delayed referrals | Referral state machine + SLA tracking | §7.3 |
| Limited awareness of services | Facility/medicine/diagnostic availability search | §9 |
| Constrained staff/equipment at PHCs | Digital triage + queue prioritization | §5, §8 |
| Loss of continuity as patient moves between facility tiers | FHIR `Patient`/`Encounter`/`CarePlan` chain, shared across all apps | §6 |
| Connectivity | Offline-first sync engine on frontline app | §4 |
| Language, health literacy | i18n layer + icon-first UI + voice input | §10 |
| Affordability | Cost/medicine-availability transparency, no paid gating | §9 |
| Emergency escalation | Triage engine emergency flag → priority queue + auto-notify | §5.4 |
| Interoperable records on approved standards | HL7 FHIR R4 resource model + ABDM-shaped export | §6, §11 |
| Reduced travel/waiting time | Queue system + teleconsult-first triage | §8 |
| Improved referral completion | Referral dashboard with completion %, overdue flags | §7.4, §9 |
| Maternal/child/chronic follow-up | `CarePlan` + risk-flagged recall scheduler | §6.4 |
| Medicine/diagnostic availability visibility | Stock ledger + nearest-facility lookup | §9 |
| Facility dashboards / quality monitoring | District dashboard (DHIS2-style KPIs) | §9 |

---

## 2. Non-Negotiable Design Principles

1. **Strengthen, don't replace** — every module maps onto an existing public-health role (ASHA/ANM, MO at PHC, RH doctor, DH specialist, District Program Officer), not a new actor.
2. **FHIR-native from day one** — internal data model is FHIR R4 resources, not proprietary tables translated to FHIR later. This is the single highest-leverage architecture decision for judge credibility and for #6 below.
3. **Offline is a first-class state, not an error state** — the frontline app must be **fully usable with airplane mode on**, proven live on stage.
4. **Decision support, never autonomous diagnosis** — the triage engine outputs a risk band + recommended action, always attributed to a rule, never a black-box "diagnosis."
5. **One deep patient journey beats fifteen shallow features** — build the 6-layer core (§3) to demo-grade polish; treat everything else as supporting scaffolding.
6. **ABDM-ready, not ABDM-blocking** — build against the ABDM data *shapes* (HI Types, ABHA ID format) with a mocked sandbox; do not let live ABDM sandbox integration block the demo.

---

## 3. System Architecture (High-Level)

```
┌──────────────────────────────┐   ┌──────────────────────────────┐   ┌──────────────────────────────┐
│   FRONTLINE WORKER APP        │   │        PHC / RH PORTAL        │   │     DISTRICT DASHBOARD        │
│   (Flutter, offline-first)    │   │     (Next.js 14, web)         │   │     (Next.js 14, web)         │
│                                │   │                                │   │                                │
│  Household reg · Vitals        │   │  Queue mgmt · Consult UI       │   │  KPI cards · Facility compare  │
│  Digital triage · ANC/PNC      │   │  Teleconsult (requester)       │   │  Referral funnel · Stock heat  │
│  Referral create · Follow-up   │   │  Referral inbox · Stock mgmt   │   │  map · High-risk case list     │
│  Local SQLite + sync queue     │   │  Diagnostic order/result       │   │                                │
└───────────────┬────────────────┘   └───────────────┬────────────────┘   └───────────────┬────────────────┘
                 │  REST/GraphQL over HTTPS (retry+backoff)                                 │
                 └──────────────────────────────┬──────────────────────────────────────────┘
                                                 ▼
                          ┌───────────────────────────────────────────────┐
                          │              CORE API GATEWAY                  │
                          │   Node.js (NestJS) — auth, RBAC, orchestration │
                          └───────────────────────┬───────────────────────┘
                     ┌──────────────┬──────────────┼──────────────┬──────────────┐
                     ▼              ▼              ▼              ▼              ▼
              ┌───────────┐  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
              │ FHIR STORE │  │ TRIAGE     │ │ TELECONSULT│ │ STOCK      │ │ SYNC ENGINE│
              │ (HAPI FHIR │  │ RULES ENGINE│ │ SIGNALING  │ │ SERVICE    │ │ (delta +   │
              │  JPA, R4)  │  │ (Node, JSON │ │ (WebRTC via│ │ (Node +    │ │ conflict   │
              │            │  │  Logic)     │ │  LiveKit/  │ │  Postgres) │ │ resolution)│
              └─────┬──────┘  └─────────────┘ │  mediasoup)│ └────────────┘ └────────────┘
                    │                          └────────────┘
                    ▼
          ┌────────────────────┐        ┌────────────────────┐
          │ PostgreSQL 15       │        │ ABDM MOCK GATEWAY   │
          │ (system of record,  │        │ (ABHA + consent +   │
          │  via Prisma)         │        │  HIP/HIU simulation)│
          └────────────────────┘        └────────────────────┘
```

**Why this shape:**
- The **FHIR store is the spine** — every module reads/writes FHIR resources through it, so a patient created by an ASHA on the frontline app is *the same record* a district-hospital doctor opens three days later. This single decision is what eliminates "fragmented records," which is literally the #1 complaint in the problem statement.
- The **API Gateway** is a thin orchestration layer (auth, RBAC, request fan-out) — it does not own business logic, so triage rules / stock rules / sync logic stay independently testable and demoable in isolation if the gateway breaks during judging.
- **Sync engine is a separate service**, not bolted onto the gateway, because offline-conflict resolution has fundamentally different failure modes (idempotency, vector clocks) than normal CRUD and deserves isolated testing.

---

## 4. Layer 1 — Frontline Worker App (Offline-First)

### 4.1 Tech choice
**Flutter** (Dart) targeting Android (the dominant device class for ASHA/ANM kits under NHM device-distribution schemes).

- Local persistence: **Drift** (SQLite ORM for Flutter) or plain `sqflite` — store FHIR-shaped JSON blobs in a generic `resources` table (`id`, `type`, `json`, `version`, `sync_status`, `updated_at`) rather than modeling every FHIR resource as its own SQL table. This mirrors what OpenSRP FHIR Core does and massively cuts schema churn.
- State management: **Riverpod**.
- Forms: model each clinical form (ANC assessment, child health, general triage, hypertension follow-up) as a **JSON Schema + UI Schema pair**, rendered by a generic `DynamicFormRenderer` widget — do NOT hand-code a screen per form. This is the single highest-leverage engineering decision for the frontline app: adding a new assessment type becomes a config change, not a release.

### 4.2 Local data model

```sql
-- Single generic table, FHIR resource per row
CREATE TABLE local_resources (
  id            TEXT PRIMARY KEY,     -- FHIR resource id (UUID, client-generated)
  resource_type TEXT NOT NULL,        -- 'Patient' | 'Encounter' | 'Observation' | ...
  json          TEXT NOT NULL,        -- full FHIR JSON
  version_id    INTEGER NOT NULL DEFAULT 1,
  sync_status   TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | SYNCED | CONFLICT
  updated_at    TEXT NOT NULL,
  created_by    TEXT NOT NULL         -- practitioner id (offline-safe, client-assigned)
);

CREATE INDEX idx_resource_type ON local_resources(resource_type);
CREATE INDEX idx_sync_status  ON local_resources(sync_status);
```

### 4.3 Offline UX states (must be visibly demoed)

```
● Offline          [banner, persistent, non-dismissible while offline]
Last synced: Today, 10:42 AM
Pending: 7 records
[ Sync Now — disabled while offline ]
```

### 4.4 Sync protocol (client side)

1. Every local mutation writes to `local_resources` with `sync_status = PENDING` and appends an entry to an append-only `sync_queue` table (resource id, operation, timestamp).
2. On connectivity restore (`connectivity_plus` listener), client calls `POST /sync/push` with the batch of pending resources.
3. Server responds per-resource with `{id, status: 'ACCEPTED'|'CONFLICT', server_version}`.
4. Client marks accepted resources `SYNCED`; conflicts get flagged `CONFLICT` and surfaced in a small "Needs review" list (never silently dropped).
5. Client then calls `GET /sync/pull?since=<lastSyncTimestamp>` to pull server-side changes relevant to its assigned patients/facility (delta sync, not full dump).

### 4.5 Conflict resolution policy

- **Last-Writer-Wins per field is unacceptable for clinical data.** Use **resource-level optimistic concurrency**: server stamps `version_id`; client must supply the version it last saw. Mismatch → `CONFLICT`, both versions preserved, resolved manually by MO at PHC (small conflict-review screen) — never auto-merged for clinical fields.
- Append-only resources (`Observation`, `Encounter`) never conflict by design — they're immutable once created; "corrections" are new resources referencing the old one via `Observation.derivedFrom` / FHIR's amendment pattern.

**Acceptance criterion for demo:** with device in airplane mode, complete a patient registration → vitals → triage → referral creation end-to-end with zero errors, then toggle connectivity and show the pending-count drop to 0 with a visible sync animation.

---

## 5. Layer 2 — Digital Triage Engine

### 5.1 Design
A **rules-first, explainable** engine — not an ML black box. Implemented as a small **JSON-Logic** (or a hand-rolled DSL) ruleset evaluated identically on-device (Dart) and server-side (Node), so triage works fully offline and produces the *same* result when re-evaluated centrally.

### 5.2 Rule shape

```json
{
  "id": "rule-hr-pregnancy-bp",
  "appliesTo": "ANC",
  "condition": {
    "and": [
      { ">=": [{ "var": "observation.bp.systolic" }, 140] },
      { ">=": [{ "var": "observation.bp.diastolic" }, 90] }
    ]
  },
  "outcome": {
    "riskBand": "HIGH_RISK",
    "flag": "Suspected pre-eclampsia",
    "recommendedAction": "PHC_CONSULT_WITHIN_24H"
  }
}
```

### 5.3 Baseline rule set to ship (minimum viable, all explainable, cite source guideline in comments)

| Domain | Trigger | Band |
|---|---|---|
| General adult | SpO₂ < 90% | EMERGENCY |
| General adult | Systolic BP > 180 or < 90 | EMERGENCY |
| General adult | Temp > 40°C or < 35°C | EMERGENCY |
| ANC | BP ≥ 140/90 | HIGH_RISK |
| ANC | Hb < 8 g/dL | HIGH_RISK |
| ANC | Bleeding / reduced fetal movement (self-report) | EMERGENCY |
| Child health | RR > age-adjusted threshold + chest indrawing | HIGH_RISK |
| Chronic (HTN/diabetes) | RBS > 300 mg/dL or < 60 mg/dL | EMERGENCY |
| Chronic | 2 missed follow-ups + last reading abnormal | HIGH_RISK (auto-flag for recall) |

### 5.4 Emergency escalation flow

```
Triage engine outputs EMERGENCY
        ↓
Encounter.priority = "stat" (FHIR)
        ↓
ServiceRequest created, priority=urgent
        ↓
Push notification (FCM) to on-duty PHC MO + district on-call
        ↓
Patient auto-pinned to top of PHC queue with red badge
```

### 5.5 API contract

```
POST /triage/evaluate
Body: { patientId, encounterType, observations: [...] }
Response: { riskBand, flags: [...], recommendedAction, ruleTrace: [ruleId, ...] }
```

`ruleTrace` is included specifically so the UI can show *which* rule fired — this is what lets you honestly call it "decision support" rather than "AI diagnosis" in front of judges.

---

## 6. Layer 3 — Longitudinal Patient Record (FHIR Core)

### 6.1 Why HAPI FHIR JPA Server
Rather than hand-rolling FHIR validation/search, run **HAPI FHIR JPA Server** (Java, Spring Boot, open-source, Apache 2.0) as the canonical FHIR store, backed by PostgreSQL. It gives you for free:
- FHIR R4 resource validation against the base spec
- `_include`, `_revinclude`, chained search (`Patient?_id=X&_revinclude=Observation:subject`)
- Bundle transactions (atomic multi-resource writes — critical for "register patient + record vitals + create referral" as one atomic offline-sync batch)
- A FHIR REST API out of the box: `GET /fhir/Patient/{id}`, `POST /fhir/Encounter`, etc.

The **API Gateway** (NestJS) sits in front of it purely for auth/RBAC/orchestration — clients never call HAPI directly.

### 6.2 Core resource set used

```
Patient            — demographics, ABHA identifier (Patient.identifier)
Practitioner       — ASHA/ANM/MO/specialist
PractitionerRole   — role + facility binding
Organization       — Sub-centre / PHC / RH / DH (hierarchy via Organization.partOf)
Location           — physical facility/room, used for queueing
Encounter          — every patient-provider interaction, tags facility tier
Observation        — vitals, lab values
Condition          — diagnoses, risk flags (e.g., "high-risk pregnancy")
MedicationRequest  — prescriptions
ServiceRequest     — referral / diagnostic order / teleconsult request
Task               — referral lifecycle tracking (see §7.3)
DiagnosticReport   — lab/imaging results
CarePlan           — ANC/PNC/chronic-care follow-up schedule
Appointment        — queue/booking
Consent            — ABDM-style consent artifact (mocked)
```

### 6.3 Facility hierarchy modeling

```json
{
  "resourceType": "Organization",
  "id": "phc-hadapsar",
  "name": "PHC Hadapsar",
  "type": [{ "coding": [{ "system": "facility-tier", "code": "PHC" }] }],
  "partOf": { "reference": "Organization/subdiv-pune-east" }
}
```
`Organization.partOf` chains Sub-centre → PHC → Rural Hospital → District Hospital → District, giving the dashboard (§9) a free hierarchy to roll KPIs up through.

### 6.4 Longitudinal continuity in practice
When patient `Sunita` is seen at Sub-centre, then PHC, then DH, all three `Encounter` resources share `Encounter.subject = Patient/sunita-id`. The DH doctor's UI calls:

```
GET /fhir/Encounter?subject=Patient/sunita-id&_sort=-date&_include=Encounter:diagnosis
```

and gets the full cross-facility timeline in one call — this is the concrete technical mechanism behind "no more bring your previous reports."

### 6.5 Export as ABDM-shaped bundle
Build one endpoint that assembles a FHIR `Bundle` (`type: document`) with a `Composition` resource at the root referencing the encounter's Patient/Practitioner/Observations — this is structurally identical to what ABDM HI Types (OPConsultation, Prescription, DiagnosticReport) require, so the "ABDM-ready" claim is backed by a real artifact you can show, not just a slide.

---

## 7. Layer 4 — Appointments, Queue & Referral Tracking

### 7.1 Queue state machine (per patient, per visit)

```
REGISTERED → TRIAGED → WAITING → CALLED → IN_CONSULTATION → COMPLETED
```
Modeled as `Encounter.status` transitions + a lightweight `QueueEntry` table (not full FHIR — queueing is operational, not clinical, so it doesn't need FHIR fidelity):

```sql
CREATE TABLE queue_entries (
  id            UUID PRIMARY KEY,
  encounter_id  UUID NOT NULL,
  facility_id   UUID NOT NULL,
  station       TEXT NOT NULL,      -- 'registration'|'vitals'|'doctor'|'lab'|'pharmacy'|'teleconsult'
  priority      TEXT NOT NULL,      -- 'EMERGENCY'|'HIGH'|'NORMAL'
  status        TEXT NOT NULL,      -- 'WAITING'|'CALLED'|'DONE'
  entered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  called_at     TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);
```

Priority ordering at the doctor's queue view: `EMERGENCY` always first, then `HIGH`, then FIFO within `NORMAL`. Real-time updates via **WebSocket** (Socket.IO namespace per facility) so the queue board updates without polling — this is what makes the "reduced waiting time" demo visually convincing (live token counter ticking down).

### 7.2 Appointment booking
`Appointment` FHIR resource, `Appointment.status` lifecycle (`proposed → booked → arrived → fulfilled | cancelled | noshow`). Booking can originate from: frontline app (ASHA books on behalf of patient), PHC portal, or patient-facing lightweight web form (optional stretch).

### 7.3 Referral lifecycle — modeled as FHIR `Task`

```
CREATED → ACCEPTED → PATIENT_NOTIFIED → TRAVELLED → ARRIVED → CONSULTED → TREATMENT → COMPLETED
                                                                              ↘ FOLLOW_UP_SCHEDULED
```

```json
{
  "resourceType": "Task",
  "status": "in-progress",
  "intent": "order",
  "code": { "text": "Referral" },
  "focus": { "reference": "ServiceRequest/referral-123" },
  "for": { "reference": "Patient/sunita-id" },
  "requester": { "reference": "PractitionerRole/asha-1" },
  "owner": { "reference": "Organization/phc-hadapsar" },
  "businessStatus": { "text": "ACCEPTED" },
  "authoredOn": "2026-08-20T09:00:00Z",
  "restriction": { "period": { "end": "2026-08-21T09:00:00Z" } }
}
```
`restriction.period.end` gives you a hard SLA deadline → this is exactly what powers the district dashboard's "Overdue: 7" stat (§9).

### 7.4 Referral dashboard math

```
completion_rate = COMPLETED_tasks / TOTAL_tasks (rolling 30d)
overdue         = tasks where now() > restriction.period.end AND status NOT IN (COMPLETED, CANCELLED)
```

---

## 8. Layer 5 — Teleconsultation

### 8.1 Tech choice
**LiveKit** (open-source, self-hostable WebRTC SFU) over building raw WebRTC signaling — gives you a production-grade video/audio pipeline with a small SDK surface (`livekit-client` on web, `livekit-flutter-client` if extended to frontline app), file/chat side-channel via LiveKit's data channels. This directly replaces the HCW@Home study reference with something faster to integrate end-to-end for a hackathon timeline.

### 8.2 Flow

```
PHC MO clicks "Request Specialist Consultation"
        ↓
POST /teleconsult/request { encounterId, specialty: "obstetrics" }
        ↓
Creates ServiceRequest (category=teleconsultation) + notifies specialist queue (WebSocket)
        ↓
Specialist accepts → LiveKit room token minted server-side (short-lived JWT)
        ↓
Both sides join room; sidebar shows patient vitals/history pulled live from FHIR store
        ↓
On end: specialist submits consult note → creates Encounter (class=virtual) +
        optional MedicationRequest + optional new Task (further referral)
```

### 8.3 Specialist availability model
`PractitionerRole.availableTime` + a simple `status` field (`AVAILABLE`/`BUSY`/`OFFLINE`) updated via heartbeat — surfaced in PHC portal as a live specialist directory.

---

## 9. Layer 6 — Medicine Availability, Diagnostics & District Dashboard

### 9.1 Medicine stock — movement-based, not a single counter

```sql
CREATE TABLE stock_items (
  id           UUID PRIMARY KEY,
  facility_id  UUID NOT NULL,
  drug_name    TEXT NOT NULL,
  unit         TEXT NOT NULL,
  current_qty  NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE stock_movements (
  id            UUID PRIMARY KEY,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id),
  type          TEXT NOT NULL, -- RECEIVED|DISPENSED|TRANSFERRED|ADJUSTED|EXPIRED|DAMAGED
  qty           NUMERIC NOT NULL,
  ref_encounter UUID,          -- links dispensal to a MedicationRequest fulfilment
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
`current_qty` is a materialized value maintained by a trigger/service on every movement insert — never edited directly. This mirrors OpenLMIS's movement-ledger pattern and gives you a real audit trail, which is what "accountability" in the problem statement is actually asking for.

### 9.2 Nearest-facility-with-stock lookup

```
GET /stock/search?drug=Metformin&near=phc-hadapsar
→ ranks sibling facilities under the same Organization.partOf parent by qty desc + distance
```

### 9.3 Diagnostics
`ServiceRequest` (category=laboratory) → `DiagnosticReport` on completion, with `DiagnosticReport.result` referencing `Observation`s. Turnaround-time metric = `DiagnosticReport.issued - ServiceRequest.authoredOn`.

### 9.4 District Dashboard (Next.js, recharts)

KPI cards (rolling 7/30-day, filterable by facility):
```
Patients seen · Teleconsultations · Referral completion % · Avg waiting time
High-risk follow-up adherence % · Medicine availability % · Diagnostic TAT
```

Facility comparison table (sortable):
```
Facility | Avg wait | Referral completion | Medicine availability | Overdue referrals
```

All figures are plain SQL aggregations over `queue_entries`, `Task` (referral), `stock_items`/`stock_movements` — no separate analytics warehouse needed at prototype scale; materialize as Postgres views refreshed on a cron for demo stability.

### 9.5 High-risk follow-up tracking
`CarePlan.activity` entries with `scheduledTiming` generate due-dates; a nightly job flags overdue high-risk follow-ups (`Condition` with a high-risk `Condition.code`) into a worklist surfaced to the assigned ASHA on next app open — this is the concrete mechanism for "better follow-up for maternal, child and chronic conditions."

---

## 10. Cross-Cutting: Multilingual & Low-Literacy UX

- **i18n:** `flutter_localizations` + ARB files; minimum Hindi, Marathi (Pune context), English at prototype stage; string keys, never hardcoded text, from the first commit.
- **Icon-first triage forms:** every form field pairs an icon + short localized label; avoid dense text blocks.
- **Voice input (stretch):** on-device speech-to-text (`speech_to_text` package) for symptom capture in local language, transcribed text still goes through the same structured form — never freeform-text-to-diagnosis.
- **Low-bandwidth web:** PHC/district portals server-render (Next.js App Router, RSC) and lazy-load charts, so they remain usable on 2G/3G links typical of rural PHC internet.

---

## 11. ABDM / ABHA Simulation Layer

Do not block the demo on live ABDM sandbox credentials/approval timelines. Build a **mock ABDM gateway service** matching the real API shapes (M1 ABHA creation, M2 HIP linking, M3 HIU consent/fetch), backed by fixtures derived from published ABDM FHIR bundle examples for structure-accuracy:

```
POST /abdm-mock/abha/create        → returns { abhaId: "91-XXXX-XXXX-XXXX" }
POST /abdm-mock/consent/request    → returns { consentId, status: "REQUESTED" }
POST /abdm-mock/consent/:id/grant  → { status: "GRANTED" }
GET  /abdm-mock/care-context/:abhaId → linked encounters bundle
```

Frame this explicitly to judges as: *"Our data model and export format match ABDM HI Type schemas; this mock gateway demonstrates the integration surface without requiring production sandbox approval during the hackathon window."*

---

## 12. Demo Script (the "one polished journey")

**Persona:** Sunita Sharma, 28 weeks pregnant, high-risk.

| Step | Actor | Screen | Key technical proof point |
|---|---|---|---|
| 1 | ASHA, **phone in airplane mode** | Frontline app — register patient, record BP 150/100, Hb 8.2 | Local-only write, offline banner visible |
| 2 | ASHA | Triage screen | Engine outputs `HIGH_RISK`, shows `ruleTrace` |
| 3 | ASHA | Create referral to PHC | `Task` created locally, `PENDING` sync |
| 4 | — | Toggle Wi-Fi on | Sync banner: "7 records pending" → animates to 0 |
| 5 | PHC MO | Portal — referral inbox | Same patient, same `Patient.id`, full history visible instantly |
| 6 | PHC MO | Click "Request Specialist Consultation" | LiveKit room created, specialist queue notified live (WebSocket) |
| 7 | Specialist | Teleconsult UI | Joins video call, sees vitals/history sidebar pulled from FHIR store in real time |
| 8 | Specialist | Ends call, writes note + creates DH referral | New `Task`, new `Encounter(class=virtual)` |
| 9 | DH doctor | Portal | Opens patient — full cross-facility timeline, zero re-entry |
| 10 | District officer | Dashboard | Case appears in high-risk maternal worklist with full status trail: Identified → Consulted → Specialist:Yes → Referral:Completed → Follow-up:Scheduled |

Total demo time target: **4–5 minutes**, rehearsed, with a second device as backup in case the primary Wi-Fi toggle misbehaves live.

---

## 13. Engineering Task Split (4-person team, parallelizable from day 1)

**Shared contract to lock before writing code (Day 1, first 3 hours):** the FHIR resource shapes in §6.2, the `Task` referral state machine in §7.3, and the REST endpoint list — write these into an `openapi.yaml` + a `fhir-shapes.md` so nobody blocks on anybody.

| Engineer | Owns | Depends on |
|---|---|---|
| **A — Frontline/Mobile** | Flutter app: offline storage, dynamic form renderer, on-device triage rules, sync client (§4, §5 client side) | FHIR shapes doc only |
| **B — Backend/Core** | NestJS gateway, HAPI FHIR deployment, sync server, triage server-side mirror, referral `Task` logic (§6, §7.3, §5 server side) | FHIR shapes doc only |
| **C — Portals** | Next.js PHC portal + District dashboard, queue UI, WebSocket queue/notification client, teleconsult UI wiring (§7.1, §8, §9.4) | B's endpoints (mock with fixtures until ready) |
| **D — Integrations** | Stock ledger service, diagnostics module, ABDM mock gateway, LiveKit deployment/token service (§9, §8.1, §11) | B's gateway auth |

Everyone mocks against the shared `openapi.yaml` from hour 3 onward — this is what lets 4 people build in parallel without waiting on each other's servers, and it is the same contract-first pattern used successfully on the prior MBBS Mentor 3-engineer split.

---

## 14. Build vs. Reference — Licensing Notes

Study these for architecture/workflow only; do not vendor code wholesale into the prototype repo.

| Reference | License | What was studied |
|---|---|---|
| OpenSRP FHIR Core | Apache-2.0 | Offline-first architecture, dynamic forms |
| OpenMRS Patient Management / Queueing | MPL-2.0/OpenMRS PL | Queue state machine, patient search UX |
| DHIS2 Core / Android Capture | BSD-3-Clause | Offline sync UX, dashboard KPI layout |
| OpenLMIS Stock Management | Apache-2.0 | Movement-ledger stock model |
| Bahmni | AGPL-3.0 (verify per-module) | Clinical workflow reference only — do not import AGPL code into a differently-licensed prototype |
| HCW@Home | AGPL-3.0 | Teleconsult flow reference — replaced by self-built LiveKit integration to avoid AGPL entanglement |

**Judge-facing framing:** *"Our architecture is inspired by proven open-source digital-health platforms including OpenSRP, OpenMRS, DHIS2 and OpenLMIS; our prototype implements an original, unified rural-care workflow built on HL7 FHIR R4 and tailored to SIH 26133."*

---

## 15. Suggested Build Timeline (SIH prototype window)

| Phase | Duration | Deliverable |
|---|---|---|
| 0. Contract lock | 3 hrs | `openapi.yaml`, `fhir-shapes.md`, repo scaffolds for all 4 tracks |
| 1. Core plumbing | Day 1–2 | HAPI FHIR deployed, gateway auth/RBAC, Flutter local DB + dynamic form renderer skeleton |
| 2. Vertical slice #1 | Day 2–3 | Register → triage → referral, fully offline on device, syncing to a real FHIR store |
| 3. Vertical slice #2 | Day 3–4 | PHC queue + referral inbox + teleconsult (LiveKit) wired end to end |
| 4. Vertical slice #3 | Day 4–5 | Stock ledger, diagnostics, district dashboard aggregations |
| 5. Polish + rehearsal | Day 5–6 | i18n pass, demo script rehearsal x3, offline-toggle failure-mode testing, backup device |

---

## 16. Risk Register

| Risk | Mitigation |
|---|---|
| Live Wi-Fi toggle fails on stage | Pre-recorded 20s backup clip of the sync moment, cut to live if it fails |
| HAPI FHIR JPA cold-start too slow for demo | Keep it warm/pre-seeded well before judging slot; have a seeded DB snapshot to restore from |
| LiveKit self-host networking issues on venue Wi-Fi | Use LiveKit Cloud free tier as fallback, same client SDK, zero code change |
| Judges probe "is this real FHIR or just labeled JSON" | Show live `GET /fhir/Patient/{id}` response + note HAPI FHIR validates against the R4 spec — not just field names that happen to match |
| Scope creep across 15 supporting features | Enforce §2 principle 5 — supporting features get a static/demo-data fallback if not finished; the 6-layer core never does |
