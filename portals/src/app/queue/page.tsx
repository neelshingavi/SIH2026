'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import Shell from '@/components/Shell';

// ── Types ──────────────────────────────────────────────────────────────────
type Priority = 'EMERGENCY' | 'HIGH' | 'NORMAL';
type Status   = 'WAITING' | 'CALLED' | 'IN_CONSULT' | 'DONE';

interface QueueEntry {
  id: string;
  token: number;
  patientName: string;
  age: string;
  gender: string;
  priority: Priority;
  status: Status;
  chiefComplaint: string;
  bpVital: string;
  spo2Vital: string;
  tempVital: string;
  createdAt: string;
}

// ── Config ──────────────────────────────────────────────────────────────────
const API  = 'http://localhost:3001';
const FACILITY = 'PHC-001';

const PRIORITY_CFG: Record<Priority, { label: string; bg: string; color: string; border: string; dot: string }> = {
  EMERGENCY: { label: 'Emergency', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5', dot: '#ef4444' },
  HIGH:      { label: 'High',      bg: '#fffbeb', color: '#d97706', border: '#fde68a', dot: '#f59e0b' },
  NORMAL:    { label: 'Normal',    bg: '#f0fdf4', color: '#059669', border: '#a7f3d0', dot: '#10b981' },
};

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string }> = {
  WAITING:    { label: 'Waiting',    color: '#64748b', bg: '#f1f5f9' },
  CALLED:     { label: 'Called ▶',   color: '#0ea5e9', bg: '#e0f2fe' },
  IN_CONSULT: { label: 'In Consult', color: '#8b5cf6', bg: '#ede9fe' },
  DONE:       { label: '✓ Done',     color: '#10b981', bg: '#ecfdf5' },
};

const NEXT_LABEL: Partial<Record<Status, string>> = {
  WAITING:    '📢 Call Patient',
  CALLED:     '🩺 Start Consult',
  IN_CONSULT: '✅ Mark Done',
};

const NEXT_COLOR: Partial<Record<Status, string>> = {
  WAITING: '#0ea5e9', CALLED: '#8b5cf6', IN_CONSULT: '#10b981',
};

// ── Add Patient Form ─────────────────────────────────────────────────────────
function AddPatientModal({ onClose, onAdded }: { onClose: () => void; onAdded: (e: QueueEntry) => void }) {
  const [form, setForm] = useState({ patientName: '', age: '', gender: 'F', chiefComplaint: '', priority: 'NORMAL' as Priority, bpVital: '', spo2Vital: '', tempVital: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.patientName.trim() || !form.chiefComplaint.trim()) {
      setError('Patient name and chief complaint are required.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId: FACILITY, ...form }),
      });
      if (!res.ok) throw new Error(await res.text());
      const entry: QueueEntry = await res.json();
      onAdded(entry);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ background: '#0b1a2d', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>➕ Register New Patient</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.625rem', borderRadius: '6px', fontSize: '0.8rem' }}>{error}</div>}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Patient Name *</span>
              <input value={form.patientName} onChange={e => setForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Full name" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Age</span>
              <input value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="30" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Gender</span>
              <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }}>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Chief Complaint *</span>
            <input value={form.chiefComplaint} onChange={e => setForm(f => ({ ...f, chiefComplaint: e.target.value }))} placeholder="e.g. Fever since 2 days" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Priority</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['NORMAL', 'HIGH', 'EMERGENCY'] as Priority[]).map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{
                  flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${PRIORITY_CFG[p].border}`, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem',
                  background: form.priority === p ? PRIORITY_CFG[p].bg : 'white',
                  color: form.priority === p ? PRIORITY_CFG[p].color : '#64748b',
                }}>{PRIORITY_CFG[p].label}</button>
              ))}
            </div>
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { key: 'bpVital', label: 'BP', placeholder: '120/80' },
              { key: 'spo2Vital', label: 'SpO₂', placeholder: '98%' },
              { key: 'tempVital', label: 'Temp', placeholder: '98.6°F' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{f.label}</span>
                <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
              </label>
            ))}
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ padding: '0.625rem 1.25rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Registering...' : 'Register Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function QueuePage() {
  const [queue, setQueue]           = useState<QueueEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [connected, setConnected]   = useState(false);
  const [advancing, setAdvancing]   = useState<string | null>(null);
  const [selected, setSelected]     = useState<QueueEntry | null>(null);
  const [filterPriority, setFP]     = useState<Priority | 'ALL'>('ALL');
  const [filterStatus, setFS]       = useState<Status | 'ALL'>('ALL');
  const [showAdd, setShowAdd]       = useState(false);
  const [note, setNote]             = useState('');
  const socketRef = useRef<Socket | null>(null);

  // ── Fetch initial queue ──────────────────────────────────────────────────
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API}/queue?facilityId=${FACILITY}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data: QueueEntry[] = await res.json();
      setQueue(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch {
      // keep empty state on error
    } finally {
      setLoading(false);
    }
  }, [selected]);

  // ── Seed demo data if empty ──────────────────────────────────────────────
  const seed = useCallback(async () => {
    await fetch(`${API}/queue/seed?facilityId=${FACILITY}`, { method: 'POST' });
    await fetchQueue();
  }, [fetchQueue]);

  // ── WebSocket connection ─────────────────────────────────────────────────
  useEffect(() => {
    fetchQueue();

    const socket = io(`${API}/queue`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('joinFacility', FACILITY);
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('entryUpdated', (updated: QueueEntry) => {
      setQueue(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
    });

    socket.on('entryAdded', (entry: QueueEntry) => {
      setQueue(prev => [...prev, entry]);
    });

    return () => { socket.disconnect(); };
  }, []);

  // ── Advance via REST (also triggers WS broadcast from server) ────────────
  const advance = async (id: string) => {
    setAdvancing(id);
    try {
      const res = await fetch(`${API}/queue/${id}/advance`, { method: 'PATCH' });
      if (!res.ok) throw new Error(await res.text());
      const updated: QueueEntry = await res.json();
      setQueue(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setAdvancing(null);
    }
  };

  const handleAdded = (entry: QueueEntry) => {
    setQueue(prev => [...prev, entry]);
    setSelected(entry);
  };

  // ── Filtering & derived stats ────────────────────────────────────────────
  const filtered = queue.filter(e =>
    (filterPriority === 'ALL' || e.priority === filterPriority) &&
    (filterStatus   === 'ALL' || e.status   === filterStatus)
  );

  const stats = {
    total:     queue.length,
    waiting:   queue.filter(e => e.status === 'WAITING').length,
    active:    queue.filter(e => e.status === 'CALLED' || e.status === 'IN_CONSULT').length,
    done:      queue.filter(e => e.status === 'DONE').length,
    emergency: queue.filter(e => e.priority === 'EMERGENCY').length,
  };

  const waitMins = (entry: QueueEntry) => {
    if (entry.status === 'DONE') return null;
    const mins = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000);
    return mins;
  };

  const s = {
    card:  { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties,
    label: { fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  };

  return (
    <Shell title="Live OPD Triage Queue" subtitle="PHC Kondhwa">
      {showAdd && <AddPatientModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>

        {/* ── STATS + ACTIONS ROW ── */}
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0, alignItems: 'stretch' }}>
          {[
            { label: 'Total Today', value: stats.total, color: '#1e293b', bg: '#f8fafc' },
            { label: 'Waiting',     value: stats.waiting,   color: '#f59e0b', bg: '#fffbeb' },
            { label: 'In Progress', value: stats.active,    color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'Completed',   value: stats.done,      color: '#10b981', bg: '#ecfdf5' },
            { label: 'Emergency',   value: stats.emergency, color: '#ef4444', bg: '#fef2f2' },
          ].map(st => (
            <div key={st.label} style={{ flex: 1, background: st.bg, border: `1px solid ${st.color}30`, borderRadius: '8px', padding: '0.875rem 1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: st.color, lineHeight: 1 }}>{st.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>{st.label}</div>
            </div>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
            <button onClick={() => setShowAdd(true)} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.625rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>+ Register Patient</button>
            <button onClick={seed} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>🌱 Load Demo Data</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.7rem', color: connected ? '#10b981' : '#ef4444' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', display: 'inline-block' }}></span>
              {connected ? 'Live' : 'Connecting...'}
            </div>
          </div>
        </div>

        {/* ── MAIN: Queue List + Detail Panel ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1rem', flex: 1, minHeight: 0 }}>

          {/* Queue list */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Filter bar */}
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Patient Queue</div>
              <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                {(['ALL', 'EMERGENCY', 'HIGH', 'NORMAL'] as const).map(p => (
                  <button key={p} onClick={() => setFP(p)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: filterPriority === p ? '#0b1a2d' : '#f1f5f9', color: filterPriority === p ? 'white' : '#64748b' }}>{p === 'ALL' ? 'All' : p}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {(['ALL', 'WAITING', 'CALLED', 'IN_CONSULT', 'DONE'] as const).map(st => (
                  <button key={st} onClick={() => setFS(st)} style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', border: 'none', background: filterStatus === st ? '#0b1a2d' : '#f1f5f9', color: filterStatus === st ? 'white' : '#64748b' }}>{st === 'ALL' ? 'All' : st.replace('_', ' ')}</button>
                ))}
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 90px 110px 64px 90px 100px', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              {['#', 'Patient', 'Priority', 'Status', 'Wait', 'Vitals', 'Action'].map(h => (
                <div key={h} style={s.label}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading queue…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No patients. Click <strong>Load Demo Data</strong> to seed, or <strong>Register Patient</strong> to add.
                </div>
              ) : filtered.map(entry => {
                const pc   = PRIORITY_CFG[entry.priority];
                const sc   = STATUS_CFG[entry.status];
                const isSel= selected?.id === entry.id;
                const wm   = waitMins(entry);
                return (
                  <div key={entry.id} onClick={() => setSelected(entry)} style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr 90px 110px 64px 90px 100px',
                    gap: '0.5rem', padding: '0.75rem 1rem', borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer', alignItems: 'center',
                    background: isSel ? '#f0fdf4' : entry.priority === 'EMERGENCY' ? '#fef2f225' : 'white',
                    borderLeft: isSel ? '3px solid #10b981' : `3px solid ${pc.dot}`,
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ width: '32px', height: '32px', background: pc.bg, border: `1px solid ${pc.border}`, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', color: pc.color }}>{entry.token}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{entry.patientName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{entry.age}Y {entry.gender}</div>
                    </div>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, justifySelf: 'start' }}>{pc.label}</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, background: sc.bg, color: sc.color, justifySelf: 'start' }}>{sc.label}</span>
                    <span style={{ fontSize: '0.75rem', color: wm && wm > 30 ? '#ef4444' : '#64748b', fontWeight: wm && wm > 30 ? 700 : 400 }}>{wm !== null ? `${wm}m` : '—'}</span>
                    <div style={{ fontSize: '0.65rem', color: '#475569' }}>
                      {entry.bpVital && <div>BP: <b>{entry.bpVital}</b></div>}
                      {entry.spo2Vital && <div>SpO₂: <b>{entry.spo2Vital}</b></div>}
                    </div>
                    <div>
                      {NEXT_LABEL[entry.status] ? (
                        <button onClick={ev => { ev.stopPropagation(); advance(entry.id); }} disabled={advancing === entry.id} style={{
                          background: NEXT_COLOR[entry.status], color: 'white', border: 'none',
                          padding: '0.375rem 0.5rem', borderRadius: '6px', fontWeight: 600,
                          cursor: advancing === entry.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.7rem', width: '100%', opacity: advancing === entry.id ? 0.6 : 1,
                        }}>{advancing === entry.id ? '…' : NEXT_LABEL[entry.status]}</button>
                      ) : <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✔ Done</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selected ? (() => {
              const pc  = PRIORITY_CFG[selected.priority];
              const sc  = STATUS_CFG[selected.status];
              const wm  = waitMins(selected);
              return (
                <>
                  <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: selected.priority === 'EMERGENCY' ? '#fef2f2' : '#f8fafc', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                          {selected.patientName.split(' ').map(n => n[0]).join('').slice(0,2)}
                        </div>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{selected.patientName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selected.age}Y · {selected.gender === 'F' ? 'Female' : 'Male'} · Token #{selected.token}</div>
                        </div>
                      </div>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, flexShrink: 0 }}>{pc.label}</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
                      {wm !== null && <span style={{ fontSize: '0.7rem', color: wm > 30 ? '#ef4444' : '#64748b' }}>Waiting {wm}m</span>}
                    </div>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div>
                      <div style={s.label}>Chief Complaint</div>
                      <div style={{ marginTop: '0.375rem', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>{selected.chiefComplaint || '—'}</div>
                    </div>

                    {(selected.bpVital || selected.spo2Vital || selected.tempVital) && (
                      <div>
                        <div style={s.label}>Recorded Vitals</div>
                        <div style={{ marginTop: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                          {selected.bpVital && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', fontSize: '0.8rem' }}>
                              <span style={{ color: '#64748b' }}>🩺 Blood Pressure</span>
                              <span style={{ fontWeight: 700, color: '#ef4444' }}>{selected.bpVital}</span>
                            </div>
                          )}
                          {selected.spo2Vital && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #a7f3d0', fontSize: '0.8rem' }}>
                              <span style={{ color: '#64748b' }}>💧 SpO₂</span>
                              <span style={{ fontWeight: 700, color: '#10b981' }}>{selected.spo2Vital}</span>
                            </div>
                          )}
                          {selected.tempVital && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.8rem' }}>
                              <span style={{ color: '#64748b' }}>🌡️ Temperature</span>
                              <span style={{ fontWeight: 700, color: '#d97706' }}>{selected.tempVital}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {wm !== null && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                          <div style={s.label}>Wait Time</div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: wm > 30 ? '#ef4444' : '#1e293b' }}>{wm}m {wm > 30 ? '⚠️' : ''}</span>
                        </div>
                        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min((wm / 60) * 100, 100)}%`, background: wm > 45 ? '#ef4444' : wm > 25 ? '#f59e0b' : '#10b981', transition: 'width 0.3s' }}></div>
                        </div>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.25rem', textAlign: 'right' }}>Target: ≤ 30 mins</div>
                      </div>
                    )}

                    <div>
                      <div style={s.label}>Triage Notes</div>
                      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Add clinical notes, observations…" style={{ width: '100%', marginTop: '0.375rem', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  </div>

                  {NEXT_LABEL[selected.status] && (
                    <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                      <button onClick={() => advance(selected.id)} disabled={advancing === selected.id} style={{
                        width: '100%', padding: '0.75rem',
                        background: NEXT_COLOR[selected.status], color: 'white', border: 'none',
                        borderRadius: '8px', fontWeight: 700, cursor: advancing === selected.id ? 'not-allowed' : 'pointer',
                        fontSize: '0.9375rem', opacity: advancing === selected.id ? 0.6 : 1,
                      }}>{advancing === selected.id ? 'Updating…' : NEXT_LABEL[selected.status]}</button>
                    </div>
                  )}
                </>
              );
            })() : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>👆</span>
                <div style={{ fontWeight: 600, color: '#64748b' }}>Select a patient</div>
                <div style={{ fontSize: '0.8rem' }}>Click any row to see details and advance their status</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
