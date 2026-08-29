import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async getDistrictDashboardMetrics() {
    this.logger.log('Fetching DHIS2-style district metrics from SQL views');

    // For the prototype block dashboard, we return a comprehensive aggregated view.
    // In production, these would be computed via Materialized Views and Data Warehouses.
    
    return {
      kpis: [
        { title: 'PHCs Monitored', value: '12', sub: 'All PHCs reporting', trend: '↑ 12% vs last month', trendUp: true, icon: '🏥', color: '#0f766e' },
        { title: 'Avg Referral Completion', value: '71%', target: 'Target: 80%', trend: '↓ 6% vs last month', trendUp: false, icon: '🔄', color: '#0ea5e9' },
        { title: 'Median Diagnostic TAT', value: '21 hrs', target: 'Target: ≤ 24 hrs', trend: '↓ 3 hrs vs last month', trendUp: true, icon: '⏱️', color: '#8b5cf6' },
        { title: 'Stock Availability', value: '86%', target: 'Target: ≥ 90%', trend: '↓ 4% vs last month', trendUp: false, icon: '📦', color: '#10b981' },
        { title: 'SLA Breaches', value: '4', sub: 'Pending resolution', trend: '↑ 2 new vs last month', trendUp: false, icon: '⚠️', color: '#ef4444' },
      ],
      criticalActions: [
        { issue: 'SLA Breach: Referral completion > 48 hrs', phc: 'Kondhwa PHC', date: '25 May 2025 09:15 AM' },
        { issue: 'Diagnostic TAT breach: CBP > 24 hrs', phc: 'Haveli PHC', date: '25 May 2025 08:40 AM' },
        { issue: 'Stock out: Paracetamol 500mg', phc: 'Bhor PHC', date: '25 May 2025 07:50 AM' },
        { issue: 'Lab reports pending validation > 48 hrs', phc: 'Shirur PHC', date: '25 May 2025 07:20 AM' },
      ],
      referralBars: [
        { phc: 'Kondhwa PHC', pct: 92, color: '#0f766e' },
        { phc: 'Haveli PHC', pct: 67, color: '#f59e0b' },
        { phc: 'Bhor PHC', pct: 54, color: '#ef4444' },
        { phc: 'Shirur PHC', pct: 76, color: '#f59e0b' },
        { phc: 'Daund PHC', pct: 83, color: '#0f766e' },
        { phc: 'Mulshi PHC', pct: 61, color: '#ef4444' },
      ],
      abdmStatus: [
        { icon: '🪪', label: 'ABHA Linked Patients', value: '5,432', sub: '72% of estimated population', trend: '+8%', up: true },
        { icon: '🔗', label: 'Health Facilities Onboarded', value: '12 / 12', sub: '100% of PHCs', trend: 'No change', up: true },
        { icon: '📄', label: 'Health Record Transactions', value: '18,765', sub: 'In last 30 days', trend: '+12%', up: true },
      ]
    };
  }
}
