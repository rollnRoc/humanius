import React, { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Target, TrendingUp, User, Edit2, Trash2, CheckCircle, X, Save } from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

type OKRDurum = 'aktif' | 'tamamlandi' | 'risk' | 'iptal';

interface KeyResult {
  id: string;
  baslik: string;
  hedefDeger: number;
  mevcutDeger: number;
  birim: string;
  durum: OKRDurum;
}

interface Hedef {
  id: string;
  baslik: string;
  aciklama: string;
  seviye: 'sirket' | 'departman' | 'kisi';
  sahipId: string | null; // departman adı veya employee id
  donem: string; // '2026-Q2' gibi
  durum: OKRDurum;
  keyResults: KeyResult[];
  ustHedefId: string | null;
}

const DEMO_HEDEFLER: Hedef[] = [
  {
    id: 'h1', baslik: 'Müşteri Memnuniyetini Artır', aciklama: 'NPS skorunu 60\'tan 75\'e çıkar',
    seviye: 'sirket', sahipId: null, donem: '2026-Q2', durum: 'aktif', ustHedefId: null,
    keyResults: [
      { id: 'kr1', baslik: 'NPS Skoru', hedefDeger: 75, mevcutDeger: 68, birim: 'puan', durum: 'aktif' },
      { id: 'kr2', baslik: 'Müşteri Şikayeti Çözüm Süresi', hedefDeger: 24, mevcutDeger: 28, birim: 'saat', durum: 'risk' },
      { id: 'kr3', baslik: 'Destek Memnuniyet Anketi', hedefDeger: 90, mevcutDeger: 85, birim: '%', durum: 'aktif' },
    ],
  },
  {
    id: 'h2', baslik: 'Satış Gelirini %30 Artır', aciklama: 'Q2 sonu itibariyle geliri 10M\'a ulaştır',
    seviye: 'sirket', sahipId: null, donem: '2026-Q2', durum: 'aktif', ustHedefId: null,
    keyResults: [
      { id: 'kr4', baslik: 'Toplam Gelir', hedefDeger: 10000000, mevcutDeger: 7200000, birim: '₺', durum: 'aktif' },
      { id: 'kr5', baslik: 'Yeni Müşteri Sayısı', hedefDeger: 150, mevcutDeger: 98, birim: 'adet', durum: 'aktif' },
    ],
  },
  {
    id: 'h3', baslik: 'Satış Ekibi Performansı', aciklama: 'Departman bazlı satış hedefleri',
    seviye: 'departman', sahipId: 'Satış', donem: '2026-Q2', durum: 'aktif', ustHedefId: 'h2',
    keyResults: [
      { id: 'kr6', baslik: 'Bölge Satışları', hedefDeger: 3000000, mevcutDeger: 2100000, birim: '₺', durum: 'aktif' },
      { id: 'kr7', baslik: 'Pipeline Dönüşüm Oranı', hedefDeger: 35, mevcutDeger: 28, birim: '%', durum: 'risk' },
    ],
  },
  {
    id: 'h4', baslik: 'Personel Devir Hızını Düşür', aciklama: 'Yıllık turnover %15\'ten %8\'e indir',
    seviye: 'departman', sahipId: 'İnsan Kaynakları', donem: '2026-Q2', durum: 'aktif', ustHedefId: 'h1',
    keyResults: [
      { id: 'kr8', baslik: 'Turnover Oranı', hedefDeger: 8, mevcutDeger: 11, birim: '%', durum: 'risk' },
      { id: 'kr9', baslik: 'Çalışan Bağlılık Skoru', hedefDeger: 80, mevcutDeger: 72, birim: 'puan', durum: 'aktif' },
    ],
  },
];

const DURUM_RENK: Record<OKRDurum, string> = {
  aktif: 'bg-blue-100 text-blue-700',
  tamamlandi: 'bg-green-100 text-green-700',
  risk: 'bg-red-100 text-red-700',
  iptal: 'bg-gray-100 text-gray-500',
};
const DURUM_ETIKET: Record<OKRDurum, string> = {
  aktif: 'Devam Ediyor',
  tamamlandi: '✓ Tamamlandı',
  risk: '⚠ Risk',
  iptal: 'İptal',
};

function ilerlemeHesapla(keyResults: KeyResult[]): number {
  if (!keyResults.length) return 0;
  const toplam = keyResults.reduce((sum, kr) => {
    const oran = Math.min(kr.mevcutDeger / kr.hedefDeger, 1);
    return sum + oran;
  }, 0);
  return Math.round((toplam / keyResults.length) * 100);
}

function ilerlemeRengi(yuzde: number): string {
  if (yuzde >= 80) return 'bg-green-500';
  if (yuzde >= 50) return 'bg-blue-500';
  if (yuzde >= 30) return 'bg-yellow-500';
  return 'bg-red-400';
}

const KRSatiri: React.FC<{
  kr: KeyResult;
  onChange: (updated: KeyResult) => void;
  onSil: () => void;
}> = ({ kr, onChange, onSil }) => {
  const { appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || 'employee');
  const [duzenle, setDuzenle] = useState(false);
  const [girilenDeger, setGirilenDeger] = useState(kr.mevcutDeger.toString());
  const oran = Math.min(kr.mevcutDeger / kr.hedefDeger, 1);
  const yuzde = Math.round(oran * 100);

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-700 flex-1">{kr.baslik}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setDuzenle((v) => !v)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-500">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {isManagement && (
            <button onClick={onSil} className="p-1 rounded-lg hover:bg-red-100 text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${ilerlemeRengi(yuzde)}`}
            style={{ width: `${yuzde}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-gray-600 w-10 text-right">{yuzde}%</span>
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {duzenle ? (
          <div className="flex items-center gap-2 flex-1">
            <span>Mevcut:</span>
            <input
              type="number"
              value={girilenDeger}
              onChange={(e) => setGirilenDeger(e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-2 py-0.5 text-sm outline-none"
            />
            <span>{kr.birim}</span>
            <button
              onClick={() => { onChange({ ...kr, mevcutDeger: parseFloat(girilenDeger) || kr.mevcutDeger }); setDuzenle(false); }}
              className="text-indigo-600 hover:underline text-xs font-medium"
            >
              Güncelle
            </button>
          </div>
        ) : (
          <>
            <span>{kr.mevcutDeger.toLocaleString('tr-TR')} / {kr.hedefDeger.toLocaleString('tr-TR')} {kr.birim}</span>
          </>
        )}
        <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-medium ${DURUM_RENK[kr.durum]}`}>
          {DURUM_ETIKET[kr.durum]}
        </span>
      </div>
    </div>
  );
};

const HedefKarti: React.FC<{
  hedef: Hedef;
  altHedefler: Hedef[];
  onUpdate: (h: Hedef) => void;
  tümHedefler: Hedef[];
}> = ({ hedef, altHedefler, onUpdate, tümHedefler }) => {
  const [acik, setAcik] = useState(hedef.seviye === 'sirket');
  const ilerleme = ilerlemeHesapla(hedef.keyResults);

  const seviyeIkon = hedef.seviye === 'sirket'
    ? <Target className="w-4 h-4" />
    : hedef.seviye === 'departman'
    ? <TrendingUp className="w-4 h-4" />
    : <User className="w-4 h-4" />;

  const seviyeRenk = hedef.seviye === 'sirket' ? 'bg-indigo-600' : hedef.seviye === 'departman' ? 'bg-blue-500' : 'bg-teal-500';

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${hedef.seviye !== 'sirket' ? 'ml-6 border-l-4' : ''}`}
      style={hedef.seviye !== 'sirket' ? { borderLeftColor: hedef.seviye === 'departman' ? '#3b82f6' : '#14b8a6' } : {}}>
      {/* Başlık satırı */}
      <div
        onClick={() => setAcik((v) => !v)}
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50"
      >
        {altHedefler.length > 0 || hedef.keyResults.length > 0
          ? <span className="text-gray-400 flex-shrink-0">{acik ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
          : <span className="w-4 flex-shrink-0" />}

        <div className={`w-8 h-8 rounded-xl ${seviyeRenk} flex items-center justify-center text-white flex-shrink-0`}>
          {seviyeIkon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-gray-800 text-sm">{hedef.baslik}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DURUM_RENK[hedef.durum]}`}>
              {DURUM_ETIKET[hedef.durum]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {hedef.seviye === 'sirket' ? 'Şirket Hedefi' : hedef.seviye === 'departman' ? `${hedef.sahipId} Departmanı` : hedef.sahipId ?? 'Kişisel'}
            {' · '}{hedef.donem}
          </p>
        </div>

        {/* İlerleme çubuğu */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-24 bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${ilerlemeRengi(ilerleme)}`} style={{ width: `${ilerleme}%` }} />
          </div>
          <span className={`text-sm font-bold ${ilerleme >= 70 ? 'text-green-600' : ilerleme >= 40 ? 'text-blue-600' : 'text-red-500'}`}>
            {ilerleme}%
          </span>
        </div>
      </div>

      {/* Key Results */}
      {acik && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Temel Sonuçlar ({hedef.keyResults.length})
          </p>
          {hedef.keyResults.map((kr) => (
            <KRSatiri
              key={kr.id}
              kr={kr}
              onChange={(updated) => onUpdate({ ...hedef, keyResults: hedef.keyResults.map((k) => (k.id === kr.id ? updated : k)) })}
              onSil={() => onUpdate({ ...hedef, keyResults: hedef.keyResults.filter((k) => k.id !== kr.id) })}
            />
          ))}
          {hedef.keyResults.length === 0 && (
            <p className="text-xs text-gray-400 italic">Henüz temel sonuç eklenmedi</p>
          )}

          {/* Alt hedefler */}
          {altHedefler.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alt Hedefler</p>
              {altHedefler.map((alt) => (
                <HedefKarti
                  key={alt.id}
                  hedef={alt}
                  altHedefler={tümHedefler.filter((h) => h.ustHedefId === alt.id)}
                  onUpdate={onUpdate}
                  tümHedefler={tümHedefler}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface OKRYonetimiProps {
  employees: Employee[];
}

const OKRYonetimi: React.FC<OKRYonetimiProps> = ({ employees }) => {
  const { appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || 'employee');

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const currentPeriod = `${currentYear}-Q${currentQuarter}`;

  // Dynamically update DEMO_HEDEFLER's periods to match current year/quarter for display consistency
  const initializedDemoHedefler = useMemo(() => {
    return DEMO_HEDEFLER.map(h => ({
      ...h,
      donem: h.donem.replace('2026', String(currentYear))
    }));
  }, [currentYear]);

  const [hedefler, setHedefler] = useState<Hedef[]>(initializedDemoHedefler);
  const [secilenDonem, setSecilenDonem] = useState(currentPeriod);
  const [filtreSeviye, setFiltreSeviye] = useState<Hedef['seviye'] | 'hepsi'>('hepsi');
  const [yeniModal, setYeniModal] = useState(false);
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [yeniSeviye, setYeniSeviye] = useState<Hedef['seviye']>('departman');
  const [yeniSahip, setYeniSahip] = useState('');
  const [yeniUstId, setYeniUstId] = useState('');

  const donemler = [
    `${currentYear}-Q1`,
    `${currentYear}-Q2`,
    `${currentYear}-Q3`,
    `${currentYear}-Q4`
  ];

  const filtrelenmis = hedefler.filter((h) => {
    const donemOk = h.donem === secilenDonem;
    const seviyeOk = filtreSeviye === 'hepsi' || h.seviye === filtreSeviye;
    return donemOk && seviyeOk;
  });

  const kokHedefler = filtrelenmis.filter((h) => !h.ustHedefId);

  function hedefGuncelle(guncellenmis: Hedef) {
    setHedefler((prev) => prev.map((h) => (h.id === guncellenmis.id ? guncellenmis : h)));
  }

  function yeniHedefEkle() {
    const h: Hedef = {
      id: `h${Date.now()}`,
      baslik: yeniBaslik,
      aciklama: '',
      seviye: yeniSeviye,
      sahipId: yeniSahip || null,
      donem: secilenDonem,
      durum: 'aktif',
      keyResults: [],
      ustHedefId: yeniUstId || null,
    };
    setHedefler((prev) => [...prev, h]);
    setYeniModal(false);
    setYeniBaslik('');
    setYeniSeviye('departman');
    setYeniSahip('');
    setYeniUstId('');
  }

  // Özet istatistikleri
  const aktifHedefler = filtrelenmis.filter((h) => h.durum === 'aktif');
  const ortalamaIlerleme = aktifHedefler.length
    ? Math.round(aktifHedefler.reduce((sum, h) => sum + ilerlemeHesapla(h.keyResults), 0) / aktifHedefler.length)
    : 0;
  const riskliHedefler = filtrelenmis.filter((h) => h.durum === 'risk' || h.keyResults.some((kr) => kr.durum === 'risk'));

  const deptler = [...new Set(employees.map((e) => e.department).filter(Boolean))];

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">OKR Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Şirket → Departman → Kişi hiyerarşisinde hedef ve temel sonuçlar
          </p>
        </div>
        {isManagement && (
          <button
            onClick={() => setYeniModal(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Yeni Hedef
          </button>
        )}
      </div>

      {/* Dönem & Filtre */}
      <div className="flex flex-wrap gap-2">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {donemler.map((d) => (
            <button
              key={d}
              onClick={() => setSecilenDonem(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                secilenDonem === d ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['hepsi', 'sirket', 'departman', 'kisi'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFiltreSeviye(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtreSeviye === s ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'hepsi' ? 'Tümü' : s === 'sirket' ? 'Şirket' : s === 'departman' ? 'Departman' : 'Kişisel'}
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-indigo-50 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Toplam Hedef</p>
          <p className="text-2xl font-bold text-indigo-700">{filtrelenmis.length}</p>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Ortalama İlerleme</p>
          <p className="text-2xl font-bold text-blue-700">{ortalamaIlerleme}%</p>
        </div>
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Tamamlanan</p>
          <p className="text-2xl font-bold text-green-700">{filtrelenmis.filter((h) => h.durum === 'tamamlandi').length}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-4">
          <p className="text-xs text-gray-500">Risk Altında</p>
          <p className="text-2xl font-bold text-red-600">{riskliHedefler.length}</p>
        </div>
      </div>

      {/* OKR Ağacı */}
      <div className="space-y-3">
        {kokHedefler.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Bu dönem için henüz hedef tanımlanmadı</p>
          </div>
        )}
        {kokHedefler.map((hedef) => (
          <HedefKarti
            key={hedef.id}
            hedef={hedef}
            altHedefler={filtrelenmis.filter((h) => h.ustHedefId === hedef.id)}
            onUpdate={hedefGuncelle}
            tümHedefler={filtrelenmis}
          />
        ))}
      </div>

      {/* Yeni Hedef Modal */}
      {yeniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-bold text-gray-800">Yeni Hedef Ekle</p>
              <button onClick={() => setYeniModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Hedef Başlığı *</label>
              <input value={yeniBaslik} onChange={(e) => setYeniBaslik(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="ör. Satış gelirini artır" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Seviye</label>
                <select value={yeniSeviye} onChange={(e) => setYeniSeviye(e.target.value as any)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="sirket">Şirket</option>
                  <option value="departman">Departman</option>
                  <option value="kisi">Kişisel</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {yeniSeviye === 'departman' ? 'Departman' : yeniSeviye === 'kisi' ? 'Personel' : 'Sahip'}
                </label>
                {yeniSeviye === 'departman' ? (
                  <select value={yeniSahip} onChange={(e) => setYeniSahip(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Seçin</option>
                    {deptler.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : yeniSeviye === 'kisi' ? (
                  <select value={yeniSahip} onChange={(e) => setYeniSahip(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Seçin</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                ) : <input disabled className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-400" value="Tüm Şirket" readOnly />}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Üst Hedef (isteğe bağlı)</label>
              <input
                type="text"
                value={yeniUstId}
                onChange={(e) => setYeniUstId(e.target.value)}
                placeholder="Örn: 2026 Yıllık Satış ve Büyüme Hedefi"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setYeniModal(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:bg-gray-50">İptal</button>
              <button onClick={yeniHedefEkle} disabled={!yeniBaslik}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                <Save className="w-4 h-4" />Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OKRYonetimi;
