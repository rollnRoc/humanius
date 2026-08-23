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

// ─── Max süreler (iş kanunu) ─────────────────────────────────────────────────

type MaxIzinInfo = {
  max: number;
  label: string;
  maxGun: number;
  aciklama: string;
};

export function getMaxIzinSureleri(tur: IzinTuru): MaxIzinInfo {
  const sureleri: Record<IzinTuru, MaxIzinInfo> = {
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
  return sureleri[tur];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateIzinTuru(
  tur: IzinTuru,
  gunSayisi: number,
  employee?: Employee | null
): { valid: boolean; isValid: boolean; message?: string } {
  const maxInfo = getMaxIzinSureleri(tur);
  if (maxInfo && gunSayisi > maxInfo.max) {
    return {
      valid: false,
      isValid: false,
      message: `${izinTuruLabels[tur]} için maksimum ${maxInfo.label} izin kullanılabilir.`,
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
 * İki tarih arasındaki iş günü sayısını hesaplar (hafta sonu hariç).
 */
export function calculateWorkingDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) count++;
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
