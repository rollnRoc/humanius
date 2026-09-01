import { supabase } from '../lib/supabase';
import { IzinTuruKural, VARSAYILAN_IZIN_TURLERI } from '../components/IzinTanimlari';

class LeaveTypeService {
  /**
   * Loads leave types for a company from local cache or Supabase database.
   */
  public async getLeaveTypes(companyId?: string): Promise<IzinTuruKural[]> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    // 1. Try local storage first for instant load
    let localTypes: IzinTuruKural[] | null = null;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localTypes = parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local leave types:', e);
    }

    // If demo mode or default company with local cache, return local
    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      return localTypes || VARSAYILAN_IZIN_TURLERI;
    }

    // 2. Fetch from Supabase database
    try {
      const { data, error } = await supabase
        .from('company_leave_types')
        .select('leave_types')
        .eq('company_id', companyId)
        .maybeSingle();

      if (!error && data?.leave_types && Array.isArray(data.leave_types) && data.leave_types.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(data.leave_types));
        return data.leave_types as IzinTuruKural[];
      }
    } catch {
      // Fallback to Edge function if direct table access fails
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'list_company_leave_types',
            companyId,
          },
        });
        if (res?.leave_types && Array.isArray(res.leave_types) && res.leave_types.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(res.leave_types));
          return res.leave_types as IzinTuruKural[];
        }
      } catch (e) {
        console.warn('Edge function leave types fetch error:', e);
      }
    }

    return localTypes || VARSAYILAN_IZIN_TURLERI;
  }

  /**
   * Saves leave types both to local storage and to Supabase database.
   */
  public async saveLeaveTypes(companyId: string, leaveTypes: IzinTuruKural[]): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    // 1. Immediately cache in localStorage and notify listeners
    try {
      localStorage.setItem(storageKey, JSON.stringify(leaveTypes));
      window.dispatchEvent(new CustomEvent('humanius_izin_turleri_updated', { detail: { companyId: effectiveCompanyId } }));
    } catch (e) {
      console.error('Failed to set local storage leave types:', e);
    }

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      return true;
    }

    // 2. Persist to Supabase database
    try {
      const { data: existing } = await supabase
        .from('company_leave_types')
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle();

      if (existing?.id) {
        await supabase
          .from('company_leave_types')
          .update({
            leave_types: leaveTypes,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
      } else {
        await supabase
          .from('company_leave_types')
          .insert({
            company_id: companyId,
            leave_types: leaveTypes,
            updated_at: new Date().toISOString(),
          });
      }
      return true;
    } catch {
      // Fallback to Edge function if direct table write fails
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'save_company_leave_types',
            companyId,
            leave_types: leaveTypes,
          },
        });
        return !fnError && !!res?.success;
      } catch (e) {
        console.error('Edge function leave types save error:', e);
        return false;
      }
    }
  }
}

export const leaveTypeService = new LeaveTypeService();
