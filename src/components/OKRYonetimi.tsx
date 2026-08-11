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
  donem: string; // '2026-Q3' gibi
  durum: OKRDurum;
  keyResults: KeyResult[];
  ustHedefId: string | null;
}

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
          <button onClick={() => setDuzenle((v) => !v)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-500" title="Düzenle">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {isManagement && (
            <button onClick={onSil} className="p-1 rounded-lg hover:bg-red-100 text-red-400" title="Sil">
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
  onSil: (id: string) => void;
  tümHedefler: Hedef[];
}> = ({ hedef, altHedefler, onUpdate, onSil, tümHedefler }) => {
  const { appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || 'employee');
  const [acik, setAcik] = useState(true);
  const [showKrAdd, setShowKrAdd] = useState(false);
  const [krBaslik, setKrBaslik] = useState('');
  const [krHedef, setKrHedef] = useState('100');
  const [krBirim, setKrBirim] = useState('%');

  const ilerleme = ilerlemeHesapla(hedef.keyResults);

  const seviyeIkon = hedef.seviye === 'sirket'
    ? <Target className="w-4 h-4" />
    : hedef.seviye === 'departman'
    ? <TrendingUp className="w-4 h-4" />
    : <User className="w-4 h-4" />;

  const seviyeRenk = hedef.seviye === 'sirket' ? 'bg-indigo-600' : hedef.seviye === 'departman' ? 'bg-blue-500' : 'bg-teal-500';

  const handleAddKR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!krBaslik.trim()) return;
    const newKR: KeyResult = {
      id: `kr-${Date.now()}`,
      baslik: krBaslik,
      hedefDeger: Number(krHedef) || 100,
      mevcutDeger: 0,
      birim: krBirim || 'adet',
      durum: 'aktif'
    };
    onUpdate({
      ...hedef,
      keyResults: [...hedef.keyResults, newKR]
    });
    setKrBaslik('');
    setShowKrAdd(false);
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs ${hedef.seviye !== 'sirket' ? 'ml-4 md:ml-6 border-l-4' : ''}`}
      style={hedef.seviye !== 'sirket' ? { borderLeftColor: hedef.seviye === 'departman' ? '#3b82f6' : '#14b8a6' } : {}}>
      
      {/* Başlık satırı */}
      <div className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50/80 transition-colors">
        <div onClick={() => setAcik((v) => !v)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
          <span className="text-gray-400 flex-shrink-0">
            {acik ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>

          <div className={`w-8 h-8 rounded-xl ${seviyeRenk} flex items-center justify-center text-white flex-shrink-0 shadow-xs`}>
            {seviyeIkon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 text-sm truncate">{hedef.baslik}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${DURUM_RENK[hedef.durum]}`}>
                {DURUM_ETIKET[hedef.durum]}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {hedef.seviye === 'sirket' ? 'Şirket Hedefi' : hedef.seviye === 'departman' ? `${hedef.sahipId || 'Departman'}` : hedef.sahipId ?? 'Kişisel'}
              {' · '}<span className="font-semibold text-gray-600">{hedef.donem}</span>
            </p>
          </div>
        </div>

        {/* İlerleme ve Silme */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full ${ilerlemeRengi(ilerleme)}`} style={{ width: `${ilerleme}%` }} />
            </div>
            <span className={`text-xs font-bold ${ilerleme >= 70 ? 'text-green-600' : ilerleme >= 40 ? 'text-blue-600' : 'text-red-500'}`}>
              {ilerleme}%
            </span>
          </div>

          {isManagement && (
            <button
              onClick={() => onSil(hedef.id)}
              className="text-gray-300 hover:text-red-500 p-1 rounded-lg transition-colors"
              title="Hedefi Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Key Results & Sub-goals */}
      {acik && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100/60 pt-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Temel Sonuçlar (Key Results - {hedef.keyResults.length})
            </p>
            {isManagement && (
              <button
                onClick={() => setShowKrAdd((v) => !v)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Key Result Ekle
              </button>
            )}
          </div>

          {showKrAdd && (
            <form onSubmit={handleAddKR} className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex flex-wrap gap-2 items-center">
              <input
                type="text"
                required
                placeholder="Key Result Başlığı (örn: Satış Dönüşümü)"
                value={krBaslik}
                onChange={(e) => setKrBaslik(e.target.value)}
                className="flex-1 min-w-[150px] border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-white"
              />
              <input
                type="number"
                placeholder="Hedef"
                value={krHedef}
                onChange={(e) => setKrHedef(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none bg-white"
              />
              <input
                type="text"
                placeholder="Birim (%, ₺, adet)"
                value={krBirim}
                onChange={(e) => setKrBirim(e.target.value)}
                className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none bg-white"
              />
              <button type="submit" className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-lg font-semibold hover:bg-indigo-700">
                Ekle
              </button>
            </form>
          )}

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
            <div className="mt-4 space-y-2 pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alt Hedefler</p>
              {altHedefler.map((alt) => (
                <HedefKarti
                  key={alt.id}
                  hedef={alt}
                  altHedefler={tümHedefler.filter((h) => h.ustHedefId === alt.id)}
                  onUpdate={onUpdate}
                  onSil={onSil}
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

  const donemler = [
    `${currentYear}-Q1`,
    `${currentYear}-Q2`,
    `${currentYear}-Q3`,
    `${currentYear}-Q4`
  ];

  // Default demo goals created dynamically to cover current year quarters
  const getDefaultDemoHedefler = (): Hedef[] => [
    {
      id: 'h1', baslik: 'Müşteri Memnuniyetini Artır', aciklama: 'NPS skorunu 60\'tan 75\'e çıkar',
      seviye: 'sirket', sahipId: null, donem: `${currentYear}-Q3`, durum: 'aktif', ustHedefId: null,
      keyResults: [
        { id: 'kr1', baslik: 'NPS Skoru', hedefDeger: 75, mevcutDeger: 68, birim: 'puan', durum: 'aktif' },
        { id: 'kr2', baslik: 'Müşteri Şikayeti Çözüm Süresi', hedefDeger: 24, mevcutDeger: 28, birim: 'saat', durum: 'risk' },
      ],
    },
    {
      id: 'h2', baslik: 'Satış Gelirini %30 Artır', aciklama: 'Dönem sonu geliri 10M ₺ seviyesine ulaştır',
      seviye: 'sirket', sahipId: null, donem: `${currentYear}-Q3`, durum: 'aktif', ustHedefId: null,
      keyResults: [
        { id: 'kr4', baslik: 'Toplam Gelir', hedefDeger: 10000000, mevcutDeger: 7200000, birim: '₺', durum: 'aktif' },
        { id: 'kr5', baslik: 'Yeni Müşteri Sayısı', hedefDeger: 150, mevcutDeger: 98, birim: 'adet', durum: 'aktif' },
      ],
    },
    {
      id: 'h3', baslik: 'Satış Ekibi Dönüşüm Performansı', aciklama: 'Bölgesel satış hedefleri',
      seviye: 'departman', sahipId: 'Satış', donem: `${currentYear}-Q3`, durum: 'aktif', ustHedefId: 'h2',
      keyResults: [
        { id: 'kr6', baslik: 'Bölge Satışları', hedefDeger: 3000000, mevcutDeger: 2100000, birim: '₺', durum: 'aktif' },
      ],
    },
    {
      id: 'h4', baslik: 'Personel Devir Hızını Düşür', aciklama: 'Yıllık turnover %15\'ten %8\'e indir',
      seviye: 'departman', sahipId: 'İnsan Kaynakları', donem: `${currentYear}-Q3`, durum: 'aktif', ustHedefId: 'h1',
      keyResults: [
        { id: 'kr8', baslik: 'Turnover Oranı', hedefDeger: 8, mevcutDeger: 11, birim: '%', durum: 'risk' },
      ],
    },
  ];

  // Goals state with localStorage persistence
  const [hedefler, setHedefler] = useState<Hedef[]>(() => {
    const saved = localStorage.getItem('humanius_okr_hedefler');
    return saved ? JSON.parse(saved) : getDefaultDemoHedefler();
  });

  const saveHedefler = (updated: Hedef[]) => {
    setHedefler(updated);
    localStorage.setItem('humanius_okr_hedefler', JSON.stringify(updated));
  };

  const [secilenDonem, setSecilenDonem] = useState(currentPeriod);
  const [filtreSeviye, setFiltreSeviye] = useState<Hedef['seviye'] | 'hepsi'>('hepsi');
  const [yeniModal, setYeniModal] = useState(false);

  // Form states
  const [yeniBaslik, setYeniBaslik] = useState('');
  const [yeniAciklama, setYeniAciklama] = useState('');
  const [yeniDonem, setYeniDonem] = useState(currentPeriod);
  const [yeniSeviye, setYeniSeviye] = useState<Hedef['seviye']>('sirket');
  const [yeniSahip, setYeniSahip] = useState('');
  const [yeniUstId, setYeniUstId] = useState('');
  const [yeniKrBaslik, setYeniKrBaslik] = useState('');
  const [yeniKrHedef, setYeniKrHedef] = useState('100');
  const [yeniKrBirim, setYeniKrBirim] = useState('%');

  // Filtered goals for current view
  const filtrelenmis = useMemo(() => {
    return hedefler.filter((h) => {
      const donemOk = h.donem === secilenDonem;
      const seviyeOk = filtreSeviye === 'hepsi' || h.seviye === filtreSeviye;
      return donemOk && seviyeOk;
    });
  }, [hedefler, secilenDonem, filtreSeviye]);

  // Root goals for tree view: Either no parent OR parent doesn't exist in filtered list
  const kokHedefler = useMemo(() => {
    return filtrelenmis.filter((h) => !h.ustHedefId || !filtrelenmis.some(parent => parent.id === h.ustHedefId));
  }, [filtrelenmis]);

  function hedefGuncelle(guncellenmis: Hedef) {
    const updated = hedefler.map((h) => (h.id === guncellenmis.id ? guncellenmis : h));
    saveHedefler(updated);
  }

  function hedefSil(id: string) {
    if (window.confirm('Bu hedefi ve alt hedeflerini silmek istediğinize emin misiniz?')) {
      const updated = hedefler.filter((h) => h.id !== id && h.ustHedefId !== id);
      saveHedefler(updated);
    }
  }

  function yeniHedefEkle(e: React.FormEvent) {
    e.preventDefault();
    if (!yeniBaslik.trim()) return;

    const initialKeyResults: KeyResult[] = yeniKrBaslik.trim() ? [
      {
        id: `kr-${Date.now()}`,
        baslik: yeniKrBaslik,
        hedefDeger: Number(yeniKrHedef) || 100,
        mevcutDeger: 0,
        birim: yeniKrBirim || '%',
        durum: 'aktif'
      }
    ] : [];

    const newHedef: Hedef = {
      id: `h-${Date.now()}`,
      baslik: yeniBaslik.trim(),
      aciklama: yeniAciklama.trim(),
      seviye: yeniSeviye,
      sahipId: yeniSahip || null,
      donem: yeniDonem || secilenDonem,
      durum: 'aktif',
      keyResults: initialKeyResults,
      ustHedefId: yeniUstId.trim() || null,
    };

    saveHedefler([...hedefler, newHedef]);

    // Reset form
    setYeniModal(false);
    setYeniBaslik('');
    setYeniAciklama('');
    setYeniSeviye('sirket');
    setYeniSahip('');
    setYeniUstId('');
    setYeniKrBaslik('');
    setYeniKrHedef('100');
    setYeniKrBirim('%');
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
            onClick={() => {
              setYeniDonem(secilenDonem);
              setYeniModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            + Yeni Hedef
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
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                secilenDonem === d ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtreSeviye === s ? 'bg-white shadow-xs text-indigo-600 font-bold' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s === 'hepsi' ? 'Tümü' : s === 'sirket' ? 'Şirket' : s === 'departman' ? 'Departman' : 'Kişisel'}
            </button>
          ))}
        </div>
      </div>

      {/* Özet kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-indigo-600">Toplam Hedef</p>
          <p className="text-2xl font-bold text-indigo-800">{filtrelenmis.length}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-blue-600">Ortalama İlerleme</p>
          <p className="text-2xl font-bold text-blue-800">{ortalamaIlerleme}%</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-green-600">Tamamlanan</p>
          <p className="text-2xl font-bold text-green-800">{filtrelenmis.filter((h) => h.durum === 'tamamlandi').length}</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 shadow-xs">
          <p className="text-xs font-medium text-red-600">Risk Altında</p>
          <p className="text-2xl font-bold text-red-700">{riskliHedefler.length}</p>
        </div>
      </div>

      {/* OKR Ağacı */}
      <div className="space-y-3">
        {kokHedefler.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="text-sm font-semibold text-gray-600">{secilenDonem} Dönemi İçin Hedef Bulunmamaktadır</p>
            <p className="text-xs text-gray-400 mt-1">Sağ üstteki "+ Yeni Hedef" butonuna tıklayarak yeni bir OKR hedefi tanımlayabilirsiniz.</p>
          </div>
        )}
        {kokHedefler.map((hedef) => (
          <HedefKarti
            key={hedef.id}
            hedef={hedef}
            altHedefler={filtrelenmis.filter((h) => h.ustHedefId === hedef.id)}
            onUpdate={hedefGuncelle}
            onSil={hedefSil}
            tümHedefler={filtrelenmis}
          />
        ))}
      </div>

      {/* YENİ HEDEF EKLE MODAL */}
      {yeniModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-base">Yeni OKR Hedefi Ekle</h3>
              <button onClick={() => setYeniModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={yeniHedefEkle} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Hedef Başlığı *</label>
                <input
                  type="text"
                  required
                  value={yeniBaslik}
                  onChange={(e) => setYeniBaslik(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Örn: Q3 Satış Gelirini %30 Artır"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Açıklama (İsteğe Bağlı)</label>
                <textarea
                  rows={2}
                  value={yeniAciklama}
                  onChange={(e) => setYeniAciklama(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Hedefin detayları ve stratejik amacı..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Dönem</label>
                  <select
                    value={yeniDonem}
                    onChange={(e) => setYeniDonem(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    {donemler.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Seviye</label>
                  <select
                    value={yeniSeviye}
                    onChange={(e) => setYeniSeviye(e.target.value as any)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    <option value="sirket">Şirket</option>
                    <option value="departman">Departman</option>
                    <option value="kisi">Kişisel</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    {yeniSeviye === 'departman' ? 'Departman Seçin' : yeniSeviye === 'kisi' ? 'Personel Seçin' : 'Sahip'}
                  </label>
                  {yeniSeviye === 'departman' ? (
                    <select
                      value={yeniSahip}
                      onChange={(e) => setYeniSahip(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Departman Seçin...</option>
                      {deptler.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  ) : yeniSeviye === 'kisi' ? (
                    <select
                      value={yeniSahip}
                      onChange={(e) => setYeniSahip(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    >
                      <option value="">Personel Seçin...</option>
                      {employees.map((e) => <option key={e.id} value={e.name}>{e.name} ({e.department})</option>)}
                    </select>
                  ) : (
                    <input disabled className="w-full border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-400" value="Tüm Şirket" readOnly />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Bağlı Olduğu Üst Hedef</label>
                  <select
                    value={yeniUstId}
                    onChange={(e) => setYeniUstId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                  >
                    <option value="">Yok (Ana Hedef / Kök)</option>
                    {hedefler.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.baslik} ({h.donem} - {h.seviye === 'sirket' ? 'Şirket' : h.seviye === 'departman' ? 'Departman' : 'Kişi'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* İlk Key Result (İsteğe Bağlı) */}
              <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-2">
                <p className="text-xs font-bold text-indigo-900">İlk Temel Sonuç (Key Result - İsteğe Bağlı)</p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Başlık (Örn: NPS Skoru)"
                    value={yeniKrBaslik}
                    onChange={(e) => setYeniKrBaslik(e.target.value)}
                    className="col-span-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs outline-none bg-white"
                  />
                  <input
                    type="number"
                    placeholder="Hedef Değer"
                    value={yeniKrHedef}
                    onChange={(e) => setYeniKrHedef(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Birim (%, ₺, puan)"
                    value={yeniKrBirim}
                    onChange={(e) => setYeniKrBirim(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setYeniModal(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!yeniBaslik.trim()}
                  className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Hedefi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OKRYonetimi;
