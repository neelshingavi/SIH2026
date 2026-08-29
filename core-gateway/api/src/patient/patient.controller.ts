import { Controller, Get, Param, Query } from '@nestjs/common';
import { PatientService } from './patient.service.js';

@Controller('patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('search')
  search(@Query('name') name: string, @Query('phone') phone: string) {
    return this.patientService.searchPatients(name, phone);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.patientService.getPatientHistory(id);
  }
}
