'use client';
import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';

const API = 'http://localhost:3001';

export default function BlockDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/analytics/dashboard`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const s = { card: { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties };

  if (loading || !data) {
    return (
      <Shell title="Block Command Centre" subtitle="Pune Block, Maharashtra" user="Admin User" role="Block Admin" facility="Pune Block | Maharashtra">
        <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading dashboard metrics...</div>
      </Shell>
    );
  }

  const { kpis = [], criticalActions = [], referralBars = [], abdmStatus = [] } = data;

  return (
    <Shell title="Block Command Centre" subtitle="Pune Block, Maharashtra" user="Admin User" role="Block Admin" facility="Pune Block | Maharashtra">
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {kpis.map((kpi: any, i: number) => (
            <div key={i} style={{ ...s.card, padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{kpi.icon}</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>{kpi.title}</span>
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: kpi.title === 'SLA Breaches' ? '#ef4444' : '#1e293b', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', margin: '0.375rem 0' }}>{kpi.sub || kpi.target}</div>
              <div style={{ fontSize: '0.7rem', color: kpi.trendUp ? '#10b981' : '#ef4444', fontWeight: 500 }}>{kpi.trend}</div>
            </div>
          ))}
        </div>

        {/* Map + Critical Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={{ ...s.card }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Geographical Health Status (PHCs)</div>
            <div style={{ position: 'relative', height: '280px', background: '#eef2f7', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>Interactive Map — PHC Performance</div>
              {/* Styled map pins */}
              {[
                { top: '30%', left: '40%', color: '#10b981', label: 'Kondhwa' },
                { top: '50%', left: '25%', color: '#10b981', label: 'Bhor' },
                { top: '40%', left: '62%', color: '#ef4444', label: 'Shirur' },
                { top: '65%', left: '68%', color: '#10b981', label: 'Baramati' },
                { top: '45%', left: '45%', color: '#f59e0b', label: 'Haveli' },
                { top: '25%', left: '55%', color: '#f59e0b', label: 'Daund' },
              ].map((pin, i) => (
                <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translate(-50%, -50%)' }}>
                  <div style={{ width: '28px', height: '28px', background: pin.color, borderRadius: '50%', border: '3px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.65rem', fontWeight: 700 }}>{i+1}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 600, color: '#1e293b', background: 'white', padding: '1px 4px', borderRadius: '3px', marginTop: '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>{pin.label}</div>
                </div>
              ))}
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div><span style={{ color: '#10b981', fontWeight: 700 }}>●</span> Good (≥ 80%)</div>
                <div><span style={{ color: '#f59e0b', fontWeight: 700 }}>●</span> Moderate (60% - 79%)</div>
                <div><span style={{ color: '#ef4444', fontWeight: 700 }}>●</span> Poor (&lt; 60%)</div>
              </div>
            </div>
          </div>

          <div style={{ ...s.card, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                Critical Action Queue
                <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', padding: '1px 6px', fontSize: '0.65rem', marginLeft: '0.5rem', fontWeight: 700 }}>4</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}>View All</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Priority', 'Issue', 'PHC', 'Detected', 'Action'].map(h => (
                      <th key={h} style={{ padding: '0.625rem 0.875rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {criticalActions.map((a: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '0.75rem 0.875rem' }}>
                        <span style={{ color: '#ef4444', background: '#fee2e2', border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>⚠️ High</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.875rem', fontSize: '0.75rem', fontWeight: 500, color: '#1e293b' }}>{a.issue}</td>
                      <td style={{ padding: '0.75rem 0.875rem', fontSize: '0.75rem', color: '#475569' }}>{a.phc}</td>
                      <td style={{ padding: '0.75rem 0.875rem', fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>{a.date}</td>
                      <td style={{ padding: '0.75rem 0.875rem' }}>
                        <button style={{ border: '1px solid #ef4444', color: '#ef4444', background: 'white', padding: '3px 10px', borderRadius: '5px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>Assign Action</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Referral Chart + ABDM */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          {/* Bar Chart */}
          <div style={{ ...s.card, padding: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', marginBottom: '0.875rem' }}>PHC Referral Performance (vs Target) ⓘ</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.65rem', color: '#3b82f6', marginBottom: '0.75rem' }}>--- Target (80%)</div>
            {referralBars.map((b: any) => (
              <div key={b.phc} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem', fontSize: '0.75rem' }}>
                <div style={{ width: '80px', color: '#64748b', textAlign: 'right', flexShrink: 0 }}>{b.phc.replace(' PHC', '')}</div>
                <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '3px', height: '12px', position: 'relative' }}>
                  <div style={{ width: `${b.pct}%`, background: b.color, height: '100%', borderRadius: '3px', transition: 'width 0.5s' }}></div>
                  <div style={{ position: 'absolute', top: 0, left: '80%', height: '100%', borderRight: '2px dashed #3b82f6' }}></div>
                </div>
                <div style={{ width: '28px', fontWeight: 700, color: b.color }}>{b.pct}%</div>
              </div>
            ))}
          </div>

          {/* Trend Chart */}
          <div style={{ ...s.card, padding: '1rem' }}>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', marginBottom: '0.875rem' }}>Quality Trends (Last 6 Months)</div>
            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              {[{ label: 'Referral Completion', color: '#0ea5e9' }, { label: 'Diagnostic TAT', color: '#8b5cf6' }, { label: 'Stock Availability', color: '#10b981' }].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><span style={{ display: 'inline-block', width: '16px', height: '2px', background: l.color }}></span>{l.label}</span>
              ))}
            </div>
            <div style={{ height: '160px', position: 'relative', borderLeft: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', margin: '0 0 1.25rem 1rem' }}>
              <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                <polyline points="0,55 20,48 40,44 60,38 80,42 100,45" fill="none" stroke="#0ea5e9" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                <polyline points="0,75 20,78 40,80 60,83 80,86 100,84" fill="none" stroke="#8b5cf6" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                <polyline points="0,35 20,32 40,28 60,25 80,22 100,28" fill="none" stroke="#10b981" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
              </svg>
              <div style={{ position: 'absolute', bottom: '-1.25rem', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
                {['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'].map(m => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>

          {/* ABDM */}
          <div style={{ ...s.card, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>ABDM Integration Status</div>
              <div style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}>View Details</div>
            </div>
            {abdmStatus.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', background: '#f0fdf4', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{item.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>{item.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{item.sub}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>{item.trend}</div>
                  <div style={{ fontSize: '0.6rem', color: '#94a3b8' }}>vs last month</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 'auto', background: '#ecfdf5', borderRadius: '6px', padding: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
              <span style={{ color: '#10b981' }}>✔</span> ABDM Gateway Status: Operational
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
          <span>🔄 Last Data Sync: 25 May 2025, 09:30 AM</span>
          <span>Data Source: DHIS2 (2.39) | ABDM (Sandbox)</span>
          <span>© 2025 National Health Authority, Government of India | v1.0.0</span>
        </div>
      </div>
    </Shell>
  );
}
