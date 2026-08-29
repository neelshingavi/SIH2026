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
  encounterType: string;
}

interface HousePin {
  top: string;
  left: string;
  priority: TaskPriority;
  label: string;
  visited: boolean;
}

// ── Mock Data ──────────────────────────────────────────────────────────────
const INITIAL_TASKS: Task[] = [];

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
  
  const fetchTasks = async () => {
    try {
      const res = await fetch(`${API}/sync/tasks`);
      const data = await res.json();
      const formatted = data.map((t: any) => ({
        id: t.id,
        category: t.title,
        categoryColor: t.risk === 'high' ? '#ef4444' : t.risk === 'medium' ? '#d97706' : '#059669',
        badge: t.risk.toUpperCase(),
        badgeColor: t.risk === 'high' ? '#ef4444' : t.risk === 'medium' ? '#f59e0b' : '#10b981',
        patient: t.patient,
        details: 'Sync Task',
        location: t.location,
        buttonLabel: t.risk === 'low' ? 'Mark Visited' : 'Record Vitals',
        buttonColor: t.risk === 'high' ? '#ef4444' : t.risk === 'medium' ? '#f59e0b' : '#10b981',
        completed: false,
        encounterType: t.type === 'anc' ? 'ANC' : t.type === 'ncd' ? 'General' : 'Immunization'
      }));
      setTasks(formatted);
    } catch (e) {
      console.error(e);
    }
  };

  React.useEffect(() => {
    fetchTasks();
  }, []);
  const [abhaStep, setAbhaStep] = useState(1);
  const [sosActive, setSosActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'tasks' | 'map' | 'tools'>('tasks');
  
  // Triage state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [vitals, setVitals] = useState({ spo2: '', sys: '', dia: '' });
  const [triageResult, setTriageResult] = useState<any>(null);
  const [triageLoading, setTriageLoading] = useState(false);

  // ABHA State
  const [abhaAadhaar, setAbhaAadhaar] = useState('');
  const [abhaOtp, setAbhaOtp] = useState('');
  const [abhaGeneratedId, setAbhaGeneratedId] = useState('');
  const [abhaLoading, setAbhaLoading] = useState(false);

  const [tcForm, setTcForm] = useState({ patientName: '', condition: '', priority: 'routine' });
  const [tcStatus, setTcStatus] = useState<'idle'|'loading'|'success'>('idle');

  const markDone = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  const requestTeleconsult = async (prefilledName?: string, prefilledCondition?: string, prefilledPriority?: string) => {
    const pName = prefilledName || tcForm.patientName;
    if (!pName) return;
    setTcStatus('loading');
    try {
      await fetch(`${API}/teleconsult/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hubFacilityId: 'PHC-001',
          spokeFacilityId: 'Khed Sub-Centre',
          patientName: pName,
          condition: prefilledCondition || tcForm.condition,
          priority: prefilledPriority || tcForm.priority,
        })
      });
      setTcStatus('success');
      setTcForm({ patientName: '', condition: '', priority: 'routine' });
      setTimeout(() => setTcStatus('idle'), 3000);
    } catch {
      setTcStatus('idle');
    }
  };

  const evaluateTriage = async () => {
    if (!selectedTask) return;
    setTriageLoading(true);
    try {
      const res = await fetch(`${API}/triage/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedTask.id,
          encounterType: selectedTask.encounterType,
          observations: [
            { code: 'spo2', value: Number(vitals.spo2) || 98 },
            { code: 'bp.systolic', value: Number(vitals.sys) || 120 },
            { code: 'bp.diastolic', value: Number(vitals.dia) || 80 },
          ]
        })
      });
      const data = await res.json();
      setTriageResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleTaskAction = (task: Task) => {
    if (task.buttonLabel === 'Record Vitals') {
      setSelectedTask(task);
      setVitals({ spo2: '', sys: '', dia: '' });
      setTriageResult(null);
    } else {
      markDone(task.id);
    }
  };

  const handleEscalate = async () => {
    if (!selectedTask || !triageResult) return;
    const cond = triageResult.flags.length > 0 ? triageResult.flags.join(', ') : 'High Risk Triage';
    await requestTeleconsult(selectedTask.patient, cond, triageResult.riskBand === 'EMERGENCY' ? 'high' : 'routine');
    markDone(selectedTask.id);
    setSelectedTask(null);
  };

  const generateAbha = async () => {
    setAbhaLoading(true);
    try {
      const res = await fetch(`${API}/abdm-mock/abha/create`, { method: 'POST' });
      const data = await res.json();
      setAbhaGeneratedId(data.abhaId);
      setAbhaStep(5); // Success step
    } catch (e) {
      console.error(e);
    } finally {
      setAbhaLoading(false);
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
              <button onClick={fetchTasks} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', cursor: 'pointer', marginTop: '0.25rem' }}>Sync Now</button>
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
                        onClick={() => handleTaskAction(task)}
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
                    {abhaStep === 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.3s' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>Enter 12-Digit Aadhaar Number</div>
                        <input value={abhaAadhaar} onChange={e => setAbhaAadhaar(e.target.value)} placeholder="XXXX XXXX XXXX" style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', letterSpacing: '2px', textAlign: 'center' }} />
                        <button onClick={() => setAbhaStep(2)} disabled={abhaAadhaar.length < 12} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 700, cursor: abhaAadhaar.length < 12 ? 'not-allowed' : 'pointer', opacity: abhaAadhaar.length < 12 ? 0.5 : 1 }}>Request OTP</button>
                      </div>
                    )}

                    {abhaStep === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.3s' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e293b' }}>Enter 6-Digit OTP Sent to Mobile</div>
                        <input value={abhaOtp} onChange={e => setAbhaOtp(e.target.value)} placeholder="000000" style={{ padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1.25rem', letterSpacing: '8px', textAlign: 'center' }} />
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setAbhaStep(1)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                          <button onClick={() => setAbhaStep(3)} disabled={abhaOtp.length < 6} style={{ flex: 2, background: '#0f766e', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 700, cursor: abhaOtp.length < 6 ? 'not-allowed' : 'pointer', opacity: abhaOtp.length < 6 ? 0.5 : 1 }}>Verify OTP</button>
                        </div>
                      </div>
                    )}

                    {abhaStep === 3 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', animation: 'fadeIn 0.3s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Aadhaar KYC</span>
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
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                          <button onClick={() => setAbhaStep(2)} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                          <button onClick={() => setAbhaStep(4)} style={{ flex: 2, background: '#0f766e', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Confirm Details</button>
                        </div>
                      </div>
                    )}

                    {abhaStep === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s', textAlign: 'center', padding: '1rem' }}>
                        <div style={{ fontSize: '2rem' }}>🎉</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>Ready to Generate ABHA ID</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Consent successfully recorded. Tap below to create the unique 14-digit Ayushman Bharat Health Account.</div>
                        <button
                          onClick={generateAbha}
                          disabled={abhaLoading}
                          style={{ width: '100%', background: '#0ea5e9', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: abhaLoading ? 'not-allowed' : 'pointer' }}
                        >
                          {abhaLoading ? 'Creating...' : '🪪 Create ABHA ID'}
                        </button>
                      </div>
                    )}

                    {abhaStep === 5 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s' }}>
                        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #3b82f6)', borderRadius: '12px', padding: '1.25rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: 0.1 }}>🪪</div>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '0.25rem', opacity: 0.9 }}>Ayushman Bharat Health Account</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Savitri Kale</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <div>
                              <div style={{ fontSize: '0.65rem', opacity: 0.8, marginBottom: '0.125rem' }}>ABHA Number</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '1px' }}>{abhaGeneratedId}</div>
                            </div>
                            <div style={{ background: 'white', padding: '4px', borderRadius: '4px' }}>
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=50x50&data=ABHA:1234" alt="QR" style={{ width: '40px', height: '40px' }} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => { setAbhaStep(1); setAbhaAadhaar(''); setAbhaOtp(''); setAbhaGeneratedId(''); }} style={{ flex: 1, background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Start Over</button>
                          <button onClick={() => alert('ABHA Number Copied!')} style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Copy ID</button>
                        </div>
                      </div>
                    )}
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

      {/* Triage CDSS Modal */}
      {selectedTask && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: 'white', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', padding: '1.25rem', paddingBottom: '2.5rem', animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>Record Vitals (CDSS)</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Patient: {selectedTask.patient}</div>
              </div>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            {!triageResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>SpO₂ (%)</label>
                    <input type="number" value={vitals.spo2} onChange={e => setVitals(v => ({ ...v, spo2: e.target.value }))} placeholder="e.g. 98" style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>BP (Sys / Dia)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <input type="number" value={vitals.sys} onChange={e => setVitals(v => ({ ...v, sys: e.target.value }))} placeholder="120" style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                      <span style={{ color: '#94a3b8' }}>/</span>
                      <input type="number" value={vitals.dia} onChange={e => setVitals(v => ({ ...v, dia: e.target.value }))} placeholder="80" style={{ width: '100%', padding: '0.625rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={evaluateTriage} 
                  disabled={triageLoading}
                  style={{ width: '100%', background: '#0ea5e9', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: triageLoading ? 'not-allowed' : 'pointer' }}
                >
                  {triageLoading ? 'Evaluating AI...' : 'Submit to AI Triage'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '8px', background: triageResult.riskBand === 'EMERGENCY' ? '#fef2f2' : triageResult.riskBand === 'HIGH_RISK' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${triageResult.riskBand === 'EMERGENCY' ? '#fca5a5' : triageResult.riskBand === 'HIGH_RISK' ? '#fde68a' : '#86efac'}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.25rem' }}>{triageResult.riskBand === 'EMERGENCY' ? '🚨' : triageResult.riskBand === 'HIGH_RISK' ? '⚠️' : '✅'}</span>
                    <span style={{ fontWeight: 700, color: triageResult.riskBand === 'EMERGENCY' ? '#dc2626' : triageResult.riskBand === 'HIGH_RISK' ? '#d97706' : '#16a34a' }}>
                      {triageResult.riskBand.replace('_', ' ')}
                    </span>
                  </div>
                  {triageResult.flags.length > 0 && (
                    <ul style={{ margin: '0 0 0.5rem 1.25rem', padding: 0, fontSize: '0.8rem', color: '#1e293b' }}>
                      {triageResult.flags.map((f: string, i: number) => <li key={i}>{f}</li>)}
                    </ul>
                  )}
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Action: {triageResult.recommendedAction.replace(/_/g, ' ')}</div>
                </div>

                {triageResult.riskBand !== 'NORMAL' ? (
                  <button 
                    onClick={handleEscalate}
                    style={{ width: '100%', background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <span>🚑</span> Escalate to MO (Live Consult)
                  </button>
                ) : (
                  <button 
                    onClick={() => { markDone(selectedTask.id); setSelectedTask(null); }}
                    style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer' }}
                  >
                    Mark Task Complete
                  </button>
                )}
              </div>
            )}
          </div>
          <style>{`
            @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </Shell>
  );
}
