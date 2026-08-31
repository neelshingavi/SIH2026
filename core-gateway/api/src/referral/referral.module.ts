import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service.js';
import { ReferralController } from './referral.controller.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [QueueModule],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
