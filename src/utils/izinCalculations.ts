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
  try {
    if (companyId && companyId !== 'default') {
      const saved = localStorage.getItem(`humanius_izin_turleri_${companyId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter((x: any) => x && !x.id?.startsWith('__'));
          if (clean.length > 0) return clean;
        }
      }
    }
  } catch (e) {}

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

/**
 * Devam Kontrolü ve Puantaj senkronizasyonunda izin/tatil türünün standart kısaltmasını üretir.
 * Giriş ve çıkış saati hanelerine yazılmak üzere kullanılır.
 * Örn: 'HT', 'AT', 'Yİ', 'RP', 'Üİ', 'Mİ', 'EG', 'DĞ', 'BB', 'EVL', 'ÖLM', 'UBGT'
 */
export function getDevamKontroluIzinKisaltma(tur: string | undefined | null, companyId?: string): string {
  if (!tur) return 'İZİN';
  const clean = String(tur).trim();
  const lower = clean.toLowerCase();

  // Şirket dinamik izin tanımları kontrolü
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
    if (found && found.kod) {
      return found.kod.toUpperCase();
    }
  } catch {}

  if (lower.includes('hafta') || lower === 'ht') return 'HT';
  if (lower.includes('akdi') || lower === 'at') return 'AT';
  if (lower.includes('rapor') || lower.includes('hastalik') || lower === 'r' || lower === 'rp' || lower === '-r' || lower === 'ha') return 'RP';
  if (lower.includes('yillik') || lower.includes('yıllık') || lower === 'yi' || lower === 'yillik') return 'Yİ';
  if (lower.includes('ucret') || lower.includes('ücret') || lower === 'ui' || lower === 'üi') return 'Üİ';
  if (lower.includes('mazeret') || lower === 'mi') return 'Mİ';
  if (lower.includes('egitim') || lower.includes('eğitim') || lower === 'eg') return 'EG';
  if (lower.includes('dogum') || lower.includes('doğum') || lower === 'dgm') return 'DĞ';
  if (lower.includes('babalik') || lower.includes('babalık')) return 'BB';
  if (lower.includes('evlilik')) return 'EVL';
  if (lower.includes('olum') || lower.includes('ölüm')) return 'ÖLM';
  if (lower.includes('asker')) return 'ASK';
  if (lower.includes('ubgt') || lower.includes('bayram') || lower.includes('resmi tatil')) return 'UBGT';

  if (clean.length <= 4) return clean.toUpperCase();
  return 'İZİN';
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
  // ── 4857 Sayılı İş Kanunu Madde 53/54 — 1 Yıl Dolum Kontrolü ──
  if (tur === 'yillik' && employee) {
    const joinDateStr = employee.joinDate || (employee as any).join_date || (employee as any).ise_giris_tarihi;
    if (joinDateStr && !hasCompletedOneYear(joinDateStr)) {
      const hakedisTarihi = getYillikIzinHakEdisTarihi(joinDateStr);
      const formattedHakedis = hakedisTarihi ? formatDate(hakedisTarihi.toISOString().split('T')[0]) : '';
      const kalanGun = getYillikIzinKalanGunSayisi(joinDateStr);
      return {
        valid: false,
        isValid: false,
        message: `4857 Sayılı İş Kanunu (Madde 53/54) uyarınca yıllık ücretli izin hakkı, işe giriş tarihinden itibaren en az 1 tam yıl çalışıldıktan sonra hak edilir. ${employee.name || 'Bu çalışan'} henüz 1 yılını doldurmamıştır.${formattedHakedis ? ` Yıllık izin hak ediş tarihi: ${formattedHakedis} (Kalan: ${kalanGun} gün).` : ''}`,
      };
    }
  }

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
    if (typeof localStorage !== 'undefined' && companyId && companyId !== 'default') {
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
 * Personelin işe giriş tarihinden itibaren tamamladığı tam çalışma yılını hesaplar.
 * İşe giriş yıldönümü gelmeden kıdem yılı artışı gerçekleşmez (4857 s.K. Madde 53/54).
 */
export function calculateCompletedYears(
  joinDateInput?: string | Date | null,
  referenceDate: Date = new Date()
): number {
  if (!joinDateInput) return 0;
  const join = typeof joinDateInput === 'string' ? new Date(joinDateInput) : joinDateInput;
  if (isNaN(join.getTime())) return 0;

  let years = referenceDate.getFullYear() - join.getFullYear();
  const m = referenceDate.getMonth() - join.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < join.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

/**
 * Personelin 1 tam çalışma yılını doldurup doldurmadığını denetler.
 * 1 yıl dolmadıysa kanuni yıllık ücretli izin hakkı bulunmaz (4857 s.K. Md. 53/54).
 */
export function hasCompletedOneYear(
  joinDateInput?: string | Date | null,
  referenceDate: Date = new Date()
): boolean {
  return calculateCompletedYears(joinDateInput, referenceDate) >= 1;
}

/**
 * 1 tam yılın doldurulacağı hak ediş tarihini hesaplar (işe giriş tarihinin 1. yıldönümü).
 */
export function getYillikIzinHakEdisTarihi(joinDateInput?: string | Date | null): Date | null {
  if (!joinDateInput) return null;
  const join = typeof joinDateInput === 'string' ? new Date(joinDateInput) : new Date(joinDateInput.getTime());
  if (isNaN(join.getTime())) return null;
  const hakedis = new Date(join);
  hakedis.setFullYear(hakedis.getFullYear() + 1);
  return hakedis;
}

/**
 * 1 tam yılın dolmasına kalan gün sayısını hesaplar (eğer henüz 1 yıl dolmadıysa).
 */
export function getYillikIzinKalanGunSayisi(
  joinDateInput?: string | Date | null,
  referenceDate: Date = new Date()
): number {
  const hakedis = getYillikIzinHakEdisTarihi(joinDateInput);
  if (!hakedis) return 0;
  const diffTime = hakedis.getTime() - referenceDate.getTime();
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Çalışma yılına göre kanuni yıllık izin hakkını hesaplar (İş Kanunu Madde 53).
 * 1 yılını doldurmayan çalışan için kanuni yıllık izin hak edişi 0 gündür.
 */
export function calculateYillikIzinHakki(calismaYili: number): number {
  if (calismaYili < 1) return 0;
  if (calismaYili < 5) return 14;
  if (calismaYili < 15) return 20;
  return 26;
}


// ─── Saatlik Mazeret İzni Yardımcıları ────────────────────────────────────────

/**
 * Başlangıç ve bitiş saati arasındaki süreyi saat ve dakika olarak hesaplar.
 */
export function calculateHourlyDuration(
  startTime?: string,
  endTime?: string
): { hours: number; minutes: number; label: string; isValid: boolean } {
  if (!startTime || !endTime) {
    return { hours: 0, minutes: 0, label: '0 Saat', isValid: false };
  }
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) {
    return { hours: 0, minutes: 0, label: '0 Saat', isValid: false };
  }
  const diffMins = (eH * 60 + eM) - (sH * 60 + sM);
  if (diffMins <= 0) {
    return { hours: 0, minutes: 0, label: '0 Saat', isValid: false };
  }
  const hours = parseFloat((diffMins / 60).toFixed(2));
  const wholeHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  let label = '';
  if (wholeHours > 0 && remMins > 0) {
    label = `${wholeHours} Saat ${remMins} Dk`;
  } else if (wholeHours > 0) {
    label = `${wholeHours} Saat`;
  } else {
    label = `${remMins} Dakika`;
  }
  return { hours, minutes: diffMins, label, isValid: true };
}

/**
 * Saatlik izin bilgisini açıklama metnine eklenecek standart etikete dönüştürür.
 * Örn: [SAATLİK İZİN: 14:00 - 16:00 (2 Saat)]
 */
export function formatHourlyLeaveTag(startTime: string, endTime: string, hoursLabel: string): string {
  return `[SAATLİK İZİN: ${startTime} - ${endTime} (${hoursLabel})]`;
}

/**
 * Bir izin talebinin veya açıklama metninin saatlik mazeret izni olup olmadığını ayrıştırır.
 */
export function parseHourlyLeaveInfo(talepOrAciklama: any): {
  isHourly: boolean;
  startTime: string;
  endTime: string;
  hoursLabel: string;
  rangeLabel: string;
  badgeLabel: string;
  puantajNote: string;
  cleanAciklama: string;
} {
  const rawAciklama =
    typeof talepOrAciklama === 'string'
      ? talepOrAciklama
      : String(talepOrAciklama?.aciklama ?? '');

  const match = rawAciklama.match(
    /\[SAATLİK İZİN:\s*([0-9]{1,2}:[0-9]{2})\s*-\s*([0-9]{1,2}:[0-9]{2})\s*\(([^)]+)\)\]/i
  );

  const cleanAciklama = rawAciklama
    .replace(/\[SAATLİK İZİN:[^\]]+\]/gi, '')
    .trim();

  if (match) {
    const startTime = match[1];
    const endTime = match[2];
    const hoursLabel = match[3].trim();
    const rangeLabel = `${startTime} - ${endTime} (${hoursLabel})`;
    const badgeLabel = `Saatlik İzin (${startTime} - ${endTime} • ${hoursLabel})`;
    const puantajNote = cleanAciklama
      ? `Saatlik Mazeret İzni: ${startTime} - ${endTime} (${hoursLabel}) — ${cleanAciklama}`
      : `Saatlik Mazeret İzni: ${startTime} - ${endTime} (${hoursLabel})`;
    return {
      isHourly: true,
      startTime,
      endTime,
      hoursLabel,
      rangeLabel,
      badgeLabel,
      puantajNote,
      cleanAciklama,
    };
  }

  // Eğer gunSayisi === 0 ve izinTuru mazeret ise (etiketsiz saatlik izin fallback)
  if (typeof talepOrAciklama === 'object' && talepOrAciklama !== null) {
    const gun = Number(talepOrAciklama.gunSayisi ?? talepOrAciklama.gun_sayisi ?? -1);
    const tur = String(talepOrAciklama.izinTuru ?? talepOrAciklama.izin_turu ?? '').toLowerCase();
    const yol = Boolean(talepOrAciklama.yolIzniTalep ?? talepOrAciklama.yol_izni_talep);
    if (gun === 0 && !yol && tur.includes('mazeret')) {
      const puantajNote = cleanAciklama
        ? `Saatlik Mazeret İzni — ${cleanAciklama}`
        : 'Saatlik Mazeret İzni';
      return {
        isHourly: true,
        startTime: '',
        endTime: '',
        hoursLabel: 'Saatlik',
        rangeLabel: 'Saatlik İzin',
        badgeLabel: 'Saatlik İzin',
        puantajNote,
        cleanAciklama,
      };
    }
  }

  return {
    isHourly: false,
    startTime: '',
    endTime: '',
    hoursLabel: '',
    rangeLabel: '',
    badgeLabel: '',
    puantajNote: '',
    cleanAciklama: rawAciklama,
  };
}

/**
 * İzin süresini ekranda gösterilecek metne çevirir (Örn: "3 Gün" veya "Saatlik İzin (14:00 - 16:00 • 2 Saat)").
 */
export function formatIzinSuresiLabel(talep: any, short = false): string {
  const hourly = parseHourlyLeaveInfo(talep);
  if (hourly.isHourly) {
    if (short) {
      return hourly.hoursLabel && hourly.startTime
        ? `${hourly.hoursLabel} (${hourly.startTime}-${hourly.endTime})`
        : 'Saatlik İzin';
    }
    return hourly.badgeLabel;
  }
  const gun = Number(talep?.gunSayisi ?? talep?.gun_sayisi ?? talep?.kullanilanGun ?? 0);
  return `${gun} Gün`;
}
