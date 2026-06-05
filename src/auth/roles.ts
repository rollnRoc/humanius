import type { View } from '../types';

export type RawProfileRole = 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user' | null | undefined;
// Artık gerçek rolleri koruyoruz (daraltma yok). 'user' ve 'employee' eşdeğer davranır.
export type AppRole = 'superadmin' | 'admin' | 'hr' | 'manager' | 'employee' | 'user';

export function normalizeRole(role: RawProfileRole): AppRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'admin') return 'admin';
  if (role === 'hr') return 'hr';
  if (role === 'manager') return 'manager';
  if (role === 'employee') return 'employee';
  return 'user';
}

export function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'superadmin': return 'Süper Yönetici';
    case 'admin':      return 'Şirket Yöneticisi';
    case 'hr':         return 'İK Uzmanı';
    case 'manager':    return 'Müdür';
    case 'employee':   return 'Personel';
    default:           return 'Kullanıcı';
  }
}

export function getDefaultViewForRole(role: AppRole): View {
  if (role === 'superadmin' || role === 'admin' || role === 'hr') return 'personel';
  if (role === 'manager') return 'personel';
  return 'arama';
}

// ─── Erişim Matrisi ──────────────────────────────────────────────────────────
// Her rol için görünür ekranlar. Backend RLS ile hizalıdır.
const ALLOWED_VIEWS: Record<AppRole, View[]> = {
  superadmin: [
    'arama', 'personel', 'bordro', 'bordro-onay', 'izin', 'izin-tanimlari', 'izin-cakisma',
    'raporlar', 'analitik', 'uyari', 'ayar', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'performans', 'ise-alim', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'onboarding', 'yan-haklar', 'form-builder', 'kullanim-kilavuzu',
  ],
  admin: [
    'arama', 'personel', 'bordro', 'bordro-onay', 'izin', 'izin-tanimlari', 'izin-cakisma',
    'raporlar', 'analitik', 'uyari', 'ayar', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'performans', 'ise-alim', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'onboarding', 'yan-haklar', 'form-builder', 'kullanim-kilavuzu',
  ],
  hr: [
    'arama', 'personel', 'bordro', 'bordro-onay', 'izin', 'izin-tanimlari', 'izin-cakisma',
    'raporlar', 'analitik', 'uyari', 'ayar', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'performans', 'ise-alim', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'onboarding', 'yan-haklar', 'kullanim-kilavuzu',
  ],
  manager: [
    'arama', 'personel', 'izin', 'izin-cakisma', 'uyari', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'pdks', 'performans', 'egitim', 'org-sema', 'zimmet', 'okr', 'yetkinlik', 'onboarding',
    'kullanim-kilavuzu',
  ],
  employee: [
    'arama', 'bordro', 'izin', 'uyari', 'gorev-tanimi', 'ozluk-dosyasi', 'pdks', 'performans',
    'egitim', 'org-sema', 'zimmet', 'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu',
  ],
  user: [
    'arama', 'bordro', 'izin', 'uyari', 'gorev-tanimi', 'ozluk-dosyasi', 'pdks', 'performans',
    'egitim', 'org-sema', 'zimmet', 'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu',
  ],
};

export function canAccessView(role: AppRole, view: View): boolean {
  return ALLOWED_VIEWS[role]?.includes(view) ?? false;
}

// ─── Yetki yardımcıları ──────────────────────────────────────────────────────
export function canManageUsers(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}

export function canCreateCompany(role: AppRole): boolean {
  return role === 'superadmin';
}

// admin paneli / yönetim ekranlarına erişebilen roller (admin + üstü + hr)
export function isManagementRole(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}