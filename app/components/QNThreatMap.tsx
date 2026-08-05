'use client';

import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, Line, Marker } from 'react-simple-maps';
import { geoMercator } from 'd3-geo';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json";

export interface LocationNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
  activeChips: number;
  avgLatencyMs: number;
}

export interface TelemetryPayload {
  id: string;
  timestamp: string;
  tag_id: string;
  origin: LocationNode;
  destination: LocationNode | null;
  tap_sequence: number;
  delta_seconds: number;
  distance_km: number;
  velocity_kmh?: number;
  status?: 'VERIFIED' | 'FLAGGED THREAT';
}

interface ActiveArc {
  id: string;
  from: [number, number];
  to: [number, number];
  isThreat: boolean;
}

interface ActiveMarkerPin {
  id: string;
  city: string;
  coordinates: [number, number];
  isThreat: boolean;
  spawnTime: number;
}

// Available City Nodes
const CITIES: LocationNode[] = [
  { city: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698, activeChips: 48290, avgLatencyMs: 12 },
  { city: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194, activeChips: 35120, avgLatencyMs: 14 },
  { city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060, activeChips: 52100, avgLatencyMs: 11 },
  { city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298, activeChips: 31050, avgLatencyMs: 13 },
  { city: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918, activeChips: 28400, avgLatencyMs: 15 },
  { city: 'Denver', country: 'US', lat: 39.7392, lng: -104.9903, activeChips: 22100, avgLatencyMs: 14 },
  { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, activeChips: 41000, avgLatencyMs: 42 },
  { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050, activeChips: 38200, avgLatencyMs: 45 },
  { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, activeChips: 49000, avgLatencyMs: 85 },
  { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, activeChips: 19500, avgLatencyMs: 110 }
];

export default function QNThreatMap() {
  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryPayload[]>([]);
  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4144);
  const [totalScans, setTotalScans] = useState<number>(1482978);

  const [activeArcs, setActiveArcs] = useState<ActiveArc[]>([]);
  const [activePins, setActivePins] = useState<ActiveMarkerPin[]>([]);

  const [filterMode, setFilterMode] = useState<'all' | 'threats' | 'us'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeMode, setTimeMode] = useState<'live' | '1h'>('live');
  const [scrubberValue, setScrubberValue] = useState<number>(100);

  // Haversine Velocity Threat Evaluator
  const evaluateSecurityThreat = (payload: TelemetryPayload): TelemetryPayload => {
    if (payload.tap_sequence === 1 || !payload.destination) {
      return { ...payload, velocity_kmh: 0, status: 'VERIFIED' };
    }

    const R = 6371;
    const dLat = ((payload.destination.lat - payload.origin.lat) * Math.PI) / 180;
    const dLon = ((payload.destination.lng - payload.origin.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((payload.origin.lat * Math.PI) / 180) *
        Math.cos((payload.destination.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distKm = Math.round(R * c);

    const hours = Math.max(payload.delta_seconds, 0.1) / 3600;
    const velKmh = Math.round(distKm / hours);
    const isThreat = velKmh > 1000;

    return {
      ...payload,
      distance_km: distKm,
      velocity_kmh: velKmh,
      status: isThreat ? 'FLAGGED THREAT' : 'VERIFIED'
    };
  };

  const processPayload = (rawPayload: TelemetryPayload) => {
    const evaluated = evaluateSecurityThreat(rawPayload);

    setTotalScans((prev) => prev + 1);
    if (evaluated.status === 'FLAGGED THREAT') {
      setAnomaliesBlocked((prev) => prev + 1);
    }

    setTelemetryFeed((prev) => [evaluated, ...prev.slice(0, 9)]);

    const pinId = `pin-${evaluated.origin.city}-${Date.now()}`;
    const newPin: ActiveMarkerPin = {
      id: pinId,
      city: evaluated.origin.city,
      coordinates: [evaluated.origin.lng, evaluated.origin.lat],
      isThreat: evaluated.status === 'FLAGGED THREAT',
      spawnTime: Date.now()
    };

    setActivePins((prev) => [...prev.slice(-12), newPin]);

    if (evaluated.tap_sequence === 2 && evaluated.destination) {
      const arcId = `arc-${Date.now()}`;
      const newArc: ActiveArc = {
        id: arcId,
        from: [evaluated.origin.lng, evaluated.origin.lat],
        to: [evaluated.destination.lng, evaluated.destination.lat],
        isThreat: evaluated.status === 'FLAGGED THREAT'
      };

      setActiveArcs((prev) => [...prev.slice(-8), newArc]);

      const destPin: ActiveMarkerPin = {
        id: `pin-${evaluated.destination.city}-${Date.now()}`,
        city: evaluated.destination.city,
        coordinates: [evaluated.destination.lng, evaluated.destination.lat],
        isThreat: evaluated.status === 'FLAGGED THREAT',
        spawnTime: Date.now()
      };
      setActivePins((prev) => [...prev.slice(-12), destPin]);

      setTimeout(() => {
        setActiveArcs((prev) => prev.filter((a) => a.id !== arcId));
      }, 3200);
    }

    // Auto-remove pin after 5 seconds
    setTimeout(() => {
      setActivePins((prev) => prev.filter((p) => p.id !== pinId));
    }, 5000);
  };

  const triggerHoustonDenverAttack = () => {
    const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
    const houston = CITIES[0];
    const denver = CITIES[5];

    processPayload({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      tag_id: tagId,
      origin: houston,
      destination: null,
      tap_sequence: 1,
      delta_seconds: 0,
      distance_km: 0
    });

    setTimeout(() => {
      processPayload({
        id: `evt-${Date.now() + 1}`,
        timestamp: new Date().toLocaleTimeString(),
        tag_id: tagId,
        origin: houston,
        destination: denver,
        tap_sequence: 2,
        delta_seconds: 0.45,
        distance_km: 1412
      });
    }, 1200);
  };

  // Streaming Telemetry Interval Loop
  useEffect(() => {
    triggerHoustonDenverAttack();

    const interval = setInterval(() => {
      if (timeMode !== 'live') return;

      const isReplay = Math.random() < 0.35;
      const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
      const c1 = CITIES[Math.floor(Math.random() * CITIES.length)];

      if (!isReplay) {
        processPayload({
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tag_id: tagId,
          origin: c1,
          destination: null,
          tap_sequence: 1,
          delta_seconds: 0,
          distance_km: 0
        });
      } else {
        let c2 = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (c2.city === c1.city) c2 = CITIES[Math.floor(Math.random() * CITIES.length)];

        processPayload({
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tag_id: tagId,
          origin: c1,
          destination: c2,
          tap_sequence: 2,
          delta_seconds: parseFloat((Math.random() * 1.8 + 0.2).toFixed(2)),
          distance_km: 0
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [timeMode]);

  // Filter Stream Data
  const filteredTelemetry = telemetryFeed.filter((item) => {
    if (filterMode === 'threats' && item.status !== 'FLAGGED THREAT') return false;
    if (filterMode === 'us' && !item.origin.country.includes('US')) return false;
    if (
      searchQuery.trim() !== '' &&
      !item.tag_id.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.origin.city.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="w-full min-h-screen bg-[#030712] text-slate-100 p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              React-Simple-Maps GIS Threat Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Map & Operations Center</h1>
          <p className="text-sm text-slate-400">Authentic World Atlas TopoJSON GIS vectors via react-simple-maps and d3-geo.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={triggerHoustonDenverAttack}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            ⚡ Simulate Houston→Denver Attack
          </button>
        </div>
      </header>

      {/* KPI Metrics Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Total Security Scans</span>
            <span>📊</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{totalScans.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-semibold">+12.4%</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Active NFC DNA Chips</span>
            <span>🔐</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">350,000</span>
            <span className="text-xs text-blue-400 font-semibold">NTAG 424 DNA</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Anomalies Blocked</span>
            <span>🚨</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-red-400">{anomaliesBlocked.toLocaleString()}</span>
            <span className="text-xs text-red-400 font-mono font-bold">100% Mitigated</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm backdrop-blur-md">
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

      {/* Main Grid: Left Map + Right Stream */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: react-simple-maps Map Viewport */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 text-xs font-mono">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'all' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All Telemetry
              </button>
              <button
                onClick={() => setFilterMode('threats')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'threats' ? 'bg-red-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Threats Only
              </button>
              <button
                onClick={() => setFilterMode('us')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterMode === 'us' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                US Region
              </button>
            </div>

            <div className="text-xs font-mono text-emerald-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>react-simple-maps + d3-geo</span>
            </div>
          </div>

          {/* Map Container */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative backdrop-blur-md">
            <div className="w-full h-[480px] rounded-lg overflow-hidden border border-slate-800 bg-[#030712] relative flex items-center justify-center">
              
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{ scale: 110, center: [0, 20] }}
                width={800}
                height={480}
                style={{ width: '100%', height: '100%', backgroundColor: '#030712' }}
              >
                {/* Authentic World TopoJSON Geographies */}
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        style={{
                          default: { fill: '#0d1726', stroke: '#1e3a5f', strokeWidth: 0.75, outline: 'none' },
                          hover: { fill: '#102a45', stroke: '#10b981', strokeWidth: 1, outline: 'none' },
                          pressed: { fill: '#0d1726', stroke: '#1e3a5f', strokeWidth: 0.75, outline: 'none' }
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Animated Telemetry Arcs */}
                {activeArcs.map((arc) => (
                  <Line
                    key={arc.id}
                    from={arc.from}
                    to={arc.to}
                    stroke={arc.isThreat ? '#ef4444' : '#10b981'}
                    strokeWidth={arc.isThreat ? 3 : 2}
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                ))}

                {/* Pulsing Radar Markers */}
                {activePins.map((pin) => (
                  <Marker key={pin.id} coordinates={pin.coordinates}>
                    <g transform="translate(0, 0)">
                      <circle r={14} fill="none" stroke={pin.isThreat ? '#ef4444' : '#10b981'} strokeWidth={1.5} className="animate-ping opacity-75" />
                      <circle r={5} fill={pin.isThreat ? '#ef4444' : '#10b981'} stroke="#ffffff" strokeWidth={1.2} />
                      <text
                        textAnchor="start"
                        x={10}
                        y={4}
                        style={{
                          fontFamily: 'JetBrains Mono',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          fill: '#ffffff',
                          pointerEvents: 'none'
                        }}
                      >
                        {pin.city}
                      </text>
                    </g>
                  </Marker>
                ))}
              </ComposableMap>

            </div>
          </div>

          {/* Time Scrubber Bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">⏱️ Incident Time Scrubber:</span>
                <span className="text-emerald-400">{timeMode === 'live' ? 'LIVE TELEMETRY STREAM' : `AUDIT SCRUB: -${100 - scrubberValue}m`}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { setTimeMode('live'); setScrubberValue(100); }}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    timeMode === 'live' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  [LIVE]
                </button>
                <button
                  onClick={() => setTimeMode('1h')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    timeMode === '1h' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  [-1 Hour]
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={scrubberValue}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setScrubberValue(val);
                if (val < 100) setTimeMode('1h');
                else setTimeMode('live');
              }}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
            />
          </div>

        </div>

        {/* Right Column: Telemetry Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[630px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Telemetry Stream</h2>
              <p className="text-xs text-slate-400 font-mono">Filtered Security Events</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> STREAM ACTIVE
            </span>
          </div>

          <div>
            <input
              type="text"
              placeholder="🔍 Search Tag ID (e.g. NTAG-424-8000)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {filteredTelemetry.map((evt) => (
              <div
                key={evt.id}
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                  evt.status === 'VERIFIED'
                    ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                    : 'bg-red-950/40 border-red-500/50 text-red-200'
                }`}
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-500">{evt.timestamp}</span>
                  <span
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      evt.status === 'VERIFIED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-red-900 text-red-200 border border-red-700'
                    }`}
                  >
                    {evt.status}
                  </span>
                </div>

                <div className="font-mono font-semibold text-slate-100">
                  Tag: {evt.tag_id}
                </div>

                <div className="text-slate-300 font-medium">
                  {evt.origin.city}, {evt.origin.country}{' '}
                  {evt.destination ? `➔ ${evt.destination.city}, ${evt.destination.country}` : '(Tap 1 Verified)'}
                </div>

                {evt.destination && (
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      Vel:{' '}
                      <strong className={evt.velocity_kmh! > 1000 ? 'text-red-400' : 'text-emerald-400'}>
                        {evt.velocity_kmh?.toLocaleString()} km/h
                      </strong>
                    </span>
                    <span>
                      Delta: <strong>{evt.delta_seconds}s</strong>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
