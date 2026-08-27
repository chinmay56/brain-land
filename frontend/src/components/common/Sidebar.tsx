'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  FileCheck2,
  HelpCircle,
  MapPin,
  History,
  FileText,
  AlertCircle,
  LucideIcon
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  count?: string;
  tag?: string;
}

export const Sidebar: React.FC = () => {
  const { role } = useAuth();
  const pathname = usePathname();

  // Distinct navigation trees based on active portal route
  const isOfficerSection = pathname.startsWith('/officer');

  const citizenNav: NavItem[] = [
    { name: 'My Dashboard', href: '/citizen/dashboard', icon: LayoutDashboard },
    { name: 'Upload Land Record', href: '/citizen/upload', icon: UploadCloud, tag: 'New' },
    { name: 'My Applications', href: '/citizen/applications', icon: FileSpreadsheet },
    { name: 'Verified Records (RoR)', href: '/citizen/records', icon: FileCheck2 },
    { name: 'Guidelines & Legal', href: '/citizen/help', icon: HelpCircle },
  ];

  const officerNav: NavItem[] = [
    { name: 'Verification Overview', href: '/officer/dashboard', icon: LayoutDashboard },
    { name: 'Verification Queue', href: '/officer/verification', icon: FileText, count: '128' },
    { name: 'Verified Documents History', href: '/officer/history', icon: FileCheck2 },
    { name: 'Cadastral Conflicts', href: '/officer/conflicts', icon: AlertCircle, count: '12' },
    { name: 'GIS Parcel Map', href: '/officer/gis', icon: MapPin },
    { name: 'Provenance & Audit', href: '/officer/audit', icon: History },
  ];

  const navItems = isOfficerSection ? officerNav : citizenNav;

  return (
    <aside className="w-64 bg-[#FAF9F6] border-r border-[#E8E6DF] flex-shrink-0 h-[calc(100vh-61px)] sticky top-[61px] flex flex-col justify-between p-4 overflow-y-auto z-40">
      <div className="space-y-4">
        {/* Portal Identifier Tag */}
        <div className="px-3 py-2 bg-white border border-[#E8E6DF] rounded-xl flex items-center justify-between shadow-stone-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOfficerSection ? 'bg-[#141416]' : 'bg-terracotta-600'}`}></span>
            <span className="text-xs font-bold text-stone-900 tracking-tight">
              {isOfficerSection ? 'SDO Officer Console' : 'Citizen Land Portal'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-stone-400">DoLR</span>
        </div>

        {/* Navigation list */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/citizen/dashboard' && item.href !== '/officer/dashboard' && pathname.startsWith(`${item.href}`));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-[#141416] font-semibold text-white shadow-stone-sm'
                    : 'text-stone-700 hover:bg-white hover:text-stone-950 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-terracotta-400' : 'text-stone-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.count && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-stone-800 text-stone-200' : 'bg-stone-200/80 text-stone-700 font-semibold'
                  }`}>
                    {item.count}
                  </span>
                )}
                {item.tag && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-terracotta-100 text-terracotta-800 px-1.5 py-0.2 rounded">
                    {item.tag}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Subdued Footer */}
      <div className="p-3 bg-white border border-[#E8E6DF] rounded-xl text-[10px] text-stone-500 space-y-0.5 shadow-stone-sm">
        <div className="font-semibold text-stone-900">National Land Record System</div>
        <div className="text-stone-400">Department of Land Resources</div>
      </div>
    </aside>
  );
};
