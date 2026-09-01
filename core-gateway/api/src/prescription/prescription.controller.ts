import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrescriptionEntry } from './entities/prescription-entry.entity.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PrescriptionController {
  constructor(
    @InjectRepository(PrescriptionEntry)
    private readonly repo: Repository<PrescriptionEntry>,
  ) {}

  @Get()
  async getPrescriptions(@Query('facilityId') facilityId: string, @Query('patientId') patientId: string) {
    const where: any = {};
    if (facilityId) where.facilityId = facilityId;
    if (patientId) where.patientId = patientId;

    return this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  @Post()
  @Roles(Role.MEDICAL_OFFICER, Role.SPECIALIST)
  async createPrescription(@Body() body: Partial<PrescriptionEntry>) {
    const entry = this.repo.create({
      facilityId: body.facilityId || 'PHC-001',
      patientId: body.patientId || 'pat-123',
      patientName: body.patientName || 'Unknown Patient',
      medicineName: body.medicineName || 'Generic Medicine',
      dose: body.dose || '1',
      frequency: body.frequency || 'OD',
      duration: body.duration || '3 Days',
      advice: body.advice || '',
      status: 'PRESCRIBED'
    });
    return this.repo.save(entry);
  }
}
