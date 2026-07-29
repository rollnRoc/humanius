import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Calendar, Users, X, Info, ChevronLeft, ChevronRight } from 'lucide-react';
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
  baslangic: string;
  bitis: string;
  tur: string;
  durum: 'beklemede' | 'onaylandi' | 'reddedildi';
}

const DEMO_IZINLER: IzinKayit[] = [
  { id: 'iz1', employeeId: 'e1', employeeAdi: 'Ahmet Yılmaz', departman: 'Yazılım', baslangic: '2026-05-25', bitis: '2026-05-29', tur: 'Yıllık İzin', durum: 'onaylandi' },
  { id: 'iz2', employeeId: 'e2', employeeAdi: 'Elif Kara', departman: 'Yazılım', baslangic: '2026-05-26', bitis: '2026-05-30', tur: 'Yıllık İzin', durum: 'beklemede' },
  { id: 'iz3', employeeId: 'e3', employeeAdi: 'Can Demir', departman: 'Satış', baslangic: '2026-04-22', bitis: '2026-04-24', tur: 'Yıllık İzin', durum: 'onaylandi' },
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

interface CakismaUyari {
  tip: 'resmi-tatil' | 'departman-cakisma' | 'hafta-sonu';
  mesaj: string;
  tarih: string;
}

interface IzinCakismaProps {
  employees: Employee[];
  izinTalepleri?: any[];
}

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
      const mapped = izinTalepleri.map((iz) => {
        const emp = employees.find((e) => e.id === iz.employeeId || e.id === iz.employee_id);
        return {
          id: iz.id,
          employeeId: iz.employeeId || iz.employee_id,
          employeeAdi: emp?.name ?? 'Bilinmeyen Çalışan',
          departman: emp?.department ?? 'Bilinmeyen Departman',
          baslangic: iz.baslangicTarihi || iz.baslangic_tarihi,
          bitis: iz.bitisTarihi || iz.bitis_tarihi,
          tur: getIzinTurLabel(iz.izinTuru || iz.izin_turu),
          durum: (iz.durum || 'beklemede') as 'beklemede' | 'onaylandi' | 'reddedildi',
        };
      });
      setIzinler(mapped);
    }
  }, [izinTalepleri, employees]);
  const [takvimAy, setTakvimAy] = useState({ 
    yil: new Date().getFullYear(), 
    ay: new Date().getMonth() + 1 
  });
  const [aktifSekme, setAktifSekme] = useState<'takvim' | 'liste' | 'tatil'>('takvim');

  // Çakışma kontrolü
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
        if (izEmp?.department === departman && iz.employeeId !== yeniIzin.employeeId) {
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

  const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  function izinliPersonelSayisi(tarih: string): number {
    return izinler.filter((iz) => iz.durum !== 'reddedildi' && tarihAralik(iz.baslangic, iz.bitis).includes(tarih)).length;
  }

  // Check if two or more people from the same department are on leave on the same day
  const checkDepartmanCakismaOnDay = (tarih: string): boolean => {
    const activeLeaves = izinler.filter(
      (iz) => iz.durum !== 'reddedildi' && tarihAralik(iz.baslangic, iz.bitis).includes(tarih)
    );
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

  // Get list of employees on leave on a day (for tooltip/title display)
  const getIzinliPersonelDetay = (tarih: string): string => {
    const activeLeaves = izinler.filter(
      (iz) => iz.durum !== 'reddedildi' && tarihAralik(iz.baslangic, iz.bitis).includes(tarih)
    );
    if (activeLeaves.length === 0) return '';
    return activeLeaves.map((iz) => `${iz.employeeAdi} (${iz.departman})`).join(', ');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">İzin Çakışma Kontrolü</h2>
          <p className="text-sm text-gray-500 mt-0.5">Departman çakışmaları ve Türkiye 2026 resmi tatil takvimi</p>
        </div>
        <button onClick={() => setFormAcik(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
          <Calendar className="w-4 h-4" />
          Yeni İzin Talebi
        </button>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['takvim', 'liste', 'tatil'] as const).map((s) => (
          <button key={s} onClick={() => setAktifSekme(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${aktifSekme === s ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s === 'takvim' ? '📅 Takvim Görünümü' : s === 'liste' ? '📋 İzin Listesi' : '🗓 Resmi Tatiller 2026'}
          </button>
        ))}
      </div>

      {/* --- TAKVİM --- */}
      {aktifSekme === 'takvim' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setTakvimAy((p) => p.ay === 1 ? { yil: p.yil - 1, ay: 12 } : { yil: p.yil, ay: p.ay - 1 })}
              className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="font-semibold text-gray-800">{AY_ADLARI[takvimAy.ay - 1]} {takvimAy.yil}</p>
            <button onClick={() => setTakvimAy((p) => p.ay === 12 ? { yil: p.yil + 1, ay: 1 } : { yil: p.yil, ay: p.ay + 1 })}
              className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((g) => (
              <div key={g} className="text-center text-[10px] font-semibold text-gray-400 py-1">{g}</div>
            ))}
            {ayGunleri.map((gun, i) => {
              if (!gun) return <div key={`b${i}`} />;
              const tatil = isResmiTatil(gun);
              const haftatatimi = haftatatimiMi(gun);
              const izinSayisi = izinliPersonelSayisi(gun);
              const hasDeptConflict = checkDepartmanCakismaOnDay(gun);
              const detayStr = getIzinliPersonelDetay(gun);
              const tatilMesaj = tatil ? `${tatilAdi(gun)}` : '';
              const tooltipParts = [
                tatilMesaj,
                izinSayisi > 0 ? `${izinSayisi} kişi izinde: ${detayStr}` : null,
                hasDeptConflict ? '⚠️ Aynı departmandan birden fazla kişi izinde!' : null
              ].filter(Boolean).join(' | ');

              return (
                <div key={gun}
                  title={tooltipParts || undefined}
                  className={`relative aspect-square rounded-lg text-center flex flex-col items-center justify-center text-xs cursor-default
                    ${tatil ? 'bg-red-100 text-red-700 font-bold' : haftatatimi ? 'bg-gray-50 text-gray-400' : 'text-gray-700 hover:bg-gray-50'}
                    ${hasDeptConflict ? 'ring-2 ring-amber-400 ring-offset-1 bg-amber-50' : ''}
                  `}>
                  <span>{gun.split('-')[2]}</span>
                  {izinSayisi > 0 && (
                    <span className={`absolute bottom-0.5 right-0.5 text-[9px] text-white rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-sm ${
                      hasDeptConflict ? 'bg-amber-500 ring-1 ring-amber-300 animate-pulse' : 'bg-indigo-900'
                    }`}>
                      {izinSayisi}
                    </span>
                  )}
                  {tatil && <span className="absolute top-0.5 right-0.5 text-[7px]">🔴</span>}
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 text-[11px] text-gray-500 flex-wrap pt-1">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-100 border border-red-400 inline-block" /> Resmi Tatil</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-900 inline-block" /> İzinli personel sayısı (Lacivert)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Departman İzin Çakışması (Uyarı)</span>
          </div>
        </div>
      )}

      {/* --- LİSTE --- */}
      {aktifSekme === 'liste' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Personel</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Departman</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarihler</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tür</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {izinler.map((iz) => {
                const gunler = tarihAralik(iz.baslangic, iz.bitis);
                const tatilGunler = gunler.filter(isResmiTatil);
                return (
                  <tr key={iz.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{iz.employeeAdi}</td>
                    <td className="px-4 py-3 text-gray-500">{iz.departman}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{iz.baslangic} – {iz.bitis}</div>
                      {tatilGunler.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {tatilGunler.length} resmi tatil günü içeriyor
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{iz.tur}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        iz.durum === 'onaylandi' ? 'bg-green-100 text-green-700' :
                        iz.durum === 'reddedildi' ? 'bg-red-100 text-red-600' :
                        'bg-yellow-100 text-yellow-700'
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

      {/* --- RESMİ TATİLLER --- */}
      {aktifSekme === 'tatil' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-red-50 border-b border-red-100 px-4 py-3">
            <p className="text-sm font-semibold text-red-800">Türkiye 2026 Resmi Tatil Takvimi</p>
            <p className="text-xs text-red-600">Toplam {RESMI_TATILLER_2026.length} tatil günü ({RESMI_TATILLER_2026.reduce((s, t) => s + t.sure, 0)} gün)</p>
          </div>
          <div className="divide-y divide-gray-50">
            {RESMI_TATILLER_2026.map((t) => (
              <div key={t.tarih} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{t.ad}</p>
                  <p className="text-xs text-gray-400">{new Date(t.tarih).toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.sure < 1 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {t.sure < 1 ? 'Yarım gün' : `${t.sure} gün`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yeni İzin Formu */}
      {formAcik && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Yeni İzin Talebi</p>
              <button onClick={() => setFormAcik(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Personel</label>
              <select value={yeniIzin.employeeId ?? ''} onChange={(e) => setYeniIzin({ ...yeniIzin, employeeId: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Seçin</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.department})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Başlangıç</label>
                <input type="date" value={yeniIzin.baslangic ?? ''} onChange={(e) => setYeniIzin({ ...yeniIzin, baslangic: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Bitiş</label>
                <input type="date" value={yeniIzin.bitis ?? ''} onChange={(e) => setYeniIzin({ ...yeniIzin, bitis: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>

            {/* Uyarılar */}
            {cakismaKontrol.length > 0 && (
              <div className="space-y-2">
                {cakismaKontrol.map((u, i) => (
                  <div key={i} className={`flex items-start gap-2 rounded-xl p-3 text-xs ${
                    u.tip === 'resmi-tatil' ? 'bg-red-50 text-red-700 border border-red-200' :
                    u.tip === 'hafta-sonu' ? 'bg-gray-50 text-gray-600 border border-gray-200' :
                    'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}>
                    {u.tip === 'departman-cakisma' ? <Users className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    <span>{u.mesaj}</span>
                  </div>
                ))}
              </div>
            )}
            {yeniIzin.baslangic && yeniIzin.bitis && cakismaKontrol.filter((u) => u.tip === 'departman-cakisma').length === 0 && cakismaKontrol.filter((u) => u.tip === 'resmi-tatil').length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-xl p-3 border border-green-200">
                <CheckCircle className="w-4 h-4" />
                Çakışma bulunamadı. İzin talebi oluşturulabilir.
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setFormAcik(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">İptal</button>
              <button onClick={kaydet}
                disabled={!yeniIzin.employeeId || !yeniIzin.baslangic || !yeniIzin.bitis}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                Talebi Oluştur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IzinCakismaKontrol;
