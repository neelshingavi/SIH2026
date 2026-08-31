import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class TeleconsultService {
  private readonly logger = new Logger(TeleconsultService.name);
  
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

  constructor(
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
  ) {}

  async createToken(taskId: string, user: any, correlationId: string) {
    this.logger.log(`Generating LiveKit token for user \${user.userId} in task \${taskId}`);
    
    // Secure Room Auth: Only allow join if Task exists and user is owner/requester
    const task = await this.fhirService.getResource('Task', taskId);
    if (!task) throw new NotFoundException('Task not found');
    
    if (task.code !== 'teleconsult') {
      // Assuming 'code' denotes it's a teleconsult task
      // In a strict FHIR implementation, code would be a CodeableConcept
    }

    const isOwner = task.owner?.reference === `Organization/\${user.facilityId}`;
    const isRequester = task.requester?.reference === `Organization/\${user.facilityId}`;
    
    if (!isOwner && !isRequester) {
      throw new ForbiddenException('User is not authorized for this consultation');
    }

    const participantName = `\${user.role} (\${user.facilityId})`;

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user.userId,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: taskId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'TELECONSULT_JOINED',
      resourceType: 'Task',
      resourceId: taskId,
      requestId: correlationId,
      result: 'SUCCESS',
    });

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    };
  }

  async getWaitingRoom(facilityId: string) {
    try {
      const bundle = await this.fhirService.getResource('Task', '');
      if (!bundle || !bundle.entry) return [];

      return bundle.entry
        .map((e: any) => e.resource)
        .filter((task: any) => {
          if (task.resourceType !== 'Task') return false;
          if (task.code !== 'teleconsult') return false;
          if (task.status !== 'accepted' && task.status !== 'in-progress') return false;
          
          return task.owner?.reference === `Organization/\${facilityId}`;
        });
    } catch (e) {
      this.logger.error('Failed to get waiting room', e);
      return [];
    }
  }

  async completeConsultation(taskId: string, notes: string, user: any, correlationId: string) {
    // 1. Fetch the Task
    const task = await this.fhirService.getResource('Task', taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (task.owner?.reference !== `Organization/\${user.facilityId}`) {
      throw new ForbiddenException('Only the receiving facility specialist can complete this consultation');
    }

    // 2. Update Task Status
    task.status = 'completed';
    task.lastModified = new Date().toISOString();
    task.output = [{
      type: { text: 'Clinical Notes' },
      valueString: notes
    }];
    await this.fhirService.createOrUpdate('Task', taskId, task, task.meta?.versionId, 'UPDATE');

    // 3. Create Encounter
    const encounterId = require('uuid').v4();
    const encounter = {
      resourceType: 'Encounter',
      id: encounterId,
      status: 'finished',
      class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'VR', display: 'virtual' },
      subject: task.for,
      participant: [{ individual: { reference: `PractitionerRole/\${user.userId}` } }],
      serviceProvider: { reference: `Organization/\${user.facilityId}` },
      period: { end: new Date().toISOString() }
    };
    await this.fhirService.createOrUpdate('Encounter', encounterId, encounter, undefined, 'CREATE');

    // 4. Create CarePlan (Counter-Referral/Follow-up)
    const carePlanId = require('uuid').v4();
    const carePlan = {
      resourceType: 'CarePlan',
      id: carePlanId,
      status: 'active',
      intent: 'plan',
      subject: task.for,
      author: { reference: `PractitionerRole/\${user.userId}` },
      // Assinging follow-up back to the requester
      careTeam: [task.requester], 
      description: `Follow-up required. Specialist Notes: \${notes}`,
      created: new Date().toISOString()
    };
    await this.fhirService.createOrUpdate('CarePlan', carePlanId, carePlan, undefined, 'CREATE');

    await this.auditService.logEvent({
      userId: user.userId,
      role: user.role,
      facilityId: user.facilityId,
      action: 'TELECONSULT_COMPLETED',
      resourceType: 'Task',
      resourceId: taskId,
      requestId: correlationId,
      result: 'SUCCESS',
    });

    return { task, encounter, carePlan };
  }
}

