import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Company = Database['public']['Tables']['companies']['Row'];
type CompanyInsert = Database['public']['Tables']['companies']['Insert'];
type CompanyUpdate = Database['public']['Tables']['companies']['Update'];

import { demoService } from './demoService';

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
    if (demoService.isDemoActive()) {
      return [{
        id: 'demo-company-id-9999',
        name: 'Humanius Demo Şirketi',
        address: '',
        tax_number: '',
        sgk_sicil_no: '',
        phone: '',
        email: 'demo@humanius.net',
        city: 'İstanbul',
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }] as Company[];
    }

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
    if (demoService.isDemoActive() || id === 'demo-company-id-9999') {
      return {
        id: 'demo-company-id-9999',
        name: 'Humanius Demo Şirketi',
        address: '',
        tax_number: '',
        sgk_sicil_no: '',
        phone: '',
        email: 'demo@humanius.net',
        city: 'İstanbul',
        logo_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Company;
    }

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
  },

  async getOfficeLocations(companyId?: string): Promise<import('../types').CompanyOfficeLocation[]> {
    if (demoService.isDemoActive()) {
      const saved = localStorage.getItem('humanius_demo_office_locations');
      if (saved) return JSON.parse(saved);
      return [
        { id: 'loc-1', company_id: 'demo-company-id-9999', name: 'Düzce Ofisi', lat: 40.8438, lng: 31.1565, radius_meters: 200, address: 'Düzce Merkez', is_default: true },
        { id: 'loc-2', company_id: 'demo-company-id-9999', name: 'Bolu Şubesi', lat: 40.7350, lng: 31.6061, radius_meters: 250, address: 'Bolu Merkez', is_default: false },
        { id: 'loc-3', company_id: 'demo-company-id-9999', name: 'İstanbul Genel Merkez', lat: 41.0082, lng: 28.9784, radius_meters: 300, address: 'Maslak, İstanbul', is_default: false },
      ];
    }

    try {
      let query = supabase.from('company_locations').select('*').order('created_at', { ascending: true });
      if (companyId) query = query.eq('company_id', companyId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as import('../types').CompanyOfficeLocation[];
      }
    } catch {}

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'list_company_locations', companyId }
      });
      if (res?.locations && res.locations.length > 0) {
        return res.locations as import('../types').CompanyOfficeLocation[];
      }
    } catch {}

    const saved = localStorage.getItem(`humanius_office_locations_${companyId || 'default'}`);
    return saved ? JSON.parse(saved) : [];
  },

  async saveOfficeLocation(location: Partial<import('../types').CompanyOfficeLocation>): Promise<import('../types').CompanyOfficeLocation | null> {
    if (demoService.isDemoActive() || !location.company_id) {
      const current = await this.getOfficeLocations(location.company_id);
      let updated: import('../types').CompanyOfficeLocation[];
      let savedLoc: import('../types').CompanyOfficeLocation;
      if (location.id) {
        savedLoc = { ...current.find(l => l.id === location.id), ...location } as import('../types').CompanyOfficeLocation;
        updated = current.map(l => l.id === location.id ? savedLoc : l);
      } else {
        savedLoc = {
          id: `loc-${Date.now()}`,
          company_id: location.company_id || 'demo-company-id-9999',
          name: location.name || 'Yeni Ofis',
          lat: location.lat || 0,
          lng: location.lng || 0,
          radius_meters: location.radius_meters || 200,
          address: location.address || '',
          is_default: Boolean(location.is_default),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updated = [...current, savedLoc];
      }
      localStorage.setItem('humanius_demo_office_locations', JSON.stringify(updated));
      return savedLoc;
    }

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'save_company_location', ...location }
      });
      if (res?.location) {
        return res.location as import('../types').CompanyOfficeLocation;
      }
    } catch (e) {
      console.warn("Save location invoke error:", e);
    }

    try {
      if (location.id) {
        const { data, error } = await supabase.from('company_locations').update({
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          radius_meters: location.radius_meters,
          address: location.address,
          is_default: location.is_default,
          updated_at: new Date().toISOString()
        } as any).eq('id', location.id).select().single();
        if (!error && data) return data as import('../types').CompanyOfficeLocation;
      } else {
        const { data, error } = await supabase.from('company_locations').insert({
          company_id: location.company_id,
          name: location.name,
          lat: location.lat,
          lng: location.lng,
          radius_meters: location.radius_meters,
          address: location.address,
          is_default: location.is_default,
        } as any).select().single();
        if (!error && data) return data as import('../types').CompanyOfficeLocation;
      }
    } catch {}

    return null;
  },

  async deleteOfficeLocation(id: string, companyId?: string): Promise<boolean> {
    if (demoService.isDemoActive() || id.startsWith('loc-')) {
      const current = await this.getOfficeLocations(companyId);
      const updated = current.filter(l => l.id !== id);
      localStorage.setItem('humanius_demo_office_locations', JSON.stringify(updated));
      return true;
    }

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'delete_company_location', id }
      });
      if (res?.success) return true;
    } catch {}

    try {
      const { error } = await supabase.from('company_locations').delete().eq('id', id);
      return !error;
    } catch {}

    return false;
  }
};
