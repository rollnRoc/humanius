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
  async getAllTalepler(companyId: string) {
    if (demoService.isDemoActive()) {
      return demoService.getIzinTalepleri();
    }
    const { data, error } = await supabase
      .from('izin_talepleri')
      .select('*, employees(name, department, position)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
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
      const emp = demoService.getEmployees().find(e => e.id === employeeId);
      if (!emp) return null;
      const hakedis = await this.calculateIzinHakki(emp.join_date);
      
      // Calculate approved/used annual leaves
      const used = demoService.getIzinTalepleri()
        .filter(t => t.employee_id === employeeId && t.durum === 'onaylandi' && t.izin_turu === 'yillik' && new Date(t.baslangic_tarihi).getFullYear() === yil)
        .reduce((sum, t) => sum + (t.gun_sayisi || 0) + (t.yol_izni_talep ? (t.yol_izni_gun || 0) : 0), 0);

      return {
        id: 'hak-' + employeeId,
        company_id: 'demo-company-id-9999',
        employee_id: employeeId,
        yil,
        toplam_hak: hakedis,
        kullanilan_izin: used,
        kalan_izin: Math.max(0, hakedis - used),
        calisma_yili: Math.max(0, new Date().getFullYear() - new Date(emp.join_date).getFullYear()),
        ise_giris_tarihi: emp.join_date,
        hesaplama_tarihi: new Date().toISOString()
      };
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
      return hakki as any;
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
      const employees = demoService.getEmployees();
      const haklarPromises = employees.map(async emp => {
        const hak = await this.getEmployeeHakki(emp.id, yil);
        return {
          ...hak,
          employees: { name: emp.name, department: emp.department }
        };
      });
      return Promise.all(haklarPromises);
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
