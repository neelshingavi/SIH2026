import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';
import { QueueService } from '../queue/queue.service.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  'draft': ['requested'],
  'requested': ['accepted', 'rejected'],
  'accepted': ['in-progress', 'cancelled'],
  'in-progress': ['completed', 'failed'],
};

const FACILITY_LOCATIONS: Record<string, { lat: number; lon: number }> = {
  'PHC-001': { lat: 18.5204, lon: 73.8567 },
  'RH-001': { lat: 18.5300, lon: 73.8600 },
  'DH-001': { lat: 18.5500, lon: 73.8900 },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
  ) {}

  async searchReferrals(facilityId: string, role: string, isIncoming: boolean, filters?: { status?: string; priority?: string; patientId?: string }) {
    try {
      const bundle = await this.fhirService.getResource('Task', '');
      if (!bundle || !bundle.entry) return [];

      return bundle.entry
        .map((e: any) => e.resource)
        .filter((task: any) => {
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
    } catch (e: any) {
      this.logger.error('Failed to search referrals', e);
      return [];
    }
  }

  async getDestinations(serviceType: string, originFacilityId: string = 'PHC-001') {
    try {
      const bundle = await this.fhirService.getResource('Organization', '');
      const organizations = bundle?.entry?.map((e: any) => e.resource) || [];
      const origin = FACILITY_LOCATIONS[originFacilityId] || { lat: 18.5, lon: 73.8 };
      const scoredDestinations = [];

      for (const org of organizations) {
        if (org.resourceType !== 'Organization') continue;
        if (org.id === originFacilityId) continue; // Don't route to self
        
        const capabilities = org.type?.[0]?.coding?.map((c: any) => c.display) || ['General Medicine', 'Teleconsultation'];
        
        let score = 50; 
        
        if (serviceType && capabilities.includes(serviceType)) {
          score += 30;
        }

        const destLoc = FACILITY_LOCATIONS[org.id] || { lat: 18.55, lon: 73.89 };
        const dist = calculateDistance(origin.lat, origin.lon, destLoc.lat, destLoc.lon);
        score -= (dist * 0.5);

        // Queue Intelligence
        const queue = await this.queueService.getQueueByFacility(org.id);
        const waitingCount = queue.filter(q => q.status === 'WAITING').length;
        score -= (waitingCount * 1.5);

        scoredDestinations.push({
          id: org.id,
          name: org.name || 'Unknown Facility',
          capabilities,
          distance: Math.round(dist * 10) / 10,
          queue: waitingCount,
          score: Math.max(0, Math.floor(score))
        });
      }

      return scoredDestinations.sort((a, b) => b.score - a.score);

    } catch (e: any) {
      this.logger.error('Failed to get destinations, using fallback', e);
      return [
        { id: 'FAC-DIST-1', name: 'District Hospital (Fallback)', capabilities: ['Cardiology', 'Obstetrics', 'Surgery', 'Teleconsultation'], distance: 25, queue: 12, score: 85 }
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

    // Phase 21: Trigger HIE Exchange when Referral is Accepted
    if (newStatus === 'accepted') {
      try {
        const patientRef = task.for?.reference;
        if (patientRef && patientRef.startsWith('Patient/')) {
          const patientId = patientRef.replace('Patient/', '');
          this.logger.log(`Referral \${taskId} accepted. Queuing HIE Exchange for Patient \${patientId}`);
          
          const priority = task.priority === 'stat' ? 'EMERGENCY' : 'ROUTINE';
          
          this.queueService.enqueue({
             type: 'HIE_EXPORT',
             patientId,
             recipientFacilityId: user.facilityId,
             purpose: 'REFERRAL',
             priority,
             user,
             correlationId
          });
        }
      } catch (e) {
        this.logger.warn(`Failed to trigger HIE export on referral acceptance: \${e.message}`);
      }
    }

    return task;
  }

  async getReferralPacket(taskId: string) {
    const task = await this.fhirService.getResource('Task', taskId);
    if (!task) throw new NotFoundException('Task not found');

    const entries = [];
    entries.push({ fullUrl: `urn:uuid:\${task.id}`, resource: task });

    const reqRef = task.focus?.reference;
    if (reqRef) {
      const [type, id] = reqRef.split('/');
      if (type === 'ServiceRequest') {
        try {
          const sr = await this.fhirService.getResource('ServiceRequest', id);
          if (sr) entries.push({ fullUrl: `urn:uuid:\${sr.id}`, resource: sr });
        } catch (e: any) {}
      }
    }

    const patRef = task.for?.reference;
    let patientId = null;
    if (patRef) {
      const [type, id] = patRef.split('/');
      if (type === 'Patient') {
        patientId = id;
        try {
          const pat = await this.fhirService.getResource('Patient', id);
          if (pat) entries.push({ fullUrl: `urn:uuid:\${pat.id}`, resource: pat });
        } catch (e: any) {}
      }
    }

    if (patientId) {
      try {
        const obsBundle = await this.fhirService.getResource('Observation', `?subject=Patient/\${patientId}`);
        if (obsBundle?.entry) entries.push(...obsBundle.entry);
        
        const condBundle = await this.fhirService.getResource('Condition', `?subject=Patient/\${patientId}`);
        if (condBundle?.entry) entries.push(...condBundle.entry);

        const encBundle = await this.fhirService.getResource('Encounter', `?subject=Patient/\${patientId}`);
        if (encBundle?.entry) entries.push(...encBundle.entry);
      } catch (e: any) {}
    }

    return {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: entries
    };
  }
}
