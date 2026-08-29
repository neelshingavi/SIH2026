import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teleconsult } from './entities/teleconsult.entity.js';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class TeleconsultService {
  private readonly logger = new Logger(TeleconsultService.name);
  
  // Use generic mock credentials for prototype if env vars not set
  private readonly apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

  constructor(
    @InjectRepository(Teleconsult)
    private readonly teleconsultRepo: Repository<Teleconsult>,
  ) {}

  async createToken(roomName: string, participantName: string, isDoctor: boolean) {
    this.logger.log(`Generating LiveKit token for ${participantName} in room ${roomName}`);
    
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      token: await at.toJwt(),
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    };
  }

  // --- Queue Management ---

  async getQueue(hubFacilityId: string) {
    return this.teleconsultRepo.find({
      where: { hubFacilityId },
      order: { createdAt: 'ASC' },
    });
  }

  async createRequest(dto: { hubFacilityId: string; spokeFacilityId: string; patientName: string; condition: string; priority: string }) {
    const entry = this.teleconsultRepo.create({
      ...dto,
      status: 'WAITING',
    });
    return this.teleconsultRepo.save(entry);
  }

  async updateStatus(id: string, status: string) {
    const entry = await this.teleconsultRepo.findOneBy({ id });
    if (!entry) throw new NotFoundException(`Teleconsult ${id} not found`);
    
    entry.status = status;
    return this.teleconsultRepo.save(entry);
  }

  async seed(hubFacilityId: string) {
    const existing = await this.teleconsultRepo.count({ where: { hubFacilityId } });
    if (existing > 0) return { message: 'Already seeded', count: existing };

    const seeds = [
      { spokeFacilityId: 'Pabal Sub-Centre', patientName: 'Sunita Sharma', condition: 'BP 140/90', priority: 'high' },
      { spokeFacilityId: 'Mohol Sub-Centre', patientName: 'Ramesh Koli', condition: 'Fever, Cough', priority: 'routine' },
      { spokeFacilityId: 'Kurduwadi SC', patientName: 'Priya Patil', condition: 'Pregnancy ANC', priority: 'high' },
    ];

    const created = [];
    for (const s of seeds) {
      created.push(await this.createRequest({ hubFacilityId, ...s }));
    }
    return { message: 'Seeded', count: created.length };
  }
}
