import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CarePathwayService, CareGap2 } from '../care-pathway/care-pathway.service.js';

@Injectable()
export class CareGapService {
  private readonly logger = new Logger(CareGapService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly carePathwayService: CarePathwayService
  ) {}

  async getDashboard(facilityId: string): Promise<{ gaps: CareGap2[] }> {
    this.logger.log(`Generating Care Gap Dashboard using Pathway Engine for facility \${facilityId}`);
    
    // Instead of old naive logic, we now use the authoritative Pathway Engine
    const gaps = await this.carePathwayService.evaluateFacilityGaps(facilityId);
    
    return { gaps };
  }

  async updateFollowup(taskId: string, status: string, notes: string, user: any, correlationId: string) {
    this.logger.log(`Updating follow-up task \${taskId} to \${status}`);
    
    try {
      const task = await this.fhirService.getResource('Task', taskId);
      if (task) {
        task.status = status;
        if (notes) {
          task.output = [{ type: { text: 'Follow-up Notes' }, valueString: notes }];
        }
        task.lastModified = new Date().toISOString();
        await this.fhirService.createOrUpdate('Task', taskId, task, task.meta?.versionId, 'UPDATE');
      }
    } catch (e) {
      this.logger.warn(`Could not update actual FHIR Task \${taskId}`);
    }

    if (status === 'COMPLETED') {
      await this.auditService.logEvent({
        userId: user.userId,
        role: user.role,
        facilityId: user.facilityId,
        action: 'FOLLOWUP_COMPLETED',
        resourceType: 'Task',
        resourceId: taskId,
        requestId: correlationId,
        result: 'SUCCESS',
      });
    }

    return { success: true, taskId, status };
  }
}
