import React, { useState, useEffect } from 'react';
import { 
  Star, 
  Tag, 
  Stethoscope, 
  Pill, 
  Calendar, 
  Clock, 
  Sparkles,
  BarChart2,
  FileText,
  Building2,
  X
} from 'lucide-react';
import SearchableClinicSelect from './SearchableClinicSelect';

export default function ReviewsScreen() {
  const [analytics, setAnalytics] = useState(null);
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [catalogs, setCatalogs] = useState([]);
  const [catalogType, setCatalogType] = useState('ALL'); // 'ALL', 'SPECIALIST', 'MEDICATION'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReviewAnalytics(selectedClinic ? selectedClinic.id : null);
  }, [selectedClinic]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  async function fetchReviewAnalytics(clinicId) {
    setLoading(true);
    try {
      const url = clinicId
        ? `/api/reviews/analytics?clinicId=${encodeURIComponent(clinicId)}`
        : '/api/reviews/analytics';
      const res = await fetch(url);
      const json = await res.json();
      setAnalytics(json);
    } catch (err) {
      console.error('Failed to fetch review analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCatalogs() {
    try {
      const res = await fetch('/api/catalogs');
      const json = await res.json();
      setCatalogs(json.catalogs || []);
    } catch (err) {
      console.error('Failed to fetch catalogs:', err);
    }
  }

  const filteredCatalogs = catalogs.filter((c) => {
    if (catalogType === 'ALL') return true;
    return c.catalogType === catalogType;
  });

  const totalReviews = analytics ? analytics.totalReviews : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} color="#38bdf8" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Workflow 4: Review Analytics & Medical Catalogs</h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Multi-faceted analytics across 100,000+ MongoDB reviews via <code style={{ color: '#38bdf8' }}>$facet</code> and <code style={{ color: '#38bdf8' }}>$unwind</code>, filterable by medical clinic.
          </p>
        </div>

        {/* Clinic Filter with Clear Button */}
        <div style={{ minWidth: 320 }}>
          <SearchableClinicSelect
            selectedClinic={selectedClinic}
            onSelectClinic={setSelectedClinic}
            label={selectedClinic ? `Filtering by: ${selectedClinic.name}` : 'Filter Reviews by Clinic (Optional)'}
            onlyActive={false}
            autoSelectFirst={false}
          />
          {selectedClinic && (
            <button
              onClick={() => setSelectedClinic(null)}
              className="btn btn-secondary"
              style={{ marginTop: 6, padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <X size={12} /> Clear Clinic Filter (Show Global)
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: $FACET REVIEW ANALYTICS */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 1fr', gap: 20 }}>
        
        {/* Global / Clinic Average Rating Card */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>
            {selectedClinic ? 'Clinic Average Rating' : 'Global Average Rating'}
          </span>
          <div style={{ fontSize: '3.75rem', fontWeight: 800, color: '#f59e0b', margin: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            {analytics ? analytics.averageRating.toFixed(2) : '0.00'}
            <Star size={36} fill="#f59e0b" color="#f59e0b" />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Computed across <strong>{totalReviews.toLocaleString()}</strong> reviews
          </div>
          <div style={{ marginTop: 16, padding: '4px 12px', borderRadius: 9999, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 600 }}>
            MongoDB $facet.globalAverage
          </div>
        </div>

        {/* Rating Distribution Chart ($facet.ratingBuckets) */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={16} color="#38bdf8" /> Star Distribution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analytics &&
              analytics.ratingDistribution.map((item) => {
                const percentage = totalReviews > 0 ? (item.count / totalReviews) * 100 : 0;
                return (
                  <div key={item.star} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.8125rem' }}>
                    <span style={{ width: 45, fontWeight: 600, color: '#ffffff' }}>{item.star} ★</span>
                    <div style={{ flex: 1, height: 10, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          background: item.star >= 4 ? '#10b981' : item.star === 3 ? '#f59e0b' : '#f43f5e',
                          borderRadius: 5,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <span style={{ width: 60, textAlign: 'right', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      {item.count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Top Bedside Manner Tags ($facet.frequentTags via $unwind) */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} color="#2dd4bf" /> Top Bedside Manner Tags
          </h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {analytics && analytics.topTags.length === 0 && (
              <div style={{ color: 'var(--text-dim)', fontSize: '0.8125rem', padding: 12 }}>
                No tags recorded for this selection.
              </div>
            )}
            {analytics &&
              analytics.topTags.map((tag, idx) => (
                <div
                  key={tag.tag}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: idx < 3 ? 'rgba(45, 212, 191, 0.15)' : 'rgba(15, 23, 42, 0.7)',
                    border: idx < 3 ? '1px solid rgba(45, 212, 191, 0.35)' : '1px solid var(--border-subtle)',
                    color: idx < 3 ? '#2dd4bf' : 'var(--text-main)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>#{tag.tag}</span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', padding: '1px 5px', borderRadius: 4, background: 'rgba(255,255,255,0.06)' }}>
                    {tag.count.toLocaleString()}
                  </span>
                </div>
              ))}
          </div>
        </div>

      </div>

      {/* SECTION 2: FLEXIBLE MEDICAL CATALOGS */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="#a855f7" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#c084fc' }}>
                Polymorphic Medical Catalogs (MedicalCatalogs)
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Unstructured MongoDB documents storing doctor schedules and medication formularies.
            </p>
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['ALL', 'SPECIALIST', 'MEDICATION'].map((t) => (
              <button
                key={t}
                onClick={() => setCatalogType(t)}
                className={`btn ${catalogType === t ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '6px 14px', fontSize: '0.75rem' }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {filteredCatalogs.map((item) => {
            const isSpecialist = item.catalogType === 'SPECIALIST';
            return (
              <div
                key={item._id}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: isSpecialist ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="badge" style={{ background: isSpecialist ? 'rgba(168, 85, 247, 0.15)' : 'rgba(56, 189, 248, 0.15)', color: isSpecialist ? '#c084fc' : '#38bdf8' }}>
                    {item.catalogType}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#ffffff' }}>
                  {item.name}
                </div>

                {isSpecialist && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', color: '#38bdf8', fontWeight: 600 }}>
                      Specialization: {item.specialization}
                    </div>
                    <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Weekly Availability:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {(item.availability || []).map((slot, sIdx) => (
                        <span key={sIdx} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', fontSize: '0.75rem' }}>
                          {slot.day || slot}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!isSpecialist && item.medicationDetails && (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <div><strong>Dosage:</strong> {item.medicationDetails.dosage || 'Standard'}</div>
                    <div><strong>Form:</strong> {item.medicationDetails.form || 'Tablet'}</div>
                    {item.medicationDetails.indications && (
                      <div><strong>Indications:</strong> {item.medicationDetails.indications}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
