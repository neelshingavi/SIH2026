'use client';
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const API = 'http://localhost:3001';
const FACILITY = 'PHC-001';

type QueueEntry = {
  id: string;
  token: number;
  patientName: string;
  status: 'WAITING' | 'CALLED' | 'IN_CONSULT' | 'DONE';
  createdAt: string;
};

export default function PatientQueueDisplay() {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Clock
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })), 1000);
    
    // Fetch initial
    const loadQueue = async () => {
      try {
        const res = await fetch(`${API}/queue?facilityId=${FACILITY}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          if (data.length === 0) {
            // Auto seed if empty for demo
            await fetch(`${API}/queue/seed?facilityId=${FACILITY}`, { method: 'POST' });
            const seededRes = await fetch(`${API}/queue?facilityId=${FACILITY}`);
            if (seededRes.ok) {
              const seededData = await seededRes.json();
              if (Array.isArray(seededData)) setQueue(seededData);
            }
          } else {
            setQueue(data);
          }
        } else {
          setQueue([]);
        }
      } catch (e) {
        console.error('Queue fetch error:', e);
        setQueue([]);
      }
    };
    loadQueue();

    // Live Socket
    const socket = io(`${API}/queue`, { transports: ['websocket'] });
    socket.on('connect', () => socket.emit('joinFacility', FACILITY));
    
    socket.on('entryUpdated', (updated: QueueEntry) => {
      setQueue(prev => Array.isArray(prev) ? prev.map(e => e.id === updated.id ? updated : e) : [updated]);
    });
    
    socket.on('entryAdded', (entry: QueueEntry) => {
      setQueue(prev => Array.isArray(prev) ? [...prev, entry] : [entry]);
    });

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  const safeQueue = Array.isArray(queue) ? queue : [];
  const currentlyServing = safeQueue.filter(e => e.status === 'CALLED' || e.status === 'IN_CONSULT');
  const waiting = safeQueue.filter(e => e.status === 'WAITING').slice(0, 10); // show next 10

  return (
    <div style={{ height: '100vh', width: '100vw', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ padding: '2rem 3rem', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #334155' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Emblem_of_India.svg/240px-Emblem_of_India.svg.png" alt="Gov" style={{ height: '64px', filter: 'brightness(0) invert(1)' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>OPD Live Token Status</h1>
            <div style={{ fontSize: '1.25rem', color: '#94a3b8', marginTop: '0.25rem' }}>PHC Dharampur • Room 104</div>
          </div>
        </div>
        <div style={{ fontSize: '3.5rem', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '-2px', color: '#38bdf8' }}>
          {currentTime}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left: Currently Serving */}
        <div style={{ flex: 1, padding: '3rem', borderRight: '2px solid #334155', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2rem' }}>Currently Serving</div>
          
          {currentlyServing.length > 0 ? (
            currentlyServing.map(s => (
              <div key={s.id} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '4rem', borderRadius: '24px', textAlign: 'center', boxShadow: '0 20px 40px rgba(16, 185, 129, 0.2)', width: '80%', marginBottom: '2rem', animation: 'pulse 2s infinite' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>TOKEN NUMBER</div>
                <div style={{ fontSize: '12rem', fontWeight: 900, lineHeight: 1, margin: '1rem 0' }}>{s.token}</div>
                <div style={{ fontSize: '3rem', fontWeight: 700 }}>{s.patientName}</div>
              </div>
            ))
          ) : (
            <div style={{ opacity: 0.5, textAlign: 'center' }}>
              <div style={{ fontSize: '6rem' }}>☕</div>
              <div style={{ fontSize: '2rem', marginTop: '1rem' }}>Doctor is currently free</div>
            </div>
          )}
        </div>

        {/* Right: Up Next */}
        <div style={{ width: '40%', padding: '3rem', background: '#1e293b' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '2rem' }}>Please Wait (Up Next)</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {waiting.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#334155', padding: '1.5rem 2rem', borderRadius: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ width: '64px', height: '64px', background: '#475569', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                    {w.token}
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 600 }}>{w.patientName.replace(/ .*/, '')} {w.patientName.split(' ')[1]?.[0] || ''}*</div>
                </div>
                <div style={{ fontSize: '1.5rem', color: '#cbd5e1', fontWeight: 500 }}>
                  ~ {Math.max(5, (i + 1) * 5)} min
                </div>
              </div>
            ))}
            
            {waiting.length === 0 && (
              <div style={{ fontSize: '1.5rem', color: '#64748b', textAlign: 'center', marginTop: '4rem' }}>
                Queue is empty.
              </div>
            )}
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 40px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />
    </div>
  );
}
