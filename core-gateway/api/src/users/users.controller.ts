import { Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from './entities/user.entity.js';
import * as bcrypt from 'bcrypt';

@Controller('users')
export class UsersController {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /** POST /users/seed — create demo users for all roles (idempotent) */
  @Post('seed')
  async seedUsers() {
    const DEMO_USERS = [
      { username: 'mo_dharampur',   password: 'demo1234', role: Role.MEDICAL_OFFICER, facilityId: 'PHC-001' },
      { username: 'specialist_dh',  password: 'demo1234', role: Role.SPECIALIST,       facilityId: 'DH-001'  },
      { username: 'anm_wagholi',    password: 'demo1234', role: Role.ANM,              facilityId: 'SC-001'  },
      { username: 'asha_worker',    password: 'demo1234', role: Role.ASHA,             facilityId: 'VILLAGE-01' },
      { username: 'pharmacist_phc', password: 'demo1234', role: Role.FACILITY_ADMIN,   facilityId: 'PHC-001' },
      { username: 'block_admin',    password: 'demo1234', role: Role.DISTRICT_OFFICER, facilityId: 'BLOCK-01' },
    ];

    const created: string[] = [];
    for (const u of DEMO_USERS) {
      const existing = await this.usersRepo.findOneBy({ username: u.username });
      if (!existing) {
        const passwordHash = await bcrypt.hash(u.password, 10);
        await this.usersRepo.save({ username: u.username, passwordHash, role: u.role, facilityId: u.facilityId });
        created.push(u.username);
      }
    }
    return { message: 'Demo users seeded', created, skipped: DEMO_USERS.length - created.length };
  }
}
