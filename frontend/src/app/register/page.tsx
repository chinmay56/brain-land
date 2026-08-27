'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { useAuth } from '@/context/AuthContext';
import { UserPlus, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function CitizenRegisterPage() {
  const router = useRouter();
  const { registerCitizen } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    aadhaarLast4: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerCitizen({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        aadhaarLast4: formData.aadhaarLast4.trim(),
        password: formData.password,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to create account in Supabase');
      } else {
        router.push('/citizen/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      <GovernmentHeader />

      <main className="flex-1 max-w-md mx-auto px-4 py-10 w-full flex flex-col justify-center">
        <div className="bg-white border border-[#E8E6DF] rounded-2xl shadow-stone-sm p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-900 border border-[#E8E6DF] flex items-center justify-center mx-auto mb-3">
              <UserPlus className="w-6 h-6 text-terracotta-700" />
            </div>
            <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider mb-1">
              New Citizen Registration • नवीन नोंदणी
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-stone-950 font-serif">
              Create Land Owner Account
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Register to submit legacy land papers for AI digitization and certification
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Full Legal Name (as per Land Record)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full legal name"
                className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
                className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter 10-digit mobile"
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Aadhaar (Last 4 Digits)</label>
                <input
                  type="text"
                  maxLength={4}
                  value={formData.aadhaarLast4}
                  onChange={(e) => setFormData({ ...formData, aadhaarLast4: e.target.value })}
                  placeholder="Last 4 digits"
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl font-mono text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Create Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-[#D7D4CA] rounded-xl text-stone-900 placeholder:text-stone-400"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="agree"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="w-4 h-4 text-stone-900 rounded border-stone-300"
                required
              />
              <label htmlFor="agree" className="text-[11px] text-stone-600">
                I declare that the information provided belongs to my lawful identity.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#141416] hover:bg-stone-800 text-white font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2 mt-3 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating user in Supabase...</span>
                </>
              ) : (
                <>
                  <span>Register & Continue to Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-4 text-xs text-stone-500">
            Already have an account?{' '}
            <Link href="/login" className="text-stone-950 font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
