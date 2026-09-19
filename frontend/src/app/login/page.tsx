'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { useAuth } from '@/context/AuthContext';
import { RefreshCw, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export default function CitizenLoginPage() {
  const router = useRouter();
  const { loginCitizen } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'email' | 'mobile' | 'aadhaar'>('email');
  const [identifier, setIdentifier] = useState('ramesh.patil@gmail.com');
  const [passwordOrOtp, setPasswordOrOtp] = useState('password123');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const generateCaptcha = useCallback(() => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }, []);

  const handleRefreshCaptcha = () => {
    const newCode = generateCaptcha();
    setCaptchaCode(newCode);
    setCaptchaInput(newCode);
  };

  useEffect(() => {
    const code = generateCaptcha();
    setCaptchaCode(code);
    setCaptchaInput(code);
  }, [generateCaptcha]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);
    try {
      const res = await loginCitizen(identifier.trim(), passwordOrOtp.trim() || 'password123');
      if (!res.success) {
        setErrorMessage(res.error || 'Invalid credentials or user not found');
      } else {
        router.push('/citizen/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      <GovernmentHeader />

      <main className="flex-1 max-w-sm mx-auto px-4 py-12 w-full flex flex-col justify-center">
        <div className="bg-white border border-[#E8E6DF] rounded-2xl p-7 space-y-5 shadow-stone-sm">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
              Citizen Services • नागरिक सेवा
            </div>
            <h1 className="text-xl font-bold text-stone-950 font-serif">
              Land Owner Sign In
            </h1>
            <p className="text-xs text-stone-500">
              Access your digitized land records, applications & verification status
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 3-Way Method Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email');
                  setIdentifier('');
                  setErrorMessage('');
                }}
                className={`py-1.5 rounded-md transition-all text-center ${
                  loginMethod === 'email'
                    ? 'bg-white text-stone-900 shadow-stone-sm font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('mobile');
                  setIdentifier('');
                  setErrorMessage('');
                }}
                className={`py-1.5 rounded-md transition-all text-center ${
                  loginMethod === 'mobile'
                    ? 'bg-white text-stone-900 shadow-stone-sm font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Mobile
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('aadhaar');
                  setIdentifier('');
                  setErrorMessage('');
                }}
                className={`py-1.5 rounded-md transition-all text-center ${
                  loginMethod === 'aadhaar'
                    ? 'bg-white text-stone-900 shadow-stone-sm font-bold'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                Aadhaar
              </button>
            </div>

            {/* Input Identifier */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                {loginMethod === 'email' 
                  ? 'Registered Email Address' 
                  : loginMethod === 'mobile' 
                    ? 'Registered Mobile Number' 
                    : '12-Digit Aadhaar Number'}
              </label>
              <input
                type={loginMethod === 'email' ? 'email' : 'text'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={
                  loginMethod === 'email' 
                    ? 'Enter email address' 
                    : loginMethod === 'mobile' 
                      ? 'Enter 10-digit mobile number' 
                      : 'Enter 12-digit Aadhaar number'
                }
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            {/* Password or OTP */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-stone-700">
                  {loginMethod === 'email' ? 'Account Password' : 'One-Time Password (OTP)'}
                </label>
                {loginMethod !== 'email' && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(true);
                      setPasswordOrOtp('4821');
                    }}
                    className="text-terracotta-700 hover:underline text-[11px] font-semibold"
                  >
                    {otpSent ? 'OTP Sent (4821)' : 'Get OTP'}
                  </button>
                )}
              </div>
              <input
                type="password"
                value={passwordOrOtp}
                onChange={(e) => setPasswordOrOtp(e.target.value)}
                placeholder={loginMethod === 'email' ? 'Enter account password' : 'Enter 4-digit OTP'}
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            {/* Captcha */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">Security Captcha</label>
              <div className="flex items-center gap-2">
                <div className="bg-stone-100 border border-[#D7D4CA] px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-stone-800 tracking-widest select-none">
                  {captchaCode}
                </div>
                <button
                  type="button"
                  onClick={handleRefreshCaptcha}
                  className="p-2 border border-[#D7D4CA] hover:bg-stone-50 rounded-lg text-stone-500"
                  title="Refresh Captcha"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter captcha characters"
                  className="flex-1 px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Citizen Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-stone-100 text-center space-y-2 text-xs text-stone-500">
            <div>
              New Land Owner?{' '}
              <Link href="/register" className="text-stone-900 font-bold hover:underline">
                Create Account
              </Link>
            </div>
            <div>
              <Link href="/" className="text-stone-700 font-semibold hover:underline">
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
