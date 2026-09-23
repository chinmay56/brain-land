'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { Sidebar } from '@/components/common/Sidebar';
import { BackendWarmup } from '@/components/common/BackendWarmup';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // These pages upload documents and list somebody's land holdings, so they
  // need a session even though the role does not matter here.
  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FBFBFA] gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
        <p className="text-xs text-stone-500">
          {isLoading ? 'Checking your session…' : 'Sign-in required. Redirecting…'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      {/* Wakes an idled free-tier API before the first upload. Renders nothing. */}
      <BackendWarmup />
      <GovernmentHeader />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
