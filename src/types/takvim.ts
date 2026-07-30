export type EtkinlikTuru =
  | 'tatil'
  | 'izin'
  | 'egitim'
  | 'toplanti'
  | 'diger';

export type EtkinlikOncelik = 'dusuk' | 'normal' | 'yuksek' | 'kritik';
export type EtkinlikDurum = 'beklemede' | 'tamamlandi' | 'iptal' | 'devam';

export interface TakvimEtkinlik {
  id: string;
  baslik: string;
  aciklama?: string;
  tarih: string;
  bitisTarihi?: string;
  tur: EtkinlikTuru;
  oncelik: EtkinlikOncelik;
  durum: EtkinlikDurum;
  employeeId?: string;
  employeeAdi?: string;
  departman?: string;
  otomatik?: boolean;
}

export interface YapilandirilmisEtkinlik {
  tarih: string;
  etkinlikler: TakvimEtkinlik[];
}

export interface ResmiTatil {
  tarih: string;
  ad: string;
  aciklama?: string;
}
