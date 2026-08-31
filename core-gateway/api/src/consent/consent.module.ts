import { Module } from '@nestjs/common';
import { ConsentService } from './consent.service.js';
import { BreakGlassService } from './break-glass.service.js';
import { ConsentController } from './consent.controller.js';
// We don't import CarePathwayModule directly if it causes circular dependency,
// but let's assume it's imported in app.module or we can add it here.
import { CarePathwayModule } from '../care-pathway/care-pathway.module.js';

@Module({
  imports: [CarePathwayModule],
  providers: [ConsentService, BreakGlassService],
  controllers: [ConsentController],
  exports: [ConsentService, BreakGlassService],
})
export class ConsentModule {}
