'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';

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
  timestampMs: number;
  tag_id: string;
  origin: LocationNode;
  destination: LocationNode | null;
  tap_sequence: number;
  delta_seconds: number;
  distance_km: number;
  velocity_kmh?: number;
  status?: 'VERIFIED' | 'FLAGGED THREAT';
}

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // States
  const [projectionMode, setProjectionMode] = useState<'2d' | '3d'>('2d');
  const [filterMode, setFilterMode] = useState<'all' | 'threats' | 'us'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [scrubberValue, setScrubberValue] = useState<number>(60);
  const scrubberSecondsAgo = 60 - scrubberValue;

  const [hoveredNode, setHoveredNode] = useState<LocationNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4144);
  const [totalScans, setTotalScans] = useState<number>(1482978);

  const masterEventHistoryRef = useRef<TelemetryPayload[]>([]);
  const rotationAngleRef = useRef<number>(0);
  const topoDataRef = useRef<any>(null);

  // Load TopoJSON
  useEffect(() => {
    fetch('assets/land-110m.json')
      .then((res) => res.json())
      .then((data) => { topoDataRef.current = data; })
      .catch(() => {
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
          .then((res) => res.json())
          .then((data) => { topoDataRef.current = data; });
      });
  }, []);

  const evaluateSecurityThreat = (payload: Omit<TelemetryPayload, 'timestampMs'>, now: number): TelemetryPayload => {
    if (payload.tap_sequence === 1 || !payload.destination) {
      return { ...payload, timestampMs: now, velocity_kmh: 0, status: 'VERIFIED' };
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
      timestampMs: now,
      distance_km: distKm,
      velocity_kmh: velKmh,
      status: isThreat ? 'FLAGGED THREAT' : 'VERIFIED'
    };
  };

  const processPayload = (rawPayload: Omit<TelemetryPayload, 'timestampMs'>) => {
    const now = Date.now();
    const evaluated = evaluateSecurityThreat(rawPayload, now);

    setTotalScans((prev) => prev + 1);
    if (evaluated.status === 'FLAGGED THREAT') {
      setAnomaliesBlocked((prev) => prev + 1);
    }

    masterEventHistoryRef.current.unshift(evaluated);
    if (masterEventHistoryRef.current.length > 300) {
      masterEventHistoryRef.current.pop();
    }
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

  // Continuous Streaming Loop
  useEffect(() => {
    triggerHoustonDenverAttack();

    const interval = setInterval(() => {
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
  }, []);

  // Hover Detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    let found: LocationNode | null = null;

    CITIES.forEach((city) => {
      let projected: [number, number] | null = null;
      if (projectionMode === '2d') {
        const p = d3Geo.geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2 + 20]);
        projected = p([city.lng, city.lat]);
      } else {
        const p = d3Geo.geoOrthographic().scale(height / 2.3).translate([width / 2, height / 2]).rotate([rotationAngleRef.current, -15]);
        projected = p([city.lng, city.lat]);
      }

      if (projected) {
        const dist = Math.hypot(mouseX - projected[0], mouseY - projected[1]);
        if (dist < 14) {
          found = city;
        }
      }
    });

    if (found) {
      setHoveredNode(found);
      setTooltipPos({ x: mouseX, y: mouseY });
    } else {
      setHoveredNode(null);
      setTooltipPos(null);
    }
  };

  // Canvas Render Loop with Deterministic Time-Travel Evaluation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 520);

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      let projection: d3Geo.GeoProjection;
      if (projectionMode === '2d') {
        projection = d3Geo.geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2 + 20]);
      } else {
        rotationAngleRef.current = (rotationAngleRef.current + 0.25) % 360;
        projection = d3Geo.geoOrthographic().scale(height / 2.3).translate([width / 2, height / 2]).rotate([rotationAngleRef.current, -15]);

        ctx.beginPath();
        ctx.arc(width / 2, height / 2, height / 2.3, 0, Math.PI * 2);
        ctx.fillStyle = '#060c1c';
        ctx.fill();
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const pathGenerator = d3Geo.geoPath().projection(projection).context(ctx);

      ctx.strokeStyle = 'rgba(15, 32, 56, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      const graticule = d3Geo.geoGraticule10();
      ctx.beginPath();
      pathGenerator(graticule);
      ctx.stroke();
      ctx.setLineDash([]);

      if (topoDataRef.current) {
        const geojson = topojson.feature(topoDataRef.current, topoDataRef.current.objects.land);
        ctx.fillStyle = '#0d1726';
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        pathGenerator(geojson);
        ctx.fill();
        ctx.stroke();
      }

      // Calculate Target Viewport Timestamp MS
      const targetTimeMs = Date.now() - (scrubberSecondsAgo * 1000);

      // Find events active within a 12-second window relative to targetTimeMs
      const visibleEvents = masterEventHistoryRef.current.filter(
        (evt) => evt.timestampMs <= targetTimeMs && targetTimeMs - evt.timestampMs < 12000
      );

      // Render Pins & Arcs for Target Timestamp MS
      visibleEvents.forEach((evt) => {
        const age = targetTimeMs - evt.timestampMs;
        const fade = Math.max(0.1, 1 - age / 12000);
        const radius = (age / 12000) * 28;

        const pt1 = projection([evt.origin.lng, evt.origin.lat]);
        if (pt1) {
          const [x, y] = pt1;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2, radius), 0, Math.PI * 2);
          ctx.strokeStyle = evt.status === 'FLAGGED THREAT' ? `rgba(239, 68, 68, ${fade * 0.9})` : `rgba(16, 185, 129, ${fade * 0.9})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = evt.status === 'FLAGGED THREAT' ? '#ef4444' : '#10b981';
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();

          ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
          ctx.font = 'bold 10px JetBrains Mono';
          ctx.fillText(evt.origin.city, x + 8, y + 3);
        }

        if (evt.destination) {
          const pt2 = projection([evt.destination.lng, evt.destination.lat]);
          if (pt2) {
            const [x, y] = pt2;
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = evt.status === 'FLAGGED THREAT' ? '#ef4444' : '#10b981';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
            ctx.font = 'bold 10px JetBrains Mono';
            ctx.fillText(evt.destination.city, x + 8, y + 3);
          }

          if (pt1 && pt2) {
            const progress = Math.min(age / 2400, 1.0);
            const midX = (pt1[0] + pt2[0]) / 2;
            const midY = Math.min(pt1[1], pt2[1]) - Math.abs(pt1[0] - pt2[0]) * 0.28;

            ctx.beginPath();
            ctx.moveTo(pt1[0], pt1[1]);
            ctx.quadraticCurveTo(midX, midY, pt2[0], pt2[1]);
            ctx.strokeStyle = evt.status === 'FLAGGED THREAT'
              ? `rgba(239, 68, 68, ${0.95 * (1 - progress)})`
              : `rgba(16, 185, 129, ${0.85 * (1 - progress)})`;
            ctx.lineWidth = evt.status === 'FLAGGED THREAT' ? 3.5 : 2;
            ctx.setLineDash(evt.status === 'FLAGGED THREAT' ? [6, 4] : []);
            ctx.stroke();
            ctx.setLineDash([]);

            const t = Math.max(0.01, Math.min(progress, 0.99));
            const currX = (1 - t) * (1 - t) * pt1[0] + 2 * (1 - t) * t * midX + t * t * pt2[0];
            const currY = (1 - t) * (1 - t) * pt1[1] + 2 * (1 - t) * t * midY + t * t * pt2[1];

            ctx.beginPath();
            ctx.arc(currX, currY, evt.status === 'FLAGGED THREAT' ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = evt.status === 'FLAGGED THREAT' ? '#ef4444' : '#10b981';
            ctx.shadowColor = evt.status === 'FLAGGED THREAT' ? '#ef4444' : '#10b981';
            ctx.shadowBlur = 14;
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, [projectionMode, scrubberSecondsAgo]);

  // Determine active feed slice
  const targetTimeMs = Date.now() - (scrubberSecondsAgo * 1000);
  const activeFeedList = masterEventHistoryRef.current.filter((evt) => evt.timestampMs <= targetTimeMs);

  const filteredTelemetry = activeFeedList.filter((item) => {
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
              Dual 2D Flat / 3D Globe Projection Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Map & Operations Center</h1>
          <p className="text-sm text-slate-400">Switch seamlessly between 2D Mercator flat map and 3D Rotating Globe with instant time scrubbing.</p>
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
        
        {/* Left Column: Map & Projection Controls */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Projection Mode Header Bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-2">
              <span>MAP VIEWPORT ENGINE:</span>
              <span className="text-emerald-400">{projectionMode === '2d' ? '2D EQUIRECTANGULAR GIS' : '3D ROTATING GLOBE'}</span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setProjectionMode('2d')}
                className={`px-3 py-1 rounded transition-all ${
                  projectionMode === '2d' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold' : 'text-slate-400'
                }`}
              >
                🗺️ 2D Flat
              </button>
              <button
                onClick={() => setProjectionMode('3d')}
                className={`px-3 py-1 rounded transition-all ${
                  projectionMode === '3d' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold' : 'text-slate-400'
                }`}
              >
                🌐 3D Globe
              </button>
            </div>
          </div>

          {/* Map Viewport Canvas */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative backdrop-blur-md">
            <div className="w-full h-[480px] relative rounded-lg overflow-hidden border border-slate-800 bg-[#030712]">
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => { setHoveredNode(null); setTooltipPos(null); }}
                className="w-full h-full block cursor-crosshair"
              />

              {/* Glassmorphic Node Popover Tooltip */}
              {hoveredNode && tooltipPos && (
                <div
                  className="absolute z-50 bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono space-y-1 pointer-events-none transition-all max-w-xs"
                  style={{ left: Math.min(tooltipPos.x + 15, 450), top: Math.min(tooltipPos.y + 15, 360) }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1 font-bold text-emerald-400">
                    <span>{hoveredNode.city}, {hoveredNode.country}</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">HQ NODE</span>
                  </div>
                  <div className="text-slate-300">Active Tag Chips: <strong className="text-white">{hoveredNode.activeChips.toLocaleString()}</strong></div>
                  <div className="text-slate-300">Avg Mesh Latency: <strong className="text-emerald-400">{hoveredNode.avgLatencyMs} ms</strong></div>
                  <div className="text-slate-400 text-[10px] pt-1">Haversine Impossible Velocity Engine: ACTIVE</div>
                </div>
              )}
            </div>
          </div>

          {/* Guaranteed Responsive Scrubber Bar */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-white">⏱️ Incident Time Scrubber:</span>
                <span className={scrubberSecondsAgo === 0 ? 'text-emerald-400 font-semibold' : 'text-yellow-400 font-bold'}>
                  {scrubberSecondsAgo === 0 ? '🔴 LIVE STREAMING (0s)' : `⏪ AUDIT SCRUBBING (-${scrubberSecondsAgo}s AGO)`}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setScrubberValue(60)}
                  className="px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-600 text-white cursor-pointer hover:bg-emerald-500 transition-colors"
                >
                  ▶ RESUME LIVE
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="60"
              value={scrubberValue}
              onChange={(e) => setScrubberValue(parseInt(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-60 Seconds (Audit History)</span>
              <span>-30 Seconds</span>
              <span>NOW (Live Stream 0s)</span>
            </div>
          </div>

        </div>

        {/* Right Column: Live Telemetry Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[670px] backdrop-blur-md">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Telemetry Stream</h2>
              <p className="text-xs text-slate-400 font-mono">Filtered Security Events</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> STREAM ACTIVE
            </span>
          </div>

          {/* TELEMETRY FILTERS */}
          <div className="flex items-center space-x-1.5 text-xs font-mono bg-slate-950 p-1.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                filterMode === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Telemetry
            </button>
            <button
              onClick={() => setFilterMode('threats')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                filterMode === 'threats' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Threats Only
            </button>
            <button
              onClick={() => setFilterMode('us')}
              className={`flex-1 py-1.5 rounded-md font-bold transition-all text-center ${
                filterMode === 'us' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              US Region
            </button>
          </div>

          {/* Tag Search Input */}
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
            {filteredTelemetry.slice(0, 40).map((evt) => (
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
