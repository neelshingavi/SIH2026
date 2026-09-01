'use client';
import React, { useState, useEffect } from 'react';
import Shell from '@/components/Shell';
import { apiGet, apiPost } from '@/lib/api';

const s = {
  card: { background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' } as React.CSSProperties,
  th: { padding: '0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' } as React.CSSProperties,
  td: { padding: '0.75rem', borderBottom: '1px solid #f8fafc', fontSize: '0.8125rem', color: '#1e293b' } as React.CSSProperties,
};

const API = 'http://localhost:3001';
const FACILITY = 'PHC-001';

export default function PharmacyDashboard() {
  const [stock, setStock] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Dispense Form State
  const [showDispense, setShowDispense] = useState(false);
  const [dispenseForm, setDispenseForm] = useState({ drugName: '', quantity: 1, patient: '' });
  
  // Seed State
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchStock = async () => {
    try {
      const data = await apiGet(`/stock?facilityId=${FACILITY}`);
      const arr = Array.isArray(data) ? data : [];
      if (arr.length === 0) {
        // Auto-seed empty pharmacy
        await apiPost(`/stock/seed?facilityId=${FACILITY}`);
        const seeded = await apiGet(`/stock?facilityId=${FACILITY}`);
        setStock(Array.isArray(seeded) ? seeded : []);
      } else {
        setStock(arr);
      }
    } catch (e) {
      console.error('Failed to fetch stock', e);
      setStock([]);
    }
  };

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    await apiPost(`/stock/seed?facilityId=${FACILITY}`);
    await fetchStock();
    setIsSeeding(false);
  };

  const handleDispense = async () => {
    if (!dispenseForm.drugName || dispenseForm.quantity < 1) return;
    try {
      await apiPost('/stock/movement', {
        facilityId: FACILITY,
        drugName: dispenseForm.drugName,
        type: 'DISPENSED',
        quantity: dispenseForm.quantity
      });
      setShowDispense(false);
      fetchStock();
    } catch (e) {
      alert('Failed to dispense stock. Check if quantity is available.');
    }
  };

  const lowStockCount = stock.filter(s => s.currentQty < 50).length;
  const filteredStock = stock.filter(s => s.drugName.toLowerCase().includes(search.toLowerCase()));

  return (
    <Shell
      title="PHC Pharmacist Workstation (eLMIS)"
      subtitle="Dharampur PHC"
      user="Ramesh Patel"
      role="Pharmacist"
      facility="Dharampur PHC (PHC-001)"
      district="District: Solapur, Maharashtra"
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>
        
        {/* KPI Row */}
        <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
          <div style={{ ...s.card, flex: 1, padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total SKUs</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{stock.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Low Stock Alerts</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: lowStockCount > 0 ? '#ef4444' : '#10b981' }}>{lowStockCount}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleSeed}
                disabled={isSeeding || stock.length > 0}
                style={{ background: stock.length > 0 ? '#f1f5f9' : '#1e293b', color: stock.length > 0 ? '#cbd5e1' : 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: stock.length > 0 ? 'default' : 'pointer' }}
              >
                {isSeeding ? 'Initializing...' : stock.length > 0 ? 'Inventory Seeded' : 'Initialize Inventory (Seed)'}
              </button>
              <button 
                onClick={() => setShowDispense(true)}
                style={{ background: '#0ea5e9', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                + Dispense Medicine
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Ledger */}
        <div style={{ ...s.card, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>Live Stock Ledger</div>
            <input 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search medications..." 
              style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.75rem' }} 
            />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={s.th}>Drug Name</th>
                  <th style={s.th}>Unit</th>
                  <th style={s.th}>Available Qty</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map(item => (
                  <tr key={item.id} style={{ background: item.currentQty < 50 ? '#fef2f2' : 'white' }}>
                    <td style={{ ...s.td, fontWeight: 500 }}>{item.drugName}</td>
                    <td style={s.td}>{item.unit}</td>
                    <td style={{ ...s.td, fontWeight: 700, color: item.currentQty < 50 ? '#ef4444' : '#1e293b' }}>{item.currentQty}</td>
                    <td style={s.td}>
                      {item.currentQty < 50 ? (
                        <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600 }}>LOW STOCK</span>
                      ) : (
                        <span style={{ background: '#dcfce3', color: '#16a34a', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600 }}>ADEQUATE</span>
                      )}
                    </td>
                    <td style={s.td}>
                      <button 
                        onClick={() => {
                          setDispenseForm({ drugName: item.drugName, quantity: 1, patient: '' });
                          setShowDispense(true);
                        }}
                        style={{ border: '1px solid #cbd5e1', background: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer', color: '#64748b', fontWeight: 600 }}
                      >
                        Dispense
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No stock items found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {showDispense && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '380px', background: 'white', borderRadius: '12px', padding: '1.5rem', animation: 'fadeIn 0.2s' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>Dispense Medication</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Select Medication</label>
                <select 
                  value={dispenseForm.drugName} 
                  onChange={e => setDispenseForm(f => ({...f, drugName: e.target.value}))} 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="">-- Select Drug --</option>
                  {stock.map(s => <option key={s.id} value={s.drugName}>{s.drugName} (Avail: {s.currentQty})</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Quantity to Dispense</label>
                <input 
                  type="number" 
                  min="1"
                  value={dispenseForm.quantity} 
                  onChange={e => setDispenseForm(f => ({...f, quantity: parseInt(e.target.value) || 1}))} 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem' }}>Patient Name (Optional)</label>
                <input 
                  value={dispenseForm.patient} 
                  onChange={e => setDispenseForm(f => ({...f, patient: e.target.value}))} 
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }} 
                  placeholder="e.g. Ramesh Patil"
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowDispense(false)} style={{ flex: 1, padding: '0.5rem', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontWeight: 600, color: '#64748b', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleDispense} style={{ flex: 1, padding: '0.5rem', background: '#0ea5e9', border: 'none', borderRadius: '6px', fontWeight: 600, color: 'white', cursor: 'pointer' }}>Confirm Dispense</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
