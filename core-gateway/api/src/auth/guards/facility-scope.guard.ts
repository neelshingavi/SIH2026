import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service.js';

@Injectable()
export class FacilityScopeGuard implements CanActivate {
  constructor(private readonly auditService: AuditService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const body = request.body;
    const query = request.query;

    if (!user || !user.facilityId) {
      throw new ForbiddenException('User has no assigned facility scope');
    }

    const requestedFacility = body?.facilityId || query?.facilityId;
    
    // Emergency Access Override
    const isEmergency = body?.emergency === true || query?.emergency === 'true';
    const emergencyReason = body?.emergencyReason || query?.emergencyReason;

    if (requestedFacility && requestedFacility !== user.facilityId) {
      if (isEmergency) {
        if (!emergencyReason) {
          throw new ForbiddenException('Emergency access requires a valid reason');
        }
        
        await this.auditService.logEvent({
          userId: user.userId,
          role: user.role,
          facilityId: user.facilityId, // their home facility
          action: 'EMERGENCY_ACCESS',
          resourceType: 'CrossFacility',
          resourceId: requestedFacility,
          requestId: request.correlationId,
          result: 'GRANTED',
          reason: emergencyReason,
        });
        
        return true; // Granted
      }

      throw new ForbiddenException(`Cross-facility access denied. User belongs to ${user.facilityId}`);
    }

    return true;
  }
}

