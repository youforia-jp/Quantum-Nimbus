'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as d3Geo from 'd3-geo';

// ============================================================================
// QUANTUM NIMBUS V3 ENTERPRISE THREAT MAP ENGINE
// Features: 2D/3D Globe Toggle, Hover Tooltips, Filter Bar, Time Scrubber, SSE WS Adapter
// ============================================================================

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

// Authentic World Vector Polygons
const WORLD_CONTINENTS: { name: string; polygon: [number, number][] }[] = [
  {
    name: 'North America',
    polygon: [
      [-168, 65], [-150, 70], [-130, 70], [-100, 75], [-75, 78], [-60, 60],
      [-64, 46], [-70, 42], [-75, 35], [-80, 25], [-90, 20], [-92, 15],
      [-105, 20], [-117, 32], [-124, 48], [-140, 60], [-168, 65]
    ]
  },
  {
    name: 'United States Primary',
    polygon: [
      [-124.7, 48.4], [-123.0, 49.0], [-89.0, 48.0], [-67.0, 45.0],
      [-75.0, 35.0], [-80.0, 25.0], [-97.0, 26.0], [-117.0, 32.5], [-124.7, 48.4]
    ]
  },
  {
    name: 'South America',
    polygon: [
      [-78, 11], [-60, 8], [-35, -5], [-37, -12], [-48, -28], [-57, -38],
      [-68, -55], [-75, -45], [-72, -18], [-80, -2], [-78, 11]
    ]
  },
  {
    name: 'Europe',
    polygon: [
      [-9, 36], [-9, 43], [-4, 48], [2, 51], [5, 60], [10, 62], [25, 70],
      [32, 70], [40, 60], [40, 45], [26, 40], [22, 38], [15, 38], [9, 42], [-9, 36]
    ]
  },
  {
    name: 'British Isles',
    polygon: [[-10, 50], [-5, 59], [1, 53], [-4, 50], [-10, 50]]
  },
  {
    name: 'Africa',
    polygon: [
      [-17, 14], [-17, 21], [-5, 36], [11, 37], [32, 31], [43, 12],
      [51, 11], [40, -10], [33, -27], [26, -34], [18, -34], [12, -17],
      [9, 5], [-17, 14]
    ]
  },
  {
    name: 'Asia',
    polygon: [
      [32, 31], [40, 45], [40, 60], [60, 70], [100, 75], [170, 68],
      [140, 50], [120, 30], [108, 10], [98, 8], [80, 15], [60, 25], [43, 12], [32, 31]
    ]
  },
  {
    name: 'Japan',
    polygon: [[130, 31], [132, 34], [140, 36], [142, 44], [140, 45], [136, 36], [130, 31]]
  },
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

  // Feature States
  const [projectionMode, setProjectionMode] = useState<'2d' | '3d'>('2d');
  const [filterMode, setFilterMode] = useState<'all' | 'threats' | 'us'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [timeMode, setTimeMode] = useState<'live' | '1h' | '24h'>('live');
  const [scrubberValue, setScrubberValue] = useState<number>(100);

  const [hoveredNode, setHoveredNode] = useState<LocationNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const [telemetryFeed, setTelemetryFeed] = useState<TelemetryPayload[]>([]);
  const [anomaliesBlocked, setAnomaliesBlocked] = useState<number>(4144);
  const [totalScans, setTotalScans] = useState<number>(1482978);

  const activeArcsRef = useRef<ActiveArc[]>([]);
  const activePinsRef = useRef<ActivePingPin[]>([]);
  const rotationAngleRef = useRef<number>(0);

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

  // Threat Evaluator
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

  // Streaming Telemetry Loop (Updates every 3.5s)
  useEffect(() => {
    triggerHoustonDenverAttack();

    const interval = setInterval(() => {
      if (timeMode !== 'live') return; // Pause live updates when scrubbing

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

  // Hover Detection on Canvas
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
        const p = d3Geo.geoOrthographic().scale(height / 2.2).translate([width / 2, height / 2]).rotate([rotationAngleRef.current, -15]);
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

  // Canvas 60 FPS Render Loop (Supports 2D Flat & 3D Globe Projection)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 800);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 520);

      // 1. Dark Ocean Backdrop (#030712)
      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, width, height);

      // Select Projection Engine
      let projection: d3Geo.GeoProjection;
      if (projectionMode === '2d') {
        projection = d3Geo.geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2 + 20]);
      } else {
        rotationAngleRef.current = (rotationAngleRef.current + 0.25) % 360;
        projection = d3Geo.geoOrthographic().scale(height / 2.3).translate([width / 2, height / 2]).rotate([rotationAngleRef.current, -15]);

        // 3D Globe Sphere Atmosphere Outline
        const center = projection([0, 0]);
        if (center) {
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, height / 2.3, 0, Math.PI * 2);
          ctx.fillStyle = '#050a17';
          ctx.fill();
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      const pathGenerator = d3Geo.geoPath().projection(projection).context(ctx);

      // 2. Graticule Lat/Lng Overlay Grid (#0f2038)
      ctx.strokeStyle = 'rgba(15, 32, 56, 0.6)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 4]);
      const graticule = d3Geo.geoGraticule10();
      ctx.beginPath();
      pathGenerator(graticule);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Render World Vector Continents (#0d1726 fill, #1e3a5f border)
      WORLD_CONTINENTS.forEach((cont) => {
        ctx.beginPath();
        cont.polygon.forEach(([lng, lat], idx) => {
          const pt = projection([lng, lat]);
          if (!pt) return;
          if (idx === 0) ctx.moveTo(pt[0], pt[1]);
          else ctx.lineTo(pt[0], pt[1]);
        });
        ctx.closePath();

        if (cont.name === 'United States Primary') {
          ctx.fillStyle = 'rgba(16, 185, 129, 0.06)';
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
        const pt = projection([pin.lng, pin.lat]);
        if (!pt) return;
        const [x, y] = pt;

        const age = now - pin.spawnTime;
        const fade = 1 - age / 5000;
        const radius = (age / 5000) * 28;

        // Ripple Circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = pin.isThreat ? `rgba(239, 68, 68, ${fade * 0.9})` : `rgba(16, 185, 129, ${fade * 0.9})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Core Pin Dot
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

      // 5. Render Quadratic Bezier Arc Trajectories
      activeArcsRef.current = activeArcsRef.current.filter((arc) => now - arc.startTime < 2400);
      activeArcsRef.current.forEach((arc) => {
        const p1 = projection([arc.origin.lng, arc.origin.lat]);
        const p2 = projection([arc.destination.lng, arc.destination.lat]);
        if (!p1 || !p2) return;

        const progress = Math.min((now - arc.startTime) / 2400, 1.0);
        const midX = (p1[0] + p2[0]) / 2;
        const midY = Math.min(p1[1], p2[1]) - Math.abs(p1[0] - p2[0]) * 0.28;

        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.quadraticCurveTo(midX, midY, p2[0], p2[1]);
        ctx.strokeStyle = arc.isThreat
          ? `rgba(239, 68, 68, ${0.95 * (1 - progress)})`
          : `rgba(16, 185, 129, ${0.85 * (1 - progress)})`;
        ctx.lineWidth = arc.isThreat ? 3.5 : 2;
        ctx.setLineDash(arc.isThreat ? [6, 4] : []);
        ctx.stroke();
        ctx.setLineDash([]);

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
  }, [projectionMode]);

  // Filtering Telemetry Stream Data
  const filteredTelemetry = telemetryFeed.filter((item) => {
    if (filterMode === 'threats' && item.status !== 'FLAGGED THREAT') return false;
    if (filterMode === 'us' && !item.origin.country.includes('US')) return false;
    if (searchQuery.trim() !== '' && !item.tag_id.toLowerCase().includes(searchQuery.toLowerCase()) && !item.origin.city.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
              QN V3 Enterprise Threat Telemetry Suite Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Map & Operations Center</h1>
          <p className="text-sm text-slate-400">Real-time vector GIS projection, impossible velocity analysis, and post-incident time scrubber.</p>
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

      {/* Main Grid: Map Viewport + Control Bar + Telemetry Feed */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Map & Filter Controls */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Filter Bar & Projection Mode Selector */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
            
            <!-- Filters -->
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

            <!-- Projection Toggle (2D Flat vs 3D Globe) -->
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setProjectionMode('2d')}
                className={`px-2.5 py-1 rounded transition-all ${
                  projectionMode === '2d' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold' : 'text-slate-400'
                }`}
              >
                🗺️ 2D Flat
              </button>
              <button
                onClick={() => setProjectionMode('3d')}
                className={`px-2.5 py-1 rounded transition-all ${
                  projectionMode === '3d' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold' : 'text-slate-400'
                }`}
              >
                🌐 3D Globe
              </button>
            </div>
          </div>

          {/* Map Viewport Canvas with Glassmorphic Tooltip */}
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

          {/* Historical Incident Time Scrubber Bar */}
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

        {/* Right Column: Glassmorphic Telemetry Feed & Search */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4 flex flex-col h-[630px] backdrop-blur-md">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Live Telemetry Stream</h2>
              <p className="text-xs text-slate-400 font-mono">Filtered Security Events</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-950 text-emerald-400 border border-emerald-800 animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> SSE WS ACTIVE
            </span>
          </div>

          <!-- Tag Search Input -->
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
