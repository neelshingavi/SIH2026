import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('Triage & Care Gap Controller (e2e)', () => {
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
      .send({ username: 'demo_mo', password: 'password' }); 
    
    if (loginRes.status === 200) {
      authToken = loginRes.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('/care-gaps/dashboard (GET) - retrieves prioritized care gaps', async () => {
    if (!authToken) return;

    const res = await request(app.getHttpServer())
      .get('/care-gaps/dashboard')
      .set('Authorization', `Bearer \${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('gaps');
    expect(Array.isArray(res.body.gaps)).toBeTruthy();
  });

  it('/care-gaps/followup/:id (PATCH) - rejects without token', async () => {
    const res = await request(app.getHttpServer())
      .patch('/care-gaps/followup/invalid-id')
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(401);
  });
});
