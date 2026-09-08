/**
 * Utility functions for persisting and parsing Employee City (İl) & District (İlçe)
 * without requiring direct DDL changes to the remote Supabase 'employees' table.
 */

export interface ParsedAddress {
  il: string;
  ilce: string;
  cleanAddress: string;
}

export function parseAddressCity(address?: string | null): ParsedAddress {
  if (!address) return { il: '', ilce: '', cleanAddress: '' };
  const raw = String(address).trim();

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

export function formatAddressWithCity(
  address?: string | null,
  il?: string | null,
  ilce?: string | null
): string {
  const trimmedIl = (il || '').trim();
  const trimmedIlce = (ilce || '').trim();
  let baseAddr = (address || '').trim();

  // Remove any previous [ilce / il] bracket
  baseAddr = baseAddr.replace(/\[.*?\]/, '').trim();

  if (!trimmedIl && !trimmedIlce) return baseAddr;

  const tag = trimmedIlce ? `[${trimmedIlce} / ${trimmedIl}]` : `[${trimmedIl}]`;
  if (!baseAddr) return tag;
  return `${baseAddr} ${tag}`;
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

export function enrichEmployeeWithLocation<T extends Record<string, any>>(emp: T): T {
  if (!emp) return emp;
  const meta = getEmployeeLocationMeta(emp.id, emp.email);
  const parsed = parseAddressCity(emp.address);

  const resolvedIl = (emp.il && String(emp.il).trim()) || meta.il || parsed.il || '';
  const resolvedIlce = (emp.ilce && String(emp.ilce).trim()) || meta.ilce || parsed.ilce || '';

  return {
    ...emp,
    il: resolvedIl,
    ilce: resolvedIlce,
  };
}
