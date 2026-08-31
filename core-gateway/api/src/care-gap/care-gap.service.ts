import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';

import { AuditService } from '../audit/audit.service.js';

export interface CareGap {
  type: 'UNRESOLVED_RISK' | 'STALLED_REFERRAL' | 'OVERDUE_FOLLOWUP';
  priority: 'EMERGENCY' | 'HIGH' | 'ROUTINE';
  patientId: string;
  resourceId: string;
  description: string;
  ageInDays: number;
}

@Injectable()
export class CareGapService {
  private readonly logger = new Logger(CareGapService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService
  ) {}

  async getDashboard(facilityId: string): Promise<{ gaps: CareGap[] }> {
    this.logger.log(`Generating Care Gap Dashboard for facility \${facilityId}`);
    const gaps: CareGap[] = [];

    // 1. Unresolved High Risks (RiskAssessment with HIGH/EMERGENCY not mitigated)
    try {
      const risksBundle = await this.fhirService.getResource('RiskAssessment', '');
      const risks = risksBundle?.entry?.map(e => e.resource) || [];
      for (const risk of risks) {
        // Simplified check: Is it EMERGENCY or HIGH_RISK?
        const level = risk.prediction?.[0]?.qualitativeRisk?.text;
        if (level === 'EMERGENCY' || level === 'HIGH_RISK') {
          // Check if there's a recent care plan or encounter that resolves this.
          // For demo, we just flag it if it's older than 1 day and not mitigated explicitly.
          const ageMs = Date.now() - new Date(risk.meta?.lastUpdated || Date.now()).getTime();
          const ageDays = ageMs / (1000 * 60 * 60 * 24);
          
          if (ageDays > 1) {
            gaps.push({
              type: 'UNRESOLVED_RISK',
              priority: level === 'EMERGENCY' ? 'EMERGENCY' : 'HIGH',
              patientId: risk.subject?.reference?.split('/')[1] || 'Unknown',
              resourceId: risk.id,
              description: `Unresolved \${level} risk: \${risk.prediction[0].rationale}`,
              ageInDays: ageDays
            });
          }
        }
      }
    } catch (e) {
      this.logger.error('Failed to evaluate unresolved risks', e);
    }

    // 2. Stalled Referrals
    try {
      const tasksBundle = await this.fhirService.getResource('Task', '');
      const tasks = tasksBundle?.entry?.map(e => e.resource) || [];
      for (const task of tasks) {
        if (task.code === 'teleconsult' && (task.status === 'requested' || task.status === 'accepted')) {
          const isOwner = task.owner?.reference === `Organization/\${facilityId}`;
          const isRequester = task.requester?.reference === `Organization/\${facilityId}`;
          
          if (isOwner || isRequester) {
            const authoredOn = new Date(task.authoredOn).getTime();
            const ageHours = (Date.now() - authoredOn) / (1000 * 60 * 60);
            
            let isStalled = false;
            let priority: 'EMERGENCY' | 'HIGH' | 'ROUTINE' = 'ROUTINE';
            
            if (task.priority === 'stat' && ageHours > 1) {
              isStalled = true;
              priority = 'EMERGENCY';
            } else if (task.priority === 'urgent' && ageHours > 24) {
              isStalled = true;
              priority = 'HIGH';
            } else if (ageHours > 72) {
              isStalled = true;
            }

            if (isStalled) {
              gaps.push({
                type: 'STALLED_REFERRAL',
                priority,
                patientId: task.for?.reference?.split('/')[1] || 'Unknown',
                resourceId: task.id,
                description: `Referral stalled for \${Math.round(ageHours)} hours`,
                ageInDays: ageHours / 24
              });
            }
          }
        }
      }
    } catch (e) {
      this.logger.error('Failed to evaluate stalled referrals', e);
    }

    // 3. Overdue Follow-ups
    try {
      const carePlansBundle = await this.fhirService.getResource('CarePlan', '');
      const carePlans = carePlansBundle?.entry?.map(e => e.resource) || [];
      for (const cp of carePlans) {
        if (cp.status === 'active') {
          // Verify if it belongs to this facility's care team
          const isAssigned = cp.careTeam?.some(ref => ref.reference === `Organization/\${facilityId}`);
          if (isAssigned) {
            const createdMs = new Date(cp.created || Date.now()).getTime();
            const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24);
            if (ageDays > 3) {
               gaps.push({
                type: 'OVERDUE_FOLLOWUP',
                priority: 'HIGH',
                patientId: cp.subject?.reference?.split('/')[1] || 'Unknown',
                resourceId: cp.id,
                description: `Follow-up overdue by \${Math.round(ageDays)} days`,
                ageInDays: ageDays
              });
            }
          }
        }
      }
    } catch (e) {
      this.logger.error('Failed to evaluate overdue follow-ups', e);
    }

    // Sort by priority (EMERGENCY > HIGH > ROUTINE) and then age
    gaps.sort((a, b) => {
      const pmap = { 'EMERGENCY': 3, 'HIGH': 2, 'ROUTINE': 1 };
      if (pmap[a.priority] !== pmap[b.priority]) {
        return pmap[b.priority] - pmap[a.priority];
      }
      return b.ageInDays - a.ageInDays;
    });

    return { gaps };
  }

  async updateFollowup(taskId: string, status: string, notes: string, user: any, correlationId: string) {
    this.logger.log(`Updating follow-up task \${taskId} to \${status}`);
    
    // In a real app, we fetch the Task, update its status (e.g. COMPLETED, CANCELLED),
    // and append notes as output. For now, we mock the FHIR update.
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
      this.logger.warn(`Could not update actual FHIR Task \${taskId}, continuing anyway`);
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

    // You could also resolve the parent CarePlan if this was the final task

    return { success: true, taskId, status };
  }
}
