import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import * as crypto from 'crypto';

export interface Alert {
  id: string;
  type: 'SLA_BREACH' | 'STOCKOUT' | 'CLINICAL_RISK';
  severity: 'HIGH' | 'CRITICAL' | 'WARNING';
  safeMessage: string; // Notification safety: No PHI
  timestamp: string;
  resolved: boolean;
  facilityId?: string;
  metadata?: any;
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private alerts: Map<string, Alert> = new Map();

  constructor(private readonly fhirService: FhirService) {}

  // Cron job simulation or manual trigger
  async evaluateAlerts() {
    this.logger.log('Evaluating system-wide alerts');

    // 1. SLA Breaches (Referral pending > 48h)
    const tasks = await this.fhirService.searchResources('Task', {});
    tasks.forEach(task => {
      if ((task.status === 'requested' || task.status === 'accepted') && task.intent === 'order') {
        const authoredMs = new Date(task.authoredOn).getTime();
        const ageHours = (Date.now() - authoredMs) / 3600000;
        
        if (ageHours > 48) {
          this.triggerAlert({
            type: 'SLA_BREACH',
            severity: ageHours > 72 ? 'CRITICAL' : 'HIGH',
            // Safe message WITHOUT PHI
            safeMessage: `SLA Breach: Referral task pending for >\${Math.floor(ageHours)} hours. Open Setu to view assigned case.`,
            facilityId: task.owner?.reference?.replace('Organization/', '') || 'Unknown',
            metadata: { taskId: task.id }
          });
        }
      }
    });

    // 2. Clinical Risk (CareGap unresolved > 24h)
    // Here we'd evaluate Care gaps, but for now we just look for high risk Observations that have no Task
    // Mocking this based on Phase 36 requirement

    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  triggerAlert(data: Omit<Alert, 'id' | 'timestamp' | 'resolved'>) {
    const id = crypto.randomUUID();
    const alert: Alert = {
      id,
      timestamp: new Date().toISOString(),
      resolved: false,
      ...data
    };
    this.alerts.set(id, alert);
    
    // In real app, push notification to Firebase Cloud Messaging (FCM) or SMS gateway
    this.logger.log(`[ALERT] \${alert.severity}: \${alert.safeMessage}`);
  }

  getAlerts(facilityId?: string) {
    let all = Array.from(this.alerts.values()).filter(a => !a.resolved);
    if (facilityId) {
      all = all.filter(a => a.facilityId === facilityId || !a.facilityId);
    }
    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  resolveAlert(id: string) {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.resolved = true;
    }
  }
}
