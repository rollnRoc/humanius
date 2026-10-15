// Puantaj Hesaplama ve Mevzuat Motoru (4857 Sayılı İş Kanunu & UBGT Kuralları)

import { Employee } from '../types';
import { VardiyaKaydi } from '../services/pdksService';
import { CompanyShift, SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG, VARSAYILAN_VARDIYALAR } from '../services/shiftService';
import { getCompanyIzinTurleri, formatIzinTuru } from './izinCalculations';

export type PuantajKodu = 
  | 'Ç'    // Normal Fiili Çalışma
  | 'HT'   // Hafta Tatili (Pazar / Madde 46 - Ücretli 1 Gün)
  | 'AT'   // Akdi Tatil (Cumartesi / 5 günlük haftalık düzen)
  | 'UBGT' // Ulusal Bayram ve Genel Tatil (Resmi Tatil)
  | 'Yİ'   // Yıllık Ücretli İzin
  | 'Mİ'   // Mazeret İzni (Evlilik, Ölüm, Babalık vb. - Ücretli)
  | 'EG'   // Eğitim İzni (Toplam izinde toplanmaz)
  | 'R'    // İstirahat / SGK Raporu (Eksik gün)
  | 'RP'   // Raporlu (SGK Raporu)
  | 'Üİ'   // Ücretsiz İzin (Eksik gün)
  | 'D'    // Devamsız (Mazeretsiz işe gelmeme - Eksik gün)
  | '-'    // Henüz Gelmemiş / Kayıt Yok
  | (string & {});


export interface GunlukPuantajDetay {
  tarih: string;           // YYYY-MM-DD
  gunNo: number;           // 1 - 31
  gunAdi: string;          // Pzt, Sal, Çar, Per, Cum, Cmt, Paz
  isWeekend: boolean;      // Cumartesi veya Pazar mı
  isPazar: boolean;
  isCumartesi: boolean;
  isCumartesiCalisma?: boolean; // Cumartesi 6 günlük çalışma düzeni aktif mi
  isResmiTatil: boolean;
  resmiTatilAdi?: string;
  kod: PuantajKodu;
  kodAciklama: string;
  girisSaati: string | null;
  cikisSaati: string | null;
  brutSureSaat: number;
  molaDk: number;
  netSureSaat: number;     // Net fiili çalışma süresi
  fazlaMesaiSaat: number;
  gecikmeDk: number;
  ubgtCalismasi: boolean;  // Resmi tatilde fiilen çalıştı mı
  yasalUyari11Saat: boolean; // Günlük 11 saat sınır aşımı
  yasalUyariGece: boolean;   // Gece 7.5 saat sınır aşımı
  notlar?: string;
  isOngoing?: boolean;       // Vardiyası / mesaisi şu an devam ediyor mu (henüz çıkış saati gelmemiş)
}

export interface PersonelAylikPuantaj {
  employee: Employee;
  shift: CompanyShift;
  gunler: GunlukPuantajDetay[];
  ozet: {
    fiiliCalismaGun: number;
    fiiliCalismaSaat: number;
    haftaTatiliGun: number;    // HT
    akdiTatilGun: number;      // AT
    yillikIzinGun: number;     // Yİ - Yıllık Ücretli İzin
    ucretliIzinGun: number;    // Mİ ve diğer ücretli mazeret izinleri
    toplamIzinGun: number;     // Toplam İzin (Yİ + Mİ - Pazar, 5 günlükte Cumartesi ve Eğitim İzni hariç)
    ucretsizIzinGun: number;   // Üİ - Ücretsiz İzin
    egitimGun: number;         // EG - Eğitim İzni (İzin toplamında yer almaz)
    raporluGun: number;        // R
    devamsizGun: number;       // D
    ubgtGun: number;           // Resmi tatil gün sayısı
    ubgtCalisilanGun: number;  // Resmi tatilde fiilen çalışılan gün (+1 yevmiye)
    toplamFazlaMesaiSaat: number;
    toplamGecikmeDk: number;
    bordroGun: number;         // 4857 İş Kanunu Maktu 30 Gün Kuralı
  };
}

// 2024-2027 Türkiye Ulusal Bayram ve Genel Tatilleri (UBGT)
export const TURKIYE_RESMI_TATILLER: Record<string, string> = {
  // Sabit gün tatilleri
  '01-01': 'Yılbaşı',
  '04-23': '23 Nisan Ulusal Egemenlik ve Çocuk Bayramı',
  '05-01': '1 Mayıs Emek ve Dayanışma Günü',
  '05-19': '19 Mayıs Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
  '07-15': '15 Temmuz Demokrasi ve Milli Birlik Günü',
  '08-30': '30 Ağustos Zafer Bayramı',
  '10-29': '29 Ekim Cumhuriyet Bayramı',
  // 2026 Dini Bayramlar (Tahmini / Resmi)
  '2026-03-20': 'Ramazan Bayramı Arefesi (Yarım Gün)',
  '2026-03-21': 'Ramazan Bayramı 1. Gün',
  '2026-03-22': 'Ramazan Bayramı 2. Gün',
  '2026-03-23': 'Ramazan Bayramı 3. Gün',
  '2026-05-26': 'Kurban Bayramı Arefesi (Yarım Gün)',
  '2026-05-27': 'Kurban Bayramı 1. Gün',
  '2026-05-28': 'Kurban Bayramı 2. Gün',
  '2026-05-29': 'Kurban Bayramı 3. Gün',
  '2026-05-30': 'Kurban Bayramı 4. Gün',
};

export function checkIsResmiTatil(dateStr: string): { isTatil: boolean; ad?: string } {
  // Tam tarih kontrolü (YYYY-MM-DD)
  if (TURKIYE_RESMI_TATILLER[dateStr]) {
    return { isTatil: true, ad: TURKIYE_RESMI_TATILLER[dateStr] };
  }
  // Sabit ay-gün kontrolü (MM-DD)
  const mmDd = dateStr.slice(5);
  if (TURKIYE_RESMI_TATILLER[mmDd]) {
    return { isTatil: true, ad: TURKIYE_RESMI_TATILLER[mmDd] };
  }
  return { isTatil: false };
}

/**
 * 4857 Sayılı Kanun Madde 68 uyarınca yasal asgari ara dinlenme süresi:
 * - 4 saat veya daha kısa: 15 dakika
 * - 4 saatten fazla 7.5 saate kadar: 30 dakika
 * - 7.5 saatten fazla: 60 dakika (1 saat)
 */
export function hesaplaYasalAraDinlenme(brutSaat: number, vardiyaMolaDk?: number): number {
  if (brutSaat <= 0) return 0;
  // 1 saatten az çalışmalarda yasal ara dinlenme düşülmez (kısa süreli mesai/test/erken çıkış)
  if (brutSaat < 1) return 0;

  // 1 - 4 saat arası çalışmalarda yasal ara dinlenme azami 15 dakikadır
  if (brutSaat <= 4) {
    if (vardiyaMolaDk !== undefined && vardiyaMolaDk !== null && vardiyaMolaDk >= 0) {
      return Math.min(vardiyaMolaDk, 15);
    }
    return 15;
  }

  // 4 saatten fazla - 7.5 saate kadar çalışmalarda ara dinlenme azami 30 dakikadır
  if (brutSaat <= 7.5) {
    if (vardiyaMolaDk !== undefined && vardiyaMolaDk !== null && vardiyaMolaDk >= 0) {
      return Math.min(vardiyaMolaDk, 30);
    }
    return 30;
  }

  // 7.5 saatten fazla tam gün çalışmalarda vardiya molası (veya yasal 60 dk) uygulanır
  if (vardiyaMolaDk !== undefined && vardiyaMolaDk !== null && vardiyaMolaDk >= 0) {
    return vardiyaMolaDk;
  }
  return 60;
}

const GUN_ADLARI = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

/**
 * Verilen yıl ve ay için gün listesi üretir
 */
export function getAyinGunleri(year: number, monthIndex: number): { tarih: string; gunNo: number; gunAdi: string; isPazar: boolean; isCumartesi: boolean }[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const list = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, monthIndex, d);
    const dayOfWeek = dt.getDay(); // 0 = Paz, 6 = Cmt
    const yyyy = year.toString();
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    list.push({
      tarih: `${yyyy}-${mm}-${dd}`,
      gunNo: d,
      gunAdi: GUN_ADLARI[dayOfWeek],
      isPazar: dayOfWeek === 0,
      isCumartesi: dayOfWeek === 6,
    });
  }
  return list;
}

/**
 * Bir gün için fiili veya planlanan net çalışma saatini döner
 */
export function getCalismaSaati(
  gun: GunlukPuantajDetay,
  shift?: CompanyShift,
  saturdayConfig?: SaturdayWorkConfig
): number {
  if (gun.netSureSaat && gun.netSureSaat > 0) {
    return gun.netSureSaat;
  }
  // Giriş ve çıkış saati mevcutsa aradaki fiili net süreyi hesapla ve doğrudan dön (asla tam gün vardiyaya düşme)
  if (gun.girisSaati && gun.cikisSaati) {
    const [gH, gM] = gun.girisSaati.split(':').map(Number);
    const [cH, cM] = gun.cikisSaati.split(':').map(Number);
    if (!isNaN(gH) && !isNaN(gM) && !isNaN(cH) && !isNaN(cM)) {
      let diffMins = (cH * 60 + cM) - (gH * 60 + gM);
      if (diffMins < 0) diffMins += 24 * 60;
      const brutSaat = diffMins / 60;
      const yasalMola = hesaplaYasalAraDinlenme(brutSaat, gun.molaDk);
      const netMins = Math.max(0, diffMins - yasalMola);
      const netSaatCalc = netMins / 60;
      const calculated = netSaatCalc > 0 && netSaatCalc < 0.1
        ? parseFloat(netSaatCalc.toFixed(2))
        : parseFloat(netSaatCalc.toFixed(1));
      return calculated;
    }
  }
  // Cumartesi ise Cumartesiye özel planlanan net çalışma süresi (Öncelik: Personelin vardiyası)
  if (gun.isCumartesi) {
    const sStr = shift?.saturday_start_time || saturdayConfig?.startTime || '08:30';
    const eStr = shift?.saturday_end_time || saturdayConfig?.endTime || '16:00';
    const [sH, sM] = sStr.split(':').map(Number);
    const [eH, eM] = eStr.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
      let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMins < 0) diffMins += 24 * 60;
      const mola = shift?.saturday_break_minutes != null ? Number(shift.saturday_break_minutes) : Number(saturdayConfig?.breakMinutes ?? 30);
      const netMins = Math.max(0, diffMins - mola);
      const calculated = parseFloat((netMins / 60).toFixed(1));
      if (calculated > 0) return calculated;
    }
    return 7.0; // Standart Cumartesi net çalışma süresi (08:30 - 16:00, 30dk mola)
  }
  // Hafta içi vardiya planındaki net çalışma süresi
  if (shift?.start_time && shift?.end_time) {
    const [sH, sM] = shift.start_time.split(':').map(Number);
    const [eH, eM] = shift.end_time.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
      let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMins < 0) diffMins += 24 * 60;
      const netMins = Math.max(0, diffMins - (shift.break_minutes || 60));
      const calculated = parseFloat((netMins / 60).toFixed(1));
      if (calculated > 0) return calculated;
    }
  }
  return 8.5; // Standart tam gün çalışma süresi
}

export function findBestMatchingShift(
  girisSaati: string,
  assignedShift: CompanyShift,
  allShifts?: CompanyShift[]
): CompanyShift {
  const [gH, gM] = girisSaati.split(':').map(Number);
  const gMin = gH * 60 + gM;

  if (allShifts && allShifts.length > 0) {
    let bestShift: CompanyShift | null = null;
    let minDiff = Infinity;

    for (const s of allShifts) {
      if (!s.start_time) continue;
      const [sH, sM] = s.start_time.split(':').map(Number);
      if (isNaN(sH) || isNaN(sM)) continue;
      const sMin = sH * 60 + sM;
      let diff = Math.abs(gMin - sMin);
      if (diff > 720) diff = 1440 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        bestShift = s;
      }
    }

    // Eğer tanımlı bir vardiya ile yakın eşleşiyorsa (en fazla 45 dk fark), onu kullan
    if (bestShift && minDiff <= 45) {
      return bestShift;
    }
  }

  // Tanımlı tam eşleşen vardiya yoksa ve gece saatinde giriş yapılmışsa (21:00 - 04:00 arası):
  // 23:00 - 07:00 veya 00:00 - 08:00 gece vardiyası otomatik oluşturulur
  if (gH >= 21 || gH <= 4) {
    const is23Shift = gH === 22 || gH === 23 || (gH === 0 && gM < 30);
    return {
      id: 'gece-vardiyasi-auto',
      name: is23Shift ? 'Gece Vardiyası (23:00 - 07:00)' : 'Gece Vardiyası (00:00 - 08:00)',
      start_time: is23Shift ? '23:00' : '00:00',
      end_time: is23Shift ? '07:00' : '08:00',
      break_minutes: 60,
      tolerance_minutes: 15,
      color: '#8b5cf6',
      is_default: false,
    };
  }

  return assignedShift;
}

/**
 * Tek bir personelin belirli bir ay için tam puantajını hesaplar
 */
export function hesaplaPersonelAylikPuantaj(params: {
  employee: Employee;
  year: number;
  monthIndex: number;
  shift?: CompanyShift;
  allShifts?: CompanyShift[];
  vardiyaKayitlari: VardiyaKaydi[];
  izinTalepleri: any[];
  adminOverrides?: Record<string, any>;
  saturdayConfig?: SaturdayWorkConfig;
  leaveTypes?: any[];
}): PersonelAylikPuantaj {
  const { employee, year, monthIndex, shift, vardiyaKayitlari, izinTalepleri, adminOverrides = {}, saturdayConfig, leaveTypes } = params;

  const activeShift = shift || VARSAYILAN_VARDIYALAR[0];
  const monthDays = getAyinGunleri(year, monthIndex);
  const shiftTolerance = activeShift.tolerance_minutes || 15;
  const shiftMolaDk = activeShift.break_minutes || 60;

  let fiiliCalismaGun = 0;
  let fiiliCalismaSaat = 0;
  let haftaTatiliGun = 0;
  let akdiTatilGun = 0;
  let yillikIzinGun = 0;
  let ucretliIzinGun = 0;
  let toplamIzinGun = 0;
  let ucretsizIzinGun = 0;
  let egitimGun = 0;
  let raporluGun = 0;
  let devamsizGun = 0;
  let ubgtGun = 0;
  let ubgtCalisilanGun = 0;
  let toplamFazlaMesaiSaat = 0;
  let toplamGecikmeDk = 0;

  const gunler: GunlukPuantajDetay[] = monthDays.map((day) => {
    const { tarih, gunNo, gunAdi, isPazar, isCumartesi } = day;
    const isWeekend = isPazar || isCumartesi;
    const isCumartesiCalisma = Boolean(isCumartesi && saturdayConfig?.isSaturdayWork);
    const resmiTatilInfo = checkIsResmiTatil(tarih);

    // 0. Öncelik: Manuel İK Düzeltmesi (Override)
    const empId = employee?.id || '';
    const overrideKey = `${empId}_${tarih}`;
    const overrideData = adminOverrides[overrideKey];

    // 1. Öncelik: İzin Talebi
    const approvedLeave = (izinTalepleri || []).find((t) => {
      const tEmpId = t.employeeId || t.employee_id;
      if (!tEmpId || tEmpId !== empId) return false;
      const tDurum = String(t.durum || '').toLowerCase();
      if (tDurum !== 'onaylandi' && tDurum !== 'onaylandı') return false;
      const s = (t.baslangicTarihi || t.baslangic_tarihi || '').split('T')[0];
      const e = (t.bitisTarihi || t.bitis_tarihi || '').split('T')[0];
      return Boolean(s && e && tarih >= s && tarih <= e);
    });

    // 2. Öncelik: Gerçek PDKS Giriş-Çıkış Kaydı
    const realShift = (vardiyaKayitlari || []).find((v) => {
      const vEmpId = v.employee_id || (v as any).employeeId;
      return vEmpId === empId && v.tarih === tarih;
    });

    let girisSaati: string | null = overrideData?.giris !== undefined ? overrideData.giris : realShift?.giris_saati || null;
    let cikisSaati: string | null = overrideData?.cikis !== undefined ? overrideData.cikis : realShift?.cikis_saati || null;

    if (girisSaati === '-') girisSaati = null;
    if (cikisSaati === '-') cikisSaati = null;

    if (girisSaati && girisSaati.length > 5) {
      girisSaati = girisSaati.substring(0, 5);
    }
    if (cikisSaati && cikisSaati.length > 5) {
      cikisSaati = cikisSaati.substring(0, 5);
    }

    // Vardiya parametreleri (Giriş saatine ve gece vardiyasına göre akıllı eşleşme)
    let currentDayShift = activeShift;
    if (girisSaati) {
      currentDayShift = findBestMatchingShift(girisSaati, activeShift, params.allShifts);
    }

    let activeStartTime = currentDayShift?.start_time || '08:30';
    let activeEndTime = currentDayShift?.end_time || '18:00';
    let activeMolaDk = currentDayShift?.break_minutes || shiftMolaDk;
    let activeTolerance = currentDayShift?.tolerance_minutes || shiftTolerance;

    if (isCumartesiCalisma) {
      activeStartTime = currentDayShift?.saturday_start_time || saturdayConfig?.startTime || '08:30';
      activeEndTime = currentDayShift?.saturday_end_time || saturdayConfig?.endTime || '16:00';
      activeMolaDk = currentDayShift?.saturday_break_minutes != null ? Number(currentDayShift.saturday_break_minutes) : Number(saturdayConfig?.breakMinutes ?? 30);
      activeTolerance = currentDayShift?.tolerance_minutes || Number(saturdayConfig?.toleranceMinutes ?? 15);
    }

    // Tarih zaman durumu
    const todayYMD = new Date().toISOString().split('T')[0];
    const isFuture = tarih > todayYMD;
    const isToday = tarih === todayYMD;
    const isPast = tarih < todayYMD;

    // Süre hesaplama
    let brutSureSaat = 0;
    let netSureSaat = 0;
    let fazlaMesaiSaat = 0;
    let gecikmeDk = 0;
    let isOngoing = false;
    let appliedMolaDk = activeMolaDk;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let shiftStartMinutes = 8 * 60 + 30;
    let shiftEndMinutes = 18 * 60;
    if (activeStartTime) {
      const [sH, sM] = activeStartTime.split(':').map(Number);
      if (!isNaN(sH) && !isNaN(sM)) {
        shiftStartMinutes = sH * 60 + sM;
      }
    }
    if (activeEndTime) {
      const [eH, eM] = activeEndTime.split(':').map(Number);
      if (!isNaN(eH) && !isNaN(eM)) {
        shiftEndMinutes = eH * 60 + eM;
      }
    }
    const isOvernight = shiftEndMinutes < shiftStartMinutes;

    if (girisSaati && cikisSaati) {
      const [gH, gM] = girisSaati.split(':').map(Number);
      const [cH, cM] = cikisSaati.split(':').map(Number);
      if (!isNaN(gH) && !isNaN(gM) && !isNaN(cH) && !isNaN(cM)) {
        let diffMins = (cH * 60 + cM) - (gH * 60 + gM);
        if (diffMins < 0) diffMins += 24 * 60; // Gece vardiyası (ör. 23:00 - 07:00)
        const brutSaatCalc = diffMins / 60;
        brutSureSaat = brutSaatCalc > 0 && brutSaatCalc < 0.1
          ? parseFloat(brutSaatCalc.toFixed(2))
          : parseFloat(brutSaatCalc.toFixed(1));

        const yasalMola = hesaplaYasalAraDinlenme(brutSaatCalc, activeMolaDk);
        appliedMolaDk = yasalMola;
        const netMins = Math.max(0, diffMins - yasalMola);
        const netSaatCalc = netMins / 60;
        netSureSaat = netSaatCalc > 0 && netSaatCalc < 0.1
          ? parseFloat(netSaatCalc.toFixed(2))
          : parseFloat(netSaatCalc.toFixed(1));

        // Geç kalma tespiti (gece vardiyası wrap-around destekli)
        const [sH, sM] = activeStartTime.split(':').map(Number);
        if (!isNaN(sH) && !isNaN(sM)) {
          let delayMin = (gH * 60 + gM) - (sH * 60 + sM);
          if (delayMin < -720) delayMin += 1440;
          if (delayMin > 720) delayMin -= 1440;
          if (delayMin > activeTolerance) {
            gecikmeDk = delayMin;
          }
        }

        // Planlanan mesai süresi üzeri fazla mesai
        const [eH, eM] = activeEndTime.split(':').map(Number);
        if (!isNaN(eH) && !isNaN(eM) && !isNaN(sH) && !isNaN(sM)) {
          let plannedShiftDiffMins = (eH * 60 + eM) - (sH * 60 + sM);
          if (plannedShiftDiffMins < 0) plannedShiftDiffMins += 24 * 60;
          const plannedShiftGrossHours = plannedShiftDiffMins / 60;
          const plannedBreakMins = hesaplaYasalAraDinlenme(plannedShiftGrossHours, activeMolaDk);
          const normalShiftMins = Math.max(0, plannedShiftDiffMins - plannedBreakMins);
          if (netMins > normalShiftMins) {
            fazlaMesaiSaat = parseFloat(((netMins - normalShiftMins) / 60).toFixed(1));
          }
        }
      }
    } else if (girisSaati && !cikisSaati) {
      // KULLANICI KESİN TALİMATI: Gün bitse bile vardiya ASLA otomatik kapatılmaz!
      // Gece 23'te başlatılan mesai ya da sabahtan açık unutulan mesai kapatılmaz, personel kendi kapatır.
      const [gH, gM] = girisSaati.split(':').map(Number);
      isOngoing = true;
      cikisSaati = null;

      if (!isNaN(gH) && !isNaN(gM)) {
        let workedSoFarMins = 0;
        const entryDateTime = new Date(`${tarih}T${girisSaati}:00`);
        if (!isNaN(entryDateTime.getTime())) {
          const diffMs = now.getTime() - entryDateTime.getTime();
          const elapsedMins = Math.max(0, Math.floor(diffMs / (1000 * 60)));
          if (elapsedMins > 0 && elapsedMins <= 16 * 60) {
            // Son 16 saat içinde başlayan aktif vardiya (bugün veya dünkü gece vardiyası)
            workedSoFarMins = elapsedMins;
          } else {
            // 16 saatten daha eski (açık unutulan mesai): 22 saat basılmaz!
            // Planlanan standart vardiya süresi baz alınır, çıkış boş (açık) kalır
            const [sH, sM] = activeStartTime.split(':').map(Number);
            const [eH, eM] = activeEndTime.split(':').map(Number);
            let plannedDiff = (eH * 60 + eM) - (sH * 60 + sM);
            if (plannedDiff < 0) plannedDiff += 1440;
            workedSoFarMins = plannedDiff > 0 ? plannedDiff : 480;
          }
        } else {
          workedSoFarMins = Math.max(0, currentMinutes - (gH * 60 + gM));
        }

        const brutSaatCalc = workedSoFarMins / 60;
        brutSureSaat = brutSaatCalc > 0 && brutSaatCalc < 0.1
          ? parseFloat(brutSaatCalc.toFixed(2))
          : parseFloat(brutSaatCalc.toFixed(1));
        const yasalMola = hesaplaYasalAraDinlenme(brutSaatCalc, activeMolaDk);
        appliedMolaDk = yasalMola;
        const netMins = Math.max(0, workedSoFarMins - yasalMola);
        const netSaatCalc = netMins / 60;
        netSureSaat = netSaatCalc > 0 && netSaatCalc < 0.1
          ? parseFloat(netSaatCalc.toFixed(2))
          : parseFloat(netSaatCalc.toFixed(1));
      }

      // Geç kalma tespiti
      const [sH, sM] = activeStartTime.split(':').map(Number);
      if (!isNaN(sH) && !isNaN(sM) && !isNaN(gH) && !isNaN(gM)) {
        let delayMin = (gH * 60 + gM) - (sH * 60 + sM);
        if (delayMin < -720) delayMin += 1440;
        if (delayMin > 720) delayMin -= 1440;
        if (delayMin > activeTolerance) {
          gecikmeDk = delayMin;
        }
      }
    }

    // Kod Tespiti
    let kod: PuantajKodu = '-';
    let kodAciklama = 'Kayıt Yok';
    let ubgtCalismasi = false;

    // Canlı veritabanından (pdks_vardiya_kayitlari) gelen puantaj etiketini kontrol et
    const realNotlar = realShift?.notlar || '';
    const puantajMatch = realNotlar.match(/\[PUANTAJ:([A-ZÇĞİÖŞÜ]+)\]/i);
    const dbPuantajKod = puantajMatch ? (puantajMatch[1].toUpperCase() as PuantajKodu) : null;
    const dbPuantajAciklama = dbPuantajKod ? realNotlar.replace(/\[PUANTAJ:[^\]]+\]/g, '').trim() : null;

    const effectiveKod = overrideData?.kod || dbPuantajKod;
    const effectiveKodAciklama = overrideData?.kodAciklama || dbPuantajAciklama;

    if (effectiveKod) {
      kod = effectiveKod;
      kodAciklama = effectiveKodAciklama || 'Manuel Düzenlendi';
      if (kod === 'Ç') {
        fiiliCalismaGun += 1;
        if (netSureSaat > 0) {
          fiiliCalismaSaat += netSureSaat;
        } else if (girisSaati || cikisSaati) {
          fiiliCalismaSaat += netSureSaat;
        } else {
          fiiliCalismaSaat += (shift?.start_time && shift?.end_time ? 8.5 : 9);
        }
      } else if (kod === 'HT') {
        haftaTatiliGun += 1;
      } else if (kod === 'AT') {
        akdiTatilGun += 1;
      } else if (kod === 'UBGT') {
        ubgtGun += 1;
      } else if (kod === 'Yİ' || kod === 'YI') {
        // Yıllık izin doğrudan toplam yıllık izin ve toplam izin kısmına yansır, günün gelmesini beklemez
        yillikIzinGun += 1;
        toplamIzinGun += 1;
      } else if (kod === 'R' || kod === 'HA' || kod === 'RP') {
        raporluGun += 1;
      } else if (kod === 'Üİ' || kod === 'UC') {
        const descLower = (kodAciklama || overrideData?.notlar || '').toLowerCase();
        if (descLower.includes('rapor') || descLower.includes('istirahat') || descLower.includes('hastalik') || descLower.includes('hastalık')) {
          kod = 'RP';
          raporluGun += 1;
        } else {
          ucretsizIzinGun += 1;
        }
      } else if (kod === 'Mİ' || kod === 'MZ') {
        ucretliIzinGun += 1;
        toplamIzinGun += 1;
      } else if (kod === 'D') {
        devamsizGun += 1;
      } else {
        const customLower = (kodAciklama || '').toLowerCase();
        if (customLower.includes('egitim') || customLower.includes('eğitim')) {
          egitimGun += 1;
        } else if (customLower.includes('rapor') || customLower.includes('istirahat') || (kod || '').toUpperCase() === 'RP') {
          raporluGun += 1;
        } else {
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      }
    } else if (resmiTatilInfo.isTatil) {
      if (girisSaati && (cikisSaati || isToday) && (netSureSaat > 0 || (girisSaati && cikisSaati))) {
        kod = 'Ç';
        kodAciklama = `Resmi Tatil Çalışması (${resmiTatilInfo.ad || 'UBGT'})`;
        ubgtCalismasi = true;
        ubgtCalisilanGun += 1;
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += fazlaMesaiSaat;
      } else {
        kod = 'UBGT';
        kodAciklama = resmiTatilInfo.ad || 'Resmi Tatil';
        if (!isFuture) ubgtGun += 1;
      }
    } else if (isCumartesi && !isCumartesiCalisma) {
      // 5 Günlük Çalışma Düzeni: Cumartesi günü Akdi Tatildir (AT).
      // İzin aralığına denk gelse dahi izinler toplamına yazılmaz ve izin sayılmaz.
      if (girisSaati && (cikisSaati || isToday) && (netSureSaat > 0 || (girisSaati && cikisSaati))) {
        kod = 'Ç';
        kodAciklama = 'Cumartesi Akdi Tatil Çalışması';
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += (fazlaMesaiSaat || netSureSaat);
      } else {
        kod = 'AT';
        kodAciklama = 'Akdi Tatil (5 Günlük Düzen)';
        if (!isFuture) akdiTatilGun += 1;
      }
    } else if (approvedLeave) {
      // İzin Talebi: Eğer izin Pazar gününe denk geliyorsa Pazar günü de izne dahil edilir
      const rawTur = approvedLeave.izinTuru || approvedLeave.izin_turu || '';
      const turLower = String(rawTur).trim().toLowerCase();

      // Şirkete tanımlı izin türlerini al (parametre verilmemişse dinamik depodan yükle)
      const companyTurler = (leaveTypes && leaveTypes.length > 0)
        ? leaveTypes
        : getCompanyIzinTurleri(employee.company_id);

      // İlgili izin tanımını bul (id, kod veya ad üzerinden)
      const matched = companyTurler.find((t: any) => {
        const idLower = (t.id || '').toLowerCase();
        const kodLower = (t.kod || '').toLowerCase();
        const adLower = (t.ad || '').toLowerCase();
        return (
          idLower === turLower ||
          kodLower === turLower ||
          adLower === turLower ||
          turLower.startsWith(idLower) ||
          idLower.startsWith(turLower)
        );
      });

      const isRapor =
        matched?.id === 'hastalik' ||
        matched?.kod?.toUpperCase() === 'RP' ||
        matched?.kod?.toUpperCase() === 'R' ||
        turLower.includes('rapor') ||
        turLower.includes('istirahat') ||
        turLower.includes('hastalik') ||
        turLower.includes('hastalık');

      const isEgitim =
        !isRapor &&
        (turLower.includes('egitim') ||
         turLower.includes('eğitim') ||
         matched?.id === 'egitim' ||
         matched?.kod?.toUpperCase() === 'EG');

      const isYillik =
        !isRapor &&
        (turLower.includes('yillik') ||
         turLower.includes('yıllık') ||
         matched?.id === 'yillik' ||
         matched?.kod?.toUpperCase() === 'YI' ||
         matched?.kod?.toUpperCase() === 'Yİ');

      const isUnpaid =
        !isRapor &&
        !isEgitim &&
        !isYillik &&
        (turLower.includes('ucretsiz') ||
         turLower.includes('ücretsiz') ||
         matched?.id === 'ucretsiz' ||
         matched?.kod?.toUpperCase() === 'UC' ||
         matched?.kod?.toUpperCase() === 'Üİ' ||
         (matched?.ucretli === false && !turLower.includes('rapor') && !turLower.includes('hastalik') && !turLower.includes('hastalık') && !turLower.includes('istirahat')));

      if (isRapor) {
        // İstirahat / SGK Raporu (RP veya R)
        let shortCode = matched?.kod ? String(matched.kod).toUpperCase() : 'RP';
        if (shortCode !== 'R' && shortCode !== 'RP' && shortCode !== 'HA') shortCode = 'RP';
        kod = shortCode as PuantajKodu;
        kodAciklama = matched?.ad || 'İstirahat (SGK Raporu)';
        raporluGun += 1;
      } else if (isEgitim) {
        // Eğitim İzni: Toplam izin kısmında toplanmaz, bordro tam hak ediş olarak korunur
        kod = 'EG';
        kodAciklama = matched?.ad || 'Eğitim İzni';
        egitimGun += 1;
      } else if (isYillik) {
        // Yıllık Ücretli İzin: Doğrudan toplam yıllık izin ve toplam izin kısmına yansır, günlerin gelmesini beklemez
        kod = 'Yİ';
        kodAciklama = matched?.ad || 'Yıllık Ücretli İzin';
        yillikIzinGun += 1;
        toplamIzinGun += 1;
      } else if (isUnpaid) {
        // Ücretsiz İzin: Özel sütunu için toplanır
        kod = 'Üİ';
        kodAciklama = matched?.ad || 'Ücretsiz İzin';
        ucretsizIzinGun += 1;
      } else if (turLower.includes('mazeret') || turLower.includes('evlilik') || turLower.includes('olum') || turLower.includes('ölüm') || turLower.includes('babalik') || turLower.includes('dogum')) {
        // Ücretli mazeret izinleri
        kod = matched?.kod ? String(matched.kod).toUpperCase() : 'Mİ';
        if (kod === 'MZ') kod = 'Mİ';
        kodAciklama = matched?.ad || 'Ücretli Mazeret İzni';
        ucretliIzinGun += 1;
        toplamIzinGun += 1;
      } else if (matched) {
        let shortCode = matched.kod ? String(matched.kod).toUpperCase() : 'İ';
        if (shortCode === 'YI') shortCode = 'Yİ';
        if (shortCode === 'MZ') shortCode = 'Mİ';
        if (shortCode === 'HA' || shortCode === 'RP' || shortCode === 'R') {
          kod = shortCode === 'R' ? 'R' : 'RP';
          kodAciklama = matched.ad || 'İstirahat (SGK Raporu)';
          raporluGun += 1;
        } else if (shortCode === 'UC' || shortCode === 'Üİ' || matched.ucretli === false) {
          kod = 'Üİ';
          kodAciklama = matched.ad || 'Ücretsiz İzin';
          ucretsizIzinGun += 1;
        } else if (shortCode === 'EG') {
          kod = 'EG';
          kodAciklama = matched.ad || 'Eğitim İzni';
          egitimGun += 1;
        } else {
          kod = shortCode;
          kodAciklama = matched.ad || 'İzin';
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      } else {
        // Tanımsız özel izin metni durumunda
        const title = formatIzinTuru(rawTur, employee.company_id);
        const titleLower = title.toLowerCase();
        if (titleLower.includes('rapor') || titleLower.includes('istirahat') || titleLower.includes('hastalik') || titleLower.includes('hastalık')) {
          kod = 'RP';
          kodAciklama = title;
          raporluGun += 1;
        } else if (titleLower.includes('ucret') || titleLower.includes('ücret') || titleLower.includes('ucretsiz') || titleLower.includes('ücretsiz')) {
          kod = 'Üİ';
          kodAciklama = title;
          ucretsizIzinGun += 1;
        } else {
          const words = title.split(/\s+/).filter(Boolean);
          let derivedKod = words.length >= 2
            ? (words[0][0] + words[1][0]).toUpperCase()
            : title.substring(0, 2).toUpperCase();
          kod = derivedKod || 'İ';
          kodAciklama = title;
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      }
    } else if (isPazar) {
      // Pazar günü (İzinli değilse): Hafta Tatilidir (HT).
      if (girisSaati) {
        kod = 'Ç';
        kodAciklama = 'Pazar Hafta Tatili Çalışması (Fazla Mesai)';
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += (netSureSaat > 0 ? netSureSaat : 7.5);
      } else {
        kod = 'HT';
        kodAciklama = 'Hafta Tatili (İş Kanunu Madde 46)';
        if (!isFuture) haftaTatiliGun += 1;
      }
    } else if (isCumartesi && isCumartesiCalisma) {
      // 6 Günlük Çalışma Düzeni (Cumartesi normal çalışma günü)
      if (girisSaati) {
        kod = 'Ç';
        if (isOngoing || !cikisSaati) {
          kodAciklama = `Cumartesi Vardiyası Devam Ediyor (Planlanan Bitiş: ${activeEndTime})`;
        } else {
          kodAciklama = `Cumartesi Fiili Çalışma (${netSureSaat} saat)`;
        }
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += fazlaMesaiSaat;
      } else if (isFuture) {
        kod = '-';
        kodAciklama = 'Gelecek Gün / Henüz Gerçekleşmedi';
      } else if (isToday) {
        kod = '-';
        kodAciklama = 'Bugün / Henüz Giriş Yapılmadı';
      } else {
        kod = 'D';
        kodAciklama = 'Devamsız / Cumartesi Mesaisine Giriş Yapılmadı';
        devamsizGun += 1;
      }
    } else if (girisSaati) {
      kod = 'Ç';
      if (isOngoing || !cikisSaati) {
        kodAciklama = `Vardiyası Devam Ediyor (Giriş: ${girisSaati}${isToday ? ` - Planlanan Bitiş: ${activeEndTime}` : ' - Çıkış Yapılmadı'})`;
      } else {
        kodAciklama = `Fiili Çalışma (${netSureSaat} saat)`;
      }
      fiiliCalismaGun += 1;
      fiiliCalismaSaat += netSureSaat;
      toplamFazlaMesaiSaat += fazlaMesaiSaat;
    } else if (isFuture) {
      // Gelecek gün: Henüz gelmedi, Ç yazılamaz!
      kod = '-';
      kodAciklama = 'Gelecek Gün / Henüz Gerçekleşmedi';
    } else if (isToday) {
      // Bugün: Henüz giriş yapılmamış olabilir
      kod = '-';
      kodAciklama = 'Bugün / Henüz Giriş Yapılmadı';
    } else {
      // Geçmiş gün ve hiçbir giriş yok
      kod = 'D';
      kodAciklama = 'Devamsız / İşe Giriş Yapılmadı';
      devamsizGun += 1;
    }

    toplamGecikmeDk += gecikmeDk;

    // Yasal Sınır Kontrolleri (Madde 63: 11 saat; Gece: 7.5 saat)
    const yasalUyari11Saat = netSureSaat > 11;
    let yasalUyariGece = false;
    if (girisSaati && cikisSaati) {
      const [gH] = girisSaati.split(':').map(Number);
      const [cH] = cikisSaati.split(':').map(Number);
      if ((gH >= 20 || gH < 6 || cH >= 20 || cH < 6) && netSureSaat > 7.5) {
        yasalUyariGece = true;
      }
    }

    return {
      tarih,
      gunNo,
      gunAdi,
      isWeekend,
      isPazar,
      isCumartesi,
      isCumartesiCalisma,
      isResmiTatil: resmiTatilInfo.isTatil,
      resmiTatilAdi: resmiTatilInfo.ad,
      kod,
      kodAciklama,
      girisSaati,
      cikisSaati,
      brutSureSaat,
      molaDk: appliedMolaDk,
      netSureSaat,
      fazlaMesaiSaat,
      gecikmeDk,
      ubgtCalismasi,
      yasalUyari11Saat,
      yasalUyariGece,
      notlar: overrideData?.notlar || realShift?.notlar || undefined,
      isOngoing,
    };
  });

  // 4857 Sayılı Kanun Uyarınca Aylık Maktu Ücretli Bordro Günü Hesabı (30 Gün Kuralı)
  const isCurrentMonth = (new Date().getFullYear() === year && new Date().getMonth() === monthIndex);
  let bordroGun = 0;
  if (isCurrentMonth) {
    // İçinde bulunulan ay: şu ana kadar fiilen çalışılan ve hak kazanılan günler
    bordroGun = Math.min(30, fiiliCalismaGun + haftaTatiliGun + akdiTatilGun + yillikIzinGun + ucretliIzinGun + ubgtGun + egitimGun);
  } else {
    // Tamamlanmış geçmiş ay: 30 gün standardı - eksik günler
    const toplamEksikGun = raporluGun + ucretsizIzinGun + devamsizGun;
    bordroGun = Math.max(0, 30 - toplamEksikGun);
  }

  return {
    employee,
    shift: activeShift,
    gunler,
    ozet: {
      fiiliCalismaGun,
      fiiliCalismaSaat: fiiliCalismaSaat > 0 && fiiliCalismaSaat < 0.1 ? parseFloat(fiiliCalismaSaat.toFixed(2)) : parseFloat(fiiliCalismaSaat.toFixed(1)),
      haftaTatiliGun,
      akdiTatilGun,
      yillikIzinGun,
      ucretliIzinGun,
      toplamIzinGun,
      ucretsizIzinGun,
      egitimGun,
      raporluGun,
      devamsizGun,
      ubgtGun,
      ubgtCalisilanGun,
      toplamFazlaMesaiSaat: toplamFazlaMesaiSaat > 0 && toplamFazlaMesaiSaat < 0.1 ? parseFloat(toplamFazlaMesaiSaat.toFixed(2)) : parseFloat(toplamFazlaMesaiSaat.toFixed(1)),
      toplamGecikmeDk,
      bordroGun,
    },
  };
}
