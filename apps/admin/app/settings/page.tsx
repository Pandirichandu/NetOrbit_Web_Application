'use client';

import React, { useState } from 'react';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import {
  User,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Key,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  // Profile Form
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // MFA State
  const [mfaData, setMfaData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaModal, setMfaModal] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaSuccess, setMfaSuccess] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setProfileLoading(true);

    try {
      await apiClient.put('/users/profile', { firstName, lastName, phone });
      setProfileMessage('Profile updated successfully');
    } catch (err: any) {
      setProfileMessage(err.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    setPasswordLoading(true);

    try {
      await apiClient.put('/users/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordMessage('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaError(null);
    try {
      const data = await apiClient.get('/auth/mfa/setup');
      setMfaData(data);
      setMfaModal(true);
    } catch (err: any) {
      alert(`Could not initiate MFA: ${err.message}`);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    try {
      await apiClient.post('/auth/mfa/confirm', { code: mfaCode });
      setMfaSuccess('Two-factor authentication successfully enabled!');
      setMfaModal(false);
    } catch (err: any) {
      setMfaError(err.message || 'Verification code failed');
    }
  };

  return (
    <AdminLayout
      title="Account Settings"
      subtitle="Manage profile credentials, password security, and two-factor authentication"
    >
      <div className="max-w-4xl space-y-8">
        {/* Profile Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Personal Profile</h3>
          </div>

          {profileMessage && (
            <div className="p-3 bg-blue-950/40 border border-blue-800 rounded-xl text-blue-300 text-xs">
              {profileMessage}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-md"
              >
                {profileLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Change Security Password</h3>
          </div>

          {passwordMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-300 text-xs">
              {passwordMessage}
            </div>
          )}
          {passwordError && (
            <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">New Password (Min 8 chars)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-md"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Two-Factor Authentication Card */}
        <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-sm text-white">Two-Factor Authentication (TOTP)</h3>
            </div>
            {user?.mfaEnabled || mfaSuccess ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active</span>
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                Disabled
              </span>
            )}
          </div>

          <p className="text-xs text-slate-400">
            Secure administrative sessions with standard Time-based One-Time Password (TOTP) using apps like Google Authenticator or 1Password.
          </p>

          <div>
            <button
              onClick={handleStartMfaSetup}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              <span>Configure Authenticator App</span>
            </button>
          </div>
        </div>

        {/* Modal: MFA QR Code */}
        {mfaModal && mfaData && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
              <h3 className="font-bold text-sm text-white">Set Up Two-Factor Authentication</h3>
              <p className="text-xs text-slate-400">Scan this QR code with your authenticator app</p>

              {mfaError && (
                <div className="p-2 bg-red-950/50 border border-red-800 rounded-lg text-red-300 text-xs">
                  {mfaError}
                </div>
              )}

              <div className="bg-white p-3 rounded-xl inline-block mx-auto shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mfaData.qrCodeUrl} alt="TOTP QR Code" className="w-44 h-44 mx-auto" />
              </div>

              <div className="text-[11px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-800 break-all select-all">
                {mfaData.secret}
              </div>

              <form onSubmit={handleConfirmMfa} className="space-y-3">
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="Enter 6-digit code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 text-center text-lg font-mono tracking-widest text-cyan-400 focus:outline-none focus:border-cyan-500"
                />

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setMfaModal(false)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={mfaCode.length < 6}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
                  >
                    Confirm & Enable
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
