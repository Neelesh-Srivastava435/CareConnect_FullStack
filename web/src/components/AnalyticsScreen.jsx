import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  RotateCw, 
  Award, 
  Calendar, 
  BarChart3, 
  Building2, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';

export default function AnalyticsScreen() {
  // Window analytics state
  const [windowData, setWindowData] = useState([]);
  const [days, setDays] = useState(30);
  const [selectedDay, setSelectedDay] = useState('');
  
  // Materialized view state
  const [discharges, setDischarges] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWindowAnalytics();
    fetchDischarges();
  }, [days]);

  async function fetchWindowAnalytics() {
    try {
      const res = await fetch(`/api/analytics/moving-average?days=${days}`);
      const json = await res.json();
      setWindowData(json.data || []);
      if (json.data && json.data.length > 0 && !selectedDay) {
        setSelectedDay(json.data[0].day);
      }
    } catch (err) {
      console.error('Failed to fetch window analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDischarges() {
    try {
      const res = await fetch('/api/analytics/discharges');
      const json = await res.json();
      setDischarges(json.discharges || []);
      setLastRefreshedAt(json.lastRefreshedAt);
    } catch (err) {
      console.error('Failed to fetch discharges:', err);
    }
  }

  async function handleRefreshMaterializedView() {
    setRefreshing(true);
    setRefreshToast(null);
    try {
      const res = await fetch('/api/analytics/refresh-discharges', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to refresh view');
      setDischarges(json.discharges || []);
      setLastRefreshedAt(json.lastRefreshedAt);
      setRefreshToast({
        type: 'success',
        text: 'Materialized View refreshed concurrently! clinic_monthly_discharges is now up-to-date.',
      });
    } catch (err) {
      setRefreshToast({ type: 'error', text: err.message });
    } finally {
      setRefreshing(false);
    }
  }

  // Filter window analytics for the selected leaderboard date
  const availableDays = Array.from(new Set(windowData.map((d) => d.day)));
  const dailyLeaderboard = windowData.filter((d) => d.day === (selectedDay || availableDays[0]));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color="#38bdf8" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Workflow 2: SQL Window Analytics & Materialized View</h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
          Demonstrates advanced SQL Window Functions (7-day moving average, <code style={{ color: '#38bdf8' }}>DENSE_RANK()</code>) and Materialized View concurrent refreshes.
        </p>
      </div>

      {/* SECTION 1: MATERIALIZED VIEW (clinic_monthly_discharges) */}
      <div className="glass-panel" style={{ padding: 24, border: '1px solid rgba(13, 148, 136, 0.3)', background: 'rgba(15, 23, 42, 0.85)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={18} color="#2dd4bf" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#2dd4bf' }}>
                Materialized View: clinic_monthly_discharges
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Stores pre-computed monthly patient discharges. Read queries execute with near-zero disk latency.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastRefreshedAt && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: 8 }}>
                Last Refreshed: {new Date(lastRefreshedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleRefreshMaterializedView}
              disabled={refreshing}
              className="btn btn-emerald"
              style={{ padding: '8px 16px' }}
            >
              <RotateCw size={16} className={refreshing ? 'spin-animation' : ''} />
              {refreshing ? 'Refreshing Concurrently...' : 'Refresh Materialized View'}
            </button>
          </div>
        </div>

        {refreshToast && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            background: refreshToast.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: refreshToast.type === 'success' ? '#34d399' : '#fb7185',
            fontSize: '0.8125rem',
          }}>
            {refreshToast.text}
          </div>
        )}

        {/* Discharge Summary Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {discharges.slice(0, 8).map((d, i) => (
            <div key={`${d.clinic_id}-${d.month}`} style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(d.month).toLocaleDateString([], { month: 'short', year: 'numeric' })}</span>
                <span className="badge badge-discharged">{d.total_discharges} Discharged</span>
              </div>
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>{d.clinic_name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: WINDOW FUNCTION LEADERBOARD (DENSE_RANK & 7-DAY MOVING AVG) */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={18} color="#38bdf8" />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Daily Clinic Leaderboard (DENSE_RANK)
              </h3>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Ranked per-day based on 7-day moving average copay revenue via <code style={{ color: '#38bdf8' }}>AVG(revenue) OVER (PARTITION BY clinic_id ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)</code>.
            </p>
          </div>

          {/* Date Selector for Leaderboard */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', fontWeight: 600 }}>Filter by Date:</span>
            <input
              type="date"
              value={selectedDay ? selectedDay.slice(0, 10) : ''}
              onChange={(e) => {
                const val = e.target.value;
                const match = availableDays.find((d) => d.startsWith(val));
                if (match) setSelectedDay(match);
                else setSelectedDay(val);
              }}
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
            />
            {/* Quick date chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {availableDays.slice(0, 4).map((d) => {
                const isSelected = selectedDay === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                  >
                    {new Date(d).toLocaleDateString()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Rank</th>
                <th>Clinic Name</th>
                <th>Date</th>
                <th>Daily Copay Revenue</th>
                <th>7-Day Moving Avg</th>
                <th style={{ textAlign: 'right' }}>Performance Trend</th>
              </tr>
            </thead>
            <tbody>
              {dailyLeaderboard.map((item) => {
                const rank = parseInt(item.clinic_rank_that_day, 10);
                return (
                  <tr key={`${item.clinic_id}-${item.day}`}>
                    <td>
                      {rank === 1 && <span className="badge" style={{ background: '#f59e0b', color: '#000000', fontWeight: 800 }}>#1 GOLD</span>}
                      {rank === 2 && <span className="badge" style={{ background: '#94a3b8', color: '#000000', fontWeight: 800 }}>#2 SILVER</span>}
                      {rank === 3 && <span className="badge" style={{ background: '#b45309', color: '#ffffff', fontWeight: 800 }}>#3 BRONZE</span>}
                      {rank > 3 && <span style={{ fontWeight: 700, color: 'var(--text-dim)' }}>#{rank}</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{item.clinic_name}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{new Date(item.day).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>${parseFloat(item.daily_revenue).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#38bdf8' }}>${parseFloat(item.revenue_7day_avg).toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={{
                        color: parseFloat(item.daily_revenue) >= parseFloat(item.revenue_7day_avg) ? '#34d399' : '#f43f5e',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}>
                        {parseFloat(item.daily_revenue) >= parseFloat(item.revenue_7day_avg) ? '▲ Above Average' : '▼ Below Average'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
