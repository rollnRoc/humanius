import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

export interface GorevTanimi {
  id?: string;
  company_id: string;
  employee_id: string;
  employee_name: string;
  gorev_adi: string;
  gorev_aciklama: string;
  sorumluluklar: string[];
  yetki_ve_sorumluluklar: string[];
  calismalar: string[];
  performans_kriterleri: string[];
  bagli_oldugu_pozisyon: string;
  is_birimi: string;
  onay_durumu?: string;
  onay_tarihi?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GorevTanimiApproval {
  id?: string;
  gorev_tanimi_id: string;
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

export const gorevTanimiService = {
  async createGorevTanimi(data: GorevTanimi) {
    const { data: result, error } = await supabase
      .from('gorev_tanimlari')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async getGorevTanimlari(companyId: string) {
    const { data, error } = await supabase
      .from('gorev_tanimlari')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async getGorevTanimiById(id: string) {
    const { data, error } = await supabase
      .from('gorev_tanimlari')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateGorevTanimi(id: string, updates: Partial<GorevTanimi>) {
    const { data, error } = await supabase
      .from('gorev_tanimlari')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createApproval(approval: GorevTanimiApproval) {
    const { data, error } = await supabase
      .from('gorev_tanimi_approvals')
      .insert([approval])
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('gorev_tanimlari')
      .update({
        onay_durumu: approval.approval_status === 'onaylandi' ? 'onaylandi' : 'reddedildi',
        onay_tarihi: new Date().toISOString()
      })
      .eq('id', approval.gorev_tanimi_id);

    return data;
  },

  async getApprovals(gorevTanimiId: string) {
    const { data, error } = await supabase
      .from('gorev_tanimi_approvals')
      .select('*')
      .eq('gorev_tanimi_id', gorevTanimiId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async setEmployeePasscode(employeeId: string, passcodeHash: string) {
    const { data, error } = await supabase
      .from('employees')
      .update({ approval_passcode: passcodeHash })
      .eq('id', employeeId)
      .select()
      .single();

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
  }
};
