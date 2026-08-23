import { SistemAyarlari, SistemParametresi } from '../types/sistemAyarlari';

export const VARSAYILAN_SISTEM_AYARLARI: SistemAyarlari = {
  isKanunu: {
    yillikIzin: {
      birIlaBesYil: 14,
      besIlaOnbesYil: 20,
      onbesYilUstunde: 26,
      elliYasUstundeEkIzin: 6
    },
    ozelIzinler: {
      mazeretIzni: 5,
      dogumIzni: 168,
      babalikIzni: 10,
      evlilikIzni: 3,
      olumIzni: 3,
      yolIzni: 4
    },
    calismaSureleri: {
      haftalikSaat: 45,
      gunlukSaat: 9,
      fazlaMesaiSiniri: 270
    }
  },
  bordroSureleri: {
    bordroHazirlikGunleri: 5,
    bordroOdemeGunleri: 3,
    sgkBildirimiGunu: 23,
    vergiBeyannamesiGunu: 26,
    yillikKapanisTarihi: '31-01',
    primBildirimiGunu: 23
  },
  vergiOranlari: {
    gelirVergisiOrani: 0.15,
    damgaVergisiOrani: 0.00759,
    sgkIsciPayiOrani: 0.14,
    sgkIsverenPayiOrani: 0.2175,
    issizlikIsciPayiOrani: 0.01,
    issizlikIsverenPayiOrani: 0.02,
    asgariUcret: 33030,
    gelirVergisiIstisnasi: 0.15
  },
  egitimSureleri: {
    iseGirisEgitimi: 3,
    isSagligiEgitimi: 8,
    periyodikEgitimAraligi: 90,
    performansDegerlendirmeAraligi: 365,
    kariyerPlanlamaAraligi: 180
  },
  belgeKurallari: {
    maksimumDosyaBoyutu: 5,
    kabulEdilenDosyaTurleri: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
    yolIzniIcinBelgeZorunlu: false,
    ilDisiSeyahatBelgeZorunlu: true
  },
  sistemKurallari: {
    izinTalepMinimumGun: 1,
    izinTalepMaksimumIleriTarih: 365,
    bordroGecikmeUyariGunu: 3,
    sgkBildirimiUyariGunu: 5,
    performansUyariGunu: 14
  },
  sirketBilgileri: {
    ad: 'Ana Şirket A.Ş.',
    adres: 'İstanbul, Türkiye',
    vergiNo: '1234567890',
    sgkSicilNo: '0987654321',
    telefon: '+90 212 555 0000',
    email: 'info@anasirket.com.tr',
    bulunduguIl: 'İstanbul'
  },
  emeклiBordroParametreleri: {
    normalBordro: {
      sgkIsciPayiOrani: 0.14,
      issizlikIsciPayiOrani: 0.01,
      damgaVergisiOrani: 0.00759,
      sgkIsverenPayiOrani: 0.2175,
      issizlikIsverenPayiOrani: 0.02
    },
    sgdpBordro: {
      sgkIsciPayiOrani: 0.075,
      sgkIsverenPayiOrani: 0.245,
      damgaVergisiOrani: 0.00759
    },
    sgkIsciPayiOrani: 0.14,
    issizlikIsciPayiOrani: 0.01,
    damgaVergisiOrani: 0.00759,
    sgkIsverenPayiOrani: 0.2175,
    issizlikIsverenPayiOrani: 0.02,
    sgkTavanlari: [297270, 297270, 297270, 297270, 297270, 297270, 297270, 297270, 297270, 297270, 297270, 297270],
    gelirVergisiDilimleri: [
      { matrah: 190000, oran: 0.15 },
      { matrah: 440000, oran: 0.20 },
      { matrah: 1200000, oran: 0.27 },
      { matrah: 8800000, oran: 0.35 },
      { matrah: Number.POSITIVE_INFINITY, oran: 0.40 }
    ],
    asgariUcretGVMatrahi: [28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5, 28075.5],
    asgariUcretDamgaIstisnasi: [250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7, 250.7],
    varsayilanIlkAltiAyMaas: 500000,
    varsayilanIkinciAltiAyMaas: 500000
  }
};

export const SISTEM_PARAMETRELERI: SistemParametresi[] = [
  // İş Kanunu Parametreleri
  {
    id: 'yillik_izin_1_5_yil',
    kategori: 'is_kanunu',
    ad: '1-5 Yıl Çalışan Yıllık İzin',
    deger: 14,
    aciklama: 'İş Kanunu Madde 53: 1 yıldan 5 yıla kadar (5 yıl dahil) çalışanlar için en az 14 gün yıllık izin',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'yillik_izin_5_15_yil',
    kategori: 'is_kanunu',
    ad: '5-15 Yıl Çalışan Yıllık İzin',
    deger: 20,
    aciklama: 'İş Kanunu Madde 53: 5 yıldan fazla 15 yıldan az çalışanlar için en az 20 gün yıllık izin',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'yillik_izin_15_yil_ustu',
    kategori: 'is_kanunu',
    ad: '15+ Yıl Çalışan Yıllık İzin',
    deger: 26,
    aciklama: 'İş Kanunu Madde 53: 15 yıl (dahil) ve daha fazla çalışanlar için en az 26 gün yıllık izin',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'elli_yas_ek_izin',
    kategori: 'is_kanunu',
    ad: '50+ Yaş İzin Tabanı',
    deger: 20,
    aciklama: 'İş Kanunu Madde 53: 18 ve daha küçük yaştaki işçiler ile 50 ve daha yukarı yaştaki işçilere verilecek yıllık ücretli izin süresi 20 günden az olamaz',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'mazeret_izni',
    kategori: 'is_kanunu',
    ad: 'Mazeret İzni',
    deger: 5,
    aciklama: 'İş Kanunu Ek Madde 2: Yıllık mazeret izni üst sınırı',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'dogum_izni',
    kategori: 'is_kanunu',
    ad: 'Doğum İzni (Analık İzni)',
    deger: 168,
    aciklama: 'İş Kanunu Madde 74 (7578 sayılı Kanun): Doğum öncesi 8 ve doğum sonrası 16 hafta olmak üzere toplam 24 hafta (168 gün) ücretli analık izni (Çoğul gebelikte 26 hafta / 182 gün)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-05-01',
    sonGuncelleme: '2026-05-01'
  },
  {
    id: 'babalik_izni',
    kategori: 'is_kanunu',
    ad: 'Babalık İzni',
    deger: 10,
    aciklama: 'İş Kanunu Ek Madde 2 (7578 sayılı Kanun): Eşin doğum yapması halinde 10 gün ücretli babalık izni',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-05-01',
    sonGuncelleme: '2026-05-01'
  },
  {
    id: 'evlilik_izni',
    kategori: 'is_kanunu',
    ad: 'Evlilik İzni',
    deger: 3,
    aciklama: 'İş Kanunu Ek Madde 2: İşçinin evlenmesi halinde 3 gün ücretli izin',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'olum_izni',
    kategori: 'is_kanunu',
    ad: 'Ölüm İzni',
    deger: 3,
    aciklama: 'İş Kanunu Ek Madde 2: Ana, baba, eş, kardeş veya çocuk vefatı halinde 3 gün ücretli izin',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'yol_izni',
    kategori: 'is_kanunu',
    ad: 'Yol İzni',
    deger: 4,
    aciklama: 'İş Kanunu Madde 56: Yıllık iznini işyerinden başka ilde geçirecek işçiye talep halinde verilen 4 güne kadar ücretsiz yol izni',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'haftalik_calisma_saati',
    kategori: 'is_kanunu',
    ad: 'Haftalık Çalışma Saati',
    deger: 45,
    aciklama: 'İş Kanunu Madde 63: Haftalık yasal normal çalışma süresi',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'gunluk_calisma_saati',
    kategori: 'is_kanunu',
    ad: 'Günlük Çalışma Saati',
    deger: 9,
    aciklama: 'İş Kanunu Madde 63: Günlük yasal azami çalışma süresi (Günde 11 saati aşamaz)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'fazla_mesai_siniri',
    kategori: 'is_kanunu',
    ad: 'Fazla Mesai Sınırı',
    deger: 270,
    aciklama: 'İş Kanunu Madde 41: Yıllık fazla çalışma süresi azami 270 saattir',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'yillik_izin_minimum_bolum',
    kategori: 'is_kanunu',
    ad: 'Yıllık İzin Minimum Bölüm Günü',
    deger: 10,
    aciklama: 'İş Kanunu Madde 53: Yıllık ücretli izin süreleri, tarafların anlaşması ile bir bölümü 10 günden aşağı olmamak üzere bölümler halinde kullanılabilir. Yıllık ücretli izin günlerinin hesabında izin süresine rastlayan ulusal bayram, hafta tatili ve genel tatil günleri izin süresinden sayılmaz.',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },

  // Bordro ve SGK Parametreleri
  {
    id: 'bordro_hazirlik_gunleri',
    kategori: 'bordro_sgk',
    ad: 'Bordro Hazırlık Süresi',
    deger: 5,
    aciklama: 'Aylık bordro hazırlık işlemleri için ayrılan gün sayısı',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'bordro_odeme_gunleri',
    kategori: 'bordro_sgk',
    ad: 'Bordro Ödeme Süresi',
    deger: 3,
    aciklama: 'Maaş ödemelerinin yapılması için ayrılan gün sayısı',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'sgk_bildirimi_gunu',
    kategori: 'bordro_sgk',
    ad: 'SGK Bildirimi Son Günü',
    deger: 23,
    aciklama: 'SGK prim ve hizmet belgesi bildirimi son günü (ayın kaçıncı günü)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'vergi_beyannamesi_gunu',
    kategori: 'bordro_sgk',
    ad: 'Vergi Beyannamesi Son Günü',
    deger: 26,
    aciklama: 'Aylık gelir vergisi beyannamesi son günü (ayın kaçıncı günü)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },

  // Vergi ve Sigorta Oranları
  {
    id: 'gelir_vergisi_orani',
    kategori: 'vergi_sigorta',
    ad: 'Gelir Vergisi Oranı',
    deger: 0.15,
    aciklama: 'Gelir vergisi kesinti oranı (%15 - basitleştirilmiş)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'damga_vergisi_orani',
    kategori: 'vergi_sigorta',
    ad: 'Damga Vergisi Oranı',
    deger: 0.00759,
    aciklama: 'Damga vergisi kesinti oranı (%0.759)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'sgk_isci_payi_orani',
    kategori: 'vergi_sigorta',
    ad: 'SGK İşçi Payı Oranı',
    deger: 0.14,
    aciklama: 'SGK işçi payı kesinti oranı (%14)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'sgk_isveren_payi_orani',
    kategori: 'vergi_sigorta',
    ad: 'SGK İşveren Payı Oranı',
    deger: 0.2175,
    aciklama: 'SGK işveren payı oranı (%21.75)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'issizlik_isci_payi_orani',
    kategori: 'vergi_sigorta',
    ad: 'İşsizlik İşçi Payı Oranı',
    deger: 0.01,
    aciklama: 'İşsizlik sigortası işçi payı oranı (%1)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'issizlik_isveren_payi_orani',
    kategori: 'vergi_sigorta',
    ad: 'İşsizlik İşveren Payı Oranı',
    deger: 0.02,
    aciklama: 'İşsizlik sigortası işveren payı oranı (%2)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'asgari_ucret',
    kategori: 'vergi_sigorta',
    ad: 'Asgari Ücret',
    deger: 33030,
    aciklama: '2026 yılı asgari ücret tutarı (TL)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'gelir_vergisi_istisnasi_orani',
    kategori: 'vergi_sigorta',
    ad: 'Gelir Vergisi İstisnası Oranı',
    deger: 0.15,
    aciklama: 'Asgari ücret gelir vergisi istisnası oranı (%15 - asgari ücretin %15\'i)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'gelir_vergisi_istisnasi_ocak_haziran',
    kategori: 'vergi_sigorta',
    ad: 'Gelir Vergisi İstisnası (Ocak-Haziran)',
    deger: 4211.33,
    aciklama: '2026 yılı Ocak-Haziran ayları için asgari ücret gelir vergisi istisnası (TL)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'gelir_vergisi_istisnasi_temmuz',
    kategori: 'vergi_sigorta',
    ad: 'Gelir Vergisi İstisnası (Temmuz)',
    deger: 4537.75,
    aciklama: '2026 yılı Temmuz ayı için asgari ücret gelir vergisi istisnası (TL)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-07-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'gelir_vergisi_istisnasi_agustos_aralik',
    kategori: 'vergi_sigorta',
    ad: 'Gelir Vergisi İstisnası (Ağustos-Aralık)',
    deger: 5615.10,
    aciklama: '2026 yılı Ağustos-Aralık ayları için asgari ücret gelir vergisi istisnası (TL)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-08-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'damga_vergisi_istisnasi_yillik',
    kategori: 'vergi_sigorta',
    ad: 'Damga Vergisi İstisnası (Tüm Yıl)',
    deger: 250.70,
    aciklama: '2026 yılı tüm aylar için asgari ücret damga vergisi istisnası - Ocak ayı değeri sabit (TL)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },
  {
    id: 'sgk_tavani',
    kategori: 'vergi_sigorta',
    ad: 'SGK Matrah Tavanı',
    deger: 297270,
    aciklama: '2026 yılı SGK primi hesaplaması için matrah tavanı - Brüt ücret bu tutarı geçerse SGK matrahı bu değerle sınırlanır (TL)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-02-05'
  },

  // Eğitim Parametreleri
  {
    id: 'ise_giris_egitimi',
    kategori: 'egitim',
    ad: 'İşe Giriş Eğitimi',
    deger: 3,
    aciklama: 'Yeni personel için işe giriş eğitimi süresi (gün)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'is_sagligi_egitimi',
    kategori: 'egitim',
    ad: 'İş Sağlığı Eğitimi',
    deger: 8,
    aciklama: 'İş sağlığı ve güvenliği eğitimi süresi (saat)',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'periyodik_egitim_araligi',
    kategori: 'egitim',
    ad: 'Periyodik Eğitim Aralığı',
    deger: 90,
    aciklama: 'Periyodik eğitimlerin tekrar aralığı (gün)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'performans_degerlendirme_araligi',
    kategori: 'egitim',
    ad: 'Performans Değerlendirme Aralığı',
    deger: 365,
    aciklama: 'Performans değerlendirmelerinin tekrar aralığı (gün)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },

  // Belge Kuralları
  {
    id: 'maksimum_dosya_boyutu',
    kategori: 'belge_kurallari',
    ad: 'Maksimum Dosya Boyutu',
    deger: 5,
    aciklama: 'Yüklenebilecek dosyaların maksimum boyutu (MB)',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'il_disi_seyahat_belge_zorunlu',
    kategori: 'belge_kurallari',
    ad: 'İl Dışı Seyahat Belge Zorunluluğu',
    deger: true,
    aciklama: 'İl dışı seyahat için belge yükleme zorunluluğu',
    zorunlu: true,
    degistirilebilir: false,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },

  // Sistem Kuralları
  {
    id: 'izin_talep_minimum_gun',
    kategori: 'sistem_kurallari',
    ad: 'İzin Talebi Minimum Gün',
    deger: 1,
    aciklama: 'İzin talebi için minimum gün sayısı',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'izin_talep_maksimum_ileri_tarih',
    kategori: 'sistem_kurallari',
    ad: 'İzin Talebi Maksimum İleri Tarih',
    deger: 365,
    aciklama: 'İzin talebinin kaç gün önceden yapılabileceği',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'bordro_gecikme_uyari_gunu',
    kategori: 'sistem_kurallari',
    ad: 'Bordro Gecikme Uyarı Günü',
    deger: 3,
    aciklama: 'Bordro işlemleri için kaç gün önceden uyarı verilecek',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  },
  {
    id: 'sgk_bildirimi_uyari_gunu',
    kategori: 'sistem_kurallari',
    ad: 'SGK Bildirimi Uyarı Günü',
    deger: 5,
    aciklama: 'SGK bildirimi için kaç gün önceden uyarı verilecek',
    zorunlu: true,
    degistirilebilir: true,
    yapilandirmaTarihi: '2026-01-01',
    sonGuncelleme: '2026-01-01'
  }
];