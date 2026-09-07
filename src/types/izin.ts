export type IzinTuru =
  | 'yillik'
  | 'mazeret'
  | 'hastalik'
  | 'dogum'
  | 'babalik'
  | 'evlilik'
  | 'olum'
  | 'askerlik'
  | 'ucretsiz'
  | (string & {});


export type IzinDurum = 'beklemede' | 'onaylandi' | 'reddedildi' | 'iptal';

export interface IzinTalebi {
  id: string;
  companyId: string;
  employeeId: string;
  izinTuru: IzinTuru;
  baslangicTarihi: string;
  bitisTarihi: string;
  gunSayisi: number;
  aciklama: string;
  yolIzniTalep: boolean;
  yolIzniGun: number;
  seyahatYeri: string;
  ilDisiSeyahat: boolean;
  belgeUrl: string | null;
  durum: IzinDurum;
  onaylayanId: string | null;
  onayTarihi: string | null;
  redNedeni: string | null;
  talepTarihi: string;
  createdAt: string;
  updatedAt: string;
  kismiYillik?: boolean;
  employeeName?: string;
  department?: string;
  // joined
  employee?: { name: string; department: string; position: string };
}

export interface IzinHakki {
  id: string;
  companyId: string;
  employeeId: string;
  yil: number;
  toplamHak: number;
  kullanilanIzin: number;
  kalanIzin: number;
  calismaYili: number;
  iseGirisTarihi: string | null;
  hesaplamaTarihi: string;
  mazeretIzin: number;
  hastalikIzin: number;
  mazeret?: number;
  createdAt: string;
  updatedAt: string;
}
