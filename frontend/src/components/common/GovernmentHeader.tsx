'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Building2, 
  User, 
  LogOut, 
  ShieldCheck
} from 'lucide-react';

export const GovernmentHeader: React.FC = () => {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDashboardPage = pathname.startsWith('/citizen') || pathname.startsWith('/officer');

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <header className="w-full bg-[#FAF9F6] border-b border-[#E8E6DF] sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand & Emblem with Government of India in Hindi */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-[#141416] text-white flex items-center justify-center font-bold text-xs shadow-stone-sm border border-stone-800 group-hover:border-terracotta-600 transition-colors">
            <Building2 className="w-4 h-4 text-terracotta-400" />
          </div>

          <div>
            <div className="text-[10.5px] font-bold text-stone-600 uppercase tracking-wider leading-none">
              भारत सरकार • Government of India
            </div>
            <div className="text-xs sm:text-sm font-bold text-stone-950 leading-snug mt-0.5 tracking-tight group-hover:text-terracotta-700 transition-colors">
              Department of Land Resources (DoLR) • भू-संसाधन विभाग
            </div>
          </div>
        </Link>

        {/* Right Section: Logout inside Dashboards, Login Buttons on Public/Landing Pages */}
        <div className="flex items-center gap-3">
          {mounted && user && isDashboardPage ? (
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-rose-700 text-white transition-colors flex items-center gap-1.5 shadow-stone-sm cursor-pointer"
              title="Sign out of account"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-300" />
              <span>Logout</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#D7D4CA] text-stone-900 hover:bg-stone-100 transition-colors bg-white shadow-stone-sm"
              >
                Land Owner Login
              </Link>
              <Link
                href="/officer-login"
                className="text-xs font-semibold px-3.5 py-1.5 rounded-lg shadow-stone-sm transition-colors flex items-center gap-1.5 bg-[#141416] hover:bg-stone-800 text-white"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-terracotta-400" />
                <span>Officer Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
