export type ParametreKategorisi =
  | 'is_kanunu'
  | 'bordro_sgk'
  | 'vergi_sigorta'
  | 'egitim'
  | 'belge_kurallari'
  | 'sistem_kurallari'
  | 'sirket_bilgileri'
  | 'sirketler';

export interface SistemParametresi {
  id: string;
  kategori: ParametreKategorisi;
  ad: string;
  deger: string | number | boolean;
  aciklama: string;
  zorunlu: boolean;
  degistirilebilir: boolean;
  yapilandirmaTarihi: string;
  sonGuncelleme: string;
}

export interface SistemAyarlari {
  isKanunu: {
    yillikIzin: {
      birIlaBesYil: number;
      besIlaOnbesYil: number;
      onbesYilUstunde: number;
      elliYasUstundeEkIzin: number;
    };
    ozelIzinler: {
      mazeretIzni: number;
      dogumIzni: number;
      babalikIzni: number;
      evlilikIzni: number;
      olumIzni: number;
      yolIzni: number;
    };
    calismaSureleri: {
      haftalikSaat: number;
      gunlukSaat: number;
      fazlaMesaiSiniri: number;
    };
  };
  bordroSureleri: {
    bordroHazirlikGunleri: number;
    bordroOdemeGunleri: number;
    sgkBildirimiGunu: number;
    vergiBeyannamesiGunu: number;
    yillikKapanisTarihi: string;
    primBildirimiGunu: number;
  };
  vergiOranlari: {
    gelirVergisiOrani: number;
    damgaVergisiOrani: number;
    sgkIsciPayiOrani: number;
    sgkIsverenPayiOrani: number;
    issizlikIsciPayiOrani: number;
    issizlikIsverenPayiOrani: number;
    asgariUcret: number;
    gelirVergisiIstisnasi: number;
  };
  egitimSureleri: {
    iseGirisEgitimi: number;
    isSagligiEgitimi: number;
    periyodikEgitimAraligi: number;
    performansDegerlendirmeAraligi: number;
    kariyerPlanlamaAraligi: number;
  };
  belgeKurallari: {
    maksimumDosyaBoyutu: number;
    kabulEdilenDosyaTurleri: string[];
    yolIzniIcinBelgeZorunlu: boolean;
    ilDisiSeyahatBelgeZorunlu: boolean;
  };
  sistemKurallari: {
    izinTalepMinimumGun: number;
    izinTalepMaksimumIleriTarih: number;
    bordroGecikmeUyariGunu: number;
    sgkBildirimiUyariGunu: number;
    performansUyariGunu: number;
  };
  sirketBilgileri: {
    ad: string;
    adres: string;
    vergiNo: string;
    sgkSicilNo: string;
    telefon: string;
    email: string;
    bulunduguIl: string;
  };
  emeклiBordroParametreleri: {
    normalBordro: {
      sgkIsciPayiOrani: number;
      issizlikIsciPayiOrani: number;
      damgaVergisiOrani: number;
      sgkIsverenPayiOrani: number;
      issizlikIsverenPayiOrani: number;
    };
    sgdpBordro: {
      sgkIsciPayiOrani: number;
      sgkIsverenPayiOrani: number;
      damgaVergisiOrani: number;
    };
    sgkIsciPayiOrani: number;
    issizlikIsciPayiOrani: number;
    damgaVergisiOrani: number;
    sgkIsverenPayiOrani: number;
    issizlikIsverenPayiOrani: number;
    sgkTavanlari: {
      ocak: number;
      subat: number;
      mart: number;
      nisan: number;
      mayis: number;
      haziran: number;
      temmuz: number;
      agustos: number;
      eylul: number;
      ekim: number;
      kasim: number;
      aralik: number;
    };
    gelirVergisiDilimleri: Array<{
      matrah: number;
      oran: number;
    }>;
    asgariUcretGVMatrahi: number[];
    asgariUcretDamgaIstisnasi: number[];
    varsayilanIlkAltiAyMaas: number;
    varsayilanIkinciAltiAyMaas: number;
  };
}
