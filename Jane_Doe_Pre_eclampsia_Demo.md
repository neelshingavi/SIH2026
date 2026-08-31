# Demo Scenario: Jane Doe (Pre-eclampsia)

## Overview
This scenario demonstrates the end-to-end flow of the Setu (SIH 2026) platform, showcasing offline capabilities, care pathways, smart routing, queue intelligence, and safe notifications.

## 1. Offline Triage (Frontline App)
- **Actor:** ASHA Worker (offline in village)
- **Action:** ASHA registers Jane Doe (Age 28, 30 weeks pregnant).
- **Data Entry:** BP is 160/100, Proteinuria 2+.
- **Result:** Triage engine immediately flags **HIGH RISK** (Pre-eclampsia) locally without internet.
- **Offline Save:** The FHIR Encounter and Observation are saved to `LocalResources` in SQLite with status `PENDING`.

## 2. Sync to Core Gateway
- **Actor:** SyncCoordinator
- **Action:** ASHA reaches a network zone. SyncCoordinator detects connection.
- **Process:** It sends a batch of operations to `POST /sync/push` on `core-gateway`.
- **Result:** FHIR records are persisted to the HAPI FHIR server.

## 3. Care Pathway Orchestrator & Care Gap
- **Actor:** CarePathwayService (Backend)
- **Action:** Orchestrator evaluates Jane's new records.
- **Process:** Detects High BP + Pregnancy. State transitions to `ESCALATION_REQUIRED`.
- **Result:** Generates a **Care Gap** (severity: CRITICAL) assigning action to MO (Medical Officer) at PHC.

## 4. Smart Routing & Queue Intelligence
- **Actor:** ReferralService & QueueService
- **Action:** MO creates an emergency referral to a District Hospital.
- **Process:** Smart Routing evaluates nearby DHs. It penalizes facilities with long waiting queues (`QueueService`) and long distance.
- **Result:** Recommends "District Hospital 1" as it has a lower queue and is within 25km. Referral `Task` is created via FHIR.

## 5. Alert Engine & Safe Notification
- **Actor:** AlertService
- **Action:** DH-1 receives the referral.
- **Process:** Alert Engine triggers a notification for the DH-1 specialist.
- **Notification Safety:** The notification specifically omits PHI.
- **Result:** Alert reads: "Emergency clinical review required. Open Setu to view assigned case."

## 6. Medicine Request & Offline Inventory
- **Actor:** Specialist (DH-1)
- **Action:** Prescribes Labetalol (MedicationRequest).
- **Process:** DH-1 pharmacy checks stock. Since the inventory is cached locally (`OfflineInventoryService`), they know it's in stock even if the internet drops.
- **Result:** Medication is dispensed, closing the Care Gap automatically via FHIR `MedicationDispense`.
