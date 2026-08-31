import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'draft': ['requested'],
  'requested': ['accepted', 'rejected'],
  'accepted': ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'failed'],
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
  ) {}

  async searchReferrals(facilityId: string, role: string, isIncoming: boolean, filters?: { status?: string; priority?: string; patientId?: string }) {
    try {
      const bundle = await this.fhirService.getResource('Task', '');
      if (!bundle || !bundle.entry) return [];

      return bundle.entry
        .map(e => e.resource)
        .filter(task => {
          if (task.resourceType !== 'Task') return false;
          if (task.intent !== 'order') return false;

          if (isIncoming) {
            if (task.owner?.reference !== `Organization/\${facilityId}`) return false;
          } else {
            if (task.requester?.reference !== `Organization/\${facilityId}`) return false;
          }

          if (filters?.status && task.status !== filters.status) return false;
          if (filters?.priority && task.priority !== filters.priority) return false;
          if (filters?.patientId && task.for?.reference !== `Patient/\${filters.patientId}`) return false;

          return true;
        });
    } catch (e) {
      this.logger.error('Failed to search referrals', e);
      return [];
    }
  }

  async getDestinations(serviceType: string) {
    try {
      // 1. Fetch organizations/healthcare services from FHIR
      const bundle = await this.fhirService.getResource('Organization', '');
      const organizations = bundle?.entry?.map(e => e.resource) || [];
      
      const scoredDestinations = [];

      for (const org of organizations) {
        if (org.resourceType !== 'Organization') continue;
        
        // Mocking capability extraction - in reality we'd check HealthcareService resources linked to the Org
        // Or check extensions on the Organization
        const capabilities = org.type?.[0]?.coding?.map(c => c.display) || ['General Medicine', 'Teleconsultation'];
        
        // Score calculation (Mocked rule engine based on capability)
        let score = 50; 
        
        // Bonus for having the requested service
        if (serviceType && capabilities.includes(serviceType)) {
          score += 30;
        }

        // Mock distance penalty
        const mockDistance = Math.floor(Math.random() * 50) + 1;
        score -= (mockDistance * 0.5);

        // Mock queue penalty
        const mockQueue = Math.floor(Math.random() * 15);
        score -= (mockQueue * 1.5);

        scoredDestinations.push({
          id: org.id,
          name: org.name || 'Unknown Facility',
          capabilities,
          distance: mockDistance,
          queue: mockQueue,
          score: Math.max(0, Math.floor(score))
        });
      }

      // Sort by score descending
      return scoredDestinations.sort((a, b) => b.score - a.score);

    } catch (e) {
      this.logger.error('Failed to get destinations, using fallback', e);
      return [
        { id: 'FAC-DIST-1', name: 'District Hospital (Fallback)', capabilities: ['Cardiology', 'Obstetrics', 'Surgery', 'Teleconsultation'], distance: 25, queue: 12, score: 85 },
        { id: 'FAC-RURAL-1', name: 'Rural Hospital (Fallback)', capabilities: ['Obstetrics', 'Emergency', 'Teleconsultation'], distance: 10, queue: 4, score: 92 }
      ];
    }
  }

  async updateStatus(taskId: string, newStatus: string, user: any, correlationId: string) {
    const task = await this.fhirService.getResource('Task', taskId);
    if (!task) throw new NotFoundException(`Task \${taskId} not found`);

    const currentStatus = task.status || 'draft';
    const allowedNext = VALID_TRANSITIONS[currentStatus];

    if (!allowedNext || !allowedNext.includes(newStatus)) {
      throw new ForbiddenException(`Invalid transition from \${currentStatus} to \${newStatus}`);
    }

    if (newStatus === 'accepted' || newStatus === 'rejected' || newStatus === 'in-progress' || newStatus === 'completed') {
      if (task.owner?.reference !== `Organization/\${user.facilityId}`) {
        throw new ForbiddenException('Only the receiving facility can update this status');
      }
    }

    task.status = newStatus;
    task.lastModified = new Date().toISOString();

    await this.fhirService.createOrUpdate('Task', taskId, task, task.meta?.versionId, 'UPDATE');

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: `REFERRAL_\${newStatus.toUpperCase()}`,
      resourceType: 'Task',
      resourceId: taskId,
      requestId: correlationId,
      result: 'SUCCESS',
    });

    return task;
  }

  async getReferralPacket(taskId: string) {
    // 1. Get Task
    const task = await this.fhirService.getResource('Task', taskId);
    if (!task) throw new NotFoundException('Task not found');

    const entries = [];
    entries.push({ fullUrl: `urn:uuid:\${task.id}`, resource: task });

    // 2. Get ServiceRequest
    const reqRef = task.focus?.reference;
    if (reqRef) {
      const [type, id] = reqRef.split('/');
      if (type === 'ServiceRequest') {
        try {
          const sr = await this.fhirService.getResource('ServiceRequest', id);
          if (sr) entries.push({ fullUrl: `urn:uuid:\${sr.id}`, resource: sr });
        } catch (e) {}
      }
    }

    // 3. Get Patient
    const patRef = task.for?.reference;
    let patientId = null;
    if (patRef) {
      const [type, id] = patRef.split('/');
      if (type === 'Patient') {
        patientId = id;
        try {
          const pat = await this.fhirService.getResource('Patient', id);
          if (pat) entries.push({ fullUrl: `urn:uuid:\${pat.id}`, resource: pat });
        } catch (e) {}
      }
    }

    // 4. Get recent Encounters, Observations, Conditions for the Patient
    if (patientId) {
      try {
        const obsBundle = await this.fhirService.getResource('Observation', `?subject=Patient/\${patientId}`);
        if (obsBundle?.entry) entries.push(...obsBundle.entry);
        
        const condBundle = await this.fhirService.getResource('Condition', `?subject=Patient/\${patientId}`);
        if (condBundle?.entry) entries.push(...condBundle.entry);

        const encBundle = await this.fhirService.getResource('Encounter', `?subject=Patient/\${patientId}`);
        if (encBundle?.entry) entries.push(...encBundle.entry);
      } catch (e) {}
    }

    return {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: entries
    };
  }
}
