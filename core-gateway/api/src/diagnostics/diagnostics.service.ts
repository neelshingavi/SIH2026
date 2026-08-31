import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import * as crypto from 'crypto';

export interface DiagnosticCapability {
  code: string;
  name: string;
  availableToday: boolean;
  nextSlotDate?: string;
  queueLength: number;
}

@Injectable()
export class DiagnosticsService {
  private readonly logger = new Logger(DiagnosticsService.name);

  // Mock Capability Registry for demo purposes, but the logic is FHIR-based
  private readonly facilityCapabilities: Record<string, DiagnosticCapability[]> = {
    'PHC-001': [
      { code: 'cbc', name: 'Complete Blood Count', availableToday: true, queueLength: 4 },
      { code: 'sugar', name: 'Blood Sugar', availableToday: true, queueLength: 2 }
    ],
    'RH-001': [
      { code: 'cbc', name: 'Complete Blood Count', availableToday: true, queueLength: 12 },
      { code: 'sugar', name: 'Blood Sugar', availableToday: true, queueLength: 5 },
      { code: 'ultrasound', name: 'Ultrasound', availableToday: false, nextSlotDate: '2026-09-03', queueLength: 0 },
      { code: 'xray', name: 'X-Ray', availableToday: true, queueLength: 8 }
    ]
  };

  constructor(private readonly fhirService: FhirService) {}

  async getCapabilities(facilityId: string): Promise<DiagnosticCapability[]> {
    return this.facilityCapabilities[facilityId] || [];
  }

  async getOrders(patientId?: string) {
    const query = patientId ? { subject: `Patient/${patientId}` } : {};
    return this.fhirService.searchResources('ServiceRequest', query);
  }

  async orderTest(patientId: string, testCode: string, testName: string, orderingProviderId: string = 'MO-1', destinationFacilityId: string = 'PHC-001') {
    this.logger.log(`Ordering lab test ${testName} for patient ${patientId} to ${destinationFacilityId}`);
    
    const serviceRequest = {
      resourceType: 'ServiceRequest',
      id: crypto.randomUUID(),
      status: 'active',
      intent: 'order',
      priority: 'routine',
      subject: { reference: `Patient/${patientId}` },
      requester: { reference: `Practitioner/${orderingProviderId}` },
      performer: [{ reference: `Organization/${destinationFacilityId}` }],
      code: {
        coding: [{ system: 'http://loinc.org', code: testCode, display: testName }]
      },
      authoredOn: new Date().toISOString(),
    };

    await this.fhirService.createOrUpdate('ServiceRequest', serviceRequest.id, serviceRequest, undefined, 'CREATE');
    return serviceRequest;
  }

  async submitResult(orderId: string, resultValue: number, resultUnit: string, testName: string) {
    this.logger.log(`Submitting result for Order ${orderId}`);
    
    const sr = await this.fhirService.getResource('ServiceRequest', orderId);
    if (!sr) throw new Error('ServiceRequest not found');

    sr.status = 'completed';
    await this.fhirService.createOrUpdate('ServiceRequest', sr.id, sr, sr.meta?.versionId, 'UPDATE');

    const observationId = crypto.randomUUID();
    const diagnosticReport = {
      resourceType: 'DiagnosticReport',
      id: crypto.randomUUID(),
      status: 'final',
      subject: sr.subject,
      basedOn: [{ reference: `ServiceRequest/${sr.id}` }],
      result: [{ reference: `Observation/${observationId}` }],
      issued: new Date().toISOString(),
    };

    const observation = {
      resourceType: 'Observation',
      id: observationId,
      status: 'final',
      subject: sr.subject,
      code: { text: testName },
      valueQuantity: { value: resultValue, unit: resultUnit }
    };

    await this.fhirService.createOrUpdate('Observation', observation.id, observation, undefined, 'CREATE');
    await this.fhirService.createOrUpdate('DiagnosticReport', diagnosticReport.id, diagnosticReport, undefined, 'CREATE');

    return diagnosticReport;
  }
}
