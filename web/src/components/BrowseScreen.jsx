import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  CalendarClock, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ArrowRightCircle, 
  Eye, 
  X,
  Filter
} from 'lucide-react';

export default function BrowseScreen({ onSelectPatientForBooking, onStatusUpdated }) {
  const [subTab, setSubTab] = useState('patients'); // 'patients', 'clinics', 'appointments'
  
  // Data state
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clinicAcceptingFilter, setClinicAcceptingFilter] = useState('');

  // Selected item for modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Fetch data on tab or filter change
  useEffect(() => {
    fetchData(pagination.page);
  }, [subTab, pagination.page, statusFilter, clinicAcceptingFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function fetchData(targetPage = 1) {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (subTab === 'patients') {
        endpoint = `/api/patients?page=${targetPage}&limit=15&search=${encodeURIComponent(search)}`;
      } else if (subTab === 'clinics') {
        const accParam = clinicAcceptingFilter ? `&accepting=${clinicAcceptingFilter}` : '';
        endpoint = `/api/clinics?page=${targetPage}&limit=15&search=${encodeURIComponent(search)}${accParam}`;
      } else if (subTab === 'appointments') {
        const statParam = statusFilter ? `&status=${statusFilter}` : '';
        const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
        endpoint = `/api/appointments?page=${targetPage}&limit=15${statParam}${searchParam}`;
      }

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();

      if (subTab === 'patients') {
        setData(json.patients || []);
      } else if (subTab === 'clinics') {
        setData(json.clinics || []);
      } else if (subTab === 'appointments') {
        setData(json.appointments || []);
      }

      if (json.pagination) {
        setPagination(json.pagination);
      }
    } catch (err) {
      setError('Failed to fetch data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  // Appointment Status Transition (WAITING -> IN_CONSULTATION -> DISCHARGED)
  async function updateAppointmentStatus(apptId, newStatus) {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update status');

      setActionMessage({ type: 'success', text: `Appointment advanced to ${newStatus}!` });
      fetchData(pagination.page);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header & Sub-Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Entity Browser</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Safely browse 100k+ records using server-side pagination (PostgreSQL limit/offset queries).
          </p>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.8)', padding: 4, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
          {[
            { id: 'patients', label: 'Patients (2,000+)', icon: Users },
            { id: 'clinics', label: 'Clinics (25)', icon: Building2 },
            { id: 'appointments', label: 'Appointments (50,000+)', icon: CalendarClock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setSubTab(tab.id);
                  setData([]); // Clear stale data immediately so rows from prior tab are not mapped
                  setSearch('');
                  setStatusFilter('');
                  setClinicAcceptingFilter('');
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: isSelected ? 'var(--primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  fontWeight: isSelected ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
          border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
          color: actionMessage.type === 'success' ? '#34d399' : '#fb7185',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
            <input
              type="text"
              placeholder={
                subTab === 'appointments'
                  ? 'Search by patient, clinic, or ID...'
                  : `Search ${subTab} by name or UUID...`
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control"
              style={{ paddingLeft: 36 }}
            />
          </div>

          {/* Conditional Filters */}
          {subTab === 'clinics' && (
            <select
              value={clinicAcceptingFilter}
              onChange={(e) => {
                setClinicAcceptingFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="form-control"
              style={{ width: 'auto', minWidth: 180 }}
            >
              <option value="">All Operating Statuses</option>
              <option value="true">Accepting Patients Only</option>
              <option value="false">Closed / Paused Only</option>
            </select>
          )}

          {subTab === 'appointments' && (
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="form-control"
              style={{ width: 'auto', minWidth: 190 }}
            >
              <option value="">All Consultation Statuses</option>
              <option value="WAITING">WAITING (In Queue)</option>
              <option value="IN_CONSULTATION">IN_CONSULTATION (Active)</option>
              <option value="DISCHARGED">DISCHARGED (Completed)</option>
            </select>
          )}
        </div>

        {/* Record Count Badge */}
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
          Showing <strong>{data.length}</strong> of <strong>{pagination.total.toLocaleString()}</strong> records
        </div>
      </div>

      {/* Main Table View */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 12px auto' }}></div>
            Loading {subTab} from PostgreSQL...
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f43f5e' }}>{error}</div>
        ) : data.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
            No {subTab} found matching your query.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                {subTab === 'patients' && (
                  <tr>
                    <th>Patient Name</th>
                    <th>Patient ID</th>
                    <th>HSA Balance</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                )}
                {subTab === 'clinics' && (
                  <tr>
                    <th>Clinic Name</th>
                    <th>Operating Status</th>
                    <th>Geographic Coordinates</th>
                    <th>Clinic ID</th>
                  </tr>
                )}
                {subTab === 'appointments' && (
                  <tr>
                    <th>Patient Name</th>
                    <th>Clinic</th>
                    <th>Copay Amount</th>
                    <th>Status Lifecycle</th>
                    <th>Created At</th>
                    <th style={{ textAlign: 'right' }}>Lifecycle Transition</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {/* 1. PATIENTS ROWS */}
                {subTab === 'patients' &&
                  data.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{p.id}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: (parseFloat(p?.hsa_balance) || 0) >= 50 ? '#34d399' : '#f59e0b' }}>
                          ${p?.hsa_balance != null ? parseFloat(p.hsa_balance).toFixed(2) : '0.00'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            if (onSelectPatientForBooking) onSelectPatientForBooking(p);
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                        >
                          Book Appointment &rarr;
                        </button>
                      </td>
                    </tr>
                  ))}

                {/* 2. CLINICS ROWS */}
                {subTab === 'clinics' &&
                  data.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>
                        {c.is_accepting_patients ? (
                          <span className="badge badge-discharged">Accepting Patients</span>
                        ) : (
                          <span className="badge badge-debit">Closed</span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        Lat: {c?.latitude != null ? Number(c.latitude).toFixed(4) : '—'}, Lng: {c?.longitude != null ? Number(c.longitude).toFixed(4) : '—'}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>{c.id}</td>
                    </tr>
                  ))}

                {/* 3. APPOINTMENTS ROWS */}
                {subTab === 'appointments' &&
                  data.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.patient_name || '—'}</td>
                      <td>{a.clinic_name || '—'}</td>
                      <td style={{ fontWeight: 700 }}>${a?.copay_amount != null ? parseFloat(a.copay_amount).toFixed(2) : '0.00'}</td>
                      <td>
                        {a.status === 'WAITING' && <span className="badge badge-waiting">WAITING</span>}
                        {a.status === 'IN_CONSULTATION' && <span className="badge badge-in-consult">IN CONSULTATION</span>}
                        {a.status === 'DISCHARGED' && <span className="badge badge-discharged">DISCHARGED</span>}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
                        {new Date(a.created_at).toLocaleDateString()} {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          {a.status === 'WAITING' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => updateAppointmentStatus(a.id, 'IN_CONSULTATION')}
                              className="btn btn-primary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Transition status to IN_CONSULTATION"
                            >
                              Start Consult
                            </button>
                          )}
                          {a.status === 'IN_CONSULTATION' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => updateAppointmentStatus(a.id, 'DISCHARGED')}
                              className="btn btn-emerald"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Discharge patient (frees active consultation lock & counts in materialized view)"
                            >
                              Discharge Patient
                            </button>
                          )}
                          {a.status === 'DISCHARGED' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
            Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="btn btn-secondary"
              style={{ padding: '6px 12px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
