import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrescriptionController } from './prescription.controller.js';
import { PrescriptionEntry } from './entities/prescription-entry.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([PrescriptionEntry])],
  controllers: [PrescriptionController],
  providers: [],
})
export class PrescriptionModule {}
