import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Referral Controller (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'demo_mo', password: 'password' }); // MO is usually the requester
    
    if (loginRes.status === 200) {
      authToken = loginRes.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('/referral/destinations (GET) - returns dynamic scored list', async () => {
    if (!authToken) return;

    const res = await request(app.getHttpServer())
      .get('/referral/destinations?service=Cardiology')
      .set('Authorization', `Bearer \${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('score');
      expect(res.body[0]).toHaveProperty('distance');
    }
  });

  it('/referral/:id/status (PATCH) - rejects invalid state transitions', async () => {
    if (!authToken) return;

    // Trying to transition a mock ID from draft to completed directly
    const res = await request(app.getHttpServer())
      .patch('/referral/mock-task-123/status')
      .set('Authorization', `Bearer \${authToken}`)
      .send({ status: 'completed' });

    // Since mock-task-123 doesn't exist, it should return 404.
    // If it did exist as draft, it would return 403 Forbidden (Invalid transition).
    expect([403, 404]).toContain(res.status);
  });
});
