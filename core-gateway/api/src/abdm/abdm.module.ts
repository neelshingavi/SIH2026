import { Module, forwardRef } from '@nestjs/common';
import { AbdmGatewayService } from './abdm-gateway.service.js';
import { AbdmController } from './abdm.controller.js';
import { HieModule } from '../hie/hie.module.js';

@Module({
  imports: [forwardRef(() => HieModule)],
  providers: [AbdmGatewayService],
  controllers: [AbdmController],
  exports: [AbdmGatewayService],
})
export class AbdmModule {}
