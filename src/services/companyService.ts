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

  async getAllOfficeLocations(): Promise<Record<string, import('../types').CompanyOfficeLocation[]>> {
    const companyIds = [
      BIGSAFER_COMPANY_ID,
      MICI_COMPANY_ID,
      HIZEL_COMPANY_ID,
      CAVDARLI_COMPANY_ID,
      SKILLBRIDGE_COMPANY_ID,
      BIGSAFELY_COMPANY_ID
    ];
    const map: Record<string, import('../types').CompanyOfficeLocation[]> = {};
    await Promise.all(
      companyIds.map(async (cid) => {
        map[cid] = await this.getOfficeLocations(cid);
      })
    );
    return map;
  },

  async getOfficeLocations(companyId?: string): Promise<import('../types').CompanyOfficeLocation[]> {
    const targetCompId = normalizeCompanyId(companyId);

    // 1. DEMO MODE
    if (demoService.isDemoActive()) {
      const demoKey = `humanius_demo_office_locations_${targetCompId}`;
      const saved = localStorage.getItem(demoKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
      return getDefaultOfficesForCompany(targetCompId);
    }

    // 2. SUPABASE / PRODUCTION MODE
    let locations: import('../types').CompanyOfficeLocation[] = [];

    try {
      // Query strictly by company_id to avoid cross-tenant pollution
      const { data, error } = await supabase
        .from('company_locations')
        .select('*')
        .eq('company_id', targetCompId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        locations = data as import('../types').CompanyOfficeLocation[];
      }
    } catch {}

    // Edge function fallback if direct query returned empty
    if (locations.length === 0) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'list_company_locations', companyId: targetCompId }
        });
        if (res?.locations && res.locations.length > 0) {
          locations = (res.locations as import('../types').CompanyOfficeLocation[]).filter(
            (l) => l.company_id === targetCompId
          );
        }
      } catch {}
    }

    // STRICT MULTI-TENANCY FILTER:
    // Guarantee that ONLY locations belonging to targetCompId are ever returned!
    // Strip any junk entries like 'Kütahya' or cross-tenant leaks.
    locations = locations.filter((l) => {
      if (l.company_id !== targetCompId) return false;
      const lowerName = (l.name || '').trim().toLowerCase();
      if (lowerName === 'kütahya' || lowerName === 'kutahya') return false;
      if (targetCompId === MICI_COMPANY_ID) {
        if (['düzce', 'duzce', 'bolu', 'istanbul'].some((k) => lowerName.includes(k))) return false;
      }
      if (targetCompId === BIGSAFER_COMPANY_ID) {
        if (['adana', 'kayseri', 'tarsus', 'toyota', 'byd', 'suzuki', 'sixt'].some((k) => lowerName.includes(k))) return false;
      }
      return true;
    });

    // If still empty in database, provide company-specific defaults without leaking other companies
    if (locations.length === 0) {
      locations = getDefaultOfficesForCompany(targetCompId);
    }

    // For BigSafer: ensure Düzce Ofisi, Bolu Şubesi, İstanbul Genel Merkez are always present
    if (targetCompId === BIGSAFER_COMPANY_ID) {
      for (const defOff of BIGSAFER_DEFAULT_OFFICES) {
        if (!locations.some((l) => l.name.trim().toLowerCase() === defOff.name.trim().toLowerCase())) {
          locations.push(defOff);
        }
      }
    }

    // For Mıçı Otomotiv: ensure all 5 core offices are present and never contaminated
    if (targetCompId === MICI_COMPANY_ID) {
      for (const defOff of MICI_DEFAULT_OFFICES) {
        if (!locations.some((l) => l.name.trim().toLowerCase() === defOff.name.trim().toLowerCase())) {
          locations.push(defOff);
        }
      }
    }

    // Enrich every location with il / ilce from metadata or intelligent fallback
    return locations.map((loc) => {
      const meta = getLocationMeta(loc.id);
      const inferred = inferIlIlce(loc.name, loc.address, loc.il || meta.il, loc.ilce || meta.ilce);
      return {
        ...loc,
        company_id: targetCompId,
        il: loc.il || meta.il || inferred.il || '',
        ilce: loc.ilce || meta.ilce || inferred.ilce || ''
      };
    });
  },

  async saveOfficeLocation(location: Partial<import('../types').CompanyOfficeLocation>): Promise<import('../types').CompanyOfficeLocation | null> {
    const targetCompId = normalizeCompanyId(location.company_id);
    const locId = location.id || `loc-${Date.now()}`;

    if (location.il || location.ilce) {
      saveLocationMeta(locId, location.il, location.ilce);
    }

    if (demoService.isDemoActive() || !location.company_id) {
      const current = await this.getOfficeLocations(targetCompId);
      let updated: import('../types').CompanyOfficeLocation[];
      let savedLoc: import('../types').CompanyOfficeLocation;
      if (location.id) {
        savedLoc = { ...current.find((l) => l.id === location.id), ...location, company_id: targetCompId } as import('../types').CompanyOfficeLocation;
        updated = current.map((l) => (l.id === location.id ? savedLoc : l));
      } else {
        savedLoc = {
          id: locId,
          company_id: targetCompId,
          name: location.name || 'Yeni Ofis',
          lat: location.lat || 0,
          lng: location.lng || 0,
          radius_meters: location.radius_meters || 200,
          address: location.address || '',
          il: location.il || '',
          ilce: location.ilce || '',
          is_default: Boolean(location.is_default),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        updated = [...current, savedLoc];
      }
      localStorage.setItem(`humanius_demo_office_locations_${targetCompId}`, JSON.stringify(updated));
      return savedLoc;
    }

    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'save_company_location', ...location, company_id: targetCompId }
      });
      if (res?.location) {
        const result = res.location as import('../types').CompanyOfficeLocation;
        if (location.il || location.ilce) {
          saveLocationMeta(result.id, location.il, location.ilce);
        }
        return {
          ...result,
          il: location.il || result.il || '',
          ilce: location.ilce || result.ilce || ''
        };
      }
    } catch (e) {
      console.warn("Save location invoke error:", e);
    }

    try {
      const payload: any = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        radius_meters: location.radius_meters,
        address: location.address,
        is_default: location.is_default,
      };
      if (location.il !== undefined) payload.il = location.il;
      if (location.ilce !== undefined) payload.ilce = location.ilce;

      if (location.id) {
        payload.updated_at = new Date().toISOString();
        let { data, error } = await supabase.from('company_locations').update(payload).eq('id', location.id).select().single();
        if (error && (error as any).code === '42703') {
          delete payload.il;
          delete payload.ilce;
          const retry = await supabase.from('company_locations').update(payload).eq('id', location.id).select().single();
          data = retry.data;
          error = retry.error;
        }
        if (!error && data) {
          if (location.il || location.ilce) saveLocationMeta(data.id, location.il, location.ilce);
          return {
            ...data,
            il: location.il || data.il || '',
            ilce: location.ilce || data.ilce || ''
          } as import('../types').CompanyOfficeLocation;
        }
      } else {
        payload.company_id = targetCompId;
        let { data, error } = await supabase.from('company_locations').insert(payload).select().single();
        if (error && (error as any).code === '42703') {
          delete payload.il;
          delete payload.ilce;
          const retry = await supabase.from('company_locations').insert(payload).select().single();
          data = retry.data;
          error = retry.error;
        }
        if (!error && data) {
          if (location.il || location.ilce) saveLocationMeta(data.id, location.il, location.ilce);
          return {
            ...data,
            il: location.il || data.il || '',
            ilce: location.ilce || data.ilce || ''
          } as import('../types').CompanyOfficeLocation;
        }
      }
    } catch {}

    return null;
  },

  async deleteOfficeLocation(id: string, companyId?: string): Promise<boolean> {
    const targetCompId = normalizeCompanyId(companyId);

    if (demoService.isDemoActive() || id.startsWith('loc-')) {
      const current = await this.getOfficeLocations(targetCompId);
      const updated = current.filter((l) => l.id !== id);
      localStorage.setItem(`humanius_demo_office_locations_${targetCompId}`, JSON.stringify(updated));
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

export const BIGSAFER_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
export const MICI_COMPANY_ID = '735825a4-f12b-4ee7-959c-a8a29e674617';
export const CAVDARLI_COMPANY_ID = '87ed6f79-6a54-40ea-b188-8b325513dc41';
export const HIZEL_COMPANY_ID = 'd4be3c56-bc23-4ecd-91e3-78f9625a5cb9';
export const SKILLBRIDGE_COMPANY_ID = 'c2b6dd6f-317e-41a1-90d8-ac8774249c75';
export const BIGSAFELY_COMPANY_ID = '71fa880b-c3e2-4967-b121-a2692353aa55';

export function normalizeCompanyId(companyId?: string | null): string {
  if (!companyId) return BIGSAFER_COMPANY_ID;
  const s = String(companyId).trim().toLowerCase();
  if (s === 'all' || s === 'default' || s === 'demo-company-id-9999') return BIGSAFER_COMPANY_ID;
  if (s === BIGSAFELY_COMPANY_ID || s.includes('bigsafely')) {
    return BIGSAFELY_COMPANY_ID;
  }
  if (s === BIGSAFER_COMPANY_ID || s.includes('bigsafer')) {
    return BIGSAFER_COMPANY_ID;
  }
  if (s === MICI_COMPANY_ID || s.includes('mıçı') || s.includes('mici')) {
    return MICI_COMPANY_ID;
  }
  if (s === CAVDARLI_COMPANY_ID || s.includes('çavdarlı') || s.includes('cavdarli')) {
    return CAVDARLI_COMPANY_ID;
  }
  if (s === HIZEL_COMPANY_ID || s.includes('hızel') || s.includes('hizel')) {
    return HIZEL_COMPANY_ID;
  }
  if (s === SKILLBRIDGE_COMPANY_ID || s.includes('skillbridge')) {
    return SKILLBRIDGE_COMPANY_ID;
  }
  return companyId;
}

export const BIGSAFER_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'loc-bigsafer-1', company_id: BIGSAFER_COMPANY_ID, name: 'Düzce Ofisi', lat: 40.8438, lng: 31.1565, radius_meters: 200, address: 'Düzce Merkez', il: 'Düzce', ilce: 'Merkez', is_default: true },
  { id: 'loc-bigsafer-2', company_id: BIGSAFER_COMPANY_ID, name: 'Bolu Şubesi', lat: 40.7350, lng: 31.6061, radius_meters: 250, address: 'Bolu Merkez', il: 'Bolu', ilce: 'Merkez', is_default: false },
  { id: 'loc-bigsafer-3', company_id: BIGSAFER_COMPANY_ID, name: 'İstanbul Genel Merkez', lat: 41.0082, lng: 28.9784, radius_meters: 300, address: 'Maslak, Sarıyer', il: 'İstanbul', ilce: 'Sarıyer', is_default: false },
];

export const MICI_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'f4715a38-36e2-4e5b-aed6-de7e869e304a', company_id: MICI_COMPANY_ID, name: 'TOYOTA/BYD/LX', lat: 36.994158, lng: 35.196171, radius_meters: 400, address: 'Merkez', il: 'Adana', ilce: 'Seyhan', is_default: true },
  { id: '0442aec2-6107-41b5-afde-6363b58c3b54', company_id: MICI_COMPANY_ID, name: 'Kayseri Ofis', lat: 38.765104, lng: 35.487037, radius_meters: 200, address: 'Kayseri', il: 'Kayseri', ilce: 'Melikgazi', is_default: false },
  { id: 'c8a208a1-16e4-4e08-8ccc-7c3d2d9fae06', company_id: MICI_COMPANY_ID, name: 'Tarsus Ofis', lat: 36.904161, lng: 35.06787, radius_meters: 400, address: 'Tarsus', il: 'Mersin', ilce: 'Tarsus', is_default: false },
  { id: 'cbf1a8e2-dbe5-4da6-bcc9-cab0bc5af1d0', company_id: MICI_COMPANY_ID, name: 'Sixt Adana', lat: 37.005433, lng: 35.331296, radius_meters: 200, address: 'Adana', il: 'Adana', ilce: 'Seyhan', is_default: false },
  { id: 'f48267c8-bf34-4e7a-8f02-a02cd2bfc592', company_id: MICI_COMPANY_ID, name: 'Suzuki / Mg', lat: 36.99479, lng: 35.28881, radius_meters: 200, address: 'Yüreğir', il: 'Adana', ilce: 'Yüreğir', is_default: false },
];

export const HIZEL_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'loc-hizel-1', company_id: HIZEL_COMPANY_ID, name: 'Düzce Merkez Ofis', lat: 40.8438, lng: 31.1565, radius_meters: 300, address: 'Düzce', il: 'Düzce', ilce: 'Merkez', is_default: true },
];

export const CAVDARLI_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'loc-cavdarli-1', company_id: CAVDARLI_COMPANY_ID, name: 'Bursa Merkez Ofis', lat: 40.2153, lng: 28.9322, radius_meters: 300, address: 'Bursa Nilüfer', il: 'Bursa', ilce: 'Nilüfer', is_default: true },
];

export const SKILLBRIDGE_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'loc-skillbridge-1', company_id: SKILLBRIDGE_COMPANY_ID, name: 'Ankara Ofis', lat: 39.9208, lng: 32.8541, radius_meters: 250, address: 'Ankara Çankaya', il: 'Ankara', ilce: 'Çankaya', is_default: true },
];

export const BIGSAFELY_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'loc-bigsafely-1', company_id: BIGSAFELY_COMPANY_ID, name: 'İstanbul Ofis', lat: 40.9912, lng: 29.0267, radius_meters: 250, address: 'İstanbul Kadıköy', il: 'İstanbul', ilce: 'Kadıköy', is_default: true },
];

export function getDefaultOfficesForCompany(companyId?: string | null): import('../types').CompanyOfficeLocation[] {
  const compId = normalizeCompanyId(companyId);
  if (compId === MICI_COMPANY_ID) return [...MICI_DEFAULT_OFFICES];
  if (compId === BIGSAFER_COMPANY_ID) return [...BIGSAFER_DEFAULT_OFFICES];
  if (compId === HIZEL_COMPANY_ID) return [...HIZEL_DEFAULT_OFFICES];
  if (compId === CAVDARLI_COMPANY_ID) return [...CAVDARLI_DEFAULT_OFFICES];
  if (compId === SKILLBRIDGE_COMPANY_ID) return [...SKILLBRIDGE_DEFAULT_OFFICES];
  if (compId === BIGSAFELY_COMPANY_ID) return [...BIGSAFELY_DEFAULT_OFFICES];
  return [...BIGSAFER_DEFAULT_OFFICES];
}

function inferIlIlce(name?: string, address?: string, currentIl?: string, currentIlce?: string): { il: string; ilce: string } {
  if (currentIl && currentIl.trim()) {
    return { il: currentIl.trim(), ilce: currentIlce ? currentIlce.trim() : '' };
  }
  const text = `${name || ''} ${address || ''}`.toLowerCase();
  if (text.includes('düzce') || text.includes('duzce')) return { il: 'Düzce', ilce: 'Merkez' };
  if (text.includes('bolu')) return { il: 'Bolu', ilce: 'Merkez' };
  if (text.includes('istanbul') || text.includes('maslak') || text.includes('sarıyer') || text.includes('pendik') || text.includes('kadıköy') || text.includes('kadikoy')) {
    return { il: 'İstanbul', ilce: text.includes('pendik') ? 'Pendik' : text.includes('kadıköy') || text.includes('kadikoy') ? 'Kadıköy' : 'Sarıyer' };
  }
  if (text.includes('kayseri')) return { il: 'Kayseri', ilce: 'Melikgazi' };
  if (text.includes('tarsus') || text.includes('mersin')) return { il: 'Mersin', ilce: 'Tarsus' };
  if (text.includes('adana') || text.includes('toyota') || text.includes('byd') || text.includes('sixt') || text.includes('suzuki') || text.includes('suzik')) {
    return { il: 'Adana', ilce: text.includes('yüreğir') || text.includes('yuregir') ? 'Yüreğir' : 'Seyhan' };
  }
  if (text.includes('bursa') || text.includes('nilüfer') || text.includes('nilufer')) return { il: 'Bursa', ilce: 'Nilüfer' };
  if (text.includes('ankara') || text.includes('çankaya') || text.includes('cankaya')) return { il: 'Ankara', ilce: 'Çankaya' };
  return { il: '', ilce: '' };
}

function getLocationMeta(locId: string): { il?: string; ilce?: string } {
  try {
    const raw = localStorage.getItem('humanius_location_cities');
    if (!raw) return {};
    const map = JSON.parse(raw);
    return map[locId] || {};
  } catch {
    return {};
  }
}

function saveLocationMeta(locId: string, il?: string, ilce?: string) {
  try {
    const raw = localStorage.getItem('humanius_location_cities');
    const map = raw ? JSON.parse(raw) : {};
    map[locId] = { il: il || '', ilce: ilce || '' };
    localStorage.setItem('humanius_location_cities', JSON.stringify(map));
  } catch {}
}

