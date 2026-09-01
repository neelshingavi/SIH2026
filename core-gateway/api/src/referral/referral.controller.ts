import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferralEntry, ReferralStatus, ReferralPriority } from './entities/referral-entry.entity.js';

const STATUS_ADVANCE: Record<ReferralStatus, ReferralStatus | null> = {
  CREATED:    'ACCEPTED',
  ACCEPTED:   'IN_TRANSIT',
  IN_TRANSIT: 'ARRIVED',
  ARRIVED:    'COMPLETED',
  COMPLETED:  null,
};

const DEMO_REFERRALS = [
  { fromFacilityId: 'SC-Wagholi',  patientName: 'Sunita Deshpande', age: '28', gender: 'F', reason: 'Pre-eclampsia — BP 160/110, proteinuria',     priority: 'EMERGENCY' as ReferralPriority, status: 'CREATED'   as ReferralStatus },
  { fromFacilityId: 'SC-Khed',     patientName: 'Lata Patil',        age: '34', gender: 'F', reason: '36-wk ANC — fetal growth restriction',           priority: 'HIGH'      as ReferralPriority, status: 'ACCEPTED'  as ReferralStatus },
  { fromFacilityId: 'PHC-Bhor',    patientName: 'Arjun Kamble',      age: '58', gender: 'M', reason: 'Acute chest pain, ECG changes',                   priority: 'EMERGENCY' as ReferralPriority, status: 'IN_TRANSIT' as ReferralStatus },
  { fromFacilityId: 'SC-Wagholi',  patientName: 'Meena Jadhav',      age: '22', gender: 'F', reason: 'Post-partum haemorrhage — EBL 900 mL',            priority: 'EMERGENCY' as ReferralPriority, status: 'ARRIVED'   as ReferralStatus },
  { fromFacilityId: 'PHC-Daund',   patientName: 'Ramesh Shinde',     age: '45', gender: 'M', reason: 'Diabetic foot ulcer — suspected osteomyelitis',    priority: 'HIGH'      as ReferralPriority, status: 'CREATED'   as ReferralStatus },
  { fromFacilityId: 'SC-Khed',     patientName: 'Priya More',        age: '30', gender: 'F', reason: 'Eclampsia with seizures',                           priority: 'EMERGENCY' as ReferralPriority, status: 'COMPLETED' as ReferralStatus },
];

@Controller('referral')
export class ReferralController {
  constructor(
    @InjectRepository(ReferralEntry)
    private readonly repo: Repository<ReferralEntry>,
  ) {}

  /** GET /referral?facilityId=PHC-001 — list all referrals for a facility */
  @Get()
  async getReferrals(@Query('facilityId') facilityId: string) {
    const list = await this.repo.find({
      where: { facilityId: facilityId || 'PHC-001' },
      order: { createdAt: 'DESC' },
    });
    return list;
  }

  /** POST /referral — create a new referral */
  @Post()
  async createReferral(@Body() body: Partial<ReferralEntry>) {
    const entry = this.repo.create({
      facilityId:     body.facilityId     || 'PHC-001',
      fromFacilityId: body.fromFacilityId || 'SC-001',
      patientName:    body.patientName    || 'Unknown Patient',
      age:            body.age            || '',
      gender:         body.gender         || 'F',
      reason:         body.reason         || '',
      notes:          body.notes          || '',
      priority:       body.priority       || 'NORMAL',
      status:         'CREATED',
    });
    return this.repo.save(entry);
  }

  /** PATCH /referral/:id/advance — advance to next status */
  @Patch(':id/advance')
  async advance(@Param('id') id: string) {
    const entry = await this.repo.findOneBy({ id });
    if (!entry) return { error: 'Not found' };
    const next = STATUS_ADVANCE[entry.status];
    if (!next) return entry; // already COMPLETED
    entry.status = next;
    return this.repo.save(entry);
  }

  /** POST /referral/seed?facilityId=PHC-001 — seed demo data */
  @Post('seed')
  async seed(@Query('facilityId') facilityId: string) {
    const fid = facilityId || 'PHC-001';
    const existing = await this.repo.count({ where: { facilityId: fid } });
    if (existing > 0) return { message: 'Already seeded', count: existing };
    const entries = DEMO_REFERRALS.map(r => this.repo.create({ ...r, facilityId: fid }));
    await this.repo.save(entries);
    return { message: 'Seeded', count: entries.length };
  }
}
