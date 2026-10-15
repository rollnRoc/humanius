import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';
import { demoService } from './demoService';
import { calculateWorkingDays, calculateCompletedYears, calculateYillikIzinHakki } from '../utils/izinCalculations';

function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

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

    let currentToplam = existing?.toplam_hak;
    if (currentToplam == null) {
      const { data: emp } = await supabase
        .from('employees')
        .select('hire_date')
        .eq('id', params.employeeId)
        .maybeSingle();
      currentToplam = emp?.hire_date ? await this.calculateIzinHakki(emp.hire_date) : 0;
    }
    let currentMazeret = existing?.mazeret_izin ?? 5;
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
    const calismaYili = calculateCompletedYears(iseGirisTarihi);
    return calculateYillikIzinHakki(calismaYili);
  },

  /**
   * Personelin yıllık izin bakiyesini (kullanılan ve kalan izin)
   * bu yıldaki onaylı yıllık izin taleplerine göre otomatik olarak yeniden hesaplar ve Supabase'e yazar.
   */
  async recalculateEmployeeAnnualLeave(
    employeeId: string,
    companyId?: string,
    yil?: number
  ): Promise<{ toplamHak: number; kullanilanIzin: number; kalanIzin: number }> {
    const currentYear = yil || new Date().getFullYear();

    if (demoService.isDemoActive()) {
      const talepler = demoService.getIzinTalepleri();
      const approvedAnnualDays = talepler.reduce((sum, t) => {
        const emp = t.employeeId || (t as any).employee_id;
        if (emp !== employeeId) return sum;
        const dur = String(t.durum || '').toLowerCase();
        const isApp = ['onaylandi', 'onaylandı', 'ik onayladı', 'yönetici onayladı'].includes(dur);
        const isYil = ['yillik', 'yıllık', 'yi'].includes(String(t.izinTuru || (t as any).izin_turu || '').toLowerCase());
        return isApp && isYil ? sum + Number(t.gunSayisi || (t as any).gun_sayisi || 0) : sum;
      }, 0);

      const haklar = demoService.getIzinHaklari(currentYear);
      const hak = haklar.find((h) => h.employee_id === employeeId);
      const empMatch = demoService.getEmployees().find((e) => e.id === employeeId);
      const defaultHak = empMatch?.join_date ? calculateYillikIzinHakki(calculateCompletedYears(empMatch.join_date)) : 0;
      const toplam = hak?.toplam_hak != null ? hak.toplam_hak : defaultHak;
      const kalan = Math.max(0, toplam - approvedAnnualDays);
      if (hak) {
        hak.kullanilan_izin = approvedAnnualDays;
        hak.kalan_izin = kalan;
        demoService.saveIzinHaklari(haklar);
      }
      window.dispatchEvent(
        new CustomEvent('humanius_izin_updated', {
          detail: { employeeId, kullanilanIzin: approvedAnnualDays, kalanIzin: kalan, toplamHak: toplam },
        })
      );
      return { toplamHak: toplam, kullanilanIzin: approvedAnnualDays, kalanIzin: kalan };
    }

    // 1. Personelin bu yıldaki onaylı yıllık izin taleplerini topla
    const { data: talepler, error: tErr } = await supabase
      .from('izin_talepleri')
      .select('*')
      .eq('employee_id', employeeId);

    if (tErr) console.warn('recalculateEmployeeAnnualLeave talepler hatası:', tErr);

    let totalUsedDays = 0;
    (talepler || []).forEach((t: any) => {
      const dur = String(t.durum || '').toLowerCase();
      const isApproved = ['onaylandi', 'onaylandı', 'ik onayladı', 'yönetici onayladı'].includes(dur);
      const isYillik = ['yillik', 'yıllık', 'yi'].includes(String(t.izin_turu || '').toLowerCase());
      if (isApproved && isYillik) {
        const startStr = String(t.baslangic_tarihi || '');
        if (!startStr || startStr.startsWith(String(currentYear))) {
          totalUsedDays += Number(t.gun_sayisi || 0);
        }
      }
    });

    // 2. Personelin bu yıldaki izin_haklari kaydını getir
    const { data: existingHak, error: hErr } = await supabase
      .from('izin_haklari')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('yil', currentYear)
      .maybeSingle();

    if (hErr) console.warn('recalculateEmployeeAnnualLeave hak hatası:', hErr);

    let toplamHak = existingHak?.toplam_hak;
    let targetCompanyId = companyId || existingHak?.company_id;

    if (toplamHak == null) {
      const { data: emp } = await supabase
        .from('employees')
        .select('hire_date, company_id')
        .eq('id', employeeId)
        .maybeSingle();

      if (emp?.hire_date) {
        toplamHak = await this.calculateIzinHakki(emp.hire_date);
      } else {
        toplamHak = 0;
      }
      if (!targetCompanyId && emp?.company_id) {
        targetCompanyId = emp.company_id;
      }
    }

    const kalanIzin = Math.max(0, Number(toplamHak) - totalUsedDays);

    if (existingHak?.id) {
      await supabase
        .from('izin_haklari')
        .update({
          kullanilan_izin: totalUsedDays,
          kalan_izin: kalanIzin,
          hesaplama_tarihi: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingHak.id);
    } else if (targetCompanyId) {
      await supabase.from('izin_haklari').insert({
        company_id: targetCompanyId,
        employee_id: employeeId,
        yil: currentYear,
        toplam_hak: toplamHak,
        kullanilan_izin: totalUsedDays,
        kalan_izin: kalanIzin,
        hesaplama_tarihi: new Date().toISOString(),
      });
    }

    window.dispatchEvent(
      new CustomEvent('humanius_izin_updated', {
        detail: { employeeId, kullanilanIzin: totalUsedDays, kalanIzin, toplamHak },
      })
    );

    return { toplamHak: Number(toplamHak), kullanilanIzin: totalUsedDays, kalanIzin };
  },

  /**
   * Belirli bir tarihteki onaylı izin talebini bulup kaldırır veya böler:
   * - Tek günlük ise: Kaydı tamamen siler.
   * - Başlangıç günü ise: Başlangıç tarihini 1 gün ilerletir, süreyi 1 azaltır.
   * - Bitiş günü ise: Bitiş tarihini 1 gün geri çeker, süreyi 1 azaltır.
   * - İznin ortasındaysa: İzni iki ayrı parçaya böler (öncesi ve sonrası).
   * Yıllık izin ise personelin bakiyesini anında yeniden hesaplar.
   */
  async removeOrSplitLeaveDate(
    employeeId: string,
    targetDate: string,
    companyId?: string
  ): Promise<{ wasRemoved: boolean; leaveType?: string }> {
    if (demoService.isDemoActive()) {
      const talepler = demoService.getIzinTalepleri();
      const matched = talepler.find((t) => {
        const emp = t.employeeId || (t as any).employee_id;
        if (emp !== employeeId) return false;
        const dur = String(t.durum || '').toLowerCase();
        if (!['onaylandi', 'onaylandı', 'ik onayladı', 'yönetici onayladı'].includes(dur)) return false;
        const s = (t.baslangicTarihi || (t as any).baslangic_tarihi || '').split('T')[0];
        const e = (t.bitisTarihi || (t as any).bitis_tarihi || '').split('T')[0];
        return s && e && targetDate >= s && targetDate <= e;
      });
      if (matched) {
        demoService.saveIzinTalepleri(talepler.filter((t) => t.id !== matched.id));
        return { wasRemoved: true, leaveType: matched.izinTuru };
      }
      return { wasRemoved: false };
    }

    const { data: talepler, error } = await supabase
      .from('izin_talepleri')
      .select('*')
      .eq('employee_id', employeeId);

    if (error || !talepler || talepler.length === 0) {
      return { wasRemoved: false };
    }

    const matchedTalep = talepler.find((t) => {
      const dur = String(t.durum || '').toLowerCase();
      if (!['onaylandi', 'onaylandı', 'ik onayladı', 'yönetici onayladı'].includes(dur)) return false;
      const s = String(t.baslangic_tarihi || '').split('T')[0];
      const e = String(t.bitis_tarihi || '').split('T')[0];
      return s && e && targetDate >= s && targetDate <= e;
    });

    if (!matchedTalep) {
      return { wasRemoved: false };
    }

    const s = String(matchedTalep.baslangic_tarihi).split('T')[0];
    const e = String(matchedTalep.bitis_tarihi).split('T')[0];
    const leaveType = matchedTalep.izin_turu;
    const origDays = Number(matchedTalep.gun_sayisi || 1);

    if (s === e || origDays <= 1) {
      // Tek günlük izin -> Talebi sil
      await supabase.from('izin_talepleri').delete().eq('id', matchedTalep.id);
    } else if (targetDate === s) {
      // İznin ilk günü kaldırıldı -> Başlangıcı 1 gün ilerlet
      const nextDay = addDaysToDateStr(targetDate, 1);
      const newDays = Math.max(1, origDays - 1);
      if (nextDay > e) {
        await supabase.from('izin_talepleri').delete().eq('id', matchedTalep.id);
      } else {
        await supabase
          .from('izin_talepleri')
          .update({
            baslangic_tarihi: nextDay,
            gun_sayisi: newDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchedTalep.id);
      }
    } else if (targetDate === e) {
      // İznin son günü kaldırıldı -> Bitişi 1 gün geri çek
      const prevDay = addDaysToDateStr(targetDate, -1);
      const newDays = Math.max(1, origDays - 1);
      if (s > prevDay) {
        await supabase.from('izin_talepleri').delete().eq('id', matchedTalep.id);
      } else {
        await supabase
          .from('izin_talepleri')
          .update({
            bitis_tarihi: prevDay,
            gun_sayisi: newDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchedTalep.id);
      }
    } else {
      // İznin ortasındaki gün kaldırıldı -> İkiye böl
      const prevDay = addDaysToDateStr(targetDate, -1);
      const nextDay = addDaysToDateStr(targetDate, 1);

      const part1Days = Math.max(1, calculateWorkingDays(s, prevDay, companyId));
      const part2Days = Math.max(1, origDays - 1 - part1Days);

      if (s <= prevDay) {
        await supabase
          .from('izin_talepleri')
          .update({
            bitis_tarihi: prevDay,
            gun_sayisi: part1Days,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matchedTalep.id);
      } else {
        await supabase.from('izin_talepleri').delete().eq('id', matchedTalep.id);
      }

      if (nextDay <= e) {
        await supabase.from('izin_talepleri').insert({
          company_id: matchedTalep.company_id || companyId,
          employee_id: employeeId,
          izin_turu: matchedTalep.izin_turu,
          baslangic_tarihi: nextDay,
          bitis_tarihi: e,
          gun_sayisi: part2Days,
          aciklama: matchedTalep.aciklama,
          durum: matchedTalep.durum,
          onaylayan_id: matchedTalep.onaylayan_id,
          onay_tarihi: matchedTalep.onay_tarihi,
          talep_tarihi: matchedTalep.talep_tarihi,
        });
      }
    }

    const isYillik = ['yillik', 'yıllık', 'yi'].includes(String(leaveType || '').toLowerCase());
    if (isYillik) {
      await this.recalculateEmployeeAnnualLeave(employeeId, companyId || matchedTalep.company_id);
    }

    return { wasRemoved: true, leaveType };
  },

  /**
   * Puantaj cetvelinden 1 günlük onaylı izin ekler (veya mevcut izni günceller).
   * Yıllık izin ise personelin bakiyesini otomatik olarak düşer.
   */
  async addApprovedLeaveFromPuantaj(params: {
    employeeId: string;
    companyId?: string;
    date: string;
    leaveType: string;
    aciklama?: string;
  }) {
    const { employeeId, companyId, date, leaveType, aciklama } = params;

    // Önce o günde çakışan başka izin talebi varsa temizle/böl
    await this.removeOrSplitLeaveDate(employeeId, date, companyId);

    const { data, error } = await supabase
      .from('izin_talepleri')
      .insert({
        company_id: companyId,
        employee_id: employeeId,
        izin_turu: leaveType,
        baslangic_tarihi: date,
        bitis_tarihi: date,
        gun_sayisi: 1,
        aciklama: aciklama || 'Puantaj Cetveli Girişi',
        durum: 'onaylandi',
        talep_tarihi: date,
      })
      .select()
      .single();

    if (error) {
      console.warn('addApprovedLeaveFromPuantaj error:', error);
    }

    if (['yillik', 'yıllık', 'yi'].includes(leaveType.toLowerCase())) {
      await this.recalculateEmployeeAnnualLeave(employeeId, companyId);
    }

    window.dispatchEvent(new CustomEvent('humanius_izin_updated', { detail: { employeeId } }));
    return data;
  },
};
