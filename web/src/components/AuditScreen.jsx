import React, { useState, useEffect } from 'react';
import { 
  ReceiptText, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  Wallet,
  Clock,
  Search
} from 'lucide-react';
import SearchablePatientSelect from './SearchablePatientSelect';

export default function AuditScreen({ selectedActor, demoActors = [], onSelectActor }) {
  const [patient, setPatient] = useState(selectedActor || null);
  const [logs, setLogs] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedActor) {
      setPatient(selectedActor);
    }
  }, [selectedActor]);

  useEffect(() => {
    if (patient) {
      fetchAuditTrail();
    }
  }, [patient, startDate, endDate]);

  function handlePatientSelect(newPatient) {
    setPatient(newPatient);
    if (onSelectActor) onSelectActor(newPatient);
  }

  async function fetchAuditTrail() {
    if (!patient) return;
    setLoading(true);
    setError(null);

    try {
      let url = `/api/audit/${patient.id}`;
      const params = [];
      if (startDate) params.push(`startDate=${encodeURIComponent(startDate)}`);
      if (endDate) params.push(`endDate=${encodeURIComponent(endDate)}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const json = await res.json();
      setLogs(json.logs || []);
    } catch (err) {
      setError('Failed to fetch audit log: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ReceiptText size={18} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>HSA Wallet Audit Trail</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Search any patient across all 2,000+ accounts in PostgreSQL to inspect their immutable financial ledger populated by trigger <code style={{ color: '#38bdf8' }}>trg_wallet_audit</code>.
        </p>
      </div>

      {/* Patient Search Selector & Date Filters Bar */}
      <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Searchable Patient Input */}
        <div style={{ maxWidth: 540 }}>
          <SearchablePatientSelect
            selectedPatient={patient}
            onSelectPatient={handlePatientSelect}
            demoActors={demoActors}
            label="Search Patient by Name or UUID"
          />
        </div>

        {/* Date Filters & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <Filter size={16} /> Date Filter:
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-control"
              style={{ width: 'auto' }}
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
            >
              Clear Filters
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--text-dim)' }}>
            Total Logged Transactions: <strong>{logs.length}</strong>
          </div>
        </div>

      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div className="pulse-dot" style={{ margin: '0 auto 12px auto' }}></div>
            Retrieving immutable audit records...
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f43f5e' }}>{error}</div>
        ) : !patient ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
            Use the search bar above to select a patient and view their ledger history.
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
            No audit records found for {patient.name} in the selected date range.
          </div>
        ) : (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Logged Timestamp</th>
                  <th>Action Type</th>
                  <th>Amount Changed</th>
                  <th>Balance After Transaction</th>
                  <th>Audit Log ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const isCredit = log.action_type === 'CREDIT';
                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8125rem', color: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} color="var(--text-dim)" />
                          {new Date(log.logged_at).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isCredit ? 'badge-credit' : 'badge-debit'}`}>
                          {isCredit ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {log.action_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: isCredit ? '#34d399' : '#f43f5e' }}>
                        {isCredit ? '+' : ''}${parseFloat(log.amount_changed).toFixed(2)}
                      </td>
                      <td style={{ fontWeight: 700, color: '#ffffff' }}>
                        ${parseFloat(log.balance_after).toFixed(2)}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {log.id}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
