import { supabase } from '../lib/supabase';
import { IzinTuruKural, VARSAYILAN_IZIN_TURLERI } from '../components/IzinTanimlari';

function syncSystemLeaveDefaults(types: IzinTuruKural[]): IzinTuruKural[] {
  const defaultMazeret = VARSAYILAN_IZIN_TURLERI.find(t => t.id === 'mazeret');
  return types.map(item => {
    if (item && item.id === 'mazeret' && defaultMazeret) {
      const isLegacyTitle = !item.ad || item.ad.trim() === 'Mazeret İzni';
      const isLegacyDesc = !item.aciklama || !item.aciklama.toLowerCase().includes('saatlik');
      if (isLegacyTitle || isLegacyDesc) {
        return {
          ...item,
          ad: isLegacyTitle ? defaultMazeret.ad : item.ad,
          aciklama: isLegacyDesc ? defaultMazeret.aciklama : item.aciklama,
        };
      }
    }
    return item;
  });
}

class LeaveTypeService {
  /**
   * Loads leave types for a company from Supabase database (Database-First) or company-isolated local cache.
   */
  public async getLeaveTypes(companyId?: string): Promise<IzinTuruKural[]> {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    // Clean up legacy shared default key to prevent cross-company leakage
    try {
      localStorage.removeItem('humanius_izin_turleri_default');
    } catch {}

    // 1. If real company, fetch directly from Supabase FIRST (Database-First)
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      try {
        const { data, error } = await supabase
          .from('company_leave_types')
          .select('leave_types')
          .eq('company_id', companyId)
          .maybeSingle();

        if (!error) {
          if (data?.leave_types && Array.isArray(data.leave_types)) {
            const cleanTypes = (data.leave_types as any[]).filter(x => x && !x.id?.startsWith('__'));
            if (cleanTypes.length > 0) {
              const syncedTypes = syncSystemLeaveDefaults(cleanTypes as IzinTuruKural[]);
              try {
                localStorage.setItem(storageKey, JSON.stringify(syncedTypes));
              } catch {}
              return syncedTypes;
            }
          }
          // Company has no custom leave types in DB: clear any stale local cache for this company and return system defaults
          try {
            localStorage.removeItem(storageKey);
          } catch {}
          return VARSAYILAN_IZIN_TURLERI;
        }
      } catch (e) {
        console.warn('Supabase leave types fetch warning:', e);
      }

      // Edge function fallback if direct table access fails
      try {
        const { data: res, error: fnError } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'list_company_leave_types',
            companyId,
          },
        });
        if (!fnError) {
          if (res?.leave_types && Array.isArray(res.leave_types)) {
            const cleanResTypes = (res.leave_types as any[]).filter(x => x && !x.id?.startsWith('__'));
            if (cleanResTypes.length > 0) {
              const syncedTypes = syncSystemLeaveDefaults(cleanResTypes as IzinTuruKural[]);
              try {
                localStorage.setItem(storageKey, JSON.stringify(syncedTypes));
              } catch {}
              return syncedTypes;
            }
          }
          try {
            localStorage.removeItem(storageKey);
          } catch {}
          return VARSAYILAN_IZIN_TURLERI;
        }
      } catch (e) {
        console.warn('Edge function leave types fetch error:', e);
      }
    }

    // 2. Offline / Demo Fallback: check strictly company-specific localStorage key
    if (effectiveCompanyId !== 'default') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const clean = parsed.filter((x: any) => x && !x.id?.startsWith('__'));
            if (clean.length > 0) {
              return syncSystemLeaveDefaults(clean);
            }
          }
        }
      } catch (e) {
        console.warn('Error reading local leave types:', e);
      }
    }

    // 3. Fallback to system defaults
    return VARSAYILAN_IZIN_TURLERI;
  }

  /**
   * Saves leave types both to Supabase database (Database-First) and company-isolated local storage.
   */
  public async saveLeaveTypes(companyId: string, leaveTypes: IzinTuruKural[]): Promise<boolean> {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';
    const storageKey = `humanius_izin_turleri_${effectiveCompanyId}`;

    let savedToDb = false;

    // 1. Persist to Supabase FIRST
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
      let mergedPayload: any[] = [...leaveTypes];
      try {
        const { data: existing, error: checkError } = await supabase
          .from('company_leave_types')
          .select('id, leave_types')
          .eq('company_id', companyId)
          .maybeSingle();

        // Preserve system metadata (__approval_config__, __request_stages__)
        const preservedSystemItems = (existing?.leave_types || []).filter((x: any) => x && x.id?.startsWith('__'));
        mergedPayload = [...leaveTypes, ...preservedSystemItems];

        if (!checkError && existing?.id) {
          const { error: updateError } = await supabase
            .from('company_leave_types')
            .update({
              leave_types: mergedPayload,
              updated_at: new Date().toISOString(),
            })
            .eq('company_id', companyId);
          if (!updateError) savedToDb = true;
        } else {
          const { error: insertError } = await supabase
            .from('company_leave_types')
            .insert({
              company_id: companyId,
              leave_types: mergedPayload,
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
              leave_types: mergedPayload,
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

    // 2. Cache strictly in company-isolated localStorage
    try {
      if (effectiveCompanyId !== 'default') {
        localStorage.setItem(storageKey, JSON.stringify(leaveTypes));
      }
      localStorage.removeItem('humanius_izin_turleri_default');
      window.dispatchEvent(new CustomEvent('humanius_izin_turleri_updated', { detail: { companyId: effectiveCompanyId } }));
    } catch (e) {
      console.error('Failed to set local storage leave types:', e);
    }

    return savedToDb;
  }
}

export const leaveTypeService = new LeaveTypeService();
