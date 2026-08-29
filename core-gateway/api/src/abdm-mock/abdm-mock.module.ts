import { Module } from '@nestjs/common';
import { AbdmMockService } from './abdm-mock.service.js';
import { AbdmMockController } from './abdm-mock.controller.js';

@Module({
  controllers: [AbdmMockController],
  providers: [AbdmMockService],
})
export class AbdmMockModule {}
