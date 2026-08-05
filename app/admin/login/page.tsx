'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [authMode, setAuthMode] = useState<'credentials' | 'passkey'>('credentials');
  const [username, setUsername] = useState('username123');
  const [password, setPassword] = useState('password123');
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload =
        authMode === 'credentials'
          ? { username, password }
          : { passkey };

      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid Credentials');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white font-sans">
      <div className="w-full max-w-md bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-2xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-blue-400">Quantum Nimbus</h1>
          <p className="text-sm text-slate-400">Admin Command Gate</p>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            type="button"
            className={`flex-1 pb-2 text-sm font-medium border-b-2 text-center transition-colors ${
              authMode === 'credentials'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setAuthMode('credentials')}
          >
            Username & Password
          </button>
          <button
            type="button"
            className={`flex-1 pb-2 text-sm font-medium border-b-2 text-center transition-colors ${
              authMode === 'passkey'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
            onClick={() => setAuthMode('passkey')}
          >
            Passkey PIN
          </button>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-300 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'credentials' ? (
            <>
              <div>
                <label htmlFor="username-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Username
                </label>
                <input
                  id="username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="enter username"
                  required
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="password-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  id="password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="enter password"
                  required
                  className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="passkey-input" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Passkey
              </label>
              <input
                id="passkey-input"
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter admin passkey"
                required
                className="w-full bg-slate-900 border border-slate-700 p-2.5 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium p-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-500 border-t border-slate-700/50 pt-4">
          Test Credentials: <span className="text-slate-300">username123</span> / <span className="text-slate-300">password123</span>
        </div>
      </div>
    </main>
  );
}
