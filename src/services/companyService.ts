import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

export function fixUtf8Encoding(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/Åž/g, 'Ş')
    .replace(/ÅŸ/g, 'ş')
    .replace(/Ä±/g, 'ı')
    .replace(/Ä°/g, 'İ')
    .replace(/ÄŸ/g, 'ğ')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ã¶/g, 'ö')
    .replace(/Ã–/g, 'Ö')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã‡/g, 'Ç');
}

export const companyService = {
  async getCompanies() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return (data || []).map(c => ({ ...c, name: fixUtf8Encoding(c.name) }));
      }
    } catch {}

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'list_companies' }
      });
      if (res?.companies) {
        return (res.companies || []).map((c: any) => ({ ...c, name: fixUtf8Encoding(c.name) }));
      }
    } catch {}

    return [];
  },

  async getById(id: string) {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return { ...data, name: fixUtf8Encoding(data.name) };
      }
    } catch {}

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'get_company', id }
      });
      if (res?.company) {
        return { ...res.company, name: fixUtf8Encoding(res.company.name) };
      }
    } catch {}

    return null;
  },

  async create(company: CompanyInsert) {
    const { error } = await supabase
      .from('companies')
      .insert(company);

    if (error) throw error;
  },

  async update(id: string, updates: CompanyUpdate) {
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (data) {
      return { ...data, name: fixUtf8Encoding(data.name) };
    }
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
