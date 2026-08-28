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
  mazeretIzni: 5,
  dogumIzni: 168,
  babalikIzni: 10,
  evlilikIzni: 3,
  olumIzni: 3,
  yolIzni: 4,
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

export interface ResmiTatil {
  tarih: string;
  ad: string;
}

export function getResmiTatillerForYear(year: number): ResmiTatil[] {
  const fixedHolidays = [
    { ayGun: '01-01', ad: 'Yılbaşı' },
    { ayGun: '04-23', ad: 'Ulusal Egemenlik ve Çocuk Bayramı' },
    { ayGun: '05-01', ad: 'Emek ve Dayanışma Günü' },
    { ayGun: '05-19', ad: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
    { ayGun: '07-15', ad: 'Demokrasi ve Millî Birlik Günü' },
    { ayGun: '08-30', ad: 'Zafer Bayramı' },
    { ayGun: '10-29', ad: 'Cumhuriyet Bayramı' },
  ];

  const diniTatiller: Record<number, { tarih: string; ad: string }[]> = {
    2024: [
      { tarih: '2024-04-10', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2024-04-11', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2024-04-12', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2024-06-16', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2024-06-17', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2024-06-18', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2024-06-19', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2025: [
      { tarih: '2025-03-30', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2025-03-31', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2025-04-01', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2025-06-06', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2025-06-07', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2025-06-08', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2025-06-09', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2026: [
      { tarih: '2026-03-20', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2026-03-21', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2026-03-22', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2026-05-27', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2026-05-28', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2026-05-29', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2026-05-30', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2027: [
      { tarih: '2027-03-09', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2027-03-10', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2027-03-11', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2027-05-16', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2027-05-17', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2027-05-18', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2027-05-19', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2028: [
      { tarih: '2028-02-26', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2028-02-27', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2028-02-28', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2028-05-04', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2028-05-05', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2028-05-06', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2028-05-07', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2029: [
      { tarih: '2029-02-15', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2029-02-16', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2029-02-17', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2029-04-23', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2029-04-24', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2029-04-25', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2029-04-26', ad: 'Kurban Bayramı 4. Günü' },
    ],
    2030: [
      { tarih: '2030-02-05', ad: 'Ramazan Bayramı 1. Günü' },
      { tarih: '2030-02-06', ad: 'Ramazan Bayramı 2. Günü' },
      { tarih: '2030-02-07', ad: 'Ramazan Bayramı 3. Günü' },
      { tarih: '2030-04-13', ad: 'Kurban Bayramı 1. Günü' },
      { tarih: '2030-04-14', ad: 'Kurban Bayramı 2. Günü' },
      { tarih: '2030-04-15', ad: 'Kurban Bayramı 3. Günü' },
      { tarih: '2030-04-16', ad: 'Kurban Bayramı 4. Günü' },
    ],
  };

  const results: ResmiTatil[] = fixedHolidays.map(h => ({
    tarih: `${year}-${h.ayGun}`,
    ad: h.ad
  }));

  const religious = diniTatiller[year] || diniTatiller[2026];
  const religiousWithCorrectYear = religious.map(r => ({
    tarih: `${year}-${r.tarih.slice(5)}`,
    ad: r.ad
  }));

  results.push(...religiousWithCorrectYear);
  return results.sort((a, b) => a.tarih.localeCompare(b.tarih));
}

export const RESMI_TATILLER_2024: ResmiTatil[] = getResmiTatillerForYear(new Date().getFullYear());

// ─── Otomatik Etkinlik Oluşturma ─────────────────────────────────────────────

let _nextId = 1;
function uid() {
  return `auto-${_nextId++}`;
}

export function createAutomaticEvents(
  employees: Employee[],
  izinTalepleri: IzinTalebi[],
  bordrolar: BordroItem[],
  year: number = new Date().getFullYear()
): TakvimEtkinlik[] {
  const events: TakvimEtkinlik[] = [];

  // İzin talepleri → etkinlik (Sadece onaylanan izinler)
  izinTalepleri.filter((t) => t.durum === 'onaylandi').forEach((talep) => {
    const employee = employees.find((e) => e.id === talep.employeeId);
    let startTarih = talep.baslangicTarihi;
    let endTarih = talep.bitisTarihi;

    // Shift to selected year if it's legacy 2024 test data
    if (startTarih && startTarih.startsWith('2024-')) {
      startTarih = startTarih.replace('2024-', `${year}-`);
    }
    if (endTarih && endTarih.startsWith('2024-')) {
      endTarih = endTarih.replace('2024-', `${year}-`);
    }

    events.push({
      id: uid(),
      baslik: `${employee?.name ?? 'Personel'} - İzinli`,
      aciklama: `Durum: Onaylandı | Gün: ${talep.gunSayisi}`,
      tarih: startTarih,
      bitisTarihi: endTarih,
      tur: 'izin',
      oncelik: 'normal',
      durum: 'tamamlandi',
      employeeId: talep.employeeId,
      employeeAdi: employee?.name,
      departman: employee?.department,
      otomatik: true,
    });
  });

  // Resmî tatiller
  const holidays = getResmiTatillerForYear(year);
  holidays.forEach((tatil) => {
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

  // 3. Personel Doğum Günleri Kutlamaları
  employees.forEach((emp) => {
    const rawBirthDate = (emp as any).birth_date || (emp as any).birthDate || (emp as any).dogum_tarihi;
    if (rawBirthDate) {
      const birthStr = String(rawBirthDate).split('T')[0];
      const parts = birthStr.split('-');
      if (parts.length === 3) {
        const month = parts[1];
        const day = parts[2];
        const thisYearBday = `${year}-${month}-${day}`;
        events.push({
          id: uid(),
          baslik: `🎂 ${emp.name} - Doğum Günü`,
          aciklama: `🎉 ${emp.name} personeline mutlu yaşlar dileriz! (${emp.department || 'Genel Departman'} - ${emp.position || 'Personel'})`,
          tarih: thisYearBday,
          tur: 'dogum_gunu',
          oncelik: 'normal',
          durum: 'tamamlandi',
          employeeId: emp.id,
          employeeAdi: emp.name,
          departman: emp.department,
          otomatik: true,
        });
      }
    }

    // 4. İşe Giriş Yıldönümü Kutlamaları
    const rawJoinDate = emp.join_date || emp.joinDate || (emp as any).ise_giris_tarihi;
    if (rawJoinDate) {
      const joinStr = String(rawJoinDate).split('T')[0];
      const parts = joinStr.split('-');
      if (parts.length === 3) {
        const hireYear = parseInt(parts[0], 10);
        const month = parts[1];
        const day = parts[2];
        const yearsWorked = year - hireYear;

        if (yearsWorked > 0) {
          const thisYearAnniversary = `${year}-${month}-${day}`;
          events.push({
            id: uid(),
            baslik: `🎉 ${emp.name} - ${yearsWorked}. Çalışma Yıldönümü`,
            aciklama: `🏆 ${emp.name} şirketimiz bünyesinde ${yearsWorked}. çalışma yılını doldurdu! Tebrik ve teşekkür ederiz. (${emp.department || 'Genel Departman'})`,
            tarih: thisYearAnniversary,
            tur: 'yildonumu',
            oncelik: 'normal',
            durum: 'tamamlandi',
            employeeId: emp.id,
            employeeAdi: emp.name,
            departman: emp.department,
            otomatik: true,
          });
        }
      }
    }
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
  const etkinlikler = events.filter((e) => {
    const startStr = (e.tarih ?? '').split('T')[0];
    const endStr = (e.bitisTarihi ?? startStr).split('T')[0];
    return dateStr >= startStr && dateStr <= endStr;
  });
  return { etkinlikler };
}

// ─── Renk / Etiket Yardımcıları ──────────────────────────────────────────────

export function getEtkinlikRengi(tur: EtkinlikTuru): string {
  const map: Record<EtkinlikTuru, string> = {
    tatil: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    izin: 'bg-amber-50 border-amber-200 text-amber-700',
    egitim: 'bg-blue-50 border-blue-200 text-blue-700',
    toplanti: 'bg-purple-50 border-purple-200 text-purple-700',
    dogum_gunu: 'bg-pink-50 border-pink-200 text-pink-700 font-semibold',
    yildonumu: 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold',
    diger: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return map[tur] ?? map.diger;
}

export function getEtkinlikNoktaRengi(tur: EtkinlikTuru): string {
  const map: Record<EtkinlikTuru, string> = {
    tatil: 'bg-emerald-500',
    izin: 'bg-amber-500',
    egitim: 'bg-blue-500',
    toplanti: 'bg-purple-500',
    dogum_gunu: 'bg-pink-500',
    yildonumu: 'bg-indigo-500',
    diger: 'bg-slate-500',
  };
  return map[tur] ?? map.diger;
}

export function getEtkinlikTuruAdi(tur: EtkinlikTuru): string {
  const map: Record<EtkinlikTuru, string> = {
    tatil: 'Resmi Tatil',
    izin: 'Personel İzni',
    egitim: 'Eğitim & Gelişim',
    toplanti: 'Toplantı',
    dogum_gunu: '🎂 Doğum Günü Kutlaması',
    yildonumu: '🎉 Çalışma Yıldönümü',
    diger: 'Diğer / Duyuru',
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