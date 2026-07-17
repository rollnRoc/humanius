import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import bcrypt from 'bcryptjs';

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
  async getAll(companyId: string) {
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*, employees(name, department)')
      .eq('company_id', companyId)
      .order('period', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*, employees(name, department, tc_no, sicil_no)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getByPeriod(companyId: string, period: string) {
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
    const { data, error } = await supabase
      .from('bordro_items')
      .select('*')
      .eq('employee_id', employeeId)
      .order('period', { ascending: false });

    if (error) throw error;
    return data;
  },

  async create(bordro: BordroItemInsert) {
    const { data, error } = await supabase
      .from('bordro_items')
      .upsert(bordro, { onConflict: 'employee_id,period' })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, updates: BordroItemUpdate) {
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
    const { error } = await supabase
      .from('bordro_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updateApprovalStatus(id: string, status: 'beklemede' | 'onaylandi' | 'reddedildi') {
    const { error } = await supabase
      .from('bordro_items')
      .update({ approval_status: status })
      .eq('id', id);

    if (error) throw error;
  },

  async getYillikBordrolar(companyId: string, employeeId: string, yil: number) {
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
      toplamKazanc: acc.toplamKazanc + bordro.toplam_kazanc,
      toplamKesinti: acc.toplamKesinti + bordro.toplam_kesinti,
      toplamNet: acc.toplamNet + bordro.net_maas
    }), { toplamKazanc: 0, toplamKesinti: 0, toplamNet: 0 });

    return {
      ...totals,
      aylikOrtalama: totals.toplamNet / bordrolar.length
    };
  },

  async createApproval(approval: BordroApproval) {
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
    const { data, error } = await supabase
      .from('bordro_approvals')
      .select('*')
      .eq('bordro_id', bordroId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getEmployeeApprovals(employeeId: string) {
    const { data, error } = await supabase
      .from('bordro_approvals')
      .select('*')
      .eq('employee_id', employeeId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async verifyEmployeePasscode(employeeId: string, passcode: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();

    if (error || !data) return false;
    if (!data.approval_passcode) return true; // Şifre tanımlanmamışsa doğrudan onaylanabilsin

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
    const { data, error } = await supabase
      .from('employees')
      .select('approval_passcode')
      .eq('id', employeeId)
      .maybeSingle();

    if (error || !data) return false;

    return !!data.approval_passcode && data.approval_passcode.length > 0;
  }
};
