'use client';

import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// AGENT 1: @MapEngine - GIS & Basemap Architect
// ============================================================================

export interface LocationNode {
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface TelemetryPayload {
  timestamp: string;
  tag_id: string;
  origin: LocationNode;
  destination: LocationNode | null;
  tap_sequence: number;
  time_delta_seconds: number;
  distance_km: number;
  velocity_kmh?: number;
  status?: 'VERIFIED' | 'FLAGGED THREAT';
}

/**
 * Projects Geographical (Lat, Lng) to 2D Canvas (X, Y) pixel coordinates
 * Using Equirectangular projection.
 */
export function latLngToCanvas(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}

/**
 * Renders the QN Midnight Vector Basemap
 */
export function drawVectorBasemap(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // 1. Dark Ocean Backdrop (#030712)
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Grid Lines (#1e293b)
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
  ctx.lineWidth = 0.75;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Continent Vector Landmass Fill (#0d1117) & Borders (#1e293b)
  ctx.fillStyle = '#0d1117';
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.2;

  // North America
  const naPath = [
    { lat: 70, lng: -140 }, { lat: 60, lng: -130 }, { lat: 50, lng: -125 },
    { lat: 30, lng: -115 }, { lat: 15, lng: -90 }, { lat: 25, lng: -80 },
    { lat: 45, lng: -65 }, { lat: 60, lng: -70 }, { lat: 75, lng: -100 }
  ];

  ctx.beginPath();
  naPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // US Region Highlight Zone
  const usTopLeft = latLngToCanvas(49, -125, width, height);
  const usBottomRight = latLngToCanvas(24, -66, width, height);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.fillRect(usTopLeft.x, usTopLeft.y, usBottomRight.x - usTopLeft.x, usBottomRight.y - usTopLeft.y);
  ctx.strokeRect(usTopLeft.x, usTopLeft.y, usBottomRight.x - usTopLeft.x, usBottomRight.y - usTopLeft.y);
  ctx.setLineDash([]);

  // Europe
  const euPath = [
    { lat: 70, lng: -10 }, { lat: 70, lng: 30 }, { lat: 40, lng: 40 },
    { lat: 36, lng: -5 }, { lat: 45, lng: -10 }
  ];
  ctx.beginPath();
  euPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Asia
  const asiaPath = [
    { lat: 70, lng: 30 }, { lat: 70, lng: 140 }, { lat: 35, lng: 140 },
    { lat: 10, lng: 100 }, { lat: 25, lng: 60 }, { lat: 40, lng: 40 }
  ];
  ctx.beginPath();
  asiaPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // South America
  const saPath = [
    { lat: 12, lng: -75 }, { lat: -5, lng: -35 }, { lat: -35, lng: -55 },
    { lat: -55, lng: -70 }, { lat: -15, lng: -80 }
  ];
  ctx.beginPath();
  saPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Africa
  const afPath = [
    { lat: 37, lng: -10 }, { lat: 30, lng: 32 }, { lat: 10, lng: 50 },
    { lat: -35, lng: 20 }, { lat: 5, lng: 5 }
  ];
  ctx.beginPath();
  afPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Australia
  const auPath = [
    { lat: -12, lng: 130 }, { lat: -15, lng: 150 }, { lat: -38, lng: 150 },
    { lat: -35, lng: 115 }
  ];
  ctx.beginPath();
  auPath.forEach((pt, idx) => {
    const { x, y } = latLngToCanvas(pt.lat, pt.lng, width, height);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ============================================================================
// AGENT 3: @SecurityLogic - Threat Detection & Velocity Engine
// ============================================================================

/**
 * Calculates Haversine Great-Circle distance in km
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Evaluates Tap Payload for Impossible Velocity Threats
 */
export function evaluateSecurityThreat(payload: TelemetryPayload): TelemetryPayload {
  if (payload.tap_sequence === 1 || !payload.destination) {
    return {
      ...payload,
      velocity_kmh: 0,
      status: 'VERIFIED',
    };
  }

  const distance = haversineDistanceKm(
    payload.origin.lat,
    payload.origin.lng,
    payload.destination.lat,
    payload.destination.lng
  );

  const timeSeconds = Math.max(payload.time_delta_seconds, 0.1);
  const velocityKmh = Math.round((distance / timeSeconds) * 3600);
  const isThreat = velocityKmh > 1000;

  return {
    ...payload,
    distance_km: distance,
    velocity_kmh: velocityKmh,
    status: isThreat ? 'FLAGGED THREAT' : 'VERIFIED',
  };
}

// ============================================================================
// AGENT 2 & 4: @TelemetryStream & @CanvasUI - Complete React Component
// ============================================================================

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

  const activeArcsRef = useRef<ActiveArc[]>([]);
  const activePinsRef = useRef<ActivePingPin[]>([]);
  const tagSessionStoreRef = useRef<Map<string, { origin: LocationNode; timestamp: number }>>(new Map());

  // Available Simulation Cities
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

  // Process incoming telemetry payload
  const processPayload = (rawPayload: TelemetryPayload) => {
    const evaluated = evaluateSecurityThreat(rawPayload);

    setTotalScans((prev) => prev + 1);
    if (evaluated.status === 'FLAGGED THREAT') {
      setAnomaliesBlocked((prev) => prev + 1);
    }

    setTelemetryFeed((prev) => [evaluated, ...prev.slice(0, 49)]);

    // Add active ping pin (TTL: 5000ms)
    const pinId = `${evaluated.origin.city}-${Date.now()}`;
    activePinsRef.current.push({
      id: pinId,
      city: evaluated.origin.city,
      lat: evaluated.origin.lat,
      lng: evaluated.origin.lng,
      isThreat: evaluated.status === 'FLAGGED THREAT',
      spawnTime: Date.now()
    });

    // Add Quadratic Arc trajectory when tap_sequence == 2 & destination exists
    if (evaluated.tap_sequence === 2 && evaluated.destination) {
      activeArcsRef.current.push({
        origin: evaluated.origin,
        destination: evaluated.destination,
        startTime: Date.now(),
        isThreat: evaluated.status === 'FLAGGED THREAT'
      });

      // Pin destination as well
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

  // Trigger Houston -> Denver Replay Attack Simulation
  const triggerHoustonDenverAttack = () => {
    const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
    const houston = CITIES[0]; // Houston
    const denver = CITIES[5];  // Denver

    // Tap 1
    processPayload({
      timestamp: new Date().toLocaleTimeString(),
      tag_id: tagId,
      origin: houston,
      destination: null,
      tap_sequence: 1,
      time_delta_seconds: 0,
      distance_km: 0
    });

    // Tap 2 (Replay Attack 0.45s later!)
    setTimeout(() => {
      processPayload({
        timestamp: new Date().toLocaleTimeString(),
        tag_id: tagId,
        origin: houston,
        destination: denver,
        tap_sequence: 2,
        time_delta_seconds: 0.45,
        distance_km: 1478
      });
    }, 1200);
  };

  // Mock SSE / WebSockets Generator
  useEffect(() => {
    // Initial Trigger
    triggerHoustonDenverAttack();

    // Streaming Event Loop (Every 12s)
    const interval = setInterval(() => {
      const isReplay = Math.random() < 0.2;
      const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
      const c1 = CITIES[Math.floor(Math.random() * CITIES.length)];

      if (!isReplay) {
        processPayload({
          timestamp: new Date().toLocaleTimeString(),
          tag_id: tagId,
          origin: c1,
          destination: null,
          tap_sequence: 1,
          time_delta_seconds: 0,
          distance_km: 0
        });
      } else {
        let c2 = CITIES[Math.floor(Math.random() * CITIES.length)];
        while (c2.city === c1.city) c2 = CITIES[Math.floor(Math.random() * CITIES.length)];
        const dist = haversineDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);

        processPayload({
          timestamp: new Date().toLocaleTimeString(),
          tag_id: tagId,
          origin: c1,
          destination: c2,
          tap_sequence: 2,
          time_delta_seconds: parseFloat((Math.random() * 2 + 0.2).toFixed(2)),
          distance_km: dist
        });
      }
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  // 60 FPS Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 520);

      // 1. Draw Vector Basemap
      drawVectorBasemap(ctx, width, height);

      const now = Date.now();

      // 2. Filter & Draw Dynamic Ping Pins (TTL: 5000ms)
      activePinsRef.current = activePinsRef.current.filter((pin) => now - pin.spawnTime < 5000);
      activePinsRef.current.forEach((pin) => {
        const { x, y } = latLngToCanvas(pin.lat, pin.lng, width, height);
        const age = now - pin.spawnTime;
        const fadeRatio = 1 - age / 5000;

        // Expanding Ripple Circle
        const rippleRadius = (age / 5000) * 24;
        ctx.beginPath();
        ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = pin.isThreat ? `rgba(239, 68, 68, ${fadeRatio * 0.8})` : `rgba(16, 185, 129, ${fadeRatio * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin Core Dot
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = pin.isThreat ? '#ef4444' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // City Label
        ctx.fillStyle = `rgba(255, 255, 255, ${fadeRatio})`;
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.fillText(pin.city, x + 8, y + 3);
      });

      // 3. Draw Quadratic Bezier Arc Laser Beams (Tap Sequence == 2)
      activeArcsRef.current = activeArcsRef.current.filter((arc) => now - arc.startTime < 2400);
      activeArcsRef.current.forEach((arc) => {
        const progress = Math.min((now - arc.startTime) / 2400, 1.0);
        const p1 = latLngToCanvas(arc.origin.lat, arc.origin.lng, width, height);
        const p2 = latLngToCanvas(arc.destination.lat, arc.destination.lng, width, height);

        const midX = (p1.x + p2.x) / 2;
        const midY = Math.min(p1.y, p2.y) - Math.abs(p1.x - p2.x) * 0.28;

        // Arc Path
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        ctx.strokeStyle = arc.isThreat
          ? `rgba(239, 68, 68, ${0.9 * (1 - progress)})`
          : `rgba(16, 185, 129, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = arc.isThreat ? 3.5 : 2;
        ctx.setLineDash(arc.isThreat ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animated Trailing Laser Particle
        const t = progress;
        const currX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
        const currY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;

        ctx.beginPath();
        ctx.arc(currX, currY, arc.isThreat ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = arc.isThreat ? '#ef4444' : '#10b981';
        ctx.shadowColor = arc.isThreat ? '#ef4444' : '#10b981';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#030712] text-slate-100 p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">QN Swarm Orchestrated Engine Active</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Telemetry Map</h1>
          <p className="text-sm text-slate-400">Real-time vector GIS basemap, impossible velocity evaluation, and live quadratic Bezier arc canvas.</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={triggerHoustonDenverAttack}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            ⚡ Trigger Houston→Denver Attack
          </button>
        </div>
      </header>

      {/* KPI Cards Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Total Security Scans</span>
            <span>📊</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">{totalScans.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 font-semibold">+12.4%</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Active NFC DNA Chips</span>
            <span>🔐</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white">350,000</span>
            <span className="text-xs text-blue-400 font-semibold">NTAG 424 DNA</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Anomalies Blocked</span>
            <span>🚨</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-red-400">{anomaliesBlocked.toLocaleString()}</span>
            <span className="text-xs text-red-400 font-mono font-bold">100% Mitigated</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
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

      {/* Main Grid: Left Vector Map Pane + Right Telemetry Sidebar */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Pane: Vector GIS Basemap Canvas */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-sm relative space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>🗺️ Vector GIS Basemap & Live Arc Layer</span>
            </h2>
            <div class font-mono text-xs text-emerald-400 flex items-center space-x-2>
              <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>60 FPS Render Active</span>
            </div>
          </div>

          <div className="w-full h-[520px] relative rounded-lg overflow-hidden border border-slate-800 bg-[#030712]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Right Pane: Auto-Scrolling Telemetry Sidebar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[600px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Telemetry Stream</h2>
              <p className="text-xs text-slate-400">JSON Schema Scan Events</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse">
              LIVE SSE
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {telemetryFeed.map((evt, idx) => (
              <div
                key={`${evt.tag_id}-${idx}`}
                className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${
                  evt.status === 'VERIFIED'
                    ? 'bg-slate-950 border-slate-800 text-slate-300'
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
                      Delta: <strong>{evt.time_delta_seconds}s</strong>
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
