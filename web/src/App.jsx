import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import BrowseScreen from './components/BrowseScreen';
import TransactionScreen from './components/TransactionScreen';
import AuditScreen from './components/AuditScreen';
import AnalyticsScreen from './components/AnalyticsScreen';
import MapScreen from './components/MapScreen';
import ReviewsScreen from './components/ReviewsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState('browse');
  const [actors, setActors] = useState([]);
  const [selectedActor, setSelectedActor] = useState(null);

  // Load demo actors for the User Switcher
  useEffect(() => {
    fetchDemoActors();
  }, []);

  async function fetchDemoActors() {
    try {
      const res = await fetch('/api/patients/demo/actors');
      const json = await res.json();
      if (json.actors && json.actors.length > 0) {
        setActors(json.actors);
        if (!selectedActor) {
          setSelectedActor(json.actors[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load demo actors:', err);
    }
  }

  // When an appointment is booked, update the active actor's balance
  function handleTransactionComplete(newBalance) {
    if (selectedActor) {
      const updated = { ...selectedActor, hsa_balance: newBalance.toFixed(2) };
      setSelectedActor(updated);
      setActors((prev) =>
        prev.map((a) => (a.id === updated.id ? updated : a))
      );
    }
  }

  // When patient clicked in Browse tab
  function handleSelectPatientForBooking(patient) {
    const existing = actors.find((a) => a.id === patient.id);
    if (existing) {
      setSelectedActor(existing);
    } else {
      const newActor = { ...patient, demo_category: 'CUSTOM' };
      setActors((prev) => [newActor, ...prev]);
      setSelectedActor(newActor);
    }
    setActiveTab('booking');
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar with Navigation & Demo User Switcher */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        actors={actors}
        selectedActor={selectedActor}
        setSelectedActor={setSelectedActor}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px', flex: 1, width: '100%' }}>
        {activeTab === 'browse' && (
          <BrowseScreen
            onSelectPatientForBooking={handleSelectPatientForBooking}
            onStatusUpdated={fetchDemoActors}
          />
        )}

        {activeTab === 'booking' && (
          <TransactionScreen
            selectedActor={selectedActor}
            onSelectActor={setSelectedActor}
            demoActors={actors}
            onTransactionComplete={handleTransactionComplete}
          />
        )}

        {activeTab === 'audit' && (
          <AuditScreen
            selectedActor={selectedActor}
            onSelectActor={setSelectedActor}
            demoActors={actors}
          />
        )}


        {activeTab === 'analytics' && (
          <AnalyticsScreen />
        )}

        {activeTab === 'map' && (
          <MapScreen />
        )}

        {activeTab === 'reviews' && (
          <ReviewsScreen />
        )}
      </main>

      {/* Global Footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-dim)', background: 'rgba(11, 17, 32, 0.8)' }}>
        CareConnect Telemedicine &bull; CS6.302 Software System Development Assignment 2 &bull; PostgreSQL & MongoDB
      </footer>

    </div>
  );
}
