'use client';

import React, { useEffect, useState } from 'react';
import { generateRandomThreatEvent, generateHoustonLondonAttack, ThreatEvent } from '../../lib/threatMapEngine';

export default function PublicDashboardPage() {
  const [events, setEvents] = useState<ThreatEvent[]>([]);
  const [totalScans, setTotalScans] = useState<number>(1482920);
  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4129);
  const [activeTab, setActiveTab] = useState<'all' | 'flagged'>('all');

  useEffect(() => {
    // Initial events
    const initialEvents: ThreatEvent[] = [
      generateHoustonLondonAttack(),
      generateRandomThreatEvent(),
      generateRandomThreatEvent(),
    ];
    setEvents(initialEvents);

    // Auto-stream telemetry events every 3.5 seconds
    const interval = setInterval(() => {
      const newEvt = generateRandomThreatEvent();
      setEvents((prev) => [newEvt, ...prev.slice(0, 30)]);
      setTotalScans((prev) => prev + 1);
      if (newEvt.status !== 'VERIFIED') {
        setAnomaliesBlocked((prev) => prev + 1);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  const handleTriggerAttack = () => {
    const attackEvt = generateHoustonLondonAttack();
    setEvents((prev) => [attackEvt, ...prev.slice(0, 30)]);
    setTotalScans((prev) => prev + 1);
    setAnomaliesBlocked((prev) => prev + 1);
  };

  const handleRandomPing = () => {
    const pingEvt = generateRandomThreatEvent();
    setEvents((prev) => [pingEvt, ...prev.slice(0, 30)]);
    setTotalScans((prev) => prev + 1);
    if (pingEvt.status !== 'VERIFIED') {
      setAnomaliesBlocked((prev) => prev + 1);
    }
  };

  const filteredEvents = activeTab === 'all' 
    ? events 
    : events.filter((e) => e.status !== 'VERIFIED');

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">Public Telemetry Active</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Map & Operations Dashboard</h1>
          <p className="text-sm text-slate-400">Live visualization of NFC cryptographic authentication & impossible velocity mitigation.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerAttack}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            ⚡ Trigger Houston→London Attack
          </button>
          <button
            onClick={handleRandomPing}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
          >
            🎲 Generate Random Ping
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* KPI Metrics Header Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Total Scans (24h)</span>
              <span>📊</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-white">{totalScans.toLocaleString()}</span>
              <span className="text-xs text-emerald-400 font-semibold">+12.4%</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Active NFC DNA Chips</span>
              <span>🔐</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-white">350,000</span>
              <span className="text-xs text-blue-400 font-semibold">NTAG 424 DNA</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Anomalies Mitigated</span>
              <span>🚨</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-red-400">{anomaliesBlocked.toLocaleString()}</span>
              <span className="text-xs text-red-400 font-mono font-bold">100% Mitigated</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Network Protection</span>
              <span>🛡️</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-purple-400">99.98%</span>
              <span className="text-xs text-purple-400 font-semibold">Haversine Active</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid: Map Embed & Live Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Map View */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>🗺️ Global OpenStreetMap Telemetry View</span>
                </h2>
                <a 
                  href="/dashboard.html" 
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline font-mono"
                >
                  Launch Full Interactive Leaflet Map ↗
                </a>
              </div>

              {/* Embedded Map Frame / Interactive Leaflet Frame */}
              <iframe 
                src="/dashboard.html" 
                className="w-full h-[520px] rounded-lg border border-slate-800"
                title="Leaflet OpenStreetMap Live Threat Engine"
              ></iframe>
            </div>

            {/* Explanatory Banner */}
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 text-xs text-slate-300 space-y-1.5">
              <h3 className="font-bold text-emerald-400 flex items-center space-x-2 text-sm">
                <span>💡 Why Impossible Velocity Detection Works</span>
              </h3>
              <p className="leading-relaxed">
                NTAG 424 DNA NFC tags compute a unique AES-128 cryptographic hash (SUN nonce) on every scan. When a tap in <strong>Houston</strong> is replayed <strong>5.2 seconds later in London</strong> (7,750 km away), Quantum Nimbus computes the velocity (>5,000,000 km/h) and revokes the signature instantly before counterfeit goods reach consumers.
              </p>
            </div>
          </div>

          {/* Telemetry Log Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col h-[640px] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 class font-bold text-white text-base">Real-Time Security Feed</h2>
                <p className="text-xs text-slate-400">Live cryptographic verification stream</p>
              </div>

              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px] font-mono">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-2 py-0.5 rounded ${activeTab === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('flagged')}
                  className={`px-2 py-0.5 rounded ${activeTab === 'flagged' ? 'bg-red-600 text-white' : 'text-slate-400'}`}
                >
                  Threats
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredEvents.map((evt) => (
                <div 
                  key={evt.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                    evt.status === 'VERIFIED'
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-red-950/40 border-red-500/50 text-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-500">{evt.timestamp}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      evt.status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-red-900 text-red-200 border border-red-700'
                    }`}>
                      {evt.status}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-100">
                    {evt.origin.name} ➔ {evt.destination.name}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      Velocity:{' '}
                      <strong className={evt.velocityKmh > 1000 ? 'text-red-400' : 'text-emerald-400'}>
                        {evt.velocityKmh.toLocaleString()} km/h
                      </strong>
                    </span>
                    <span>Risk: <strong>{evt.riskScore}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
