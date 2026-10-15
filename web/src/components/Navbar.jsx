import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  FolderSearch, 
  CalendarPlus, 
  ReceiptText, 
  TrendingUp, 
  MapPin, 
  Star, 
  UserCheck, 
  Wallet,
  Search,
  ChevronDown,
  X,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  actors, 
  selectedActor, 
  setSelectedActor 
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [defaultPatients, setDefaultPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial sample patients when popover opened
  useEffect(() => {
    if (isSearchOpen && defaultPatients.length === 0) {
      fetch('/api/patients?limit=6')
        .then((r) => r.json())
        .then((data) => setDefaultPatients(data.patients || []))
        .catch((e) => console.error(e));
    }
  }, [isSearchOpen]);

  // Debounced search querying PostgreSQL
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(searchTerm.trim())}&limit=8`);
        const json = await res.json();
        setSearchResults(json.patients || []);
      } catch (err) {
        console.error('Navbar patient search error:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  function handleSelect(patient) {
    setSelectedActor(patient);
    setIsSearchOpen(false);
    setSearchTerm('');
  }

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', position: 'sticky', top: 0, zIndex: 1000 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #0284c7, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)' }}>
            <Activity size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              CareConnect <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>TELEMEDICINE</span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0 }}>PostgreSQL & MongoDB Hybrid Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'browse', label: 'Browse', icon: FolderSearch },
            { id: 'booking', label: 'Book Appointment', icon: CalendarPlus, badge: 'WF1' },
            { id: 'audit', label: 'Audit Trail', icon: ReceiptText },
            { id: 'analytics', label: 'Analytics & View', icon: TrendingUp, badge: 'WF2' },
            { id: 'map', label: 'Nurse Dispatch', icon: MapPin, badge: 'WF3' },
            { id: 'reviews', label: 'Reviews & Catalog', icon: Star, badge: 'WF4' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  background: isActive ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                  color: isActive ? '#38bdf8' : 'var(--text-muted)',
                  fontFamily: 'inherit',
                  fontSize: '0.8125rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: isActive ? '#0284c7' : 'rgba(255,255,255,0.08)', color: '#ffffff' }}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Searchable Active Patient Switcher (Live API Search Bar) */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(15, 23, 42, 0.95)',
              padding: '6px 14px',
              borderRadius: 10,
              border: isSearchOpen ? '1px solid #38bdf8' : '1px solid var(--border-subtle)',
              cursor: 'pointer',
              color: '#ffffff',
              boxShadow: isSearchOpen ? '0 0 12px rgba(56, 189, 248, 0.25)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <UserCheck size={16} color="#38bdf8" />
            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
              <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
                Active Patient:
              </span>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#ffffff', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedActor ? selectedActor.name : 'Search Patient...'}
              </span>
            </div>

            {selectedActor && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <Wallet size={12} color="#34d399" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399' }}>
                  ${parseFloat(selectedActor.hsa_balance).toFixed(2)}
                </span>
              </div>
            )}

            <ChevronDown size={14} color="var(--text-dim)" />
          </button>

          {/* Search Popover Modal */}
          {isSearchOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 360,
                background: '#0f172a',
                borderRadius: 12,
                border: '1px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 16px 36px rgba(0, 0, 0, 0.8)',
                zIndex: 1100,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Search Bar Input */}
              <div style={{ position: 'relative' }}>
                <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  placeholder="Search 2,000+ patients by name or UUID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="form-control"
                  style={{ paddingLeft: 32, paddingRight: 32, fontSize: '0.8125rem' }}
                />
                {loading ? (
                  <Loader2 size={15} className="spin-animation" style={{ position: 'absolute', right: 10, top: 10, color: '#38bdf8' }} />
                ) : searchTerm ? (
                  <X
                    size={15}
                    onClick={() => setSearchTerm('')}
                    style={{ position: 'absolute', right: 10, top: 10, cursor: 'pointer', color: 'var(--text-dim)' }}
                  />
                ) : null}
              </div>

              {/* Quick Demo Presets */}
              {actors.length > 0 && (
                <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={12} color="#f59e0b" /> Demo Scenarios:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {actors.map((actor) => (
                      <button
                        key={actor.id}
                        type="button"
                        onClick={() => handleSelect(actor)}
                        style={{
                          background: selectedActor && selectedActor.id === actor.id ? 'rgba(2, 132, 199, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#ffffff',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 600 }}>{actor.name}</span>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-dim)', marginLeft: 6 }}>
                            ({actor.demo_category})
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, color: actor.demo_category === 'LOW_BALANCE' ? '#f43f5e' : '#34d399' }}>
                          ${parseFloat(actor.hsa_balance).toFixed(2)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results / Database Patients List */}
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', padding: '4px 6px' }}>
                  {searchTerm.trim() ? `Search Results (${searchResults.length}):` : 'All Patients (Type to filter):'}
                </div>

                {searchTerm.trim() && searchResults.length === 0 && !loading && (
                  <div style={{ padding: 12, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    No patient matches found.
                  </div>
                )}

                {(searchTerm.trim() ? searchResults : defaultPatients).map((patient) => {
                  const isSelected = selectedActor && selectedActor.id === patient.id;
                  return (
                    <div
                      key={patient.id}
                      onClick={() => handleSelect(patient)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: isSelected ? 'rgba(2, 132, 199, 0.25)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = isSelected ? 'rgba(2, 132, 199, 0.25)' : 'transparent')
                      }
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{patient.name}</div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                          {patient.id.slice(0, 18)}...
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: parseFloat(patient.hsa_balance) >= 50 ? '#34d399' : '#f59e0b' }}>
                        ${parseFloat(patient.hsa_balance).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
