import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import * as crypto from 'crypto';

export interface Alert {
  id: string;
  type: string;
  severity: string;
  safeMessage: string;
  timestamp: string;
  resolved: boolean;
  facilityId?: string;
  metadata?: any;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(private readonly fhirService: FhirService) {}

  async evaluateAlerts() {
    this.logger.log('Evaluating system-wide alerts');

    // 1. SLA Breaches (Referral pending > 48h)
    const tasks = await this.fhirService.searchResources('Task', {});
    
    for (const task of tasks) {
      if ((task.status === 'requested' || task.status === 'accepted') && task.intent === 'order') {
        const authoredMs = new Date(task.authoredOn).getTime();
        const ageHours = (Date.now() - authoredMs) / 3600000;
        
        if (ageHours > 48) {
          await this.triggerAlert({
            type: 'SLA_BREACH',
            severity: ageHours > 72 ? 'CRITICAL' : 'HIGH',
            safeMessage: `SLA Breach: Referral task pending for >\${Math.floor(ageHours)} hours. Open Setu to view assigned case.`,
            facilityId: task.owner?.reference?.replace('Organization/', '') || 'Unknown',
            metadata: { taskId: task.id }
          });
        }
      }
    }

    return this.getAlerts();
  }

  async triggerAlert(data: Omit<Alert, 'id' | 'timestamp' | 'resolved'>) {
    const id = crypto.randomUUID();
    const flag = {
      resourceType: 'Flag',
      id,
      status: 'active',
      category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/flag-category', code: 'admin', display: 'Administrative' }] }],
      code: { coding: [{ system: 'http://setu.in/alerts', code: data.type, display: data.safeMessage }] },
      period: { start: new Date().toISOString() },
      author: { reference: `Organization/\${data.facilityId}` },
      extension: [
        { url: 'http://setu.in/alert-severity', valueString: data.severity }
      ]
    };
    
    await this.fhirService.createOrUpdate('Flag', id, flag, undefined, 'CREATE');
    this.logger.log(`[ALERT] \${data.severity}: \${data.safeMessage}`);
  }

  async getAlerts(facilityId?: string): Promise<Alert[]> {
    const flags = await this.fhirService.searchResources('Flag', facilityId ? { author: `Organization/\${facilityId}` } : {});
    const alerts: Alert[] = flags.map((f: any) => ({
      id: f.id,
      type: f.code?.coding?.[0]?.code || 'UNKNOWN',
      severity: f.extension?.find((ex: any) => ex.url === 'http://setu.in/alert-severity')?.valueString || 'WARNING',
      safeMessage: f.code?.coding?.[0]?.display || '',
      timestamp: f.period?.start || new Date().toISOString(),
      resolved: f.status === 'inactive',
      facilityId: f.author?.reference?.replace('Organization/', '')
    }));

    return alerts.filter(a => !a.resolved).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async resolveAlert(id: string) {
    const flag = await this.fhirService.getResource('Flag', id);
    if (flag) {
      flag.status = 'inactive';
      flag.period = { ...flag.period, end: new Date().toISOString() };
      await this.fhirService.createOrUpdate('Flag', id, flag, flag.meta?.versionId, 'UPDATE');
    }
  }
}
