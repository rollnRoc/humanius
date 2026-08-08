// ─── Navigation ─────────────────────────────────────────────────────────────

export type View =
  | 'chat'
  | 'kullanicilar'
  | 'personel'
  | 'bordro'
  | 'izin'
  | 'raporlar'
  | 'uyari'
  | 'ayar'
  | 'gorev-tanimi'
  | 'gorev-tanimi-kayitlari'
  | 'ozluk-dosyasi'
  | 'arama'
  | 'kullanim-kilavuzu'
  | 'pdks'
  | 'performans'
  | 'egitim'
  | 'analitik'
  | 'kvkk'
  | 'izin-tanimlari'
  | 'org-sema'
  | 'zimmet'
  | 'okr'
  | 'yetkinlik'
  | 'onboarding'
  | 'yan-haklar'
  | 'izin-cakisma'
  | 'form-builder'
  | 'bordro-icmal'
  | 'pdks-devam'
  | 'is-akisi'
  | 'egitim-girisi'
  | 'izin-listesi'
  | 'is-akisi-menu'
  | 'sifre-degistir'
  | 'offboarding'
  | 'tazminat-hesaplama';

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Employee {
  id: string;
  company_id?: string;
  name: string;
  tc_no?: string;
  sicil_no?: string;
  company: string;
  department: string;
  position: string;
  level: string;
  salary: number;
  status: 'active' | 'onLeave' | 'inactive';
  phone: string;
  email: string;
  contact_email?: string;
  personal_email?: string;
  joinDate?: string;
  join_date?: string;
  address: string;
  avatar_url?: string | null;
  skills: string[];
  medeni_durum?: 'bekar' | 'evli';
  cocuk_sayisi?: number;
  engelli_durumu?: 'yok' | 'birinci' | 'ikinci' | 'ucuncu';
  employeeType?: 'normal' | 'emekli';
  employee_type?: 'normal' | 'emekli';
  role?: string;
  approval_passcode?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Company = string;
export type Department = string;

export interface Stats {
  active: number;
  onLeave: number;
  inactive: number;
}
