import React, { useState, useEffect } from 'react';
import { 
  CalendarPlus, 
  Wallet, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Coins, 
  Sparkles,
  Info
} from 'lucide-react';
import SearchablePatientSelect from './SearchablePatientSelect';
import SearchableClinicSelect from './SearchableClinicSelect';

export default function TransactionScreen({ 
  selectedActor, 
  onSelectActor,
  demoActors = [],
  onTransactionComplete 
}) {
  const [patient, setPatient] = useState(selectedActor || null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [copayAmount, setCopayAmount] = useState('50.00');
  
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Sync with global actor selection if updated externally
  useEffect(() => {
    if (selectedActor) {
      setPatient(selectedActor);
    }
  }, [selectedActor]);

  function handlePatientChange(newPatient) {
    setPatient(newPatient);
    if (onSelectActor) onSelectActor(newPatient);
    setError(null);
    setResult(null);
  }

  async function handleBookAppointment(e) {
    e.preventDefault();
    if (!patient) {
      setError({ message: 'Please search and select a patient.' });
      return;
    }
    if (!selectedClinic) {
      setError({ message: 'Please search and select a destination clinic.' });
      return;
    }

    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          clinicId: selectedClinic.id,
          copayAmount: parseFloat(copayAmount),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json);
      } else {
        setResult(json);
        const updated = { ...patient, hsa_balance: json.patient.balanceAfter.toFixed(2) };
        setPatient(updated);
        if (onTransactionComplete) {
          onTransactionComplete(json.patient.balanceAfter);
        }
      }
    } catch (err) {
      setError({ error: 'Network error: ' + err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const currentBalance = patient ? parseFloat(patient.hsa_balance) : 0;
  const copayNum = parseFloat(copayAmount) || 0;
  const projectedBalance = Math.max(0, currentBalance - copayNum);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1040, margin: '0 auto' }}>
      
      {/* Title & Context */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarPlus size={18} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Workflow 1: Atomic Appointment Booking</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
          Search any patient and clinic across the database to execute PostgreSQL stored procedure <code style={{ color: '#38bdf8' }}>book_appointment</code> in an atomic transaction.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
        
        {/* Booking Form Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#38bdf8" /> New Consultation Request
          </h3>

          <form onSubmit={handleBookAppointment}>
            
            {/* Searchable Patient Field */}
            <SearchablePatientSelect
              selectedPatient={patient}
              onSelectPatient={handlePatientChange}
              demoActors={demoActors}
              label="Patient (Search by Name or UUID)"
            />

            {/* Searchable Clinic Field */}
            <SearchableClinicSelect
              selectedClinic={selectedClinic}
              onSelectClinic={setSelectedClinic}
              label="Clinic (Search by Name or Location)"
              onlyActive={true}
              autoSelectFirst={true}
            />

            {/* Copay Amount */}
            <div className="form-group">
              <label className="form-label">Copay Amount ($ USD)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: 11, color: 'var(--text-dim)', fontWeight: 600 }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1.00"
                  max="1000.00"
                  value={copayAmount}
                  onChange={(e) => setCopayAmount(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: 28 }}
                  required
                />
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting || !patient || !selectedClinic}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 12, padding: '12px 20px', fontSize: '0.9375rem' }}
            >
              {submitting ? 'Executing Stored Procedure...' : 'Confirm & Book Appointment'}
            </button>
          </form>
        </div>

        {/* Balance Preview & Real-Time Financial Impact Card */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={18} color="#34d399" /> HSA Financial Ledger Impact
            </h3>

            {/* Before & After Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>HSA Balance Before</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: currentBalance >= copayNum ? '#ffffff' : '#f43f5e', marginTop: 4 }}>
                  ${currentBalance.toFixed(2)}
                </div>
              </div>

              <div style={{ padding: '16px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Projected After</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8', marginTop: 4 }}>
                  ${projectedBalance.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Technical Database Notes */}
            <div style={{ padding: 14, borderRadius: 8, background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#38bdf8', marginBottom: 6 }}>
                <Info size={14} /> Database Enforcements in Play:
              </div>
              <ul style={{ paddingLeft: 18, lineHeight: 1.6 }}>
                <li><strong>SELECT FOR UPDATE</strong> locks the patient row against race conditions.</li>
                <li><strong>idx_active_consult</strong> partial index blocks concurrent WAITING or IN_CONSULTATION visits.</li>
                <li><strong>trg_wallet_audit</strong> trigger writes directly to wallet_audit_logs on deduction.</li>
              </ul>
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 20, textAlign: 'center' }}>
            ACID Guaranteed via PL/pgSQL Atomic Procedure
          </div>
        </div>

      </div>

      {/* ERROR DISPLAY (Demonstrating DB Rejection Paths) */}
      {error && (
        <div className="glass-panel" style={{ padding: 20, borderColor: 'rgba(244, 63, 94, 0.4)', background: 'rgba(244, 63, 94, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <AlertCircle size={24} color="#f43f5e" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fb7185', margin: 0 }}>
                {error.error || 'Transaction Rejected'}
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: '6px 0 0 0' }}>
                {error.details || error.message}
              </p>
              {error.code && (
                <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px', borderRadius: 4, background: 'rgba(244, 63, 94, 0.2)', fontSize: '0.75rem', fontFamily: 'monospace', color: '#fda4af' }}>
                  REJECTION_CODE: {error.code}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS DISPLAY & PROOF OF TRIGGER FIRING */}
      {result && (
        <div className="glass-panel" style={{ padding: 24, borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
            <CheckCircle2 size={24} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#34d399', margin: 0 }}>
                {result.message}
              </h4>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', margin: '4px 0 0 0' }}>
                HSA Balance deducted from <strong>${result.patient.balanceBefore.toFixed(2)}</strong> to <strong>${result.patient.balanceAfter.toFixed(2)}</strong> (-${result.patient.deducted.toFixed(2)}).
              </p>
            </div>
          </div>

          {/* Trigger Audit Log Proof Box */}
          <div style={{ padding: 16, borderRadius: 10, background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', fontWeight: 600, color: '#34d399' }}>
                <ShieldCheck size={18} /> Proof of Trigger Execution (wallet_audit_logs)
              </div>
              <span className="badge badge-discharged">TRIGGER trg_wallet_audit FIRED</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: '0.8125rem' }}>
              <div>
                <div style={{ color: 'var(--text-dim)' }}>Audit Entry ID:</div>
                <div style={{ fontFamily: 'monospace', color: '#ffffff' }}>{result.auditLogProof.id}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)' }}>Action Type:</div>
                <div><span className="badge badge-debit">{result.auditLogProof.action_type}</span></div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)' }}>Amount Changed:</div>
                <div style={{ fontWeight: 700, color: '#f43f5e' }}>${parseFloat(result.auditLogProof.amount_changed).toFixed(2)}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-dim)' }}>Balance After:</div>
                <div style={{ fontWeight: 700, color: '#34d399' }}>${parseFloat(result.auditLogProof.balance_after).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
