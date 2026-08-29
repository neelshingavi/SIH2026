import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralService } from './referral.service.js';
import { ReferralController } from './referral.controller.js';
import { Referral } from './entities/referral.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Referral])],
  controllers: [ReferralController],
  providers: [ReferralService],
})
export class ReferralModule {}
