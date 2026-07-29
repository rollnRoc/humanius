import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { demoService } from './demoService';

export type ZimmetKategori = 'bilgisayar' | 'telefon' | 'arac' | 'anahtar' | 'monitor' | 'yazici' | 'kulaklik' | 'tablet' | 'mobilya' | 'yazilim' | 'diger';
export type ZimmetDurum = 'aktif' | 'iade-edildi' | 'kayip' | 'bakimda';

const VALID_KATEGORILER: ZimmetKategori[] = [
  'bilgisayar', 'telefon', 'arac', 'anahtar', 'monitor', 'yazici', 'kulaklik', 'tablet', 'mobilya', 'yazilim', 'diger'
];

export function sanitizeZimmetKategori(kategori: any): ZimmetKategori {
  if (!kategori || typeof kategori !== 'string') return 'diger';
  const norm = kategori.toLowerCase().trim();
  if (VALID_KATEGORILER.includes(norm as ZimmetKategori)) {
    return norm as ZimmetKategori;
  }
  if (norm.includes('bilgisayar') || norm.includes('laptop') || norm.includes('pc')) return 'bilgisayar';
  if (norm.includes('telefon') || norm.includes('phone') || norm.includes('mobil')) return 'telefon';
  if (norm.includes('araç') || norm.includes('arac') || norm.includes('araba')) return 'arac';
  if (norm.includes('anahtar')) return 'anahtar';
  if (norm.includes('monitör') || norm.includes('monitor') || norm.includes('ekran')) return 'monitor';
  if (norm.includes('yazıcı') || norm.includes('yazici') || norm.includes('printer')) return 'yazici';
  if (norm.includes('kulaklık') || norm.includes('kulaklik')) return 'kulaklik';
  if (norm.includes('tablet')) return 'tablet';
  if (norm.includes('mobilya') || norm.includes('masa') || norm.includes('sandalye')) return 'mobilya';
  if (norm.includes('yazılım') || norm.includes('yazilim') || norm.includes('lisans')) return 'yazilim';
  return 'diger';
}

export interface Zimmet {
  id: string;
  company_id: string;
  seri_no: string;
  ad: string;
  kategori: ZimmetKategori;
  marka: string | null;
  model: string | null;
  deger: number;
  durum: ZimmetDurum;
  atanan_employee_id: string | null;
  atanma_tarihi: string | null;
  iade_tarihi: string | null;
  aciklama: string | null;
  created_at: string;
  updated_at: string;
}

export type ZimmetInsert = Omit<Zimmet, 'id' | 'created_at' | 'updated_at'>;

export const zimmetService = {
  async getAll(): Promise<Zimmet[]> {
    if (demoService.isDemoActive()) {
      const records = localStorage.getItem('humanius_demo_zimmetler');
      if (!records) {
        const initial: Zimmet[] = [
          {
            id: 'z-1',
            company_id: 'demo-company-id-9999',
            seri_no: 'SN-987654321',
            ad: 'MacBook Pro 16"',
            kategori: 'bilgisayar',
            marka: 'Apple',
            model: 'M3 Pro',
            deger: 95000,
            durum: 'aktif',
            atanan_employee_id: 'emp-2',
            atanma_tarihi: '2023-01-15',
            iade_tarihi: null,
            aciklama: 'Yazılım geliştirici iş bilgisayarı.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'z-2',
            company_id: 'demo-company-id-9999',
            seri_no: 'SN-123456789',
            ad: 'iPhone 15',
            kategori: 'telefon',
            marka: 'Apple',
            model: '128 GB',
            deger: 48000,
            durum: 'aktif',
            atanan_employee_id: 'emp-3',
            atanma_tarihi: '2024-03-05',
            iade_tarihi: null,
            aciklama: 'Müşteri görüşmeleri için şirket hattı ve telefonu.',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('humanius_demo_zimmetler', JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(records);
    }
    const { data, error } = await supabase
      .from('zimmetler')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Zimmet[];
  },

  async create(zimmet: ZimmetInsert): Promise<Zimmet> {
    const payload = {
      ...zimmet,
      kategori: sanitizeZimmetKategori(zimmet.kategori)
    };
    if (demoService.isDemoActive()) {
      const list = await this.getAll();
      const newRec: Zimmet = {
        ...payload,
        id: 'z-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newRec);
      localStorage.setItem('humanius_demo_zimmetler', JSON.stringify(list));
      return newRec;
    }
    const { data, error } = await supabase
      .from('zimmetler')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Zimmet;
  },

  async update(id: string, updates: Partial<ZimmetInsert>): Promise<Zimmet> {
    const payload = {
      ...updates,
      ...(updates.kategori ? { kategori: sanitizeZimmetKategori(updates.kategori) } : {})
    };
    if (demoService.isDemoActive()) {
      const list = await this.getAll();
      const idx = list.findIndex(z => z.id === id);
      if (idx === -1) throw new Error('Zimmet bulunamadı');
      list[idx] = { ...list[idx], ...payload, updated_at: new Date().toISOString() } as any;
      localStorage.setItem('humanius_demo_zimmetler', JSON.stringify(list));
      return list[idx];
    }
    const { data, error } = await supabase
      .from('zimmetler')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Zimmet;
  },

  async delete(id: string): Promise<void> {
    if (demoService.isDemoActive()) {
      const list = await this.getAll();
      const filtered = list.filter(z => z.id !== id);
      localStorage.setItem('humanius_demo_zimmetler', JSON.stringify(filtered));
      return;
    }
    const { error } = await supabase
      .from('zimmetler')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async atamaYap(zimmetId: string, employeeId: string | null): Promise<Zimmet> {
    const bugun = new Date().toISOString().split('T')[0];
    
    const updates: Partial<ZimmetInsert> = {
      atanan_employee_id: employeeId,
      durum: employeeId ? 'aktif' : 'iade-edildi',
      atanma_tarihi: employeeId ? bugun : null,
      iade_tarihi: employeeId ? null : bugun
    };

    return this.update(zimmetId, updates);
  }
};
