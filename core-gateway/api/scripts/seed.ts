import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { User, Role } from '../src/users/entities/user.entity.js';
import { FhirService } from '../src/fhir/fhir.service.js';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function bootstrap() {
  console.log('Starting Test Data Seeder...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const fhirService = app.get(FhirService);
  const userRepo = dataSource.getRepository(User);
  
  // Clean existing synthetic data
  await userRepo.clear();

  const facilities = {
    districtHospital: 'FAC-DIST-1',
    ruralHospital: 'FAC-RURAL-1',
    phc: 'FAC-PHC-1',
    subCentre: 'FAC-SUB-1'
  };

  const passwordHash = await bcrypt.hash('password', 10);

  const users = [
    {
      userId: uuidv4(),
      username: 'demo_asha',
      passwordHash,
      role: Role.ASHA,
      facilityId: facilities.subCentre,
      isActive: true,
    },
    {
      userId: uuidv4(),
      username: 'demo_anm',
      passwordHash,
      role: Role.ANM,
      facilityId: facilities.subCentre,
      isActive: true,
    },
    {
      userId: uuidv4(),
      username: 'demo_mo',
      passwordHash,
      role: Role.MEDICAL_OFFICER,
      facilityId: facilities.phc,
      isActive: true,
    },
    {
      userId: uuidv4(),
      username: 'demo_specialist',
      passwordHash,
      role: Role.SPECIALIST,
      facilityId: facilities.districtHospital,
      isActive: true,
    }
  ];

  for (const u of users) {
    await userRepo.save(u);
    console.log(`Created user: \${u.username} | Role: \${u.role} | Facility: \${u.facilityId}`);
  }

  // Seed FHIR Organizations for Routing engine
  const orgs = [
    {
      resourceType: 'Organization',
      id: facilities.districtHospital,
      name: 'District Hospital',
      type: [{ coding: [{ display: 'Cardiology' }, { display: 'Obstetrics' }, { display: 'Surgery' }, { display: 'Teleconsultation' }] }]
    },
    {
      resourceType: 'Organization',
      id: facilities.ruralHospital,
      name: 'Rural Hospital',
      type: [{ coding: [{ display: 'Obstetrics' }, { display: 'Emergency' }, { display: 'Teleconsultation' }] }]
    },
    {
      resourceType: 'Organization',
      id: facilities.phc,
      name: 'Primary Health Centre',
      type: [{ coding: [{ display: 'General Medicine' }, { display: 'Emergency' }] }]
    }
  ];

  for (const org of orgs) {
    try {
      await fhirService.createOrUpdate('Organization', org.id, org, undefined, 'CREATE');
      console.log(`Seeded FHIR Organization: \${org.name}`);
    } catch (e: any) {
      console.log(`Note: FHIR Org \${org.name} might already exist or error: \${e.message}`);
    }
  }

  console.log('Seeding Complete.');
  await app.close();
}

bootstrap().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

