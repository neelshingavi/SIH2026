import { Module } from '@nestjs/common';
import { HieService } from './hie.service.js';
import { HieOutboxService } from './hie-outbox.service.js';
import { HieController } from './hie.controller.js';
import { ConsentModule } from '../consent/consent.module.js';

@Module({
  imports: [ConsentModule],
  providers: [HieService, HieOutboxService],
  controllers: [HieController],
  exports: [HieService, HieOutboxService],
})
export class HieModule {}
