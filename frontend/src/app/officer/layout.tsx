'use client';

import React from 'react';
import Link from 'next/link';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { Sidebar } from '@/components/common/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

export default function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, loginOfficer } = useAuth();

  // If not logged in as Officer, provide quick demo unlock or redirect prompt
  const isOfficer = role === 'OFFICER' && user !== null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      <GovernmentHeader />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {!isOfficer && user?.role === 'CITIZEN' ? (
              <div className="bg-white border-2 border-stone-800 rounded-2xl p-8 shadow-stone-lg text-center space-y-4 max-w-lg mx-auto my-12">
                <div className="w-12 h-12 rounded-2xl bg-[#141416] text-white flex items-center justify-center mx-auto shadow-stone-sm">
                  <Lock className="w-6 h-6 text-terracotta-400" />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-terracotta-700 uppercase tracking-wider">
                    Official Clearance Required
                  </div>
                  <h2 className="text-xl font-bold text-stone-950 font-serif">
                    Sub-Divisional Officer (SDO) Portal
                  </h2>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    You are currently signed in as a <strong>Land Owner / Citizen</strong>. The Verification Console, GIS Parcel Editor, and Audit Logs are restricted to authorized Revenue Officers.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    href="/officer-login"
                    className="w-full bg-[#141416] hover:bg-stone-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-stone-sm transition-all flex items-center justify-center gap-2"
                  >
                    <span>Sign In with Officer Credentials</span>
                    <ArrowRight className="w-3.5 h-3.5 text-terracotta-400" />
                  </Link>
                  <Link
                    href="/citizen/dashboard"
                    className="text-stone-700 hover:text-stone-950 text-xs font-semibold py-1.5"
                  >
                    ← Return to Citizen Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
