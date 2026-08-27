import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { demoService } from './demoService';

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
    if (demoService.isDemoActive()) {
      const list = await this.getGorevTanimlari(data.company_id);
      const newRec = {
        ...data,
        id: 'g-' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newRec);
      localStorage.setItem('humanius_demo_gorev_tanimlari', JSON.stringify(list));
      return newRec;
    }
    const { data: result, error } = await supabase
      .from('gorev_tanimlari')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  },

  async getGorevTanimlari(companyId?: string) {
    if (demoService.isDemoActive()) {
      const records = localStorage.getItem('humanius_demo_gorev_tanimlari');
      if (!records) {
        const initial: GorevTanimi[] = [
          {
            id: 'g-1',
            company_id: 'demo-company-id-9999',
            employee_id: 'emp-2',
            employee_name: 'Ahmet Yılmaz',
            gorev_adi: 'Yazılım Geliştirici Görev Tanımı',
            gorev_aciklama: 'Şirketin web ve mobil projelerinin geliştirilmesi ve bakımı.',
            sorumluluklar: ['Kullanıcı arayüzlerinin geliştirilmesi', 'API entegrasyonlarının yapılması', 'Veritabanı optimizasyonu'],
            yetki_ve_sorumluluklar: ['Geliştirme dalları oluşturmak', 'Kodu test ortamına yüklemek'],
            calismalar: ['Geliştirme', 'Hata Ayıklama', 'Kod Gözden Geçirme'],
            performans_kriterleri: ['Zamanında kod teslimatı', 'Düşük hata oranı'],
            bagli_oldugu_pozisyon: 'Yazılım Müdürü',
            is_birimi: 'Teknoloji',
            onay_durumu: 'onaylandi',
            onay_tarihi: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('humanius_demo_gorev_tanimlari', JSON.stringify(initial));
        return initial;
      }
      const list: GorevTanimi[] = JSON.parse(records);
      if (companyId) {
        return list.filter(g => g.company_id === companyId);
      }
      return list;
    }
    let query = supabase
      .from('gorev_tanimlari')
      .select('*')
      .order('created_at', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  async getGorevTanimiByEmployeeId(employeeId: string) {
    if (demoService.isDemoActive()) {
      const list = await this.getGorevTanimlari();
      return list.find((g: GorevTanimi) => g.employee_id === employeeId) || null;
    }
    const { data, error } = await supabase
      .from('gorev_tanimlari')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getGorevTanimiById(id: string) {
    if (demoService.isDemoActive()) {
      const list = await this.getGorevTanimlari('demo-company-id-9999');
      return list.find(g => g.id === id) || null;
    }
    const { data, error } = await supabase
      .from('gorev_tanimlari')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async updateGorevTanimi(id: string, updates: Partial<GorevTanimi>) {
    if (demoService.isDemoActive()) {
      const list = await this.getGorevTanimlari('demo-company-id-9999');
      const idx = list.findIndex(g => g.id === id);
      if (idx === -1) throw new Error('Görev tanımı bulunamadı');
      list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
      localStorage.setItem('humanius_demo_gorev_tanimlari', JSON.stringify(list));
      return list[idx];
    }
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
    if (demoService.isDemoActive()) {
      const approvals = JSON.parse(localStorage.getItem('humanius_demo_gorev_approvals') || '[]');
      const newApp = {
        ...approval,
        id: 'app-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      };
      approvals.push(newApp);
      localStorage.setItem('humanius_demo_gorev_approvals', JSON.stringify(approvals));

      await this.updateGorevTanimi(approval.gorev_tanimi_id, {
        onay_durumu: approval.approval_status === 'onaylandi' ? 'onaylandi' : 'reddedildi',
        onay_tarihi: new Date().toISOString()
      });

      return newApp;
    }
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
    if (demoService.isDemoActive()) {
      const approvals = JSON.parse(localStorage.getItem('humanius_demo_gorev_approvals') || '[]');
      return approvals.filter((a: any) => a.gorev_tanimi_id === gorevTanimiId);
    }
    const { data, error } = await supabase
      .from('gorev_tanimi_approvals')
      .select('*')
      .eq('gorev_tanimi_id', gorevTanimiId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  },

  async setEmployeePasscode(employeeId: string, passcodeHash: string) {
    if (demoService.isDemoActive()) {
      return demoService.updateEmployee(employeeId, { approval_passcode: passcodeHash } as any) as any;
    }
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
  }
};
