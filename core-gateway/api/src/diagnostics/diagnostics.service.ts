import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DiagnosticsService {
  private readonly logger = new Logger(DiagnosticsService.name);
  private readonly hapiUrl = process.env.HAPI_FHIR_URL || 'http://localhost:8080/fhir';

  constructor(private readonly httpService: HttpService) {}

  async orderTest(patientId: string, testCode: string, testName: string, orderingProviderId: string) {
    this.logger.log(`Ordering lab test ${testName} for patient ${patientId}`);
    
    // Create FHIR ServiceRequest
    const serviceRequest = {
      resourceType: 'ServiceRequest',
      id: uuidv4(),
      status: 'active',
      intent: 'order',
      subject: { reference: `Patient/${patientId}` },
      requester: { reference: `Practitioner/${orderingProviderId}` },
      code: {
        coding: [{ system: 'http://loinc.org', code: testCode, display: testName }]
      },
      authoredOn: new Date().toISOString(),
    };

    try {
      await lastValueFrom(
        this.httpService.put(`${this.hapiUrl}/ServiceRequest/${serviceRequest.id}`, serviceRequest, {
          headers: { 'Content-Type': 'application/fhir+json' }
        })
      );
    } catch (error: any) {
      this.logger.warn(`Failed to push ServiceRequest to HAPI, returning mock. Error: ${error.message}`);
    }
    
    return serviceRequest;
  }

  async submitResult(serviceRequestId: string, patientId: string, resultValue: number, resultUnit: string, status: string = 'final') {
    this.logger.log(`Submitting result for ServiceRequest ${serviceRequestId}`);
    
    // Create FHIR DiagnosticReport
    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: uuidv4(),
      status: status,
      subject: { reference: `Patient/${patientId}` },
      basedOn: [{ reference: `ServiceRequest/${serviceRequestId}` }],
      result: [
        {
          reference: `#obs-1` // Inline contained observation for simplicity
        }
      ],
      contained: [
        {
          resourceType: 'Observation',
          id: 'obs-1',
          status: 'final',
          code: { text: 'Lab Result' },
          valueQuantity: { value: resultValue, unit: resultUnit }
        }
      ],
      issued: new Date().toISOString(),
    };

    try {
      await lastValueFrom(
        this.httpService.put(`${this.hapiUrl}/DiagnosticReport/${diagnosticReport.id}`, diagnosticReport, {
          headers: { 'Content-Type': 'application/fhir+json' }
        })
      );
      
      // Update original ServiceRequest status to completed
      // (Omitted for brevity, but would be a PATCH in production)
      
    } catch (error: any) {
      this.logger.warn(`Failed to push DiagnosticReport to HAPI, returning mock. Error: ${error.message}`);
    }

    return diagnosticReport;
  }
}
