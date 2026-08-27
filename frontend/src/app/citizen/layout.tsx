'use client';

import React from 'react';
import { GovernmentHeader } from '@/components/common/GovernmentHeader';
import { Sidebar } from '@/components/common/Sidebar';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFA]">
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
