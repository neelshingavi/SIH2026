import { SetMetadata } from '@nestjs/common';

export enum Role {
  ASHA = 'asha',
  ANM = 'anm',
  MO = 'mo',
  SPECIALIST = 'specialist',
  DISTRICT_OFFICER = 'district_officer',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (Role | string)[]) => SetMetadata(ROLES_KEY, roles);
