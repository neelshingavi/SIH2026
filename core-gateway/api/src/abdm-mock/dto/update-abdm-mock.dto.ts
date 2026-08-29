import { PartialType } from '@nestjs/mapped-types';
import { CreateAbdmMockDto } from './create-abdm-mock.dto.js';

export class UpdateAbdmMockDto extends PartialType(CreateAbdmMockDto) {}
