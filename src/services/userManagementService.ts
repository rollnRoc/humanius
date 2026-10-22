import { supabase } from '../lib/supabase';
import { normalizeDateForInput } from '../utils/dateUtils';

export interface BootstrapSuperAdminPayload {
  email?: string;
  password?: string;
  fullName?: string;
}

export interface CreateCompanyWithAdminPayload {
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  companyCity?: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface CreateCompanyUserPayload {
  companyId?: string;
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'employee' | 'hr' | 'user' | 'superadmin' | string;
}

export interface UpdateManagedPasswordPayload {
  userId: string;
  newPassword: string;
}

function computeOperationToken(operation: string): string {
  const raw = `hmn-op-v1:${operation}:7c3e9a5b2d`;
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `op1_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

async function invokeFunction<T>(operation: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('user-management', {
    body: {
      operation,
      clientToken: computeOperationToken(operation),
      ...payload,
    },
  });

  if (error) {
    // FunctionsHttpError içinde JSON body gelebilir
    let message = error.message;
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) message = body.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export const userManagementService = {
  bootstrapSuperAdmin(payload: BootstrapSuperAdminPayload = {}) {
    return invokeFunction<{ message: string; userId: string }>('bootstrap_superadmin', payload);
  },

  createCompanyWithAdmin(payload: CreateCompanyWithAdminPayload) {
    return invokeFunction<{ message: string; companyId: string; adminUserId: string }>('create_company_with_admin', payload);
  },

  createCompanyUser(payload: CreateCompanyUserPayload) {
    return invokeFunction<{ message: string; userId: string }>('create_company_user', payload);
  },

  updateManagedPassword(payload: UpdateManagedPasswordPayload) {
    return invokeFunction<{ message: string }>('update_password', payload);
  },

  directResetPassword(payload: { email?: string; userId?: string; newPassword: string; fullName?: string }) {
    return invokeFunction<{ success: boolean; message: string; userId: string; newPassword: string }>('admin_direct_reset_password', payload);
  },

  deleteUserAndEmployee(payload: { employeeId?: string; email?: string; userId?: string }) {
    return invokeFunction<{ message: string }>('delete_employee_and_user', payload);
  },

  updateUserProfile(payload: {
    email?: string;
    userId?: string;
    companyId?: string | null;
    role?: string;
    fullName?: string;
  }) {
    return invokeFunction<{ message: string }>('update_user_profile', payload);
  },

  async updateEmployeeDetails(payload: {
    email: string;
    oldEmail?: string;
    employeeId?: string;
    companyId?: string;
    fullName?: string;
    role?: string;
    level?: string;
    position?: string;
    department?: string;
    phone?: string;
    contact_email?: string;
    salary?: number;
    status?: string;
    join_date?: string | null;
    joinDate?: string | null;
    birth_date?: string | null;
    birthDate?: string | null;
    tc_no?: string;
    sicil_no?: string;
    is_yeri_sgk_sicil_no?: string;
    isYeriSgkSicilNo?: string;
    address?: string;
    employee_type?: string;
    employeeType?: string;
  }) {
    // 1. Önce update_employee_details operasyonu ile auth.users, profiles ve employees tablolarını (oldEmail destekli) güncelle
    const cleanPayload: Record<string, any> = { ...payload };

    // Tarih normalizasyonu

    const rawJd = cleanPayload.join_date !== undefined ? cleanPayload.join_date : cleanPayload.joinDate;
    if (rawJd !== undefined) {
      cleanPayload.join_date = normalizeDateForInput(rawJd) || null;
    }
    delete cleanPayload.joinDate;

    const rawBd = cleanPayload.birth_date !== undefined ? cleanPayload.birth_date : cleanPayload.birthDate;
    if (rawBd !== undefined) {
      cleanPayload.birth_date = normalizeDateForInput(rawBd) || null;
    }
    delete cleanPayload.birthDate;

    // Seviye (Level) kontrolü (NOT NULL constraint koruması)
    if (cleanPayload.level !== undefined) {
      const validLevels = ['Junior', 'Mid', 'Senior', 'Lead', 'Manager'];
      if (!validLevels.includes(cleanPayload.level)) {
        cleanPayload.level = 'Junior';
      }
    }

    // employees tablosunda 'role' veya 'personal_email' kolonu bulunmadığından
    // uzaktaki Edge Function'ın hata verip güncellemeden vazgeçmesini önlemek için bunları tamamen temizliyoruz.
    delete cleanPayload.role;
    delete cleanPayload.personal_email;
    delete cleanPayload.contact_email;
    delete cleanPayload.contactEmail;

    const res = await invokeFunction<{ message: string }>('update_employee_details', cleanPayload);

    // 2. Profil ve yetki rolü güncellemesi varsa, profiles tablosunu update_user_profile ile kesinleştir
    if (payload.role || payload.fullName || payload.companyId) {
      try {
        await invokeFunction<{ message: string }>('update_user_profile', {
          email: payload.email,
          role: payload.role,
          companyId: payload.companyId,
          fullName: payload.fullName,
        });
      } catch (profErr) {
        console.warn('update_user_profile uyarısı:', profErr);
      }
    }

    return res;
  },

  resetPasswordWithTcPhone(payload: { email: string; tcNo: string; phone: string }) {
    return invokeFunction<{ message: string }>('reset_password_with_tc_phone', payload);
  },

  flagForcePasswordChange(payload: { email?: string; userId?: string; forceState: boolean }) {
    return invokeFunction<{ message: string }>('flag_force_password_change', payload);
  },

  syncAllAccountsToNet() {
    return invokeFunction<{ message: string; count: number }>('sync_all_accounts_to_net', {});
  },
};