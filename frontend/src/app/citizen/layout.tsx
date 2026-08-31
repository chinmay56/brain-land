'use client';

import React from 'react';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { Sidebar } from '@/components/common/Sidebar';
import { BackendWarmup } from '@/components/common/BackendWarmup';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
      {/* Wakes an idled free-tier API before the first upload. Renders nothing. */}
      <BackendWarmup />
      <GovernmentHeader />
      <div className="flex-1 flex w-full">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8 min-w-0 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
