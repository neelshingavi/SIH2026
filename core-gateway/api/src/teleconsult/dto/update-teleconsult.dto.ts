import { PartialType } from '@nestjs/mapped-types';
import { CreateTeleconsultDto } from './create-teleconsult.dto.js';

export class UpdateTeleconsultDto extends PartialType(CreateTeleconsultDto) {}
