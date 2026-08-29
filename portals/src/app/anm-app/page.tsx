'use client';
import React, { useState } from 'react';
import Shell from '@/components/Shell';

// ── Types ──────────────────────────────────────────────────────────────────
type TaskPriority = 'high' | 'routine' | 'completed';
interface Task {
  id: string;
  category: string;
  categoryColor: string;
  badge: string;
  badgeColor: string;
  patient: string;
  details: string;
  location: string;
  buttonLabel: string;
  buttonColor: string;
  completed: boolean;
}

interface HousePin {
  top: string;
  left: string;
  priority: TaskPriority;
  label: string;
  visited: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const INITIAL_TASKS: Task[] = [
  { id: 't1', category: 'High-Risk ANC Visits', categoryColor: '#ef4444', badge: '4 Overdue', badgeColor: '#ef4444', patient: 'Anita Shinde', details: '8th Month · High BP (150/95)', location: 'Wadi No. 3', buttonLabel: 'Mark Visited', buttonColor: '#ef4444', completed: false },
  { id: 't2', category: 'High-Risk ANC Visits', categoryColor: '#ef4444', badge: '4 Overdue', badgeColor: '#ef4444', patient: 'Lata Pawar', details: '7th Month · Anaemia detected', location: 'Wadi No. 1', buttonLabel: 'Mark Visited', buttonColor: '#ef4444', completed: false },
  { id: 't3', category: 'Chronic NCD Follow-ups', categoryColor: '#d97706', badge: '6 Due', badgeColor: '#f59e0b', patient: 'Ramesh M.', details: 'Diabetes Check · HbA1c due', location: 'Wadi No. 5', buttonLabel: 'Record Vitals', buttonColor: '#f59e0b', completed: false },
  { id: 't4', category: 'Chronic NCD Follow-ups', categoryColor: '#d97706', badge: '6 Due', badgeColor: '#f59e0b', patient: 'Sunanda Raut', details: 'Hypertension · BP monitoring', location: 'Wadi No. 2', buttonLabel: 'Record Vitals', buttonColor: '#f59e0b', completed: false },
  { id: 't5', category: 'Child Immunization Drops', categoryColor: '#059669', badge: '2 Pending', badgeColor: '#10b981', patient: '0–5 Yr Children', details: 'Polio drops · 8 children across 2 wadis', location: 'Wadi No. 1 & 4', buttonLabel: 'View List', buttonColor: '#10b981', completed: false },
];

const HOUSE_PINS: HousePin[] = [
  { top: '18%', left: '22%', priority: 'high', label: 'Anita S.', visited: false },
  { top: '28%', left: '62%', priority: 'high', label: 'Lata P.', visited: false },
  { top: '48%', left: '35%', priority: 'routine', label: 'Ramesh M.', visited: false },
  { top: '60%', left: '70%', priority: 'routine', label: 'Sunanda R.', visited: false },
  { top: '72%', left: '15%', priority: 'completed', label: 'Kiran B.', visited: true },
  { top: '75%', left: '50%', priority: 'completed', label: 'Meena J.', visited: true },
  { top: '38%', left: '80%', priority: 'completed', label: 'Priya K.', visited: true },
  { top: '55%', left: '55%', priority: 'routine', label: 'Sub-Centre', visited: false },
];

const PIN_COLOR: Record<TaskPriority, string> = {
  high: '#ef4444',
  routine: '#f59e0b',
  completed: '#10b981',
};

const ABHA_STEPS = ['Aadhaar Scan', 'Mobile OTP', 'Details', 'Create'];

const VIDEO_ITEMS = [
  { title: 'गर्भावस्थेत काळजी कशी घ्यावी?', sub: '(ANC Care)', duration: '3:45', bg: 'linear-gradient(135deg, #fce7f3, #ede9fe)' },
  { title: 'स्तनपानाचे फायदे', sub: '(Breastfeeding Benefits)', duration: '2:58', bg: 'linear-gradient(135deg, #dbeafe, #ccfbf1)' },
  { title: 'पोलिओ येब का महत्वाचे?', sub: '(Polio Drops Importance)', duration: '2:30', bg: 'linear-gradient(135deg, #fef9c3, #d1fae5)' },
  { title: 'मधुमेह नियंत्रण कसा ठेवावा?', sub: '(Diabetes Care Tips)', duration: '3:12', bg: 'linear-gradient(135deg, #fee2e2, #fef3c7)' },
];

const API = 'http://localhost:3001';

// ── Component ───────────────────────────────────────────────────────────────
export default function AnmApp() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [abhaStep, setAbhaStep] = useState(1);
  const [sosActive, setSosActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'tasks' | 'map' | 'tools'>('tasks');
  const [tcForm, setTcForm] = useState({ patientName: '', condition: '', priority: 'routine' });
  const [tcStatus, setTcStatus] = useState<'idle'|'loading'|'success'>('idle');

  const markDone = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  const requestTeleconsult = async () => {
    if (!tcForm.patientName) return;
    setTcStatus('loading');
    try {
      await fetch(`${API}/teleconsult/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubFacilityId: 'PHC-001',
          spokeFacilityId: 'Khed Sub-Centre',
          ...tcForm,
        })
      });
      setTcStatus('success');
      setTcForm({ patientName: '', condition: '', priority: 'routine' });
      setTimeout(() => setTcStatus('idle'), 3000);
    } catch {
      setTcStatus('idle');
    }
  };

  const pending = tasks.filter(t => !t.completed);
  const done = tasks.filter(t => t.completed);

  const s = {
    card: { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' } as React.CSSProperties,
    sectionHeader: { background: '#0f766e', color: 'white', padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.75rem' } as React.CSSProperties,
  };

  return (
    <Shell
      title="ANM Field Application"
      subtitle="Khed Sub-Centre"
      user="ANM Sunita"
      role="ANM / ASHA Worker"
      facility="Khed Sub-Centre"
      district="Block: Khed | District: Pune"
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── SYNC BANNER ── */}
        <div style={{ background: '#ecfdf5', padding: '0.625rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #a7f3d0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🗄️</span>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857' }}>42 Records Stored Offline</div>
              <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Will Auto-Sync when connectivity is available</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#047857' }}>Auto-Sync Active</div>
              <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Connection: Good <span>●</span></div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM-BAR NAVIGATION (rendered as top tabs) ── */}
        <div style={{ display: 'flex', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          {([
            { id: 'tasks', label: 'Smart Register', icon: '📋' },
            { id: 'map', label: 'Village GIS Map', icon: '🗺️' },
            { id: 'tools', label: 'Emergency & Tools', icon: '🚨' },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                flex: 1, padding: '0.75rem 0.5rem', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                background: activeSection === tab.id ? '#f0fdf4' : 'white',
                borderBottom: activeSection === tab.id ? '3px solid #0f766e' : '3px solid transparent',
                fontWeight: activeSection === tab.id ? 600 : 400,
                color: activeSection === tab.id ? '#0f766e' : '#64748b',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── MAIN CONTENT (three tab panels) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

          {/* ── TAB 1: Smart Client Register ── */}
          {activeSection === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Today's summary */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { label: 'Total Tasks', value: tasks.length, color: '#1e293b', bg: '#f8fafc' },
                  { label: 'Pending', value: pending.length, color: '#ef4444', bg: '#fef2f2' },
                  { label: 'Completed', value: done.length, color: '#10b981', bg: '#ecfdf5' },
                  { label: 'High Risk', value: tasks.filter(t => t.category.includes('High')).length, color: '#dc2626', bg: '#fee2e2' },
                ].map(stat => (
                  <div key={stat.label} style={{ flex: 1, background: stat.bg, borderRadius: '8px', padding: '0.75rem', textAlign: 'center', border: `1px solid ${stat.color}20` }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500 }}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Date header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>Today's Tasks</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>📅 12 May 2025</div>
              </div>

              {/* Pending Tasks */}
              <div style={{ ...s.card }}>
                <div style={s.sectionHeader}>
                  <div style={{ width: '22px', height: '22px', background: 'white', color: '#0f766e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                  Smart Client Register &amp; Task List
                  <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem' }}>{pending.length} Pending</span>
                </div>
                <div style={{ padding: '0.5rem' }}>
                  {pending.map((task, idx) => (
                    <div key={task.id} style={{ borderLeft: `4px solid ${task.categoryColor}`, padding: '0.875rem', marginBottom: idx < pending.length - 1 ? '0.75rem' : 0, background: '#fafafa', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: task.categoryColor }}>{task.category}</div>
                        <span style={{ background: task.badgeColor, color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>{task.badge}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.2rem' }}>{task.patient}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.2rem' }}>{task.details}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem' }}>📍 {task.location}</div>
                      <button
                        onClick={() => markDone(task.id)}
                        style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: `1px solid ${task.buttonColor}`, color: task.buttonColor, borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8125rem' }}
                      >{task.buttonLabel}</button>
                    </div>
                  ))}
                  {pending.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                      ✅ All tasks completed for today!
                    </div>
                  )}
                </div>
              </div>

              {/* Completed Tasks (if any) */}
              {done.length > 0 && (
                <div style={{ ...s.card }}>
                  <div style={{ ...s.sectionHeader, background: '#6b7280' }}>✔ Completed Tasks ({done.length})</div>
                  <div style={{ padding: '0.5rem' }}>
                    {done.map((task, idx) => (
                      <div key={task.id} style={{ borderLeft: '4px solid #10b981', padding: '0.875rem', marginBottom: idx < done.length - 1 ? '0.5rem' : 0, background: '#f0fdf4', borderRadius: '0 6px 6px 0', opacity: 0.8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#059669' }}>{task.patient}</div>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>✔ Done</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>{task.details} · {task.location}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div style={{ display: 'flex', gap: '1.5rem', padding: '0.75rem 0', borderTop: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444', display: 'inline-block' }}></span> High Risk</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b', display: 'inline-block' }}></span> Routine Visit</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}><span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981', display: 'inline-block' }}></span> Completed</div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Village GIS Map ── */}
          {activeSection === 'map' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ ...s.card }}>
                <div style={s.sectionHeader}>
                  <div style={{ width: '22px', height: '22px', background: 'white', color: '#0f766e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>2</div>
                  Village Household GIS Map
                </div>

                {/* Map toolbar */}
                <div style={{ padding: '0.625rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <select style={{ padding: '0.375rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.8rem', fontWeight: 500 }}>
                    <option>Khed Village</option>
                    <option>Wadi No. 1</option>
                    <option>Wadi No. 2</option>
                  </select>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                    <button style={{ background: 'none', border: '1px solid #e2e8f0', padding: '0.25rem 0.625rem', borderRadius: '4px', cursor: 'pointer' }}>📚 Layers</button>
                    <button style={{ background: 'none', border: '1px solid #e2e8f0', padding: '0.25rem 0.625rem', borderRadius: '4px', cursor: 'pointer' }}>🎯</button>
                  </div>
                </div>

                {/* Map canvas */}
                <div style={{ position: 'relative', height: '400px', background: 'linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 50%, #e0f7fa 100%)' }}>
                  {/* Road network lines (SVG) */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                    {/* Main road */}
                    <path d="M0,200 Q200,180 400,200 Q600,220 800,200" fill="none" stroke="#d1d5db" strokeWidth="8" />
                    {/* Side roads */}
                    <line x1="200" y1="0" x2="200" y2="400" stroke="#e5e7eb" strokeWidth="5" />
                    <line x1="500" y1="0" x2="500" y2="400" stroke="#e5e7eb" strokeWidth="5" />
                    <line x1="0" y1="100" x2="800" y2="100" stroke="#e5e7eb" strokeWidth="4" />
                    <line x1="0" y1="300" x2="800" y2="300" stroke="#e5e7eb" strokeWidth="4" />
                    {/* Planned route */}
                    <polyline
                      points="200,80 310,112 490,200 300,240 150,290 290,340"
                      fill="none" stroke="#3b82f6" strokeWidth="3"
                      strokeDasharray="8,4"
                    />
                  </svg>

                  {/* Wadi labels */}
                  {[
                    { label: 'WADI NO. 1', top: '5%', left: '30%' },
                    { label: 'WADI NO. 2', top: '5%', left: '68%' },
                    { label: 'WADI NO. 3', top: '55%', left: '5%' },
                    { label: 'WADI NO. 4', top: '82%', left: '40%' },
                  ].map(w => (
                    <div key={w.label} style={{ position: 'absolute', top: w.top, left: w.left, fontSize: '0.65rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', background: 'rgba(255,255,255,0.8)', padding: '2px 6px', borderRadius: '3px' }}>{w.label}</div>
                  ))}

                  {/* House/facility pins */}
                  {HOUSE_PINS.map((pin, i) => (
                    <div key={i} style={{ position: 'absolute', top: pin.top, left: pin.left, transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <div style={{
                        width: '30px', height: '30px',
                        background: PIN_COLOR[pin.priority],
                        borderRadius: pin.label === 'Sub-Centre' ? '4px' : '50%',
                        border: '2px solid white',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}>
                        {pin.label === 'Sub-Centre' ? '🏥' : pin.priority === 'completed' ? '✓' : '🏠'}
                      </div>
                      <div style={{ fontSize: '0.55rem', fontWeight: 600, color: '#1e293b', background: 'white', padding: '1px 4px', borderRadius: '3px', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', whiteSpace: 'nowrap' }}>{pin.label}</div>
                    </div>
                  ))}

                  {/* Zoom controls */}
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden', background: 'white' }}>
                    <button style={{ width: '32px', height: '32px', border: 'none', background: 'white', cursor: 'pointer', fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>+</button>
                    <button style={{ width: '32px', height: '32px', border: 'none', background: 'white', cursor: 'pointer', fontSize: '1.125rem', fontWeight: 700, color: '#1e293b' }}>−</button>
                  </div>
                </div>

                {/* Legend + Route info */}
                <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span style={{ display: 'inline-block', width: '20px', height: '2px', background: '#3b82f6', borderTop: '2px dashed #3b82f6' }}></span> Today's Planned Route
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Walking Route (~2.6 km · ~2.5 hrs)</div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem' }}>
                    {[
                      { color: '#ef4444', label: `High-Risk (${HOUSE_PINS.filter(p => p.priority === 'high').length})` },
                      { color: '#f59e0b', label: `Routine (${HOUSE_PINS.filter(p => p.priority === 'routine').length})` },
                      { color: '#10b981', label: `Completed (${HOUSE_PINS.filter(p => p.priority === 'completed').length})` },
                    ].map(l => (
                      <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: l.color, fontWeight: 600 }}>
                        <span style={{ width: '10px', height: '10px', background: l.color, borderRadius: '50%', display: 'inline-block' }}></span>
                        {l.label}
                      </div>
                    ))}
                  </div>
                  <button style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.5rem 0.875rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    🔄 Recalculate Route
                  </button>
                </div>
              </div>

              {/* Today's plan */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                {[
                  { icon: '☀️', label: 'Good Morning, Sunita!', sub: 'Have a safe and productive day.' },
                  { icon: '👟', label: "Today's Plan", sub: '12 Visits · ~2.6 km · ~2.5 hrs' },
                  { icon: '💡', label: 'Tip of the Day', sub: 'स्वच्छता ठेवा, रोग दूर ठेवा.' },
                  { icon: '📞', label: 'Need Help?', sub: 'Call Support' },
                ].map((item, i) => (
                  <div key={i} style={{ flex: 1, background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0.875rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{item.icon}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>{item.label}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.125rem' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB 3: Emergency & Tools ── */}
          {activeSection === 'tools' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* SOS Button */}
              <button
                onClick={() => setSosActive(s => !s)}
                style={{
                  width: '100%', padding: '1.25rem',
                  background: sosActive ? '#dc2626' : '#ef4444',
                  color: 'white', border: 'none', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
                  cursor: 'pointer', boxShadow: sosActive ? '0 0 0 6px rgba(239,68,68,0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '2.5rem' }}>🚑</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.85 }}>{sosActive ? 'AMBULANCE DISPATCHED' : 'ONE-TOUCH'}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>{sosActive ? '📞 Calling...' : 'EMERGENCY SOS'}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85, marginTop: '0.125rem' }}>{sosActive ? 'ETA: 8 minutes · Tap to cancel' : '— DISPATCH AMBULANCE —'}</div>
                </div>
              </button>

              {/* Quick ABHA ID Creation */}
              <div style={{ ...s.card }}>
                <div style={s.sectionHeader}>
                  <span style={{ fontSize: '1.25rem' }}>🪪</span> Quick ABHA ID Creation
                  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/240px-Emblem_of_India.svg.png" alt="NHA" style={{ height: '28px', marginLeft: 'auto', filter: 'brightness(0) invert(1)' }} />
                </div>
                <div style={{ padding: '1rem' }}>
                  {/* Step indicator */}
                  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
                    {ABHA_STEPS.map((step, i) => (
                      <React.Fragment key={step}>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i < abhaStep ? '#0f766e' : '#e2e8f0', color: i < abhaStep ? 'white' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, margin: '0 auto 0.25rem' }}>{i < abhaStep ? '✓' : i + 1}</div>
                          <div style={{ fontSize: '0.6rem', color: i < abhaStep ? '#0f766e' : '#94a3b8', fontWeight: i < abhaStep ? 600 : 400 }}>{step}</div>
                        </div>
                        {i < ABHA_STEPS.length - 1 && <div style={{ alignSelf: 'flex-start', marginTop: '10px', flex: 0.3, height: '2px', background: i < abhaStep - 1 ? '#0f766e' : '#e2e8f0', marginLeft: '-0.25rem', marginRight: '-0.25rem' }}></div>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Fields */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Aadhaar Verification</span>
                      <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, background: '#ecfdf5', padding: '2px 8px', borderRadius: '4px' }}>✔ Verified</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Name</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>Savitri Kale</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Date of Birth</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b' }}>12 / 08 / 1985</span>
                    </div>
                    <button
                      onClick={() => setAbhaStep(ABHA_STEPS.length)}
                      style={{ width: '100%', background: '#0f766e', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', marginTop: '0.25rem' }}
                    >
                      🪪 Create ABHA ID
                    </button>
                  </div>
                </div>
              </div>

              {/* Request Teleconsult */}
              <div style={{ ...s.card }}>
                <div style={{ ...s.sectionHeader, background: '#0ea5e9' }}>
                  <span style={{ fontSize: '1.25rem' }}>📹</span> Request Teleconsult with PHC
                </div>
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <input value={tcForm.patientName} onChange={e => setTcForm(f => ({ ...f, patientName: e.target.value }))} placeholder="Patient Name" style={{ padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
                  <input value={tcForm.condition} onChange={e => setTcForm(f => ({ ...f, condition: e.target.value }))} placeholder="Brief Condition (e.g. Fever, ANC)" style={{ padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem' }} />
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setTcForm(f => ({ ...f, priority: 'routine' }))} style={{ flex: 1, padding: '0.5rem', background: tcForm.priority === 'routine' ? '#f0fdf4' : 'white', color: tcForm.priority === 'routine' ? '#10b981' : '#64748b', border: tcForm.priority === 'routine' ? '1px solid #10b981' : '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>Routine</button>
                    <button onClick={() => setTcForm(f => ({ ...f, priority: 'high' }))} style={{ flex: 1, padding: '0.5rem', background: tcForm.priority === 'high' ? '#fef2f2' : 'white', color: tcForm.priority === 'high' ? '#ef4444' : '#64748b', border: tcForm.priority === 'high' ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer' }}>High Priority</button>
                  </div>
                  <button onClick={requestTeleconsult} disabled={tcStatus === 'loading'} style={{ width: '100%', background: '#0ea5e9', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: tcStatus === 'loading' ? 'not-allowed' : 'pointer', marginTop: '0.25rem' }}>
                    {tcStatus === 'idle' ? 'Send Request' : tcStatus === 'loading' ? 'Sending...' : '✅ Request Sent!'}
                  </button>
                </div>
              </div>

              {/* Health Education Library */}
              <div style={{ ...s.card }}>
                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>Health Education Library (व्हिडिओ)</div>
                  <div style={{ fontSize: '0.75rem', color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}>View All &gt;</div>
                </div>
                <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  {VIDEO_ITEMS.map((video, i) => (
                    <div key={i} style={{ cursor: 'pointer' }}>
                      <div style={{ position: 'relative', height: '90px', background: video.bg, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: '0.375rem' }}>
                        <div style={{ width: '36px', height: '36px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem' }}>▶</div>
                        <div style={{ position: 'absolute', bottom: '4px', right: '6px', background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px' }}>{video.duration}</div>
                      </div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{video.title}</div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>{video.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </Shell>
  );
}
