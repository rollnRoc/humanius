import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Calendar as CalendarIcon,
  Users,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  AlertCircle,
  Plus
} from 'lucide-react';
import type { Employee } from '../types';

// 2026 Türkiye Resmi Tatil Listesi
const RESMI_TATILLER_2026: { tarih: string; ad: string; sure: number }[] = [
  { tarih: '2026-01-01', ad: 'Yılbaşı', sure: 1 },
  { tarih: '2026-03-20', ad: 'Ramazan Bayramı Arife', sure: 0.5 },
  { tarih: '2026-03-21', ad: 'Ramazan Bayramı 1. Gün', sure: 1 },
  { tarih: '2026-03-22', ad: 'Ramazan Bayramı 2. Gün', sure: 1 },
  { tarih: '2026-03-23', ad: 'Ramazan Bayramı 3. Gün', sure: 1 },
  { tarih: '2026-04-23', ad: 'Ulusal Egemenlik ve Çocuk Bayramı', sure: 1 },
  { tarih: '2026-05-01', ad: 'Emek ve Dayanışma Günü', sure: 1 },
  { tarih: '2026-05-19', ad: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', sure: 1 },
  { tarih: '2026-05-27', ad: 'Kurban Bayramı Arife', sure: 0.5 },
  { tarih: '2026-05-28', ad: 'Kurban Bayramı 1. Gün', sure: 1 },
  { tarih: '2026-05-29', ad: 'Kurban Bayramı 2. Gün', sure: 1 },
  { tarih: '2026-05-30', ad: 'Kurban Bayramı 3. Gün', sure: 1 },
  { tarih: '2026-05-31', ad: 'Kurban Bayramı 4. Gün', sure: 1 },
  { tarih: '2026-07-15', ad: 'Demokrasi ve Millî Birlik Günü', sure: 1 },
  { tarih: '2026-08-30', ad: 'Zafer Bayramı', sure: 1 },
  { tarih: '2026-10-29', ad: 'Cumhuriyet Bayramı', sure: 1 },
];

interface IzinKayit {
  id: string;
  employeeId: string;
  employeeAdi: string;
  departman: string;
  position?: string;
  baslangic: string;
  bitis: string;
  tur: string;
  durum: 'beklemede' | 'onaylandi' | 'reddedildi';
}

const DEMO_IZINLER: IzinKayit[] = [
  { id: 'iz1', employeeId: 'e1', employeeAdi: 'Ahmet Yılmaz', departman: 'Yazılım', position: 'Kıdemli Yazılım Geliştirici', baslangic: '2026-05-25', bitis: '2026-05-29', tur: 'Yıllık İzin', durum: 'onaylandi' },
  { id: 'iz2', employeeId: 'e2', employeeAdi: 'Elif Kara', departman: 'Yazılım', position: 'Frontend Geliştirici', baslangic: '2026-05-26', bitis: '2026-05-30', tur: 'Yıllık İzin', durum: 'beklemede' },
  { id: 'iz3', employeeId: 'e3', employeeAdi: 'Can Demir', departman: 'Satış', position: 'Satış Uzmanı', baslangic: '2026-04-22', bitis: '2026-04-24', tur: 'Yıllık İzin', durum: 'onaylandi' },
];

function tarihAralik(baslangic: string, bitis: string): string[] {
  const gunler: string[] = [];
  const bas = new Date(baslangic);
  const bit = new Date(bitis);
  const current = new Date(bas);
  while (current <= bit) {
    gunler.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return gunler;
}

function isResmiTatil(tarih: string): boolean {
  return RESMI_TATILLER_2026.some((t) => t.tarih === tarih);
}

function tatilAdi(tarih: string): string | undefined {
  return RESMI_TATILLER_2026.find((t) => t.tarih === tarih)?.ad;
}

function haftatatimiMi(tarihStr: string): boolean {
  const gun = new Date(tarihStr).getDay();
  return gun === 0 || gun === 6;
}

function formatLongDateTR(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

interface CakismaUyari {
  tip: 'resmi-tatil' | 'departman-cakisma' | 'hafta-sonu';
  mesaj: string;
  tarih: string;
}

interface IzinCakismaProps {
  employees: Employee[];
  izinTalepleri?: any[];
}

const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const IzinCakismaKontrol: React.FC<IzinCakismaProps> = ({ employees, izinTalepleri }) => {
  const [izinler, setIzinler] = useState<IzinKayit[]>(DEMO_IZINLER);
  const [yeniIzin, setYeniIzin] = useState<Partial<IzinKayit>>({ tur: 'Yıllık İzin', durum: 'beklemede' });
  const [formAcik, setFormAcik] = useState(false);

  // Helper to map DB izin_turu to label
  const getIzinTurLabel = (tur: string): string => {
    switch (tur) {
      case 'yillik': return 'Yıllık İzin';
      case 'mazeret': return 'Mazeret İzni';
      case 'hastalik': return 'Hastalık İzni';
      case 'dogum': return 'Doğum İzni';
      case 'babalik': return 'Babalık İzni';
      case 'evlilik': return 'Evlilik İzni';
      case 'olum': return 'Ölüm İzni';
      case 'askerlik': return 'Askerlik İzni';
      case 'ucretsiz': return 'Ücretsiz İzin';
      default: return 'Diğer İzin';
    }
  };

  // Sync with database izinTalepleri prop
  React.useEffect(() => {
    if (izinTalepleri && izinTalepleri.length > 0) {
      const mapped: IzinKayit[] = izinTalepleri.map((iz) => {
        const emp = employees.find((e) => e.id === iz.employeeId || e.id === iz.employee_id);
        return {
          id: iz.id,
          employeeId: iz.employeeId || iz.employee_id,
          employeeAdi: emp?.name ?? iz.employeeName ?? 'Bilinmeyen Çalışan',
          departman: emp?.department ?? iz.department ?? 'Bilinmeyen Departman',
          position: emp?.position ?? '',
          baslangic: (iz.baslangicTarihi || iz.baslangic_tarihi || '').split('T')[0],
          bitis: (iz.bitisTarihi || iz.bitis_tarihi || '').split('T')[0],
          tur: getIzinTurLabel(iz.izinTuru || iz.izin_turu),
          durum: (iz.durum || 'beklemede') as 'beklemede' | 'onaylandi' | 'reddedildi',
        };
      });
      setIzinler(mapped);
    }
  }, [izinTalepleri, employees]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [takvimAy, setTakvimAy] = useState({ 
    yil: new Date().getFullYear(), 
    ay: new Date().getMonth() + 1 
  });

  const [aktifSekme, setAktifSekme] = useState<'takvim' | 'liste' | 'tatil'>('takvim');

  // Seçili gün: varsayılan bugün
  const [seciliGun, setSeciliGun] = useState<string | null>(todayStr);

  // Çakışma kontrolü (Yeni izin formunda)
  const cakismaKontrol = useMemo<CakismaUyari[]>(() => {
    if (!yeniIzin.baslangic || !yeniIzin.bitis || !yeniIzin.employeeId) return [];
    const gunler = tarihAralik(yeniIzin.baslangic, yeniIzin.bitis);
    const emp = employees.find((e) => e.id === yeniIzin.employeeId);
    const uyarilar: CakismaUyari[] = [];

    gunler.forEach((gun) => {
      if (isResmiTatil(gun)) {
        uyarilar.push({ tip: 'resmi-tatil', tarih: gun, mesaj: `${gun}: ${tatilAdi(gun)} — Bu gün resmi tatil! İzin sayılmaz.` });
      }
      if (haftatatimiMi(gun)) {
        uyarilar.push({ tip: 'hafta-sonu', tarih: gun, mesaj: `${gun}: Hafta sonu — İzin sayılmaz.` });
      }
    });

    // Departman çakışması
    const departman = emp?.department;
    if (departman) {
      izinler.filter((iz) => iz.durum !== 'reddedildi').forEach((iz) => {
        const izEmp = employees.find((e) => e.id === iz.employeeId);
        if ((izEmp?.department === departman || iz.departman === departman) && iz.employeeId !== yeniIzin.employeeId) {
          const cakisanGunler = gunler.filter((g) => tarihAralik(iz.baslangic, iz.bitis).includes(g));
          if (cakisanGunler.length > 0) {
            uyarilar.push({
              tip: 'departman-cakisma',
              tarih: cakisanGunler[0],
              mesaj: `${iz.employeeAdi} aynı tarihte izinde (${iz.baslangic} – ${iz.bitis}). Departmanda yeterli çalışan kalabilir mi?`,
            });
          }
        }
      });
    }

    return uyarilar;
  }, [yeniIzin, izinler, employees]);

  function kaydet() {
    if (!yeniIzin.baslangic || !yeniIzin.bitis || !yeniIzin.employeeId) return;
    const emp = employees.find((e) => e.id === yeniIzin.employeeId);
    setIzinler((prev) => [
      ...prev,
      {
        id: `iz${Date.now()}`,
        employeeId: yeniIzin.employeeId!,
        employeeAdi: emp?.name ?? '',
        departman: emp?.department ?? '',
        position: emp?.position ?? '',
        baslangic: yeniIzin.baslangic!,
        bitis: yeniIzin.bitis!,
        tur: yeniIzin.tur ?? 'Yıllık İzin',
        durum: 'beklemede',
      },
    ]);
    setFormAcik(false);
    setYeniIzin({ tur: 'Yıllık İzin', durum: 'beklemede' });
  }

  // Takvim hesaplamaları
  const ayGunleri = useMemo(() => {
    const ilkGun = new Date(takvimAy.yil, takvimAy.ay - 1, 1);
    const sonGun = new Date(takvimAy.yil, takvimAy.ay, 0);
    const bosluk = (ilkGun.getDay() + 6) % 7; // Pazartesi = 0
    const gunler: (string | null)[] = Array(bosluk).fill(null);
    for (let i = 1; i <= sonGun.getDate(); i++) {
      const d = `${takvimAy.yil}-${String(takvimAy.ay).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      gunler.push(d);
    }
    return gunler;
  }, [takvimAy]);

  function getIzinlerForDate(tarih: string): IzinKayit[] {
    return izinler.filter((iz) => iz.durum !== 'reddedildi' && tarihAralik(iz.baslangic, iz.bitis).includes(tarih));
  }

  function izinliPersonelSayisi(tarih: string): number {
    return getIzinlerForDate(tarih).length;
  }

  // Check if two or more people from the same department are on leave on the same day
  const checkDepartmanCakismaOnDay = (tarih: string): boolean => {
    const activeLeaves = getIzinlerForDate(tarih);
    const deptCounts: Record<string, number> = {};
    for (const iz of activeLeaves) {
      if (iz.departman && iz.departman !== 'Bilinmeyen Departman') {
        deptCounts[iz.departman] = (deptCounts[iz.departman] || 0) + 1;
        if (deptCounts[iz.departman] > 1) {
          return true;
        }
      }
    }
    return false;
  };

  // Bu ayki genel istatistikler
  const ayIstatistikleri = useMemo(() => {
    const gunList = ayGunleri.filter((g): g is string => Boolean(g));
    let toplamIzinliGun = 0;
    let cakismaGunuSayisi = 0;
    let tatilSayisi = 0;

    gunList.forEach((g) => {
      const count = izinliPersonelSayisi(g);
      if (count > 0) toplamIzinliGun += count;
      if (checkDepartmanCakismaOnDay(g)) cakismaGunuSayisi++;
      if (isResmiTatil(g)) tatilSayisi++;
    });

    return { toplamIzinliGun, cakismaGunuSayisi, tatilSayisi };
  }, [ayGunleri, izinler]);

  // Seçilen günün detayları
  const seciliGunIzinleri = useMemo(() => {
    if (!seciliGun) return [];
    return getIzinlerForDate(seciliGun);
  }, [seciliGun, izinler]);

  const seciliGunDepartmanCakismalari = useMemo(() => {
    const deptMap: Record<string, IzinKayit[]> = {};
    seciliGunIzinleri.forEach((iz) => {
      const dept = iz.departman || 'Genel';
      if (!deptMap[dept]) deptMap[dept] = [];
      deptMap[dept].push(iz);
    });
    return Object.entries(deptMap).filter(([_, list]) => list.length > 1);
  }, [seciliGunIzinleri]);

  const handleBugunGit = () => {
    const now = new Date();
    setTakvimAy({ yil: now.getFullYear(), ay: now.getMonth() + 1 });
    setSeciliGun(todayStr);
  };

  return (
    <div className="space-y-5">
      {/* ── Üst Başlık ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <AlertTriangle className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">İzin Çakışma Kontrolü</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Departman bazlı eşzamanlı izin çakışmaları, resmi tatiller ve detaylı gün analizi
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            if (seciliGun) {
              setYeniIzin({
                baslangic: seciliGun,
                bitis: seciliGun,
                tur: 'Yıllık İzin',
                durum: 'beklemede',
              });
            }
            setFormAcik(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni İzin Kontrolü / Talebi</span>
        </button>
      </div>

      {/* ── Sekmeler ── */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['takvim', 'liste', 'tatil'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setAktifSekme(s)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              aktifSekme === s
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === 'takvim' ? '📅 Takvim ve Çakışma Analizi' : s === 'liste' ? '📋 İzin Listesi' : '🗓 Resmi Tatiller 2026'}
          </button>
        ))}
      </div>

      {/* ── 1. TAKVİM & GÜN DETAYI ── */}
      {aktifSekme === 'takvim' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Sol Kolon: Takvim Tablosu (7 veya 8 sütun) */}
          <div className="xl:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">
            {/* Ay Navigasyon ve İstatistik Barı */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTakvimAy((p) => p.ay === 1 ? { yil: p.yil - 1, ay: 12 } : { yil: p.yil, ay: p.ay - 1 })}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Önceki Ay"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <p className="font-bold text-base text-gray-900 capitalize min-w-[130px] text-center">
                  {AY_ADLARI[takvimAy.ay - 1]} {takvimAy.yil}
                </p>
                <button
                  onClick={() => setTakvimAy((p) => p.ay === 12 ? { yil: p.yil + 1, ay: 1 } : { yil: p.yil, ay: p.ay + 1 })}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Sonraki Ay"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleBugunGit}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                >
                  Bugün
                </button>
              </div>

              {/* Ay Özeti Rozetleri */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  {ayIstatistikleri.toplamIzinliGun} İzinli Kaydı
                </span>
                {ayIstatistikleri.cakismaGunuSayisi > 0 && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    {ayIstatistikleri.cakismaGunuSayisi} Çakışma
                  </span>
                )}
                {ayIstatistikleri.tatilSayisi > 0 && (
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    {ayIstatistikleri.tatilSayisi} Tatil
                  </span>
                )}
              </div>
            </div>

            {/* Takvim Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((g, idx) => (
                <div
                  key={g}
                  className={`text-center text-xs font-bold py-1.5 rounded-lg ${
                    idx >= 5 ? 'text-rose-500 bg-rose-50/40' : 'text-gray-500 bg-gray-50'
                  }`}
                >
                  {g}
                </div>
              ))}

              {ayGunleri.map((gun, i) => {
                if (!gun) {
                  return <div key={`empty-${i}`} className="min-h-[56px] rounded-xl bg-gray-50/40 border border-transparent" />;
                }

                const tatil = isResmiTatil(gun);
                const haftasonu = haftatatimiMi(gun);
                const izinSayisi = izinliPersonelSayisi(gun);
                const hasDeptConflict = checkDepartmanCakismaOnDay(gun);
                const isSelected = seciliGun === gun;
                const isToday = gun === todayStr;

                return (
                  <div
                    key={gun}
                    onClick={() => setSeciliGun(gun)}
                    className={`relative min-h-[58px] sm:min-h-[64px] p-1.5 rounded-xl border flex flex-col items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-indigo-600 bg-indigo-50/90 border-indigo-400 shadow-sm scale-[1.02] z-10'
                        : hasDeptConflict
                        ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 hover:border-amber-400 shadow-xs'
                        : tatil
                        ? 'border-red-200 bg-red-50/60 hover:bg-red-100/70'
                        : haftasonu
                        ? 'border-gray-100 bg-slate-50/70 hover:bg-slate-100/70 text-gray-500'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                    }`}
                  >
                    {/* Gün Numarası ve Bugün İşareti */}
                    <div className="w-full flex items-center justify-between">
                      <span
                        className={`text-xs font-bold flex items-center justify-center rounded-full ${
                          isToday
                            ? 'w-5 h-5 bg-indigo-600 text-white shadow-xs'
                            : tatil
                            ? 'text-red-700 font-extrabold'
                            : isSelected
                            ? 'text-indigo-900 font-extrabold'
                            : 'text-gray-700'
                        }`}
                      >
                        {gun.split('-')[2]}
                      </span>

                      {tatil && (
                        <span className="text-[10px]" title={tatilAdi(gun)}>
                          🔴
                        </span>
                      )}
                    </div>

                    {/* İzin Rozetleri */}
                    <div className="w-full flex items-center justify-end gap-1 mt-1">
                      {hasDeptConflict && (
                        <span
                          className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs animate-bounce"
                          title="⚠️ Departman içi izin çakışması!"
                        >
                          !
                        </span>
                      )}
                      {izinSayisi > 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold text-white flex items-center gap-0.5 shadow-xs ${
                            hasDeptConflict ? 'bg-amber-600' : 'bg-indigo-700'
                          }`}
                        >
                          <Users className="w-2.5 h-2.5" />
                          <span>{izinSayisi}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Açıklama / Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-red-100 border border-red-300 inline-block" /> Resmi Tatil
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-700 text-white text-[8px] flex items-center justify-center font-bold">1</span> İzinli Personel
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 text-white text-[8px] flex items-center justify-center font-bold">!</span> Departman Çakışması
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-indigo-50 border-2 border-indigo-600 inline-block" /> Seçili Gün
              </span>
            </div>
          </div>

          {/* Sağ Kolon: Seçilen Günün ve Çakışmaların Detay Kartı (5 sütun) */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
              {/* Seçili Gün Başlığı */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">GÜN İNCELEMESİ VE ÇAKIŞMA DETAYI</p>
                  <h3 className="text-base font-bold text-gray-900 mt-0.5 capitalize">
                    {seciliGun ? formatLongDateTR(seciliGun) : 'Gün Seçilmedi'}
                  </h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {seciliGun && isResmiTatil(seciliGun) && (
                    <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                      🔴 {tatilAdi(seciliGun)}
                    </span>
                  )}
                  {seciliGun && haftatatimiMi(seciliGun) && (
                    <span className="text-[11px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                      Hafta Sonu
                    </span>
                  )}
                </div>
              </div>

              {/* Departman Çakışma Uyarısı (Eğer aynı gün aynı departmandan birden fazla kişi izindeyse) */}
              {seciliGunDepartmanCakismalari.length > 0 && (
                <div className="p-3.5 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>⚠️ Departman İzin Çakışması Tespit Edildi!</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Aşağıdaki departmanlarda aynı gün birden fazla çalışan izinli durumdadır. İş akışının aksamaması için onay öncesinde kontrol edilmesi önerilir:
                  </p>
                  <div className="space-y-1 mt-1">
                    {seciliGunDepartmanCakismalari.map(([dept, kisiler]) => (
                      <div key={dept} className="bg-white/80 border border-amber-200 rounded-lg p-2 text-xs">
                        <span className="font-bold text-amber-950">{dept} Departmanı ({kisiler.length} kişi):</span>
                        <div className="text-amber-900 mt-0.5 font-medium">
                          {kisiler.map((k) => k.employeeAdi).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* İzinli Kişilerin Listesi */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Bu Tarihteki İzinli Personeller ({seciliGunIzinleri.length})</span>
                  </h4>
                </div>

                {seciliGunIzinleri.length === 0 ? (
                  <div className="p-6 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-xl space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-gray-700">Bu tarihte planlı izin bulunmamaktadır.</p>
                    <p className="text-[11px] text-gray-500">Departman personellerinin tümü mesaide görünmektedir. Çakışma riski yoktur.</p>
                    <button
                      onClick={() => {
                        if (seciliGun) {
                          setYeniIzin({
                            baslangic: seciliGun,
                            bitis: seciliGun,
                            tur: 'Yıllık İzin',
                            durum: 'beklemede',
                          });
                          setFormAcik(true);
                        }
                      }}
                      className="mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Bu Güne İzin Talebi Oluştur</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {seciliGunIzinleri.map((iz) => {
                      const isDeptConflicted = seciliGunDepartmanCakismalari.some(
                        ([dept]) => dept === iz.departman
                      );

                      return (
                        <div
                          key={iz.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isDeptConflicted
                              ? 'bg-amber-50/70 border-amber-200 shadow-xs'
                              : 'bg-gray-50/70 border-gray-100 hover:bg-gray-100/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs text-gray-900">{iz.employeeAdi}</span>
                                {isDeptConflicted && (
                                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <AlertTriangle className="w-2.5 h-2.5" /> Çakışma
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                <span className="font-semibold text-gray-700">{iz.departman}</span>
                                {iz.position && ` · ${iz.position}`}
                              </p>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                iz.durum === 'onaylandi'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {iz.durum === 'onaylandi' ? '✓ Onaylı' : '⏳ Bekliyor'}
                            </span>
                          </div>

                          <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-600">
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                              {iz.tur}
                            </span>
                            <span className="font-medium text-gray-500">
                              📅 {iz.baslangic} – {iz.bitis}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. LİSTE ── */}
      {aktifSekme === 'liste' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Personel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Departman & Görev</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarih Aralığı</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">İzin Türü</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {izinler.map((iz) => {
                const gunler = tarihAralik(iz.baslangic, iz.bitis);
                const tatilGunler = gunler.filter(isResmiTatil);
                return (
                  <tr key={iz.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900">{iz.employeeAdi}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div>{iz.departman}</div>
                      {iz.position && <div className="text-gray-400">{iz.position}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      <div className="font-medium">{iz.baslangic} – {iz.bitis}</div>
                      {tatilGunler.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {tatilGunler.length} resmi tatil günü içeriyor
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">{iz.tur}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                        iz.durum === 'onaylandi' ? 'bg-emerald-100 text-emerald-800' :
                        iz.durum === 'reddedildi' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {iz.durum === 'onaylandi' ? 'Onaylandı' : iz.durum === 'reddedildi' ? 'Reddedildi' : 'Beklemede'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 3. RESMİ TATİLLER ── */}
      {aktifSekme === 'tatil' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="bg-red-50 border-b border-red-100 px-5 py-3.5 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-red-900">Türkiye 2026 Resmi Tatil Takvimi</p>
              <p className="text-xs text-red-600 mt-0.5">Yıllık izin hesaplamalarında resmi tatil günleri izin gününden düşülmez.</p>
            </div>
            <span className="text-xs font-bold text-red-800 bg-white/80 border border-red-200 px-3 py-1 rounded-full">
              Toplam {RESMI_TATILLER_2026.length} Gün ({RESMI_TATILLER_2026.reduce((s, t) => s + t.sure, 0)} Gün İzin Muafiyeti)
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {RESMI_TATILLER_2026.map((t) => (
              <div key={t.tarih} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.ad}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(t.tarih).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${t.sure < 1 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>
                  {t.sure < 1 ? 'Yarım gün (Arife)' : `${t.sure} gün tam tatil`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Yeni İzin Formu Modal ── */}
      {formAcik && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-900 text-base">İzin Çakışma Ön Değerlendirmesi</p>
              <button onClick={() => setFormAcik(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Personel</label>
              <select
                value={yeniIzin.employeeId ?? ''}
                onChange={(e) => setYeniIzin({ ...yeniIzin, employeeId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-medium"
              >
                <option value="">Personel Seçin</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department || 'Departman Yok'})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={yeniIzin.baslangic ?? ''}
                  onChange={(e) => setYeniIzin({ ...yeniIzin, baslangic: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-medium"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={yeniIzin.bitis ?? ''}
                  onChange={(e) => setYeniIzin({ ...yeniIzin, bitis: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-indigo-300 font-medium"
                />
              </div>
            </div>

            {/* Çakışma Uyarıları */}
            {cakismaKontrol.length > 0 && (
              <div className="space-y-2">
                {cakismaKontrol.map((u, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                      u.tip === 'resmi-tatil'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : u.tip === 'hafta-sonu'
                        ? 'bg-gray-50 text-gray-600 border border-gray-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {u.tip === 'departman-cakisma' ? (
                      <Users className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
                    )}
                    <span className="font-medium">{u.mesaj}</span>
                  </div>
                ))}
              </div>
            )}

            {yeniIzin.baslangic && yeniIzin.bitis && cakismaKontrol.filter((u) => u.tip === 'departman-cakisma').length === 0 && cakismaKontrol.filter((u) => u.tip === 'resmi-tatil').length === 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 rounded-xl p-3 border border-emerald-200 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Departman çakışması veya resmi tatil çakışması bulunamadı. İzin oluşturulabilir.</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFormAcik(false)}
                className="flex-1 border border-gray-200 rounded-xl py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={kaydet}
                disabled={!yeniIzin.employeeId || !yeniIzin.baslangic || !yeniIzin.bitis}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
              >
                Talebi Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IzinCakismaKontrol;
