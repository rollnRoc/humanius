import React, { useState, useEffect } from 'react';
import { Plus, X, Save, TrendingUp, Info } from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface YanHakKategori {
  id: string;
  ad: string;
  icon: string;
  aciklama: string;
  renk: string;
}

interface YanHakSecim {
  employeeId: string;
  kategoriId: string;
  tutar: number;
  aciklama: string;
}

const KATEGORILER: YanHakKategori[] = [
  { id: 'saglik', ad: 'Sağlık Sigortası', icon: '🏥', aciklama: 'Tamamlayıcı sağlık sigortası', renk: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'yemek', ad: 'Yemek Kartı', icon: '🍽️', aciklama: 'Aylık yemek kartı yüklemesi', renk: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'egitim', ad: 'Eğitim Bütçesi', icon: '📚', aciklama: 'Kurs, sertifika, konferans', renk: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'spor', ad: 'Spor & Sağlık', icon: '🏋️', aciklama: 'Spor salonu üyeliği, yoga', renk: 'bg-green-100 text-green-700 border-green-200' },
  { id: 'ulasim', ad: 'Ulaşım Desteği', icon: '🚌', aciklama: 'İstanbul kart, servis, yakıt', renk: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'teknoloji', ad: 'Teknoloji / Aksesuar', icon: '💻', aciklama: 'Kulaklık, klavye, webcam vs.', renk: 'bg-gray-100 text-gray-700 border-gray-200' },
  { id: 'hediye', ad: 'Hediye Çeki', icon: '🎁', aciklama: 'Doğum günü, bayram çekler', renk: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'diger', ad: 'Diğer', icon: '✨', aciklama: 'Özel tercihler', renk: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
];

const DEMO_SECIMLER: YanHakSecim[] = [
  { employeeId: 'emp1', kategoriId: 'saglik', tutar: 2400, aciklama: 'Tamamlayıcı sağlık sigortası yıllık' },
  { employeeId: 'emp1', kategoriId: 'yemek', tutar: 1200, aciklama: '100₺/gün 12 ay' },
  { employeeId: 'emp1', kategoriId: 'egitim', tutar: 1400, aciklama: 'Udemy + konferans' },
];

interface WhatIfSenaryo {
  ad: string;
  maasArtisYuzde: number;
  ekBudget: number;
  notlar: string;
}

interface EsnekYanHaklarProps {
  employees: Employee[];
}

const EsnekYanHaklar: React.FC<EsnekYanHaklarProps> = ({ employees }) => {
  const KISI_BUTCE = 6000; // Yıllık yan hak bütçesi (TL)
  const { appRole } = useAuth();
  const isEmployeeRole = ['employee', 'user'].includes(appRole);

  const [secimler, setSecimler] = useState<YanHakSecim[]>(DEMO_SECIMLER);
  const [secilenEmp, setSecilenEmp] = useState<string>(employees[0]?.id ?? '');
  const [yeniSecimModal, setYeniSecimModal] = useState(false);
  const [yeniSecim, setYeniSecim] = useState<{ kategoriId: string; tutar: number; aciklama: string }>({ kategoriId: '', tutar: 0, aciklama: '' });
  const [whatIfAcik, setWhatIfAcik] = useState(false);
  const [senaryo, setSenaryo] = useState<WhatIfSenaryo>({ ad: 'Senaryo A', maasArtisYuzde: 10, ekBudget: 1000, notlar: '' });
  const [hesapSonucu, setHesapSonucu] = useState<{ toplamMaliyet: number; kisiBasiMaliyet: number } | null>(null);

  // Sync selected employee and map DEMO_SECIMLER to actual first employee ID
  useEffect(() => {
    if (employees.length > 0) {
      const firstEmpId = employees[0].id;
      setSecilenEmp(firstEmpId);
      setSecimler((prev) =>
        prev.map((s) => (s.employeeId === 'emp1' ? { ...s, employeeId: firstEmpId } : s))
      );
    }
  }, [employees]);

  const empSecimler = secimler.filter((s) => s.employeeId === secilenEmp);
  const toplamKullanan = empSecimler.reduce((sum, s) => sum + s.tutar, 0);
  const kalan = KISI_BUTCE - toplamKullanan;

  const emp = employees.find((e) => e.id === secilenEmp);

  function ekleSecim() {
    setSecimler((prev) => [
      ...prev,
      { employeeId: secilenEmp, ...yeniSecim },
    ]);
    setYeniSecimModal(false);
    setYeniSecim({ kategoriId: '', tutar: 0, aciklama: '' });
  }

  function silSecim(empId: string, katId: string) {
    setSecimler((prev) => prev.filter((s) => !(s.employeeId === empId && s.kategoriId === katId)));
  }

  function hesaplaWhatIf() {
    const totalCount = employees.length || 1;
    const totalCurrentSalary = employees.reduce((sum, e) => sum + (Number(e.salary) || 30000), 0);
    const avgSalary = totalCurrentSalary / totalCount;
    
    // Her personelin kendi gerçek maaşı üzerinden zam hesabı
    const totalSalaryIncrease = employees.length > 0 
      ? employees.reduce((sum, e) => sum + ((Number(e.salary) || avgSalary) * (senaryo.maasArtisYuzde / 100)), 0)
      : avgSalary * (senaryo.maasArtisYuzde / 100);

    const totalExtraFlexBudget = senaryo.ekBudget * totalCount;
    const toplamEkMaliyet = totalSalaryIncrease + totalExtraFlexBudget;
    const kisiBasiMaliyet = toplamEkMaliyet / totalCount;
    
    setHesapSonucu({ 
      toplamMaliyet: Math.round(toplamEkMaliyet), 
      kisiBasiMaliyet: Math.round(kisiBasiMaliyet),
      mevcutOrtalamaMaas: Math.round(avgSalary),
      yeniOrtalamaMaas: Math.round(avgSalary + (toplamEkMaliyet / totalCount))
    } as any);
  }

  const kategoriDagilim = KATEGORILER.map((k) => ({
    ...k,
    tutar: secimler.filter((s) => s.kategoriId === k.id).reduce((sum, s) => sum + s.tutar, 0),
    kisiSayisi: new Set(secimler.filter((s) => s.kategoriId === k.id).map((s) => s.employeeId)).size,
  })).filter((k) => k.tutar > 0);

  const toplamYanHakMaliyeti = secimler.reduce((sum, s) => sum + s.tutar, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Esnek Yan Haklar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Kişiye özel bütçe dağılımı ve bütçe simülasyonu</p>
        </div>
        {!isEmployeeRole && (
          <div className="flex gap-2">
            <button onClick={() => setWhatIfAcik(!whatIfAcik)}
              className="flex items-center gap-2 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-50">
              <TrendingUp className="w-4 h-4" />What-if Simülasyonu
            </button>
          </div>
        )}
      </div>

      {/* What-if paneli */}
      {whatIfAcik && !isEmployeeRole && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <p className="font-semibold text-gray-800">Maliyet Simülasyonu</p>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">What-if</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Senaryo Adı</label>
              <input value={senaryo.ad} onChange={(e) => setSenaryo({ ...senaryo, ad: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Maaş Artış (%)</label>
              <input type="number" value={senaryo.maasArtisYuzde} onChange={(e) => setSenaryo({ ...senaryo, maasArtisYuzde: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Ek Yan Hak Bütçesi (₺/kişi)</label>
              <input type="number" value={senaryo.ekBudget} onChange={(e) => setSenaryo({ ...senaryo, ekBudget: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex items-end">
              <button onClick={hesaplaWhatIf}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
                Hesapla
              </button>
            </div>
          </div>

          {hesapSonucu && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 font-medium">Mevcut Şirket Ort. Maaşı</p>
                <p className="text-xl font-bold text-blue-700">{((hesapSonucu as any).mevcutOrtalamaMaas || 0).toLocaleString('tr-TR')} ₺</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 font-medium">Kişi Başı Ek Maliyet</p>
                <p className="text-xl font-bold text-green-700">{hesapSonucu.kisiBasiMaliyet.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 font-medium">Şirket Toplam Ek Maliyeti ({employees.length} Kişi)</p>
                <p className="text-xl font-bold text-red-700">{hesapSonucu.toplamMaliyet.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5">
                <p className="text-xs text-gray-500 font-medium">Ek Yan Hak Bütçesi</p>
                <p className="text-xl font-bold text-purple-700">{(senaryo.ekBudget * (employees.length || 1)).toLocaleString('tr-TR')} ₺</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Özet */}
      {isEmployeeRole ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Kişisel Bütçe</p>
            <p className="text-2xl font-bold text-blue-700">{KISI_BUTCE.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div className="bg-indigo-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Kullanılan Bütçe</p>
            <p className="text-2xl font-bold text-indigo-700">{toplamKullanan.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Kalan Bütçe</p>
            <p className={`text-2xl font-bold ${kalan < 0 ? 'text-red-700' : 'text-green-700'}`}>{kalan.toLocaleString('tr-TR')} ₺</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-indigo-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Toplam Yan Hak Maliyeti</p>
            <p className="text-2xl font-bold text-indigo-700">{toplamYanHakMaliyeti.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Kişi Başı Bütçe</p>
            <p className="text-2xl font-bold text-blue-700">{KISI_BUTCE.toLocaleString('tr-TR')} ₺</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">En Çok Tercih</p>
            <p className="text-lg font-bold text-green-700">
              {kategoriDagilim.sort((a, b) => b.kisiSayisi - a.kisiSayisi)[0]?.icon} {kategoriDagilim[0]?.ad ?? '—'}
            </p>
          </div>
          <div className="bg-orange-50 rounded-2xl p-4">
            <p className="text-xs text-gray-500">Aktif Kategori</p>
            <p className="text-2xl font-bold text-orange-700">{kategoriDagilim.length}</p>
          </div>
        </div>
      )}

      <div className={isEmployeeRole ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-5"}>
        {/* Sol: Kişi bütçe paneli */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">Personel Bütçe Yönetimi</p>
              {!isEmployeeRole && (
                <select value={secilenEmp} onChange={(e) => setSecilenEmp(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none">
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              )}
            </div>

            {emp && (
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                  <span className="text-xs text-gray-500">{emp.position}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full transition-all ${kalan < 500 ? 'bg-red-500' : kalan < 1500 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (toplamKullanan / KISI_BUTCE) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Kullanılan: {toplamKullanan.toLocaleString('tr-TR')} ₺</span>
                  <span className={kalan < 0 ? 'text-red-600 font-semibold' : ''}>
                    Kalan: {kalan.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {empSecimler.map((s) => {
                const kat = KATEGORILER.find((k) => k.id === s.kategoriId);
                if (!kat) return null;
                return (
                  <div key={s.kategoriId} className={`flex items-center justify-between p-2.5 rounded-xl border ${kat.renk}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{kat.icon}</span>
                      <div>
                        <p className="text-xs font-semibold">{kat.ad}</p>
                        <p className="text-[10px] opacity-70">{s.aciklama}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{s.tutar.toLocaleString('tr-TR')} ₺</span>
                      {!isEmployeeRole && (
                        <button onClick={() => silSecim(secilenEmp, s.kategoriId)} className="opacity-50 hover:opacity-100">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {!isEmployeeRole && (
              <button
                onClick={() => setYeniSecimModal(true)}
                className="w-full border border-dashed border-gray-300 text-gray-500 rounded-xl py-2 text-sm hover:border-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Yan Hak Ekle
              </button>
            )}
          </div>
        </div>

        {/* Sağ: Şirket geneli dağılım */}
        {!isEmployeeRole && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Şirket Geneli Dağılım</p>
            <div className="space-y-2">
              {kategoriDagilim.map((k) => (
                <div key={k.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>{k.icon}</span>
                      <span className="text-gray-700 font-medium">{k.ad}</span>
                    </span>
                    <span className="text-gray-500">{k.tutar.toLocaleString('tr-TR')} ₺ · {k.kisiSayisi} kişi</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(k.tutar / toplamYanHakMaliyeti) * 100}%` }} />
                  </div>
                </div>
              ))}

              {kategoriDagilim.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Henüz yan hak seçimi yapılmamış</p>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between text-sm font-semibold text-gray-800">
                <span>Toplam</span>
                <span>{toplamYanHakMaliyeti.toLocaleString('tr-TR')} ₺</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{secimler.length} seçim · {new Set(secimler.map((s) => s.employeeId)).size} çalışan</p>
            </div>
          </div>
        )}
      </div>

      {/* Yeni seçim modal */}
      {yeniSecimModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Yan Hak Ekle</p>
              <button onClick={() => setYeniSecimModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Kalan bütçe: <strong>{kalan.toLocaleString('tr-TR')} ₺</strong></span>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Kategori</label>
              <div className="grid grid-cols-2 gap-2">
                {KATEGORILER.filter((k) => !empSecimler.find((s) => s.kategoriId === k.id)).map((k) => (
                  <button key={k.id} onClick={() => setYeniSecim({ ...yeniSecim, kategoriId: k.id })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs text-left transition-all ${
                      yeniSecim.kategoriId === k.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <span className="text-base">{k.icon}</span>
                    <span className="font-medium text-gray-700">{k.ad}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tutar (₺/yıl)</label>
              <input type="number" value={yeniSecim.tutar || ''} onChange={(e) => setYeniSecim({ ...yeniSecim, tutar: parseInt(e.target.value) || 0 })}
                placeholder="Örn: 1200"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
              {yeniSecim.tutar > kalan && (
                <p className="text-xs text-red-600 mt-1">⚠ Bütçeyi aşıyor!</p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Açıklama</label>
              <input value={yeniSecim.aciklama} onChange={(e) => setYeniSecim({ ...yeniSecim, aciklama: e.target.value })}
                placeholder="Örn: Aylık 100₺ × 12 ay"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setYeniSecimModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">İptal</button>
              <button
                onClick={ekleSecim}
                disabled={!yeniSecim.kategoriId || !yeniSecim.tutar || yeniSecim.tutar > kalan}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" /> Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EsnekYanHaklar;
