'use client';

import React, { useState } from 'react';
import {
  HOUSTON_TO_LONDON_REPLAY,
  triggerScenarioPayload,
  AttackScenario,
} from '../../lib/simulationEngine';

export default function AdminDashboardPage() {
  const [activeScenario] = useState<AttackScenario>(HOUSTON_TO_LONDON_REPLAY);
  const [lastPayload, setLastPayload] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const handleRunSimulation = () => {
    const payload = triggerScenarioPayload(activeScenario);
    setLastPayload(payload);
    setLogs((prev) => [payload, ...prev]);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-blue-400">Quantum Nimbus Admin Dashboard</h1>
          <p className="text-sm text-slate-400">Backend Attack Simulation & Threat Telemetry Engine</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Session Authenticated</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Simulation Control Panel */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold text-white">Attack Scenario Control</h2>
            <span className="px-2.5 py-1 text-xs font-mono rounded bg-red-950 text-red-400 border border-red-800/50">
              HIGH THREAT
            </span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider block">Scenario Name</span>
              <p className="font-semibold text-white text-base">{activeScenario.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500 block">Origin</span>
                <p className="font-medium text-slate-200">{activeScenario.origin.name}</p>
                <p className="text-xs font-mono text-slate-400">{activeScenario.origin.lat}, {activeScenario.origin.long}</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500 block">Destination</span>
                <p className="font-medium text-slate-200">{activeScenario.destination.name}</p>
                <p className="text-xs font-mono text-slate-400">{activeScenario.destination.lat}, {activeScenario.destination.long}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500 block">Time Delta</span>
                <p className="font-mono text-amber-400 font-bold">{activeScenario.timeDeltaSeconds}s</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500 block">Haversine Distance</span>
                <p className="font-mono text-blue-400 font-bold">{activeScenario.distanceKm.toLocaleString()} km</p>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-xs text-slate-500 block">Velocity</span>
                <p className="font-mono text-purple-400 font-bold">{activeScenario.calculatedVelocityKmh.toLocaleString()} km/h</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div>
                <span className="text-xs text-slate-500 block">Threat Score</span>
                <span className="font-mono text-red-400 font-bold text-lg">{activeScenario.threatScore}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block text-right">Expected Decision</span>
                <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-red-900/60 text-red-200 border border-red-700">
                  {activeScenario.expectedStatus}
                </span>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 rounded-lg shadow-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Trigger Attack Payload</span>
            </button>
          </div>
        </section>

        {/* Live Payload Stream */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-3 mb-4">
            Simulated Supabase Payload Output
          </h2>

          {lastPayload ? (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                <pre>{JSON.stringify(lastPayload, null, 2)}</pre>
              </div>
              
              <div className="text-xs text-slate-400">
                Total Sim Invocations: <span className="text-white font-mono">{logs.length}</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm border-2 border-dashed border-slate-800 rounded-lg p-6 text-center">
              Click &quot;Trigger Attack Payload&quot; to test simulation engine output
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
