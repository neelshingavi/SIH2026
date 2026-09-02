import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueueEntry } from './entities/queue.entity.js';
import { FhirService } from '../fhir/fhir.service.js';

const VALID_TRANSITIONS: Record<string, string> = {
  WAITING: 'CALLED',
  CALLED: 'IN_CONSULT',
  IN_CONSULT: 'DONE',
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(QueueEntry)
    private readonly queueRepo: Repository<QueueEntry>,
    private readonly fhirService: FhirService,
  ) {}

  async createEntry(dto: {
    facilityId: string;
    patientName: string;
    age: string;
    gender: string;
    chiefComplaint: string;
    priority: string;
    bpVital?: string;
    spo2Vital?: string;
    tempVital?: string;
    weight?: string;
    hb?: string;
    previousCheckup?: string;
    healthStatus?: string;
  }) {
    // Auto-increment token per facility
    const count = await this.queueRepo.count({ where: { facilityId: dto.facilityId } });

    const entry = this.queueRepo.create({
      ...dto,
      token: count + 1,
      status: 'WAITING',
      bpVital: dto.bpVital ?? '',
      spo2Vital: dto.spo2Vital ?? '',
      tempVital: dto.tempVital ?? '',
      weight: dto.weight ?? '',
      hb: dto.hb ?? '',
      previousCheckup: dto.previousCheckup ?? '',
      healthStatus: dto.healthStatus ?? '',
    });
    const saved = await this.queueRepo.save(entry);

    // Create FHIR Task with SLA
    try {
      const slaMinutes = dto.priority === 'EMERGENCY' ? 15 : dto.priority === 'HIGH' ? 30 : 120;
      const slaEnd = new Date(Date.now() + slaMinutes * 60000).toISOString();

      const task = {
        resourceType: 'Task',
        id: `task-\${saved.id}`,
        status: 'requested',
        intent: 'order',
        priority: dto.priority === 'EMERGENCY' ? 'stat' : dto.priority === 'HIGH' ? 'urgent' : 'routine',
        description: `Patient Referral / Triage: \${dto.chiefComplaint}`,
        restriction: {
          period: {
            end: slaEnd
          }
        },
        for: {
          display: dto.patientName
        }
      };
      await this.fhirService.createOrUpdate('Task', task.id, task, undefined, 'CREATE');
    } catch (e: any) {
      this.logger.error('Failed to create FHIR Task', e.stack);
    }

    return saved;
  }

  async advanceStatus(id: string) {
    const entry = await this.queueRepo.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Queue entry ${id} not found`);

    const next = VALID_TRANSITIONS[entry.status];
    if (!next) {
      throw new Error(`Entry is already in terminal status: ${entry.status}`);
    }

    this.logger.log(`Advancing ${id}: ${entry.status} -> ${next}`);
    entry.status = next;
    return this.queueRepo.save(entry);
  }

  async getQueueByFacility(facilityId: string) {
    const entries = await this.queueRepo.find({
      where: { facilityId },
      order: { createdAt: 'ASC' },
    });

    // Sort: EMERGENCY first, then HIGH, then NORMAL; within each group by token
    const priorityOrder: Record<string, number> = { EMERGENCY: 0, HIGH: 1, NORMAL: 2 };
    return entries.sort((a, b) => {
      const pA = priorityOrder[a.priority] ?? 9;
      const pB = priorityOrder[b.priority] ?? 9;
      if (pA !== pB) return pA - pB;
      return a.token - b.token;
    });
  }

  async seedFacility(facilityId: string) {
    const existing = await this.queueRepo.count({ where: { facilityId } });
    if (existing > 0) return { message: 'Already seeded', count: existing };

    const seed = [
      { patientName: 'Sunita Sharma', age: '28', gender: 'F', priority: 'EMERGENCY', chiefComplaint: 'Chest pain, shortness of breath', bpVital: '160/100', spo2Vital: '94%', tempVital: '99.1°F' },
      { patientName: 'Ravi Kumar', age: '45', gender: 'M', priority: 'HIGH', chiefComplaint: 'High fever since 3 days', bpVital: '110/70', tempVital: '103.2°F' },
      { patientName: 'Aarti Patil', age: '32', gender: 'F', priority: 'HIGH', chiefComplaint: '8th month ANC – reduced movements', bpVital: '130/85', spo2Vital: '98%' },
      { patientName: 'Mohan Shinde', age: '60', gender: 'M', priority: 'NORMAL', chiefComplaint: 'Diabetes follow-up, foot ulcer' },
      { patientName: 'Priya Kale', age: '22', gender: 'F', priority: 'NORMAL', chiefComplaint: 'Headache, cold since 2 days' },
      { patientName: 'Ramesh Bhosale', age: '55', gender: 'M', priority: 'NORMAL', chiefComplaint: 'Hypertension routine check', bpVital: '148/92' },
    ];

    const created = [];
    for (const s of seed) {
      created.push(await this.createEntry({ facilityId, ...s, spo2Vital: (s as any).spo2Vital ?? '' }));
    }
    return { message: 'Seeded', count: created.length };
  }

  async resetQueue() {
    await this.queueRepo.clear();
    return { message: 'Queue reset successfully' };
  }
}
