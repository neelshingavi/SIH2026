import { PartialType } from '@nestjs/mapped-types';
import { RegisterPatientDto } from './create-patient.dto.js';

export class UpdatePatientDto extends PartialType(RegisterPatientDto) {}
