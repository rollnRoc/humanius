import { supabase } from '../lib/supabase';
import { demoService } from './demoService';
import { getTodayYYYYMMDD, secureStorage } from '../utils/sanitize';
import { normalizeCompanyId } from './companyService';

export function formatTimeForDb(time: string | null | undefined): string | null {
  if (!time) return null;
  const clean = String(time).trim();
  if (!clean || clean === '-' || clean === '--:--') return null;
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = match[1].padStart(2, '0');
  const m = match[2];
  return `${h}:${m}:00`;
}

export type VardiyaTipi = 'sabah' | 'aksam' | 'gece' | 'tam-gun' | 'yari-gun';
export type GirisDurumu = 'zamaninda' | 'gec-kaldi' | 'erken-cikti' | 'gelmedi' | 'izinli';
export type MesaiDurumu = 'bekliyor' | 'onaylandi' | 'reddedildi';

export interface VardiyaKaydi {
  id: string;
  company_id: string;
  employee_id: string;
  tarih: string;
  vardiya_tipi: VardiyaTipi;
  giris_saati: string | null;
  cikis_saati: string | null;
  durum: GirisDurumu;
  notlar: string | null;
  created_at: string;
  updated_at: string;
}

export interface FazlaMesai {
  id: string;
  company_id: string;
  employee_id: string;
  tarih: string;
  baslangic_saati: string;
  bitis_saati: string;
  toplam_saat: number;
  aciklama: string | null;
  onay_durumu: MesaiDurumu;
  onaylayan_id: string | null;
  onay_tarihi: string | null;
  created_at: string;
  updated_at: string;
}

export type VardiyaInsert = Omit<VardiyaKaydi, 'id' | 'created_at' | 'updated_at'>;
export type FazlaMesaiInsert = Omit<FazlaMesai, 'id' | 'created_at' | 'updated_at'>;

export const pdksService = {
  // =====================================
  // VARDIYA İŞLEMLERİ
  // =====================================
  async getVardiyalar(companyId?: string): Promise<VardiyaKaydi[]> {
    if (demoService.isDemoActive()) {
      const records = secureStorage.getItem<VardiyaKaydi[]>('humanius_demo_pdks_vardiya');
      if (!records) {
        // Seed today vardiya
        const today = getTodayYYYYMMDD();
        const initial: VardiyaKaydi[] = [
          {
            id: 'v-1',
            company_id: 'demo-company-id-9999',
            employee_id: 'emp-1',
            tarih: today,
            vardiya_tipi: 'sabah',
            giris_saati: '08:45',
            cikis_saati: null,
            durum: 'zamaninda',
            notlar: 'Giriş yapıldı',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'v-2',
            company_id: 'demo-company-id-9999',
            employee_id: 'emp-2',
            tarih: today,
            vardiya_tipi: 'sabah',
            giris_saati: '09:15',
            cikis_saati: null,
            durum: 'gec-kaldi',
            notlar: 'Trafik yoğunluğu nedeniyle geç giriş.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        secureStorage.setItem('humanius_demo_pdks_vardiya', initial);
        return initial;
      }
      return records;
    }
    try {
      let allRows: VardiyaKaydi[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('pdks_vardiya_kayitlari')
          .select('*')
          .order('tarih', { ascending: false });

        if (companyId) {
          const cleanCompId = normalizeCompanyId(companyId);
          query = query.or(`company_id.eq.${cleanCompId},company_id.is.null`);
        }

        const { data, error } = await query.range(from, from + pageSize - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allRows = allRows.concat(data as VardiyaKaydi[]);
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            from += pageSize;
          }
        } else {
          hasMore = false;
        }
      }

      const dbList = allRows;
      return dbList;
    } catch (err) {
      console.warn('Supabase vardiya yükleme hatası:', err);
      return [];
    }
  },

  async createVardiya(kayit: VardiyaInsert): Promise<VardiyaKaydi> {
    const cleanCompId = normalizeCompanyId(kayit.company_id);
    const cleanGiris = formatTimeForDb(kayit.giris_saati);
    const cleanCikis = formatTimeForDb(kayit.cikis_saati);
    const cleanTarih = String(kayit.tarih).split('T')[0];

    const cleanPayload: VardiyaInsert = {
      ...kayit,
      company_id: cleanCompId,
      tarih: cleanTarih,
      giris_saati: cleanGiris,
      cikis_saati: cleanCikis,
    };

    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const existingIdx = list.findIndex(r => r.employee_id === cleanPayload.employee_id && r.tarih === cleanPayload.tarih);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...cleanPayload, updated_at: new Date().toISOString() };
        localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
        return list[existingIdx];
      }
      const newRec: VardiyaKaydi = {
        ...cleanPayload,
        id: 'v-demo-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      list.push(newRec);
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return newRec;
    }

    // Direct write to Supabase Database (authoritative single source of truth)
    const { data, error } = await supabase
      .from('pdks_vardiya_kayitlari')
      .upsert(cleanPayload, { onConflict: 'employee_id,tarih' })
      .select()
      .single();

    if (error) {
      console.error('Supabase vardiya kaydetme hatası:', error);
      throw error;
    }

    return data as VardiyaKaydi;
  },

  async updateVardiya(id: string, updates: Partial<VardiyaInsert>): Promise<VardiyaKaydi> {
    const cleanUpdates: Partial<VardiyaInsert> = { ...updates };
    if (updates.giris_saati !== undefined) {
      cleanUpdates.giris_saati = formatTimeForDb(updates.giris_saati);
    }
    if (updates.cikis_saati !== undefined) {
      cleanUpdates.cikis_saati = formatTimeForDb(updates.cikis_saati);
    }
    if (updates.company_id) {
      cleanUpdates.company_id = normalizeCompanyId(updates.company_id);
    }
    if (updates.tarih) {
      cleanUpdates.tarih = String(updates.tarih).split('T')[0];
    }

    let targetEmpId = cleanUpdates.employee_id;
    let targetTarih = cleanUpdates.tarih;

    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) {
        if (targetEmpId && targetTarih) {
          const byEmp = list.findIndex(r => r.employee_id === targetEmpId && r.tarih === targetTarih);
          if (byEmp >= 0) {
            list[byEmp] = { ...list[byEmp], ...cleanUpdates, updated_at: new Date().toISOString() } as any;
            localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
            return list[byEmp];
          }
        }
        throw new Error('Vardiya kaydı bulunamadı');
      }
      list[idx] = { ...list[idx], ...cleanUpdates, updated_at: new Date().toISOString() } as any;
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return list[idx];
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    try {
      if (isUuid) {
        const { data, error } = await supabase
          .from('pdks_vardiya_kayitlari')
          .update(cleanUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as VardiyaKaydi;
        }
      }

      // If id is not a UUID or eq('id', id) didn't match, update by employee_id + tarih
      if (targetEmpId && targetTarih) {
        const { data, error } = await supabase
          .from('pdks_vardiya_kayitlari')
          .update(cleanUpdates)
          .eq('employee_id', targetEmpId)
          .eq('tarih', targetTarih)
          .select()
          .maybeSingle();

        if (!error && data) {
          return data as VardiyaKaydi;
        }
      }

      return { id, ...cleanUpdates } as any;
    } catch (err) {
      console.warn('Supabase vardiya güncelleme hatası:', err);
      return { id, ...cleanUpdates } as any;
    }
  },

  async deleteVardiya(id: string): Promise<void> {
    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const filtered = list.filter(r => r.id !== id);
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
      .from('pdks_vardiya_kayitlari')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // =====================================
  // FAZLA MESAİ İŞLEMLERİ
  // =====================================
  async getFazlaMesailer(): Promise<FazlaMesai[]> {
    if (demoService.isDemoActive()) {
      const records = localStorage.getItem('humanius_demo_pdks_mesai');
      if (!records) {
        const initial: FazlaMesai[] = [
          {
            id: 'm-1',
            company_id: 'demo-company-id-9999',
            employee_id: 'emp-2',
            tarih: getTodayYYYYMMDD(),
            baslangic_saati: '18:00',
            bitis_saati: '20:00',
            toplam_saat: 2.0,
            aciklama: 'Sunucu geçiş çalışması desteği.',
            onay_durumu: 'bekliyor',
            onaylayan_id: null,
            onay_tarihi: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('humanius_demo_pdks_mesai', JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(records);
    }
    let allRows: FazlaMesai[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('pdks_fazla_mesai')
        .select('*')
        .order('tarih', { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;
      if (data && data.length > 0) {
        allRows = allRows.concat(data as FazlaMesai[]);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }
    return allRows;
  },

  async createFazlaMesai(kayit: FazlaMesaiInsert): Promise<FazlaMesai> {
    if (demoService.isDemoActive()) {
      const list = await this.getFazlaMesailer();
      const newRec: FazlaMesai = {
        ...kayit,
        id: 'm-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newRec);
      localStorage.setItem('humanius_demo_pdks_mesai', JSON.stringify(list));
      return newRec;
    }
    const { data, error } = await supabase
      .from('pdks_fazla_mesai')
      .insert(kayit)
      .select()
      .single();

    if (error) throw error;
    return data as FazlaMesai;
  },

  async updateFazlaMesai(id: string, updates: Partial<FazlaMesaiInsert>): Promise<FazlaMesai> {
    if (demoService.isDemoActive()) {
      const list = await this.getFazlaMesailer();
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Fazla mesai kaydı bulunamadı');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() } as any;
      localStorage.setItem('humanius_demo_pdks_mesai', JSON.stringify(list));
      return list[idx];
    }
    const { data, error } = await supabase
      .from('pdks_fazla_mesai')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FazlaMesai;
  },

  async deleteFazlaMesai(id: string): Promise<void> {
    if (demoService.isDemoActive()) {
      const list = await this.getFazlaMesailer();
      const filtered = list.filter(r => r.id !== id);
      localStorage.setItem('humanius_demo_pdks_mesai', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
      .from('pdks_fazla_mesai')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async approveFazlaMesai(id: string, onaylayanId: string, isApproved: boolean): Promise<FazlaMesai> {
    if (demoService.isDemoActive()) {
      return this.updateFazlaMesai(id, {
        onay_durumu: isApproved ? 'onaylandi' : 'reddedildi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString()
      });
    }
    const { data, error } = await supabase
      .from('pdks_fazla_mesai')
      .update({
        onay_durumu: isApproved ? 'onaylandi' : 'reddedildi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as FazlaMesai;
  },

  async clearAllData(): Promise<void> {
    if (demoService.isDemoActive()) {
      secureStorage.setItem('humanius_demo_pdks_vardiya', []);
      secureStorage.setItem('humanius_demo_pdks_mesai', []);
      secureStorage.removeItem('pdks_active_shift_id');
      secureStorage.removeItem('pdks_active_shift_start');
      secureStorage.removeItem('pdks_personal_history');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('humanius_pdks_override_') || key.startsWith('__enc_humanius_pdks_override_')) {
          localStorage.removeItem(key);
        }
      });
      return;
    }
    console.warn('clearAllData veritabanı silme koruması aktif: Toplu silme engellendi.');
    throw new Error('Veri güvenliği ve mevzuat gereği canlı veritabanı üzerindeki tüm PDKS kayıtlarını toplu silme işlemi kalıcı olarak devre dışı bırakılmıştır.');
  }
};
