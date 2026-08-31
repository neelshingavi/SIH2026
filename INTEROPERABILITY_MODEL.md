# Interoperability Model

This document describes how Setu integrates with the broader digital health ecosystem while maintaining a stable internal operation.

## External Record Import
External FHIR records follow a strict ingestion pipeline:
1. **Validation:** Ensure valid FHIR format and required fields.
2. **Identity Resolution:** Match external patient identifiers (e.g., ABHA) to internal Setu UUIDs.
3. **Consent Verification:** Confirm consent exists to ingest the data.
4. **Reference Validation:** Ensure internal linkages (e.g., Encounter -> Patient) make sense.
5. **Deduplication:** Use stable identifiers to prevent creating duplicate records on multiple syncs.
6. **Local Cache / Timeline:** Insert into HAPI FHIR with clear `Provenance` indicating the external source.

## Provenance Tracking
Imported resources are tagged using the FHIR `Provenance` resource to track:
- Source organization/system
- Source timestamp
- Actor

## Bandwidth-Aware Mode
In low connectivity:
- Prioritize: Patient identity, emergency observations, RiskAssessment, ServiceRequest, Task.
- Defer: Large attachments, historical records.
Emergency clinical data always receives highest priority in the exchange queue.

## ABDM Adapter (AbdmGateway)
All external interactions go through the `AbdmGateway` abstraction to avoid tightly coupling the core business logic with specific ABDM API versions. The integration supports multiple modes: `REAL`, `SANDBOX`, `LOCAL_SIMULATION`, and `UNAVAILABLE`.
