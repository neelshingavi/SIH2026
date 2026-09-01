# INTEROPERABILITY MODEL (Phase 57)

## Core Concept
Setu achieves interoperability not by directly coupling the Flutter app to an external provider (like ABDM), but by establishing a standard FHIR interface at the Gateway layer, mediated by an Adapter.

### Information Flow

1. **Flutter Offline**: Data is captured using offline SQLite and deterministic sync. The data model is a flattened FHIR representation.
2. **Gateway Processing**: Incoming sync data is hydrated into proper FHIR resources (Patient, Encounter, Observation, Condition).
3. **FHIR Core**: HAPI FHIR acts as the ultimate canonical data store.
4. **Exchange Trigger**: When a Referral is accepted (or manual export is requested), the `HieOutboxService` queues a transaction.
5. **Data Minimization**: `HieService` extracts a `document` Bundle, filtering only the relevant data based on the `Consent` resource scope.
6. **Adapter Routing**: The `AbdmGatewayService` (implementing `HealthExchangeAdapter`) translates the internal Bundle into the external NDHM/ABDM format and securely transmits it.
7. **Identity Resolution**: Incoming external data passes through `PatientIdentityService` to safely map external ABHA/UUIDs to internal UUIDs without silent overwrites.

## Security Boundary
- Setu never exposes its internal database IDs externally.
- External tokens are never passed to the Flutter client.
- The `HealthExchangeAdapter` is the only component allowed to make external network calls to the HIE.
