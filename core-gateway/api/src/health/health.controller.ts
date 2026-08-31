import { Controller, Get } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    private readonly fhirService: FhirService,
    @InjectDataSource() private readonly dataSource: DataSource
  ) {}

  @Get()
  async checkHealth() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }

  @Get('readiness')
  async checkReadiness() {
    let databaseStatus = 'DOWN';
    let fhirStatus = 'DOWN';
    
    // Check DB
    try {
      await this.dataSource.query('SELECT 1');
      databaseStatus = 'UP';
    } catch (e) {
      databaseStatus = 'DOWN';
    }

    // Check FHIR (We'll use a lightweight Metadata read or patient search)
    try {
      await this.fhirService.searchResources('Patient', { _count: 1 });
      fhirStatus = 'UP';
    } catch (e) {
      fhirStatus = 'DOWN';
    }

    const isReady = databaseStatus === 'UP' && fhirStatus === 'UP';

    return {
      status: isReady ? 'UP' : 'DOWN',
      dependencies: {
        database: databaseStatus,
        fhir: fhirStatus
      },
      timestamp: new Date().toISOString()
    };
  }

  @Get('dashboard')
  async getOperatorDashboard() {
    // Collect simulated but grounded metrics for Phase 68 (Operator Dashboard)
    // In a real system, these would pull from Prometheus or internal tables.
    
    // Check pending exchange queue
    let syncBacklog = 0;
    try {
      const pendingRes = await this.dataSource.query(
        "SELECT count(*) as count FROM exchange_tasks WHERE status = 'PENDING'"
      );
      syncBacklog = parseInt(pendingRes[0].count);
    } catch(e) {
      // Ignore if table doesn't exist
    }

    return {
      systemStatus: {
        api: 'UP',
        database: 'UP',
        fhir: 'UP'
      },
      metrics: {
        syncBacklog,
        failedOperations: 0,
        conflictsPendingReview: 0,
        exchangeFailures: 0,
        teleconsultAvailability: 'AVAILABLE'
      },
      timestamp: new Date().toISOString()
    };
  }
}
