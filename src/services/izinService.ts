import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { demoService } from './demoService';

type IzinTalebi = Database['public']['Tables']['izin_talepleri']['Row'];
type IzinTalebiInsert = Database['public']['Tables']['izin_talepleri']['Insert'];
type IzinTalebiUpdate = Database['public']['Tables']['izin_talepleri']['Update'];
type IzinHakki = Database['public']['Tables']['izin_haklari']['Row'];
type IzinHakkiInsert = Database['public']['Tables']['izin_haklari']['Insert'];
type IzinHakkiUpdate = Database['public']['Tables']['izin_haklari']['Update'];

export const izinService = {
  async getAll(companyId?: string) {
    if (demoService.isDemoActive()) {
      return demoService.getIzinTalepleri();
    }
    let query = supabase
      .from('izin_talepleri')
      .select('*, employees(name, department, position)')
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('izinService.getAll warning:', error);
      return [];
    }
    return data || [];
  },

  async getAllTalepler(companyId?: string) {
    return this.getAll(companyId);
  },

  async getTalepById(id: string) {
    if (demoService.isDemoActive()) {
      return demoService.getIzinTalepleri().find(t => t.id === id) || null;
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .select('*, employees(name, department, position)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createTalep(talep: IzinTalebiInsert) {
    if (demoService.isDemoActive()) {
      return demoService.createIzinTalebi(talep as any) as any;
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .insert(talep)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTalep(id: string, updates: IzinTalebiUpdate) {
    if (demoService.isDemoActive()) {
      return demoService.updateIzinTalebi(id, updates as any) as any;
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTalep(id: string) {
    if (demoService.isDemoActive()) {
      const list = demoService.getIzinTalepleri();
      demoService.saveIzinTalepleri(list.filter(t => t.id !== id));
      return;
    }
    const { error } = await supabase
      .from('izin_talepleri')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async approveTalep(id: string, onaylayanId: string) {
    if (demoService.isDemoActive()) {
      return demoService.updateIzinTalebi(id, {
        durum: 'onaylandi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString()
      } as any) as any;
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .update({
        durum: 'onaylandi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async rejectTalep(id: string, onaylayanId: string, redNedeni: string) {
    if (demoService.isDemoActive()) {
      return demoService.updateIzinTalebi(id, {
        durum: 'reddedildi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString(),
        red_nedeni: redNedeni
      } as any) as any;
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .update({
        durum: 'reddedildi',
        onaylayan_id: onaylayanId,
        onay_tarihi: new Date().toISOString(),
        red_nedeni: redNedeni
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTaleplerByStatus(companyId: string, durum: IzinTalebi['durum']) {
    if (demoService.isDemoActive()) {
      return demoService.getIzinTalepleri().filter(t => t.durum === durum);
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .select('*, employees(name, department)')
      .eq('company_id', companyId)
      .eq('durum', durum)
      .order('talep_tarihi', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getEmployeeHakki(employeeId: string, yil: number) {
    if (demoService.isDemoActive()) {
      const haklar = demoService.getIzinHaklari(yil);
      return haklar.find(h => h.employee_id === employeeId) || null;
    }
    const { data, error } = await supabase
      .from('izin_haklari')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('yil', yil)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createOrUpdateHakki(hakki: IzinHakkiInsert) {
    if (demoService.isDemoActive()) {
      return demoService.createOrUpdateIzinHakki(hakki as any) as any;
    }
    const { data, error } = await supabase
      .from('izin_haklari')
      .upsert(hakki)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAllHaklari(companyId: string, yil: number) {
    if (demoService.isDemoActive()) {
      const haklar = demoService.getIzinHaklari(yil);
      const employees = demoService.getEmployees();
      return haklar.map(h => {
        const emp = employees.find(e => e.id === h.employee_id);
        return {
          ...h,
          employees: emp ? { name: emp.name, department: emp.department } : undefined
        };
      });
    }
    const { data, error } = await supabase
      .from('izin_haklari')
      .select('*, employees(name, department)')
      .eq('company_id', companyId)
      .eq('yil', yil)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async addIzinHakedisi(params: {
    companyId?: string;
    employeeId: string;
    izinTuru: string;
    gunSayisi: number;
    islemTipi: 'ekle' | 'belirle';
    yil?: number;
    aciklama?: string;
    ekleyen?: string;
  }) {
    if (demoService.isDemoActive()) {
      return demoService.addIzinHakedis(params);
    }

    const currentYear = params.yil || new Date().getFullYear();
    const { data: existing } = await supabase
      .from('izin_haklari')
      .select('*')
      .eq('employee_id', params.employeeId)
      .eq('yil', currentYear)
      .maybeSingle();

    let currentToplam = existing?.toplam_hak || 14;
    let currentMazeret = existing?.mazeret_izin || 5;
    const gun = Number(params.gunSayisi) || 0;

    if (params.izinTuru === 'yillik') {
      currentToplam = params.islemTipi === 'ekle' ? currentToplam + gun : gun;
    } else if (params.izinTuru === 'mazeret') {
      currentMazeret = params.islemTipi === 'ekle' ? currentMazeret + gun : gun;
    }

    const { data, error } = await supabase
      .from('izin_haklari')
      .upsert({
        id: existing?.id,
        company_id: params.companyId,
        employee_id: params.employeeId,
        yil: currentYear,
        toplam_hak: currentToplam,
        mazeret_izin: currentMazeret,
        hesaplama_tarihi: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async calculateIzinHakki(iseGirisTarihi: string): Promise<number> {
    const giris = new Date(iseGirisTarihi);
    const now = new Date();
    const calismaYili = now.getFullYear() - giris.getFullYear();

    if (calismaYili < 1) return 14;
    if (calismaYili >= 1 && calismaYili < 5) return 14;
    if (calismaYili >= 5 && calismaYili < 15) return 20;
    return 26;
  }
};
