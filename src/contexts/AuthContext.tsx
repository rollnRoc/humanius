import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { canAccessView, normalizeRole, canApproveLeave, type AppRole } from '../auth/roles';
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
  canApproveLeave: boolean;
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
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('humanius_cached_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(() => {
    try {
      if (localStorage.getItem('humanius_demo_mode') === 'true') return false;
      const cached = localStorage.getItem('humanius_cached_profile');
      if (cached) return false;
    } catch {}
    return true;
  });
  const [isDemo, setIsDemo] = useState(false);

  const userRef = useRef<User | null>(null);
  const profileRef = useRef<Profile | null>(profile);
  const isInitialLoadDoneRef = useRef(false);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    // 1. Önce Gerçek Supabase Oturumu Kontrolü (Her zaman öncelikli!)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        try {
          localStorage.removeItem('humanius_demo_mode');
          localStorage.removeItem('humanius_demo_start_time');
        } catch {}
        setIsDemo(false);
        setSession(session);
        setUser(session.user);
        userRef.current = session.user;
        fetchProfile(session.user.id, !profileRef.current).finally(() => {
          isInitialLoadDoneRef.current = true;
          setLoading(false);
        });
        return;
      }

      // 2. Süper Yönetici Oturumu Kontrolü (Fallback esnek giriş)
      const isSuperAdminActive = localStorage.getItem('humanius_superadmin_session') === 'true';
      if (isSuperAdminActive) {
        demoService.clearDatabase();
        try {
          localStorage.removeItem('humanius_demo_mode');
          localStorage.removeItem('humanius_demo_start_time');
        } catch {}
        setIsDemo(false);
        setUser(mockSuperAdminUser);
        userRef.current = mockSuperAdminUser as any;
        setProfile(mockSuperAdminProfile);
        profileRef.current = mockSuperAdminProfile;
        setLoading(false);
        isInitialLoadDoneRef.current = true;
        return;
      }

      // 3. Demo Modu (Yalnızca açıkça Demoyu Dene tıklandıysa ve oturum yoksa)
      const isDemoActive = localStorage.getItem('humanius_demo_mode') === 'true';
      if (isDemoActive) {
        const startTime = parseInt(localStorage.getItem('humanius_demo_start_time') || '0', 10);
        const isExpired = Date.now() - startTime > 2 * 24 * 60 * 60 * 1000;

        if (isExpired) {
          demoService.clearDatabase();
          setIsDemo(false);
          setUser(null);
          userRef.current = null;
          setProfile(null);
          profileRef.current = null;
          setLoading(false);
          isInitialLoadDoneRef.current = true;
        } else {
          setIsDemo(true);
          setUser(mockDemoUser);
          userRef.current = mockDemoUser as any;
          setProfile(mockDemoProfile);
          profileRef.current = mockDemoProfile;
          setLoading(false);
          isInitialLoadDoneRef.current = true;
          return;
        }
      } else {
        setSession(null);
        setUser(null);
        userRef.current = null;
        setProfile(null);
        profileRef.current = null;
        setLoading(false);
        isInitialLoadDoneRef.current = true;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        localStorage.removeItem('humanius_demo_mode');
        localStorage.removeItem('humanius_demo_start_time');
        setIsDemo(false);
        setSession(session);

        const currentUserId = userRef.current?.id;
        const isSameUser = currentUserId === session.user.id;

        if (!isSameUser) {
          setUser(session.user);
          userRef.current = session.user;
        }

        // Sekme değiştiğinde (Alt-Tab), pencereye geri dönüldüğünde veya token yenilendiğinde (TOKEN_REFRESHED):
        // Kullanıcı zaten aktifse ASLA loading ekranına geçme ve arayüzü sıfırlama!
        if (event === 'TOKEN_REFRESHED' && isSameUser) {
          return;
        }

        if (event === 'SIGNED_IN') {
          if (!isSameUser || !isInitialLoadDoneRef.current) {
            fetchProfile(session.user.id, !profileRef.current);
          } else {
            // Kullanıcı zaten oturumda; profil eksikse arka planda sessizce çek
            if (!profileRef.current) {
              fetchProfile(session.user.id, false);
            }
          }
        } else if (event === 'USER_UPDATED') {
          fetchProfile(session.user.id, false);
        }
      } else if (localStorage.getItem('humanius_demo_mode') !== 'true') {
        userRef.current = null;
        profileRef.current = null;
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
      try {
        localStorage.setItem('humanius_cached_profile', JSON.stringify(profile));
      } catch {}
    }
  }, [profile, isDemo]);

  const fetchProfile = async (userId: string, showLoading: boolean = false) => {
    if (showLoading && !profileRef.current) {
      setLoading(true);
    }
    try {
      // 1. Direct fast query to profiles table
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch warning:', error.message);
      }

      if (data && data.role) {
        const prev = profileRef.current;
        if (
          !prev ||
          prev.id !== data.id ||
          prev.role !== data.role ||
          prev.company_id !== data.company_id ||
          prev.full_name !== data.full_name ||
          prev.email !== data.email ||
          prev.avatar_url !== data.avatar_url
        ) {
          setProfile(data);
          profileRef.current = data;
        }
        try {
          localStorage.setItem('humanius_cached_profile', JSON.stringify(data));
        } catch {}
        return;
      }

      // 2. Profil tablosunda ID ile henüz yoksa veya rolü boşsa e-posta ile eşle
      const userEmail = userRef.current?.email?.toLowerCase().trim();

      if (userEmail) {
        const { data: pByEmail } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', userEmail)
          .maybeSingle();

        if (pByEmail && pByEmail.role) {
          setProfile(pByEmail);
          profileRef.current = pByEmail;
          try {
            localStorage.setItem('humanius_cached_profile', JSON.stringify(pByEmail));
          } catch {}
          return;
        }
      }

      // 2.5 Edge Function fallback (service_role) if direct DB query failed or returned no role
      if (userEmail || userId) {
        try {
          const { data: edgeRes } = await supabase.functions.invoke('user-management', {
            body: { operation: 'list_users' }
          });
          const matched = edgeRes?.users?.find(
            (u: any) => (userId && u.id === userId) || (userEmail && u.email?.toLowerCase().trim() === userEmail)
          );
          if (matched && matched.role) {
            setProfile(matched);
            profileRef.current = matched;
            try {
              localStorage.setItem('humanius_cached_profile', JSON.stringify(matched));
            } catch {}
            return;
          }
        } catch (edgeErr) {
          console.warn('Edge function list_users fallback warning:', edgeErr);
        }
      }

      // 3. Employees tablosundan direkt hızlı sorgu (50ms)
      let matchedCompanyId = data?.company_id || null;
      let matchedFullName = data?.full_name || userRef.current?.user_metadata?.full_name || 'Personel';
      let matchedRole = data?.role || (userRef.current?.user_metadata as any)?.role || 'employee';

      if (userEmail) {
        try {
          const { data: emp } = await supabase
            .from('employees')
            .select('id, name, company_id, role')
            .ilike('email', userEmail)
            .maybeSingle();

          if (emp) {
            matchedCompanyId = matchedRole === 'superadmin' ? null : (emp.company_id || matchedCompanyId);
            matchedFullName = emp.name || matchedFullName;
            if (emp.role) {
              matchedRole = emp.role;
            }
          }
        } catch {}
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
      profileRef.current = fallbackProf;
      try {
        localStorage.setItem('humanius_cached_profile', JSON.stringify(fallbackProf));
      } catch {}
    } catch (error) {
      console.warn('Error fetching profile:', error);
      if (!profileRef.current) {
        setProfile(null);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
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
    demoService.clearDatabase();
    try {
      localStorage.removeItem('humanius_demo_mode');
      localStorage.removeItem('humanius_demo_start_time');
      localStorage.setItem('humanius_superadmin_session', 'true');
    } catch {}
    
    setIsDemo(false);
    setUser(mockSuperAdminUser);
    userRef.current = mockSuperAdminUser as any;
    setProfile(mockSuperAdminProfile);
    profileRef.current = mockSuperAdminProfile;
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
          try {
            localStorage.removeItem('humanius_demo_mode');
            localStorage.removeItem('humanius_demo_start_time');
            localStorage.removeItem('humanius_superadmin_session');
          } catch {}
          setIsDemo(false);
          return { error: null };
        }
      } catch {}

      // Veritabanında auth kullanıcısı henüz açılmadıysa veya şifre girilmediyse Süper Yönetici oturumu başlatır
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
    try {
      localStorage.removeItem('humanius_current_view');
      localStorage.removeItem('humanius_pdks_active_tab');
      localStorage.removeItem('humanius_demo_mode');
      localStorage.removeItem('humanius_demo_start_time');
      localStorage.removeItem('humanius_superadmin_session');
      localStorage.removeItem('humanius_cached_profile');
    } catch {}
    if (isDemo) {
      demoService.clearDatabase();
      setIsDemo(false);
    } else {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    userRef.current = null;
    profileRef.current = null;
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

  const appRole = user?.email === 'superadmin@humanius.net'
    ? 'superadmin'
    : normalizeRole(profile?.role || (user?.user_metadata as any)?.role);

  const value = {
    user,
    profile,
    session,
    appRole,
    isSuperAdmin: appRole === 'superadmin' || user?.email === 'superadmin@humanius.net',
    isAdmin: appRole === 'superadmin' || appRole === 'admin',
    isHr: appRole === 'hr',
    isManager: appRole === 'manager',
    isUser: appRole === 'user' || appRole === 'employee',
    canApproveLeave: canApproveLeave(appRole),
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