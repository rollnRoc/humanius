import type { View } from '../types';

export type RawProfileRole = 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user' | null | undefined;

export type AppRole = 'superadmin' | 'admin' | 'hr' | 'manager' | 'employee' | 'user';

export function normalizeRole(role: RawProfileRole): AppRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'admin') return 'admin';
  if (role === 'hr') return 'hr';
  if (role === 'manager') return 'manager';
  if (role === 'employee') return 'employee';
  return 'admin';
}

export function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'superadmin': return 'Süper Yönetici';
    case 'admin':      return 'Şirket Yöneticisi';
    case 'hr':         return 'İK Uzmanı';
    case 'manager':    return 'Birim / Departman Amiri';
    case 'employee':   return 'Personel';
    default:           return 'Şirket Yöneticisi';
  }
}

export function getDefaultViewForRole(role: AppRole): View {
  return 'arama';
}

// ─── Kurumsal Erişim Matrisi ──────────────────────────────────────────────────
const ALLOWED_VIEWS: Record<AppRole, View[]> = {
  superadmin: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'ayar', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'offboarding',
  ],
  admin: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'ayar', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'offboarding',
  ],
  hr: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'offboarding',
  ],
  manager: [
    'arama', 'personel', 'izin', 'izin-cakisma', 'izin-listesi', 'uyari', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'is-akisi', 'performans', 'egitim', 'org-sema', 'zimmet', 'okr', 'yetkinlik',
    'kullanim-kilavuzu', 'is-akisi-menu', 'sifre-degistir',
  ],
  // PERSONEL: Sadece tamamen kendisine ait kişisel bilgiler & kendi talepleri
  employee: [
    'ozluk-dosyasi', 'bordro', 'izin', 'uyari', 'pdks', 'pdks-devam', 'performans',
    'egitim', 'zimmet', 'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'is-akisi-menu',
    'sifre-degistir',
  ],
  user: [
    'ozluk-dosyasi', 'bordro', 'izin', 'uyari', 'pdks', 'pdks-devam', 'performans',
    'egitim', 'zimmet', 'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'is-akisi-menu',
    'sifre-degistir',
  ],
};

export function canAccessView(role: AppRole, view: View): boolean {
  return ALLOWED_VIEWS[role]?.includes(view) ?? false;
}

// ─── Yetki Fonksiyonları ─────────────────────────────────────────────────────

// Kullanıcı yönetimi ekranını görüntüleme & kullanıcı ekleme yetkisi
export function canManageUsers(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}

// Kullanıcı veya personel kartı silme yetkisi (Süper Admin, Admin & İK Uzmanı)
export function canDeleteUsers(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}

// Başka kullanıcılara rol ve yetki seviyesi atama yetkisi (Sadece Admin & Süper Admin)
export function canAssignUserRoles(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

// Şirket sistem ayarlarını (ayar ekranı) değiştirme yetkisi (Sadece Admin & Süper Admin)
export function canManageCompanySettings(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin';
}

// Maaş ve Şirket Bordro toplamlarını görme yetkisi (Birim amiri ve çalışan göremez)
export function canViewSalariesAndBordro(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}

export function canCreateCompany(role: AppRole): boolean {
  return role === 'superadmin';
}

// İdari ve İK yönetim rolleri
export function isManagementRole(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}