'use client';

/**
 * Who is signed in.
 *
 * Two things used to make this decorative. When Supabase Auth failed for any
 * reason the app invented a user locally and carried on, so a wrong password
 * still produced a working session; and the role was read from
 * user_metadata, which the account holder sets at signUp, so a citizen could
 * register themselves as an OFFICER. Both are gone.
 *
 * Sign-in is Supabase signInWithPassword and nothing else. Role and
 * jurisdiction are read from public.profiles, a table the user cannot write
 * to, and the same row the backend consults when deciding what to allow.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { AUTH_EXPIRED_EVENT } from '@/lib/apiFetch';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isLoading: boolean;
  loginCitizen: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginOfficer: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerCitizen: (
    data: Partial<UserProfile> & { email?: string; password?: string },
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileRow = {
  role?: string;
  full_name?: string;
  phone_number?: string;
  designation?: string;
  employee_id?: string;
  district?: string;
  tehsil?: string;
};

/**
 * The profile row is the authority on role. A missing row means no
 * privileges — never assumed ones.
 */
async function profileFor(userId: string, email?: string | null): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name, phone_number, designation, employee_id, district, tehsil')
    .eq('id', userId)
    .single();

  if (error) {
    console.warn('Could not read profile:', error.message);
    return null;
  }
  const row = (data || {}) as ProfileRow;
  return {
    id: userId,
    email: email || undefined,
    name: row.full_name || email?.split('@')[0] || 'User',
    role: (row.role === 'OFFICER' ? 'OFFICER' : 'CITIZEN') as UserRole,
    phone: row.phone_number || '',
    designation: row.designation || undefined,
    employeeId: row.employee_id || undefined,
    district: row.district || '',
    tehsil: row.tehsil || '',
    state: 'Maharashtra',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole>('CITIZEN');
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback(async (session: any | null) => {
    if (!session?.user) {
      setUser(null);
      setRole('CITIZEN');
      return;
    }
    const profile = await profileFor(session.user.id, session.user.email);
    if (!profile) {
      // Authenticated but unknown to the application. Signing out is safer
      // than granting a default identity.
      await supabase.auth.signOut();
      setUser(null);
      setRole('CITIZEN');
      return;
    }
    setUser(profile);
    setRole(profile.role);
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (active) {
        await applySession(data?.session ?? null);
        setIsLoading(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    // A 401 from the API means the session the server sees is gone.
    const onExpired = () => {
      void supabase.auth.signOut();
      setUser(null);
      setRole('CITIZEN');
      if (typeof window !== 'undefined' && !window.location.pathname.includes('login')) {
        window.location.href = '/login';
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    }

    return () => {
      active = false;
      listener?.subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
      }
    };
  }, [applySession]);

  /** Shared by both sign-in entry points; the role check differs. */
  const signIn = async (email: string, password: string, mustBeOfficer: boolean) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data?.user) {
      return { success: false, error: error?.message || 'Invalid email or password.' };
    }

    const profile = await profileFor(data.user.id, data.user.email);
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'No profile is associated with this account.' };
    }
    if (mustBeOfficer && profile.role !== 'OFFICER') {
      // Signed in successfully, but not as somebody who may use this console.
      await supabase.auth.signOut();
      return { success: false, error: 'This account is not registered as a revenue officer.' };
    }

    setUser(profile);
    setRole(profile.role);
    return { success: true };
  };

  const loginCitizen = (email: string, password: string) => signIn(email, password, false);
  const loginOfficer = (email: string, password: string) => signIn(email, password, true);

  const registerCitizen = async (
    data: Partial<UserProfile> & { email?: string; password?: string },
  ) => {
    if (!data.email || !data.password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const { data: created, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        // No role here. The database trigger writes CITIZEN regardless of
        // what this object contains, so sending one would only be misleading.
        data: {
          full_name: data.name || '',
          phone_number: data.phone || '',
          district: data.district || '',
          tehsil: data.tehsil || '',
        },
      },
    });

    if (error || !created?.user) {
      return { success: false, error: error?.message || 'Registration failed.' };
    }

    if (created.session) {
      await applySession(created.session);
    }
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole('CITIZEN');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ilrds_active_session');
      sessionStorage.removeItem('active_extraction_preview');
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, role, isLoading, loginCitizen, loginOfficer, registerCitizen, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
