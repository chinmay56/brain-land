'use client';

/**
 * Gate for the officer console.
 *
 * The previous version only blocked callers whose role was literally
 * 'CITIZEN', so a visitor with no session at all fell straight through the
 * check and was handed the verification queue, the GIS editor and the audit
 * log. Anyone who is not a signed-in officer now goes to the login page.
 *
 * This is a convenience, not the control: the API refuses the same requests
 * on its own, because a client-side redirect protects nothing.
 */

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { Sidebar } from '@/components/common/Sidebar';
import { BackendWarmup } from '@/components/common/BackendWarmup';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, role, isLoading } = useAuth();
  const isOfficer = !isLoading && user !== null && role === 'OFFICER';

  useEffect(() => {
    if (!isLoading && !isOfficer) router.replace('/officer-login');
  }, [isLoading, isOfficer, router]);

  if (isLoading || !isOfficer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        <p className="text-xs text-stone-500">
          {isLoading ? 'Checking your session…' : 'Officer sign-in required. Redirecting…'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      {/* Wakes an idled free-tier API before the first GIS call. Renders nothing. */}
      <BackendWarmup />
      <GovernmentHeader />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
