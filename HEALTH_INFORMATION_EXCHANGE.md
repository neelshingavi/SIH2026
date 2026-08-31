# Health Information Exchange

The Health Information Exchange (HIE) process allows Setu to securely share and receive clinical records.

## HIE Service Responsibilities
`HealthInformationExchangeService` handles:
- `requestRecord`: Asking an external facility/ABDM network for records.
- `prepareRecord`: Generating a clinical summary FHIR Bundle.
- `checkConsent`: Verifying active, valid consent for the target purpose.
- `authorize`: Validating the recipient.
- `export`: Sending the FHIR Bundle.
- `import`: Validating and ingesting external FHIR Bundles.
- `audit`: Logging all exchange events.

## Clinical Summary
When sharing records, Setu creates a targeted FHIR Bundle (type = document or collection) containing only relevant clinical data:
- Patient demographics
- Relevant Conditions
- Recent Vitals
- Active CarePlans and Referrals
- Relevant Diagnostics/Medications

## Outbox for HIE
Exchanges are managed via an asynchronous outbox queue to handle rural connectivity issues:
States: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `REQUIRES_REVIEW`.
Each operation uses an `idempotencyKey` to avoid duplicate exchanges.
