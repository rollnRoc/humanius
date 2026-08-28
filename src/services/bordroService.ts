import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import bcrypt from 'bcryptjs';
import { demoService } from './demoService';

type BordroItem = Database['public']['Tables']['bordro_items']['Row'];
type BordroItemInsert = Database['public']['Tables']['bordro_items']['Insert'];
type BordroItemUpdate = Database['public']['Tables']['bordro_items']['Update'];

export interface BordroApproval {
  id?: string;
  bordro_id: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  verification_method: 'signature' | 'id_document' | 'passcode';
  signature_data?: string;
  id_document_data?: string;
  passcode_hash?: string;
  approval_status: 'onaylandi' | 'reddedildi';
  ip_address?: string;
  user_agent?: string;
  timestamp?: string;
}

export const bordroService = {
  async getAll(companyId?: string) {
    if (demoService.isDemoActive()) {
      return demoService.getBordrolar();
    }
    let query = supabase
      .from('bordro_items')
      .select('*, employees(name, department)')
      .order('period', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('bordroService.getAll warning:', error);
      return [];
    }
    return data || [];
  },

  async getById(id: string) {
    if (demoService.isDemoActive()) {
      return demoService.getBordrolar().find(b => b.id === id) || null;
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*, employees(name, department, tc_no, sicil_no)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getByPeriod(companyId: string, period: string) {
    if (demoService.isDemoActive()) {
      const parts = period.split('-');
      const yil = parseInt(parts[0], 10);
      const ay = parseInt(parts[1], 10);
      return demoService.getBordrolar().filter(b => b.yil === yil && b.ay === ay);
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*, employees(name, department)')
      .eq('company_id', companyId)
      .eq('period', period)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByEmployee(employeeId: string) {
    if (demoService.isDemoActive()) {
      return demoService.getBordrolar().filter(b => b.employee_id === employeeId);
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(bordro: BordroItemInsert) {
    if (demoService.isDemoActive()) {
      // Map period back to yil and ay
      const period = bordro.period || '';
      const parts = period.split('-');
      const yil = parseInt(parts[0], 10) || new Date().getFullYear();
      const ay = parseInt(parts[1], 10) || (new Date().getMonth() + 1);

      const items = demoService.getBordrolar();
      const existingIdx = items.findIndex(b => b.employee_id === bordro.employee_id && b.yil === yil && b.ay === ay);
      
      const mappedPayload = {
        employee_id: bordro.employee_id,
        yil,
        ay,
        brut_maas: bordro.brut_maas,
        net_maas: bordro.net_maas,
        sgk_isci_payi: bordro.sgk_isci_payi,
        issizlik_isci_payi: bordro.issizlik_isci_payi,
        gelir_vergisi_matrahi: bordro.gelir_vergisi_matrahi,
        kumulatif_gelir_vergisi_matrahi: bordro.kumulatif_gelir_vergisi_matrahi,
        gelir_vergisi: bordro.gelir_vergisi,
        damga_vergisi: bordro.damga_vergisi,
        sgk_isveren_payi: bordro.sgk_isveren_payi,
        issizlik_isveren_payi: bordro.issizlik_isveren_payi,
        toplam_isveren_maliyeti: bordro.toplam_isveren_maliyeti,
        fazla_mesai_saat: bordro.fazla_mesai_saat,
        fazla_mesai_ucreti: bordro.fazla_mesai_ucreti,
        kesintiler: bordro.kesintiler,
        ek_odemeler: bordro.ek_odemeler,
        durum: bordro.durum || 'taslak'
      };

      if (existingIdx !== -1) {
        const updated = { ...items[existingIdx], ...mappedPayload, updated_at: new Date().toISOString() };
        items[existingIdx] = updated;
        demoService.saveBordrolar(items);
        return updated as any;
      } else {
        const created = demoService.createBordro(mappedPayload as any);
        return created as any;
      }
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .upsert(bordro, { onConflict: 'employee_id,period' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: BordroItemUpdate) {
    if (demoService.isDemoActive()) {
      return demoService.updateBordro(id, updates as any) as any;
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    if (demoService.isDemoActive()) {
      const list = demoService.getBordrolar();
      demoService.saveBordrolar(list.filter(b => b.id !== id));
      return;
    }
    const { error } = await supabase
      .from('bordro_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateApprovalStatus(id: string, status: 'beklemede' | 'onaylandi' | 'reddedildi') {
    if (demoService.isDemoActive()) {
      demoService.updateBordro(id, { durum: status === 'onaylandi' ? 'onaylandi' : 'onay_bekliyor' } as any);
      return;
    }
    const { error } = await supabase
      .from('bordro_items')
      .update({ approval_status: status })
      .eq('id', id);

    if (error) throw error;
  },

  async getYillikBordrolar(companyId: string, employeeId: string, yil: number) {
    if (demoService.isDemoActive()) {
      return demoService.getBordrolar().filter(b => b.employee_id === employeeId && b.yil === yil);
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*')
      .eq('company_id', companyId)
      .eq('employee_id', employeeId)
      .gte('period', `${yil}-01`)
      .lte('period', `${yil}-12`)
      .order('period', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getCalculationRates(companyId: string, yil: number) {
    if (demoService.isDemoActive()) {
      return {
        id: 'calc-rate-demo',
        company_id: companyId,
        yil,
        sgk_tavan: 150015,
        sgk_taban: 20002,
        gelir_vergisi_dilimleri: [
          { limit: 110000, oran: 15 },
          { limit: 230000, oran: 20 },
          { limit: 870000, oran: 27 },
          { limit: 3000000, oran: 35 },
          { limit: 99999999, oran: 40 }
        ]
      };
    }
    const { data, error } = await supabase
      .from('bordro_calculation_rates')
      .select('*')
      .eq('company_id', companyId)
      .eq('yil', yil)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async bulkCreate(bordrolar: BordroItemInsert[]) {
    if (demoService.isDemoActive()) {
      const createdItems = [];
      for (const b of bordrolar) {
        const res = await this.create(b);
        createdItems.push(res);
      }
      return createdItems;
    }
    const { data, error } = await supabase
      .from('bordro_items')
      .insert(bordrolar)
      .select();

    if (error) throw error;
    return data;
  },

  async calculateYillikTotals(companyId: string, employeeId: string, yil: number) {
    const bordrolar = await this.getYillikBordrolar(companyId, employeeId, yil);

    if (!bordrolar || bordrolar.length === 0) {
      return {
        toplamKazanc: 0,
        toplamKesinti: 0,
        toplamNet: 0,
        aylikOrtalama: 0
      };
    }

    const totals = bordrolar.reduce((acc, bordro) => ({
      toplamKazanc: acc.toplamKazanc + (bordro.brut_maas || 0),
      toplamKesinti: acc.toplamKesinti + (bordro.kesintiler || 0),
      toplamNet: acc.toplamNet + (bordro.net_maas || 0)
    }), { toplamKazanc: 0, toplamKesinti: 0, toplamNet: 0 });

    return {
      ...totals,
      aylikOrtalama: totals.toplamNet / bordrolar.length
    };
  },

  async createApproval(approval: BordroApproval) {
    if (demoService.isDemoActive()) {
      const demoApprovals = JSON.parse(localStorage.getItem('humanius_demo_approvals') || '[]');
      const newApproval = {
        ...approval,
        id: 'app-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      };
      demoApprovals.push(newApproval);
      localStorage.setItem('humanius_demo_approvals', JSON.stringify(demoApprovals));

      demoService.updateBordro(approval.bordro_id, {
        durum: approval.approval_status === 'onaylandi' ? 'onaylandi' : 'taslak',
        onay_tarihi: new Date().toISOString()
      } as any);

      return newApproval;
    }
    const { data, error } = await supabase
      .from('bordro_approvals')
      .insert([approval])
      .select()
      .single();

    if (error) {
      throw new Error(`Onay kaydı oluşturulamadı: ${error.message}`);
    }

    const { error: updateError } = await supabase
      .from('bordro_items')
      .update({
        approval_status: approval.approval_status === 'onaylandi' ? 'onaylandi' : 'reddedildi',
        approval_date: new Date().toISOString()
      })
      .eq('id', approval.bordro_id);

    if (updateError) {
      throw new Error(`Bordro durumu güncellenemedi: ${updateError.message}`);
    }

    return data;
  },

  async getApprovals(bordroId: string) {
    if (demoService.isDemoActive()) {
      const demoApprovals = JSON.parse(localStorage.getItem('humanius_demo_approvals') || '[]');
      return demoApprovals.filter((a: any) => a.bordro_id === bordroId);
    }
    const { data, error } = await supabase
      .from('bordro_approvals')
      .select('*')
      .eq('bordro_id', bordroId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getEmployeeApprovals(employeeId: string) {
    if (demoService.isDemoActive()) {
      const demoApprovals = JSON.parse(localStorage.getItem('humanius_demo_approvals') || '[]');
      return demoApprovals.filter((a: any) => a.employee_id === employeeId);
    }
    const { data, error } = await supabase
      .from('bordro_approvals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async verifyEmployeePasscode(employeeId: string, passcode: string): Promise<boolean> {
    if (demoService.isDemoActive()) {
      const emp = demoService.getEmployees().find(e => e.id === employeeId);
      if (!emp) return false;
      if (!emp.approval_passcode) return true;
      
      let isValid = false;
      try {
        isValid = bcrypt.compareSync(passcode, emp.approval_passcode);
      } catch (e) {
        isValid = false;
      }
      if (!isValid && emp.approval_passcode === passcode) {
        isValid = true;
      }
      return isValid;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();

    if (error || !data) return false;
    if (!data.approval_passcode) return true; 

    let isValid = false;
    try {
      isValid = bcrypt.compareSync(passcode, data.approval_passcode);
    } catch (e) {
      isValid = false;
    }
    
    if (!isValid && data.approval_passcode === passcode) {
      isValid = true;
    }
    
    return isValid;
  },

  async hasEmployeePasscode(employeeId: string): Promise<boolean> {
    if (demoService.isDemoActive()) {
      const emp = demoService.getEmployees().find(e => e.id === employeeId);
      return !!emp?.approval_passcode && emp.approval_passcode.length > 0;
    }
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();

    if (error || !data) return false;

    return !!data.approval_passcode && data.approval_passcode.length > 0;
  }
};
