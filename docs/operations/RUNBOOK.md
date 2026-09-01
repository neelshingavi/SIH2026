# System Runbook (Phase 73)

## 1. HAPI Outage
**Symptom:** `/health/dashboard` shows `fhir: DOWN`. CircuitBreaker logs `Circuit entering OPEN state`.
**Action:** 
- Check HAPI logs.
- Wait for CircuitBreaker to enter `HALF_OPEN` and auto-recover. Do not manually restart Gateway.

## 2. Sync Backlog Growing
**Symptom:** Dashboard metric `syncBacklog` > 1000.
**Action:**
- Check if Gateway `HieOutboxService` cron job died.
- Restart Gateway pod if interval processor hung.

## 3. Duplicate Mutations / Integrity Violations
**Symptom:** Patient has multiple identical CarePlans.
**Action:**
- Escalate to Tier 3. DO NOT manually DELETE FHIR resources.
- Use FHIR `UPDATE` to correct the resource state, preserving `Provenance`.

## 4. Emergency Referral SLA Breach Spike
**Symptom:** Care Gap engine flags multiple `EMERGENCY` breaches.
**Action:**
- This is a Clinical Safety Incident (Phase 72). Notify Medical Officer immediately. Technical team investigates SMS Gateway routing.
