// Puantaj Hesaplama ve Mevzuat Motoru (4857 Sayılı İş Kanunu & UBGT Kuralları)

import { Employee } from '../types';
import { VardiyaKaydi } from '../services/pdksService';
import { CompanyShift } from '../services/shiftService';

export type PuantajKodu = 
  | 'Ç'    // Normal Fiili Çalışma
  | 'HT'   // Hafta Tatili (Pazar / Madde 46 - Ücretli 1 Gün)
  | 'AT'   // Akdi Tatil (Cumartesi / 5 günlük haftalık düzen)
  | 'UBGT' // Ulusal Bayram ve Genel Tatil (Resmi Tatil)
  | 'Yİ'   // Yıllık Ücretli İzin
  | 'Mİ'   // Mazeret İzni (Evlilik, Ölüm, Babalık vb. - Ücretli)
  | 'R'    // İstirahat / SGK Raporu (Eksik gün)
  | 'Üİ'   // Ücretsiz İzin (Eksik gün)
  | 'D'    // Devamsız (Mazeretsiz işe gelmeme - Eksik gün)
  | '-';   // Henüz Gelmemiş / Kayıt Yok

export interface GunlukPuantajDetay {
  tarih: string;           // YYYY-MM-DD
  gunNo: number;           // 1 - 31
  gunAdi: string;          // Pzt, Sal, Çar, Per, Cum, Cmt, Paz
  isWeekend: boolean;      // Cumartesi veya Pazar mı
  isPazar: boolean;
  isCumartesi: boolean;
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
    ucretliIzinGun: number;    // Yİ + Mİ
    raporluGun: number;        // R
    ucretsizIzinGun: number;   // Üİ
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
  if (vardiyaMolaDk && vardiyaMolaDk > 0) return vardiyaMolaDk;
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
 * Tek bir personelin belirli bir ay için tam puantajını hesaplar
 */
export function hesaplaPersonelAylikPuantaj(params: {
  employee: Employee;
  year: number;
  monthIndex: number;
  shift: CompanyShift;
  vardiyaKayitlari: VardiyaKaydi[];
  izinTalepleri: any[];
  adminOverrides?: Record<string, any>;
}): PersonelAylikPuantaj {
  const { employee, year, monthIndex, shift, vardiyaKayitlari, izinTalepleri, adminOverrides = {} } = params;

  const monthDays = getAyinGunleri(year, monthIndex);
  const shiftTolerance = shift.tolerance_minutes || 15;
  const shiftMolaDk = shift.break_minutes || 60;

  let fiiliCalismaGun = 0;
  let fiiliCalismaSaat = 0;
  let haftaTatiliGun = 0;
  let akdiTatilGun = 0;
  let ucretliIzinGun = 0;
  let raporluGun = 0;
  let ucretsizIzinGun = 0;
  let devamsizGun = 0;
  let ubgtGun = 0;
  let ubgtCalisilanGun = 0;
  let toplamFazlaMesaiSaat = 0;
  let toplamGecikmeDk = 0;

  const gunler: GunlukPuantajDetay[] = monthDays.map((day) => {
    const { tarih, gunNo, gunAdi, isPazar, isCumartesi } = day;
    const isWeekend = isPazar || isCumartesi;
    const resmiTatilInfo = checkIsResmiTatil(tarih);

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

        const yasalMola = hesaplaYasalAraDinlenme(brutSureSaat, shiftMolaDk);
        const netMins = Math.max(0, diffMins - yasalMola);
        netSureSaat = parseFloat((netMins / 60).toFixed(1));

        // Geç kalma tespiti
        const [sH, sM] = shift.start_time.split(':').map(Number);
        if (!isNaN(sH) && !isNaN(sM)) {
          const shiftStartMin = sH * 60 + sM + shiftTolerance;
          const userGirisMin = gH * 60 + gM;
          if (userGirisMin > shiftStartMin) {
            gecikmeDk = userGirisMin - (sH * 60 + sM);
          }
        }

        // Günlük 8 saat / 9 saat üzeri fazla mesai
        const [eH, eM] = shift.end_time.split(':').map(Number);
        if (!isNaN(eH) && !isNaN(eM)) {
          const normalShiftMins = Math.max(0, (eH * 60 + eM) - (sH * 60 + sM) - shiftMolaDk);
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
    } else if (approvedLeave) {
      const tur = (approvedLeave.izinTuru || '').toLowerCase();
      if (tur.includes('rapor') || tur.includes('hastalik') || tur === '-r' || tur === 'r') {
        kod = 'R';
        kodAciklama = 'İstirahat (SGK Raporu)';
        if (!isFuture) raporluGun += 1;
      } else if (tur.includes('ucret') || tur.includes('ücret')) {
        kod = 'Üİ';
        kodAciklama = 'Ücretsiz İzin';
        if (!isFuture) ucretsizIzinGun += 1;
      } else if (tur.includes('mazeret') || tur.includes('evlilik') || tur.includes('olum') || tur.includes('ölüm') || tur.includes('babalik')) {
        kod = 'Mİ';
        kodAciklama = 'Ücretli Mazeret İzni';
        if (!isFuture) ucretliIzinGun += 1;
      } else {
        kod = 'Yİ';
        kodAciklama = 'Yıllık Ücretli İzin';
        if (!isFuture) ucretliIzinGun += 1;
      }
    } else if (isPazar) {
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
    } else if (isCumartesi) {
      if (girisSaati && cikisSaati && netSureSaat > 0) {
        kod = 'Ç';
        kodAciklama = 'Cumartesi Akdi Tatil Çalışması';
        fiiliCalismaGun += 1;
        fiiliCalismaSaat += netSureSaat;
        toplamFazlaMesaiSaat += fazlaMesaiSaat;
      } else {
        kod = 'AT';
        kodAciklama = 'Akdi Tatil (5 Günlük Düzen)';
        if (!isFuture) akdiTatilGun += 1;
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
      isResmiTatil: resmiTatilInfo.isTatil,
      resmiTatilAdi: resmiTatilInfo.ad,
      kod,
      kodAciklama,
      girisSaati,
      cikisSaati,
      brutSureSaat,
      molaDk: shiftMolaDk,
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
    bordroGun = fiiliCalismaGun + haftaTatiliGun + akdiTatilGun + ucretliIzinGun + ubgtGun;
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
      ucretliIzinGun,
      raporluGun,
      ucretsizIzinGun,
      devamsizGun,
      ubgtGun,
      ubgtCalisilanGun,
      toplamFazlaMesaiSaat: parseFloat(toplamFazlaMesaiSaat.toFixed(1)),
      toplamGecikmeDk,
      bordroGun,
    },
  };
}
