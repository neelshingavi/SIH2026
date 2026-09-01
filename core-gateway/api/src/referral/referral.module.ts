import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralController } from './referral.controller.js';
import { ReferralEntry } from './entities/referral-entry.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReferralEntry])],
  controllers: [ReferralController],
  providers: [],
})
export class ReferralModule {}
