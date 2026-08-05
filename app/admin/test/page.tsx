'use client';

import React, { useState, useEffect } from 'react';
import {
  HOUSTON_TO_LONDON_REPLAY,
  triggerScenarioPayload,
} from '../../lib/simulationEngine';

export default function AdminTestPage() {
  const [authStatus, setAuthStatus] = useState<'Authenticated (Cookie Set)' | 'Unauthenticated'>('Unauthenticated');
  const [apiResponse, setApiResponse] = useState<{ status: number; data: any } | null>(null);
  const [simulationPayload, setSimulationPayload] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const checkSessionStatus = () => {
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('qn_admin_session=authenticated');
    if (hasCookie) {
      setAuthStatus('Authenticated (Cookie Set)');
    }
  };

  useEffect(() => {
    checkSessionStatus();
  }, []);

  const handleTestPasscode = async (passkey: string) => {
    setLoading(true);
    setApiResponse(null);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey }),
      });
      const data = await res.json();
      setApiResponse({ status: res.status, data });

      if (res.ok && data.success) {
        setAuthStatus('Authenticated (Cookie Set)');
      } else {
        setAuthStatus('Unauthenticated');
      }
    } catch (err: any) {
      setApiResponse({ status: 500, data: { error: err.message || 'Network error' } });
      setAuthStatus('Unauthenticated');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      document.cookie = 'qn_admin_session=; path=/; max-age=0';
      setAuthStatus('Unauthenticated');
      setApiResponse({ status: 200, data: { success: true, message: 'Session cookie cleared successfully.' } });
    } catch (err: any) {
      setApiResponse({ status: 500, data: { error: err.message || 'Logout failed' } });
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = () => {
    const payload = triggerScenarioPayload(HOUSTON_TO_LONDON_REPLAY);
    setSimulationPayload(payload);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400 tracking-tight">
              Developer Test Suite
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Quantum Nimbus Auth Gate, Passcode Verification & Attack Simulation Tester
            </p>
          </div>
          
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-lg">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Live Session:</span>
            <span
              className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full border ${
                authStatus.includes('Authenticated')
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                  : 'bg-red-950 text-red-400 border-red-800'
              }`}
            >
              Status: {authStatus}
            </span>
          </div>
        </header>

        {/* Section 1: Passcode API & Cookie Tester */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>Section 1: Passcode API & Cookie Tester</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Test passcode validation against <code className="text-amber-400">/api/admin/verify</code> and manage session cookies.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleTestPasscode('wrong123')}
              disabled={loading}
              className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Submit Bad Passcode (<code className="font-mono">wrong123</code>)
            </button>

            <button
              onClick={() => handleTestPasscode('nimbus2026')}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Submit Valid Passcode (<code className="font-mono">nimbus2026</code>)
            </button>

            <button
              onClick={handleClearSession}
              disabled={loading}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Clear Session Cookie (Logout)
            </button>
          </div>

          {apiResponse && (
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">API Response Output</span>
                <span
                  className={`font-bold ${
                    apiResponse.status === 200 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  HTTP Status: {apiResponse.status}
                </span>
              </div>
              <pre className="font-mono text-xs text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded border border-slate-800">
                {JSON.stringify(apiResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </section>

        {/* Section 2: Route Protection Gate Tester */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-semibold text-white">
              Section 2: Route Protection Gate Tester
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Verify Next.js middleware protection on restricted dashboard routes.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => {
                window.location.href = '/admin/dashboard';
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Try Accessing <code className="font-mono bg-blue-950 px-1.5 py-0.5 rounded">/admin/dashboard</code>
            </button>

            <div className="bg-slate-950 border-l-4 border-blue-500 p-4 rounded-r-lg text-sm text-slate-300">
              <span className="font-semibold text-blue-400 block mb-1">Gate Verification Rule:</span>
              If logged in (<code className="text-emerald-400">qn_admin_session=authenticated</code>), you will see the dashboard. If logged out, middleware will bounce you to <code className="text-amber-400">/admin/login</code>.
            </div>
          </div>
        </section>

        {/* Section 3: Attack Simulation Engine Execution */}
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-3">
            <h2 className="text-xl font-semibold text-white">
              Section 3: Attack Simulation Engine Execution
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Execute backend spatial-temporal attack calculations and output raw telemetry payloads.
            </p>
          </div>

          <button
            onClick={handleRunSimulation}
            className="bg-red-600 hover:bg-red-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            Fire Houston &rarr; London Replay Attack Scenario
          </button>

          {simulationPayload && (
            <div className="space-y-6 pt-2">
              {/* Calculated Metrics Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Scenario</span>
                    <h3 className="text-lg font-bold text-white">Intercontinental Replay Attack</h3>
                  </div>
                  <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-red-950 text-red-400 border border-red-800">
                    {HOUSTON_TO_LONDON_REPLAY.expectedStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Distance</span>
                    <span className="font-mono text-blue-400 font-bold text-base">
                      ~{HOUSTON_TO_LONDON_REPLAY.distanceKm.toLocaleString()} km
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Time Delta</span>
                    <span className="font-mono text-amber-400 font-bold text-base">
                      {HOUSTON_TO_LONDON_REPLAY.timeDeltaSeconds}s
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Velocity</span>
                    <span className="font-mono text-purple-400 font-bold text-base">
                      ~{HOUSTON_TO_LONDON_REPLAY.calculatedVelocityKmh.toLocaleString()} km/h
                    </span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400 block">Threat Score</span>
                    <span className="font-mono text-red-400 font-bold text-base">
                      {HOUSTON_TO_LONDON_REPLAY.threatScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw JSON Payload Block */}
              <div className="space-y-2">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">
                  Generated Supabase / Telemetry JSON Payload
                </span>
                <pre className="font-mono text-xs text-emerald-400 bg-slate-950 border border-slate-800 p-4 rounded-xl overflow-x-auto">
                  <code>{JSON.stringify(simulationPayload, null, 2)}</code>
                </pre>
              </div>
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
