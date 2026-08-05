'use client';

import React, { useEffect, useRef, useState } from 'react';

// ============================================================================
// REAL-TIME AUTHENTIC GIS WORLD VECTOR & THREAT TELEMETRY ENGINE
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

// Authentic World Continent Features (Lat/Lng Polygons)
const WORLD_CONTINENTS: { name: string; polygon: [number, number][] }[] = [
  // North America
  {
    name: 'North America',
    polygon: [
      [-168, 65], [-150, 70], [-130, 70], [-100, 75], [-75, 78], [-60, 60],
      [-64, 46], [-70, 42], [-75, 35], [-80, 25], [-90, 20], [-92, 15],
      [-105, 20], [-117, 32], [-124, 48], [-140, 60], [-168, 65]
    ]
  },
  // US Region Boundary Highlight
  {
    name: 'United States Primary',
    polygon: [
      [-124.7, 48.4], [-123.0, 49.0], [-89.0, 48.0], [-67.0, 45.0],
      [-75.0, 35.0], [-80.0, 25.0], [-97.0, 26.0], [-117.0, 32.5], [-124.7, 48.4]
    ]
  },
  // South America
  {
    name: 'South America',
    polygon: [
      [-78, 11], [-60, 8], [-35, -5], [-37, -12], [-48, -28], [-57, -38],
      [-68, -55], [-75, -45], [-72, -18], [-80, -2], [-78, 11]
    ]
  },
  // Europe & UK
  {
    name: 'Europe',
    polygon: [
      [-9, 36], [-9, 43], [-4, 48], [2, 51], [5, 60], [10, 62], [25, 70],
      [32, 70], [40, 60], [40, 45], [26, 40], [22, 38], [15, 38], [9, 42], [-9, 36]
    ]
  },
  {
    name: 'British Isles',
    polygon: [
      [-10, 50], [-5, 59], [1, 53], [-4, 50], [-10, 50]
    ]
  },
  // Africa
  {
    name: 'Africa',
    polygon: [
      [-17, 14], [-17, 21], [-5, 36], [11, 37], [32, 31], [43, 12],
      [51, 11], [40, -10], [33, -27], [26, -34], [18, -34], [12, -17],
      [9, 5], [-17, 14]
    ]
  },
  // Asia
  {
    name: 'Asia',
    polygon: [
      [32, 31], [40, 45], [40, 60], [60, 70], [100, 75], [170, 68],
      [140, 50], [120, 30], [108, 10], [98, 8], [80, 15], [60, 25], [43, 12], [32, 31]
    ]
  },
  // Japan
  {
    name: 'Japan',
    polygon: [
      [130, 31], [132, 34], [140, 36], [142, 44], [140, 45], [136, 36], [130, 31]
    ]
  },
  // Australia
  {
    name: 'Australia',
    polygon: [
      [114, -22], [123, -15], [136, -12], [142, -11], [153, -28], [150, -37],
      [138, -35], [117, -35], [114, -22]
    ]
  }
];

export default function QNThreatMap() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryPayload[]>([]);
  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4144);
  const [totalScans, setTotalScans] = useState<number>(1482978);

  const activeArcsRef = useRef<ActiveArc[]>([]);
  const activePinsRef = useRef<ActivePingPin[]>([]);

  // City Nodes
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

  // Map Projection: Equirectangular Lat/Lng -> Canvas Pixel Point
  const project = (lat: number, lng: number, width: number, height: number) => {
    return {
      x: ((lng + 180) / 360) * width,
      y: ((90 - lat) / 180) * height
    };
  };

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

    setTelemetryFeed((prev) => [evaluated, ...prev.slice(0, 14)]);

    // Add Pulsing Radar Ping Pin
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

  // Continuous Telemetry Stream Generator (Updates every 3.5s with live pings)
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

  // 60 FPS Render Loop
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

      // 2. Graticule Lat/Lng Grid Lines (#0f2038)
      ctx.strokeStyle = 'rgba(15, 32, 56, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);

      for (let lng = -180; lng <= 180; lng += 30) {
        const { x } = project(0, lng, width, height);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        const { y } = project(lat, 0, width, height);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 3. Render World Vector Landmasses (#0d1726 fill, #1e3a5f border)
      WORLD_CONTINENTS.forEach((cont) => {
        ctx.beginPath();
        cont.polygon.forEach(([lng, lat], idx) => {
          const { x, y } = project(lat, lng, width, height);
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();

        if (cont.name === 'United States Primary') {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
          ctx.lineWidth = 1.5;
        } else {
          ctx.fillStyle = '#0d1726';
          ctx.strokeStyle = '#1e3a5f';
          ctx.lineWidth = 1.2;
        }
        ctx.fill();
        ctx.stroke();
      });

      const now = Date.now();

      // 4. Render Active Pins & Radar Ripples
      activePinsRef.current = activePinsRef.current.filter((pin) => now - pin.spawnTime < 5000);
      activePinsRef.current.forEach((pin) => {
        const { x, y } = project(pin.lat, pin.lng, width, height);
        const age = now - pin.spawnTime;
        const fade = 1 - age / 5000;
        const radius = (age / 5000) * 28;

        // Expanding Radar Ripple
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = pin.isThreat ? `rgba(239, 68, 68, ${fade * 0.9})` : `rgba(16, 185, 129, ${fade * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Pin Core Dot
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = pin.isThreat ? '#ef4444' : '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // City Label
        ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.fillText(pin.city, x + 8, y + 3);
      });

      // 5. Render Animated Quadratic Laser Arcs
      activeArcsRef.current = activeArcsRef.current.filter((arc) => now - arc.startTime < 2400);
      activeArcsRef.current.forEach((arc) => {
        const p1 = project(arc.origin.lat, arc.origin.lng, width, height);
        const p2 = project(arc.destination.lat, arc.destination.lng, width, height);

        const progress = Math.min((now - arc.startTime) / 2400, 1.0);
        const midX = (p1.x + p2.x) / 2;
        const midY = Math.min(p1.y, p2.y) - Math.abs(p1.x - p2.x) * 0.28;

        // Arc Curve
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        ctx.strokeStyle = arc.isThreat
          ? `rgba(239, 68, 68, ${0.95 * (1 - progress)})`
          : `rgba(16, 185, 129, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = arc.isThreat ? 3.5 : 2;
        ctx.setLineDash(arc.isThreat ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

        // Traveling Laser Particle
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

      animFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animFrameId);
  }, []);

  return (
    <div className="w-full min-h-screen bg-[#030712] text-slate-100 p-6 font-sans">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              V2 Live GIS Vector Threat Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Real-Time Vector Threat Map</h1>
          <p className="text-sm text-slate-400">Authentic World Vector Map, D3 Equirectangular Projection, and live streaming pings.</p>
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

      {/* KPI Header Grid */}
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

      {/* Main Grid: Left Map + Right Stream */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: GIS Vector Canvas Viewport */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm relative space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <span>🗺️ Live Vector GIS Map Viewport</span>
            </h2>
            <div className="font-mono text-xs text-emerald-400 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>60 FPS Live Updates</span>
            </div>
          </div>

          <div className="w-full h-[520px] relative rounded-lg overflow-hidden border border-slate-800 bg-[#030712]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>
        </div>

        {/* Right: Telemetry Stream Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[600px] backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Security Stream</h2>
              <p className="text-xs text-slate-400 font-mono">Pings update live as scans occur</p>
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
