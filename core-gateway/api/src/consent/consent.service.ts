import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import * as crypto from 'crypto';

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
  ) {}

  async recordConsent(payload: any, user: any, correlationId: string) {
    this.logger.log(`Recording consent for patient \${payload.patientId} by \${user.userId}`);
    
    const consentId = crypto.randomUUID();
    const consentResource = {
      resourceType: 'Consent',
      id: consentId,
      status: 'active',
      scope: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/consentscope', code: 'patient-privacy' }]
      },
      category: [{
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'INFA', display: 'information access' }]
      }],
      patient: { reference: `Patient/\${payload.patientId}` },
      dateTime: new Date().toISOString(),
      performer: [{ reference: `Practitioner/\${user.userId}` }],
      organization: [{ reference: `Organization/\${payload.recipientFacilityId || user.facilityId}` }],
      sourceAttachment: { title: 'Local Consent Recorded' },
      provision: {
        type: 'permit',
        period: {
          start: new Date().toISOString(),
          end: payload.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // default 7 days
        },
        purpose: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
          code: payload.purpose || 'TREAT'
        }],
        // Phase 6/10: Explicit scope — which resource types are permitted for exchange
        // Defaults to referral-appropriate minimum if not specified
        data: (payload.resourceScope || ['Patient', 'Observation', 'Condition', 'RiskAssessment', 'CarePlan', 'ServiceRequest', 'DiagnosticReport', 'MedicationRequest']).map((rt: string) => ({
          meaning: 'related',
          reference: { type: rt }
        }))
      }
    };

    await this.fhirService.createOrUpdate('Consent', consentId, consentResource, undefined, 'CREATE');

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'CONSENT_GRANTED',
      resourceType: 'Consent',
      resourceId: consentId,
      requestId: correlationId,
      result: 'SUCCESS',
      reason: payload.purpose
    });

    return consentResource;
  }

  async revokeConsent(consentId: string, reason: string, user: any, correlationId: string) {
    this.logger.log(`Revoking consent \${consentId} by \${user.userId}`);
    
    const consent = await this.fhirService.getResource('Consent', consentId);
    if (!consent) throw new NotFoundException('Consent not found');

    consent.status = 'inactive';
    consent.dateTime = new Date().toISOString(); // record time of revocation
    // Keep a record of why it was revoked
    consent.sourceAttachment = { title: `Revoked: \${reason}` };

    await this.fhirService.createOrUpdate('Consent', consentId, consent, consent.meta?.versionId, 'UPDATE');

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'CONSENT_REVOKED',
      resourceType: 'Consent',
      resourceId: consentId,
      requestId: correlationId,
      result: 'SUCCESS',
      reason: reason
    });

    return consent;
  }

  async getConsentsForPatient(patientId: string) {
    const bundle = await this.fhirService.searchResources('Consent', { patient: `Patient/\${patientId}` });
    return bundle;
  }

  async checkActiveConsent(patientId: string, facilityId: string, purpose: string): Promise<{ hasConsent: boolean, permittedResources?: string[] }> {
    const consents = await this.getConsentsForPatient(patientId);
    const now = new Date();

    for (const consent of consents) {
      if (consent.status === 'active') {
        const provision = consent.provision;
        if (provision && provision.type === 'permit') {
          // Check period
          if (provision.period) {
            if (provision.period.start && new Date(provision.period.start) > now) continue;
            if (provision.period.end && new Date(provision.period.end) < now) continue;
          }
          
          // Check organization
          const orgMatch = consent.organization?.some((org: any) => org.reference === `Organization/${facilityId}`);
          
          // Check purpose
          const purposeMatch = provision.purpose?.some((p: any) => p.code === purpose);

          if (orgMatch && purposeMatch) {
            const permittedResources = provision.data?.map((d: any) => d.reference?.type).filter(Boolean);
            return { hasConsent: true, permittedResources };
          }
        }
      }
    }
    return { hasConsent: false };
  }
}
