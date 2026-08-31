import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncOperationDto } from './sync.controller.js';
import { SyncIdempotency } from './entities/sync-idempotency.entity.js';
import { FhirService } from '../fhir/fhir.service.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(SyncIdempotency)
    private readonly idempRepo: Repository<SyncIdempotency>,
    private readonly fhirService: FhirService,
    private readonly auditService: AuditService,
  ) {}

  async push(operations: SyncOperationDto[], user: any, correlationId: string) {
    const results = [];
    
    for (const op of operations) {
      this.logger.log(`[${correlationId}] Processing ${op.operation} for ${op.resource.resourceType}/${op.resource.id}`);
      
      try {
        // Enforce Facility Isolation
        if (op.resource.facilityId && op.resource.facilityId !== user.facilityId) {
          throw new ForbiddenException('Cannot sync resources for a facility outside of your scope.');
        }

        // 1. Check idempotency
        const alreadyApplied = await this.idempRepo.findOneBy({ idempotencyKey: op.idempotencyKey });
        if (alreadyApplied) {
          results.push({
            operationId: op.operationId,
            resourceId: op.resource.id,
            status: alreadyApplied.status,
          });
          continue;
        }

        // 2. Proxy to true FHIR server (Conflict detection handled by HAPI FHIR versioning if supported)
        let jsonPayload = op.resource.json;
        if (typeof jsonPayload === 'string') {
          jsonPayload = JSON.parse(jsonPayload);
        }

        // Add server-assigned provenance if missing
        if (!jsonPayload.meta) jsonPayload.meta = {};
        
        try {
          await this.fhirService.createOrUpdate(
            op.resource.resourceType, 
            op.resource.id, 
            jsonPayload,
            op.resource.versionId,
            op.operation
          );
        } catch (fhirError: any) {
          if (fhirError.message === 'FHIR_CONFLICT') {
            await this._markIdempotency(op, 'CONFLICT');
            await this.auditService.logEvent({
              userId: user.userId,
              role: user.role,
              facilityId: user.facilityId,
              action: `SYNC_CONFLICT`,
              resourceType: op.resource.resourceType,
              resourceId: op.resource.id,
              requestId: correlationId,
              result: 'CONFLICT',
            });
            results.push({ operationId: op.operationId, resourceId: op.resource.id, status: 'CONFLICT' });
            continue;
          }
          throw fhirError;
        }

        await this._markIdempotency(op, 'APPLIED');
        await this.auditService.logEvent({
          userId: user.userId,
          role: user.role,
          facilityId: user.facilityId,
          action: `SYNC_${op.operation}`,
          resourceType: op.resource.resourceType,
          resourceId: op.resource.id,
          requestId: correlationId,
          result: 'SUCCESS',
        });

        results.push({
          operationId: op.operationId,
          resourceId: op.resource.id,
          status: 'APPLIED',
        });
      } catch (error) {
        this.logger.error(`Error processing operation ${op.operationId}`, error.message);
        const status = error instanceof ForbiddenException ? 'FORBIDDEN' : 'SERVER_ERROR';
        
        await this.auditService.logEvent({
          userId: user.userId,
          role: user.role,
          facilityId: user.facilityId,
          action: `SYNC_${op.operation}`,
          resourceType: op.resource.resourceType,
          resourceId: op.resource.id,
          requestId: correlationId,
          result: 'FAILED',
          reason: error.message,
        });

        results.push({
          operationId: op.operationId,
          resourceId: op.resource.id,
          status: status,
        });
      }
    }
    
    return { results };
  }

  private async _markIdempotency(op: SyncOperationDto, status: string) {
    const rec = this.idempRepo.create({
      idempotencyKey: op.idempotencyKey,
      operationId: op.operationId,
      resourceId: op.resource.id,
      status: status,
    });
    await this.idempRepo.save(rec);
  }

  async pull(since: string, user: any) {
    this.logger.log(`Pulling updates since ${since} for facility ${user.facilityId}`);
    return []; // Left as stub until full HAPI FHIR search query is implemented
  }

  async getTasks() {
    return [];
  }
}
