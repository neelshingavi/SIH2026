import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CircuitBreaker } from '../common/utils/circuit-breaker.js';

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);
  private readonly fhirBaseUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';
  private readonly circuitBreaker = new CircuitBreaker(5, 30000); // 5 failures, 30s timeout

  constructor(private readonly httpService: HttpService) {}

  async createOrUpdate(resourceType: string, id: string, payload: any, versionId?: number, operation?: string) {
    return this.circuitBreaker.fire(async () => {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/fhir+json',
        };

        if (operation === 'UPDATE' && versionId !== undefined) {
          headers['If-Match'] = `W/"\${versionId}"`;
        }
        
        if (operation === 'CREATE') {
          headers['If-None-Exist'] = `_id=\${id}`;
        }

        const response = await lastValueFrom(
          this.httpService.put(`\${this.fhirBaseUrl}/\${resourceType}/\${id}`, payload, { headers })
        );
        return response.data;
      } catch (e: any) {
        if (e.response?.status === 412) {
          this.logger.warn(`Conflict detected for \${resourceType}/\${id}. Client sent version: \${versionId}`);
          throw new Error('FHIR_CONFLICT');
        }
        this.logger.error(`Error saving \${resourceType}/\${id} to HAPI FHIR: \${e.message}`);
        throw e;
      }
    });
  }

  async getResource(resourceType: string, id: string) {
    return this.circuitBreaker.fire(async () => {
      try {
        const response = await lastValueFrom(
          this.httpService.get(`\${this.fhirBaseUrl}/\${resourceType}/\${id}`, {
            headers: { 'Accept': 'application/fhir+json' },
          })
        );
        return response.data;
      } catch (e: any) {
        if (e.response?.status === 404) return null;
        throw e;
      }
    });
  }

  async searchResources(resourceType: string, queryParams: any) {
    return this.circuitBreaker.fire(async () => {
      try {
        const searchParams = new URLSearchParams(queryParams);
        const qs = searchParams.toString();
        const url = `\${this.fhirBaseUrl}/\${resourceType}\${qs ? '?' + qs : ''}`;
        
        const response = await lastValueFrom(
          this.httpService.get(url, {
            headers: { 'Accept': 'application/fhir+json' },
          })
        );
        return response.data?.entry?.map((e: any) => e.resource) || [];
      } catch (e: any) {
        this.logger.error(`Error searching \${resourceType}: \${e.message}`);
        throw e;
      }
    });
  }

  async getPatientEverything(patientId: string) {
    return this.circuitBreaker.fire(async () => {
      try {
        const response = await lastValueFrom(
          this.httpService.get(`\${this.fhirBaseUrl}/Patient/\${patientId}/$everything`, {
            headers: { 'Accept': 'application/fhir+json' },
          })
        );
        return response.data;
      } catch (e: any) {
        this.logger.error(`Error fetching patient timeline for \${patientId}`, e.message);
        throw e;
      }
    });
  }
}
