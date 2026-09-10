import { supabase } from '../lib/supabase';
import { demoService } from './demoService';
import { getTodayYYYYMMDD, secureStorage } from '../utils/sanitize';

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
  async getVardiyalar(): Promise<VardiyaKaydi[]> {
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
      const { data, error } = await supabase
        .from('pdks_vardiya_kayitlari')
        .select('*')
        .order('tarih', { ascending: false });

      if (error) throw error;
      const dbList = (data as VardiyaKaydi[]) || [];

      // Merge with local vardiya cache if any exists
      try {
        const localCacheRaw = localStorage.getItem('humanius_local_vardiya_cache');
        if (localCacheRaw) {
          const localCache = JSON.parse(localCacheRaw) as VardiyaKaydi[];
          if (Array.isArray(localCache) && localCache.length > 0) {
            const merged = [...dbList];
            for (const loc of localCache) {
              const idx = merged.findIndex((m) => m.employee_id === loc.employee_id && m.tarih === loc.tarih);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...loc };
              } else {
                merged.unshift(loc);
              }
            }
            return merged;
          }
        }
      } catch {}

      return dbList;
    } catch (err) {
      console.warn('Supabase vardiya yükleme hatası, yerel önbellek kullanılıyor:', err);
      try {
        const localCacheRaw = localStorage.getItem('humanius_local_vardiya_cache') || localStorage.getItem('humanius_demo_pdks_vardiya');
        if (localCacheRaw) {
          return JSON.parse(localCacheRaw);
        }
      } catch {}
      return [];
    }
  },

  async createVardiya(kayit: VardiyaInsert): Promise<VardiyaKaydi> {
    // Always update local cache so any created/edited vardiya is guaranteed to be available locally
    let cachedRec: VardiyaKaydi = {
      ...kayit,
      id: 'v-loc-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const cacheRaw = localStorage.getItem('humanius_local_vardiya_cache');
      const cacheList: VardiyaKaydi[] = cacheRaw ? JSON.parse(cacheRaw) : [];
      const existingIdx = cacheList.findIndex((r) => r.employee_id === kayit.employee_id && r.tarih === kayit.tarih);
      if (existingIdx >= 0) {
        cachedRec = { ...cacheList[existingIdx], ...kayit, updated_at: new Date().toISOString() };
        cacheList[existingIdx] = cachedRec;
      } else {
        cacheList.unshift(cachedRec);
      }
      localStorage.setItem('humanius_local_vardiya_cache', JSON.stringify(cacheList));
    } catch (e) {
      console.warn('Yerel vardiya önbellek hatası:', e);
    }

    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const existingIdx = list.findIndex(r => r.employee_id === kayit.employee_id && r.tarih === kayit.tarih);
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...kayit, updated_at: new Date().toISOString() };
        localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
        return list[existingIdx];
      }
      list.push(cachedRec);
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return cachedRec;
    }

    try {
      const { data, error } = await supabase
        .from('pdks_vardiya_kayitlari')
        .upsert(kayit, { onConflict: 'employee_id,tarih' })
        .select()
        .single();

      if (error) throw error;
      return data as any;
    } catch (err) {
      console.warn('Supabase vardiya kaydetme hatası, yerel önbellek kullanıldı:', err);
      return cachedRec;
    }
  },

  async updateVardiya(id: string, updates: Partial<VardiyaInsert>): Promise<VardiyaKaydi> {
    try {
      const cacheRaw = localStorage.getItem('humanius_local_vardiya_cache');
      const cacheList: VardiyaKaydi[] = cacheRaw ? JSON.parse(cacheRaw) : [];
      const idx = cacheList.findIndex((r) => r.id === id);
      if (idx >= 0) {
        cacheList[idx] = { ...cacheList[idx], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('humanius_local_vardiya_cache', JSON.stringify(cacheList));
      }
    } catch {}

    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Vardiya kaydı bulunamadı');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() } as any;
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return list[idx];
    }
    try {
      const { data, error } = await supabase
        .from('pdks_vardiya_kayitlari')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as VardiyaKaydi;
    } catch (err) {
      console.warn('Supabase vardiya güncelleme hatası:', err);
      return { id, ...updates } as any;
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
    const { data, error } = await supabase
      .from('pdks_fazla_mesai')
      .select('*')
      .order('tarih', { ascending: false });

    if (error) throw error;
    return data as FazlaMesai[];
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
    await supabase.from('pdks_fazla_mesai').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('pdks_vardiya_kayitlari').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
};
