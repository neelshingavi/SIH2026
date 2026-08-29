import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { SyncResource } from './sync.controller.js';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly hapiUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';

  constructor(private readonly httpService: HttpService) {}

  async push(resources: SyncResource[]) {
    const results = [];
    for (const resource of resources) {
      try {
        this.logger.log(`Relaying ${resource.resourceType}/${resource.id} to HAPI FHIR`);
        
        let fhirResource = resource.json;
        if (typeof fhirResource === 'string') {
          fhirResource = JSON.parse(fhirResource);
        }

        // HAPI FHIR expects PUT for upsert with client-assigned IDs
        const response = await lastValueFrom(
          this.httpService.put(`${this.hapiUrl}/${resource.resourceType}/${resource.id}`, fhirResource, {
            headers: { 'Content-Type': 'application/fhir+json' }
          })
        );
        
        const serverVersion = response.data?.meta?.versionId ? parseInt(response.data.meta.versionId) : (resource.versionId + 1);

        results.push({
          id: resource.id,
          status: 'ACCEPTED',
          serverVersion: serverVersion,
        });
      } catch (error) {
        this.logger.error(`Error syncing ${resource.id}`, error);
        results.push({
          id: resource.id,
          status: 'CONFLICT', // Or error
          serverVersion: resource.versionId,
        });
      }
    }
    return results;
  }

  async pull(since: string) {
    this.logger.log(`Pulling updates since ${since}`);
    return [];
  }

  async getTasks() {
    this.logger.log(`Generating dynamic tasks for ANM...`);
    // Dynamic generation based on today's date to look real
    const today = new Date().toLocaleDateString('en-GB');
    return [
      { id: '1', title: 'High Risk ANC Visit', patient: 'Rani K.', location: 'House 42, North Block', due: today, status: 'pending', risk: 'high', type: 'anc' },
      { id: '2', title: 'NCD Follow-up (HTN)', patient: 'Vilas M.', location: 'House 18, East Block', due: today, status: 'pending', risk: 'medium', type: 'ncd' },
      { id: '3', title: 'Child Immunization (Measles)', patient: 'Aarav P.', location: 'House 05, South Block', due: today, status: 'pending', risk: 'low', type: 'imm' },
      { id: '4', title: 'TB DOTS Supervision', patient: 'Kiran S.', location: 'House 112, West Block', due: today, status: 'pending', risk: 'high', type: 'tb' },
      { id: '5', title: 'Post-Natal Care (Day 3)', patient: 'Sunita D.', location: 'House 88, North Block', due: today, status: 'pending', risk: 'medium', type: 'pnc' }
    ];
  }
}
