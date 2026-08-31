import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { PatientService } from './patient.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FacilityScopeGuard } from '../auth/guards/facility-scope.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../users/entities/user.entity.js';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard, FacilityScopeGuard)
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post('check-duplicate')
  @Roles(Role.ASHA, Role.ANM, Role.MEDICAL_OFFICER, Role.CHO)
  checkDuplicate(@Body() patientDto: any, @Req() req: any) {
    return this.patientService.checkDuplicate(patientDto, req.user, req.correlationId);
  }

  @Get(':id/history')
  @Roles(Role.ASHA, Role.ANM, Role.MEDICAL_OFFICER, Role.SPECIALIST, Role.CHO)
  getHistory(@Param('id') id: string, @Req() req: any) {
    return this.patientService.getPatientHistory(id, req.user, req.correlationId);
  }
}

