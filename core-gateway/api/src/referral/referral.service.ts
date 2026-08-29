import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Referral } from './entities/referral.entity.js';

const VALID_TRANSITIONS: Record<string, string> = {
  CREATED:    'ACCEPTED',
  ACCEPTED:   'IN_TRANSIT',
  IN_TRANSIT: 'ARRIVED',
  ARRIVED:    'COMPLETED',
};

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
  ) {}

  async create(dto: {
    patientName: string;
    age?: string;
    gender?: string;
    fromFacilityId: string;
    toFacilityId: string;
    reason: string;
    notes?: string;
    priority?: string;
  }) {
    const ref = this.referralRepo.create({
      patientName: dto.patientName,
      age: dto.age ?? '',
      gender: dto.gender ?? 'M',
      fromFacilityId: dto.fromFacilityId,
      toFacilityId: dto.toFacilityId,
      reason: dto.reason,
      notes: dto.notes ?? '',
      priority: dto.priority ?? 'NORMAL',
      status: 'CREATED',
    });
    return this.referralRepo.save(ref);
  }

  async advance(id: string) {
    const ref = await this.referralRepo.findOneBy({ id });
    if (!ref) throw new NotFoundException(`Referral ${id} not found`);

    const next = VALID_TRANSITIONS[ref.status];
    if (!next) throw new Error(`Already in terminal status: ${ref.status}`);

    this.logger.log(`Advancing referral ${id}: ${ref.status} -> ${next}`);
    ref.status = next;
    return this.referralRepo.save(ref);
  }

  async getForFacility(facilityId: string) {
    return this.referralRepo.find({
      where: { toFacilityId: facilityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAll() {
    return this.referralRepo.find({ order: { createdAt: 'DESC' } });
  }

  async seed(facilityId: string) {
    const existing = await this.referralRepo.count({ where: { toFacilityId: facilityId } });
    if (existing > 0) return { message: 'Already seeded', count: existing };

    const seeds = [
      { patientName: 'Sunita Sharma', age: '28', gender: 'F', fromFacilityId: 'SC-Wagholi', reason: 'High BP (150/100) – ANC High Risk', priority: 'HIGH', notes: 'BP not controlled, requires specialist evaluation' },
      { patientName: 'Ramesh Dattatray K.', age: '45', gender: 'M', fromFacilityId: 'SC-Khed', reason: 'Chest Pain – ECG changes', priority: 'EMERGENCY', notes: 'Possible acute coronary event' },
      { patientName: 'Anita Shelar', age: '32', gender: 'F', fromFacilityId: 'PHC-Bhor', reason: 'ANC high risk – anaemia', priority: 'HIGH', notes: 'Hb: 7.2 g/dL, 34 weeks' },
      { patientName: 'Vikas More', age: '56', gender: 'M', fromFacilityId: 'PHC-Daund', reason: 'Diabetic foot ulcer – Grade 3', priority: 'NORMAL', notes: 'Needs wound care and surgical opinion' },
    ];

    const created: Referral[] = [];
    for (const s of seeds) {
      created.push(await this.create({ ...s, toFacilityId: facilityId }));
    }
    // Advance a couple to show different states
    if (created[1]) await this.advance(created[1].id);           // ACCEPTED
    if (created[2]) { await this.advance(created[2].id); await this.advance(created[2].id); } // IN_TRANSIT
    if (created[3]) { await this.advance(created[3].id); await this.advance(created[3].id); await this.advance(created[3].id); } // ARRIVED

    return { message: 'Seeded', count: created.length };
  }
}
