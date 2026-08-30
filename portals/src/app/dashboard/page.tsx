'use client';
import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';

const s = {
  card: { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' } as React.CSSProperties,
  label: { fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  value: { fontSize: '0.875rem', fontWeight: 500, color: '#1e293b' } as React.CSSProperties,
  tab: (active: boolean) => ({ padding: '0.625rem 1rem', border: 'none', background: active ? '#0f766e' : 'transparent', color: active ? 'white' : '#64748b', fontWeight: 600, fontSize: '0.875rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' })
};

// ── Types ───────────────────────────────────────────────────────────────────
interface Teleconsult {
  id: string;
  hubFacilityId: string;
  spokeFacilityId: string;
  patientName: string;
  condition: string;
  priority: string;
  status: string;
  createdAt: string;
}

const API = 'http://localhost:3001';
const FACILITY = 'PHC-001';

export default function MODashboard() {
  const [teleconsultQueue, setTeleconsultQueue] = useState<Teleconsult[]>([]);
  const [activeCall, setActiveCall] = useState<Teleconsult | null>(null);

  // Diagnostics State
  const [diagOrders, setDiagOrders] = useState<any[]>([]);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderForm, setOrderForm] = useState({ patientName: '', testName: 'Hemoglobin' });

  // UI State
  const [activeTab, setActiveTab] = useState('emr');

  // EMR State
  const [emrSearch, setEmrSearch] = useState('');
  const [emrPatient, setEmrPatient] = useState<any>(null);
  const [emrHistory, setEmrHistory] = useState<any[]>([]);
  const [emrLoading, setEmrLoading] = useState(false);

  // Prescription State
  const [prescriptions, setPrescriptions] = useState<any[]>([
    { id: 1, name: 'Tab. Amlodipine 5mg', dose: '1', freq: 'OD (Morning)', duration: '30 Days' },
    { id: 2, name: 'Tab. Telmisartan 40mg', dose: '1', freq: 'OD (Morning)', duration: '30 Days' }
  ]);
  const [advice, setAdvice] = useState('Low salt diet, regular exercise, BP monitoring.');
  const [rxSent, setRxSent] = useState(false);
  const [stockRequested, setStockRequested] = useState(false);
  const [lowestStock, setLowestStock] = useState<any>(null);

  // Digitizer State
  const [digiFile, setDigiFile] = useState<File | null>(null);
  const [digiStatus, setDigiStatus] = useState<'IDLE'|'SCANNING'|'DONE'>('IDLE');
  const [digiFhir, setDigiFhir] = useState<string>('');

  const handleSimulateScan = () => {
    if (!digiFile) return;
    setDigiStatus('SCANNING');
    setTimeout(() => {
      setDigiStatus('DONE');
      setDigiFhir(JSON.stringify({
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          {
            resource: {
              resourceType: "MedicationRequest",
              status: "active",
              intent: "order",
              medicationCodeableConcept: {
                coding: [{ system: "http://snomed.info/sct", code: "374249007", display: "Paracetamol 500mg" }]
              },
              subject: { reference: "Patient/123", display: "Unknown Patient from Paper" },
              dosageInstruction: [{ text: "Take 1 tablet every 8 hours for fever" }]
            }
          }
        ]
      }, null, 2));
    }, 2500);
  };

  useEffect(() => {
    const fetchQ = async () => {
      try {
        const res = await fetch(`${API}/teleconsult/queue?hubFacilityId=${FACILITY}`);
        if (res.ok) {
          const data = await res.json();
          setTeleconsultQueue(data);
          const active = data.find((q: Teleconsult) => q.status === 'ACTIVE');
          if (active) setActiveCall(active);
        }
      } catch (e) { /* silent */ }
    };
    fetchQ();
    const interval = setInterval(fetchQ, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const res = await fetch(`${API}/diagnostics/orders`);
      setDiagOrders(await res.json());
      
      const stockRes = await fetch(`${API}/stock?facilityId=${FACILITY}`);
      const stock = await stockRes.json();
      if(stock.length > 0) {
        setLowestStock(stock[0]);
      }
    } catch(e) {}
  };

  useEffect(() => {
    loadOrders();
    const int = setInterval(loadOrders, 5000);
    return () => clearInterval(int);
  }, []);

  const activeQueue = teleconsultQueue.filter(q => q.status !== 'COMPLETED');
  const completedQueue = teleconsultQueue.filter(q => q.status === 'COMPLETED');

  // Fetch ABDM Care Context
  const handleEmrSearch = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emrSearch.trim() !== '') {
      setEmrLoading(true);
      try {
        const res = await fetch(`${API}/abdm-mock/care-context/${emrSearch}`);
        const bundle = await res.json();
        
        // Parse mock bundle
        const patientEntry = bundle.entry.find((e: any) => e.resource.resourceType === 'Composition');
        const encounters = bundle.entry.filter((e: any) => e.resource.resourceType === 'Encounter');
        
        setEmrPatient({
          abha: emrSearch,
          name: patientEntry?.resource?.subject?.display?.replace('Patient with ABHA ', '') || 'Unknown Patient',
        });
        
        const history = encounters.map((enc: any) => {
          const date = new Date(enc.resource.period.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          const reason = enc.resource.reasonCode?.[0]?.coding?.[0]?.display || 'Visit';
          return { date, note: reason };
        });
        
        setEmrHistory(history);
      } catch (err) {
        console.error(err);
      } finally {
        setEmrLoading(false);
      }
    }
  };

  const handleMockLabResult = async (orderId: string) => {
    try {
      await fetch(`${API}/diagnostics/${orderId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultValue: 12.5, resultUnit: 'g/dL' })
      });
      loadOrders();
    } catch(e) {}
  };

  const handleOrderSubmit = async () => {
    if(!orderForm.patientName) return;
    try {
      await fetch(`${API}/diagnostics/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: `PAT-${Math.floor(Math.random()*1000)}`,
          patientName: orderForm.patientName,
          testCode: '1234-5',
          testName: orderForm.testName
        })
      });
      setShowOrderModal(false);
      loadOrders();
    } catch(e) {}
  };

  const handleSendRx = () => {
    setRxSent(true);
    setTimeout(() => {
      setPrescriptions([]);
      setAdvice('');
      setRxSent(false);
    }, 2000);
  };

  return (
    <Shell
      title="PHC Medical Officer Workstation"
      subtitle="Dharampur PHC"
      user="Dr. Pranav Joshi"
      role="Medical Officer"
      facility="Dharampur PHC (PHC-001)"
      district="District: Solapur, Maharashtra"
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>

        {/* ── KPI ROW ── */}
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
          {/* Patient Flow */}
          <div style={{ ...s.card, flex: 1 }}>
            <div style={{ padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Patient Flow Today
            </div>
            <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                { label: 'Registration', count: 12, bg: '#0f766e', color: 'white' },
                { label: 'Triage', count: 18, bg: '#0ea5e9', color: 'white' },
                { label: 'Doctor Consult', count: 6, bg: 'white', color: '#0ea5e9', border: '1px solid #0ea5e9' },
                { label: 'Pharmacy / Lab', count: 6, bg: 'white', color: '#10b981', border: '1px solid #10b981' },
              ].map((step, i, arr) => (
                <React.Fragment key={step.label}>
                  <div style={{ flex: 1, background: step.bg, color: step.color, border: (step as any).border, padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: 600, display: 'flex', gap: '0.25rem', flexDirection: 'column', textAlign: 'center' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{step.count}</span>
                    <span style={{ fontSize: '0.65rem', opacity: 0.9 }}>{step.label}</span>
                  </div>
                  {i < arr.length - 1 && <span style={{ color: '#cbd5e1', fontSize: '1.25rem' }}>→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* KPI chips */}
          {[
            { label: "Today's OPD", value: '42', icon: '👥', color: '#3b82f6' },
            { label: 'Queued Teleconsults', value: activeQueue.length, icon: '📹', color: '#0ea5e9' },
            { label: 'Pending Lab Reports', value: diagOrders.filter(o => o.status === 'PENDING').length, icon: '🔬', color: '#10b981' },
          ].map(k => (
            <div key={k.label} style={{ ...s.card, width: '140px', padding: '1rem', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, marginBottom: '0.5rem' }}>{k.label}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: '1.25rem', marginTop: '0.25rem' }}>{k.icon}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr 320px', gap: '1rem', flex: 1, minHeight: 0 }}>

          {/* LEFT: Queue */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#1e293b', fontSize: '0.875rem', flexShrink: 0 }}>
              Live Teleconsult Queue
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
              <div style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 600, color: '#0ea5e9', borderBottom: '2px solid #0ea5e9', textAlign: 'center' }}>QUEUE ({activeQueue.length})</div>
              <div style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.7rem', fontWeight: 600, color: '#94a3b8', textAlign: 'center' }}>DONE ({completedQueue.length})</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activeQueue.map(q => {
                const waitMins = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / 60000);
                return (
                  <div key={q.id} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc', cursor: 'pointer', background: q.status === 'ACTIVE' ? '#f0fdf4' : 'white' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f766e', marginBottom: '0.2rem' }}>📍 {q.spokeFacilityId}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748b' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{q.patientName}</span>
                      <span style={{ color: q.status === 'ACTIVE' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{q.status === 'ACTIVE' ? 'Live' : `Wait: ${waitMins}m`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER: Video + Notes + Prescription */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>

            {/* Video Call */}
            <div style={{ ...s.card, overflow: 'hidden', flexShrink: 0 }}>
              <div style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ background: activeCall ? '#10b981' : '#94a3b8', color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.65rem' }}>{activeCall ? '● ACTIVE' : 'IDLE'}</span>
                  <span style={{ fontWeight: 500, color: '#1e293b' }}>{activeCall ? `${activeCall.spokeFacilityId} | ${activeCall.patientName}` : 'Waiting for connection...'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                  <span style={{ color: activeCall ? '#10b981' : '#94a3b8', fontWeight: 600 }}>📶</span>
                </div>
              </div>
              <div style={{ position: 'relative', height: '260px', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeCall ? (
                  <>
                    <img
                      src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80"
                      alt="Patient Video"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                    />
                    <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600 }}>Remote Camera</div>
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '100px', height: '75px', background: '#0f172a', borderRadius: '6px', border: '2px solid white', overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=200&q=80" alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </>
                ) : (
                  <div style={{ color: '#475569', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>📹</div>
                    No active consultation
                  </div>
                )}
              </div>
            </div>

            {/* Notes + Prescription */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1rem', flex: 1, minHeight: 0 }}>
              {/* Notes */}
              <div style={{ ...s.card, padding: '1rem', overflowY: 'auto' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>Consultation Notes</div>
                {[
                  { label: 'Chief Complaint', text: activeCall?.condition || '—' },
                  { label: 'History', text: 'No h/o HTN/DM. Irregular meals.' },
                  { label: 'Provisional Diagnosis', text: 'Hypertension (Stage 1)' },
                  { label: 'Plan', text: 'Start treatment. Advise low salt diet and regular monitoring.' },
                ].map(f => (
                  <div key={f.label} style={{ marginBottom: '0.875rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{f.label}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#1e293b', lineHeight: 1.5 }}>{f.text}</div>
                  </div>
                ))}
              </div>

              {/* Prescription */}
              <div style={{ ...s.card, padding: '1rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>E-Prescription Builder</div>
                  <div style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}>+ Add to Template</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', marginBottom: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      {['Medicine', 'Dose', 'Freq', 'Duration', ''].map(h => (
                        <th key={h} style={{ padding: '0 0 0.5rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx, i) => (
                      <tr key={rx.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                        <td style={{ padding: '0.5rem 0', color: '#0ea5e9', fontWeight: 500 }}>
                          <input 
                            value={rx.name} 
                            onChange={(e) => {
                              const newRx = [...prescriptions];
                              newRx[i].name = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            style={{ width: '100%', padding: '3px', border: 'none', background: 'transparent', color: '#0ea5e9', fontWeight: 500 }} 
                            placeholder="Medicine Name"
                          />
                        </td>
                        <td>
                          <input 
                            value={rx.dose}
                            onChange={(e) => {
                              const newRx = [...prescriptions];
                              newRx[i].dose = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            style={{ width: '28px', padding: '3px', border: '1px solid #cbd5e1', borderRadius: '4px', textAlign: 'center' }} 
                          />
                        </td>
                        <td>
                          <select 
                            value={rx.freq}
                            onChange={(e) => {
                              const newRx = [...prescriptions];
                              newRx[i].freq = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            style={{ padding: '3px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem' }}>
                            <option>OD (Morning)</option>
                            <option>BD (Twice a day)</option>
                            <option>TDS (Thrice a day)</option>
                            <option>SOS (As needed)</option>
                          </select>
                        </td>
                        <td>
                          <select 
                            value={rx.duration}
                            onChange={(e) => {
                              const newRx = [...prescriptions];
                              newRx[i].duration = e.target.value;
                              setPrescriptions(newRx);
                            }}
                            style={{ padding: '3px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.7rem' }}>
                            <option>3 Days</option>
                            <option>5 Days</option>
                            <option>7 Days</option>
                            <option>15 Days</option>
                            <option>30 Days</option>
                          </select>
                        </td>
                        <td 
                          style={{ color: '#ef4444', cursor: 'pointer', textAlign: 'right' }}
                          onClick={() => setPrescriptions(prescriptions.filter(p => p.id !== rx.id))}
                        >🗑️</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ color: '#0ea5e9', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }} onClick={() => setPrescriptions([...prescriptions, { id: Date.now(), name: '', dose: '1', freq: 'OD (Morning)', duration: '5 Days' }])}>
                  + Add Medicine
                </div>
                
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>ADVICE</div>
                <input 
                  value={advice}
                  onChange={(e) => setAdvice(e.target.value)}
                  placeholder="Additional advice for patient..."
                  style={{ width: '100%', padding: '0.375rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.75rem', marginBottom: '0.75rem', boxSizing: 'border-box' }} 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: 'auto' }}>
                  <button 
                    onClick={handleSendRx}
                    disabled={rxSent || prescriptions.length === 0}
                    style={{ padding: '0.5rem 0.875rem', background: rxSent ? '#10b981' : '#0ea5e9', border: 'none', color: 'white', borderRadius: '6px', fontWeight: 600, cursor: rxSent ? 'default' : 'pointer', fontSize: '0.8125rem', transition: 'background 0.2s' }}>
                    {rxSent ? '✓ Sent to EMR' : 'Send Prescription'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Vitals + EMR Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
            <div style={{ ...s.card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', gap: '0.5rem', padding: '0.5rem' }}>
                <button onClick={() => setActiveTab('emr')} style={s.tab(activeTab === 'emr')}>EMR &amp; Prescription</button>
                <button onClick={() => setActiveTab('diagnostics')} style={s.tab(activeTab === 'diagnostics')}>Diagnostics (LIMS)</button>
                <button onClick={() => setActiveTab('digitize')} style={{ ...s.tab(activeTab === 'digitize'), background: activeTab === 'digitize' ? '#8b5cf6' : 'transparent', color: activeTab === 'digitize' ? 'white' : '#8b5cf6', border: activeTab !== 'digitize' ? '1px solid #8b5cf6' : 'none' }}>
                  ✨ AI Digitizer
                </button>
              </div>

              {activeTab === 'emr' && (
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.625rem' }}>Longitudinal Record</div>
                    <div style={{ position: 'relative' }}>
                      <input 
                        value={emrSearch}
                        onChange={(e) => setEmrSearch(e.target.value)}
                        onKeyDown={handleEmrSearch}
                        placeholder="Search ABHA ID" 
                        style={{ width: '100%', padding: '0.375rem 0.375rem 0.375rem 1.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.75rem', boxSizing: 'border-box' }} 
                      />
                    </div>
                  </div>
                  {emrPatient && (
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{emrPatient.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{emrPatient.abha}</div>
                    </div>
                  )}
                  <div style={{ padding: '1rem' }}>
                    {emrHistory.map((v, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>{v.date}</span>
                        <span>{v.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'diagnostics' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>Lab Orders</div>
                    <button onClick={() => setShowOrderModal(true)} style={{ fontSize: '0.7rem', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', padding: '0.25rem 0.5rem' }}>+ Order</button>
                  </div>
                  {diagOrders.map(order => (
                    <div key={order.id} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ fontWeight: 600 }}>{order.testName}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span style={{ color: order.status === 'COMPLETED' ? '#10b981' : '#f59e0b' }}>{order.status}</span>
                        {order.status === 'PENDING' && <button onClick={() => handleMockLabResult(order.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>🧪</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'digitize' && (
                <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ padding: '0 0.5rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Legacy Record Digitization</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.125rem' }}>Extract structured FHIR from paper prescriptions via Vision AI</div>
                  </div>
                  
                  <div style={{ 
                    flex: 1, border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#f8fafc', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    cursor: 'pointer', position: 'relative', overflow: 'hidden' 
                  }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e: any) => setDigiFile(e.target.files[0]);
                      input.click();
                    }}
                  >
                    {digiFile ? (
                      <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                        <span style={{ fontSize: '3rem' }}>📄</span>
                        <div style={{ marginTop: '0.5rem' }}>{digiFile.name} Loaded</div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', color: '#64748b' }}>
                        <span style={{ fontSize: '2.5rem' }}>📸</span>
                        <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>Upload Paper Record</div>
                      </div>
                    )}
                    {digiStatus === 'SCANNING' && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(139,92,246,0.2)', position: 'absolute', top: 0, animation: 'scan 1.5s infinite linear' }}>
                          <div style={{ height: '100%', background: '#8b5cf6', boxShadow: '0 0 10px #8b5cf6' }}></div>
                        </div>
                        <div style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '1rem' }}>Extracting Clinical NLP...</div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={handleSimulateScan} 
                      disabled={!digiFile || digiStatus === 'SCANNING'}
                      style={{ 
                        flex: 1, padding: '0.75rem', background: !digiFile ? '#e2e8f0' : '#8b5cf6', 
                        color: !digiFile ? '#94a3b8' : 'white', border: 'none', borderRadius: '8px', 
                        fontWeight: 600, cursor: !digiFile ? 'not-allowed' : 'pointer' 
                      }}
                    >
                      {digiStatus === 'SCANNING' ? 'Processing...' : 'Run Vision AI Scan'}
                    </button>
                    {digiStatus === 'DONE' && (
                      <button style={{ padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Save to EMR
                      </button>
                    )}
                  </div>

                  {digiStatus === 'DONE' && (
                    <div style={{ flex: 1, background: '#1e293b', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ color: 'white', fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        Structured FHIR R4 Output
                        <span style={{ color: '#10b981' }}>✓ Extracted</span>
                      </div>
                      <pre style={{ margin: 0, flex: 1, overflowY: 'auto', color: '#38bdf8', fontSize: '0.65rem', fontFamily: 'monospace' }}>
                        {digiFhir}
                      </pre>
                    </div>
                  )}
                  
                  <style dangerouslySetInnerHTML={{__html: `
                    @keyframes scan {
                      0% { top: 0; }
                      50% { top: 100%; }
                      100% { top: 0; }
                    }
                  `}} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── BOTTOM ALERTS ── */}
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
          <div style={{ ...s.card, flex: 1, padding: '0.875rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div style={{ width: '44px', height: '44px', background: '#fef3c7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>⚠️</div>
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Low Stock Alert</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                  {lowestStock ? lowestStock.drugName : 'Metformin 500mg'} 
                  <span style={{ color: lowestStock?.currentQty < 50 ? '#ef4444' : '#10b981' }}> (Qty: {lowestStock ? lowestStock.currentQty : 27})</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Check Pharmacy eLMIS for details</div>
              </div>
            </div>
            <button 
              onClick={() => setStockRequested(true)}
              disabled={stockRequested}
              style={{ background: stockRequested ? '#10b981' : '#0f766e', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: stockRequested ? 'default' : 'pointer', fontSize: '0.8125rem', transition: 'background 0.2s' }}>
              {stockRequested ? 'Indent Requested ✓' : 'Request Stock'}
            </button>
          </div>
        </div>

      </div>

      {showOrderModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '400px', background: 'white', borderRadius: '12px', padding: '1.5rem', animation: 'fadeIn 0.2s' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Order Lab Test</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Patient Name</label>
                <input value={orderForm.patientName} onChange={e => setOrderForm(f => ({...f, patientName: e.target.value}))} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} placeholder="e.g. Rahul Patil" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Select Test</label>
                <select value={orderForm.testName} onChange={e => setOrderForm(f => ({...f, testName: e.target.value}))} style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}>
                  <option>Hemoglobin</option>
                  <option>CBC</option>
                  <option>Sputum AFB</option>
                  <option>Blood Glucose (Fasting)</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={() => setShowOrderModal(false)} style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleOrderSubmit} style={{ flex: 1, padding: '0.5rem', background: '#0ea5e9', border: 'none', borderRadius: '6px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Submit Order</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
