/**
 * Utility functions for persisting and parsing Employee City (İl) & District (İlçe)
 * without requiring direct DDL changes to the remote Supabase 'employees' table.
 */

export interface ParsedAddress {
  il: string;
  ilce: string;
  cleanAddress: string;
}

export function parseIsYeriSgkFromAddress(address?: string | null): string {
  if (!address) return '';
  const match = String(address).match(/\[SGK-ISYERI:\s*([^\]]+)\]/i);
  return match ? match[1].trim() : '';
}

export function parseAddressCity(address?: string | null): ParsedAddress {
  if (!address) return { il: '', ilce: '', cleanAddress: '' };
  let raw = String(address).trim();

  // Strip SGK-ISYERI tag from address string for city/district parsing
  raw = raw.replace(/\[SGK-ISYERI:\s*[^\]]+\]/gi, '').trim();

  // 1. Bracket format: "Açık adres metni [İlçe / İl]" or "Açık adres metni [İl]"
  const bracketMatch = raw.match(/\[(.*?)\]/);
  if (bracketMatch) {
    const inside = bracketMatch[1].trim();
    const cleanAddress = raw.replace(/\[.*?\]/, '').trim();
    if (inside.includes('/')) {
      const [ilce, il] = inside.split('/').map((s) => s.trim());
      return { il: il || '', ilce: ilce || '', cleanAddress };
    }
    return { il: inside, ilce: '', cleanAddress };
  }

  // 2. Short format: "İlçe / İl"
  if (raw.includes('/') && !raw.includes('\n')) {
    const parts = raw.split('/').map((s) => s.trim());
    if (parts.length === 2 && parts[0].length < 35 && parts[1].length < 35) {
      return { ilce: parts[0], il: parts[1], cleanAddress: '' };
    }
  }

  return { il: '', ilce: '', cleanAddress: raw };
}

export function formatAddressWithLocationAndSgk(
  address?: string | null,
  il?: string | null,
  ilce?: string | null,
  isYeriSgk?: string | null
): string {
  let baseAddr = (address || '').trim();
  // Strip previous metadata tags from base address
  baseAddr = baseAddr.replace(/\[SGK-ISYERI:\s*[^\]]+\]/gi, '').trim();
  baseAddr = baseAddr.replace(/\[.*?\]/, '').trim();

  const trimmedIl = (il || '').trim();
  const trimmedIlce = (ilce || '').trim();
  const trimmedSgk = (isYeriSgk || '').trim();

  const parts: string[] = [];
  if (baseAddr) parts.push(baseAddr);
  if (trimmedIl || trimmedIlce) {
    const locTag = trimmedIlce ? `[${trimmedIlce} / ${trimmedIl}]` : `[${trimmedIl}]`;
    parts.push(locTag);
  }
  if (trimmedSgk) {
    parts.push(`[SGK-ISYERI: ${trimmedSgk}]`);
  }
  return parts.join(' ').trim();
}

export function formatAddressWithCity(
  address?: string | null,
  il?: string | null,
  ilce?: string | null,
  isYeriSgk?: string | null
): string {
  const existingSgk = isYeriSgk !== undefined && isYeriSgk !== null ? isYeriSgk : parseIsYeriSgkFromAddress(address);
  return formatAddressWithLocationAndSgk(address, il, ilce, existingSgk);
}

export function getEmployeeLocationMeta(
  empId?: string | null,
  email?: string | null
): { il: string; ilce: string } {
  try {
    if (empId) {
      const raw = localStorage.getItem(`humanius_emp_loc_${empId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.il || parsed.ilce) return parsed;
      }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const raw = localStorage.getItem(`humanius_emp_loc_${cleanEmail}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.il || parsed.ilce) return parsed;
      }
    }
  } catch {}
  return { il: '', ilce: '' };
}

export function saveEmployeeLocationMeta(
  empId?: string | null,
  email?: string | null,
  il?: string | null,
  ilce?: string | null
): void {
  const cleanIl = (il || '').trim();
  const cleanIlce = (ilce || '').trim();
  const data = JSON.stringify({ il: cleanIl, ilce: cleanIlce });

  try {
    if (empId) {
      localStorage.setItem(`humanius_emp_loc_${empId}`, data);
    }
    if (email) {
      localStorage.setItem(`humanius_emp_loc_${email.trim().toLowerCase()}`, data);
    }
  } catch {}
}

export function getEmployeeIsYeriSgkSicil(
  empId?: string | null,
  email?: string | null
): string {
  try {
    if (empId) {
      const val = localStorage.getItem(`humanius_emp_sgk_isyeri_${empId}`);
      if (val) return val;
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const val = localStorage.getItem(`humanius_emp_sgk_isyeri_${cleanEmail}`);
      if (val) return val;
    }
  } catch {}
  return '';
}

export function saveEmployeeIsYeriSgkSicil(
  empId?: string | null,
  email?: string | null,
  sicilNo?: string | null
): void {
  const clean = (sicilNo || '').trim();
  try {
    if (empId) {
      if (clean) {
        localStorage.setItem(`humanius_emp_sgk_isyeri_${empId}`, clean);
      } else {
        localStorage.removeItem(`humanius_emp_sgk_isyeri_${empId}`);
      }
    }
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      if (clean) {
        localStorage.setItem(`humanius_emp_sgk_isyeri_${cleanEmail}`, clean);
      } else {
        localStorage.removeItem(`humanius_emp_sgk_isyeri_${cleanEmail}`);
      }
    }
  } catch {}
}

export function enrichEmployeeWithLocation<T extends Record<string, any>>(emp: T): T {
  if (!emp) return emp;
  const meta = getEmployeeLocationMeta(emp.id, emp.email);
  const parsed = parseAddressCity(emp.address);
  const isYeriSgk =
    (emp.is_yeri_sgk_sicil_no && String(emp.is_yeri_sgk_sicil_no).trim()) ||
    (emp.isYeriSgkSicilNo && String(emp.isYeriSgkSicilNo).trim()) ||
    parseIsYeriSgkFromAddress(emp.address) ||
    getEmployeeIsYeriSgkSicil(emp.id, emp.email) ||
    '';

  const resolvedIl = (emp.il && String(emp.il).trim()) || meta.il || parsed.il || '';
  const resolvedIlce = (emp.ilce && String(emp.ilce).trim()) || meta.ilce || parsed.ilce || '';

  return {
    ...emp,
    il: resolvedIl,
    ilce: resolvedIlce,
    is_yeri_sgk_sicil_no: isYeriSgk,
    isYeriSgkSicilNo: isYeriSgk,
  };
}
