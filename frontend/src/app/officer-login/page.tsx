'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { LGD_MAHARASHTRA_DISTRICTS } from '@/lib/lgdMaster';

export default function OfficerLoginPage() {
  const router = useRouter();
  const { loginOfficer } = useAuth();

  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Sub-Divisional Revenue Officer (SDO)');
  const [district, setDistrict] = useState('');
  const [tehsil, setTehsil] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbDistricts, setDbDistricts] = useState<string[]>([]);
  const [dbTehsilsMap, setDbTehsilsMap] = useState<Record<string, string[]>>({});

  // Fetch master LGD JSON directly from public.lgd_master table in Supabase
  useEffect(() => {
    async function loadDbJurisdictions() {
      try {
        const { data: lgdData, error } = await supabase
          .from('lgd_master')
          .select('district_code, district_name_en, district_name_mr, tehsils');

        if (error) {
          console.warn('Supabase lgd_master query notice:', error);
          return;
        }

        if (lgdData && lgdData.length > 0) {
          const distList: string[] = [];
          const tMap: Record<string, string[]> = {};

          lgdData.forEach((row: any) => {
            const distName = row.district_name_en;
            distList.push(distName);
            const tehsils = Array.isArray(row.tehsils)
              ? row.tehsils.map((t: any) => t.en)
              : [];
            tMap[distName] = tehsils;
          });

          setDbDistricts(distList);
          setDbTehsilsMap(tMap);
        }
      } catch (err) {
        console.warn('DB lgd_master fetch exception:', err);
      }
    }
    loadDbJurisdictions();
  }, []);

  const availableTehsils = dbTehsilsMap[district] || (
    LGD_MAHARASHTRA_DISTRICTS.find(
      d => d.en.toLowerCase() === district.toLowerCase() || d.mr === district
    )?.tehsils.map(t => t.en) || ['Jalgaon']
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // District, tehsil and designation are not credentials — they are read
      // from the officer's profile after sign-in. Sending them from the form
      // only ever fed the mock.
      const result = await loginOfficer(email, password);
      if (!result.success) {
        setError(result.error || 'Sign-in failed.');
        return;
      }
      router.push('/officer/dashboard');
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
            <div className="text-[11px] font-bold text-stone-700 uppercase tracking-wider">
              Revenue Administration
            </div>
            <h1 className="text-xl font-bold text-stone-950 font-serif">
              Officer Verification
            </h1>
            <p className="text-xs text-stone-500">
              Sign in with your Departmental SSO &amp; Jurisdiction
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 1. Official Email Address */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Official Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer.patil@revenue.gov.in"
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400 font-medium"
                required
              />
            </div>

            {/* 2. Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400 font-medium"
                required
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-400" />
                  <span>Authenticating Officer...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-orange-400" />
                  <span>Authenticate &amp; Open Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-xs text-stone-500 hover:text-stone-800 transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
