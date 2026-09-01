'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────
type Priority = 'high' | 'routine';
type Status = 'WAITING' | 'ACTIVE' | 'COMPLETED';

interface Teleconsult {
  id: string;
  hubFacilityId: string;
  spokeFacilityId: string;
  patientName: string;
  condition: string;
  priority: Priority;
  status: Status;
  createdAt: string;
}

// ── Config ──────────────────────────────────────────────────────────────────
const API = 'http://localhost:3001';
const FACILITY = 'PHC-001';

const s = {
  card: { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties,
};

export default function TeleconsultPage() {
  const [queue, setQueue] = useState<Teleconsult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<Teleconsult | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    // Simulate network delay
    setTimeout(() => {
      // Look in localStorage first
      const stored = localStorage.getItem('teleconsult_demo_queue');
      if (stored) {
        setQueue(JSON.parse(stored));
      }
      setLoading(false);
    }, 500);
  }, []);

  const seed = async () => {
    setLoading(true);
    const demoData: Teleconsult[] = [
      { id: 't1', hubFacilityId: FACILITY, spokeFacilityId: 'SC-Kondhwa', patientName: 'Sunita Sharma', condition: 'Chest pain, referred from ASHA', priority: 'high', status: 'WAITING', createdAt: new Date().toISOString() },
      { id: 't2', hubFacilityId: FACILITY, spokeFacilityId: 'SC-Wagholi', patientName: 'Ravi Kumar', condition: 'High fever', priority: 'routine', status: 'WAITING', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    ];
    localStorage.setItem('teleconsult_demo_queue', JSON.stringify(demoData));
    setQueue(demoData);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: Status) => {
    const updatedQueue = queue.map(q => {
      if (q.id === id) return { ...q, status };
      return q;
    });
    setQueue(updatedQueue);
    localStorage.setItem('teleconsult_demo_queue', JSON.stringify(updatedQueue));
    const active = updatedQueue.find(q => q.id === id);
    if (status === 'ACTIVE' && active) setActiveCall(active);
    if (status === 'COMPLETED') setActiveCall(null);
  };

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  // Timer for active call
  useEffect(() => {
    if (!activeCall) {
      setCallDuration(0);
      return;
    }
    const timer = setInterval(() => setCallDuration(d => d + 1), 1000);
    return () => clearInterval(timer);
  }, [activeCall]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const activeQueue = queue.filter(q => q.status !== 'COMPLETED');

  return (
    <Shell title="Teleconsultation Hub" subtitle="PHC Kondhwa">
      <div style={{ padding: '1rem', display: 'flex', gap: '1rem', height: 'calc(100% - 2rem)', boxSizing: 'border-box' }}>

        {/* Queue */}
        <div style={{ ...s.card, width: '300px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>Incoming Requests</span>
            <button onClick={seed} style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer' }}>🌱 Demo Data</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading...</div>
            ) : activeQueue.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>No pending consultations.</div>
            ) : activeQueue.map(q => {
              const isHigh = q.priority === 'high';
              const isActive = activeCall?.id === q.id;
              
              // Wait time calc
              const waitMins = Math.floor((Date.now() - new Date(q.createdAt).getTime()) / 60000);

              return (
                <div key={q.id} style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f8fafc', background: isActive ? '#f0fdf4' : 'white', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{q.patientName}</div>
                    <span style={{
                      padding: '1px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600,
                      background: isHigh ? '#fee2e2' : '#f0fdf4',
                      color: isHigh ? '#ef4444' : '#10b981',
                    }}>{isHigh ? 'HIGH' : 'ROUTINE'}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>📍 {q.spokeFacilityId}</div>
                  <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.125rem' }}>{q.condition}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.7rem', color: waitMins > 15 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>Waiting: {waitMins}m</div>
                    {q.status === 'WAITING' ? (
                      <button onClick={() => updateStatus(q.id, 'ACTIVE')} style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0.375rem 0.75rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                        Start Call
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>● In Progress</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main video */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ ...s.card, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {!activeCall ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '3rem' }}>
                <div style={{ width: '80px', height: '80px', background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' }}>📹</div>
                <div style={{ textAlign: 'center' }}>
                  <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Ready to start a consultation?</h2>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', maxWidth: '400px' }}>Select a patient from the queue to start a new live video consultation session with the remote Sub-Centre.</p>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Call header */}
                <div style={{ background: '#f8fafc', padding: '0.625rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, animation: 'pulse 2s infinite' }}>● LIVE</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{activeCall.spokeFacilityId} | {activeCall.patientName}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{formatTime(callDuration)}</span>
                    <span style={{ color: '#10b981' }}>📶 Secure Connection</span>
                  </div>
                </div>

                {/* Video layout */}
                <div style={{ flex: 1, position: 'relative', background: '#111827', display: 'flex', flexDirection: 'column' }}>
                  <img
                    src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=1200&q=80"
                    alt="Patient at Sub-Centre"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }}
                  />
                  <div style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(0,0,0,0.6)', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                    Remote Hub · {activeCall.spokeFacilityId}
                  </div>

                  {/* Doctor PIP */}
                  <div style={{ position: 'absolute', bottom: '80px', right: '24px', width: '160px', height: '120px', background: '#0f172a', borderRadius: '8px', border: '2px solid white', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                    <img src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=300&q=80" alt="Doctor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '4px', left: '8px', color: 'white', fontSize: '0.65rem', fontWeight: 600, textShadow: '0 1px 2px black' }}>You (Dr.)</div>
                  </div>

                  {/* Controls */}
                  <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.4)', padding: '0.5rem 1rem', borderRadius: '32px', backdropFilter: 'blur(8px)' }}>
                    {[{ icon: '🎤', bg: 'rgba(255,255,255,0.2)' }, { icon: '📹', bg: 'rgba(255,255,255,0.2)' }, { icon: '🖥️', bg: 'rgba(255,255,255,0.2)' }].map((ctrl, i) => (
                      <div
                        key={i}
                        style={{ width: '44px', height: '44px', background: ctrl.bg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.25rem', color: 'white' }}
                      >{ctrl.icon}</div>
                    ))}
                    <button
                      onClick={() => updateStatus(activeCall.id, 'COMPLETED')}
                      style={{ height: '44px', padding: '0 1.25rem', background: '#ef4444', borderRadius: '22px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', border: 'none', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}
                    >
                      <span>📞</span> End & Complete
                    </button>
                  </div>
                </div>

                {/* Quick Note taking panel underneath */}
                <div style={{ background: 'white', borderTop: '1px solid #e2e8f0', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Specialist Assessment & Documents</div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.375rem' }}>E-Prescription</div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                        <input placeholder="Medicine Name (e.g., Tab Paracetamol 500mg)" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input placeholder="Dose (1-1-1)" style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                          <input placeholder="Days (e.g., 5)" style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                        </div>
                        <button onClick={() => alert('Prescription sent to PHC and synced to ASHA')} style={{ width: '100%', padding: '0.5rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Send Prescription to PHC</button>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.375rem' }}>Diagnostic Test Order</div>
                      <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                        <select style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }}>
                          <option>Select Test...</option>
                          <option>CBC (Complete Blood Count)</option>
                          <option>HbA1c</option>
                          <option>Chest X-Ray</option>
                        </select>
                        <input placeholder="Clinical Notes / Indications" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', boxSizing: 'border-box' }} />
                        <button onClick={() => alert('Diagnostic Order sent to PHC and synced to ASHA')} style={{ width: '100%', padding: '0.5rem', background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Send Order to PHC</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </Shell>
  );
}
