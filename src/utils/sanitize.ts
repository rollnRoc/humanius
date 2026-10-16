/**
 * Security & Date Utility Functions for Humanius HRMS
 */

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function getTodayYYYYMMDD(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateToLocalYYYYMMDD(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * SEC-02: LocalStorage Sensitive Data Encryption Wrapper
 */
const SECRET_SALT = 'HMN_SEC_2026_SALT';

export const secureStorage = {
  setItem(key: string, data: any): void {
    try {
      const jsonStr = JSON.stringify(data);
      const encoded = btoa(encodeURIComponent(jsonStr).split('').map((c, i) => 
        String.fromCharCode(c.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
      ).join(''));
      localStorage.setItem(`__enc_${key}`, encoded);
    } catch (e) {
      console.warn('secureStorage.setItem error:', e);
      localStorage.setItem(key, JSON.stringify(data));
    }
  },

  getItem<T>(key: string): T | null {
    try {
      const encKey = `__enc_${key}`;
      const rawEnc = localStorage.getItem(encKey);
      if (rawEnc) {
        const decodedStr = atob(rawEnc).split('').map((c, i) =>
          String.fromCharCode(c.charCodeAt(0) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length))
        ).join('');
        return JSON.parse(decodeURIComponent(decodedStr)) as T;
      }
      // Fallback unencrypted legacy key
      const legacy = localStorage.getItem(key);
      return legacy ? JSON.parse(legacy) as T : null;
    } catch (e) {
      console.warn('secureStorage.getItem error:', e);
      const legacy = localStorage.getItem(key);
      return legacy ? JSON.parse(legacy) as T : null;
    }
  },

  removeItem(key: string): void {
    localStorage.removeItem(`__enc_${key}`);
    localStorage.removeItem(key);
  }
};

/**
 * Turkish lowercase normalization helper that handles İ/i, I/ı, Ğ/ğ, Ü/ü, Ş/ş, Ö/ö, Ç/ç
 */
export function normalizeTurkish(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .trim();
}

/**
 * Robust matching between logged-in Auth User/Profile and Employee list
 */
export function matchEmployeeToUser<T extends { id: string; name?: string; email?: string }>(
  employees: T[],
  profile: any,
  user?: any
): T | null {
  if (!employees || employees.length === 0) return null;

  const candidateEmails = [
    profile?.email,
    user?.email,
    user?.user_metadata?.email,
  ]
    .filter(Boolean)
    .map((e) => String(e).trim().toLowerCase());

  const profileFullName = String(
    profile?.full_name || user?.user_metadata?.full_name || profile?.name || ''
  ).trim();
  const normProfileName = normalizeTurkish(profileFullName).replace(/[\s-]/g, '');

  // 1. Direct ID match if profile.id or user.id is in employee
  const targetIds = [profile?.id, user?.id].filter(Boolean);
  if (targetIds.length > 0) {
    const idMatch = employees.find(
      (e) =>
        targetIds.includes(e.id) ||
        targetIds.includes((e as any).user_id) ||
        targetIds.includes((e as any).profile_id) ||
        targetIds.includes((e as any).auth_id)
    );
    if (idMatch) return idMatch;
  }

  // 2. Email match (exact or username prefix)
  if (candidateEmails.length > 0) {
    const emailMatch = employees.find((e) => {
      const empEmails = [
        e.email,
        (e as any).contact_email,
        (e as any).personal_email,
        (e as any).work_email,
      ]
        .filter(Boolean)
        .map((x) => String(x).trim().toLowerCase());

      return candidateEmails.some((ce) => {
        if (empEmails.includes(ce)) return true;
        const ceUser = ce.split('@')[0];
        return empEmails.some((ee) => {
          const eeUser = ee.split('@')[0];
          return ceUser === eeUser || (ceUser.length >= 3 && eeUser.includes(ceUser));
        });
      });
    });
    if (emailMatch) return emailMatch;
  }

  // 2.5 TC Kimlik / Telefon eşleşmesi
  const userTc = (user?.user_metadata?.tc_no || (profile as any)?.tc_no || '').toString().trim();
  const userPhone = (user?.user_metadata?.phone || (profile as any)?.phone || '').toString().replace(/\D/g, '');
  if (userTc || (userPhone && userPhone.length >= 7)) {
    const tcPhoneMatch = employees.find((e: any) => {
      if (userTc && e.tc_no && String(e.tc_no).trim() === userTc) return true;
      if (userPhone && e.phone) {
        const empP = String(e.phone).replace(/\D/g, '');
        if (empP && (empP === userPhone || empP.endsWith(userPhone) || userPhone.endsWith(empP))) return true;
      }
      return false;
    });
    if (tcPhoneMatch) return tcPhoneMatch;
  }

  // 3. Name match with Turkish normalization
  if (normProfileName.length > 1) {
    const nameMatch = employees.find((e) => {
      const empName = String(e.name || '').trim();
      const normEmpName = normalizeTurkish(empName).replace(/[\s-]/g, '');
      return (
        normEmpName.length > 1 &&
        (normEmpName === normProfileName ||
          normEmpName.includes(normProfileName) ||
          normProfileName.includes(normEmpName) ||
          normEmpName.startsWith(normProfileName) ||
          normProfileName.startsWith(normEmpName))
      );
    });
    if (nameMatch) return nameMatch;
  }

  // 4. Fallback: match by email username against employee first name
  if (candidateEmails.length > 0) {
    const firstPart = candidateEmails[0].split('@')[0].split('.')[0].replace(/[^a-z0-9]/g, '');
    if (firstPart.length >= 3) {
      const firstPartNorm = normalizeTurkish(firstPart);
      const namePartMatch = employees.find((e) => {
        const empFirst = normalizeTurkish(String(e.name || '').split(' ')[0]);
        return empFirst && (empFirst === firstPartNorm || empFirst.startsWith(firstPartNorm) || firstPartNorm.startsWith(empFirst));
      });
      if (namePartMatch) return namePartMatch;
    }
  }

  return null;
}

