import { supabase } from '../lib/supabase';
import { normalizeCompanyId } from './companyService';

export interface CompanyShift {
  id: string;
  name: string;
  start_time: string; // e.g. "08:30" or "16:00" or "00:00"
  end_time: string;   // e.g. "18:00" or "00:00" or "08:00"
  break_minutes: number;
  tolerance_minutes: number;
  color: string;
  is_default: boolean;
  office_id?: string;
  office_name?: string;
  saturday_start_time?: string;
  saturday_end_time?: string;
  saturday_break_minutes?: number;
}

export interface ParsedShiftMeta {
  cleanName: string;
  officeName: string;
  saturday_start_time?: string;
  saturday_end_time?: string;
  saturday_break_minutes?: number;
}

export function parseShiftOffice(rawName: string): ParsedShiftMeta {
  if (!rawName) return { cleanName: '', officeName: '' };
  let cleanName = String(rawName).trim();
  let officeName = '';
  let saturday_start_time: string | undefined = undefined;
  let saturday_end_time: string | undefined = undefined;
  let saturday_break_minutes: number | undefined = undefined;

  const officeMatch = cleanName.match(/\[(?:Ofis|Office|Şube):\s*(.*?)\]/i);
  if (officeMatch) {
    officeName = officeMatch[1].trim();
    cleanName = cleanName.replace(/\[(?:Ofis|Office|Şube):\s*.*?\]/i, '').trim();
  }

  const satMatch = cleanName.match(/\[(?:Cmt|Cumartesi|Sat):\s*(\d{1,2}:\d{2})-(\d{1,2}:\d{2})(?:\/(\d+))?\]/i);
  if (satMatch) {
    saturday_start_time = satMatch[1].trim();
    saturday_end_time = satMatch[2].trim();
    if (satMatch[3]) {
      saturday_break_minutes = Number(satMatch[3]);
    }
    cleanName = cleanName.replace(/\[(?:Cmt|Cumartesi|Sat):\s*.*?\]/i, '').trim();
  }

  return {
    cleanName,
    officeName,
    saturday_start_time,
    saturday_end_time,
    saturday_break_minutes,
  };
}

export function formatShiftNameWithOffice(
  cleanName: string,
  officeName?: string | null,
  satHours?: { satStart?: string | null; satEnd?: string | null; satBreak?: number | null }
): string {
  let name = (cleanName || '')
    .replace(/\[(?:Ofis|Office|Şube):\s*.*?\]/i, '')
    .replace(/\[(?:Cmt|Cumartesi|Sat):\s*.*?\]/i, '')
    .trim();

  const trimmedOffice = (officeName || '').trim();
  if (trimmedOffice && trimmedOffice !== 'all') {
    name = `${name} [Ofis: ${trimmedOffice}]`;
  }

  if (satHours?.satStart && satHours?.satEnd) {
    const sStart = String(satHours.satStart).substring(0, 5);
    const sEnd = String(satHours.satEnd).substring(0, 5);
    const sBreak = satHours.satBreak != null ? Number(satHours.satBreak) : 30;
    name = `${name} [Cmt: ${sStart}-${sEnd}/${sBreak}]`;
  }

  return name;
}

export const normalizeTr = (str: string) =>
  (str || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/i̇/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');

export function resolveOfficeForShift<T extends { id: string; name: string; il?: string; ilce?: string }>(
  shift: { id?: string; name: string; office_id?: string; office_name?: string } | null | undefined,
  offices: T[]
): T | null {
  if (!shift || !offices || offices.length === 0) return null;

  // 1. Direct match by shift.office_id
  if (shift.office_id) {
    const found = offices.find((o) => o.id === shift.office_id);
    if (found) return found;
  }

  // 2. Match by local meta office_id
  if (shift.id) {
    const meta = getShiftOfficeMeta(shift.id);
    if (meta?.office_id) {
      const found = offices.find((o) => o.id === meta.office_id);
      if (found) return found;
    }
  }

  // 3. Match by inferOfficeForShift
  const inferred = inferOfficeForShift(shift, offices);
  if (inferred?.office_id) {
    const found = offices.find((o) => o.id === inferred.office_id);
    if (found) return found;
  }
  if (inferred?.office_name) {
    const normInferred = normalizeTr(inferred.office_name);
    const found = offices.find((o) => {
      const normO = normalizeTr(o.name);
      return normO === normInferred || normO.includes(normInferred) || normInferred.includes(normO);
    });
    if (found) return found;
  }

  // 4. Match by shift.office_name
  if (shift.office_name) {
    const normName = normalizeTr(shift.office_name);
    const found = offices.find((o) => {
      const normO = normalizeTr(o.name);
      return normO === normName || normO.includes(normName) || normName.includes(normO);
    });
    if (found) return found;
  }

  // 5. Match by shift name containing office name, district, or keyword
  const normShiftName = normalizeTr(shift.name || '');
  for (const o of offices) {
    if (!o.name) continue;
    const normO = normalizeTr(o.name);
    if (normO && normShiftName.includes(normO)) {
      return o;
    }
    // Match by office ilce or il
    if (o.ilce) {
      const normIlce = normalizeTr(o.ilce);
      if (normIlce.length >= 3 && normShiftName.includes(normIlce)) {
        return o;
      }
    }
    // Match by office name keywords (min 3 chars, excluding generic words)
    const parts = normO
      .split(/[\s\/\-_]+/)
      .filter((p) => p.length >= 3 && !['ofis', 'sube', 'merkez', 'hvl', 'genel', 'subesi', 'ofisi'].includes(p));
    if (parts.some((p) => normShiftName.includes(p))) {
      return o;
    }
  }

  return null;
}

export function inferOfficeForShift(
  shift: { id?: string; name: string; office_id?: string; office_name?: string },
  offices: Array<{ id: string; name: string }>
): { office_id: string; office_name: string } | null {
  if (shift.office_id && shift.office_name) {
    return { office_id: shift.office_id, office_name: shift.office_name };
  }
  if (shift.office_id && !shift.office_name) {
    const o = offices.find((off) => off.id === shift.office_id);
    if (o) return { office_id: o.id, office_name: o.name };
  }
  if (shift.office_name && !shift.office_id) {
    const normShiftOffice = normalizeTr(shift.office_name);
    const o = offices.find((off) => normalizeTr(off.name) === normShiftOffice);
    if (o) return { office_id: o.id, office_name: o.name };
  }

  // Check if name has [Ofis: ...] embedded
  const parsed = parseShiftOffice(shift.name);
  if (parsed.officeName) {
    const normParsed = normalizeTr(parsed.officeName);
    const o = offices.find((off) => normalizeTr(off.name) === normParsed);
    if (o) return { office_id: o.id, office_name: o.name };
    return { office_id: '', office_name: parsed.officeName };
  }

  // Name keyword matching against office locations (e.g. "TARSUS HVL" -> "Tarsus Ofis")
  const normS = normalizeTr(shift.name || '');
  for (const o of offices) {
    if (!o.name) continue;
    const parts = normalizeTr(o.name)
      .split(/[\s\/\-_]+/)
      .filter((p) => p.length >= 3 && !['ofis', 'sube', 'merkez', 'hvl', 'genel'].includes(p));
    if (parts.some((p) => normS.includes(p))) {
      return { office_id: o.id, office_name: o.name };
    }
  }

  return null;
}

export function isShiftMatchingOffice(
  shift: { id?: string; name: string; office_id?: string; office_name?: string },
  selectedOfficeId: string,
  offices: Array<{ id: string; name: string }>,
  includeGeneral: boolean = false
): boolean {
  if (!selectedOfficeId || selectedOfficeId === 'all') return true;

  const inferred = inferOfficeForShift(shift, offices);
  if (selectedOfficeId === 'general') {
    return !inferred;
  }

  if (inferred) {
    return inferred.office_id === selectedOfficeId;
  }

  // Truly general shift (not matching any specific office)
  return includeGeneral;
}

export function saveShiftOfficeMeta(
  shiftId: string,
  officeId?: string | null,
  officeName?: string | null,
  satStart?: string | null,
  satEnd?: string | null,
  satBreak?: number | null
): void {
  if (!shiftId) return;
  try {
    const existing = getShiftOfficeMeta(shiftId);
    localStorage.setItem(`humanius_shift_loc_${shiftId}`, JSON.stringify({
      office_id: officeId !== undefined ? (officeId || '') : existing.office_id,
      office_name: officeName !== undefined ? (officeName || '') : existing.office_name,
      saturday_start_time: satStart !== undefined ? (satStart || '') : existing.saturday_start_time,
      saturday_end_time: satEnd !== undefined ? (satEnd || '') : existing.saturday_end_time,
      saturday_break_minutes: satBreak !== undefined ? Number(satBreak ?? 30) : existing.saturday_break_minutes,
    }));
  } catch {}
}

export function getShiftOfficeMeta(shiftId: string): {
  office_id: string;
  office_name: string;
  saturday_start_time?: string;
  saturday_end_time?: string;
  saturday_break_minutes?: number;
} {
  if (!shiftId) return { office_id: '', office_name: '' };
  try {
    const raw = localStorage.getItem(`humanius_shift_loc_${shiftId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { office_id: '', office_name: '' };
}

export interface SaturdayWorkConfig {
  isSaturdayWork: boolean;
  startTime: string;        // e.g. "08:30"
  endTime: string;          // e.g. "13:00" or "18:00"
  breakMinutes: number;     // e.g. 0 or 30 or 60
  toleranceMinutes: number; // e.g. 15
}

export const DEFAULT_SATURDAY_CONFIG: SaturdayWorkConfig = {
  isSaturdayWork: false,
  startTime: '08:30',
  endTime: '16:00',
  breakMinutes: 30,
  toleranceMinutes: 15,
};

export function isNotSaturdayShift(s: any): boolean {
  if (!s) return false;
  const idStr = String(s.id || '').toLowerCase();
  const nameStr = String(s.name || '').toLowerCase();
  return !idStr.includes('cumartesi') && !nameStr.includes('cumartesi');
}

export function getShiftSaturdayHours(
  shift: CompanyShift | null | undefined,
  satConfig?: SaturdayWorkConfig | null
): { startTime: string; endTime: string; breakMinutes: number; toleranceMinutes: number } {
  const satStart = shift?.saturday_start_time || satConfig?.startTime || '08:30';
  const satEnd = shift?.saturday_end_time || satConfig?.endTime || '13:00';
  const satBreak = shift?.saturday_break_minutes != null ? Number(shift.saturday_break_minutes) : Number(satConfig?.breakMinutes ?? 30);
  const satTol = shift?.tolerance_minutes != null ? Number(shift.tolerance_minutes) : Number(satConfig?.toleranceMinutes ?? 15);
  return {
    startTime: satStart,
    endTime: satEnd,
    breakMinutes: satBreak,
    toleranceMinutes: satTol,
  };
}

export interface ShiftAssignment {
  id: string;
  company_id: string;
  employee_id: string;
  shift_id: string;
}

export const VARSAYILAN_VARDIYALAR: CompanyShift[] = [
  {
    id: 'vardiya-standart-1',
    name: '1. Vardiya (Gündüz / Standart)',
    start_time: '08:30',
    end_time: '18:00',
    break_minutes: 60,
    tolerance_minutes: 15,
    color: '#3b82f6',
    is_default: true,
    saturday_start_time: '08:30',
    saturday_end_time: '13:00',
    saturday_break_minutes: 30,
  },
  {
    id: 'vardiya-sabah-2',
    name: 'Sabah Vardiyası (Erken)',
    start_time: '08:00',
    end_time: '16:00',
    break_minutes: 30,
    tolerance_minutes: 10,
    color: '#10b981',
    is_default: false,
    saturday_start_time: '08:00',
    saturday_end_time: '13:00',
    saturday_break_minutes: 30,
  },
  {
    id: 'vardiya-aksam-3',
    name: '2. Vardiya (Akşam)',
    start_time: '16:00',
    end_time: '00:00',
    break_minutes: 30,
    tolerance_minutes: 10,
    color: '#f59e0b',
    is_default: false,
    saturday_start_time: '16:00',
    saturday_end_time: '20:00',
    saturday_break_minutes: 30,
  },
  {
    id: 'vardiya-gece-4',
    name: '3. Vardiya (Gece)',
    start_time: '00:00',
    end_time: '08:00',
    break_minutes: 30,
    tolerance_minutes: 10,
    color: '#8b5cf6',
    is_default: false,
    saturday_start_time: '00:00',
    saturday_end_time: '08:00',
    saturday_break_minutes: 30,
  },
];

class ShiftService {
  /**
   * Get all shifts defined for a company (strictly weekday / standard company shifts)
   */
  public async getShifts(companyId?: string): Promise<CompanyShift[]> {
    const effectiveCompanyId = normalizeCompanyId(companyId);
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    // 1. If real company, fetch directly from Supabase FIRST (Database-First)
    if (effectiveCompanyId && !effectiveCompanyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_shifts')
          .select('*')
          .eq('company_id', effectiveCompanyId)
          .order('created_at', { ascending: true });

        if (!error && data && Array.isArray(data)) {
          // Strictly exclude any Saturday configuration records
          const shiftRows = data.filter(isNotSaturdayShift);
          if (shiftRows.length > 0) {
            const formatted: CompanyShift[] = shiftRows.map((d: any) => {
              const parsed = parseShiftOffice(d.name);
              const meta = getShiftOfficeMeta(d.id);
              const resolvedOfficeName = d.office_name || parsed.officeName || meta.office_name || '';
              const resolvedOfficeId = d.office_id || meta.office_id || '';
              const satStart = d.saturday_start_time || parsed.saturday_start_time || meta.saturday_start_time || '08:30';
              const satEnd = d.saturday_end_time || parsed.saturday_end_time || meta.saturday_end_time || '13:00';
              const satBreak = d.saturday_break_minutes != null
                ? Number(d.saturday_break_minutes)
                : (parsed.saturday_break_minutes != null
                    ? Number(parsed.saturday_break_minutes)
                    : (meta.saturday_break_minutes != null ? Number(meta.saturday_break_minutes) : 30));

              return {
                id: d.id,
                name: parsed.cleanName || d.name,
                start_time: d.start_time,
                end_time: d.end_time,
                break_minutes: Number(d.break_minutes || 60),
                tolerance_minutes: Number(d.tolerance_minutes || 15),
                color: d.color || '#3b82f6',
                is_default: Boolean(d.is_default),
                office_id: resolvedOfficeId,
                office_name: resolvedOfficeName,
                saturday_start_time: satStart,
                saturday_end_time: satEnd,
                saturday_break_minutes: satBreak,
              };
            });

            // Guarantee at least one default shift if none is set
            if (!formatted.some((s) => s.is_default)) {
              formatted[0].is_default = true;
            }

            localStorage.setItem(storageKey, JSON.stringify(formatted));
            localStorage.setItem('humanius_shifts_default', JSON.stringify(formatted));
            return formatted;
          } else {
            // Company exists in DB but has 0 shifts saved in company_shifts.
            // Automatically seed the standard initial shift so every shift has a real DB ID.
            const initialShift: CompanyShift = {
              id: `shift-${Date.now()}`,
              name: '1. Vardiya (Gündüz / Standart)',
              start_time: '08:30',
              end_time: '18:00',
              break_minutes: 60,
              tolerance_minutes: 15,
              color: '#3b82f6',
              is_default: true,
              saturday_start_time: '08:30',
              saturday_end_time: '13:00',
              saturday_break_minutes: 30,
            };
            try {
              await supabase.from('company_shifts').insert({
                id: initialShift.id,
                company_id: companyId,
                name: initialShift.name,
                start_time: initialShift.start_time,
                end_time: initialShift.end_time,
                break_minutes: initialShift.break_minutes,
                tolerance_minutes: initialShift.tolerance_minutes,
                color: initialShift.color,
                is_default: true,
              });
            } catch {}
            localStorage.setItem(storageKey, JSON.stringify([initialShift]));
            localStorage.setItem('humanius_shifts_default', JSON.stringify([initialShift]));
            return [initialShift];
          }
        }
      } catch (e) {
        console.warn('Supabase shift fetch warning:', e);
      }
    }

    // 2. Offline / Fallback: check localStorage with sanitization
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const localData = JSON.parse(saved);
        if (Array.isArray(localData) && localData.length > 0) {
          const clean = localData.filter(isNotSaturdayShift);
          if (clean.length > 0) {
            if (!clean.some((s: any) => s.is_default)) clean[0].is_default = true;
            return clean;
          }
        }
      }
      const defSaved = localStorage.getItem('humanius_shifts_default');
      if (defSaved !== null) {
        const localData = JSON.parse(defSaved);
        if (Array.isArray(localData) && localData.length > 0) {
          const clean = localData.filter(isNotSaturdayShift);
          if (clean.length > 0) {
            if (!clean.some((s: any) => s.is_default)) clean[0].is_default = true;
            return clean;
          }
        }
      }
    } catch {}

    // 3. Fallback to default shifts
    return VARSAYILAN_VARDIYALAR;
  }

  /**
   * Save or update a shift definition
   */
  public async saveShift(companyId: string, shift: CompanyShift): Promise<boolean> {
    const effectiveCompanyId = normalizeCompanyId(companyId);
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    // Disallow saving a saturday shift through normal shift management
    if (!isNotSaturdayShift(shift)) {
      console.warn('Saturday shift cannot be saved as regular company shift');
      return false;
    }

    let success = false;

    // 1. Write to Supabase FIRST
    if (effectiveCompanyId && !effectiveCompanyId.includes('demo')) {
      try {
        if (shift.is_default) {
          await supabase
            .from('company_shifts')
            .update({ is_default: false })
            .eq('company_id', effectiveCompanyId);
        }
        saveShiftOfficeMeta(
          shift.id,
          shift.office_id,
          shift.office_name,
          shift.saturday_start_time,
          shift.saturday_end_time,
          shift.saturday_break_minutes
        );
        const dbName = formatShiftNameWithOffice(shift.name, shift.office_name, {
          satStart: shift.saturday_start_time,
          satEnd: shift.saturday_end_time,
          satBreak: shift.saturday_break_minutes,
        });
        const payload: any = {
          id: shift.id,
          company_id: effectiveCompanyId,
          name: dbName,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          tolerance_minutes: shift.tolerance_minutes,
          color: shift.color,
          is_default: Boolean(shift.is_default),
          updated_at: new Date().toISOString(),
        };

        let { error } = await supabase.from('company_shifts').upsert(payload);
        if (!error) success = true;
        else console.error('Supabase saveShift error:', error);
      } catch (err) {
        console.error('Supabase saveShift exception:', err);
      }

      // Re-fetch from DB to ensure absolute consistency across all caches (excluding Saturday shifts)
      try {
        const { data } = await supabase
          .from('company_shifts')
          .select('*')
          .eq('company_id', effectiveCompanyId)
          .order('created_at', { ascending: true });

        if (data && Array.isArray(data) && data.length > 0) {
          const formatted: CompanyShift[] = data
            .filter(isNotSaturdayShift)
            .map((d: any) => {
              const parsed = parseShiftOffice(d.name);
              const meta = getShiftOfficeMeta(d.id);
              const resolvedOfficeName = d.office_name || parsed.officeName || meta.office_name || '';
              const resolvedOfficeId = d.office_id || meta.office_id || '';
              const satStart = d.saturday_start_time || parsed.saturday_start_time || meta.saturday_start_time || '08:30';
              const satEnd = d.saturday_end_time || parsed.saturday_end_time || meta.saturday_end_time || '13:00';
              const satBreak = d.saturday_break_minutes != null
                ? Number(d.saturday_break_minutes)
                : (parsed.saturday_break_minutes != null
                    ? Number(parsed.saturday_break_minutes)
                    : (meta.saturday_break_minutes != null ? Number(meta.saturday_break_minutes) : 30));

              return {
                id: d.id,
                name: parsed.cleanName || d.name,
                start_time: d.start_time,
                end_time: d.end_time,
                break_minutes: Number(d.break_minutes || 60),
                tolerance_minutes: Number(d.tolerance_minutes || 15),
                color: d.color || '#3b82f6',
                is_default: Boolean(d.is_default),
                office_id: resolvedOfficeId,
                office_name: resolvedOfficeName,
                saturday_start_time: satStart,
                saturday_end_time: satEnd,
                saturday_break_minutes: satBreak,
              };
            });

          if (formatted.length > 0 && !formatted.some((s) => s.is_default)) {
            formatted[0].is_default = true;
          }

          localStorage.setItem(storageKey, JSON.stringify(formatted));
          localStorage.setItem('humanius_shifts_default', JSON.stringify(formatted));
          window.dispatchEvent(new CustomEvent('humanius_shifts_updated', { detail: { companyId: effectiveCompanyId } }));
          return success;
        }
      } catch {}
    } else {
      success = true;
    }

    // 2. Update local cache fallback
    try {
      let list: CompanyShift[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      if (!list || list.length === 0) {
        list = [...VARSAYILAN_VARDIYALAR];
      }
      list = list.filter(isNotSaturdayShift);

      const idx = list.findIndex((s) => s.id === shift.id);
      let updated: CompanyShift[];
      if (idx >= 0) {
        updated = [...list];
        updated[idx] = shift;
      } else {
        updated = [...list, shift];
      }
      if (shift.is_default) {
        updated = updated.map((s) => ({ ...s, is_default: s.id === shift.id }));
      }
      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('humanius_shifts_default', JSON.stringify(updated));
    } catch {}

    window.dispatchEvent(new CustomEvent('humanius_shifts_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Delete a shift definition
   */
  public async deleteShift(companyId: string, shiftId: string): Promise<boolean> {
    const effectiveCompanyId = normalizeCompanyId(companyId);
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    if (effectiveCompanyId && !effectiveCompanyId.includes('demo')) {
      try {
        // Delete from Supabase company_shifts
        const { error } = await supabase.from('company_shifts').delete().eq('id', shiftId);
        if (error) console.error('Supabase deleteShift error:', error);

        // Also clean up any employee assignments targeting this deleted shift
        await supabase.from('company_shift_assignments').delete().eq('shift_id', shiftId);
      } catch (err) {
        console.error('Supabase deleteShift exception:', err);
      }

      // Re-fetch remaining shifts from Supabase to guarantee exact parity
      try {
        const { data } = await supabase
          .from('company_shifts')
          .select('*')
          .eq('company_id', effectiveCompanyId)
          .order('created_at', { ascending: true });

        if (data && Array.isArray(data)) {
          const formatted: CompanyShift[] = data
            .filter(isNotSaturdayShift)
            .map((d: any) => {
              const parsed = parseShiftOffice(d.name);
              const meta = getShiftOfficeMeta(d.id);
              const resolvedOfficeName = d.office_name || parsed.officeName || meta.office_name || '';
              const resolvedOfficeId = d.office_id || meta.office_id || '';
              const satStart = d.saturday_start_time || parsed.saturday_start_time || meta.saturday_start_time || '08:30';
              const satEnd = d.saturday_end_time || parsed.saturday_end_time || meta.saturday_end_time || '13:00';
              const satBreak = d.saturday_break_minutes != null
                ? Number(d.saturday_break_minutes)
                : (parsed.saturday_break_minutes != null
                    ? Number(parsed.saturday_break_minutes)
                    : (meta.saturday_break_minutes != null ? Number(meta.saturday_break_minutes) : 30));

              return {
                id: d.id,
                name: parsed.cleanName || d.name,
                start_time: d.start_time,
                end_time: d.end_time,
                break_minutes: Number(d.break_minutes || 60),
                tolerance_minutes: Number(d.tolerance_minutes || 15),
                color: d.color || '#3b82f6',
                is_default: Boolean(d.is_default),
                office_id: resolvedOfficeId,
                office_name: resolvedOfficeName,
                saturday_start_time: satStart,
                saturday_end_time: satEnd,
                saturday_break_minutes: satBreak,
              };
            });

          if (formatted.length > 0 && !formatted.some((s) => s.is_default)) {
            formatted[0].is_default = true;
            await supabase.from('company_shifts').update({ is_default: true }).eq('id', formatted[0].id);
          }

          localStorage.setItem(storageKey, JSON.stringify(formatted));
          localStorage.setItem('humanius_shifts_default', JSON.stringify(formatted));
          window.dispatchEvent(new CustomEvent('humanius_shifts_updated', { detail: { companyId: effectiveCompanyId } }));
          return true;
        }
      } catch (err) {
        console.error('Error re-fetching shifts after delete:', err);
      }
    }

    try {
      let list: CompanyShift[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      if (!list || list.length === 0) {
        list = [...VARSAYILAN_VARDIYALAR];
      }

      const updated = list.filter((s) => s.id !== shiftId && isNotSaturdayShift(s));
      if (updated.length > 0 && !updated.some((s) => s.is_default)) {
        updated[0].is_default = true;
      }

      localStorage.setItem(storageKey, JSON.stringify(updated));
      localStorage.setItem('humanius_shifts_default', JSON.stringify(updated));
    } catch (e) {
      console.error('Delete shift cache error:', e);
    }

    window.dispatchEvent(new CustomEvent('humanius_shifts_updated', { detail: { companyId: effectiveCompanyId } }));
    return true;
  }

  /**
   * Get all shift assignments for employees
   */
  public async getAssignments(companyId?: string): Promise<Record<string, string>> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_shift_assignments_${effectiveCompanyId}`;

    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_shift_assignments')
          .select('*')
          .eq('company_id', companyId);

        if (!error && data && Array.isArray(data)) {
          const map: Record<string, string> = {};
          data.forEach((row: any) => {
            map[row.employee_id] = row.shift_id;
          });
          localStorage.setItem(storageKey, JSON.stringify(map));
          return map;
        }
      } catch (err) {
        console.warn('Assignments fetch error:', err);
      }
    }

    let localMap: Record<string, string> = {};
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        localMap = JSON.parse(saved);
      }
    } catch {}

    return localMap;
  }

  /**
   * Assign shift to single employee
   */
  public async assignShift(companyId: string, employeeId: string, shiftId: string): Promise<boolean> {
    return this.bulkAssign(companyId, [employeeId], shiftId);
  }

  /**
   * Bulk assign shift to multiple employees (e.g. department or multi-select)
   */
  public async bulkAssign(companyId: string, employeeIds: string[], shiftId: string): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_shift_assignments_${effectiveCompanyId}`;

    let success = false;

    // 1. Persist to Supabase FIRST
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const rows = employeeIds.map((empId) => ({
          id: `sa-${companyId.substring(0, 4)}-${empId}`,
          company_id: companyId,
          employee_id: String(empId),
          shift_id: String(shiftId),
          updated_at: new Date().toISOString(),
        }));
        const { error } = await supabase
          .from('company_shift_assignments')
          .upsert(rows, { onConflict: 'company_id,employee_id' });
        if (!error) success = true;
      } catch {}

      if (!success) {
        try {
          const { data: res } = await supabase.functions.invoke('user-management', {
            body: {
              operation: 'bulk_save_company_shift_assignments',
              companyId,
              employee_ids: employeeIds,
              shift_id: shiftId,
            },
          });
          success = !!res?.success;
        } catch (e) {
          console.error('Bulk assign shift error:', e);
        }
      }
    } else {
      success = true;
    }

    // 2. Update local cache
    try {
      let map: Record<string, string> = {};
      const saved = localStorage.getItem(storageKey);
      if (saved) map = JSON.parse(saved);
      employeeIds.forEach((empId) => {
        map[empId] = shiftId;
      });
      localStorage.setItem(storageKey, JSON.stringify(map));
    } catch {}

    window.dispatchEvent(new CustomEvent('humanius_shifts_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Helper to resolve the effective active shift for an employee (strictly weekday shifts)
   */
  public async getEmployeeShift(companyId: string | undefined, employeeId: string | undefined): Promise<CompanyShift> {
    const shifts = (await this.getShifts(companyId)).filter(isNotSaturdayShift);
    const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || VARSAYILAN_VARDIYALAR[0];

    if (!employeeId) return defaultShift;

    const assignments = await this.getAssignments(companyId);
    const assignedShiftId = assignments[employeeId];

    if (assignedShiftId) {
      const found = shifts.find((s) => s.id === assignedShiftId);
      if (found) return found;
    }

    return defaultShift;
  }

  /**
   * Get Saturday work configuration for a company (Database-First)
   */
  public async getSaturdayConfig(companyId?: string): Promise<SaturdayWorkConfig> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_saturday_work_${effectiveCompanyId}`;

    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_shifts')
          .select('*')
          .eq('company_id', companyId)
          .like('id', '%cumartesi%')
          .maybeSingle();

        if (!error) {
          if (data) {
            // Self-repair: Ensure Saturday row in DB is NEVER marked default
            if (data.is_default) {
              supabase.from('company_shifts').update({ is_default: false }).eq('id', data.id).catch(() => {});
            }

            const config: SaturdayWorkConfig = {
              isSaturdayWork: true,
              startTime: data.start_time || '08:30',
              endTime: data.end_time || '16:00',
              breakMinutes: Number(data.break_minutes ?? 30),
              toleranceMinutes: Number(data.tolerance_minutes ?? 15),
            };
            try {
              localStorage.setItem(storageKey, JSON.stringify(config));
              localStorage.setItem('humanius_saturday_work_default', JSON.stringify(config));
            } catch {}
            return config;
          } else {
            // Explicitly not in DB -> 5-day week
            const config: SaturdayWorkConfig = { ...DEFAULT_SATURDAY_CONFIG, isSaturdayWork: false };
            try {
              localStorage.setItem(storageKey, JSON.stringify(config));
            } catch {}
            return config;
          }
        }
      } catch (err) {
        console.warn('Error fetching saturday config from DB:', err);
      }
    }

    try {
      const cached = localStorage.getItem(storageKey) || localStorage.getItem('humanius_saturday_work_default');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    return DEFAULT_SATURDAY_CONFIG;
  }

  /**
   * Save Saturday work configuration for a company (Database-First)
   */
  public async saveSaturdayConfig(companyId: string, config: SaturdayWorkConfig): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_saturday_work_${effectiveCompanyId}`;
    let success = false;

    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      const shiftId = `shift-cumartesi-${companyId}`;
      try {
        if (config.isSaturdayWork) {
          const { error } = await supabase.from('company_shifts').upsert(
            {
              id: shiftId,
              company_id: companyId,
              name: 'Cumartesi Mesaisi',
              start_time: config.startTime || '08:30',
              end_time: config.endTime || '16:00',
              break_minutes: Number(config.breakMinutes ?? 30),
              tolerance_minutes: Number(config.toleranceMinutes ?? 15),
              color: '#f59e0b',
              is_default: false,
            },
            { onConflict: 'id' }
          );
          if (!error) {
            success = true;
          } else {
            console.error('Error saving saturday config to Supabase:', error);
          }
        } else {
          // Delete saturday shift row
          const { error } = await supabase
            .from('company_shifts')
            .delete()
            .eq('company_id', companyId)
            .eq('id', shiftId);
          if (!error) {
            success = true;
          } else {
            console.error('Error deleting saturday config from Supabase:', error);
          }
        }
      } catch (e) {
        console.error('Exception saving saturday config:', e);
      }
    } else {
      success = true;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(config));
      localStorage.setItem('humanius_saturday_work_default', JSON.stringify(config));
    } catch {}

    // Clean regular shift caches to prevent any accidental leakage of Saturday shift
    try {
      const regularShiftsRaw = localStorage.getItem(`humanius_shifts_${effectiveCompanyId}`);
      if (regularShiftsRaw) {
        const parsed = JSON.parse(regularShiftsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(isNotSaturdayShift);
          if (cleaned.length > 0 && !cleaned.some((s: any) => s.is_default)) cleaned[0].is_default = true;
          localStorage.setItem(`humanius_shifts_${effectiveCompanyId}`, JSON.stringify(cleaned));
        }
      }
      const defShiftsRaw = localStorage.getItem('humanius_shifts_default');
      if (defShiftsRaw) {
        const parsed = JSON.parse(defShiftsRaw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(isNotSaturdayShift);
          if (cleaned.length > 0 && !cleaned.some((s: any) => s.is_default)) cleaned[0].is_default = true;
          localStorage.setItem('humanius_shifts_default', JSON.stringify(cleaned));
        }
      }
    } catch {}

    window.dispatchEvent(
      new CustomEvent('humanius_saturday_updated', {
        detail: { companyId: effectiveCompanyId, config },
      })
    );
    window.dispatchEvent(
      new CustomEvent('humanius_shifts_updated', {
        detail: { companyId: effectiveCompanyId },
      })
    );

    return success;
  }
}

export const shiftService = new ShiftService();
