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
