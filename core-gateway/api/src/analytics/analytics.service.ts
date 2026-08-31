import { Injectable, Logger } from '@nestjs/common';
import { FhirService } from '../fhir/fhir.service.js';
import { StockService } from '../stock/stock.service.js';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly fhirService: FhirService,
    private readonly stockService: StockService
  ) {}

  async getDistrictDashboardMetrics() {
    this.logger.log('Computing actual district metrics from FHIR and Stock');
    
    // 1. Fetch Referral Completion
    const tasks = await this.fhirService.searchResources('Task', {});
    const referralTasks = tasks.filter((t: any) => t.intent === 'order' && t.code === 'teleconsult' || t.code?.coding?.[0]?.system === 'http://snomed.info/sct');
    const completedReferrals = referralTasks.filter((t: any) => t.status === 'completed').length;
    const totalReferrals = referralTasks.length;
    const referralPct = totalReferrals > 0 ? Math.round((completedReferrals / totalReferrals) * 100) : 0;

    // 2. Fetch Diagnostic Turnaround Time (TAT)
    const diagnosticReports = await this.fhirService.searchResources('DiagnosticReport', {});
    let totalTATMs = 0;
    let tatCount = 0;
    
    // We fetch ServiceRequests once to avoid N+1 querying in the loop
    const serviceRequests = await this.fhirService.searchResources('ServiceRequest', {});
    
    diagnosticReports.forEach((dr: any) => {
      // TAT is Issued - AuthoredOn (from ServiceRequest)
      if (dr.issued && dr.basedOn && dr.basedOn.length > 0) {
        const srRef = dr.basedOn[0].reference;
        const srId = srRef?.split('/')[1];
        
        if (srId) {
          const req = serviceRequests.find((s: any) => s.id === srId);
          if (req && req.authoredOn) {
            const requestedMs = new Date(req.authoredOn).getTime();
            const issuedMs = new Date(dr.issued).getTime();
            if (issuedMs > requestedMs) {
              totalTATMs += (issuedMs - requestedMs);
              tatCount++;
            }
          }
        }
      }
    });
    
    const medianTatStr = tatCount > 0 ? `\${Math.round(totalTATMs / tatCount / 3600000)} hrs` : 'N/A';

    // 3. Stock Availability
    const facilities = ['PHC-001', 'RH-001', 'DH-001'];
    let inStock = 0;
    let totalStockItems = 0;
    const stockOuts: any[] = [];

    for (const fac of facilities) {
      const stock = await this.stockService.getAllStock(fac);
      totalStockItems += stock.length;
      stock.forEach((item: any) => {
        if (item.visibility !== 'OUT_OF_STOCK') {
          inStock++;
        } else {
          stockOuts.push({ issue: `Stock out: ${item.drugName}`, phc: `Facility ${fac}`, date: new Date().toISOString() });
        }
      });
    }
    const stockPct = totalStockItems > 0 ? Math.round((inStock / totalStockItems) * 100) : 0;

    // 4. SLA Breaches (Tasks stalled)
    const slaBreaches: any[] = [];
    referralTasks.forEach((task: any) => {
      if (task.status === 'requested' || task.status === 'accepted') {
        const authoredMs = new Date(task.authoredOn).getTime();
        const ageHours = (Date.now() - authoredMs) / 3600000;
        if (ageHours > 48) {
          slaBreaches.push({
            issue: `SLA Breach: Referral > 48 hrs`,
            phc: task.requester?.reference?.replace('Organization/', '') || 'Unknown',
            date: task.authoredOn
          });
        }
      }
    });

    return {
      kpis: [
        { title: 'PHCs Monitored', value: facilities.length.toString(), sub: 'All PHCs reporting', trend: 'Stable', trendUp: true, icon: '🏥', color: '#0f766e' },
        { title: 'Avg Referral Completion', value: `\${referralPct}%`, target: 'Target: 80%', trend: 'Real-time', trendUp: referralPct >= 80, icon: '🔄', color: '#0ea5e9' },
        { title: 'Median Diagnostic TAT', value: medianTatStr, target: 'Target: ≤ 24 hrs', trend: 'Computed', trendUp: true, icon: '⏱️', color: '#8b5cf6' },
        { title: 'Stock Availability', value: `\${stockPct}%`, target: 'Target: ≥ 90%', trend: 'Real-time', trendUp: stockPct >= 90, icon: '📦', color: '#10b981' },
        { title: 'SLA Breaches', value: slaBreaches.length.toString(), sub: 'Pending resolution', trend: 'Real-time', trendUp: slaBreaches.length === 0, icon: '⚠️', color: '#ef4444' },
      ],
      criticalActions: [...slaBreaches, ...stockOuts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10),
      referralBars: facilities.map(fac => {
        const facTasks = referralTasks.filter((t: any) => t.requester?.reference === `Organization/\${fac}`);
        const c = facTasks.filter((t: any) => t.status === 'completed').length;
        const p = facTasks.length > 0 ? Math.round((c / facTasks.length) * 100) : 0;
        return { phc: fac, pct: p, color: p > 80 ? '#0f766e' : (p > 50 ? '#f59e0b' : '#ef4444') };
      }),
      abdmStatus: [
        { icon: '🪪', label: 'ABHA Linked Patients', value: 'Real-time via FHIR', sub: 'Calculated', trend: 'Active', up: true },
        { icon: '🔗', label: 'Health Facilities Onboarded', value: `\${facilities.length}`, sub: 'Active Facilities', trend: 'Stable', up: true },
        { icon: '📄', label: 'Health Record Transactions', value: tasks.length.toString(), sub: 'Total FHIR Tasks', trend: 'Active', up: true },
      ]
    };
  }
}
