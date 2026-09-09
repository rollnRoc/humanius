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
  if (vardiyaMolaDk !== undefined && vardiyaMolaDk !== null && vardiyaMolaDk >= 0) return vardiyaMolaDk;
  if (brutSaat <= 4) return 15;
  if (brutSaat <= 7.5) return 30;
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
  // Giriş ve çıkış saati mevcutsa aradaki net süreyi hesapla
  if (gun.girisSaati && gun.cikisSaati) {
    const [gH, gM] = gun.girisSaati.split(':').map(Number);
    const [cH, cM] = gun.cikisSaati.split(':').map(Number);
    if (!isNaN(gH) && !isNaN(gM) && !isNaN(cH) && !isNaN(cM)) {
      let diffMins = (cH * 60 + cM) - (gH * 60 + gM);
      if (diffMins < 0) diffMins += 24 * 60;
      const netMins = Math.max(0, diffMins - (gun.molaDk ?? 60));
      const calculated = parseFloat((netMins / 60).toFixed(1));
      if (calculated > 0) return calculated;
    }
  }
  // Cumartesi çalışma aktifse Cumartesiye özel planlanan net çalışma süresi
  if (gun.isCumartesi && gun.isCumartesiCalisma && saturdayConfig?.isSaturdayWork) {
    const sStr = saturdayConfig.startTime || '08:30';
    const eStr = saturdayConfig.endTime || '16:00';
    const [sH, sM] = sStr.split(':').map(Number);
    const [eH, eM] = eStr.split(':').map(Number);
    if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
      let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
      if (diffMins < 0) diffMins += 24 * 60;
      const mola = Number(saturdayConfig.breakMinutes ?? 30);
      const netMins = Math.max(0, diffMins - mola);
      const calculated = parseFloat((netMins / 60).toFixed(1));
      if (calculated > 0) return calculated;
    }
  }
  // Vardiya planındaki net çalışma süresi
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

/**
 * Tek bir personelin belirli bir ay için tam puantajını hesaplar
 */
export function hesaplaPersonelAylikPuantaj(params: {
  employee: Employee;
  year: number;
  monthIndex: number;
  shift?: CompanyShift;
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

    // Vardiya parametreleri (Cumartesi çalışma aktifse Cumartesiye özel saatler kullanılır)
    let activeStartTime = activeShift.start_time;
    let activeEndTime = activeShift.end_time;
    let activeMolaDk = shiftMolaDk;
    let activeTolerance = shiftTolerance;

    if (isCumartesiCalisma && saturdayConfig) {
      activeStartTime = saturdayConfig.startTime || '08:30';
      activeEndTime = saturdayConfig.endTime || '16:00';
      activeMolaDk = Number(saturdayConfig.breakMinutes ?? 30);
      activeTolerance = Number(saturdayConfig.toleranceMinutes ?? 15);
    }

    // 0. Öncelik: Manuel İK Düzeltmesi (Override)
    const overrideKey = `${employee.id}_${tarih}`;
    const overrideData = adminOverrides[overrideKey];

    // 1. Öncelik: İzin Talebi
    const approvedLeave = (izinTalepleri || []).find((t) => {
      if (t.employeeId !== employee.id || t.durum !== 'onaylandi') return false;
      const s = (t.baslangicTarihi || '').split('T')[0];
      const e = (t.bitisTarihi || '').split('T')[0];
      return Boolean(s && e && tarih >= s && tarih <= e);
    });

    // 2. Öncelik: Gerçek PDKS Giriş-Çıkış Kaydı
    const realShift = (vardiyaKayitlari || []).find((v) => v.employee_id === employee.id && v.tarih === tarih);

    let girisSaati: string | null = overrideData?.giris !== undefined ? overrideData.giris : realShift?.giris_saati || null;
    let cikisSaati: string | null = overrideData?.cikis !== undefined ? overrideData.cikis : realShift?.cikis_saati || null;

    if (girisSaati === '-') girisSaati = null;
    if (cikisSaati === '-') cikisSaati = null;

    // Süre hesaplama
    let brutSureSaat = 0;
    let netSureSaat = 0;
    let fazlaMesaiSaat = 0;
    let gecikmeDk = 0;

    if (girisSaati && cikisSaati) {
      const [gH, gM] = girisSaati.split(':').map(Number);
      const [cH, cM] = cikisSaati.split(':').map(Number);
      if (!isNaN(gH) && !isNaN(gM) && !isNaN(cH) && !isNaN(cM)) {
        let diffMins = (cH * 60 + cM) - (gH * 60 + gM);
        if (diffMins < 0) diffMins += 24 * 60; // Gece vardiyası
        brutSureSaat = parseFloat((diffMins / 60).toFixed(1));

        const yasalMola = hesaplaYasalAraDinlenme(brutSureSaat, activeMolaDk);
        const netMins = Math.max(0, diffMins - yasalMola);
        netSureSaat = parseFloat((netMins / 60).toFixed(1));

        // Geç kalma tespiti
        const [sH, sM] = activeStartTime.split(':').map(Number);
        if (!isNaN(sH) && !isNaN(sM)) {
          const shiftStartMin = sH * 60 + sM + activeTolerance;
          const userGirisMin = gH * 60 + gM;
          if (userGirisMin > shiftStartMin) {
            gecikmeDk = userGirisMin - (sH * 60 + sM);
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
    }

    // Tarih zaman durumu
    const todayYMD = new Date().toISOString().split('T')[0];
    const isFuture = tarih > todayYMD;
    const isToday = tarih === todayYMD;
    const isPast = tarih < todayYMD;

    // Kod Tespiti
    let kod: PuantajKodu = '-';
    let kodAciklama = 'Kayıt Yok';
    let ubgtCalismasi = false;

    if (overrideData?.kod) {
      kod = overrideData.kod;
      kodAciklama = overrideData.kodAciklama || 'Manuel Düzenlendi';
      if (kod === 'Ç') {
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat || 9;
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
      } else if (kod === 'Üİ' || kod === 'UC') {
        ucretsizIzinGun += 1;
      } else if (kod === 'EG') {
        // Eğitim izni izinler toplamında toplanmaz
        egitimGun += 1;
      } else if (kod === 'R' || kod === 'HA') {
        raporluGun += 1;
      } else if (kod === 'Mİ' || kod === 'MZ') {
        ucretliIzinGun += 1;
        toplamIzinGun += 1;
      } else if (kod === 'D') {
        devamsizGun += 1;
      } else {
        const customLower = (kodAciklama || '').toLowerCase();
        if (customLower.includes('egitim') || customLower.includes('eğitim')) {
          egitimGun += 1;
        } else {
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      }
    } else if (resmiTatilInfo.isTatil) {
      if (girisSaati && cikisSaati && netSureSaat > 0) {
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
    } else if (isPazar) {
      // Pazar günü: İş Kanunu Madde 46 uyarınca Hafta Tatilidir (HT).
      // İzin aralığına denk gelse dahi izinler toplamına yazılmaz ve izin sayılmaz.
      if (girisSaati && cikisSaati && netSureSaat > 0) {
        kod = 'Ç';
        kodAciklama = 'Pazar Hafta Tatili Çalışması (Fazla Mesai)';
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += netSureSaat; // Pazar mesaisi doğrudan FM sayılır
      } else {
        kod = 'HT';
        kodAciklama = 'Hafta Tatili (İş Kanunu Madde 46)';
        if (!isFuture) haftaTatiliGun += 1;
      }
    } else if (isCumartesi && !isCumartesiCalisma) {
      // 5 Günlük Çalışma Düzeni: Cumartesi günü Akdi Tatildir (AT).
      // İzin aralığına denk gelse dahi izinler toplamına yazılmaz ve izin sayılmaz.
      if (girisSaati && cikisSaati && netSureSaat > 0) {
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

      const isEgitim = turLower.includes('egitim') || turLower.includes('eğitim') || matched?.id === 'egitim' || matched?.kod?.toUpperCase() === 'EG';
      const isYillik = turLower.includes('yillik') || turLower.includes('yıllık') || matched?.id === 'yillik' || matched?.kod?.toUpperCase() === 'YI' || matched?.kod?.toUpperCase() === 'Yİ';
      const isUnpaid = matched?.ucretli === false || turLower.includes('ucret') || turLower.includes('ücret') || matched?.id === 'ucretsiz' || matched?.kod?.toUpperCase() === 'UC' || matched?.kod?.toUpperCase() === 'Üİ';
      const isRapor = matched?.id === 'hastalik' || matched?.kod?.toUpperCase() === 'HA' || matched?.kod?.toUpperCase() === 'R' || turLower.includes('rapor') || turLower.includes('hastalik') || turLower === 'r' || turLower === '-r';

      if (isEgitim) {
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
      } else if (isRapor) {
        // İstirahat / SGK Raporu
        kod = 'R';
        kodAciklama = matched?.ad || 'İstirahat (SGK Raporu)';
        if (!isFuture) raporluGun += 1;
      } else if (turLower.includes('mazeret') || turLower.includes('evlilik') || turLower.includes('olum') || turLower.includes('ölüm') || turLower.includes('babalik') || turLower.includes('dogum')) {
        // Ücretli mazeret izinleri
        kod = matched?.kod ? String(matched.kod).toUpperCase() : 'Mİ';
        if (kod === 'MZ') kod = 'Mİ';
        kodAciklama = matched?.ad || 'Ücretli Mazeret İzni';
        if (!isFuture) {
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      } else if (matched) {
        let shortCode = matched.kod ? String(matched.kod).toUpperCase() : 'İ';
        if (shortCode === 'YI') shortCode = 'Yİ';
        if (shortCode === 'MZ') shortCode = 'Mİ';
        if (shortCode === 'HA') shortCode = 'R';
        if (shortCode === 'UC') shortCode = 'Üİ';
        if (shortCode === 'EG') shortCode = 'EG';

        kod = shortCode;
        kodAciklama = matched.ad || 'İzin';

        if (kod === 'EG') {
          egitimGun += 1;
        } else if (!isFuture) {
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      } else {
        // Tanımsız özel izin metni durumunda baş harflerden kısa kod üret
        const title = formatIzinTuru(rawTur, employee.company_id);
        const words = title.split(/\s+/).filter(Boolean);
        let derivedKod = words.length >= 2
          ? (words[0][0] + words[1][0]).toUpperCase()
          : title.substring(0, 2).toUpperCase();
        kod = derivedKod || 'İ';
        kodAciklama = title;
        if (!isFuture) {
          ucretliIzinGun += 1;
          toplamIzinGun += 1;
        }
      }
    } else if (isCumartesi && isCumartesiCalisma) {
      // 6 Günlük Çalışma Düzeni (Cumartesi normal çalışma günü)
      if (girisSaati && (cikisSaati || isToday)) {
        kod = 'Ç';
        kodAciklama = `Cumartesi Fiili Çalışma (${netSureSaat} saat)`;
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
    } else if (girisSaati && (cikisSaati || isToday)) {
      kod = 'Ç';
      kodAciklama = `Fiili Çalışma (${netSureSaat} saat)`;
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
      molaDk: activeMolaDk,
      netSureSaat,
      fazlaMesaiSaat,
      gecikmeDk,
      ubgtCalismasi,
      yasalUyari11Saat,
      yasalUyariGece,
      notlar: overrideData?.notlar || realShift?.notlar || undefined,
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
    shift,
    gunler,
    ozet: {
      fiiliCalismaGun,
      fiiliCalismaSaat: parseFloat(fiiliCalismaSaat.toFixed(1)),
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
      toplamFazlaMesaiSaat: parseFloat(toplamFazlaMesaiSaat.toFixed(1)),
      toplamGecikmeDk,
      bordroGun,
    },
  };
}
