import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { 
  MapPin, 
  Radio, 
  RefreshCw, 
  Crosshair, 
  Send, 
  CheckCircle2, 
  Navigation,
  Compass,
  Building2
} from 'lucide-react';
import SearchableClinicSelect from './SearchableClinicSelect';

export default function MapScreen() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circleRef = useRef(null);
  const markersLayerRef = useRef(null);

  // Origin coordinates: default Hyderabad center
  const [origin, setOrigin] = useState({ lat: 17.3850, lng: 78.4867 });
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [nurses, setNurses] = useState([]);
  const [radiusKm, setRadiusKm] = useState('5.0');
  const [autoPoll, setAutoPoll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [liveDispatching, setLiveDispatching] = useState(false);
  const [toast, setToast] = useState(null);


  function handleSelectClinic(clinic) {
    setSelectedClinic(clinic);
    if (clinic && clinic.latitude && clinic.longitude) {
      setOrigin({ lat: clinic.latitude, lng: clinic.longitude });
    }
  }

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [origin.lat, origin.lng],
      zoom: 14,
      zoomControl: true,
    });

    // OpenStreetMap official tile layer (100% Free & Open-Source, NO API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Markers feature group
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Invalidate size after layout settles to guarantee complete tile coverage
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Click handler to select new origin
    map.on('click', (e) => {
      setOrigin({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      circleRef.current = null;
    };
  }, []);


  // 2. Update Origin Circle & Fetch Nurses whenever Origin changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;
    map.panTo([origin.lat, origin.lng]);

    // Update 5km radius circle
    if (circleRef.current) {
      circleRef.current.remove();
    }

    const circle = L.circle([origin.lat, origin.lng], {
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.15,
      radius: 5000, // 5,000 meters = 5 km
      weight: 2,
      dashArray: '6, 6',
    }).addTo(map);

    circleRef.current = circle;

    fetchNearestNurses(origin.lat, origin.lng);
  }, [origin]);

  // 3. Auto-polling interval (every 4 seconds)
  useEffect(() => {
    let interval = null;
    if (autoPoll) {
      interval = setInterval(() => {
        fetchNearestNurses(origin.lat, origin.lng, true);
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPoll, origin]);

  // Fetch nearest nurses from MongoDB $geoNear endpoint
  async function fetchNearestNurses(lat, lng, isSilent = false) {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/nurses/nearest?lat=${lat}&lng=${lng}&maxDistance=5000&limit=25`);
      const json = await res.json();
      const nurseList = json.nurses || [];
      setNurses(nurseList);
      setRadiusKm(json.radiusKm || '5.0');

      // Update Map Markers
      if (markersLayerRef.current && mapInstanceRef.current) {
        markersLayerRef.current.clearLayers();

        // 1. Patient Origin Marker
        const patientIcon = L.divIcon({
          className: 'custom-patient-marker',
          html: `<div style="background:#0284c7; width:22px; height:22px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 12px #38bdf8; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:bold;">P</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        L.marker([lat, lng], { icon: patientIcon })
          .addTo(markersLayerRef.current)
          .bindPopup(`<strong>Patient Origin</strong><br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);

        // 2. Nurse Markers
        nurseList.forEach((n, idx) => {
          const isTop = idx === 0;
          const nurseIcon = L.divIcon({
            className: 'custom-nurse-marker',
            html: `<div style="background:${isTop ? '#10b981' : '#f59e0b'}; width:18px; height:18px; border-radius:50%; border:2px solid #ffffff; box-shadow:0 0 8px rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px; font-weight:bold;">${idx + 1}</div>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

          L.marker([n.location.lat, n.location.lng], { icon: nurseIcon })
            .addTo(markersLayerRef.current)
            .bindPopup(`<strong>Nurse ${n.nurseId}</strong><br/>Proximity: ${n.distanceMeters}m (${n.distanceKm} km)<br/>Status: Active`);
        });
      }
    } catch (err) {
      console.error('Failed to fetch nearest nurses:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }

  // Live Ping Simulation for viva demonstration
  async function handleSimulateLivePing() {
    setLiveDispatching(true);
    try {
      const res = await fetch('/api/nurses/simulate-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: origin.lat,
          lng: origin.lng,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setToast({
          type: 'success',
          text: `Live Telemetry Dispatched: Nurse ${json.nursePing.nurseId} pinged nearby!`,
        });
        fetchNearestNurses(origin.lat, origin.lng, true);
        setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setLiveDispatching(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2, 132, 199, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={18} color="#38bdf8" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              Workflow 3: Mobile Nurse Geospatial Dispatch
              <span style={{ fontSize: '0.6875rem', fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                Leaflet + OpenStreetMap (No API Key Required)
              </span>
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            MongoDB <code style={{ color: '#38bdf8' }}>$geoNear</code> aggregation pipeline calculating spherical distance across <code style={{ color: '#38bdf8' }}>2dsphere</code> indexed coordinates within a 5 km radius.
          </p>
        </div>

        {/* Live Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)', cursor: 'pointer', background: 'rgba(15, 23, 42, 0.8)', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
            <input
              type="checkbox"
              checked={autoPoll}
              onChange={(e) => setAutoPoll(e.target.checked)}
              style={{ accentColor: '#10b981' }}
            />
            <Radio size={14} color={autoPoll ? '#10b981' : 'var(--text-dim)'} />
            <span>Live Polling (Every 4s)</span>
          </label>

          <button
            onClick={handleSimulateLivePing}
            disabled={liveDispatching}
            className="btn btn-emerald"
            style={{ padding: '8px 16px' }}
          >
            <Send size={15} />
            {liveDispatching ? 'Injecting Ping...' : 'Simulate Moving Nurse Ping'}
          </button>
        </div>
      </div>

      {toast && (
        <div style={{
          padding: '10px 16px',
          borderRadius: 8,
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
          border: `1px solid ${toast.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
          color: toast.type === 'success' ? '#34d399' : '#fb7185',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <CheckCircle2 size={16} /> {toast.text}
        </div>
      )}

      {/* Searchable Clinic Center Selector + Coordinates Toolbar */}
      <div className="glass-panel" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 280, maxWidth: 440 }}>
          <SearchableClinicSelect
            selectedClinic={selectedClinic}
            onSelectClinic={handleSelectClinic}
            label="Search Clinic to Center Dispatch Coordinates:"
            onlyActive={false}
            autoSelectFirst={false}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Target Coordinates:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8', fontFamily: 'monospace' }}>
              Lat: {origin.lat.toFixed(4)}, Lng: {origin.lng.toFixed(4)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase' }}>Dispatch Radius:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#34d399' }}>
              5.0 km (Fixed Metric)
            </span>
          </div>
        </div>
      </div>

      {/* Main Map + Sidebar Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, minHeight: 560 }}>
        
        {/* Interactive Map Container */}
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          
          {/* Top Instructions Bar */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 500, background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', fontSize: '0.75rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crosshair size={14} color="#38bdf8" />
            <span>Click anywhere on the map to set patient origin coordinates</span>
          </div>

          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 540 }} />
        </div>

        {/* Distance-Sorted Sidebar List */}
        <div className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 600, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Active Nurses Nearby</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                Sorted by proximity ($geoNear)
              </p>
            </div>
            <span className="badge badge-waiting">{nurses.length} Inside 5km</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
              <div className="pulse-dot" style={{ margin: '0 auto 8px auto' }}></div>
              Executing $geoNear query...
            </div>
          ) : nurses.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8125rem' }}>
              No active nurses located within 5 km of this coordinate. Click elsewhere on the map or click 'Simulate Moving Nurse Ping' above.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {nurses.map((n, idx) => (
                <div
                  key={n.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: idx === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(15, 23, 42, 0.7)',
                    border: idx === 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: idx === 0 ? '#10b981' : '#0284c7',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}>
                      #{idx + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.nurseId}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                        Lat: {n.location.lat.toFixed(4)}, Lng: {n.location.lng.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, color: idx === 0 ? '#34d399' : '#ffffff', fontSize: '0.875rem' }}>
                      {n.distanceKm} km
                    </div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                      {n.distanceMeters} meters
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
