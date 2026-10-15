import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Wallet, Check, X, Loader2, Sparkles, ChevronDown } from 'lucide-react';

export default function SearchablePatientSelect({
  selectedPatient,
  onSelectPatient,
  demoActors = [],
  label = 'Select Patient',
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [defaultPatients, setDefaultPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial sample patients from API on load
  useEffect(() => {
    async function loadDefaults() {
      try {
        const res = await fetch('/api/patients?limit=6');
        const json = await res.json();
        setDefaultPatients(json.patients || []);
      } catch (err) {
        console.error('Failed to load default patients:', err);
      }
    }
    loadDefaults();
  }, []);

  // Debounced search querying the API
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm.trim())}&limit=10`);
        const json = await res.json();
        setResults(json.patients || []);
      } catch (err) {
        console.error('Failed to search patients:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  function handleSelect(patient) {
    onSelectPatient(patient);
    setSearchTerm('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="form-group" style={{ position: 'relative' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {selectedPatient && (
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
            HSA: ${parseFloat(selectedPatient.hsa_balance).toFixed(2)}
          </span>
        )}
      </label>

      {/* Selected Patient Card Display */}
      {selectedPatient && !isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={16} color="#38bdf8" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9375rem' }}>
                {selectedPatient.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                UUID: {selectedPatient.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-discharged">
              ${parseFloat(selectedPatient.hsa_balance).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              Change <ChevronDown size={14} />
            </span>
          </div>
        </div>
      ) : (
        /* Search Input */
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Type patient name or UUID to search all 2,000+ patients..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="form-control"
            style={{ paddingLeft: 36, paddingRight: 36 }}
            autoFocus={isOpen}
          />
          {loading && (
            <Loader2 size={16} className="spin-animation" style={{ position: 'absolute', right: 12, top: 12, color: '#38bdf8' }} />
          )}
        </div>
      )}

      {/* Dropdown Results List */}
      {isOpen && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 900,
            marginTop: 6,
            maxHeight: 320,
            overflowY: 'auto',
            background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            padding: 8,
          }}
        >
          {/* Quick Demo Presets */}
          {demoActors.length > 0 && (
            <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: 6 }}>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Sparkles size={12} color="#f59e0b" /> Quick Demo Test Patients:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {demoActors.map((actor) => (
                  <button
                    key={actor.id}
                    type="button"
                    onClick={() => handleSelect(actor)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span>{actor.name}</span>
                    <span style={{ fontSize: '0.6875rem', color: actor.demo_category === 'LOW_BALANCE' ? '#f43f5e' : '#34d399', fontWeight: 700 }}>
                      (${parseFloat(actor.hsa_balance).toFixed(2)})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Live Search Results */}
          {searchTerm.trim() && results.length === 0 && !loading && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              No patients found matching "{searchTerm}". Try a different name or UUID.
            </div>
          )}

          {/* Patient Items List (Either Search Results or Default API Patients) */}
          {(() => {
            const listToDisplay = searchTerm.trim() ? results : defaultPatients;
            const title = searchTerm.trim() 
              ? `Search Results (${results.length} found)` 
              : 'Live Patients in PostgreSQL:';

            return (
              <div>
                <div style={{ padding: '6px 10px', fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
                  {title}
                </div>
                {listToDisplay.map((patient) => {
                  const isSelected = selectedPatient && selectedPatient.id === patient.id;
                  return (
                    <div
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 6,
                        background: isSelected ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = isSelected ? 'rgba(2, 132, 199, 0.25)' : 'transparent')
                      }
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>
                          {patient.name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {patient.id}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: parseFloat(patient.hsa_balance) >= 50 ? '#34d399' : '#f59e0b' }}>
                          ${parseFloat(patient.hsa_balance).toFixed(2)}
                        </span>
                        {isSelected && <Check size={16} color="#38bdf8" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {!searchTerm.trim() && (
            <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', marginTop: 4 }}>
              💡 Type any name or UUID in the search bar above to search across all 2,000+ patients.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
