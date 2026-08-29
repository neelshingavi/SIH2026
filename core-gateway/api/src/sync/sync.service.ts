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
}
