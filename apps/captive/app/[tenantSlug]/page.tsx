'use client';

import React, { useState } from 'react';
import { Wifi, Ticket, User, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface CaptiveTenantProps {
  params: {
    tenantSlug: string;
  };
}

export default function TenantCaptivePortalPage({ params }: CaptiveTenantProps) {
  const tenantDisplay = params.tenantSlug.replace(/-/g, ' ').toUpperCase();
  const [authMode, setAuthMode] = useState<'voucher' | 'subscriber'>('voucher');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherPin, setVoucherPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  async function handleAuthenticate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload: any = {
        tenantSlug: params.tenantSlug,
        authMethod: authMode,
        macAddress: '02:42:c0:a8:0a:64',
      };

      if (authMode === 'voucher') {
        payload.voucherCode = voucherCode.trim().toUpperCase();
        if (voucherPin) payload.voucherPin = voucherPin.trim();
      } else {
        payload.username = username.trim();
        payload.password = password;
      }

      const res = await fetch('http://localhost:3001/api/v1/captive/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Authentication rejected');
      }

      setSession(data.data || data);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  if (session) {
    return (
      <div className="w-full max-w-md p-8 bg-slate-900/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-lg">
          <CheckCircle className="w-10 h-10" />
        </div>
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">Connected</span>
          <h1 className="text-2xl font-bold text-white mt-1">Internet Access Active</h1>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            Session Token: {session.sessionToken?.substring(0, 16)}...
          </p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl text-left text-xs space-y-2 text-slate-300 font-mono">
          <div>Duration: {Math.round(session.expiresInSeconds / 60)} minutes</div>
          {session.bandwidthProfile?.downloadSpeedMbps && (
            <div>
              Speed: {session.bandwidthProfile.downloadSpeedMbps}M Down / {session.bandwidthProfile.uploadSpeedMbps}M Up
            </div>
          )}
          <div>Policy: Compliant with Telecom Logging</div>
        </div>
        <a
          href="https://www.google.com"
          className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition text-center shadow-lg shadow-indigo-900/30"
        >
          Start Browsing
        </a>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur text-center space-y-6">
      <div className="mx-auto w-14 h-14 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
        <Wifi className="w-8 h-8" />
      </div>
      <div>
        <div className="text-xs uppercase font-bold tracking-widest text-indigo-400">{tenantDisplay}</div>
        <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Guest Wi-Fi Access</h1>
        <p className="text-sm text-slate-400 mt-1">Authenticate to start browsing immediately</p>
      </div>

      {/* Auth Mode Toggle */}
      <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
        <button
          type="button"
          onClick={() => { setAuthMode('voucher'); setError(null); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            authMode === 'voucher' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Voucher Code
        </button>
        <button
          type="button"
          onClick={() => { setAuthMode('subscriber'); setError(null); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
            authMode === 'subscriber' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          Subscriber Login
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAuthenticate} className="space-y-4">
        {authMode === 'voucher' ? (
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-800/70 rounded-xl border border-slate-700/60 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Access Voucher
              </label>
              <div className="flex items-center space-x-2">
                <Ticket className="w-5 h-5 text-cyan-400" />
                <input
                  type="text"
                  required
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="NET-XXXX-XXXX"
                  className="bg-transparent text-white w-full focus:outline-none text-sm font-mono uppercase tracking-wider placeholder-slate-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60 text-left">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                PIN (If Applicable)
              </label>
              <input
                type="text"
                value={voucherPin}
                onChange={(e) => setVoucherPin(e.target.value)}
                placeholder="4-digit PIN"
                className="bg-transparent text-white w-full focus:outline-none text-sm font-mono placeholder-slate-500"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Username
              </label>
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-indigo-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="subscriber username"
                  className="bg-transparent text-white w-full focus:outline-none text-sm placeholder-slate-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-transparent text-white w-full focus:outline-none text-sm placeholder-slate-500"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl transition shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span>Verifying...</span>
          ) : (
            <>
              <span>Verify & Connect</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-2 text-[11px] text-slate-500">
        Powered by NetOrbit Enterprise ISP Engine &bull; Compliant with Telecom Regulations
      </div>
    </div>
  );
}
