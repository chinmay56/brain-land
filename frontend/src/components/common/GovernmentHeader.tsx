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

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/officer-login';

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

        {/* Right Section: Land Owner Login & Officer Sign In Buttons */}
        <div className="flex items-center gap-3">
          {user && !isAuthPage ? (
            <div className="flex items-center gap-3">
              {/* Role Indicator Badge */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                role === 'OFFICER' 
                  ? 'bg-stone-900 text-white border-stone-900 shadow-stone-sm' 
                  : 'bg-terracotta-50 text-terracotta-900 border-terracotta-200'
              }`}>
                {role === 'OFFICER' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-terracotta-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-terracotta-700" />
                )}
                <span>{role === 'OFFICER' ? 'Revenue Officer (SDO)' : 'Land Owner'}</span>
              </span>

              {/* User Avatar & Name */}
              <div className="flex items-center gap-2 pl-2 border-l border-[#D7D4CA]">
                <div className="w-7 h-7 rounded-full bg-[#141416] text-white flex items-center justify-center font-bold text-xs shadow-stone-sm">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-stone-900 leading-none">{user.name}</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">{user.designation || user.district || 'Verified Citizen'}</div>
                </div>

                {/* Sign Out Button */}
                <button 
                  onClick={handleLogout}
                  className="text-stone-400 hover:text-stone-900 p-1.5 rounded-lg hover:bg-stone-100 transition-colors ml-1"
                  title="Sign out and return to home"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
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
