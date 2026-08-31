import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ConsentService } from '../consent/consent.service.js';
import * as crypto from 'crypto';

@Injectable()
export class HieService {
  private readonly logger = new Logger(HieService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly consentService: ConsentService,
  ) {}

  async exportClinicalSummary(patientId: string, recipientFacilityId: string, purpose: string, user: any, correlationId: string) {
    this.logger.log(`Exporting clinical summary for patient \${patientId} to \${recipientFacilityId}`);

    // 1. Consent Verification
    const hasConsent = await this.consentService.checkActiveConsent(patientId, recipientFacilityId, purpose);
    if (!hasConsent) {
      // Break-glass fallback could go here if implemented, but we require consent for standard flow
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

    // 2. Prepare Record (Data Minimization)
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

    // Filter to only active/relevant data based on purpose (simplified)
    const activeConditions = conditions.filter((c: any) => c.clinicalStatus?.coding?.[0]?.code === 'active');
    
    // Construct FHIR Document Bundle
    const bundleId = crypto.randomUUID();
    const bundle = {
      resourceType: 'Bundle',
      id: bundleId,
      type: 'document',
      timestamp: new Date().toISOString(),
      entry: [
        { fullUrl: `urn:uuid:\${patientId}`, resource: patient },
        ...activeConditions.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...observations.slice(0, 10).map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })), // Limit
        ...encounters.slice(0, 5).map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...carePlans.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...serviceRequests.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...diagnosticReports.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...medicationRequests.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
        ...risks.map((r: any) => ({ fullUrl: `urn:uuid:\${r.id}`, resource: r })),
      ]
    };

    // 3. Audit Success
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

    // 1. Validation
    if (!bundle || bundle.resourceType !== 'Bundle' || !bundle.entry) {
      throw new BadRequestException('Invalid FHIR Bundle');
    }

    // 2. Identity Resolution & Deduplication (Simplified for prototype)
    // In a real system, we'd check ABHA and map to internal UUIDs, or use If-None-Exist
    let patientId = null;
    let importedCount = 0;

    for (const entry of bundle.entry) {
      const resource = entry.resource;
      if (!resource || !resource.resourceType || !resource.id) continue;
      
      if (resource.resourceType === 'Patient') {
         patientId = resource.id;
      }

      // Add provenance to track external origin
      const provenance = {
        resourceType: 'Provenance',
        id: crypto.randomUUID(),
        target: [{ reference: `\${resource.resourceType}/\${resource.id}` }],
        recorded: new Date().toISOString(),
        agent: [{ who: { reference: `Organization/\${user.facilityId}` }, type: { coding: [{ code: 'assembler' }] } }]
      };
      
      // Save locally (simulated HIE ingestion)
      try {
        await this.fhirService.createOrUpdate(resource.resourceType, resource.id, resource, undefined, 'CREATE');
        await this.fhirService.createOrUpdate('Provenance', provenance.id, provenance, undefined, 'CREATE');
        importedCount++;
      } catch (e) {
        // Handle deduplication implicitly if using If-None-Exist or similar
      }
    }

    // 3. Audit
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

    return { success: true, importedCount, patientId };
  }
}
