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
  batch_id: string;
  sequence_num: string;
  origin: LocationNode;
  destination: LocationNode | null;
  tap_sequence: number;
  delta_seconds: number;
  distance_km: number;
  velocity_kmh?: number;
  status: 'VERIFIED' | 'REPLAY_ATTACK' | 'CRYPTO_FAIL';
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

  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    tagId: string;
    batchId: string;
    sequenceNum: string;
    cmacStatus: string;
    chips: number;
    latencyText: string;
    extra: string;
    status: 'VERIFIED' | 'REPLAY_ATTACK' | 'CRYPTO_FAIL' | 'HQ';
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const [replaysCaught, setReplaysCaught] = useState<number>(1829);
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

  const processPayload = (rawPayload: Omit<TelemetryPayload, 'timestampMs' | 'status' | 'batch_id' | 'sequence_num'>, forceType: 'VERIFIED' | 'REPLAY_ATTACK' | 'CRYPTO_FAIL' = 'VERIFIED') => {
    const now = Date.now();
    setTotalScans((prev) => prev + 1);

    let status: 'VERIFIED' | 'REPLAY_ATTACK' | 'CRYPTO_FAIL' = forceType;
    if (forceType === 'CRYPTO_FAIL') {
      setAnomaliesBlocked((prev) => prev + 1);
    } else if (forceType === 'REPLAY_ATTACK') {
      setReplaysCaught((prev) => prev + 1);
      masterEventHistoryRef.current.forEach((evt) => {
        if (evt.tag_id === rawPayload.tag_id && evt.status === 'VERIFIED') {
          evt.status = 'REPLAY_ATTACK';
        }
      });
    }

    const R = 6371;
    let distKm = 0;
    let velKmh = 0;

    if (rawPayload.destination) {
      const dLat = ((rawPayload.destination.lat - rawPayload.origin.lat) * Math.PI) / 180;
      const dLon = ((rawPayload.destination.lng - rawPayload.origin.lng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((rawPayload.origin.lat * Math.PI) / 180) *
          Math.cos((rawPayload.destination.lat * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distKm = Math.round(R * c);
      velKmh = Math.round(distKm / (Math.max(rawPayload.delta_seconds, 0.1) / 3600));
    }

    const batchNum = Math.floor(Math.random() * 8900 + 1000);

    const evaluated: TelemetryPayload = {
      ...rawPayload,
      batch_id: `BATCH-2026-QN-${batchNum}`,
      sequence_num: rawPayload.destination ? 'Sequence #002 (Replay)' : 'Sequence #001 (Tap 1)',
      timestampMs: now,
      distance_km: distKm,
      velocity_kmh: velKmh,
      status
    };

    masterEventHistoryRef.current.unshift(evaluated);
    if (masterEventHistoryRef.current.length > 300) {
      masterEventHistoryRef.current.pop();
    }
  };

  const triggerReplayAttack = () => {
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
    }, 'VERIFIED');

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
      }, 'REPLAY_ATTACK');
    }, 1200);
  };

  const triggerCryptoFail = () => {
    const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
    processPayload({
      id: `evt-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      tag_id: tagId,
      origin: CITIES[2],
      destination: CITIES[1],
      tap_sequence: 2,
      delta_seconds: 0.35,
      distance_km: 4140
    }, 'CRYPTO_FAIL');
  };

  // Continuous Streaming Loop
  useEffect(() => {
    triggerReplayAttack();

    const interval = setInterval(() => {
      const rand = Math.random();
      const tagId = `NTAG-424-${Math.floor(Math.random() * 8999 + 1000)}`;
      const c1 = CITIES[Math.floor(Math.random() * CITIES.length)];

      if (rand < 0.55) {
        processPayload({
          id: `evt-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          tag_id: tagId,
          origin: c1,
          destination: null,
          tap_sequence: 1,
          delta_seconds: 0,
          distance_km: 0
        }, 'VERIFIED');
      } else if (rand < 0.85) {
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
        }, 'REPLAY_ATTACK');
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
          delta_seconds: 0.4,
          distance_km: 0
        }, 'CRYPTO_FAIL');
      }
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  // Hover Detection for Nodes & Events
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const width = canvas.width;
    const height = canvas.height;

    let foundCity: LocationNode | null = null;
    let foundEvt: TelemetryPayload | null = null;

    let projection = projectionMode === '2d'
      ? d3Geo.geoEquirectangular().scale(width / (2 * Math.PI)).translate([width / 2, height / 2 + 20])
      : d3Geo.geoOrthographic().scale(height / 2.3).translate([width / 2, height / 2]).rotate([rotationAngleRef.current, -15]);

    const targetTimeMs = Date.now() - (scrubberSecondsAgo * 1000);
    const visibleEvents = masterEventHistoryRef.current.filter(
      (evt) => evt.timestampMs <= targetTimeMs && targetTimeMs - evt.timestampMs < 12000
    );

    visibleEvents.forEach((evt) => {
      const pt1 = projection([evt.origin.lng, evt.origin.lat]);
      if (pt1 && Math.hypot(mouseX - pt1[0], mouseY - pt1[1]) < 16) {
        foundEvt = evt;
      }
      if (evt.destination) {
        const pt2 = projection([evt.destination.lng, evt.destination.lat]);
        if (pt2 && Math.hypot(mouseX - pt2[0], mouseY - pt2[1]) < 16) {
          foundEvt = evt;
        }
      }
    });

    if (!foundEvt) {
      CITIES.forEach((city) => {
        const pt = projection([city.lng, city.lat]);
        if (pt && Math.hypot(mouseX - pt[0], mouseY - pt[1]) < 14) {
          foundCity = city;
        }
      });
    }

    if (foundEvt) {
      setTooltipPos({ x: mouseX, y: mouseY });
      setHoveredInfo({
        title: `${(foundEvt as TelemetryPayload).origin.city} ${(foundEvt as TelemetryPayload).destination ? `➔ ${(foundEvt as TelemetryPayload).destination?.city}` : ''}`,
        tagId: (foundEvt as TelemetryPayload).tag_id,
        batchId: (foundEvt as TelemetryPayload).batch_id,
        sequenceNum: (foundEvt as TelemetryPayload).sequence_num,
        cmacStatus: (foundEvt as TelemetryPayload).status === 'REPLAY_ATTACK'
          ? '⚠️ TOKEN REUSED / REPLAYED'
          : (foundEvt as TelemetryPayload).status === 'CRYPTO_FAIL'
            ? '🚨 INVALID AES-128 CMAC HASH'
            : 'AES-128 SUN CMAC Verified',
        chips: (foundEvt as TelemetryPayload).origin.activeChips,
        latencyText: `${(foundEvt as TelemetryPayload).origin.avgLatencyMs} ms (${(foundEvt as TelemetryPayload).velocity_kmh?.toLocaleString()} km/h)`,
        extra: `BioTrack / Traceability Sync: PASSED | Timestamp: ${(foundEvt as TelemetryPayload).timestamp}`,
        status: (foundEvt as TelemetryPayload).status
      });
    } else if (foundCity) {
      setTooltipPos({ x: mouseX, y: mouseY });
      setHoveredInfo({
        title: `${foundCity.city}, ${foundCity.country}`,
        tagId: 'NTAG-424-DNA-MESH',
        batchId: 'BATCH-2026-QN-MAIN',
        sequenceNum: 'Sequence #000 (Active Listener)',
        cmacStatus: 'AES-128 SUN Listener Ready',
        chips: foundCity.activeChips,
        latencyText: `${foundCity.avgLatencyMs} ms`,
        extra: 'Haversine Impossible Velocity Engine: ACTIVE',
        status: 'HQ'
      });
    } else {
      setHoveredInfo(null);
      setTooltipPos(null);
    }
  };

  // Canvas Render Loop
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

      const targetTimeMs = Date.now() - (scrubberSecondsAgo * 1000);
      const visibleEvents = masterEventHistoryRef.current.filter(
        (evt) => evt.timestampMs <= targetTimeMs && targetTimeMs - evt.timestampMs < 12000
      );

      visibleEvents.forEach((evt) => {
        const age = targetTimeMs - evt.timestampMs;
        const fade = Math.max(0.1, 1 - age / 12000);
        const radius = (age / 12000) * 28;

        let mainColor = '#10b981';
        let arcColorStr = `rgba(16, 185, 129, ${0.85 * (1 - Math.min(age / 2400, 1.0))})`;

        if (evt.status === 'REPLAY_ATTACK') {
          mainColor = '#eab308';
          arcColorStr = `rgba(234, 179, 8, ${0.95 * (1 - Math.min(age / 2400, 1.0))})`;
        } else if (evt.status === 'CRYPTO_FAIL') {
          mainColor = '#ef4444';
          arcColorStr = `rgba(239, 68, 68, ${0.95 * (1 - Math.min(age / 2400, 1.0))})`;
        }

        const pt1 = projection([evt.origin.lng, evt.origin.lat]);
        if (pt1) {
          const [x, y] = pt1;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2, radius), 0, Math.PI * 2);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = mainColor;
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
            ctx.fillStyle = mainColor;
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
            ctx.strokeStyle = arcColorStr;
            ctx.lineWidth = evt.status !== 'VERIFIED' ? 3.5 : 2;
            ctx.setLineDash(evt.status !== 'VERIFIED' ? [6, 4] : []);
            ctx.stroke();
            ctx.setLineDash([]);

            const t = Math.max(0.01, Math.min(progress, 0.99));
            const currX = (1 - t) * (1 - t) * pt1[0] + 2 * (1 - t) * t * midX + t * t * pt2[0];
            const currY = (1 - t) * (1 - t) * pt1[1] + 2 * (1 - t) * t * midY + t * t * pt2[1];

            ctx.beginPath();
            ctx.arc(currX, currY, evt.status !== 'VERIFIED' ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = mainColor;
            ctx.shadowColor = mainColor;
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

  const targetTimeMs = Date.now() - (scrubberSecondsAgo * 1000);
  const activeFeedList = masterEventHistoryRef.current.filter((evt) => evt.timestampMs <= targetTimeMs);

  const filteredTelemetry = activeFeedList.filter((item) => {
    if (filterMode === 'threats' && item.status === 'VERIFIED') return false;
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
              Cryptographic Threat Classification Engine Active
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quantum Nimbus Threat Map & Operations Center</h1>
          <p className="text-sm text-slate-400">Hover over any node or laser arc to inspect Batch ID, AES-128 SUN CMAC, and velocity telemetry.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={triggerReplayAttack}
            className="bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            ⚠️ Replay Attack (Yellow)
          </button>
          <button
            onClick={triggerCryptoFail}
            className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-lg transition-colors cursor-pointer"
          >
            🚨 Crypto Fail (Red)
          </button>
        </div>
      </header>

      {/* Demo Disclaimer Banner */}
      <div className="max-w-7xl mx-auto bg-amber-950/40 border border-amber-500/30 rounded-xl p-3.5 mb-6 flex items-start sm:items-center gap-3 text-amber-200 text-xs font-mono backdrop-blur-md">
        <span className="text-amber-400 text-base leading-none">⚠️</span>
        <div>
          <strong className="text-amber-300 font-bold uppercase tracking-wider">Demo Simulation Notice:</strong> The frequency of simulated Replay Attacks (Yellow) and Inauthentic Cryptographic CMAC Signatures (Red) is artificially elevated for interactive demonstration and real-time visualization purposes.
        </div>
      </div>

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
            <span>Replay Attacks Caught</span>
            <span>⚠️</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-yellow-400">{replaysCaught.toLocaleString()}</span>
            <span className="text-xs text-yellow-400 font-mono">Yellow Both Pings</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
            <span>Crypto Failures Blocked</span>
            <span>🚨</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-red-400">{anomaliesBlocked.toLocaleString()}</span>
            <span className="text-xs text-red-400 font-mono font-bold">Red Bad CMAC</span>
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
                onMouseLeave={() => { setHoveredInfo(null); setTooltipPos(null); }}
                className="w-full h-full block cursor-crosshair"
              />

              {/* Rich Glassmorphic Popover Tooltip */}
              {hoveredInfo && tooltipPos && (
                <div
                  className="absolute z-50 bg-slate-900/95 border border-emerald-500/50 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs font-mono space-y-1.5 pointer-events-none transition-all max-w-xs"
                  style={{ left: Math.min(tooltipPos.x + 15, 450), top: Math.min(tooltipPos.y + 15, 360) }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-bold">
                    <span className="text-emerald-400">{hoveredInfo.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${
                      hoveredInfo.status === 'REPLAY_ATTACK'
                        ? 'bg-yellow-950 text-yellow-300 border-yellow-800'
                        : hoveredInfo.status === 'CRYPTO_FAIL'
                          ? 'bg-red-950 text-red-300 border-red-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }`}>
                      {hoveredInfo.status === 'REPLAY_ATTACK' ? '⚠️ REPLAY ATTACK' : hoveredInfo.status === 'CRYPTO_FAIL' ? '🚨 BAD CRYPTO SIG' : 'VERIFIED TAP'}
                    </span>
                  </div>
                  <div className="text-slate-300">Tag ID: <strong className="text-white">{hoveredInfo.tagId}</strong></div>
                  <div className="text-slate-300">Batch ID: <strong className="text-sky-400">{hoveredInfo.batchId}</strong></div>
                  <div className="text-slate-300">Tap Counter: <strong className="text-slate-100">{hoveredInfo.sequenceNum}</strong></div>
                  <div className="text-slate-300">CMAC Crypto: <strong className={
                    hoveredInfo.status === 'REPLAY_ATTACK' ? 'text-yellow-400' : hoveredInfo.status === 'CRYPTO_FAIL' ? 'text-red-400' : 'text-emerald-400'
                  }>{hoveredInfo.cmacStatus}</strong></div>
                  <div className="text-slate-300">Active Chips: <strong className="text-white">{hoveredInfo.chips.toLocaleString()}</strong></div>
                  <div className="text-slate-300">Mesh Latency: <strong className="text-emerald-400">{hoveredInfo.latencyText}</strong></div>
                  <div className="text-slate-400 text-[10px] pt-1 border-t border-slate-800">{hoveredInfo.extra}</div>
                </div>
              )}
            </div>

            {/* Color Classification Legend */}
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono gap-2 text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-200">🟢 Green: Authentic Tap 1</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                <span className="text-slate-200">🟡 Yellow: Replay Attack (Both Pings Turn Yellow)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-slate-200">🔴 Red: Bad Cryptographic Signature</span>
              </div>
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
            {filteredTelemetry.slice(0, 40).map((evt) => {
              let cardClass = 'bg-slate-950/80 border-slate-800 text-slate-300';
              let badgeClass = 'bg-emerald-950 text-emerald-400 border border-emerald-800';
              let statusText = 'VERIFIED';
              let velColor = 'text-emerald-400';

              if (evt.status === 'REPLAY_ATTACK') {
                cardClass = 'bg-yellow-950/40 border-yellow-500/50 text-yellow-100';
                badgeClass = 'bg-yellow-900 text-yellow-200 border border-yellow-700';
                statusText = '⚠️ REPLAY ATTACK';
                velColor = 'text-yellow-400';
              } else if (evt.status === 'CRYPTO_FAIL') {
                cardClass = 'bg-red-950/40 border-red-500/50 text-red-200';
                badgeClass = 'bg-red-900 text-red-200 border border-red-700';
                statusText = '🚨 BAD CRYPTO SIG';
                velColor = 'text-red-400';
              }

              return (
                <div
                  key={evt.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 transition-all ${cardClass}`}
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-slate-500">{evt.timestamp}</span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${badgeClass}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="font-mono font-semibold text-slate-100 flex justify-between">
                    <span>Tag: {evt.tag_id}</span>
                    <span className="text-sky-400 text-[10px]">{evt.batch_id}</span>
                  </div>

                  <div className="text-slate-300 font-medium">
                    {evt.origin.city}, {evt.origin.country}{' '}
                    {evt.destination ? `➔ ${evt.destination.city}, ${evt.destination.country}` : '(Tap 1 Verified)'}
                  </div>

                  {evt.destination && (
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>
                        Vel:{' '}
                        <strong className={velColor}>
                          {evt.velocity_kmh?.toLocaleString()} km/h
                        </strong>
                      </span>
                      <span>
                        Delta: <strong>{evt.delta_seconds}s</strong>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
