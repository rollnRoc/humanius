// ─── 2026 Parametreleri ──────────────────────────────────────────────────────

const ASGARI_UCRET = 22104.67;
const SGK_TAVAN = 166085.40;

const SGK_ISCI_ORANI = 0.14;
const ISSIZLIK_ISCI_ORANI = 0.01;
const SGK_ISVEREN_ORANI = 0.155;
const ISSIZLIK_ISVEREN_ORANI = 0.02;
const DAMGA_VERGISI_ORANI = 0.00759;

// 2026 Gelir Vergisi Dilimleri — kümülatif sınırlar (GİB'e göre)
const GV_DILIMLERI = [
  { limit: 158_000,   oran: 0.15 },
  { limit: 330_000,   oran: 0.20 },
  { limit: 1_200_000, oran: 0.27 },
  { limit: 4_300_000, oran: 0.35 },
  { limit: Infinity,  oran: 0.40 },
];

// Asgari ücretin aylık GV matrahı (SGK+işsizlik kesintisi sonrası)
const ASGARI_UCRET_GV_MATRAHI_AYLIK =
  ASGARI_UCRET * (1 - SGK_ISCI_ORANI - ISSIZLIK_ISCI_ORANI);

// Asgari ücretin aylık damga vergisi (her ay sabit istisna)
const ASGARI_UCRET_DAMGA_ISTISNASI = ASGARI_UCRET * DAMGA_VERGISI_ORANI;

// ─── Kümülatif GV Hesaplama ──────────────────────────────────────────────────
/**
 * 0'dan `matrah` tutarına kadar birikimli olarak hesaplanan toplam gelir
 * vergisini döndürür. CorporatePayrollCalculator'daki totalIncomeTax ile
 * aynı mantığı kullanır.
 */
function hesaplaToplamGV(matrah: number): number {
  if (matrah <= 0) return 0;
  let vergi = 0;
  let prevLimit = 0;
  for (const dilim of GV_DILIMLERI) {
    const dilimBasi = prevLimit;
    const dilimSonu = Math.min(matrah, dilim.limit);
    if (dilimSonu <= dilimBasi) break;
    vergi += (dilimSonu - dilimBasi) * dilim.oran;
    prevLimit = dilim.limit;
    if (matrah <= dilim.limit) break;
  }
  return vergi;
}

// ─── Ana Hesaplama ───────────────────────────────────────────────────────────

export interface BordroHesapInput {
  id?: string;
  employeeId: string;
  employeeName?: string;
  period: string;
  sicilNo?: string;
  tcNo?: string;
  temelKazanc: number;
  isEmekli?: boolean;
  medeniDurum?: 'bekar' | 'evli';
  cocukSayisi?: number;
  sgkIsverenIndirimOrani?: number;
  yolParasi?: number;
  gidaYardimi?: number;
  cocukYardimi?: number;
  digerKazanclar?: number;
  fazlaMesai?: number;
  fazlaMesaiSaat50?: number;
  fazlaMesaiSaat100?: number;
  haftalikTatil?: number;
  genelTatil?: number;
  yillikIzinUcreti?: number;
  ikramiye?: number;
  prim?: number;
  servisUcreti?: number;
  temsilEtiket?: number;
  sendikaidat?: number;
  avans?: number;
  besKesintisi?: number;
  icraKesintisi?: number;
  digerKesintiler?: number;
  engelliIndirimi?: number;
  maasTipi?: 'brut' | 'net';
  createdAt?: string;
  updatedAt?: string;
}

export interface BordroHesapResult extends BordroHesapInput {
  fazlaMesaiTutar: number;
  toplamKazanc: number;
  sgkIsciPayi: number;
  issizlikSigortasi: number;
  gelirVergisi: number;
  damgaVergisi: number;
  sgkIsverenPayi: number;
  issizlikIsverenPayi: number;
  sgkIsverenIndirimi: number;
  asgariUcretGelirVergisiIstisnasi: number;
  asgariUcretDamgaVergisiIstisnasi: number;
  toplamKesinti: number;
  netMaas: number;
  kumulatifVergiMatrahi: number;
  toplamIsverenMaliyeti: number;
  saatlikUcret: number;
  gunlukUcret: number;
}

export function calculateBordro(
  input: BordroHesapInput,
  _oncekiAyVeri?: unknown,
  ayNo: number = 1,
  /** Önceki ayların toplam GV matrahı (birikimli). Ocak=0. */
  oncekiAylarGVMatrahi: number = 0,
  _unused?: unknown
): BordroHesapResult {
  const {
    temelKazanc = 0,
    isEmekli = false,
    yolParasi = 0,
    gidaYardimi = 0,
    cocukYardimi = 0,
    digerKazanclar = 0,
    fazlaMesaiSaat50 = 0,
    fazlaMesaiSaat100 = 0,
    haftalikTatil = 0,
    genelTatil = 0,
    yillikIzinUcreti = 0,
    ikramiye = 0,
    prim = 0,
    servisUcreti = 0,
    temsilEtiket = 0,
    sendikaidat = 0,
    avans = 0,
    besKesintisi = 0,
    icraKesintisi = 0,
    digerKesintiler = 0,
    engelliIndirimi = 0,
    sgkIsverenIndirimOrani = 5,
  } = input;

  // SGK ve İşsizlik Oranları (Emekli SGDP vs Normal)
  const isciSgkOrani = isEmekli ? 0.075 : SGK_ISCI_ORANI; // Emekli SGDP İşçi = %7.5
  const isciIssizlikOrani = isEmekli ? 0 : ISSIZLIK_ISCI_ORANI; // Emekli İşsizlik = %0
  const isverenSgkOrani = isEmekli ? 0.245 : SGK_ISVEREN_ORANI; // Emekli SGDP İşveren = %24.5
  const isverenIssizlikOrani = isEmekli ? 0 : ISSIZLIK_ISVEREN_ORANI; // Emekli İşveren İşsizlik = %0

  // Fazla mesai hesabı
  const saatlikUcret = temelKazanc / 225;
  const fazlaMesaiTutar =
    saatlikUcret * 1.5 * fazlaMesaiSaat50 + saatlikUcret * 2 * fazlaMesaiSaat100;

  const toplamKazanc =
    temelKazanc +
    yolParasi +
    gidaYardimi +
    cocukYardimi +
    digerKazanclar +
    fazlaMesaiTutar +
    haftalikTatil +
    genelTatil +
    yillikIzinUcreti +
    ikramiye +
    prim +
    servisUcreti +
    temsilEtiket;

  // SGK matrahı tavana göre kırp
  const sgkMatrahi = Math.min(toplamKazanc, SGK_TAVAN);
  const sgkIsciPayi = sgkMatrahi * isciSgkOrani;
  const issizlikSigortasi = sgkMatrahi * isciIssizlikOrani;

  // İşveren payları
  const sgkIsverenPayi = sgkMatrahi * isverenSgkOrani;
  const issizlikIsverenPayi = sgkMatrahi * isverenIssizlikOrani;
  const sgkIsverenIndirimi = sgkIsverenPayi * (sgkIsverenIndirimOrani / 100);

  // ── Gelir Vergisi (Kümülatif Yöntem) ────────────────────────────────────────
  // Bu ayın GV matrahı
  const gvMatrahi = Math.max(
    0,
    toplamKazanc - sgkIsciPayi - issizlikSigortasi - (engelliIndirimi || 0)
  );

  // Kümülatif matrah: önceki aylar + bu ay
  const kumulatifVergiMatrahi = oncekiAylarGVMatrahi + gvMatrahi;

  // Toplam GV farkı yöntemiyle bu ayın GV'si
  const gelirVergisiHam = Math.max(
    0,
    hesaplaToplamGV(kumulatifVergiMatrahi) - hesaplaToplamGV(oncekiAylarGVMatrahi)
  );

  // ── Asgari Ücret GV İstisnası (kümülatif yöntem, ayNo bazlı) ────────────────
  // Asgari ücretin kümülatif matrahı; ayNo kullanılarak dilim geçişleri doğru hesaplanır
  const kumulatifAsgariUcretMatrahi = ASGARI_UCRET_GV_MATRAHI_AYLIK * ayNo;
  const oncekiAsgariUcretMatrahi   = ASGARI_UCRET_GV_MATRAHI_AYLIK * (ayNo - 1);
  const asgariUcretGelirVergisiIstisnasi = Math.max(
    0,
    hesaplaToplamGV(kumulatifAsgariUcretMatrahi) - hesaplaToplamGV(oncekiAsgariUcretMatrahi)
  );
  const asgariUcretDamgaVergisiIstisnasi = ASGARI_UCRET_DAMGA_ISTISNASI;

  // İstisna uygulanmış GV (sıfırın altına inemez)
  const gelirVergisi = Math.max(0, gelirVergisiHam - asgariUcretGelirVergisiIstisnasi);

  // ── Damga Vergisi ────────────────────────────────────────────────────────────
  const damgaVergisi = Math.max(
    0,
    toplamKazanc * DAMGA_VERGISI_ORANI - asgariUcretDamgaVergisiIstisnasi
  );

  const toplamKesinti =
    sgkIsciPayi +
    issizlikSigortasi +
    gelirVergisi +
    damgaVergisi +
    sendikaidat +
    avans +
    besKesintisi +
    icraKesintisi +
    digerKesintiler;

  const netMaas = toplamKazanc - toplamKesinti;

  // Toplam İşveren Maliyeti: Brüt Kazanç + SGK İşveren + İşsizlik İşveren - 5 Puanlık Hazine İndirimi
  const toplamIsverenMaliyeti = toplamKazanc + sgkIsverenPayi + issizlikIsverenPayi - sgkIsverenIndirimi;
  const gunlukUcret = temelKazanc / 30;

  return {
    ...input,
    fazlaMesaiTutar,
    toplamKazanc,
    sgkIsciPayi,
    issizlikSigortasi,
    gelirVergisi,
    damgaVergisi,
    sgkIsverenPayi,
    issizlikIsverenPayi,
    sgkIsverenIndirimi,
    asgariUcretGelirVergisiIstisnasi,
    asgariUcretDamgaVergisiIstisnasi,
    besKesintisi,
    icraKesintisi,
    toplamKesinti,
    netMaas,
    kumulatifVergiMatrahi,
    toplamIsverenMaliyeti,
    saatlikUcret,
    gunlukUcret,
  };
}

// ─── Yardımcılar ─────────────────────────────────────────────────────────────

export function formatNumber(value: number): string {
  return value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCurrency(value: number): string {
  return `${formatNumber(value)} ₺`;
}

export interface NettenBruteOptions {
  medeniDurum?: 'bekar' | 'evli';
  cocukSayisi?: number;
  engelliIndirimi?: number;
  isEmekli?: boolean;
  ayNo?: number;
  oncekiAylarGVMatrahi?: number;
  yolParasi?: number;
  gidaYardimi?: number;
  cocukYardimi?: number;
  digerKazanclar?: number;
  ikramiye?: number;
  prim?: number;
  sendikaidat?: number;
  avans?: number;
  besKesintisi?: number;
  icraKesintisi?: number;
  digerKesintiler?: number;
}

/**
 * Net ücretten brüt ücreti kuruşu kuruşuna tam hesaplar (ikili arama / binary search yöntemi).
 * Hem eski parametre imzasını hem de detaylı opsiyon nesnesini destekler.
 */
export function nettenBruteHesapla(
  netHedef: number,
  optionsOrMedeniDurum?: 'bekar' | 'evli' | NettenBruteOptions,
  cocukSayisi: number = 0,
  engelliMi: boolean = false,
  ayNo: number = 1,
  oncekiAylarGVMatrahi: number = 0,
  isEmekli: boolean = false
): number {
  if (!netHedef || netHedef <= 0) return 0;

  const isObj = typeof optionsOrMedeniDurum === 'object' && optionsOrMedeniDurum !== null;
  const opts: NettenBruteOptions = isObj
    ? (optionsOrMedeniDurum as NettenBruteOptions)
    : {
        medeniDurum: (optionsOrMedeniDurum as 'bekar' | 'evli') || 'bekar',
        cocukSayisi,
        engelliIndirimi: engelliMi ? 2500 : 0,
        ayNo,
        oncekiAylarGVMatrahi,
        isEmekli,
      };

  const currentAyNo = opts.ayNo || 1;
  const currentOncekiAylar = opts.oncekiAylarGVMatrahi || 0;

  // İkili arama (Binary search) aralığı
  let low = 0;
  let high = Math.max(netHedef * 3.5, SGK_TAVAN * 1.5);
  let bestBrut = (low + high) / 2;

  for (let i = 0; i < 60; i++) {
    const candidateInput: BordroHesapInput = {
      employeeId: '',
      period: '',
      temelKazanc: bestBrut,
      medeniDurum: opts.medeniDurum || 'bekar',
      cocukSayisi: opts.cocukSayisi || 0,
      engelliIndirimi: opts.engelliIndirimi || 0,
      isEmekli: opts.isEmekli || false,
      yolParasi: opts.yolParasi || 0,
      gidaYardimi: opts.gidaYardimi || 0,
      cocukYardimi: opts.cocukYardimi || 0,
      digerKazanclar: opts.digerKazanclar || 0,
      ikramiye: opts.ikramiye || 0,
      prim: opts.prim || 0,
      sendikaidat: opts.sendikaidat || 0,
      avans: opts.avans || 0,
      besKesintisi: opts.besKesintisi || 0,
      icraKesintisi: opts.icraKesintisi || 0,
      digerKesintiler: opts.digerKesintiler || 0,
    };

    const res = calculateBordro(candidateInput, undefined, currentAyNo, currentOncekiAylar);
    const diff = res.netMaas - netHedef;

    if (Math.abs(diff) < 0.005) {
      break;
    }

    if (diff > 0) {
      high = bestBrut;
    } else {
      low = bestBrut;
    }
    bestBrut = (low + high) / 2;
  }

  return Math.round(bestBrut * 100) / 100;
}

export function saatlikBrutUcret(temelKazanc: number): number {
  return temelKazanc > 0 ? Math.round((temelKazanc / 225) * 100) / 100 : 0;
}

export function gunlukBrutUcret(temelKazanc: number): number {
  return temelKazanc > 0 ? Math.round((temelKazanc / 30) * 100) / 100 : 0;
}

export function saatlikNetUcret(netMaas: number): number {
  return netMaas > 0 ? Math.round((netMaas / 225) * 100) / 100 : 0;
}

export function gunlukNetUcret(netMaas: number): number {
  return netMaas > 0 ? Math.round((netMaas / 30) * 100) / 100 : 0;
}
