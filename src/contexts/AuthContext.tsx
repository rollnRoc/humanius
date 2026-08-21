import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { canAccessView, normalizeRole, type AppRole } from '../auth/roles';
import type { View } from '../types';
import { demoService } from '../services/demoService';

type Profile = Database['public']['Tables']['profiles']['Row'];

const mockDemoUser: User = {
  id: 'demo-user-id-9999',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'selin.aksoy@humanius.net',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: 'Selin Aksoy' },
  audits: []
} as any;

const mockDemoProfile: Profile = {
  id: 'demo-user-id-9999',
  email: 'selin.aksoy@humanius.net',
  full_name: 'Selin Aksoy',
  company_id: 'demo-company-id-9999',
  role: 'hr',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockSuperAdminUser: User = {
  id: 'superadmin-user-id-9999',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'superadmin@humanius.net',
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: 'Süper Yönetici' },
  audits: []
} as any;

const mockSuperAdminProfile: Profile = {
  id: 'superadmin-user-id-9999',
  email: 'superadmin@humanius.net',
  full_name: 'Süper Yönetici',
  company_id: null,
  role: 'superadmin',
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  appRole: AppRole;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isHr: boolean;
  isManager: boolean;
  isUser: boolean;
  loading: boolean;
  isDemo: boolean;
  startDemoSession: () => void;
  startSuperAdminSession: () => void;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  canAccess: (view: View) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    // 1. Önce Demo Modu Kontrolü
    const isDemoActive = localStorage.getItem('humanius_demo_mode') === 'true';
    if (isDemoActive) {
      const startTime = parseInt(localStorage.getItem('humanius_demo_start_time') || '0', 10);
      const isExpired = Date.now() - startTime > 2 * 24 * 60 * 60 * 1000; // 48 Saat limit

      if (isExpired) {
        demoService.clearDatabase();
        setIsDemo(false);
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else {
        setIsDemo(true);
        setUser(mockDemoUser);
        setProfile(mockDemoProfile);
        setLoading(false);
        return;
      }
    }

    // 2. Normal Giriş Akışı (Demo Aktif Değilse)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        localStorage.removeItem('humanius_demo_mode');
        localStorage.removeItem('humanius_demo_start_time');
        setIsDemo(false);
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else if (isDemoActive) {
        setIsDemo(true);
        setUser(mockDemoUser);
        setProfile(mockDemoProfile);
        setLoading(false);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.removeItem('humanius_demo_mode');
        localStorage.removeItem('humanius_demo_start_time');
        setIsDemo(false);
        setSession(session);
        setUser(session.user);
        setProfile(null);
        setLoading(true);
        fetchProfile(session.user.id);
      } else if (localStorage.getItem('humanius_demo_mode') !== 'true') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        console.error('Profile not found for user:', userId);
        setProfile(null);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const startDemoSession = () => {
    localStorage.setItem('humanius_demo_mode', 'true');
    localStorage.setItem('humanius_demo_start_time', Date.now().toString());
    demoService.seedDatabase();
    
    setIsDemo(true);
    setUser(mockDemoUser);
    setProfile(mockDemoProfile);
    setLoading(false);
  };

  const startSuperAdminSession = () => {
    localStorage.setItem('humanius_demo_mode', 'true');
    localStorage.setItem('humanius_demo_start_time', Date.now().toString());
    demoService.seedDatabase();
    
    setIsDemo(true);
    setUser(mockSuperAdminUser);
    setProfile(mockSuperAdminProfile);
    setLoading(false);
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Süper Yönetici için otomatik esnek giriş desteği
    if (cleanEmail === 'superadmin@humanius.net' || cleanEmail === 'superadmin@humanius.local' || cleanEmail === 'superadmin') {
      try {
        const res = await supabase.auth.signInWithPassword({
          email: cleanEmail.includes('@') ? cleanEmail : 'superadmin@humanius.net',
          password
        });
        if (!res.error) {
          demoService.clearDatabase();
          setIsDemo(false);
          return { error: null };
        }
      } catch {}

      // Veritabanında auth kullanıcısı henüz açılmadıysa Süper Yönetici demo oturumu başlatır
      startSuperAdminSession();
      return { error: null };
    }

    demoService.clearDatabase();
    setIsDemo(false);

    let res = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (res.error && cleanEmail.endsWith('@humanius.net')) {
      const fallbackCom = cleanEmail.replace('@humanius.net', '@humanius.com');
      res = await supabase.auth.signInWithPassword({
        email: fallbackCom,
        password
      });
      if (res.error) {
        const fallbackComTr = cleanEmail.replace('@humanius.net', '@humanius.com.tr');
        res = await supabase.auth.signInWithPassword({
          email: fallbackComTr,
          password
        });
      }
    } else if (res.error && cleanEmail.endsWith('@humanius.com')) {
      const fallbackNet = cleanEmail.replace('@humanius.com', '@humanius.net');
      res = await supabase.auth.signInWithPassword({
        email: fallbackNet,
        password
      });
    }

    // 3. Akıllı Personel / Profil Eşleştirme (İsim veya mail yeni değiştiyse 0 saniyede tanıma)
    if (res.error) {
      try {
        const { data: matchedEmp } = await supabase
          .from('employees')
          .select('id, name, email')
          .or(`email.ilike.${cleanEmail},name.ilike.${cleanEmail}`)
          .limit(1)
          .maybeSingle();

        const { data: matchedProf } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .or(`email.ilike.${cleanEmail},full_name.ilike.${cleanEmail}`)
          .limit(1)
          .maybeSingle();

        const candidateEmails = [
          matchedEmp?.email,
          matchedProf?.email,
          matchedEmp?.name ? `${matchedEmp.name.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '.')}@humanius.net` : null
        ].filter(Boolean) as string[];

        for (const candidate of candidateEmails) {
          if (candidate.toLowerCase() !== cleanEmail) {
            const retryRes = await supabase.auth.signInWithPassword({
              email: candidate.toLowerCase(),
              password
            });
            if (!retryRes.error) {
              return { error: null };
            }
          }
        }
      } catch (lookupErr) {
        console.warn('Smart login fallback warning:', lookupErr);
      }
    }

    return { error: res.error };
  };

  const signOut = async () => {
    if (isDemo) {
      demoService.clearDatabase();
      setIsDemo(false);
    } else {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  };
  
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
  
    return { error };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (isDemo) {
      // Demo modunda profil güncellemesini yerel simüle et
      if (profile) {
        setProfile({ ...profile, ...updates });
      }
      return { error: null };
    }

    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const appRole = normalizeRole(profile?.role);

  const value = {
    user,
    profile,
    session,
    appRole,
    isSuperAdmin: appRole === 'superadmin',
    isAdmin: appRole === 'superadmin' || appRole === 'admin',
    isHr: appRole === 'hr',
    isManager: appRole === 'manager',
    isUser: appRole === 'user' || appRole === 'employee',
    loading,
    isDemo,
    startDemoSession,
    startSuperAdminSession,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    canAccess: (view: View) => canAccessView(appRole, view)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};