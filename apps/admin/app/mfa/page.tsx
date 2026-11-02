'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

function MfaContent() {
  const { verifyMfa } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mfaToken = searchParams.get('token') || '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mfaToken) {
      router.push('/login');
    }
  }, [mfaToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return;
    setError(null);
    setLoading(true);

    try {
      await verifyMfa(mfaToken, code);
    } catch (err: any) {
      setError(err.message || 'Invalid authenticator code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10 space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 items-center justify-center text-white shadow-xl">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Two-Factor Authentication</h1>
        <p className="text-sm text-slate-400">
          Enter the 6-digit verification code from your authenticator app
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
        {error && (
          <div className="mb-5 p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
              Security Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength={6}
                autoFocus
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 text-center text-2xl font-mono tracking-[0.5em] text-cyan-400 placeholder-slate-700 focus:outline-none focus:border-cyan-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm rounded-xl transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Verify Identity</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            onClick={() => router.push('/login')}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MfaPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative">
      <Suspense fallback={<div className="text-slate-400 text-xs">Loading authentication...</div>}>
        <MfaContent />
      </Suspense>
    </div>
  );
}
