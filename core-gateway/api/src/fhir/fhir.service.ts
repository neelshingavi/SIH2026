import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);
  private readonly fhirBaseUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';

  constructor(private readonly httpService: HttpService) {}

  async createOrUpdate(resourceType: string, id: string, payload: any, versionId?: number, operation?: string) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/fhir+json',
      };

      // FHIR Versioning: If it's an update, ensure we only overwrite the exact version we started from.
      if (operation === 'UPDATE' && versionId !== undefined) {
        headers['If-Match'] = `W/"\${versionId}"`;
      }
      
      // FHIR Conditional Create (preventing overwrites of existing by accident if we thought it was a CREATE)
      if (operation === 'CREATE') {
        headers['If-None-Exist'] = `_id=\${id}`;
      }

      const response = await lastValueFrom(
        this.httpService.put(`\${this.fhirBaseUrl}/\${resourceType}/\${id}`, payload, {
          headers,
        })
      );
      return response.data;
    } catch (e: any) {
      if (e.response?.status === 412) {
        this.logger.warn(`Conflict detected for \${resourceType}/\${id}. Client sent version: \${versionId}`);
        throw new Error('FHIR_CONFLICT');
      }
      if (e.response?.status === 200 && operation === 'CREATE') {
         // If-None-Exist will return 200 OK without modifying if it exists. 
         // For true FHIR servers, this indicates it was already there.
      }
      this.logger.error(`Error saving \${resourceType}/\${id} to HAPI FHIR: \${e.message}`);
      throw e;
    }
  }

  async getResource(resourceType: string, id: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`\${this.fhirBaseUrl}/\${resourceType}/\${id}`, {
          headers: { 'Accept': 'application/fhir+json' },
        })
      );
      return response.data;
    } catch (e) {
      if (e.response?.status === 404) return null;
      throw e;
    }
  }

  async getPatientEverything(patientId: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`\${this.fhirBaseUrl}/Patient/\${patientId}/$everything`, {
          headers: { 'Accept': 'application/fhir+json' },
        })
      );
      return response.data;
    } catch (e) {
      this.logger.error(`Error fetching patient timeline for \${patientId}`, e.message);
      throw e;
    }
  }
}
