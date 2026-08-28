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

export interface RememberedAccount {
  email: string;
  fullName: string;
  companyName?: string;
  roleTitle?: string;
  lastLoginAt: number;
}

export function saveRememberedAccount(prof: any, companyNameOverride?: string) {
  if (!prof || !prof.email) return;
  try {
    let companyName = companyNameOverride || prof.company_name || '';
    if (!companyName && prof.company_id) {
      const companyMap: Record<string, string> = {
        '11111111-1111-1111-1111-111111111111': 'Bigsafer Teknolojiler A.Ş.',
        '735825a4-f12b-4ee7-959c-a8a29e674617': 'Mıçı Otomotiv',
        '87ed6f79-6a54-40ea-b188-8b325513dc41': 'Çavdarlı',
        'd4be3c56-bc23-4ecd-91e3-78f9625a5cb9': 'Hızel Otomotiv A.Ş.',
        'aaaaaaaa-0000-0000-0000-000000000001': 'Humanius Demo Şirketi',
      };
      companyName = companyMap[prof.company_id] || '';
    }
    const roleLabels: Record<string, string> = {
      superadmin: 'Süper Yönetici',
      admin: 'Şirket Yöneticisi',
      hr: 'İnsan Kaynakları',
      manager: 'Departman Yöneticisi',
      employee: 'Personel',
      user: 'Personel'
    };
    const remembered: RememberedAccount = {
      email: prof.email.trim().toLowerCase(),
      fullName: prof.full_name || 'Kullanıcı',
      companyName: companyName || (prof.role === 'superadmin' ? 'Humanius Sistem' : 'Humanius'),
      roleTitle: roleLabels[prof.role] || 'Personel',
      lastLoginAt: Date.now()
    };
    localStorage.setItem('humanius_remembered_account', JSON.stringify(remembered));
  } catch (e) {
    console.warn('Failed to save remembered account:', e);
  }
}

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.removeItem('humanius_demo_mode');
        localStorage.removeItem('humanius_demo_start_time');
        setIsDemo(false);
        setSession(session);
        setUser(session.user);
        
        // Sadece yeni bir kullanıcı girişi varsa yükleme ekranı tetiklenir; şifre ve kullanıcı güncellemelerinde sayfa yenilenmez
        if (event === 'SIGNED_IN' && !user) {
          setLoading(true);
        }
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

  useEffect(() => {
    if (profile && !isDemo) {
      saveRememberedAccount(profile);
    }
  }, [profile, isDemo]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch warning:', error.message);
      }

      if (data && data.role) {
        setProfile(data);
        return;
      }

      // 2. Profil tablosunda ID ile henüz yoksa veya rolü boşsa oturum açan kullanıcının e-postası ile eşle
      const { data: authUserData } = await supabase.auth.getUser();
      const userEmail = authUserData.user?.email?.toLowerCase().trim();

      if (userEmail) {
        const { data: pByEmail } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', userEmail)
          .maybeSingle();

        if (pByEmail && pByEmail.role) {
          setProfile(pByEmail);
          return;
        }
      }

      // 3. Edge function (service_role) fallback to bypass any client RLS restrictions
      try {
        const { data: edgeData } = await supabase.functions.invoke('user-management', {
          body: { operation: 'list_users' }
        });
        const matched = (edgeData?.users || []).find((u: any) => u.id === userId || (userEmail && u.email?.toLowerCase().trim() === userEmail));
        if (matched && matched.role) {
          setProfile(matched);
          return;
        }
      } catch {}

      let matchedCompanyId = data?.company_id || null;
      let matchedFullName = data?.full_name || authUserData.user?.user_metadata?.full_name || 'Personel';
      let matchedRole = data?.role || (authUserData.user?.user_metadata as any)?.role || 'employee';

      if (userEmail) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, name, company_id')
          .eq('email', userEmail)
          .maybeSingle();

        if (emp) {
          matchedCompanyId = matchedRole === 'superadmin' ? null : (emp.company_id || matchedCompanyId);
          matchedFullName = emp.name || matchedFullName;
        }
      }

      const fallbackProf: Profile = {
        id: userId,
        email: userEmail || data?.email || '',
        full_name: matchedFullName,
        company_id: matchedRole === 'superadmin' ? null : matchedCompanyId,
        role: matchedRole,
        created_at: data?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfile(fallbackProf);
    } catch (error) {
      console.warn('Error fetching profile:', error);
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
    let cleanEmail = email
      .trim()
      .toLowerCase()
      .replace(/\.+@/, '@')
      .replace(/^\.+/, '')
      .replace(/\.{2,}/g, '.');

    if (!cleanEmail.includes('@')) {
      cleanEmail = `${cleanEmail}@humanius.net`;
    }

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

    // Güvenli ve doğrudan kimlik doğrulama
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
    if (isDemo) {
      return { error: null };
    }
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      data: {
        must_change_password: false,
        is_first_login: false,
        password_customized: true
      }
    });

    if (!error && user) {
      try {
        await supabase.from('profiles').update({
          must_change_password: false
        }).eq('id', user.id);
      } catch {}
    }
  
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