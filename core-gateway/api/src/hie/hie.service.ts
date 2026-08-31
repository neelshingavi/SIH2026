import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConsentService } from '../consent/consent.service.js';
import { PatientIdentityService, IdentityMatchResult } from './patient-identity.service.js';
import * as crypto from 'crypto';

@Injectable()
export class HieService {
  private readonly logger = new Logger(HieService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly consentService: ConsentService,
    private readonly identityService: PatientIdentityService,
  ) {}

  // ... (exportClinicalSummary remains unchanged, skipping lines for brevity)

  async exportClinicalSummary(patientId: string, recipientFacilityId: string, purpose: string, user: any, correlationId: string) {
    this.logger.log(`Exporting clinical summary for patient \${patientId} to \${recipientFacilityId}`);

    // 1. Consent Verification
    const hasConsent = await this.consentService.checkActiveConsent(patientId, recipientFacilityId, purpose);
    if (!hasConsent) {
      await this.auditService.logEvent({
        userId: user.userId,
        role: user.role,
        facilityId: user.facilityId,
        action: 'RECORD_EXPORT_FAILED',
        resourceType: 'Bundle',
        resourceId: 'none',
        requestId: correlationId,
        result: 'DENIED',
        reason: 'Consent missing or expired'
      });
      throw new ForbiddenException('Active consent not found for this export');
    }

    const patient = await this.fhirService.getResource('Patient', patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    const encounters = await this.fhirService.searchResources('Encounter', { subject: `Patient/\${patientId}` });
    const observations = await this.fhirService.searchResources('Observation', { subject: `Patient/\${patientId}` });
    const conditions = await this.fhirService.searchResources('Condition', { subject: `Patient/\${patientId}` });
    const carePlans = await this.fhirService.searchResources('CarePlan', { subject: `Patient/\${patientId}` });
    const serviceRequests = await this.fhirService.searchResources('ServiceRequest', { subject: `Patient/\${patientId}` });
    const diagnosticReports = await this.fhirService.searchResources('DiagnosticReport', { subject: `Patient/\${patientId}` });
    const medicationRequests = await this.fhirService.searchResources('MedicationRequest', { subject: `Patient/\${patientId}` });
    const risks = await this.fhirService.searchResources('RiskAssessment', { subject: `Patient/\${patientId}` });

    const activeConditions = conditions.filter((c: any) => c.clinicalStatus?.coding?.[0]?.code === 'active');
    
    const bundleId = crypto.randomUUID();
    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        { fullUrl: `urn:uuid:\${patientId}`, resource: patient },
        ...activeConditions.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...observations.slice(0, 10).map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...encounters.slice(0, 5).map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...carePlans.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...serviceRequests.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...diagnosticReports.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...medicationRequests.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...risks.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
      ]
    };

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'RECORD_EXPORTED',
      resourceType: 'Bundle',
      resourceId: bundleId,
      requestId: correlationId,
      result: 'SUCCESS',
      reason: purpose
    });

    return bundle;
  }

  async importClinicalSummary(bundle: any, user: any, correlationId: string) {
    this.logger.log(`Importing clinical summary`);

    if (!bundle || bundle.resourceType !== 'Bundle' || !bundle.entry) {
      throw new BadRequestException('Invalid FHIR Bundle');
    }

    let localPatientId = null;
    let importedCount = 0;

    // 1. Resolve Patient Identity First (Phase 16)
    const patientEntry = bundle.entry.find((e: any) => e.resource?.resourceType === 'Patient');
    if (patientEntry) {
        const { result, localPatientId: resolvedId } = await this.identityService.resolveIdentity(patientEntry.resource);
        
        if (result === IdentityMatchResult.MATCH) {
            localPatientId = resolvedId;
            this.logger.log(`Matched external patient to local patient \${localPatientId}`);
        } else if (result === IdentityMatchResult.POSSIBLE_MATCH || result === IdentityMatchResult.CONFLICT) {
            this.logger.warn(`Identity conflict or possible match detected. Pushing to manual review queue.`);
            // In a real system, we'd halt import or quarantine the bundle until human review (Phase 17)
            throw new BadRequestException('PATIENT_IDENTITY_CONFLICT_REQUIRES_REVIEW');
        } else {
            // NO_MATCH, we will create a new patient
            this.logger.log(`No local match found. Will import as new patient.`);
        }
    }

    // 2. Import Resources
    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource || !resource.resourceType || !resource.id) continue;
      
      // If we matched the patient, we need to rewrite external patient references to our local UUID
      if (localPatientId && resource.resourceType === 'Patient') {
          continue; // We already have the patient, don't overwrite demographics automatically
      }

      if (localPatientId && resource.subject?.reference?.startsWith('Patient/')) {
          resource.subject.reference = `Patient/\${localPatientId}`;
      }

      const provenance = {
        resourceType: 'Provenance',
        id: crypto.randomUUID(),
        target: [{ reference: `\${resource.resourceType}/\${resource.id}` }],
        recorded: new Date().toISOString(),
        agent: [{ who: { reference: `Organization/\${user.facilityId}` }, type: { coding: [{ code: 'assembler' }] } }]
      };
      
      try {
        await this.fhirService.createOrUpdate(resource.resourceType, resource.id, resource, undefined, 'CREATE');
        await this.fhirService.createOrUpdate('Provenance', provenance.id, provenance, undefined, 'CREATE');
        importedCount++;
      } catch (e) {
        // Handle deduplication implicitly if using If-None-Exist or similar
      }
    }

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'RECORD_IMPORTED',
      resourceType: 'Bundle',
      resourceId: bundle.id || 'unknown',
      requestId: correlationId,
      result: 'SUCCESS',
      reason: `Imported \${importedCount} resources`
    });

    return { success: true, importedCount, localPatientId };
  }
}
