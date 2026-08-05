'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3Geo from 'd3-geo';
import * as topojson from 'topojson-client';

// ============================================================================
// AGENT 1: @MapEngine - High-Precision GIS Architect (V2)
// ============================================================================

export interface LocationNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
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
  origin: LocationNode;
  destination: LocationNode;
  startTime: number;
  isThreat: boolean;
}

interface ActivePingPin {
  id: string;
  city: string;
  lat: number;
  lng: number;
  isThreat: boolean;
  spawnTime: number;
}

export default function QNThreatMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryPayload[]>([]);
  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4129);
  const [totalScans, setTotalScans] = useState<number>(1482920);
  const [topoData, setTopoData] = useState<any>(null);

  const activeArcsRef = useRef<ActiveArc[]>([]);
  const activePinsRef = useRef<ActivePingPin[]>([]);

  // Authentic City Coordinates
  const CITIES: LocationNode[] = [
    { city: 'Houston', country: 'US', lat: 29.7604, lng: -95.3698 },
    { city: 'San Francisco', country: 'US', lat: 37.7749, lng: -122.4194 },
    { city: 'New York', country: 'US', lat: 40.7128, lng: -74.0060 },
    { city: 'Chicago', country: 'US', lat: 41.8781, lng: -87.6298 },
    { city: 'Miami', country: 'US', lat: 25.7617, lng: -80.1918 },
    { city: 'Denver', country: 'US', lat: 39.7392, lng: -104.9903 },
    { city: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
    { city: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
    { city: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    { city: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 }
  ];

  // Fetch Authentic World Atlas TopoJSON (world-110m.json)
  useEffect(() => {
    fetch('/assets/land-110m.json')
      .then((res) => res.json())
      .then((data) => setTopoData(data))
      .catch(() => {
        // Fallback to CDN if needed
        fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
          .then((res) => res.json())
          .then((data) => setTopoData(data))
          .catch((err) => console.error('Failed to load TopoJSON map:', err));
      });
  }, []);

  // Haversine Distance & Threat Evaluator (@SecurityLogic)
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

    setTelemetryFeed((prev) => [evaluated, ...prev.slice(0, 9)]); // Max 10 recent events

    // Spawn Radar Ripple Pin
    activePinsRef.current.push({
      id: `${evaluated.origin.city}-${Date.now()}`,
      city: evaluated.origin.city,
      lat: evaluated.origin.lat,
      lng: evaluated.origin.lng,
      isThreat: evaluated.status === 'FLAGGED THREAT',
      spawnTime: Date.now()
    });

    if (evaluated.tap_sequence === 2 && evaluated.destination) {
      activeArcsRef.current.push({
        origin: evaluated.origin,
        destination: evaluated.destination,
        startTime: Date.now(),
        isThreat: evaluated.status === 'FLAGGED THREAT'
      });

      activePinsRef.current.push({
        id: `${evaluated.destination.city}-${Date.now()}`,
        city: evaluated.destination.city,
        lat: evaluated.destination.lat,
        lng: evaluated.destination.lng,
        isThreat: evaluated.status === 'FLAGGED THREAT',
        spawnTime: Date.now()
      });
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

  // Telemetry Stream Generator Loop (@TelemetryStream)
  useEffect(() => {
    triggerHoustonDenverAttack();

    const interval = setInterval(() => {
      const isReplay = Math.random() < 0.2;
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
          delta_seconds: parseFloat((Math.random() * 2 + 0.2).toFixed(2)),
          distance_km: 0
        });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // Canvas GIS D3 Projection Loop (@CanvasUI & @MapEngine)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 520);

      // 1. Dark Ocean Background (#030712)
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Setup D3 Equirectangular Projection fitted to Viewport
      const projection = d3Geo.geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2 + 20]);
      const pathGenerator = d3Geo.geoPath().projection(projection).context(ctx);

      // 2. Latitude/Longitude Graticule Lines (#0f2038)
      ctx.strokeStyle = '#0f2038';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([3, 3]);
      const graticule = d3Geo.geoGraticule10();
      ctx.beginPath();
      pathGenerator(graticule);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Authentic TopoJSON Landmass Rendering (#0d1726 fill, #1e3a5f border)
      if (topoData) {
        const geojson = topojson.feature(topoData, topoData.objects.land);
        ctx.fillStyle = '#0d1726';
        ctx.strokeStyle = '#1e3a5f';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        pathGenerator(geojson as any);
        ctx.fill();
        ctx.stroke();
      }

      const now = Date.now();

      // 4. Render Pulsing Radar Ping Circles at Lat/Lng Locations
      activePinsRef.current = activePinsRef.current.filter((pin) => now - pin.spawnTime < 5000);
      activePinsRef.current.forEach((pin) => {
        const coords = projection([pin.lng, pin.lat]);
        if (!coords) return;
        const [x, y] = coords;

        const age = now - pin.spawnTime;
        const fade = 1 - age / 5000;
        const radius = (age / 5000) * 28;

        // Radar Ripple Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = pin.isThreat ? `rgba(239, 68, 68, ${fade * 0.85})` : `rgba(16, 185, 129, ${fade * 0.85})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin Core Dot
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = pin.isThreat ? '#ef4444' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Label
        ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.fillText(pin.city, x + 8, y + 3);
      });

      // 5. Render Animated Quadratic Bezier Arc Trajectories
      activeArcsRef.current = activeArcsRef.current.filter((arc) => now - arc.startTime < 2400);
      activeArcsRef.current.forEach((arc) => {
        const p1 = projection([arc.origin.lng, arc.origin.lat]);
        const p2 = projection([arc.destination.lng, arc.destination.lat]);
        if (!p1 || !p2) return;

        const progress = Math.min((now - arc.startTime) / 2400, 1.0);
        const midX = (p1[0] + p2[0]) / 2;
        const midY = Math.min(p1[1], p2[1]) - Math.abs(p1[0] - p2[0]) * 0.28;

        // Arc Path
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.quadraticCurveTo(midX, midY, p2[0], p2[1]);
        ctx.strokeStyle = arc.isThreat
          ? `rgba(239, 68, 68, ${0.9 * (1 - progress)})`
          : `rgba(16, 185, 129, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = arc.isThreat ? 3.5 : 2;
        ctx.setLineDash(arc.isThreat ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Laser Particle
        const t = progress;
        const currX = (1 - t) * (1 - t) * p1[0] + 2 * (1 - t) * t * midX + t * t * p2[0];
        const currY = (1 - t) * (1 - t) * p1[1] + 2 * (1 - t) * t * midY + t * t * p2[1];

        ctx.beginPath();
        ctx.arc(currX, currY, arc.isThreat ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = arc.isThreat ? '#ef4444' : '#10b981';
        ctx.shadowColor = arc.isThreat ? '#ef4444' : '#10b981';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, [topoData]);

  return (
    <div className="w-full min-h-screen bg-[#030712] text-slate-100 p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              V2 High-Precision TopoJSON GIS Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Telemetry Map</h1>
          <p className="text-sm text-slate-400">Authentic World-Atlas TopoJSON vectors, D3 Equirectangular Projection, & Live Telemetry Stream.</p>
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

      {/* KPI Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Main Grid: Left Map Viewport + Right Scrolling Telemetry Sidebar */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Authentic TopoJSON GIS Canvas */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>🗺️ World-Atlas TopoJSON GIS Map</span>
            </h2>
            <div className="font-mono text-xs text-emerald-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>D3 Projection Active</span>
            </div>
          </div>

          <div className="w-full h-[520px] relative rounded-lg overflow-hidden border border-slate-800 bg-[#030712]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Right: Glassmorphism Scrolling Telemetry Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[600px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Telemetry Stream</h2>
              <p className="text-xs text-slate-400 font-mono">10 Most Recent Events</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
              STREAM ACTIVE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {telemetryFeed.map((evt) => (
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
