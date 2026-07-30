import { supabase } from '../lib/supabase';
import { demoService } from './demoService';

export interface OzlukDosya {
  id: string;
  employee_id: string;
  company_id: string;
  kategori: string;
  dosya_adi: string | null;
  dosya_yolu: string | null;
  notlar: string | null;
  created_at: string;
}

const MAX_FILE_MB = 4;

function isValidUuid(id: string): boolean {
  return Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export const ozlukDosyasiService = {
  async getDosyalar(employeeId: string): Promise<OzlukDosya[]> {
    if (demoService.isDemoActive() || !isValidUuid(employeeId)) {
      const saved = localStorage.getItem(`humanius_ozluk_dosyalari_${employeeId}`);
      return saved ? JSON.parse(saved) : [];
    }

    try {
      const { data, error } = await supabase
        .from('ozluk_dosyalari')
        .select('*')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('ozluk_dosyalari query warning:', error);
        return [];
      }
      return (data ?? []) as OzlukDosya[];
    } catch (_err) {
      return [];
    }
  },

  async uploadDosya(
    companyId: string,
    employeeId: string,
    kategori: string,
    file: File,
    notlar?: string
  ): Promise<OzlukDosya> {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      throw new Error(`Dosya boyutu ${MAX_FILE_MB} MB'ı geçemez.`);
    }

    const base64 = await fileToBase64(file);

    if (demoService.isDemoActive() || !isValidUuid(employeeId) || !isValidUuid(companyId)) {
      const newRec: OzlukDosya = {
        id: 'dosya-' + Math.random().toString(36).substr(2, 9),
        employee_id: employeeId,
        company_id: companyId,
        kategori,
        dosya_adi: file.name,
        dosya_yolu: base64,
        notlar: notlar ?? null,
        created_at: new Date().toISOString(),
      };
      const existing = await this.getDosyalar(employeeId);
      const updated = [newRec, ...existing];
      localStorage.setItem(`humanius_ozluk_dosyalari_${employeeId}`, JSON.stringify(updated));
      return newRec;
    }

    const { data, error } = await supabase
      .from('ozluk_dosyalari')
      .insert({
        employee_id: employeeId,
        company_id: companyId,
        kategori,
        dosya_adi: file.name,
        dosya_yolu: base64,
        notlar: notlar ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as OzlukDosya;
  },

  async saveYaziKaydi(
    companyId: string,
    employeeId: string,
    kategori: string,
    notlar: string
  ): Promise<OzlukDosya> {
    if (demoService.isDemoActive() || !isValidUuid(employeeId) || !isValidUuid(companyId)) {
      const newRec: OzlukDosya = {
        id: 'dosya-' + Math.random().toString(36).substr(2, 9),
        employee_id: employeeId,
        company_id: companyId,
        kategori,
        dosya_adi: null,
        dosya_yolu: null,
        notlar,
        created_at: new Date().toISOString(),
      };
      const existing = await this.getDosyalar(employeeId);
      const updated = [newRec, ...existing];
      localStorage.setItem(`humanius_ozluk_dosyalari_${employeeId}`, JSON.stringify(updated));
      return newRec;
    }

    const { data, error } = await supabase
      .from('ozluk_dosyalari')
      .insert({
        employee_id: employeeId,
        company_id: companyId,
        kategori,
        dosya_adi: null,
        dosya_yolu: null,
        notlar,
      })
      .select()
      .single();
    if (error) throw error;
    return data as OzlukDosya;
  },

  async deleteDosya(id: string, _dosyaYolu: string | null, employeeId?: string): Promise<void> {
    if (employeeId && (demoService.isDemoActive() || !isValidUuid(id))) {
      const existing = await this.getDosyalar(employeeId);
      const updated = existing.filter(d => d.id !== id);
      localStorage.setItem(`humanius_ozluk_dosyalari_${employeeId}`, JSON.stringify(updated));
      return;
    }
    const { error } = await supabase
      .from('ozluk_dosyalari')
      .delete()
      .eq('id', id);
    if (error) console.warn('Delete dosya warning:', error);
  },

  async getSignedUrl(dosyaYolu: string): Promise<string> {
    return dosyaYolu;
  },
};
