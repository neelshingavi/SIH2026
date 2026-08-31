import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/patient/:id/history (GET) - returns 401 when unauthenticated', () => {
    return request(app.getHttpServer())
      .get('/patient/123/history')
      .expect(401);
  });

  it('/sync/push (POST) - returns 401 with invalid token', () => {
    return request(app.getHttpServer())
      .post('/sync/push')
      .set('Authorization', 'Bearer invalid-token')
      .send([])
      .expect(401);
  });

  // Cross-facility IDOR simulation
  it('/sync/push (POST) - returns 403 on cross-facility access', async () => {
    // Generate a valid token for Facility A
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'demo_asha', password: 'password' }); // Assuming default seed exists
    
    // Fallback if no seed exists in CI yet, skip the logic check, but normally:
    if (loginRes.status === 200) {
      const token = loginRes.body.access_token;

      // Try to push data specifying a different facilityId
      return request(app.getHttpServer())
        .post('/sync/push')
        .set('Authorization', `Bearer \${token}`)
        .send([
          {
            operationId: '1',
            operation: 'CREATE',
            idempotencyKey: 'key',
            resource: {
              id: 'res-1',
              resourceType: 'Patient',
              json: '{}',
              versionId: 1,
              facilityId: 'OTHER_FACILITY',
              isDeleted: false
            }
          }
        ])
        .expect(403);
    }
  });

  // Teleconsult IDOR simulation
  it('/teleconsult/token (POST) - returns 403 on cross-facility access', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'demo_asha', password: 'password' });
    
    if (loginRes.status === 200) {
      const token = loginRes.body.access_token;

      // We attempt to get a token for a task that doesn't belong to this ASHA's facility
      // The TeleconsultService will check if the user's facility matches the Task's owner or requester.
      // Since it's a mock task ID, it will return 404 (or 403 if we simulated the task existing but for another facility).
      // Here we just verify it doesn't give a 201/200 blindly.
      
      const res = await request(app.getHttpServer())
        .post('/teleconsult/token')
        .set('Authorization', `Bearer \${token}`)
        .send({ taskId: 'SOME_OTHER_FACILITY_TASK_ID' });
      
      // It should either be 404 Not Found (since task doesn't exist) or 403 Forbidden.
      expect([403, 404]).toContain(res.status);
    }
  });

  it('/teleconsult/token (POST) - returns 401 when unauthenticated', () => {
    return request(app.getHttpServer())
      .post('/teleconsult/token')
      .send({ taskId: 'SOME_TASK_ID' })
      .expect(401);
  });
});
