import { supabase } from '../lib/supabase';
import { IzinTuruKural, VARSAYILAN_IZIN_TURLERI } from '../components/IzinTanimlari';

class LeaveTypeService {
  /**
   * Loads leave types for a company from Supabase database (Database-First) or local cache.
   */
  public async getLeaveTypes(companyId?: string): Promise<IzinTuruKural[]> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    // 1. If real company, fetch directly from Supabase FIRST (Database-First)
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_leave_types')
          .select('leave_types')
          .eq('company_id', companyId)
          .maybeSingle();

        if (!error && data?.leave_types && Array.isArray(data.leave_types) && data.leave_types.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(data.leave_types));
          localStorage.setItem('humanius_izin_turleri_default', JSON.stringify(data.leave_types));
          return data.leave_types as IzinTuruKural[];
        }
      } catch (e) {
        console.warn('Supabase leave types fetch warning:', e);
      }

      // Edge function fallback if direct table access fails or returns empty
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'list_company_leave_types',
            companyId,
          },
        });
        if (!fnError && res?.leave_types && Array.isArray(res.leave_types) && res.leave_types.length > 0) {
          localStorage.setItem(storageKey, JSON.stringify(res.leave_types));
          localStorage.setItem('humanius_izin_turleri_default', JSON.stringify(res.leave_types));
          return res.leave_types as IzinTuruKural[];
        }
      } catch (e) {
        console.warn('Edge function leave types fetch error:', e);
      }
    }

    // 2. Offline / Fallback: check localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      const defSaved = localStorage.getItem('humanius_izin_turleri_default');
      if (defSaved) {
        const parsed = JSON.parse(defSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading local leave types:', e);
    }

    // 3. Fallback to system defaults
    return VARSAYILAN_IZIN_TURLERI;
  }

  /**
   * Saves leave types both to Supabase database (Database-First) and local storage.
   */
  public async saveLeaveTypes(companyId: string, leaveTypes: IzinTuruKural[]): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    let savedToDb = false;

    // 1. Persist to Supabase FIRST
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data: existing, error: checkError } = await supabase
          .from('company_leave_types')
          .select('id')
          .eq('company_id', companyId)
          .maybeSingle();

        if (!checkError && existing?.id) {
          const { error: updateError } = await supabase
            .from('company_leave_types')
            .update({
              leave_types: leaveTypes,
              updated_at: new Date().toISOString(),
            })
            .eq('company_id', companyId);
          if (!updateError) savedToDb = true;
        } else {
          const { error: insertError } = await supabase
            .from('company_leave_types')
            .insert({
              company_id: companyId,
              leave_types: leaveTypes,
              updated_at: new Date().toISOString(),
            });
          if (!insertError) savedToDb = true;
        }
      } catch (err) {
        console.error('Direct Supabase leave types save error:', err);
      }

      // Fallback to Edge function if direct table write fails
      if (!savedToDb) {
        try {
          const { data: res, error: fnError } = await supabase.functions.invoke('user-management', {
            body: {
              operation: 'save_company_leave_types',
              companyId,
              leave_types: leaveTypes,
            },
          });
          savedToDb = !fnError && !!res?.success;
        } catch (e) {
          console.error('Edge function leave types save error:', e);
        }
      }
    } else {
      savedToDb = true;
    }

    // 2. Cache in localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(leaveTypes));
      localStorage.setItem('humanius_izin_turleri_default', JSON.stringify(leaveTypes));
      window.dispatchEvent(new CustomEvent('humanius_izin_turleri_updated', { detail: { companyId: effectiveCompanyId } }));
    } catch (e) {
      console.error('Failed to set local storage leave types:', e);
    }

    return savedToDb;
  }
}

export const leaveTypeService = new LeaveTypeService();
