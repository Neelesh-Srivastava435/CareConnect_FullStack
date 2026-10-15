import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Check, ChevronDown, Loader2 } from 'lucide-react';

export default function SearchableClinicSelect({
  selectedClinic,
  onSelectClinic,
  label = 'Select Medical Clinic',
  onlyActive = true,
  autoSelectFirst = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [clinics, setClinics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch clinics with search filter
  useEffect(() => {
    fetchClinics(searchTerm);
  }, [searchTerm, onlyActive]);

  async function fetchClinics(term) {
    setLoading(true);
    try {
      const activeParam = onlyActive ? 'onlyActive=true' : 'onlyActive=false';
      const searchParam = term.trim() ? `&search=${encodeURIComponent(term.trim())}` : '';
      const url = `/api/clinics/active/list?${activeParam}${searchParam}`;
      const res = await fetch(url);
      const json = await res.json();
      setClinics(json.clinics || []);
      // Auto-select first if requested and none selected
      if (autoSelectFirst && !selectedClinic && json.clinics && json.clinics.length > 0) {
        onSelectClinic(json.clinics[0]);
      }
    } catch (err) {
      console.error('Failed to fetch clinics:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(clinic) {
    onSelectClinic(clinic);
    setSearchTerm('');
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="form-group" style={{ position: 'relative' }}>
      <label className="form-label">{label}</label>

      {/* Selected Clinic Display */}
      {selectedClinic && !isOpen ? (
        <div
          onClick={() => setIsOpen(true)}
          style={{
            padding: '12px 14px',
            borderRadius: 8,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(13, 148, 136, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="#2dd4bf" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.9375rem' }}>
                {selectedClinic.name}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                Lat: {selectedClinic.latitude.toFixed(4)}, Lng: {selectedClinic.longitude.toFixed(4)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-discharged">Accepting</span>
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
            placeholder="Type clinic name or location to search clinics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Dropdown Results */}
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
            maxHeight: 280,
            overflowY: 'auto',
            background: '#0f172a',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.7)',
            padding: 8,
          }}
        >
          {clinics.length === 0 && !loading && (
            <div style={{ padding: 14, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              No clinics found matching "{searchTerm}".
            </div>
          )}

          {clinics.map((clinic) => {
            const isSelected = selectedClinic && selectedClinic.id === clinic.id;
            return (
              <div
                key={clinic.id}
                onClick={() => handleSelect(clinic)}
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
                    {clinic.name}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                    Lat: {clinic.latitude.toFixed(4)}, Lng: {clinic.longitude.toFixed(4)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-discharged">Accepting</span>
                  {isSelected && <Check size={16} color="#38bdf8" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
