import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralService } from './referral.service.js';
import { ReferralController } from './referral.controller.js';
import { Referral } from './entities/referral.entity.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Referral]), QueueModule],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
