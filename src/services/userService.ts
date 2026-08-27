import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

interface EmployeeSeedInput {
  full_name: string;
  email: string;
  company_id: string;
}

type EnsureEmployeeResult = 'created' | 'exists' | 'blocked_by_rls';

const EMPLOYEE_RLS_ERROR_TEXT = 'new row violates row-level security policy for table "employees"';
const MISSING_SIGNATURE_COLUMN_TEXT = 'approval_signature';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  company_id: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  company_id: string | null;
}

export interface UserSecuritySettings {
  employeeId: string | null;
  approvalPasscode: string | null;
  approvalSignature: string | null;
}

const normalizeEmail = (value: string) => value.trim().toLowerCase();

async function ensureEmployeeFromUser(input: EmployeeSeedInput): Promise<EnsureEmployeeResult> {
  const { data: existingEmployees, error: existingError } = await supabase
    .from('employees')
    .select('id, email')
    .eq('company_id', input.company_id);

  if (existingError) throw existingError;

  const exists = (existingEmployees ?? []).some((employee) =>
    normalizeEmail(employee.email ?? '') === normalizeEmail(input.email),
  );

  if (exists) return 'exists';

  const { error: createError } = await supabase.from('employees').insert({
    company_id: input.company_id,
    name: input.full_name,
    department: 'Genel',
    position: 'Personel',
    level: '',
    salary: 0,
    status: 'active',
    phone: '',
    email: input.email,
    address: '',
    skills: [],
    employee_type: 'normal',
  });

  if (createError) {
    if (String(createError.message || '').toLowerCase().includes(EMPLOYEE_RLS_ERROR_TEXT)) {
      return 'blocked_by_rls';
    }
    throw createError;
  }
  return 'created';
}

async function findEmployeeByUser(profile: UserProfile) {
  if (!profile.company_id) return null;

  const withSignature = await supabase
    .from('employees')
    .select('id, email, approval_passcode, approval_signature')
    .eq('company_id', profile.company_id)
    .ilike('email', normalizeEmail(profile.email))
    .maybeSingle();

  if (!withSignature.error) {
    return withSignature.data;
  }

  if (!String(withSignature.error.message || '').includes(MISSING_SIGNATURE_COLUMN_TEXT)) {
    throw withSignature.error;
  }

  const fallback = await supabase
    .from('employees')
    .select('id, email, approval_passcode')
    .eq('company_id', profile.company_id)
    .ilike('email', normalizeEmail(profile.email))
    .maybeSingle();

  if (fallback.error) throw fallback.error;

  return fallback.data
    ? {
        ...fallback.data,
        approval_signature: null,
      }
    : null;
}

const getEmployeeRlsWarning = () =>
  'Kullanıcı oluşturuldu, ancak Personel listesine otomatik ekleme yapılamadı. Bunun için employees RLS migration\'ını uygulamanız gerekir.';

function toAsciiEmail(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/İ/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/Ç/g, 'c');
}

export const userService = {
  async getAll(): Promise<UserProfile[]> {
    let profilesList: UserProfile[] = [];
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        profilesList = data as UserProfile[];
      }
    } catch {}

    if (profilesList.length === 0) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'list_users' }
        });
        if (res?.users && res.users.length > 0) {
          profilesList = res.users as UserProfile[];
        }
      } catch {}
    }

    // Personel listesindeki tüm personellerin Kullanıcılar ekranında yer almasını garanti et
    try {
      const { data: emps } = await supabase.from('employees').select('id, name, email, company_id, role, avatar_url, created_at, updated_at');
      if (emps && emps.length > 0) {
        const emailMap = new Map<string, UserProfile>();
        const idMap = new Map<string, UserProfile>();
        
        profilesList.forEach((p) => {
          if (p.email) emailMap.set(p.email.toLowerCase().trim(), p);
          if (p.id) idMap.set(p.id, p);
        });

        const missingProfilesToUpsert: any[] = [];

        emps.forEach((e) => {
          const empEmail = (e.email || '').toLowerCase().trim();
          const cleanEmail = empEmail || `${toAsciiEmail(e.name).replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').toLowerCase() || 'personel'}@humanius.net`;
          
          let existing = (e.email ? emailMap.get(empEmail) : null) || idMap.get(e.id);
          if (!existing) {
            const synthesized: UserProfile = {
              id: e.id,
              email: cleanEmail,
              full_name: e.name || 'Personel',
              company_id: e.company_id || null,
              role: e.role || 'employee',
              avatar_url: e.avatar_url || null,
              created_at: e.created_at || new Date().toISOString(),
              updated_at: e.updated_at || new Date().toISOString(),
            };
            emailMap.set(cleanEmail, synthesized);
            idMap.set(e.id, synthesized);
            profilesList.push(synthesized);

            missingProfilesToUpsert.push({
              id: e.id,
              email: cleanEmail,
              full_name: e.name || 'Personel',
              company_id: e.company_id || null,
              role: e.role || 'employee',
              must_change_password: true
            });
          }
        });

        // Arka planda profiles tablosuna da kaydet
        if (missingProfilesToUpsert.length > 0) {
          supabase.from('profiles').upsert(missingProfilesToUpsert).then().catch(console.warn);
        }
      }
    } catch {}

    return profilesList;
  },

  async getByCompany(companyId: string): Promise<UserProfile[]> {
    const all = await this.getAll();
    return all.filter((u) => u.company_id === companyId);
  },

  /**
   * Admin başka kullanıcının profilini güncellemek için SECURITY DEFINER RPC kullanır.
   * Kendi profilini güncellemek için doğrudan UPDATE yapar.
   */
  async updateProfile(
    targetId: string,
    updates: { role?: string; full_name?: string; company_id?: string | null },
    currentUserId: string,
  ): Promise<void> {
    if (targetId === currentUserId) {
      // Kendi profili — normal UPDATE (RLS: id = auth.uid())
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', targetId);
      if (error) throw error;
    } else {
      // Başkasının profili — SECURITY DEFINER RPC
      const { error } = await supabase.rpc('admin_update_user_profile', {
        target_id: targetId,
        new_role: updates.role ?? null,
        new_full_name: updates.full_name ?? null,
        new_company_id: updates.company_id ?? null,
      });
      if (error) throw error;
    }

    // Eşzamanlı olarak employees tablosunu da güncelle
    try {
      const { data: prof } = await supabase.from('profiles').select('email').eq('id', targetId).maybeSingle();
      if (prof?.email) {
        const empUpdates: Record<string, any> = {};
        if (updates.full_name) empUpdates.name = updates.full_name;
        if (updates.company_id) empUpdates.company_id = updates.company_id;
        if (Object.keys(empUpdates).length > 0) {
          await supabase.from('employees').update(empUpdates).ilike('email', prof.email);
        }
      }
    } catch (empSyncErr) {
      console.warn('Employees sync error from updateProfile:', empSyncErr);
    }
  },

  /**
   * Yeni kullanıcı oluşturur:
   * 1. signUp ile auth kullanıcısı oluşturur
   * 2. Email onayı kapalıysa yeni oturumla profil ekler, ardından admin oturumunu geri yükler
   * 3. Email onayı açıksa kullanıcı emaili onaylayınca profil trigger ile oluşturulabilir
   */
  async createUser(userData: CreateUserData): Promise<{ success: boolean; error?: string; needsEmailConfirm?: boolean; warning?: string }> {
    // Mevcut admin oturumunu kaydet
    const { data: { session: adminSession } } = await supabase.auth.getSession();

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            must_change_password: true,
            is_first_login: true
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error('Kullanıcı oluşturulamadı');

      if (signUpData.session) {
        // Email onayı kapalı: yeni kullanıcı otomatik giriş yaptı
        // Profil kaydını şimdi ekle (auth.uid() = yeni kullanıcı)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            email: userData.email,
            full_name: userData.full_name,
            company_id: userData.company_id,
            role: userData.role,
            must_change_password: true,
            is_first_login: true,
          } as any);

        if (profileError) throw profileError;

        // Admin oturumunu geri yükle
        if (adminSession) {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        }

        let employeeInserted = true;
        if (userData.company_id) {
          const employeeResult = await ensureEmployeeFromUser({
            full_name: userData.full_name,
            email: userData.email,
            company_id: userData.company_id,
          });
          employeeInserted = employeeResult !== 'blocked_by_rls';
        }
        return {
          success: true,
          warning: employeeInserted ? undefined : getEmployeeRlsWarning(),
        };
      } else {
        // Email onayı açık: kullanıcıya email gönderildi, oturum değişmedi
        return { success: true, needsEmailConfirm: true };
      }
    } catch (err: any) {
      // Hata durumunda admin oturumunu geri yüklemeye çalış
      if (adminSession) {
        try {
          await supabase.auth.setSession({
            access_token: adminSession.access_token,
            refresh_token: adminSession.refresh_token,
          });
        } catch {
          // ignore
        }
      }
      return { success: false, error: err.message };
    }
  },

  async deleteProfile(targetId: string, currentUserId: string): Promise<void> {
    if (targetId === currentUserId) {
      throw new Error('Kendi hesabınızı bu ekrandan silemezsiniz.');
    }

    const { error } = await supabase.rpc('admin_delete_user_profile', {
      target_id: targetId,
    });

    if (error) throw error;
  },

  async getUserSecuritySettings(profile: UserProfile): Promise<UserSecuritySettings> {
    const employee = await findEmployeeByUser(profile);
    return {
      employeeId: employee?.id ?? null,
      approvalPasscode: employee?.approval_passcode ?? null,
      approvalSignature: employee?.approval_signature ?? null,
    };
  },

  async updateUserSecuritySettings(
    profile: UserProfile,
    settings: { approvalPasscode?: string | null; approvalSignature?: string | null },
  ): Promise<void> {
    if (!profile.company_id) {
      throw new Error('Kullanıcının şirket bilgisi bulunmuyor.');
    }

    let employee = await findEmployeeByUser(profile);

    if (!employee) {
      const ensureResult = await ensureEmployeeFromUser({
        full_name: profile.full_name,
        email: profile.email,
        company_id: profile.company_id,
      });

      employee = await findEmployeeByUser(profile);
      if (!employee) {
        if (ensureResult === 'blocked_by_rls') {
          throw new Error('Personel kaydı oluşturulamadı. employees RLS yetkilerini kontrol edin.');
        }
        throw new Error('Personel kaydı bulunamadı.');
      }
    }

    const updates: { approval_passcode?: string | null; approval_signature?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(settings, 'approvalPasscode')) {
      updates.approval_passcode = settings.approvalPasscode ?? null;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'approvalSignature')) {
      updates.approval_signature = settings.approvalSignature ?? null;
    }

    const primary = await supabase
      .from('employees')
      .update(updates)
      .eq('id', employee.id);

    if (!primary.error) return;

    if (!String(primary.error.message || '').includes(MISSING_SIGNATURE_COLUMN_TEXT)) {
      throw primary.error;
    }

    const fallbackUpdates: { approval_passcode?: string | null } = {};
    if (Object.prototype.hasOwnProperty.call(settings, 'approvalPasscode')) {
      if (settings.approvalPasscode) {
        fallbackUpdates.approval_passcode = bcrypt.hashSync(settings.approvalPasscode, 10);
      } else {
        fallbackUpdates.approval_passcode = null;
      }
    }

    if (Object.keys(fallbackUpdates).length === 0) {
      return;
    }

    const fallback = await supabase
      .from('employees')
      .update(fallbackUpdates)
      .eq('id', employee.id);

    if (fallback.error) throw fallback.error;
  },

  async syncUsersToEmployees(): Promise<{ created: number; skipped: number; failed: number; warning?: string }> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('full_name, email, company_id')
      .not('company_id', 'is', null);

    if (error) throw error;

    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const profile of profiles ?? []) {
      if (!profile.company_id) {
        skipped += 1;
        continue;
      }

      try {
        const result = await ensureEmployeeFromUser({
          full_name: profile.full_name,
          email: profile.email,
          company_id: profile.company_id,
        });

        if (result === 'created') created += 1;
        else if (result === 'exists') skipped += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }

    const warning = failed > 0 ? getEmployeeRlsWarning() : undefined;
    return { created, skipped, failed, warning };
  },
};
