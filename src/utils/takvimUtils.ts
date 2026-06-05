import { Employee } from '../types';
import { IzinTalebi } from '../types/izin';
import { BordroItem } from '../types/bordro';
import {
  TakvimEtkinlik,
  EtkinlikTuru,
  EtkinlikOncelik,
  EtkinlikDurum,
  YapilandirilmisEtkinlik,
  ResmiTatil,
} from '../types/takvim';

// ─── Sabitler ────────────────────────────────────────────────────────────────

export const IS_KANUNU_SURELERI = {
  yillikIzin: {
    birIlaBesYil: 14,
    besIlaOnbesYil: 20,
    onbesYilUstunde: 26,
    elliYasUstundeEkIzin: 4,
  },
  mazeretIzni: 3,
  dogumIzni: 112,
  babalikIzni: 5,
  evlilikIzni: 3,
  olumIzni: 3,
  yolIzni: 2,
  haftalikCalismaSaati: 45,
  gunlukCalismaSaati: 7.5,
};

export const BORDRO_SURELERI = {
  bordroHazirlikGunleri: 5,
  bordroOdemeGunleri: 3,
  sgkBildirimi: 23,
  vergiBeyannamesi: 26,
  yillikBordroKapanisi: '31 Aralık',
  primBildirimi: 23,
};

export const EGITIM_SURELERI = {
  iseGirisEgitimi: 5,
  isSagligiEgitimi: 8,
  periyodikEgitim: 90,
  performansDegerlendirme: 180,
  kariyer_planlama: 365,
};

export const RESMI_TATILLER_2024: ResmiTatil[] = [
  { tarih: '2024-01-01', ad: 'Yılbaşı' },
  { tarih: '2024-04-10', ad: 'Ramazan Bayramı 1. Günü' },
  { tarih: '2024-04-11', ad: 'Ramazan Bayramı 2. Günü' },
  { tarih: '2024-04-12', ad: 'Ramazan Bayramı 3. Günü' },
  { tarih: '2024-04-23', ad: 'Ulusal Egemenlik ve Çocuk Bayramı' },
  { tarih: '2024-05-01', ad: 'Emek ve Dayanışma Günü' },
  { tarih: '2024-05-19', ad: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
  { tarih: '2024-06-16', ad: 'Kurban Bayramı 1. Günü' },
  { tarih: '2024-06-17', ad: 'Kurban Bayramı 2. Günü' },
  { tarih: '2024-06-18', ad: 'Kurban Bayramı 3. Günü' },
  { tarih: '2024-06-19', ad: 'Kurban Bayramı 4. Günü' },
  { tarih: '2024-07-15', ad: 'Demokrasi ve Millî Birlik Günü' },
  { tarih: '2024-08-30', ad: 'Zafer Bayramı' },
  { tarih: '2024-10-29', ad: 'Cumhuriyet Bayramı' },
];

// ─── Otomatik Etkinlik Oluşturma ─────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return `auto-${_nextId++}`;
}

export function createAutomaticEvents(
  employees: Employee[],
  izinTalepleri: IzinTalebi[],
  bordrolar: BordroItem[]
): TakvimEtkinlik[] {
  const events: TakvimEtkinlik[] = [];

  // İzin talepleri → etkinlik
  izinTalepleri.forEach((talep) => {
    const employee = employees.find((e) => e.id === talep.employeeId);
    events.push({
      id: uid(),
      baslik: `${employee?.name ?? 'Personel'} - İzin Talebi`,
      aciklama: `Durum: ${talep.durum} | Gün: ${talep.gunSayisi}`,
      tarih: talep.baslangicTarihi,
      bitisTarihi: talep.bitisTarihi,
      tur: 'izin',
      oncelik: talep.durum === 'beklemede' ? 'yuksek' : 'normal',
      durum: talep.durum === 'onaylandi' ? 'tamamlandi' : talep.durum === 'reddedildi' ? 'iptal' : 'beklemede',
      employeeId: talep.employeeId,
      employeeAdi: employee?.name,
      departman: employee?.department,
      otomatik: true,
    });
  });

  // Bordro dönemleri → etkinlik
  const periods = [...new Set(bordrolar.map((b) => b.period).filter(Boolean))];
  periods.forEach((period) => {
    if (!period || typeof period !== 'string' || !period.includes('-')) return;
    const [year, month] = period.split('-');
    if (!year || !month || isNaN(Number(year)) || isNaN(Number(month))) return;
    const odemeGunu = new Date(Number(year), Number(month) - 1, BORDRO_SURELERI.bordroOdemeGunleri);
    events.push({
      id: uid(),
      baslik: `${period} Bordro Dönemi`,
      tarih: odemeGunu.toISOString().split('T')[0],
      tur: 'bordro',
      oncelik: 'kritik',
      durum: 'beklemede',
      otomatik: true,
    });
  });

  // Resmî tatiller
  RESMI_TATILLER_2024.forEach((tatil) => {
    events.push({
      id: uid(),
      baslik: tatil.ad,
      tarih: tatil.tarih,
      tur: 'tatil',
      oncelik: 'normal',
      durum: 'tamamlandi',
      otomatik: true,
    });
  });

  return events;
}

// ─── Filtre / Gruplama ───────────────────────────────────────────────────────

export function getEventsInRange(
  events: TakvimEtkinlik[],
  start: Date,
  end: Date
): TakvimEtkinlik[] {
  return events.filter((e) => {
    const t = new Date(e.tarih);
    return t >= start && t <= end;
  });
}

export function organizeEventsByDate(
  events: TakvimEtkinlik[],
  date: Date | string
): { etkinlikler: TakvimEtkinlik[] } {
  // date hem Date hem string olabilir; güvenli şekilde YYYY-MM-DD üret
  let dateStr: string;
  if (date instanceof Date) {
    dateStr = date.toISOString().split('T')[0];
  } else if (typeof date === 'string') {
    dateStr = date.split('T')[0];
  } else {
    dateStr = '';
  }
  const etkinlikler = events.filter((e) => (e.tarih ?? '').split('T')[0] === dateStr);
  return { etkinlikler };
}

// ─── Renk / Etiket Yardımcıları ──────────────────────────────────────────────

export function getEtkinlikRengi(tur: EtkinlikTuru): string {
  const map: Record<EtkinlikTuru, string> = {
    izin: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    bordro: 'bg-red-50 border-red-200 text-red-700',
    tatil: 'bg-green-50 border-green-200 text-green-700',
    egitim: 'bg-blue-50 border-blue-200 text-blue-700',
    toplanti: 'bg-purple-50 border-purple-200 text-purple-700',
    sgk: 'bg-orange-50 border-orange-200 text-orange-700',
    vergi: 'bg-pink-50 border-pink-200 text-pink-700',
    diger: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return map[tur] ?? map.diger;
}

export function getEtkinlikTuruAdi(tur: EtkinlikTuru): string {
  const map: Record<EtkinlikTuru, string> = {
    izin: 'İzin',
    bordro: 'Bordro',
    tatil: 'Tatil',
    egitim: 'Eğitim',
    toplanti: 'Toplantı',
    sgk: 'SGK',
    vergi: 'Vergi',
    diger: 'Diğer',
  };
  return map[tur] ?? 'Diğer';
}

export function getOncelikRengi(oncelik: EtkinlikOncelik): string {
  const map: Record<EtkinlikOncelik, string> = {
    dusuk: 'bg-gray-100 text-gray-600',
    normal: 'bg-blue-100 text-blue-700',
    yuksek: 'bg-orange-100 text-orange-700',
    kritik: 'bg-red-100 text-red-700',
  };
  return map[oncelik] ?? map.normal;
}

export function getDurumRengi(durum: EtkinlikDurum): string {
  const map: Record<EtkinlikDurum, string> = {
    beklemede: 'bg-yellow-100 text-yellow-700',
    tamamlandi: 'bg-green-100 text-green-700',
    iptal: 'bg-red-100 text-red-700',
    devam: 'bg-blue-100 text-blue-700',
  };
  return map[durum] ?? map.beklemede;
}

// ─── Tarih Formatlama ─────────────────────────────────────────────────────────

export function formatTarih(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatTarihAraligi(start: string, end?: string): string {
  if (!end || start === end) return formatTarih(start);
  return `${formatTarih(start)} – ${formatTarih(end)}`;
}