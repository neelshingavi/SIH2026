import { HieService } from './hie.service.js';
import { HieOutboxService } from './hie-outbox.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@UseGuards(JwtAuthGuard)
@Controller('hie')
export class HieController {
  constructor(
    private readonly hieService: HieService,
    private readonly outboxService: HieOutboxService
  ) {}

  @Post('export')
  async exportRecord(@Req() req: any, @Body() body: any) {
    const { patientId, purpose, recipientFacilityId, priority, idempotencyKey } = body;
    if (!patientId || !purpose || !recipientFacilityId || !idempotencyKey) {
      throw new ForbiddenException('Missing required fields for export');
    }
    return this.outboxService.queueExport(
      patientId, 
      recipientFacilityId, 
      purpose, 
      priority || 'ROUTINE', 
      req.user, 
      req.correlationId, 
      idempotencyKey
    );
  }

  @Post('import')
  async importRecord(@Req() req: any, @Body() body: any) {
    // Note: In real life, external imports might have a different guard or trust mechanism
    return this.hieService.importClinicalSummary(body, req.user, req.correlationId);
  }
}
