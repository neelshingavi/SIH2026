import { PartialType } from '@nestjs/mapped-types';
import { CreateDiagnosticDto } from './create-diagnostic.dto.js';

export class UpdateDiagnosticDto extends PartialType(CreateDiagnosticDto) {}
