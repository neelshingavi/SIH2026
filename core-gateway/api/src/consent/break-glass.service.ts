import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CarePathwayService } from '../care-pathway/care-pathway.service.js';

@Injectable()
export class BreakGlassService {
  private readonly logger = new Logger(BreakGlassService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly carePathwayService: CarePathwayService
  ) {}

  /**
   * Emergency override access when consent is unavailable but the patient 
   * has a high-risk/emergency clinical state.
   */
  async emergencyAccess(patientId: string, reason: string, user: any, correlationId: string) {
    this.logger.warn(`BREAK-GLASS EMERGENCY ACCESS requested by \${user.userId} for patient \${patientId}`);

    // Verify patient exists
    const patient = await this.fhirService.getResource('Patient', patientId);
    if (!patient) throw new NotFoundException('Patient not found');

    // Determine if an emergency clinical state exists
    const pathway = await this.carePathwayService.evaluatePatientPathway(patientId, user.facilityId);
    const hasEmergency = pathway.gaps.some(gap => gap.priority === 'EMERGENCY' || gap.severity === 'CRITICAL') || 
                         pathway.state === 'RISK_IDENTIFIED' || pathway.state === 'ESCALATION_REQUIRED';

    if (!hasEmergency) {
       this.logger.error(`Break-glass access denied. No clinical emergency detected.`);
       await this.auditService.logEvent({
          userId: user.userId,
          role: user.role,
          facilityId: user.facilityId,
          action: 'EMERGENCY_OVERRIDE_FAILED',
          resourceType: 'Patient',
          resourceId: patientId,
          requestId: correlationId,
          result: 'DENIED',
          reason: `No critical clinical gap or emergency pathway state found. Reason provided: \${reason}`
       });
       throw new ForbiddenException('Emergency override denied. No clinical emergency detected for this patient.');
    }

    // Grant temporary emergency access token/log
    await this.auditService.logEvent({
        userId: user.userId,
        role: user.role,
        facilityId: user.facilityId,
        action: 'EMERGENCY_OVERRIDE_GRANTED',
        resourceType: 'Patient',
        resourceId: patientId,
        requestId: correlationId,
        result: 'SUCCESS',
        reason: reason
    });

    return {
      success: true,
      message: 'Emergency access granted. This action has been audited.',
      patientId,
      pathwayState: pathway.state
    };
  }
}
