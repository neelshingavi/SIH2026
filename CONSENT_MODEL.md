# Consent Model

The Consent Model governs data sharing within Setu and with external ABDM-compatible systems.

## Key Properties
Consent represents:
- **Who:** The actor requesting/giving consent.
- **For whom:** The patient whose data is shared.
- **What data:** Scope of clinical data (e.g., all, specific encounters, specific observations).
- **For what purpose:** e.g., TREATMENT, REFERRAL, DIAGNOSTIC_REVIEW.
- **With whom:** The receiving organization/facility.
- **Duration:** Validity period (`createdAt`, `expiresAt`).
- **Status:** State of the consent.

## Consent States
1. `REQUESTED`: Consent has been asked but not yet granted.
2. `ACTIVE`: Consent is valid and ongoing.
3. `REJECTED`: The user explicitly denied the request.
4. `REVOKED`: A previously active consent was withdrawn.
5. `EXPIRED`: The consent's validity period has ended.

## FHIR Representation
Consent is mapped to the standard FHIR `Consent` resource.

## Offline Considerations
- **Local Consent Recorded:** Consents can be gathered offline and synced.
- **Central Consent Verified:** The authoritative state comes from the server. If a conflict occurs (e.g., local = ACTIVE, server = REVOKED), the server's revoked state wins.
