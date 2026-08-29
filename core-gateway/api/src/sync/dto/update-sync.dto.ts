import { PartialType } from '@nestjs/mapped-types';
import { CreateSyncDto } from './create-sync.dto.js';

export class UpdateSyncDto extends PartialType(CreateSyncDto) {}
