import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class AbdmMockService {
  private readonly logger = new Logger(AbdmMockService.name);

  createAbha() {
    this.logger.log('Mocking ABHA creation');
    // Generate a mock 14-digit ABHA ID formatted as XX-XXXX-XXXX-XXXX
    const p1 = Math.floor(10 + Math.random() * 90);
    const p2 = Math.floor(1000 + Math.random() * 9000);
    const p3 = Math.floor(1000 + Math.random() * 9000);
    const p4 = Math.floor(1000 + Math.random() * 9000);
    
    return {
      abhaId: `${p1}-${p2}-${p3}-${p4}`
    };
  }

  requestConsent(body: any) {
    this.logger.log('Mocking Consent Request');
    return {
      consentId: randomUUID(),
      status: 'REQUESTED'
    };
  }

  grantConsent(id: string) {
    this.logger.log(`Mocking Consent Grant for ${id}`);
    return {
      status: 'GRANTED'
    };
  }

  fetchCareContext(abhaId: string) {
    this.logger.log(`Fetching mock care context for ${abhaId}`);
    return {
      resourceType: "Bundle",
      type: "document",
      timestamp: new Date().toISOString(),
      entry: [
        {
          fullUrl: "urn:uuid:mock-composition",
          resource: {
            resourceType: "Composition",
            status: "final",
            type: {
              coding: [{ system: "http://snomed.info/sct", code: "371530004", display: "Clinical consultation report" }]
            },
            subject: {
              reference: "Patient/mock-patient",
              display: `Patient with ABHA ${abhaId}`
            },
            title: "Longitudinal Care Record"
          }
        },
        {
          fullUrl: "urn:uuid:mock-encounter-1",
          resource: {
            resourceType: "Encounter",
            status: "finished",
            class: { code: "AMB", display: "ambulatory" },
            period: { start: "2025-05-06T10:00:00Z" },
            reasonCode: [{ coding: [{ display: "Hypertension follow-up" }] }]
          }
        },
        {
          fullUrl: "urn:uuid:mock-encounter-2",
          resource: {
            resourceType: "Encounter",
            status: "finished",
            class: { code: "AMB", display: "ambulatory" },
            period: { start: "2025-04-22T09:30:00Z" },
            reasonCode: [{ coding: [{ display: "Fever, URTI" }] }]
          }
        },
        {
          fullUrl: "urn:uuid:mock-observation-bp",
          resource: {
            resourceType: "Observation",
            status: "final",
            category: [{ coding: [{ code: "vital-signs", display: "Vital Signs" }] }],
            code: { coding: [{ display: "Blood Pressure" }] },
            valueString: "140/90 mmHg",
            effectiveDateTime: "2025-05-06T10:05:00Z"
          }
        },
        {
          fullUrl: "urn:uuid:mock-medication",
          resource: {
            resourceType: "MedicationRequest",
            status: "active",
            intent: "order",
            medicationCodeableConcept: { coding: [{ display: "Amlodipine 5mg Tablet" }] },
            dosageInstruction: [{ text: "1 tablet daily" }]
          }
        }
      ]
    };
  }
}
