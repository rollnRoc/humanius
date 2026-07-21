import { supabase } from '../lib/supabase';
import { demoService } from './demoService';

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
      const records = localStorage.getItem('humanius_demo_pdks_vardiya');
      if (!records) {
        // Seed today vardiya
        const today = new Date().toISOString().split('T')[0];
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
        localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(records);
    }
    const { data, error } = await supabase
      .from('pdks_vardiya_kayitlari')
      .select('*')
      .order('tarih', { ascending: false });

    if (error) throw error;
    return data as VardiyaKaydi[];
  },

  async createVardiya(kayit: VardiyaInsert): Promise<VardiyaKaydi> {
    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const newRec: VardiyaKaydi = {
        ...kayit,
        id: 'v-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newRec);
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return newRec;
    }
    const { data, error } = await supabase
      .from('pdks_vardiya_kayitlari')
      .insert(kayit)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async updateVardiya(id: string, updates: Partial<VardiyaInsert>): Promise<VardiyaKaydi> {
    if (demoService.isDemoActive()) {
      const list = await this.getVardiyalar();
      const idx = list.findIndex(r => r.id === id);
      if (idx === -1) throw new Error('Vardiya kaydı bulunamadı');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() } as any;
      localStorage.setItem('humanius_demo_pdks_vardiya', JSON.stringify(list));
      return list[idx];
    }
    const { data, error } = await supabase
      .from('pdks_vardiya_kayitlari')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as VardiyaKaydi;
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
            tarih: new Date().toISOString().split('T')[0],
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
  }
};
