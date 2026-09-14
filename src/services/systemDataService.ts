import { supabase } from '../lib/supabase';

class SystemDataService {
  /**
   * Retrieves arbitrary JSON data stored in `sistem_parametreleri` table for a company.
   * Direct Database-First operation.
   */
  public async getCompanyData<T>(companyId: string | undefined, key: string, defaultValue: T): Promise<T> {
    const targetCompanyId = companyId && companyId !== 'default' ? companyId : null;

    if (!targetCompanyId) {
      return defaultValue;
    }

    try {
      const { data, error } = await supabase
        .from('sistem_parametreleri')
        .select('deger')
        .eq('company_id', targetCompanyId)
        .eq('kategori', 'sistem_kurallari')
        .eq('ad', key)
        .maybeSingle();

      if (!error && data?.deger) {
        try {
          return JSON.parse(data.deger) as T;
        } catch {
          return data.deger as unknown as T;
        }
      }
    } catch (err) {
      console.warn(`[SystemDataService] getCompanyData error for ${key}:`, err);
    }

    // Fallback via edge function if needed
    try {
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('user-management', {
        body: {
          operation: 'get_system_parameter',
          companyId: targetCompanyId,
          kategori: 'sistem_kurallari',
          ad: key,
        },
      });
      if (!edgeErr && edgeRes?.deger) {
        try {
          return JSON.parse(edgeRes.deger) as T;
        } catch {
          return edgeRes.deger as unknown as T;
        }
      }
    } catch {}

    return defaultValue;
  }

  /**
   * Saves arbitrary JSON data into `sistem_parametreleri` table for a company.
   * Direct Database-First operation.
   */
  public async saveCompanyData<T>(
    companyId: string | undefined,
    key: string,
    value: T,
    aciklama: string = 'Kullanıcı Verisi'
  ): Promise<boolean> {
    const targetCompanyId = companyId && companyId !== 'default' ? companyId : null;

    if (!targetCompanyId) {
      return false;
    }

    const jsonString = typeof value === 'string' ? value : JSON.stringify(value);
    const nowIso = new Date().toISOString();

    try {
      const { error } = await supabase.from('sistem_parametreleri').upsert(
        {
          company_id: targetCompanyId,
          kategori: 'sistem_kurallari',
          ad: key,
          deger: jsonString,
          aciklama: aciklama,
          zorunlu: false,
          degistirilebilir: true,
          son_guncelleme: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'company_id,kategori,ad' }
      );

      if (!error) {
        window.dispatchEvent(
          new CustomEvent('humanius_system_data_updated', {
            detail: { companyId: targetCompanyId, key, value },
          })
        );
        return true;
      } else {
        console.warn(`[SystemDataService] direct upsert error for ${key}:`, error);
      }
    } catch (err) {
      console.warn(`[SystemDataService] direct upsert exception for ${key}:`, err);
    }

    // Edge function fallback for adminClient rights
    try {
      const { data: edgeRes, error: edgeErr } = await supabase.functions.invoke('user-management', {
        body: {
          operation: 'save_system_parameter',
          companyId: targetCompanyId,
          kategori: 'sistem_kurallari',
          ad: key,
          deger: jsonString,
          aciklama,
        },
      });
      if (!edgeErr && edgeRes?.success) {
        window.dispatchEvent(
          new CustomEvent('humanius_system_data_updated', {
            detail: { companyId: targetCompanyId, key, value },
          })
        );
        return true;
      }
    } catch (edgeEx) {
      console.error(`[SystemDataService] edge function fallback failed for ${key}:`, edgeEx);
    }

    return false;
  }

  /**
   * Deletes a parameter from `sistem_parametreleri`.
   */
  public async deleteCompanyData(companyId: string | undefined, key: string): Promise<boolean> {
    const targetCompanyId = companyId && companyId !== 'default' ? companyId : null;
    if (!targetCompanyId) return false;

    try {
      const { error } = await supabase
        .from('sistem_parametreleri')
        .delete()
        .eq('company_id', targetCompanyId)
        .eq('kategori', 'sistem_kurallari')
        .eq('ad', key);

      if (!error) {
        window.dispatchEvent(
          new CustomEvent('humanius_system_data_updated', {
            detail: { companyId: targetCompanyId, key, value: null },
          })
        );
        return true;
      }
    } catch (err) {
      console.error(`[SystemDataService] delete error for ${key}:`, err);
    }

    return false;
  }
}

export const systemDataService = new SystemDataService();
