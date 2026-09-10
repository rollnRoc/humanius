import { IzinTuru } from '../types/izin';
import { Employee } from '../types';

// ─── Label maps ──────────────────────────────────────────────────────────────

export const izinTuruLabels: Record<IzinTuru, string> = {
  yillik: 'Yıllık İzin',
  mazeret: 'Mazeret İzni',
  hastalik: 'Hastalık İzni',
  dogum: 'Doğum İzni',
  babalik: 'Babalık İzni',
  evlilik: 'Evlilik İzni',
  olum: 'Ölüm İzni',
  askerlik: 'Askerlik İzni',
  ucretsiz: 'Ücretsiz İzin',
};

export const izinDurumLabels: Record<string, string> = {
  beklemede: 'Beklemede',
  onaylandi: 'Onaylandı',
  reddedildi: 'Reddedildi',
  iptal: 'İptal',
};

export interface DynamicIzinTuru {
  id: string;
  ad: string;
  kod: string;
  renk?: string;
  ucretli?: boolean;
  maksBekleme?: number;
  kademe?: { yilAlt: number; yilUst: number | null; gunHak: number }[];
  aciklama?: string;
}

export function getCompanyIzinTurleri(companyId?: string): DynamicIzinTuru[] {
  const allFound: DynamicIzinTuru[] = [];
  try {
    if (companyId && companyId !== 'default') {
      const saved = localStorage.getItem(`humanius_izin_turleri_${companyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
    const savedDef = localStorage.getItem('humanius_izin_turleri_default');
    if (savedDef) {
      const parsed = JSON.parse(savedDef);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('humanius_izin_turleri_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list.forEach((item: DynamicIzinTuru) => {
                  if (item && item.id && !allFound.some((x) => x.id === item.id)) {
                    allFound.push(item);
                  }
                });
              }
            } catch {}
          }
        }
      }
    }
  } catch (e) {}

  if (allFound.length > 0) return allFound;

  return [
    { id: 'yillik', ad: 'Yıllık İzin', kod: 'YI', ucretli: true },
    { id: 'mazeret', ad: 'Mazeret İzni', kod: 'MZ', ucretli: true },
    { id: 'hastalik', ad: 'Hastalık İzni', kod: 'HA', ucretli: true },
    { id: 'dogum', ad: 'Doğum İzni (Analık İzni)', kod: 'DO', ucretli: false },
    { id: 'babalik', ad: 'Babalık İzni', kod: 'BA', ucretli: true },
    { id: 'evlilik', ad: 'Evlilik İzni', kod: 'EV', ucretli: true },
    { id: 'olum', ad: 'Ölüm İzni', kod: 'OL', ucretli: true },
    { id: 'ucretsiz', ad: 'Ücretsiz İzin', kod: 'UC', ucretli: false },
  ];
}

export function getCompanyIzinTuruLabels(companyId?: string): Record<string, string> {
  const turler = getCompanyIzinTurleri(companyId);
  const labels: Record<string, string> = { ...izinTuruLabels };
  turler.forEach((t) => {
    labels[t.id] = t.ad;
  });
  return labels;
}

/**
 * Format any leave type slug or code into a beautiful, professional Turkish title
 * e.g., 'ucretsiz' -> 'Ücretsiz İzin', 'ornek-izin' -> 'Örnek İzin'
 */
export function formatIzinTuru(tur: string | undefined | null, companyId?: string): string {
  if (!tur) return 'İzin';
  const clean = String(tur).trim();
  const lower = clean.toLowerCase();

  // 1. FIRST check dynamic company leave types (Custom company leave types take top priority!)
  try {
    const companyTurler = getCompanyIzinTurleri(companyId);
    const found = companyTurler.find(
      (t) =>
        t.id === clean ||
        t.id.toLowerCase() === lower ||
        (t.kod && t.kod.toLowerCase() === lower) ||
        (t.ad && t.ad.toLowerCase() === lower)
    );
    if (found && found.ad) {
      return found.ad;
    }
  } catch {}

  // 2. Check canonical standard map
  const canonicalMap: Record<string, string> = {
    yillik: 'Yıllık İzin',
    yıllık: 'Yıllık İzin',
    'yillik izin': 'Yıllık İzin',
    'yıllık izin': 'Yıllık İzin',
    ucretsiz: 'Ücretsiz İzin',
    ücretsiz: 'Ücretsiz İzin',
    'ucretsiz izin': 'Ücretsiz İzin',
    'ücretsiz izin': 'Ücretsiz İzin',
    mazeret: 'Mazeret İzni',
    'mazeret izni': 'Mazeret İzni',
    hastalik: 'Hastalık İzni',
    hastalık: 'Hastalık İzni',
    'hastalik izni': 'Hastalık İzni',
    'hastalık izni': 'Hastalık İzni',
    dogum: 'Doğum İzni',
    doğum: 'Doğum İzni',
    'dogum izni': 'Doğum İzni',
    babalik: 'Babalık İzni',
    babalık: 'Babalık İzni',
    evlilik: 'Evlilik İzni',
    'evlilik izni': 'Evlilik İzni',
    olum: 'Ölüm İzni',
    ölüm: 'Ölüm İzni',
    askerlik: 'Askerlik İzni',
    'askerlik izni': 'Askerlik İzni',
    yol: 'Yol İzni',
    'yol izni': 'Yol İzni',
    rapor: 'Raporlu İzin',
    raporlu: 'Raporlu İzin',
    'raporlu izin': 'Raporlu İzin',
  };

  if (canonicalMap[lower]) {
    return canonicalMap[lower];
  }

  let formatted = clean;
  if (/(\s+)?(izni|izin|İzni|İzin)$/i.test(formatted)) {
    formatted = formatted.replace(/(\s+)?(izni|izin|İzni|İzin)$/i, '');
  }

  const titleCased = formatted
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => {
      const first = word.charAt(0).toLocaleUpperCase('tr-TR');
      const rest = word.slice(1).toLocaleLowerCase('tr-TR');
      return first + rest;
    })
    .join(' ');

  if (!titleCased) return 'İzin';
  if (titleCased.toLowerCase().endsWith('izin') || titleCased.toLowerCase().endsWith('izni')) {
    return titleCased;
  }
  return `${titleCased} İzni`;
}

/**
 * Devam Kontrolü (PDKS) ekranında personelin hangi izinde olduğunu açık ve net
 * şekilde ifade eden durum metnini üretir.
 * Örn: 'Yıllık İzin', 'Raporlu', 'Ücretsiz İzin', 'Eğitim İzni', 'Babalık İzni' vb.
 */
export function getDevamKontroluIzinLabel(tur: string | undefined | null, companyId?: string): string {
  if (!tur) return 'İzinli';
  const clean = String(tur).trim();
  const lower = clean.toLowerCase();

  // 1. Şirkete ait dinamik izin tanımlarını kontrol et (Özel izinler öncelikli)
  try {
    const companyTurler = getCompanyIzinTurleri(companyId);
    const found = companyTurler.find(
      (t) =>
        t.id === clean ||
        t.id.toLowerCase() === lower ||
        (t.kod && t.kod.toLowerCase() === lower) ||
        (t.ad && t.ad.toLowerCase() === lower) ||
        lower.startsWith(t.id.toLowerCase())
    );
    if (found && found.ad) {
      // Hastalık izni/rapor için PDKS'de yaygın resmi standart 'Raporlu' ifadesidir
      if (found.id === 'hastalik' && (found.ad.includes('Hastalık') || found.ad.includes('Rapor'))) {
        return 'Raporlu';
      }
      return found.ad;
    }
  } catch {}

  // 2. Özel durum kontrolleri
  if (lower.includes('rapor') || lower.includes('hastalik') || lower === 'r' || lower === 'rp' || lower === '-r' || lower === 'ha') {
    return 'Raporlu';
  }
  if (lower.includes('yillik') || lower.includes('yıllık') || lower === 'yi' || lower === 'yillik') {
    return 'Yıllık İzin';
  }
  if (lower.includes('ucret') || lower.includes('ücret') || lower === 'ui' || lower === 'üi') {
    return 'Ücretsiz İzin';
  }
  if (lower.includes('mazeret') || lower === 'mi') {
    return 'Mazeret İzni';
  }
  if (lower.includes('egitim') || lower.includes('eğitim')) {
    return 'Eğitim İzni';
  }
  if (lower.includes('dogum') || lower.includes('doğum')) {
    return 'Doğum İzni';
  }
  if (lower.includes('babalik') || lower.includes('babalık')) {
    return 'Babalık İzni';
  }
  if (lower.includes('evlilik')) {
    return 'Evlilik İzni';
  }
  if (lower.includes('olum') || lower.includes('ölüm')) {
    return 'Ölüm İzni';
  }

  // 3. Genel biçimlendirme fonksiyonuna devret
  const formatted = formatIzinTuru(clean, companyId);
  return formatted || 'İzinli';
}

type MaxIzinInfo = {
  max: number;
  label: string;
  maxGun: number;
  aciklama: string;
};

export function getMaxIzinSureleri(tur: string, companyId?: string): MaxIzinInfo {
  const sureleri: Record<string, MaxIzinInfo> = {
    yillik: {
      max: 30,
      label: 'Yıllık hak kadar',
      maxGun: 30,
      aciklama: 'Yıllık izin hakkına göre kullanılır. (Genel üst limit: 30 gün)',
    },
    mazeret: {
      max: 3,
      label: '3 gün',
      maxGun: 3,
      aciklama: 'Mazeret izni için en fazla 3 gün kullanılabilir.',
    },
    hastalik: {
      max: 30,
      label: '30 gün',
      maxGun: 30,
      aciklama: 'Hastalık izni için en fazla 30 gün kullanılabilir.',
    },
    dogum: {
      max: 168,
      label: '168 gün (24 hafta)',
      maxGun: 168,
      aciklama: 'Doğum (analık) izni için 7578 sayılı Kanun uyarınca 24 hafta (168 gün) uygulanır.',
    },
    babalik: {
      max: 10,
      label: '10 gün',
      maxGun: 10,
      aciklama: 'Babalık izni için 7578 sayılı Kanun uyarınca 10 gün uygulanır.',
    },
    evlilik: {
      max: 3,
      label: '3 gün',
      maxGun: 3,
      aciklama: 'Evlilik izni için en fazla 3 gün kullanılabilir.',
    },
    olum: {
      max: 3,
      label: '3 gün',
      maxGun: 3,
      aciklama: 'Ölüm izni için en fazla 3 gün kullanılabilir.',
    },
    askerlik: {
      max: 365,
      label: 'Mevzuata göre',
      maxGun: 365,
      aciklama: 'Askerlik izinleri şirket politikasına ve mevzuata göre değerlendirilir.',
    },
    ucretsiz: {
      max: 365,
      label: 'Mevzuata göre',
      maxGun: 365,
      aciklama: 'Ücretsiz izin süreleri şirket politikası ve onaya bağlıdır.',
    },
  };

  if (sureleri[tur]) {
    return sureleri[tur];
  }

  // Custom company leave type
  const customTurler = getCompanyIzinTurleri(companyId);
  const found = customTurler.find((c) => c.id === tur || c.kod?.toLowerCase() === tur?.toLowerCase());
  if (found) {
    const gun = found.kademe?.[0]?.gunHak || found.maksBekleme || 30;
    return {
      max: gun || 30,
      label: `${gun} gün`,
      maxGun: gun || 30,
      aciklama: found.aciklama || `${found.ad} şirket tanımlı izin kurallarına tabidir.`,
    };
  }

  return {
    max: 30,
    label: 'Şirket kuralına göre',
    maxGun: 30,
    aciklama: 'Şirket izin politikasına göre değerlendirilir.',
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateIzinTuru(
  tur: string,
  gunSayisi: number,
  employee?: Employee | null,
  companyId?: string
): { valid: boolean; isValid: boolean; message?: string } {
  const maxInfo = getMaxIzinSureleri(tur, companyId);
  if (maxInfo && gunSayisi > maxInfo.max) {
    const labels = getCompanyIzinTuruLabels(companyId);
    return {
      valid: false,
      isValid: false,
      message: `${labels[tur] || tur} için maksimum ${maxInfo.label} izin kullanılabilir.`,
    };
  }
  return { valid: true, isValid: true };
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Şirketin veya varsayılan çalışma düzeninde Cumartesi çalışmasının (6 günlük düzen) aktif olup olmadığını kontrol eder.
 */
export function isSaturdayWorkActive(companyId?: string): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      if (companyId && companyId !== 'default') {
        const raw = localStorage.getItem(`humanius_saturday_work_${companyId}`);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.isSaturdayWork === 'boolean') {
              return parsed.isSaturdayWork;
            }
          } catch {}
        }
      }

      const rawDef = localStorage.getItem('humanius_saturday_work_default');
      if (rawDef) {
        try {
          const parsed = JSON.parse(rawDef);
          if (typeof parsed?.isSaturdayWork === 'boolean') {
            return parsed.isSaturdayWork;
          }
        } catch {}
      }

      // Check any saved company saturday work setting if companyId is not specifically matched
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('humanius_saturday_work_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.isSaturdayWork === true) {
                return true;
              }
            } catch {}
          }
        }
      }
    }
  } catch {}
  return false;
}

/**
 * İki tarih arasındaki iş günü sayısını hesaplar.
 * Şirkette 6 günlük çalışma düzeni (Cumartesi çalışma) aktifse veya isSaturdayWorking true ise
 * Cumartesi günleri de iş günü olarak sayılır. Pazar günleri ise tatil olarak hariç tutulur.
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  isSaturdayWorking?: boolean | string
): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;

  const satWork = typeof isSaturdayWorking === 'boolean'
    ? isSaturdayWorking
    : isSaturdayWorkActive(typeof isSaturdayWorking === 'string' ? isSaturdayWorking : undefined);

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Pazar (0) günleri izne dahil edilir. Cumartesi (6) ise 6 günlük çalışma düzeni aktifse dahil edilir.
    if (dayOfWeek !== 6 || satWork) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Çalışma yılına göre yıllık izin hakkını hesaplar (İş Kanunu Madde 53).
 */
export function calculateYillikIzinHakki(calısmaYili: number): number {
  if (calısmaYili < 1) return 0;
  if (calısmaYili < 5) return 14;
  if (calısmaYili < 15) return 20;
  return 26;
}
