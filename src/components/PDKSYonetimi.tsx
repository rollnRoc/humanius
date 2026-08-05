import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { pdksService } from '../services/pdksService';
import { Loader2 } from 'lucide-react';

import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckSquare,
  Clock,
  Cpu,
  Download,
  Fingerprint,
  MapPin,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  Save,
  TrendingUp,
  Trash2,
  UserCheck,
  UserX,
  Wifi,
  X,
} from 'lucide-react';
import type { Employee } from '../types';
import type { IzinTalebi } from '../types/izin';

type PDKSDurum = 'normal' | 'gec' | 'erken-cikis' | 'devamsiz' | 'izinli' | 'eksik-cikis';
type OnayDurum = 'beklemede' | 'onaylandi' | 'reddedildi';
type KaynakTip = 'parmakizi' | 'rfid' | 'mobil-gps' | 'mobil-qr' | 'beacon' | 'manuel';

type Sekme = 'devam' | 'motor' | 'onay' | 'vardiya';

interface VardiyaTanimi {
  id: string;
  ad: string;
  giris: string;
  cikis: string;
  departman: string;
  toleransDk: number;
  molaDk: number;
  haftaOtLimit: number;
  esnek: boolean;
}

interface PDKSKaydi {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  tarih: string;
  girisZamani: string | null;
  cikisZamani: string | null;
  kaynakTip: KaynakTip;
  brutCalismaDk: number | null;
  molaDusumuDk: number;
  netCalismaDk: number | null;
  gecikmeVar: boolean;
  gecikmeDk: number;
  toleransUygulandi: boolean;
  gunlukFazlaMesaiDk: number;
  durum: PDKSDurum;
  notlar: string;
  fazlaMesaiOnayDurum: OnayDurum;
  duzeltmeTalebi: boolean;
}

interface FazlaMesaiOnay {
  employeeId: string;
  employeeName: string;
  department: string;
  donem: string;
  haftalikFazlaMesaiDk: number;
  tahminiTutar: number;
  durum: OnayDurum;
}



const DURUM_RENK: Record<PDKSDurum, string> = {
  normal: 'bg-green-100 text-green-700',
  gec: 'bg-yellow-100 text-yellow-700',
  'erken-cikis': 'bg-orange-100 text-orange-700',
  devamsiz: 'bg-red-100 text-red-700',
  izinli: 'bg-blue-100 text-blue-700',
  'eksik-cikis': 'bg-pink-100 text-pink-700',
};

const DURUM_ETIKETI: Record<PDKSDurum, string> = {
  normal: 'Normal',
  gec: 'Gec Giris',
  'erken-cikis': 'Erken Cikis',
  devamsiz: 'Devamsiz',
  izinli: 'Izinli',
  'eksik-cikis': 'Cikis Eksik',
};

const DEMO_VARDIYALAR: VardiyaTanimi[] = [
  { id: 'v1', ad: 'Standart Mesai', giris: '08:00', cikis: '18:00', departman: 'Tum Departmanlar', toleransDk: 15, molaDk: 60, haftaOtLimit: 45, esnek: false },
  { id: 'v2', ad: 'Esnek Mesai', giris: '09:00', cikis: '18:00', departman: 'Yazilim', toleransDk: 30, molaDk: 60, haftaOtLimit: 45, esnek: true },
  { id: 'v3', ad: 'Ogleden Sonra Vardiyasi', giris: '13:00', cikis: '22:00', departman: 'Satis', toleransDk: 10, molaDk: 30, haftaOtLimit: 45, esnek: false },
  { id: 'v4', ad: 'Gece Vardiyasi', giris: '22:00', cikis: '07:00', departman: 'Guvenlik', toleransDk: 5, molaDk: 30, haftaOtLimit: 45, esnek: false },
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toTime(totalMins: number): string {
  const h = Math.floor(Math.abs(totalMins) / 60)
    .toString()
    .padStart(2, '0');
  const m = (Math.abs(totalMins) % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatDuration(mins: number | null): string {
  if (mins == null) return '-';
  return `${Math.floor(mins / 60)}s ${mins % 60}dk`;
}

function hesaplaKayit(
  giris: string | null,
  cikis: string | null,
  vardiya: VardiyaTanimi,
  oncekiDurum?: PDKSDurum
): Pick<PDKSKaydi, 'brutCalismaDk' | 'molaDusumuDk' | 'netCalismaDk' | 'gecikmeVar' | 'gecikmeDk' | 'toleransUygulandi' | 'gunlukFazlaMesaiDk' | 'durum'> {
  if (!giris && oncekiDurum === 'izinli') {
    return {
      brutCalismaDk: null,
      molaDusumuDk: 0,
      netCalismaDk: null,
      gecikmeVar: false,
      gecikmeDk: 0,
      toleransUygulandi: false,
      gunlukFazlaMesaiDk: 0,
      durum: 'izinli',
    };
  }
  if (!giris) {
    return {
      brutCalismaDk: null,
      molaDusumuDk: 0,
      netCalismaDk: null,
      gecikmeVar: false,
      gecikmeDk: 0,
      toleransUygulandi: false,
      gunlukFazlaMesaiDk: 0,
      durum: 'devamsiz',
    };
  }
  if (!cikis) {
    return {
      brutCalismaDk: null,
      molaDusumuDk: 0,
      netCalismaDk: null,
      gecikmeVar: false,
      gecikmeDk: 0,
      toleransUygulandi: false,
      gunlukFazlaMesaiDk: 0,
      durum: 'eksik-cikis',
    };
  }

  const g = toMinutes(giris);
  const c = toMinutes(cikis);
  const vg = toMinutes(vardiya.giris);
  const vc = toMinutes(vardiya.cikis);

  const gecikmeDk = Math.max(0, g - vg);
  const gecikmeVar = gecikmeDk > 0;
  const toleransUygulandi = gecikmeVar && gecikmeDk <= vardiya.toleransDk;

  let brutCalismaDk = c - g;
  if (brutCalismaDk < 0) brutCalismaDk += 24 * 60;

  const molaDusumuDk = brutCalismaDk >= 4 * 60 ? vardiya.molaDk : 0;
  const netCalismaDk = brutCalismaDk - molaDusumuDk;

  let planliDk = vc - vg;
  if (planliDk < 0) planliDk += 24 * 60;
  const planliNetDk = planliDk - vardiya.molaDk;

  const gunlukFazlaMesaiDk = Math.max(0, netCalismaDk - planliNetDk);

  const erkenCikisVar = Math.max(0, vc - c) > 15;
  let durum: PDKSDurum = 'normal';
  if (gecikmeVar && !toleransUygulandi) durum = 'gec';
  else if (erkenCikisVar) durum = 'erken-cikis';

  return {
    brutCalismaDk,
    molaDusumuDk,
    netCalismaDk,
    gecikmeVar,
    gecikmeDk,
    toleransUygulandi,
    gunlukFazlaMesaiDk,
    durum,
  };
}

const KAYNAKLAR: KaynakTip[] = ['parmakizi', 'rfid', 'mobil-gps', 'mobil-qr', 'beacon'];

function generateDemoKayitlar(employees: Employee[]): PDKSKaydi[] {
  const vardiya = DEMO_VARDIYALAR[0];
  const senaryolar: Array<{ g: number | null; c: number | null; force?: PDKSDurum }> = [
    { g: 8 * 60 + 0, c: 18 * 60 + 5 },
    { g: 8 * 60 + 10, c: 18 * 60 + 15 },
    { g: 8 * 60 + 35, c: 18 * 60 + 0 },
    { g: 8 * 60 + 5, c: 16 * 60 + 30 },
    { g: 8 * 60 + 2, c: 20 * 60 + 0 },
    { g: null, c: null, force: 'devamsiz' },
    { g: 8 * 60 + 0, c: null },
  ];

  const kayitlar: PDKSKaydi[] = [];

  for (let day = 0; day < 7; day++) {
    const tarih = new Date(2026, 4, 4 - day).toISOString().split('T')[0];
    employees.slice(0, 12).forEach((emp, idx) => {
      const s = senaryolar[(idx + day) % senaryolar.length];
      const giris = s.g == null ? null : toTime(s.g);
      const cikis = s.c == null ? null : toTime(s.c);
      const hesap = hesaplaKayit(giris, cikis, vardiya, s.force);
      kayitlar.push({
        id: `${tarih}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        tarih,
        girisZamani: giris,
        cikisZamani: cikis,
        kaynakTip: KAYNAKLAR[idx % KAYNAKLAR.length],
        ...hesap,
        notlar: '',
        fazlaMesaiOnayDurum: hesap.gunlukFazlaMesaiDk > 0 ? 'beklemede' : 'onaylandi',
        duzeltmeTalebi: hesap.durum === 'eksik-cikis',
      });
    });
  }

  return kayitlar;
}

interface PDKSYonetimiProps {
  employees: Employee[];
  izinTalepleri?: IzinTalebi[];
}

const PDKSYonetimi: React.FC<PDKSYonetimiProps> = ({
  employees,
  izinTalepleri = [],
}) => {
  const { user, profile, appRole } = useAuth();
  const isAdmin = appRole === 'superadmin' || appRole === 'admin' || appRole === 'hr' || appRole === 'manager';
  
  const [loading, setLoading] = useState(true);
  const [aktifSekme, setAktifSekme] = useState<Sekme>('devam');
  const [secilenTarih, setSecilenTarih] = useState('2026-05-04');
  const [secilenDepartman, setSecilenDepartman] = useState('all');
  const [checkInModal, setCheckInModal] = useState(false);
  const [checkInTur, setCheckInTur] = useState<KaynakTip>('mobil-qr');
  const [duzeltmeModal, setDuzeltmeModal] = useState<PDKSKaydi | null>(null);
  const [duzeltmeGirisSaati, setDuzeltmeGirisSaati] = useState('');
  const [duzeltmeSaati, setDuzeltmeSaati] = useState('');
  const [vardiyaModal, setVardiyaModal] = useState(false);
  const [vardiyalar, setVardiyalar] = useState<VardiyaTanimi[]>(DEMO_VARDIYALAR);
  const [yeniVardiya, setYeniVardiya] = useState<Partial<VardiyaTanimi>>({
    toleransDk: 15,
    molaDk: 60,
    haftaOtLimit: 45,
    esnek: false,
  });
  const [allKayitlar, setAllKayitlar] = useState<PDKSKaydi[]>([]);

  const loadData = async () => {
    if (!employees.length || !user) return;
    try {
      setLoading(true);
      const vardiyalarDb = await pdksService.getVardiyalar();
      const mesailerDb = await pdksService.getFazlaMesailer();
      
      const mapped: PDKSKaydi[] = vardiyalarDb.map(v => {
        const emp = employees.find(e => e.id === v.employee_id);
        const vardiyaTanimi = DEMO_VARDIYALAR[0];
        
        let girisSaati = v.giris_saati ? v.giris_saati.substring(0, 5) : null;
        let cikisSaati = v.cikis_saati ? v.cikis_saati.substring(0, 5) : null;
        
        const hesap = hesaplaKayit(girisSaati, cikisSaati, vardiyaTanimi);
        const mesai = mesailerDb.find(m => m.employee_id === v.employee_id && m.tarih === v.tarih);
        
        let durum = v.durum as PDKSDurum;
        if (durum === 'zamaninda') durum = 'normal';
        if (durum === 'gec-kaldi') durum = 'gec';
        if (durum === 'erken-cikti') durum = 'erken-cikis';
        
        return {
          id: v.id,
          employeeId: v.employee_id,
          employeeName: emp?.name || 'Bilinmeyen',
          department: emp?.department || '-',
          tarih: v.tarih,
          girisZamani: girisSaati,
          cikisZamani: cikisSaati,
          kaynakTip: 'mobil-qr',
          brutCalismaDk: hesap.brutCalismaDk,
          molaDusumuDk: hesap.molaDusumuDk,
          netCalismaDk: hesap.netCalismaDk,
          gecikmeVar: hesap.gecikmeVar,
          gecikmeDk: hesap.gecikmeDk,
          toleransUygulandi: hesap.toleransUygulandi,
          gunlukFazlaMesaiDk: mesai ? Math.round(mesai.toplam_saat * 60) : hesap.gunlukFazlaMesaiDk,
          durum: durum,
          notlar: v.notlar || '',
          fazlaMesaiOnayDurum: (mesai?.onay_durumu || 'beklemede') as OnayDurum,
          duzeltmeTalebi: cikisSaati === null && girisSaati !== null
        };
      });
      setAllKayitlar(mapped);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [employees, user]);

  const [fazlaMesaiKayitlar, setFazlaMesaiKayitlar] = useState<PDKSKaydi[]>([]);

  const departmanlar = ['all', ...Array.from(new Set(employees.map((e) => e.department).filter(Boolean)))];

  const gunlukKayitlar = useMemo(
    () =>
      allKayitlar.filter(
        (k) => k.tarih === secilenTarih && (secilenDepartman === 'all' || k.department === secilenDepartman)
      ),
    [allKayitlar, secilenDepartman, secilenTarih]
  );

  const bugunStats = useMemo(
    () => ({
      gelen: gunlukKayitlar.filter((k) => ['normal', 'gec', 'erken-cikis', 'eksik-cikis'].includes(effectiveDurum(k))).length,
      gec: gunlukKayitlar.filter((k) => effectiveDurum(k) === 'gec').length,
      devamsiz: gunlukKayitlar.filter((k) => effectiveDurum(k) === 'devamsiz').length,
      eksikCikis: gunlukKayitlar.filter((k) => effectiveDurum(k) === 'eksik-cikis').length,
      fazlaMesaiToplamDk: gunlukKayitlar.reduce((s, k) => s + k.gunlukFazlaMesaiDk, 0),
    }),
    [gunlukKayitlar, izinTalepleri]
  );

  const onayKuyrugu = useMemo<FazlaMesaiOnay[]>(() => {
    const map: Record<string, FazlaMesaiOnay> = {};
    allKayitlar.forEach((k) => {
      if (k.gunlukFazlaMesaiDk <= 0) return;
      if (!map[k.employeeId]) {
        map[k.employeeId] = {
          employeeId: k.employeeId,
          employeeName: k.employeeName,
          department: k.department,
          donem: k.tarih.slice(0, 7),
          haftalikFazlaMesaiDk: 0,
          tahminiTutar: 0,
          durum: k.fazlaMesaiOnayDurum,
        };
      }
      map[k.employeeId].haftalikFazlaMesaiDk += k.gunlukFazlaMesaiDk;
      const emp = employees.find((e) => e.id === k.employeeId);
      const saatlik = (emp?.salary ?? 0) / 240;
      map[k.employeeId].tahminiTutar = Math.round((map[k.employeeId].haftalikFazlaMesaiDk / 60) * saatlik * 1.5);
      map[k.employeeId].durum = k.fazlaMesaiOnayDurum;
    });
    return Object.values(map).filter((o) => o.haftalikFazlaMesaiDk > 0);
  }, [allKayitlar, employees]);

  const bekleyenOnaySayisi = onayKuyrugu.filter((o) => o.durum === 'beklemede').length;

  function kaynakEtiketi(tip: KaynakTip): string {
    if (tip === 'parmakizi') return 'Parmak Izi';
    if (tip === 'rfid') return 'RFID';
    if (tip === 'mobil-gps') return 'Mobil GPS';
    if (tip === 'mobil-qr') return 'Mobil QR';
    if (tip === 'beacon') return 'Beacon';
    return 'Manuel';
  }

  function kaynakIkon(tip: KaynakTip): React.ReactNode {
    if (tip === 'parmakizi') return <Fingerprint className="w-3.5 h-3.5" />;
    if (tip === 'rfid') return <Wifi className="w-3.5 h-3.5" />;
    if (tip === 'mobil-gps') return <MapPin className="w-3.5 h-3.5" />;
    if (tip === 'mobil-qr') return <QrCode className="w-3.5 h-3.5" />;
    if (tip === 'beacon') return <Radio className="w-3.5 h-3.5" />;
    return <Clock className="w-3.5 h-3.5" />;
  }

  function hasApprovedLeave(employeeId: string, tarih: string): boolean {
    return izinTalepleri.some((izin) => {
      if (izin.employeeId !== employeeId || izin.durum !== 'onaylandi') return false;
      return tarih >= izin.baslangicTarihi && tarih <= izin.bitisTarihi;
    });
  }

  function effectiveDurum(k: PDKSKaydi): PDKSDurum {
    if (k.girisZamani || k.cikisZamani) return k.durum;
    return hasApprovedLeave(k.employeeId, k.tarih) ? 'izinli' : 'devamsiz';
  }

  async function fazlaMesaiOnayla(employeeId: string, durum: OnayDurum) {
    if (!user) return;
    try {
      const mesailerDb = await pdksService.getFazlaMesailer();
      const mesai = mesailerDb.find(m => m.employee_id === employeeId);
      if (mesai) {
         await pdksService.approveFazlaMesai(mesai.id, user.id, durum === 'onaylandi');
         await loadData();
      }
    } catch (error) {
      console.error(error);
      alert('Hata olustu');
    }
  }

  async function duzeltmeKaydet() {
    if (!duzeltmeModal) return;
    try {
      const updatedGiris = duzeltmeGirisSaati || duzeltmeModal.girisZamani;
      const updatedCikis = duzeltmeSaati || duzeltmeModal.cikisZamani;
      
      await pdksService.updateVardiya(duzeltmeModal.id, {
        giris_saati: updatedGiris ? updatedGiris + ':00' : undefined,
        cikis_saati: updatedCikis ? updatedCikis + ':00' : undefined
      });

      // Update local state record dynamically
      setAllKayitlar(prev => prev.map(item => {
        if (item.id === duzeltmeModal.id) {
          const hesap = hesaplaKayit(updatedGiris, updatedCikis, DEMO_VARDIYALAR[0]);
          return {
            ...item,
            girisZamani: updatedGiris,
            cikisZamani: updatedCikis,
            ...hesap
          };
        }
        return item;
      }));

      await loadData();
    } catch(err) {
      console.error(err);
    }
    setDuzeltmeModal(null);
    setDuzeltmeGirisSaati('');
    setDuzeltmeSaati('');
  }

  async function otomatikMesaiSonlandir() {
    const ongoingRecords = gunlukKayitlar.filter(k => k.girisZamani && !k.cikisZamani);
    if (ongoingRecords.length === 0) {
      alert('Seçili günde mesai bitiş saati gelip çıkış yapmamış aktif personel bulunmamaktadır.');
      return;
    }

    if (!confirm(`Seçili tarihteki (${secilenTarih}) çıkış yapmamış ${ongoingRecords.length} personelin mesaisi vardiya bitiş saatleri (18:00) itibarıyla otomatik sonlandırılsın mı?`)) {
      return;
    }

    try {
      setLoading(true);
      for (const rec of ongoingRecords) {
        const defaultVardiyaCikis = '18:00';
        await pdksService.updateVardiya(rec.id, {
          cikis_saati: defaultVardiyaCikis + ':00'
        });
      }

      setAllKayitlar(prev => prev.map(item => {
        if (item.girisZamani && !item.cikisZamani && item.tarih === secilenTarih) {
          const defaultVardiyaCikis = '18:00';
          const hesap = hesaplaKayit(item.girisZamani, defaultVardiyaCikis, DEMO_VARDIYALAR[0]);
          return {
            ...item,
            cikisZamani: defaultVardiyaCikis,
            duzeltmeTalebi: false,
            ...hesap
          };
        }
        return item;
      }));

      alert(`İşlem Başarılı: ${ongoingRecords.length} personelin devam eden mesaisi vardiya bitiş saatinde (18:00) otomatik olarak sonlandırıldı.`);
    } catch (err) {
      console.error(err);
      alert('Otomatik mesai sonlandırma sırasında bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  const handleClearAllData = async () => {
    if (!window.confirm('Mesai ve PDKS devam takibindeki TÜM kaydedilmiş verileri silmek/temizlemek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    try {
      setLoading(true);
      await pdksService.clearAllData();
      await loadData();
      alert('Tüm mesai ve PDKS kayıtları başarıyla temizlendi.');
    } catch (err: any) {
      console.error(err);
      alert('Veriler temizlenirken hata oluştu: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Akilli PDKS ve Mesai Yonetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">Hesaplama motoru, vardiya yonetimi ve otomatik mesai sonlandırma</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {isAdmin && (
            <button
              onClick={handleClearAllData}
              className="flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-700 px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
              title="Tüm Mesai ve PDKS Kayıtlarını Sıfırla / Temizle"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              Verileri Temizle
            </button>
          )}
          <button
            onClick={() => setCheckInModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Giris/Cikis
          </button>
          <button className="flex items-center gap-2 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Disa Aktar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Gelen', value: String(bugunStats.gelen), icon: <UserCheck className="w-5 h-5" />, color: 'bg-blue-100 text-blue-600' },
          { label: 'Gec Giris', value: String(bugunStats.gec), icon: <AlertCircle className="w-5 h-5" />, color: 'bg-yellow-100 text-yellow-600' },
          { label: 'Devamsiz', value: String(bugunStats.devamsiz), icon: <UserX className="w-5 h-5" />, color: 'bg-red-100 text-red-600' },
          { label: 'Cikis Eksik', value: String(bugunStats.eksikCikis), icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-pink-100 text-pink-600' },
          { label: 'Fazla Mesai', value: `${Math.round(bugunStats.fazlaMesaiToplamDk / 60)}s`, icon: <TrendingUp className="w-5 h-5" />, color: 'bg-purple-100 text-purple-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-[11px] text-gray-500">{card.label}</p>
                <p className="text-xl font-bold text-gray-800">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'devam' as Sekme, label: 'Devam Takibi (Giriş/Çıkış Saatleri)' },
          { id: 'vardiya' as Sekme, label: 'Vardiya & Çalışma Saatleri Yönetimi' },
          { id: 'motor' as Sekme, label: 'Hesaplama Motoru' },
          (isAdmin ? { id: 'onay' as Sekme, label: `Fazla Mesai Onay${bekleyenOnaySayisi ? ` (${bekleyenOnaySayisi})` : ''}` } : null),
        ].filter(Boolean).map((sekme: any) => (
          <button
            key={sekme.id}
            onClick={() => setAktifSekme(sekme.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              aktifSekme === sekme.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {sekme.label}
          </button>
        ))}
      </div>

      {aktifSekme === 'devam' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={secilenTarih}
                onChange={(e) => setSecilenTarih(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={secilenDepartman}
              onChange={(e) => setSecilenDepartman(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departmanlar.map((d) => (
                <option key={d} value={d}>
                  {d === 'all' ? 'Tum Departmanlar' : d}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Personel', 'Kaynak', 'Giris', 'Cikis', 'Brut', 'Mola', 'Net', 'F.Mesai', 'Durum', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gunlukKayitlar.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                      Kayit bulunamadi
                    </td>
                  </tr>
                ) : (
                  gunlukKayitlar.map((k) => (
                    <tr key={k.id} className={effectiveDurum(k) === 'eksik-cikis' ? 'bg-pink-50/40' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{k.employeeName}</p>
                        <p className="text-[10px] text-gray-400">{k.department}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {kaynakIkon(k.kaynakTip)}
                          <span className="hidden sm:inline">{kaynakEtiketi(k.kaynakTip)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 text-xs">
                        {k.girisZamani ?? '-'}
                        {k.gecikmeVar && !k.toleransUygulandi && (
                          <span className="ml-1 text-[9px] bg-yellow-100 text-yellow-700 px-1 rounded">+{k.gecikmeDk}dk</span>
                        )}
                        {k.toleransUygulandi && (
                          <span className="ml-1 text-[9px] bg-green-100 text-green-700 px-1 rounded">tolerans</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 text-xs">{k.cikisZamani ?? '- Eksik'}</td>
                      <td className="px-4 py-3 text-right text-gray-500 text-xs">{formatDuration(k.brutCalismaDk)}</td>
                      <td className="px-4 py-3 text-right text-orange-500 text-xs">{k.molaDusumuDk ? `-${k.molaDusumuDk}dk` : '-'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700 text-xs">{formatDuration(k.netCalismaDk)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-purple-600 text-xs">{k.gunlukFazlaMesaiDk ? `+${formatDuration(k.gunlukFazlaMesaiDk)}` : '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DURUM_RENK[effectiveDurum(k)]}`}>
                          {DURUM_ETIKETI[effectiveDurum(k)]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => {
                              setDuzeltmeModal(k);
                              setDuzeltmeGirisSaati(k.girisZamani || '');
                              setDuzeltmeSaati(k.cikisZamani || '');
                            }}
                            className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            ✏️ Düzenle
                          </button>
                          {k.gunlukFazlaMesaiDk > 0 && k.fazlaMesaiOnayDurum === 'beklemede' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => fazlaMesaiOnayla(k.employeeId, 'onaylandi')}
                                className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium hover:bg-green-200"
                              >
                                FM ✓
                              </button>
                              <button
                                onClick={() => fazlaMesaiOnayla(k.employeeId, 'reddedildi')}
                                className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium hover:bg-red-200"
                              >
                                FM ✗
                              </button>
                            </div>
                          )}
                          {k.gunlukFazlaMesaiDk > 0 && k.fazlaMesaiOnayDurum === 'onaylandi' && (
                            <span className="text-[10px] text-green-600 font-medium">FM ✓ Onaylandi</span>
                          )}
                          {k.gunlukFazlaMesaiDk > 0 && k.fazlaMesaiOnayDurum === 'reddedildi' && (
                            <span className="text-[10px] text-red-500 font-medium">FM Reddedildi</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aktifSekme === 'motor' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-800">Hesaplama Motoru</p>
              <p className="text-xs text-blue-600 mt-0.5">Kurallar sirasi: Adapter tanima, vardiya eslestirme, tolerans, mola dusumu, fazla mesai, eksik kayit ve bordro tetikleme.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {[
              { title: '1) Veri Kaynagi', text: 'Parmak izi, RFID, mobil GPS/QR, Beacon', icon: <Fingerprint className="w-4 h-4" />, color: 'bg-indigo-50 border-indigo-200' },
              { title: '2) Vardiya Eslesme', text: 'Calisan + tarih -> aktif vardiya', icon: <Clock className="w-4 h-4" />, color: 'bg-blue-50 border-blue-200' },
              { title: '3) Tolerans', text: '<= 15 dk gecikme toleransli', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-green-50 border-green-200' },
              { title: '4) Mola Dusumu', text: '>= 4 saatte otomatik 60 dk mola', icon: <RefreshCw className="w-4 h-4" />, color: 'bg-orange-50 border-orange-200' },
              { title: '5) Fazla Mesai', text: 'Haftalik 45 saat ustu %50 zamli, onay kuyruğuna alınır', icon: <TrendingUp className="w-4 h-4" />, color: 'bg-purple-50 border-purple-200' },
              { title: '6) Eksik Kayit', text: 'Giris var, cikis yok -> duzeltme talebi', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-pink-50 border-pink-200' },
              { title: '7) Devamsizlik', text: 'PDKS yok + izin yok -> devamsiz', icon: <UserX className="w-4 h-4" />, color: 'bg-red-50 border-red-200' },
              { title: '8) Onay Hiyerarsisi', text: 'Satir ici onay veya kuyruk ekraniyla yoneticiye sunar', icon: <CheckSquare className="w-4 h-4" />, color: 'bg-yellow-50 border-yellow-200' },
            ].map((rule) => (
              <div key={rule.title} className={`rounded-2xl border p-4 ${rule.color}`}>
                <div className="flex items-center gap-2 mb-1 text-gray-700">
                  {rule.icon}
                  <p className="text-sm font-semibold">{rule.title}</p>
                </div>
                <p className="text-xs text-gray-600">{rule.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-2">Ornek Akis (08:05 → 18:15)</p>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {['Ham Giris 08:05', 'Tolerans gecti', 'Brut 10s10dk', 'Mola -60dk', 'Net 9s10dk', 'FM +10dk', 'Onay Bekliyor'].map((step) => (
                <span key={step} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700">
                  {step}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {aktifSekme === 'onay' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            Yonetici onayi olmayan fazla mesailer kesinlesmez. Onaylanan kayitlar PDKS raporuna islenir.
          </div>
          {onayKuyrugu.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
              Bekleyen onay yok
            </div>
          ) : (
            onayKuyrugu.map((o) => (
              <div key={o.employeeId} className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">{o.employeeName}</p>
                    <p className="text-xs text-gray-500">{o.department} | {o.donem}</p>
                    <p className="text-xs mt-2 text-gray-600">
                      FM: <span className="font-semibold text-purple-700">{formatDuration(o.haftalikFazlaMesaiDk)}</span>
                      {'  '}Tahmini: <span className="font-semibold text-green-700">{o.tahminiTutar.toLocaleString('tr-TR')} TL</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fazlaMesaiOnayla(o.employeeId, 'reddedildi')}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-xl text-xs font-medium hover:bg-red-50"
                    >
                      <X className="w-3.5 h-3.5" /> Reddet
                    </button>
                    <button
                      onClick={() => fazlaMesaiOnayla(o.employeeId, 'onaylandi')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-medium hover:bg-green-700"
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Onayla
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {aktifSekme === 'vardiya' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">Vardiya tanimlari ve kurallar</p>
            <button
              onClick={() => setVardiyaModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700"
            >
              <Plus className="w-3 h-3" /> Yeni Vardiya
            </button>
          </div>

          <div className="grid gap-4">
            {vardiyalar.map((v) => {
              const [gh, gm] = v.giris.split(':').map(Number);
              const [ch, cm] = v.cikis.split(':').map(Number);
              let planli = ch * 60 + cm - (gh * 60 + gm);
              if (planli < 0) planli += 24 * 60;
              const netSaat = (planli - v.molaDk) / 60;

              return (
                <div key={v.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800">{v.ad}</p>
                      <p className="text-xs text-gray-500">{v.departman}</p>
                    </div>
                    <div className="flex items-center gap-5 text-sm">
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Giris</p>
                        <p className="font-bold text-green-600">{v.giris}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Cikis</p>
                        <p className="font-bold text-red-500">{v.cikis}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-gray-400">Net Sure</p>
                        <p className="font-bold text-gray-700">{netSaat.toFixed(1)}s</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400">Tolerans</p>
                      <p className="text-sm font-semibold text-gray-700">{v.toleransDk} dk</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400">Mola</p>
                      <p className="text-sm font-semibold text-orange-700">{v.molaDk} dk</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-gray-400">Haftalik Limit</p>
                      <p className="text-sm font-semibold text-purple-700">{v.haftaOtLimit} saat</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {checkInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Giris / Cikis Kaydet</h3>
              <button onClick={() => setCheckInModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['parmakizi', 'Parmak Izi'],
                ['rfid', 'RFID Kart'],
                ['mobil-gps', 'GPS'],
                ['mobil-qr', 'QR'],
                ['beacon', 'Beacon'],
                ['manuel', 'Manuel'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setCheckInTur(id as KaynakTip)}
                  className={`py-2 rounded-xl border-2 text-xs ${
                    checkInTur === id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="h-16 rounded-xl bg-gray-50 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
              Kaynak: {kaynakEtiketi(checkInTur)}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCheckInModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                Iptal
              </button>
              <button onClick={async () => {
                if(!user) return;
                const suan = new Date();
                const tarih = suan.toISOString().split('T')[0];
                const saat = suan.toTimeString().split(' ')[0];
                try {
                   await pdksService.createVardiya({
                     company_id: user.user_metadata.company_id,
                     employee_id: user.id, // Veya seçilen kisi
                     tarih: tarih,
                     vardiya_tipi: 'sabah',
                     giris_saati: saat,
                     cikis_saati: null,
                     durum: 'zamaninda',
                     notlar: 'Manuel giris'
                   });
                   await loadData();
                } catch(e) {
                   console.log(e);
                   // If already checked in today, update it
                   const existing = allKayitlar.find(k => k.employeeId === user.id && k.tarih === tarih);
                   if (existing) {
                      await pdksService.updateVardiya(existing.id, { cikis_saati: saat });
                      await loadData();
                   }
                }
                setCheckInModal(false);
              }} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                Kaydet (Giris/Cikis)
              </button>
            </div>
          </div>
        </div>
      )}

      {duzeltmeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Giriş / Çıkış Saati Düzenle</h3>
              <button onClick={() => setDuzeltmeModal(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {duzeltmeModal.employeeName} • {duzeltmeModal.tarih}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Giriş Saati</label>
                <input
                  type="time"
                  value={duzeltmeGirisSaati}
                  onChange={(e) => setDuzeltmeGirisSaati(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Çıkış Saati</label>
                <input
                  type="time"
                  value={duzeltmeSaati}
                  onChange={(e) => setDuzeltmeSaati(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDuzeltmeModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                Iptal
              </button>
              <button
                onClick={duzeltmeKaydet}
                disabled={!duzeltmeSaati}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {vardiyaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Yeni Vardiya</h3>
              <button onClick={() => setVardiyaModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Vardiya Adi"
                value={yeniVardiya.ad ?? ''}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, ad: e.target.value }))}
                className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={yeniVardiya.giris ?? ''}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, giris: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="time"
                value={yeniVardiya.cikis ?? ''}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, cikis: e.target.value }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Tolerans dk"
                value={yeniVardiya.toleransDk ?? 15}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, toleransDk: parseInt(e.target.value || '0', 10) }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Mola dk"
                value={yeniVardiya.molaDk ?? 60}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, molaDk: parseInt(e.target.value || '0', 10) }))}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                placeholder="Departman"
                value={yeniVardiya.departman ?? ''}
                onChange={(e) => setYeniVardiya((p) => ({ ...p, departman: e.target.value }))}
                className="col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setVardiyaModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600">
                Iptal
              </button>
              <button
                onClick={() => {
                  if (!yeniVardiya.ad || !yeniVardiya.giris || !yeniVardiya.cikis) return;
                  setVardiyalar((prev) => [
                    ...prev,
                    {
                      id: `v${Date.now()}`,
                      ad: yeniVardiya.ad,
                      giris: yeniVardiya.giris,
                      cikis: yeniVardiya.cikis,
                      departman: yeniVardiya.departman || 'Tum Departmanlar',
                      toleransDk: yeniVardiya.toleransDk ?? 15,
                      molaDk: yeniVardiya.molaDk ?? 60,
                      haftaOtLimit: yeniVardiya.haftaOtLimit ?? 45,
                      esnek: yeniVardiya.esnek ?? false,
                    },
                  ]);
                  setYeniVardiya({ toleransDk: 15, molaDk: 60, haftaOtLimit: 45, esnek: false });
                  setVardiyaModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-1.5"
              >
                <Save className="w-4 h-4" /> Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDKSYonetimi;
