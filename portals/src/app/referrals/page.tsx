'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Shell from '@/components/Shell';
import { apiGet, apiPost, apiPatch } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────
type Status   = 'CREATED' | 'ACCEPTED' | 'IN_TRANSIT' | 'ARRIVED' | 'COMPLETED';
type Priority = 'EMERGENCY' | 'HIGH' | 'NORMAL';

interface Referral {
  id: string;
  patientName: string;
  age: string;
  gender: string;
  fromFacilityId: string;
  reason: string;
  notes: string;
  priority: Priority;
  status: Status;
  createdAt: string;
}

// ── Config ──────────────────────────────────────────────────────────────────
const API      = 'http://localhost:3001';
const FACILITY = 'PHC-001';

const PRIORITY_CFG: Record<Priority, { label: string; bg: string; color: string; border: string }> = {
  EMERGENCY: { label: 'Emergency', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
  HIGH:      { label: 'High',      bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  NORMAL:    { label: 'Normal',    bg: '#f0fdf4', color: '#059669', border: '#a7f3d0' },
};

const STATUS_ORDER: Status[] = ['CREATED', 'ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'COMPLETED'];

const STATUS_CFG: Record<Status, { label: string; icon: string; color: string; bg: string }> = {
  CREATED:    { label: 'Pending',    icon: '🕐', color: '#f59e0b', bg: '#fffbeb' },
  ACCEPTED:   { label: 'Accepted',   icon: '✅', color: '#3b82f6', bg: '#eff6ff' },
  IN_TRANSIT: { label: 'In Transit', icon: '🚑', color: '#8b5cf6', bg: '#ede9fe' },
  ARRIVED:    { label: 'Arrived',    icon: '🏥', color: '#0ea5e9', bg: '#e0f2fe' },
  COMPLETED:  { label: 'Completed',  icon: '✔',  color: '#10b981', bg: '#ecfdf5' },
};

const NEXT_ACTION: Partial<Record<Status, string>> = {
  CREATED:    'Accept Referral',
  ACCEPTED:   'Mark In Transit',
  IN_TRANSIT: 'Mark Arrived',
  ARRIVED:    'Complete',
};

const NEXT_COLOR: Partial<Record<Status, string>> = {
  CREATED: '#3b82f6', ACCEPTED: '#8b5cf6', IN_TRANSIT: '#0ea5e9', ARRIVED: '#10b981',
};

// ── Send Referral Modal ──────────────────────────────────────────────────────
function SendReferralModal({ onClose, onSent }: { onClose: () => void; onSent: (r: Referral) => void }) {
  const [form, setForm] = useState({ patientName: '', age: '', gender: 'F', fromFacilityId: 'SC-Wagholi', reason: '', notes: '', priority: 'NORMAL' as Priority });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!form.patientName.trim() || !form.reason.trim()) { setError('Patient name and reason are required'); return; }
    setLoading(true);
    try {
      const data = await apiPost('/referral', { ...form, toFacilityId: FACILITY });
      onSent(data);
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '500px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
        <div style={{ background: '#0b1a2d', color: 'white', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>🔄 Create New Referral</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.25rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '0.625rem', borderRadius: '6px', fontSize: '0.8rem' }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px', gap: '0.75rem' }}>
            {[
              { key: 'patientName', label: 'Patient Name *', type: 'text', placeholder: 'Full Name', span: true },
              { key: 'age', label: 'Age', type: 'text', placeholder: '35' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: f.span ? '1' : undefined }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>{f.label}</span>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
              </label>
            ))}
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Gender</span>
              <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }}>
                <option value="F">Female</option>
                <option value="M">Male</option>
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Referring Facility</span>
            <select value={form.fromFacilityId} onChange={e => setForm(p => ({ ...p, fromFacilityId: e.target.value }))} style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }}>
              <option value="SC-Wagholi">Sub-Centre Wagholi</option>
              <option value="SC-Khed">Khed Sub-Centre</option>
              <option value="PHC-Bhor">PHC Bhor</option>
              <option value="PHC-Daund">PHC Daund</option>
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Reason for Referral *</span>
            <input value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. High BP, ANC follow-up" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Additional Notes</span>
            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Clinical notes, observations…" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit' }} />
          </label>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Priority</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['NORMAL', 'HIGH', 'EMERGENCY'] as Priority[]).map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: `1px solid ${PRIORITY_CFG[p].border}`, cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', background: form.priority === p ? PRIORITY_CFG[p].bg : 'white', color: form.priority === p ? PRIORITY_CFG[p].color : '#64748b' }}>{PRIORITY_CFG[p].label}</button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.25rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>Cancel</button>
          <button onClick={submit} disabled={loading} style={{ padding: '0.625rem 1.25rem', background: '#0f766e', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: loading ? 0.7 : 1 }}>{loading ? 'Creating…' : 'Create Referral'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [selected, setSelected]   = useState<Referral | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [filterStatus, setFS]     = useState<Status | 'ALL'>('ALL');

  const fetchReferrals = useCallback(async () => {
    try {
      const data: Referral[] = await apiGet(`/referral?facilityId=${FACILITY}`);
      const arr = Array.isArray(data) ? data : [];
      if (arr.length === 0) {
        // Auto-seed if empty
        await apiPost(`/referral/seed?facilityId=${FACILITY}`);
        const seeded: Referral[] = await apiGet(`/referral?facilityId=${FACILITY}`);
        const s2 = Array.isArray(seeded) ? seeded : [];
        setReferrals(s2);
        if (s2.length > 0 && !selected) setSelected(s2[0]);
      } else {
        setReferrals(arr);
        if (arr.length > 0 && !selected) setSelected(arr[0]);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [selected]);

  const seed = async () => {
    await apiPost(`/referral/seed?facilityId=${FACILITY}`);
    await fetchReferrals();
  };

  const advance = async (id: string) => {
    setAdvancing(id);
    try {
      const updated: Referral = await apiPatch(`/referral/${id}/advance`);
      setReferrals(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelected(sel => sel?.id === updated.id ? updated : sel);
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setAdvancing(null); }
  };

  const handleSent = (r: Referral) => {
    setReferrals(prev => [r, ...prev]);
    setSelected(r);
  };

  useEffect(() => { fetchReferrals(); }, []);

  const filtered = referrals.filter(r => filterStatus === 'ALL' || r.status === filterStatus);

  const counts = {
    total:     referrals.length,
    pending:   referrals.filter(r => r.status === 'CREATED').length,
    active:    referrals.filter(r => ['ACCEPTED', 'IN_TRANSIT', 'ARRIVED'].includes(r.status)).length,
    completed: referrals.filter(r => r.status === 'COMPLETED').length,
    emergency: referrals.filter(r => r.priority === 'EMERGENCY').length,
  };

  const s = {
    card:  { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties,
    label: { fontSize: '0.65rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' } as React.CSSProperties,
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <Shell title="Referral Management" subtitle="PHC Kondhwa">
      {showAdd && <SendReferralModal onClose={() => setShowAdd(false)} onSent={handleSent} />}

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0, alignItems: 'stretch' }}>
          {[
            { label: 'Total',     value: counts.total,     color: '#1e293b', bg: '#f8fafc' },
            { label: 'Pending',   value: counts.pending,   color: '#f59e0b', bg: '#fffbeb' },
            { label: 'Active',    value: counts.active,    color: '#8b5cf6', bg: '#ede9fe' },
            { label: 'Completed', value: counts.completed, color: '#10b981', bg: '#ecfdf5' },
            { label: 'Emergency', value: counts.emergency, color: '#ef4444', bg: '#fef2f2' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: s.bg, border: `1px solid ${s.color}30`, borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.875rem', fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end', justifyContent: 'center', flexShrink: 0 }}>
            <button onClick={() => setShowAdd(true)} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.625rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>+ New Referral</button>
            <button onClick={seed} style={{ background: 'white', color: '#64748b', border: '1px solid #e2e8f0', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>🌱 Load Demo Data</button>
          </div>
        </div>

        {/* Pipeline status tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
          {(['ALL', ...STATUS_ORDER] as const).map(st => {
            const cnt = st === 'ALL' ? referrals.length : referrals.filter(r => r.status === st).length;
            const cfg = st !== 'ALL' ? STATUS_CFG[st] : null;
            return (
              <button key={st} onClick={() => setFS(st as any)} style={{
                flex: 1, padding: '0.625rem 0.5rem', border: '1px solid', borderRadius: '8px',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.15s',
                background: filterStatus === st ? (cfg?.bg ?? '#f8fafc') : 'white',
                color: filterStatus === st ? (cfg?.color ?? '#1e293b') : '#64748b',
                borderColor: filterStatus === st ? (cfg?.color ?? '#1e293b') + '50' : '#e2e8f0',
              }}>
                {cfg && <span style={{ marginRight: '0.25rem' }}>{cfg.icon}</span>}
                {st === 'ALL' ? 'All' : cfg!.label}
                <span style={{ marginLeft: '0.375rem', background: filterStatus === st ? (cfg?.color ?? '#1e293b') : '#f1f5f9', color: filterStatus === st ? 'white' : '#64748b', padding: '0 5px', borderRadius: '10px', fontSize: '0.65rem' }}>{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1rem', flex: 1, minHeight: 0 }}>

          {/* Referral list */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Table headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 100px 80px 100px 110px', gap: '0.5rem', padding: '0.625rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              {['Patient / Facility', 'Status', 'Priority', 'Age', 'Received', 'Action'].map(h => <div key={h} style={s.label}>{h}</div>)}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading referrals…</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
                  No referrals found. Click <strong>Load Demo Data</strong> or <strong>New Referral</strong>.
                </div>
              ) : filtered.map(ref => {
                const pc  = PRIORITY_CFG[ref.priority];
                const sc  = STATUS_CFG[ref.status];
                const isSel = selected?.id === ref.id;
                return (
                  <div key={ref.id} onClick={() => setSelected(ref)} style={{
                    display: 'grid', gridTemplateColumns: '1fr 130px 100px 80px 100px 110px',
                    gap: '0.5rem', padding: '0.875rem 1rem', borderBottom: '1px solid #f8fafc',
                    cursor: 'pointer', alignItems: 'center',
                    background: isSel ? '#f0fdf4' : ref.priority === 'EMERGENCY' ? '#fef2f220' : 'white',
                    borderLeft: isSel ? '3px solid #10b981' : `3px solid ${pc.color}50`,
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{ref.patientName}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.125rem' }}>📍 {ref.fromFacilityId}</div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, background: sc.bg, color: sc.color, justifySelf: 'start', whiteSpace: 'nowrap' }}>{sc.icon} {sc.label}</span>
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, justifySelf: 'start' }}>{pc.label}</span>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{ref.age}{ref.gender}</span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{timeAgo(ref.createdAt)}</span>
                    <div>
                      {NEXT_ACTION[ref.status] ? (
                        <button onClick={ev => { ev.stopPropagation(); advance(ref.id); }} disabled={advancing === ref.id} style={{
                          background: NEXT_COLOR[ref.status], color: 'white', border: 'none',
                          padding: '0.375rem 0.625rem', borderRadius: '6px', fontWeight: 600,
                          cursor: advancing === ref.id ? 'not-allowed' : 'pointer',
                          fontSize: '0.7rem', width: '100%', opacity: advancing === ref.id ? 0.6 : 1,
                        }}>{advancing === ref.id ? '…' : NEXT_ACTION[ref.status]}</button>
                      ) : <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✔ Done</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div style={{ ...s.card, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {selected ? (
              <>
                <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: selected.priority === 'EMERGENCY' ? '#fef2f2' : '#f8fafc', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #0f766e, #0ea5e9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {selected.patientName.split(' ').map(n => n[0]).join('').slice(0,2)}
                      </div>
                      <div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{selected.patientName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{selected.age}Y · {selected.gender === 'F' ? 'Female' : 'Male'}</div>
                      </div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, background: PRIORITY_CFG[selected.priority].bg, color: PRIORITY_CFG[selected.priority].color, border: `1px solid ${PRIORITY_CFG[selected.priority].border}`, flexShrink: 0 }}>{PRIORITY_CFG[selected.priority].label}</span>
                  </div>

                  {/* Progress pipeline */}
                  <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center' }}>
                    {STATUS_ORDER.map((st, i) => {
                      const idx    = STATUS_ORDER.indexOf(selected.status);
                      const isCurr = st === selected.status;
                      const isDone = i < idx;
                      const cfg    = STATUS_CFG[st];
                      return (
                        <React.Fragment key={st}>
                          <div style={{ flex: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: isDone ? '#10b981' : isCurr ? cfg.color : '#e2e8f0', color: isDone || isCurr ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, border: isCurr ? `2px solid ${cfg.color}` : 'none', boxShadow: isCurr ? `0 0 0 3px ${cfg.color}25` : 'none' }}>
                              {isDone ? '✓' : cfg.icon}
                            </div>
                            <div style={{ fontSize: '0.55rem', color: isCurr ? cfg.color : isDone ? '#10b981' : '#94a3b8', fontWeight: isCurr ? 700 : 400, whiteSpace: 'nowrap' }}>{cfg.label}</div>
                          </div>
                          {i < STATUS_ORDER.length - 1 && <div style={{ flex: 1, height: '2px', background: i < idx ? '#10b981' : '#e2e8f0', margin: '0 0.25rem', marginBottom: '1rem' }}></div>}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div style={s.label}>From Facility</div>
                    <div style={{ marginTop: '0.375rem', padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#0f766e', fontWeight: 600 }}>📍 {selected.fromFacilityId}</div>
                  </div>
                  <div>
                    <div style={s.label}>Reason for Referral</div>
                    <div style={{ marginTop: '0.375rem', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.875rem', color: '#1e293b', fontWeight: 500 }}>{selected.reason}</div>
                  </div>
                  {selected.notes && (
                    <div>
                      <div style={s.label}>Clinical Notes</div>
                      <div style={{ marginTop: '0.375rem', padding: '0.625rem', background: '#fffbeb', borderRadius: '6px', border: '1px solid #fde68a', fontSize: '0.8rem', color: '#78350f', lineHeight: 1.5 }}>{selected.notes}</div>
                    </div>
                  )}
                  <div>
                    <div style={s.label}>Timeline</div>
                    <div style={{ marginTop: '0.375rem', fontSize: '0.8rem', color: '#64748b' }}>
                      Created: {new Date(selected.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>

                {NEXT_ACTION[selected.status] && (
                  <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
                    <button onClick={() => advance(selected.id)} disabled={advancing === selected.id} style={{
                      width: '100%', padding: '0.75rem',
                      background: NEXT_COLOR[selected.status], color: 'white', border: 'none',
                      borderRadius: '8px', fontWeight: 700, cursor: advancing === selected.id ? 'not-allowed' : 'pointer',
                      fontSize: '0.9375rem', opacity: advancing === selected.id ? 0.6 : 1,
                    }}>{advancing === selected.id ? 'Updating…' : NEXT_ACTION[selected.status]}</button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', gap: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🔄</span>
                <div style={{ fontWeight: 600, color: '#64748b' }}>Select a referral</div>
                <div style={{ fontSize: '0.8rem' }}>Click any row to see details and advance the referral lifecycle</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
