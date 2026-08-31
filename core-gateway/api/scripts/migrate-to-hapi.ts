import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module.js';
import { DataSource } from 'typeorm';
import { FhirService } from '../src/fhir/fhir.service.js';
import { FhirResource } from '../src/sync/entities/fhir-resource.entity.js';

async function bootstrap() {
  console.log('Starting Migration from TypeORM to HAPI FHIR...');
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const dataSource = app.get(DataSource);
  const fhirService = app.get(FhirService);
  
  const resourceRepo = dataSource.getRepository(FhirResource);
  const oldResources = await resourceRepo.find();
  
  console.log(`Found \${oldResources.length} legacy resources to migrate.`);
  
  let successCount = 0;
  let failCount = 0;

  for (const res of oldResources) {
    try {
      let payload = res.jsonPayload;
      if (typeof payload === 'string') {
        payload = JSON.parse(payload);
      }
      
      // Preserve ID
      payload.id = res.id;
      
      // We assume this is a CREATE operation. If it already exists, HAPI handles it via PUT semantics.
      await fhirService.createOrUpdate(res.resourceType, res.id, payload, undefined, 'CREATE');
      successCount++;
      console.log(`[SUCCESS] Migrated \${res.resourceType}/\${res.id}`);
    } catch (e: any) {
      failCount++;
      console.error(`[FAILED] Failed to migrate \${res.resourceType}/\${res.id}:`, e.message);
    }
  }

  console.log('Migration Complete.');
  console.log(`Success: \${successCount} | Failed: \${failCount}`);
  
  // Clean up old table
  console.log('Dropping legacy fhir_resources table...');
  await dataSource.query('DROP TABLE IF EXISTS fhir_resources');
  console.log('Done.');

  await app.close();
}

bootstrap().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
