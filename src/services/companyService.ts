import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import iller from '../lib/illce';

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
    const STATIC_KNOWN_COMPANIES: Company[] = [
      {
        id: '1cc4a668-c6ad-49d9-8f9c-aea1243239c9',
        name: 'ALTAN MOTORLU ARAÇLAR SAN.ve TİC. A.Ş',
        city: 'Balıkesir',
        email: '',
        phone: '',
        address: '',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2026-10-16T11:35:04.082913+00:00',
        updated_at: '2026-10-16T11:35:04.082913+00:00'
      },
      {
        id: '735825a4-f12b-4ee7-959c-a8a29e674617',
        name: 'Mıçı Otomotiv',
        city: 'Adana',
        email: 'info@mici.com.tr',
        phone: '',
        address: 'Adana, Türkiye',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Bigsafer Teknolojiler A.Ş.',
        city: 'Düzce',
        email: 'info@bigsafer.com',
        phone: '',
        address: 'Düzce Teknopark',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '87ed6f79-6a54-40ea-b188-8b325513dc41',
        name: 'Çavdarlı Otomotiv San. ve Tic. A.Ş.',
        city: 'Bursa',
        email: '',
        phone: '',
        address: 'Bursa',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'd4be3c56-bc23-4ecd-91e3-78f9625a5cb9',
        name: 'Hızel Otomotiv A.Ş.',
        city: 'Düzce',
        email: '',
        phone: '',
        address: 'Düzce',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '12004fce-050b-4db1-9a56-e414aec14246',
        name: 'Bakırcılar Otomotiv',
        city: 'Antalya',
        email: '',
        phone: '',
        address: '',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2026-09-30T21:49:15.943741+00:00',
        updated_at: '2026-09-30T21:49:15.943741+00:00'
      },
      {
        id: 'c2b6dd6f-317e-41a1-90d8-ac8774249c75',
        name: 'Skillbridge',
        city: 'İstanbul',
        email: '',
        phone: '',
        address: 'İstanbul',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: '71fa880b-c3e2-4967-b121-a2692353aa55',
        name: 'BIGsafely Dijital Pazarlama A.Ş',
        city: 'İstanbul',
        email: '',
        phone: '',
        address: 'İstanbul',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'aaaaaaaa-0000-0000-0000-000000000001',
        name: 'Humanius Demo Şirketi',
        city: 'İstanbul',
        email: 'demo@humanius.net',
        phone: '',
        address: 'İstanbul',
        tax_number: '',
        sgk_sicil_no: '',
        logo_url: null,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z'
      }
    ];

    // 1. Doğrudan PostgREST veritabanı sorgusu (1. Öncelik - Database-First)
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const list = (data || []).map(c => ({ ...c, name: fixUtf8Encoding(c.name) }));
        try { localStorage.setItem('humanius_cached_companies', JSON.stringify(list)); } catch {}
        return list;
      }
    } catch {}

    // 2. Edge Function (Doğrudan DB RLS nedeniyle boş dönerse service_role ile veritabanından çek)
    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'list_companies' }
      });
      if (res?.companies && res.companies.length > 0) {
        const list = (res.companies || []).map((c: any) => ({ ...c, name: fixUtf8Encoding(c.name) }));
        try { localStorage.setItem('humanius_cached_companies', JSON.stringify(list)); } catch {}
        return list;
      }
    } catch {}

    // 3. Offline Yedek: Yerel Önbellek Kontrolü (Yalnızca veritabanına ulaşılamadığında)
    try {
      const cached = localStorage.getItem('humanius_cached_companies');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}

    return STATIC_KNOWN_COMPANIES;
  },

  async getById(id: string) {
    if (!id) return null;
    if (id === 'demo-company-id-9999') {
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

    // 1. Doğrudan veritabanından çek (1. Öncelik - Database-First)
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

    // 2. Edge Function üzerinden veritabanından çek
    try {
      const { data: res } = await supabase.functions.invoke('user-management', {
        body: { operation: 'get_company', id }
      });
      if (res?.company) {
        return { ...res.company, name: fixUtf8Encoding(res.company.name) };
      }
    } catch {}

    // 3. Offline Yedek: Yerel önbellekten kontrol et
    try {
      const cached = localStorage.getItem('humanius_cached_companies');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const match = parsed.find((c: any) => c.id === id);
          if (match) return match;
        }
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
      ALTAN_COMPANY_ID,
      BIGSAFER_COMPANY_ID,
      MICI_COMPANY_ID,
      HIZEL_COMPANY_ID,
      CAVDARLI_COMPANY_ID,
      BAKIRCILAR_COMPANY_ID,
      SKILLBRIDGE_COMPANY_ID,
      BIGSAFELY_COMPANY_ID
    ];
    try {
      const companies = await this.getCompanies();
      for (const c of companies) {
        if (c.id && !companyIds.includes(c.id)) {
          companyIds.push(c.id);
        }
      }
    } catch {}

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
    const deletedIds = getDeletedOfficeIds();

    // 1. DEMO MODE
    if (demoService.isDemoActive()) {
      const demoKey = `humanius_demo_office_locations_${targetCompId}`;
      const saved = localStorage.getItem(demoKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((l: any) => !deletedIds.has(l.id));
          }
        } catch {}
      }
      return getDefaultOfficesForCompany(targetCompId).filter((l) => !deletedIds.has(l.id));
    }

    // 2. SUPABASE / PRODUCTION MODE (Database-First)
    let locations: import('../types').CompanyOfficeLocation[] = [];

    try {
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

    // Local custom offices backup merge ONLY if remote DB had no records
    if (locations.length === 0) {
      try {
        const customKey = `humanius_custom_office_locations_${targetCompId}`;
        const rawCustom = localStorage.getItem(customKey);
        if (rawCustom) {
          const customLocs = JSON.parse(rawCustom);
          if (Array.isArray(customLocs)) {
            for (const cLoc of customLocs) {
              if (!locations.some((l) => l.id === cLoc.id || l.name.trim().toLowerCase() === cLoc.name.trim().toLowerCase())) {
                locations.push(cLoc);
              }
            }
          }
        }
      } catch {}
    }

    // STRICT MULTI-TENANCY FILTER:
    locations = locations.filter((l) => (l.company_id === targetCompId || !l.company_id) && !deletedIds.has(l.id));

    // Only if completely empty in database, provide company-specific defaults without leaking other companies
    if (locations.length === 0) {
      locations = getDefaultOfficesForCompany(targetCompId).filter((l) => !deletedIds.has(l.id));
    }

    // Enrich every location with il / ilce strictly prioritizing the Database columns (loc.il, loc.ilce)
    return locations.map((loc) => {
      const dbIl = loc.il ? String(loc.il).trim() : '';
      const dbIlce = loc.ilce ? String(loc.ilce).trim() : '';
      const meta = getLocationMeta(loc.id);
      const effectiveIl = dbIl || meta.il || '';
      const effectiveIlce = dbIlce || meta.ilce || '';
      const inferred = (!effectiveIl) ? inferIlIlce(loc.name, loc.address, effectiveIl, effectiveIlce) : { il: effectiveIl, ilce: effectiveIlce };
      return {
        ...loc,
        company_id: targetCompId,
        il: effectiveIl || inferred.il || '',
        ilce: effectiveIlce || inferred.ilce || ''
      };
    });
  },

  async saveOfficeLocation(location: Partial<import('../types').CompanyOfficeLocation>): Promise<import('../types').CompanyOfficeLocation | null> {
    const targetCompId = normalizeCompanyId(location.company_id);
    const isValidUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    // Determine if we have a real UUID to update
    let dbId: string | undefined = isValidUuid(location.id) ? location.id : undefined;

    if (!dbId && location.id) {
      try {
        const { data: existingRows } = await supabase
          .from('company_locations')
          .select('id, name')
          .eq('company_id', targetCompId);
        if (existingRows && existingRows.length > 0) {
          const match = existingRows.find(
            (r) => r.name.trim().toLowerCase() === (location.name || '').trim().toLowerCase()
          );
          if (match && isValidUuid(match.id)) {
            dbId = match.id;
          }
        }
      } catch {}
    }

    const tempLocId = dbId || location.id || `loc-${Date.now()}`;
    if (location.il !== undefined || location.ilce !== undefined) {
      saveLocationMeta(tempLocId, location.il, location.ilce);
      if (dbId && tempLocId !== dbId) {
        saveLocationMeta(dbId, location.il, location.ilce);
      }
    }

    // 1. DEMO MODE
    if (demoService.isDemoActive() || !location.company_id) {
      const current = await this.getOfficeLocations(targetCompId);
      const locId = dbId || location.id || `loc-${Date.now()}`;
      let updated: import('../types').CompanyOfficeLocation[];
      let savedLoc: import('../types').CompanyOfficeLocation;
      if (location.id) {
        savedLoc = { ...current.find((l) => l.id === location.id), ...location, id: locId, company_id: targetCompId } as import('../types').CompanyOfficeLocation;
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
      window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, location: savedLoc } }));
      return savedLoc;
    }

    // 2. SUPABASE / PRODUCTION MODE
    // Try Edge Function First
    try {
      const payload: any = {
        operation: 'save_company_location',
        company_id: targetCompId,
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        radius_meters: location.radius_meters || 200,
        address: location.address || '',
        il: location.il || '',
        ilce: location.ilce || '',
        is_default: Boolean(location.is_default),
      };
      if (dbId) payload.id = dbId;

      const { data: res } = await supabase.functions.invoke('user-management', {
        body: payload
      });
      if (res?.location) {
        const result = res.location as import('../types').CompanyOfficeLocation;
        if (location.il !== undefined || location.ilce !== undefined) {
          saveLocationMeta(result.id, location.il, location.ilce);
        }
        const finalLoc = {
          ...result,
          il: result.il || location.il || '',
          ilce: result.ilce || location.ilce || ''
        };
        window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, location: finalLoc } }));
        return finalLoc;
      }
    } catch (e) {
      console.warn("Save location invoke error:", e);
    }

    // Fallback: Direct Database Operation
    try {
      if (Boolean(location.is_default)) {
        try {
          await supabase.from('company_locations').update({ is_default: false }).eq('company_id', targetCompId);
        } catch {}
      }

      const dbPayload: any = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        radius_meters: location.radius_meters || 200,
        address: location.address || '',
        il: location.il || '',
        ilce: location.ilce || '',
        is_default: Boolean(location.is_default),
      };

      if (dbId) {
        dbPayload.updated_at = new Date().toISOString();
        const { data, error } = await supabase.from('company_locations').update(dbPayload).eq('id', dbId).select().single();
        if (!error && data) {
          if (location.il !== undefined || location.ilce !== undefined) saveLocationMeta(data.id, location.il, location.ilce);
          const finalLoc = {
            ...data,
            il: data.il || location.il || '',
            ilce: data.ilce || location.ilce || ''
          } as import('../types').CompanyOfficeLocation;
          window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, location: finalLoc } }));
          return finalLoc;
        }
      } else {
        dbPayload.company_id = targetCompId;
        const { data, error } = await supabase.from('company_locations').insert(dbPayload).select().single();
        if (!error && data) {
          if (location.il !== undefined || location.ilce !== undefined) saveLocationMeta(data.id, location.il, location.ilce);
          const finalLoc = {
            ...data,
            il: data.il || location.il || '',
            ilce: data.ilce || location.ilce || ''
          } as import('../types').CompanyOfficeLocation;
          window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, location: finalLoc } }));
          return finalLoc;
        }
      }
    } catch (dbErr) {
      console.error("Direct save company location error:", dbErr);
    }

    // Fallback: Local Cache Persistence if remote DB is unreachable
    try {
      const current = await this.getOfficeLocations(targetCompId);
      const locId = dbId || location.id || `loc-${Date.now()}`;
      const savedLoc: import('../types').CompanyOfficeLocation = {
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
      const filtered = current.filter((l) => l.id !== locId);
      const updated = [...filtered, savedLoc];
      localStorage.setItem(`humanius_custom_office_locations_${targetCompId}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, location: savedLoc } }));
      return savedLoc;
    } catch {}

    return null;
  },

  async deleteOfficeLocation(id: string, companyId?: string): Promise<boolean> {
    const targetCompId = normalizeCompanyId(companyId);
    const isValidUuid = (str?: string) => Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));

    // Always remember deleted ID so default offices don't reappear
    markOfficeDeleted(id);

    // Update demo / local storage
    try {
      const demoKey = `humanius_demo_office_locations_${targetCompId}`;
      const rawDemo = localStorage.getItem(demoKey);
      if (rawDemo) {
        const parsed = JSON.parse(rawDemo);
        if (Array.isArray(parsed)) {
          localStorage.setItem(demoKey, JSON.stringify(parsed.filter((l: any) => l.id !== id)));
        }
      }
      const customKey = `humanius_custom_office_locations_${targetCompId}`;
      const rawCustom = localStorage.getItem(customKey);
      if (rawCustom) {
        const parsed = JSON.parse(rawCustom);
        if (Array.isArray(parsed)) {
          localStorage.setItem(customKey, JSON.stringify(parsed.filter((l: any) => l.id !== id)));
        }
      }
    } catch {}

    if (isValidUuid(id)) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'delete_company_location', id }
        });
        if (res?.success) {
          window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, deletedId: id } }));
          return true;
        }
      } catch {}

      try {
        const { error } = await supabase.from('company_locations').delete().eq('id', id);
        if (!error) {
          window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, deletedId: id } }));
          return true;
        }
      } catch {}
    }

    window.dispatchEvent(new CustomEvent('humanius_office_locations_updated', { detail: { companyId: targetCompId, deletedId: id } }));
    return true;
  }
};

export const ALTAN_COMPANY_ID = '1cc4a668-c6ad-49d9-8f9c-aea1243239c9';
export const BIGSAFER_COMPANY_ID = '11111111-1111-1111-1111-111111111111';
export const MICI_COMPANY_ID = '735825a4-f12b-4ee7-959c-a8a29e674617';
export const CAVDARLI_COMPANY_ID = '87ed6f79-6a54-40ea-b188-8b325513dc41';
export const HIZEL_COMPANY_ID = 'd4be3c56-bc23-4ecd-91e3-78f9625a5cb9';
export const BAKIRCILAR_COMPANY_ID = '12004fce-050b-4db1-9a56-e414aec14246';
export const SKILLBRIDGE_COMPANY_ID = 'c2b6dd6f-317e-41a1-90d8-ac8774249c75';
export const BIGSAFELY_COMPANY_ID = '71fa880b-c3e2-4967-b121-a2692353aa55';

function getActiveUserCompanyHint(): string {
  try {
    const raw = localStorage.getItem('humanius_remembered_account');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.companyName) return String(parsed.companyName).toLowerCase();
    }
  } catch {}
  return '';
}

export function normalizeCompanyId(companyId?: string | null): string {
  const s = String(companyId || '').trim().toLowerCase();

  // 1. If already a valid UUID, return immediately without any string heuristics
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return s;
  }

  // 2. Match strictly by explicit company name (never by car brand or city)
  if (s.includes('altan')) return ALTAN_COMPANY_ID;
  if (s.includes('mıçı') || s.includes('mici')) return MICI_COMPANY_ID;
  if (s.includes('bakırcılar') || s.includes('bakircilar')) return BAKIRCILAR_COMPANY_ID;
  if (s.includes('bigsafely')) return BIGSAFELY_COMPANY_ID;
  if (s.includes('bigsafer')) return BIGSAFER_COMPANY_ID;
  if (s.includes('çavdarlı') || s.includes('cavdarli')) return CAVDARLI_COMPANY_ID;
  if (s.includes('hızel') || s.includes('hizel')) return HIZEL_COMPANY_ID;
  if (s.includes('skillbridge')) return SKILLBRIDGE_COMPANY_ID;

  // 3. If companyId is not provided, 'all', 'default' or demo, resolve based on active user context
  if (!companyId || s === 'all' || s === 'default' || s === 'demo-company-id-9999') {
    const hint = getActiveUserCompanyHint();
    if (hint) {
      if (hint.includes('altan')) return ALTAN_COMPANY_ID;
      if (hint.includes('mıçı') || hint.includes('mici')) return MICI_COMPANY_ID;
      if (hint.includes('bakırcılar') || hint.includes('bakircilar')) return BAKIRCILAR_COMPANY_ID;
      if (hint.includes('çavdarlı') || hint.includes('cavdarli')) return CAVDARLI_COMPANY_ID;
      if (hint.includes('hızel') || hint.includes('hizel')) return HIZEL_COMPANY_ID;
      if (hint.includes('skillbridge')) return SKILLBRIDGE_COMPANY_ID;
      if (hint.includes('bigsafely')) return BIGSAFELY_COMPANY_ID;
      if (hint.includes('bigsafer')) return BIGSAFER_COMPANY_ID;
    }
    return BIGSAFER_COMPANY_ID;
  }

  return companyId;
}

export const ALTAN_DEFAULT_OFFICES: import('../types').CompanyOfficeLocation[] = [
  { id: 'ef746830-03ec-4ff6-9aeb-ce540a594e9b', company_id: ALTAN_COMPANY_ID, name: 'ALTAN MOTORLU ARAÇLAR SAN. TİC. A.Ş. / BALIKESİR TOYOTA', lat: 39.605772, lng: 27.905809, radius_meters: 300, address: 'TOYOTA/BALIKESİR', il: 'Balıkesir', ilce: 'Altıeylül', is_default: true },
  { id: 'da80ae30-522f-4c1d-b2aa-8b94305b6d2d', company_id: ALTAN_COMPANY_ID, name: 'ALTAN MOTORLU ARAÇLAR SAN. TİC. A.Ş. / BANDIRMA TOYOTA', lat: 40.299202, lng: 28.029721, radius_meters: 200, address: 'BANDIRMA/TOYOTA', il: 'Balıkesir', ilce: 'Bandırma', is_default: false },
  { id: 'bfefb10f-40c2-42b0-8d7c-3fb53b8ac6bf', company_id: ALTAN_COMPANY_ID, name: 'ALTAN MOTORLU ARAÇLAR SAN. TİC. A.Ş. / EDREMİT HONDA', lat: 39.61283, lng: 27.012634, radius_meters: 200, address: 'EDREMİT/HONDA', il: 'Balıkesir', ilce: 'Edremit', is_default: false },
  { id: 'daf385ef-17d5-4b27-b6a0-5030363cca2c', company_id: ALTAN_COMPANY_ID, name: 'ALTAN MOTORLU ARAÇLAR SAN. TİC. A.Ş. / KASAPLAR HONDA', lat: 39.643508, lng: 27.881054, radius_meters: 100, address: 'KASAPLAR/HONDA', il: 'Balıkesir', ilce: 'Altıeylül', is_default: false },
  { id: '751baf0c-2106-4ab9-b4a2-0cdf6cb69952', company_id: ALTAN_COMPANY_ID, name: 'ALTAN MOTORLU ARAÇLAR SAN. TİC. A.Ş. / PAŞAALANI HONDA', lat: 39.655771, lng: 27.907872, radius_meters: 200, address: 'BALIKESİR/HONDA', il: 'Balıkesir', ilce: 'Karesi', is_default: false },
];

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
  if (compId === ALTAN_COMPANY_ID) return [...ALTAN_DEFAULT_OFFICES];
  if (compId === MICI_COMPANY_ID) return [...MICI_DEFAULT_OFFICES];
  if (compId === BIGSAFER_COMPANY_ID) return [...BIGSAFER_DEFAULT_OFFICES];
  if (compId === HIZEL_COMPANY_ID) return [...HIZEL_DEFAULT_OFFICES];
  if (compId === CAVDARLI_COMPANY_ID) return [...CAVDARLI_DEFAULT_OFFICES];
  if (compId === SKILLBRIDGE_COMPANY_ID) return [...SKILLBRIDGE_DEFAULT_OFFICES];
  if (compId === BIGSAFELY_COMPANY_ID) return [...BIGSAFELY_DEFAULT_OFFICES];
  return [];
}

function normalizeCityStr(str?: string): string {
  if (!str) return '';
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş')
    .replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase()
    .replace(/[\s\-_,\.\/\\]/g, '');
}

function inferIlIlce(name?: string, address?: string, currentIl?: string, currentIlce?: string): { il: string; ilce: string } {
  if (currentIl && currentIl.trim()) {
    return { il: currentIl.trim(), ilce: currentIlce ? currentIlce.trim() : '' };
  }
  const rawText = `${name || ''} ${address || ''}`;
  const normText = normalizeCityStr(rawText);

  // Scan 81 provinces and their districts (no brand-based assumptions)
  if (Array.isArray(iller)) {
    for (const item of iller) {
      const normIl = normalizeCityStr(item.il);
      if (normText.includes(normIl)) {
        let matchedIlce = '';
        for (const ilce of item.ilceleri) {
          if (ilce.toLowerCase() === 'merkez') continue;
          const normIlce = normalizeCityStr(ilce);
          if (normIlce.length >= 3 && normText.includes(normIlce)) {
            matchedIlce = ilce;
            break;
          }
        }
        return { il: item.il, ilce: matchedIlce || 'Merkez' };
      }
    }
  }

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

function getDeletedOfficeIds(): Set<string> {
  try {
    const raw = localStorage.getItem('humanius_deleted_office_ids');
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markOfficeDeleted(id: string) {
  try {
    const set = getDeletedOfficeIds();
    set.add(id);
    localStorage.setItem('humanius_deleted_office_ids', JSON.stringify(Array.from(set)));
  } catch {}
}

