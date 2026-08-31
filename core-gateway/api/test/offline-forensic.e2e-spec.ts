import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard.js';
import { FhirService } from '../src/fhir/fhir.service.js';
import * as crypto from 'crypto';
import { vi } from 'vitest';

describe('Offline Forensic Sync (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const mockFhirService = {
      saveResource: vi.fn().mockResolvedValue(true),
      searchResource: vi.fn().mockResolvedValue([]),
      createOrUpdate: vi.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate: (context: any) => {
        const req = context.switchToHttp().getRequest();
        req.user = { id: 'u1', username: 'demo_mo', facilityId: 'PHC-001', role: 'MO' };
        return true;
      }
    })
    .overrideProvider(FhirService)
    .useValue(mockFhirService)
    .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    jwtToken = 'mock_token';
  });

  afterAll(async () => {
    await app.close();
  });

  it('Phase 5: OFFLINE-FIRST FORENSIC TEST - Idempotent Sync & Reference Integrity', async () => {
    // Generate UUIDs for the offline session
    const patientId = crypto.randomUUID();
    const encounterId = crypto.randomUUID();
    const obsId = crypto.randomUUID();
    const riskId = crypto.randomUUID();
    const planId = crypto.randomUUID();
    const reqId = crypto.randomUUID();
    const taskId = crypto.randomUUID();

    // Create the operations array that would be generated offline
    const operations = [
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: patientId,
          resourceType: 'Patient',
          json: JSON.stringify({
            resourceType: 'Patient',
            id: patientId,
            active: true,
            name: [{ given: ['Jane'], family: ['Doe'] }]
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: encounterId,
          resourceType: 'Encounter',
          json: JSON.stringify({
            resourceType: 'Encounter',
            id: encounterId,
            status: 'finished',
            class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
            subject: { reference: `Patient/\${patientId}` }
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: obsId,
          resourceType: 'Observation',
          json: JSON.stringify({
            resourceType: 'Observation',
            id: obsId,
            status: 'final',
            subject: { reference: `Patient/\${patientId}` },
            encounter: { reference: `Encounter/\${encounterId}` },
            code: { coding: [{ system: 'http://loinc.org', code: '85354-9', display: 'Blood pressure panel with all children optional' }] },
            component: [
              { code: { coding: [{ code: '8480-6' }] }, valueQuantity: { value: 165 } }, // High BP
              { code: { coding: [{ code: '8462-4' }] }, valueQuantity: { value: 95 } }
            ]
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: riskId,
          resourceType: 'RiskAssessment',
          json: JSON.stringify({
            resourceType: 'RiskAssessment',
            id: riskId,
            status: 'final',
            subject: { reference: `Patient/\${patientId}` },
            encounter: { reference: `Encounter/\${encounterId}` },
            prediction: [{ probabilityDecimal: 0.85, outcome: { text: 'High Risk' } }]
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: planId,
          resourceType: 'CarePlan',
          json: JSON.stringify({
            resourceType: 'CarePlan',
            id: planId,
            status: 'active',
            intent: 'plan',
            subject: { reference: `Patient/\${patientId}` },
            encounter: { reference: `Encounter/\${encounterId}` }
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: reqId,
          resourceType: 'ServiceRequest',
          json: JSON.stringify({
            resourceType: 'ServiceRequest',
            id: reqId,
            status: 'active',
            intent: 'order',
            subject: { reference: `Patient/\${patientId}` },
            encounter: { reference: `Encounter/\${encounterId}` }
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      },
      {
        operationId: crypto.randomUUID(),
        operation: 'CREATE',
        idempotencyKey: crypto.randomUUID(),
        resource: {
          id: taskId,
          resourceType: 'Task',
          json: JSON.stringify({
            resourceType: 'Task',
            id: taskId,
            status: 'requested',
            intent: 'order',
            for: { reference: `Patient/\${patientId}` },
            focus: { reference: `ServiceRequest/\${reqId}` },
            encounter: { reference: `Encounter/\${encounterId}` }
          }),
          versionId: 1,
          updatedAt: new Date().toISOString(),
          createdBy: 'demo_mo',
          facilityId: 'PHC-001',
          isDeleted: false
        }
      }
    ];

    const pushPayload = operations;

    // 1. Initial Sync
    const pushRes = await request(app.getHttpServer())
      .post('/sync/push')
      .set('Authorization', `Bearer \${jwtToken}`)
      .send(pushPayload)
      .expect(201);
    
    // Verify all resources were persisted via the idempotency records in pushRes
    expect(pushRes.body.results.length).toBe(7);
    expect(pushRes.body.results.every((r: any) => r.status === 'APPLIED')).toBeTruthy();
    expect(mockFhirService.createOrUpdate).toHaveBeenCalledTimes(7);

    // 2. Duplicate Sync (Idempotency check)
    // Clear mock calls to verify it doesn't get called again
    vi.clearAllMocks();
    
    const pushRes2 = await request(app.getHttpServer())
      .post('/sync/push')
      .set('Authorization', `Bearer \${jwtToken}`)
      .send(pushPayload)
      .expect(201);

    expect(pushRes2.body.results.length).toBe(7);
    expect(pushRes2.body.results.every((r: any) => r.status === 'APPLIED')).toBeTruthy();
    
    // Should NOT call FHIR server again because it hits idempotency cache!
    expect(mockFhirService.createOrUpdate).toHaveBeenCalledTimes(0);
  });
});
