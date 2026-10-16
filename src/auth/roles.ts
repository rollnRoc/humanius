import type { View } from '../types';

export type RawProfileRole = 'superadmin' | 'admin' | 'manager' | 'employee' | 'hr' | 'user' | null | undefined;

export type AppRole = 'superadmin' | 'admin' | 'hr' | 'manager' | 'employee' | 'user';

export function normalizeRole(role: RawProfileRole): AppRole {
  if (role === 'superadmin') return 'superadmin';
  if (role === 'admin') return 'admin';
  if (role === 'hr') return 'hr';
  if (role === 'manager') return 'manager';
  if (role === 'employee') return 'employee';
  if (role === 'user') return 'employee';
  return 'employee';
}

export function getRoleLabel(role: AppRole): string {
  switch (role) {
    case 'superadmin': return 'Süper Yönetici';
    case 'admin':      return 'Şirket Yöneticisi';
    case 'hr':         return 'İK Uzmanı';
    case 'manager':    return 'Birim / Departman Amiri';
    case 'employee':   return 'Personel';
    default:           return 'Personel';
  }
}

export function getDefaultViewForRole(role: AppRole): View {
  if (role === 'employee' || role === 'user') {
    return 'arama';
  }
  return 'arama';
}

// ─── Kurumsal Erişim Matrisi ──────────────────────────────────────────────────
const ALLOWED_VIEWS: Record<AppRole, View[]> = {
  superadmin: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'ayar', 'sirket-bilgileri', 'kullanicilar', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'vardiya-sms', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'tazminat-hesaplama', 'form-builder', 'puantaj', 'analiz', 'sirket-yonetimi',
  ],
  admin: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'ayar', 'sirket-bilgileri', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'vardiya-sms', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'tazminat-hesaplama', 'form-builder', 'puantaj', 'analiz', 'sirket-yonetimi',
  ],
  hr: [
    'arama', 'personel', 'bordro', 'izin', 'izin-tanimlari', 'izin-cakisma', 'izin-listesi',
    'raporlar', 'analitik', 'uyari', 'ayar', 'sirket-bilgileri', 'gorev-tanimi', 'gorev-tanimi-kayitlari',
    'ozluk-dosyasi', 'pdks', 'pdks-devam', 'vardiya-sms', 'is-akisi', 'performans', 'egitim', 'kvkk', 'org-sema', 'zimmet',
    'okr', 'yetkinlik', 'yan-haklar', 'kullanim-kilavuzu', 'bordro-icmal', 'is-akisi-menu',
    'sifre-degistir', 'tazminat-hesaplama', 'form-builder', 'puantaj', 'analiz', 'sirket-yonetimi',
  ],
  // BİRİM / DEPARTMAN AMİRİ:
  // - Şirket Yönetimi: Tamamen kapalı
  // - Personel Yönetimi: Personel listesi, özlük ve eğitim açık (Görev Tanımı kapalı)
  // - Bordro ve İcmal: Tamamen kapalı
  // - İzin Yönetimi: Yalnızca İzin Talepleri açık
  // - Puantaj ve PDKS: Açık
  // - Analiz: Tamamen kapalı
  manager: [
    'arama',
    'personel',
    'ozluk-dosyasi',
    'egitim',
    'izin',
    'is-akisi-menu',
    'puantaj',
    'pdks-devam',
    'pdks',
    'vardiya-sms',
    'is-akisi',
    'sifre-degistir',
    'kullanim-kilavuzu',
  ],
  // PERSONEL: Sadece tamamen kendisine ait kişisel bilgiler & kendi talepleri
  employee: [
    'arama',
    'personel',
    'ozluk-dosyasi',
    'bordro',
    'izin',
    'is-akisi-menu',
    'puantaj',
    'pdks-devam',
    'egitim',
    'zimmet',
    'sifre-degistir',
    'kullanim-kilavuzu',
  ],
  user: [
    'arama',
    'personel',
    'ozluk-dosyasi',
    'bordro',
    'izin',
    'is-akisi-menu',
    'puantaj',
    'pdks-devam',
    'egitim',
    'zimmet',
    'sifre-degistir',
    'kullanim-kilavuzu',
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

// İzin onaylama ve reddetme yetkisi (Sadece Süper Admin, Şirket Yöneticisi ve İK Uzmanı; Birim amirleri/müdürler onaylayamaz)
export function canApproveLeave(role: AppRole): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'hr';
}