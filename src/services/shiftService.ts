import { supabase } from '../lib/supabase';

export interface CompanyShift {
  id: string;
  name: string;
  start_time: string; // e.g. "08:30" or "16:00" or "00:00"
  end_time: string;   // e.g. "18:00" or "00:00" or "08:00"
  break_minutes: number;
  tolerance_minutes: number;
  color: string;
  is_default: boolean;
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
  },
];

class ShiftService {
  /**
   * Get all shifts defined for a company
   */
  public async getShifts(companyId?: string): Promise<CompanyShift[]> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    // 1. If real company, fetch directly from Supabase FIRST (Database-First)
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_shifts')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: true });

        if (!error && data && Array.isArray(data) && data.length > 0) {
          const formatted: CompanyShift[] = data.map((d: any) => ({
            id: d.id,
            name: d.name,
            start_time: d.start_time,
            end_time: d.end_time,
            break_minutes: Number(d.break_minutes || 60),
            tolerance_minutes: Number(d.tolerance_minutes || 15),
            color: d.color || '#3b82f6',
            is_default: Boolean(d.is_default),
          }));
          localStorage.setItem(storageKey, JSON.stringify(formatted));
          return formatted;
        }
      } catch (e) {
        console.warn('Supabase shift fetch warning:', e);
      }
    }

    // 2. Offline / Fallback: check localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        const localData = JSON.parse(saved);
        if (Array.isArray(localData) && localData.length > 0) {
          return localData;
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
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    let success = false;

    // 1. Write to Supabase FIRST
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        if (shift.is_default) {
          await supabase
            .from('company_shifts')
            .update({ is_default: false })
            .eq('company_id', companyId);
        }
        const { error } = await supabase.from('company_shifts').upsert({
          id: shift.id,
          company_id: companyId,
          name: shift.name,
          start_time: shift.start_time,
          end_time: shift.end_time,
          break_minutes: shift.break_minutes,
          tolerance_minutes: shift.tolerance_minutes,
          color: shift.color,
          is_default: shift.is_default,
          updated_at: new Date().toISOString(),
        });
        if (!error) success = true;
        else console.error('Supabase saveShift error:', error);
      } catch (err) {
        console.error('Supabase saveShift exception:', err);
      }
    } else {
      success = true;
    }

    // 2. Update local cache
    try {
      let list: CompanyShift[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { list = JSON.parse(saved); } catch {}
      }
      if (!list || list.length === 0) {
        list = [...VARSAYILAN_VARDIYALAR];
      }

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
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_shifts_${effectiveCompanyId}`;

    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { error } = await supabase.from('company_shifts').delete().eq('id', shiftId);
        if (error) console.error('Supabase deleteShift error:', error);
      } catch (err) {
        console.error('Supabase deleteShift exception:', err);
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

      const updated = list.filter((s) => s.id !== shiftId);
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
   * Helper to resolve the effective active shift for an employee
   */
  public async getEmployeeShift(companyId: string | undefined, employeeId: string | undefined): Promise<CompanyShift> {
    const shifts = await this.getShifts(companyId);
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
}

export const shiftService = new ShiftService();
