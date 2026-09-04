'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function OfficerLoginPage() {
  const router = useRouter();
  const { loginOfficer } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [designation, setDesignation] = useState('Sub-Divisional Revenue Officer (SDO)');
  const [district, setDistrict] = useState('Pune');
  const [tehsil, setTehsil] = useState('Haveli');
  const [password, setPassword] = useState('');
  const [securityPin, setSecurityPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginOfficer(
        employeeId || 'REV-MH-PN-4091', 
        password || 'admin@revenue2026', 
        securityPin || '8912',
        district,
        tehsil,
        designation
      );
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
              Revenue Administration Portal
            </div>
            <h1 className="text-xl font-bold text-stone-950 font-serif">
              Officer Verification Console
            </h1>
            <p className="text-xs text-stone-500">
              Sign in with your Departmental SSO &amp; Jurisdiction
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Government Officer / Employee ID
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Enter officer employee ID"
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg font-mono text-stone-900 uppercase placeholder:text-stone-400 placeholder:font-sans placeholder:normal-case"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Designation / Cadre
              </label>
              <select
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg bg-white text-stone-900 font-medium"
              >
                <option value="Sub-Divisional Revenue Officer (SDO)">Sub-Divisional Revenue Officer (SDO)</option>
                <option value="Tehsildar / Executive Magistrate">Tehsildar / Executive Magistrate</option>
                <option value="Naib Tehsildar (Land Records)">Naib Tehsildar (Land Records)</option>
                <option value="Revenue Inspector (Kanungo)">Revenue Inspector (Kanungo)</option>
              </select>
            </div>

            {/* Jurisdiction Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Assigned District
                </label>
                <select
                  value={district}
                  onChange={(e) => {
                    setDistrict(e.target.value);
                    if (e.target.value === 'Nashik') setTehsil('Nashik City');
                    else if (e.target.value === 'Satara') setTehsil('Satara Sadar');
                    else setTehsil('Haveli');
                  }}
                  className="w-full px-2.5 py-2 text-xs border border-[#D7D4CA] rounded-lg bg-white text-stone-900 font-medium"
                >
                  <option value="Pune">Pune</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Satara">Satara</option>
                  <option value="Solapur">Solapur</option>
                  <option value="Nagpur">Nagpur</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-stone-700">
                  Assigned Tehsil
                </label>
                <select
                  value={tehsil}
                  onChange={(e) => setTehsil(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs border border-[#D7D4CA] rounded-lg bg-white text-stone-900 font-medium"
                >
                  {district === 'Pune' && (
                    <>
                      <option value="Haveli">Haveli</option>
                      <option value="Baramati">Baramati</option>
                      <option value="Khed (Rajgurunagar)">Khed</option>
                      <option value="Shirur">Shirur</option>
                      <option value="Maval">Maval</option>
                    </>
                  )}
                  {district === 'Nashik' && (
                    <>
                      <option value="Nashik City">Nashik City</option>
                      <option value="Niphad">Niphad</option>
                      <option value="Malegaon">Malegaon</option>
                    </>
                  )}
                  {district === 'Satara' && (
                    <>
                      <option value="Satara Sadar">Satara Sadar</option>
                      <option value="Karad">Karad</option>
                      <option value="Wai">Wai</option>
                    </>
                  )}
                  {['Solapur', 'Nagpur'].includes(district) && (
                    <>
                      <option value="Central Tehsil">Central Tehsil</option>
                      <option value="Rural Sub-Division">Rural Sub-Division</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Departmental SSO Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter departmental password"
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-stone-700">
                Hardware Token / 4-Digit Security PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={securityPin}
                onChange={(e) => setSecurityPin(e.target.value)}
                placeholder="• • • •"
                className="w-full px-3 py-2 text-xs border border-[#D7D4CA] rounded-lg font-mono tracking-widest text-center text-stone-900 placeholder:text-stone-400"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating Officer...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-terracotta-400" />
                  <span>Authenticate &amp; Enter Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-stone-100 text-center text-xs text-stone-500">
            <Link href="/" className="text-stone-700 hover:text-stone-950 hover:underline font-semibold">
              ← Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
