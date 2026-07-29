import React, { useState, useMemo, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target, Plus, X, Save, Trash2 } from 'lucide-react';
import type { Employee } from '../types';

interface Yetkinlik {
  id: string;
  ad: string;
  kategori: string;
  aciklama: string;
}

interface PozisyonGereksinim {
  pozisyon: string;
  yetkinlikler: { yetkinlikId: string; minSeviye: number }[];
}

interface PersonelYetkinlik {
  employeeId: string;
  yetkinlikId: string;
  seviye: number; // 0-5
}

const SEVİYE_ETIKET = ['%0 (Yok)', '%20 (Başlangıç)', '%40 (Temel)', '%60 (Orta)', '%80 (İleri)', '%100 (Uzman)'];
const SEVİYE_RENK = ['bg-gray-100 text-gray-400', 'bg-red-100 text-red-600', 'bg-orange-100 text-orange-600', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];

const DEMO_YETKINLIKLER: Yetkinlik[] = [
  { id: 'y1', ad: 'İletişim', kategori: 'Sosyal', aciklama: 'Sözlü ve yazılı iletişim becerileri' },
  { id: 'y2', ad: 'Takım Çalışması', kategori: 'Sosyal', aciklama: 'Ekip içinde uyumlu çalışma' },
  { id: 'y3', ad: 'Problem Çözme', kategori: 'Analitik', aciklama: 'Karmaşık sorunlara çözüm üretme' },
  { id: 'y4', ad: 'Excel / Veri Analizi', kategori: 'Teknik', aciklama: 'Tablo, formül, pivot analiz' },
  { id: 'y5', ad: 'Müşteri Yönetimi', kategori: 'İş', aciklama: 'Müşteri ilişkileri ve memnuniyet' },
  { id: 'y6', ad: 'Proje Yönetimi', kategori: 'İş', aciklama: 'Planlama, takip, raporlama' },
  { id: 'y7', ad: 'SQL / Veri Tabanı', kategori: 'Teknik', aciklama: 'Sorgu yazma ve DB yönetimi' },
  { id: 'y8', ad: 'Sunum Hazırlama', kategori: 'Sosyal', aciklama: 'Etkin sunum hazırlama ve sunma' },
];

const DEMO_POZISYON_GEREKSINIM: PozisyonGereksinim[] = [
  {
    pozisyon: 'Satış Müdürü',
    yetkinlikler: [
      { yetkinlikId: 'y1', minSeviye: 4 },
      { yetkinlikId: 'y2', minSeviye: 4 },
      { yetkinlikId: 'y5', minSeviye: 5 },
      { yetkinlikId: 'y6', minSeviye: 3 },
      { yetkinlikId: 'y8', minSeviye: 4 },
    ],
  },
  {
    pozisyon: 'İK Uzmanı',
    yetkinlikler: [
      { yetkinlikId: 'y1', minSeviye: 4 },
      { yetkinlikId: 'y2', minSeviye: 4 },
      { yetkinlikId: 'y3', minSeviye: 3 },
      { yetkinlikId: 'y4', minSeviye: 3 },
    ],
  },
  {
    pozisyon: 'Yazılım Geliştirici',
    yetkinlikler: [
      { yetkinlikId: 'y3', minSeviye: 4 },
      { yetkinlikId: 'y4', minSeviye: 3 },
      { yetkinlikId: 'y7', minSeviye: 4 },
      { yetkinlikId: 'y2', minSeviye: 3 },
    ],
  },
];

interface YetkinlikMatrisiProps {
  employees: Employee[];
  companyId?: string;
}

const YetkinlikMatrisi: React.FC<YetkinlikMatrisiProps> = ({ employees, companyId = 'default' }) => {
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenPozisyon, setSecilenPozisyon] = useState<string>('');
  const [secilenEmployee, setSecilenEmployee] = useState<string>('');
  const [aktifSekme, setAktifSekme] = useState<'matris' | 'gap' | 'takdir'>('matris');

  const tumPozisyonlar = useMemo(() => {
    const list = new Set([...DEMO_POZISYON_GEREKSINIM.map(p => p.pozisyon), ...employees.map(e => e.position).filter(Boolean)]);
    return Array.from(list);
  }, [employees]);

  const [yetkinlikler] = useState<Yetkinlik[]>(DEMO_YETKINLIKLER);

  // Load personelYetkinlikler from localStorage or default to 0 for all pairs
  const [personelYetkinlikler, setPersonelYetkinlikler] = useState<PersonelYetkinlik[]>(() => {
    const saved = localStorage.getItem(`humanius_personel_yetkinlikler_${companyId}`);
    if (saved) return JSON.parse(saved);

    // Default to 0 for all employees and all competencies
    const sonuc: PersonelYetkinlik[] = [];
    employees.forEach((emp) => {
      DEMO_YETKINLIKLER.forEach((y) => {
        sonuc.push({ employeeId: emp.id, yetkinlikId: y.id, seviye: 0 });
      });
    });
    return sonuc;
  });

  // Load takdirler from localStorage, empty by default as requested
  const [takdirler, setTakdirler] = useState<{ id: string; gonderen: string; alan: string; mesaj: string; puan: number; tarih: string }[]>(() => {
    const saved = localStorage.getItem(`humanius_takdirler_${companyId}`);
    return saved ? JSON.parse(saved) : []; // Empty by default
  });

  const [takdirForm, setTakdirForm] = useState(false);
  const [yeniTakdir, setYeniTakdir] = useState({ alan: '', mesaj: '', puan: 5 });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(`humanius_personel_yetkinlikler_${companyId}`, JSON.stringify(personelYetkinlikler));
  }, [personelYetkinlikler, companyId]);

  useEffect(() => {
    localStorage.setItem(`humanius_takdirler_${companyId}`, JSON.stringify(takdirler));
  }, [takdirler, companyId]);

  const filtreliPersonel = useMemo(() => {
    return employees.filter((emp) =>
      emp.name.toLowerCase().includes(aramaMetni.toLowerCase()) ||
      (emp.position && emp.position.toLowerCase().includes(aramaMetni.toLowerCase()))
    );
  }, [employees, aramaMetni]);

  const getYetkinlikSeviye = (employeeId: string, yetkinlikId: string) =>
    personelYetkinlikler.find((py) => py.employeeId === employeeId && py.yetkinlikId === yetkinlikId)?.seviye ?? 0;

  const setSeviye = (employeeId: string, yetkinlikId: string, seviye: number) => {
    setPersonelYetkinlikler((prev) => {
      const idx = prev.findIndex((py) => py.employeeId === employeeId && py.yetkinlikId === yetkinlikId);
      const next = [...prev];
      if (idx === -1) {
        next.push({ employeeId, yetkinlikId, seviye });
      } else {
        next[idx] = { ...next[idx], seviye };
      }
      return next;
    });
  };

  // Gap Analysis
  const gapAnaliz = useMemo(() => {
    const emp = employees.find((e) => e.id === secilenEmployee);
    if (!emp) return null;
    const poz = secilenPozisyon || emp.position || '';
    if (!poz) return null;

    let gereksimler = DEMO_POZISYON_GEREKSINIM.find((p) => p.pozisyon === poz);
    
    // Şirket içinde kaydedilen yeni veya farklı bir pozisyon seçildiyse dinamik hedef gereksinimler oluştur
    if (!gereksimler) {
      gereksimler = {
        pozisyon: poz,
        yetkinlikler: yetkinlikler.map((y) => ({ yetkinlikId: y.id, minSeviye: 3 }))
      };
    }

    return gereksimler.yetkinlikler.map((g) => {
      const yetk = yetkinlikler.find((y) => y.id === g.yetkinlikId);
      if (!yetk) return null;
      const mevcut = getYetkinlikSeviye(emp.id, g.yetkinlikId);
      const fark = mevcut - g.minSeviye;
      return { yetkinlik: yetk, minSeviye: g.minSeviye, mevcutSeviye: mevcut, fark };
    }).filter(Boolean) as { yetkinlik: Yetkinlik; minSeviye: number; mevcutSeviye: number; fark: number }[];
  }, [secilenEmployee, secilenPozisyon, personelYetkinlikler, employees, yetkinlikler]);

  const kategoriler = useMemo(() => {
    return [...new Set(yetkinlikler.map((y) => y.kategori))];
  }, [yetkinlikler]);

  const deleteTakdir = (id: string) => {
    if (window.confirm('Bu takdir mesajını silmek istediğinize emin misiniz?')) {
      setTakdirler(takdirler.filter((t) => t.id !== id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Yetkinlik Matrisi & Gap Analysis</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Çalışan becerileri ile pozisyon gereksinimleri karşılaştırması
          </p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['matris', 'gap', 'takdir'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setAktifSekme(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aktifSekme === s ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'matris' ? 'Yetkinlik Matrisi' : s === 'gap' ? 'Gap Analysis' : '🏆 Takdir & Rozet'}
          </button>
        ))}
      </div>

      {/* --- MATRİS SEKMESİ --- */}
      {aktifSekme === 'matris' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48 bg-white rounded-xl border border-gray-200">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={aramaMetni} onChange={(e) => setAramaMetni(e.target.value)}
                placeholder="Personel ara..."
                className="w-full pl-9 pr-3 py-2 text-sm outline-none bg-transparent" />
            </div>
          </div>

          {kategoriler.map((kategori) => (
            <div key={kategori} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 px-4 py-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{kategori} Yetkinlikleri</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 sticky left-0 bg-white min-w-36">Personel</th>
                      {yetkinlikler.filter((y) => y.kategori === kategori).map((y) => (
                        <th key={y.id} className="text-center px-3 py-2 text-xs font-semibold text-gray-500 min-w-24">
                          {y.ad}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtreliPersonel.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 sticky left-0 bg-white">
                          <p className="text-sm font-medium text-gray-800 truncate max-w-[130px]">{emp.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{emp.position}</p>
                        </td>
                        {yetkinlikler.filter((y) => y.kategori === kategori).map((y) => {
                          const sev = getYetkinlikSeviye(emp.id, y.id);
                          return (
                            <td key={y.id} className="px-3 py-2 text-center">
                              <select
                                value={sev}
                                onChange={(e) => setSeviye(emp.id, y.id, parseInt(e.target.value))}
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 outline-none cursor-pointer ${SEVİYE_RENK[sev]}`}
                              >
                                {SEVİYE_ETIKET.map((e, i) => <option key={i} value={i}>{e}</option>)}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Seviye açıklamaları */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Yetkinlik Seviyeleri</p>
            <div className="flex flex-wrap gap-2">
              {SEVİYE_ETIKET.map((e, i) => (
                <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVİYE_RENK[i]}`}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- GAP ANALYSIS SEKMESİ --- */}
      {aktifSekme === 'gap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Personel Seç</label>
              <select value={secilenEmployee} onChange={(e) => setSecilenEmployee(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Personel seçin</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.position})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Karşılaştırılacak Pozisyon</label>
              <select value={secilenPozisyon} onChange={(e) => setSecilenPozisyon(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="">Mevcut pozisyon</option>
                {tumPozisyonlar.map((pos) => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>
          </div>

          {!secilenEmployee && (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-400">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Gap analizi için bir personel seçin</p>
            </div>
          )}

          {gapAnaliz && (
            <div className="space-y-3">
              <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4">
                <p className="text-sm font-semibold text-indigo-800">
                  {employees.find((e) => e.id === secilenEmployee)?.name} — {secilenPozisyon || employees.find((e) => e.id === secilenEmployee)?.position}
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                  {gapAnaliz.filter((g) => g.fark < 0).length} eksik yetkinlik ·{' '}
                  {gapAnaliz.filter((g) => g.fark >= 0).length} yeterli alan
                </p>
              </div>

              {gapAnaliz.map((item) => (
                <div key={item.yetkinlik.id} className={`bg-white rounded-2xl border p-4 ${item.fark < 0 ? 'border-red-200' : 'border-green-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{item.yetkinlik.ad}</p>
                      <p className="text-xs text-gray-400">{item.yetkinlik.kategori}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.fark > 0 && <TrendingUp className="w-4 h-4 text-green-500" />}
                      {item.fark === 0 && <Minus className="w-4 h-4 text-blue-500" />}
                      {item.fark < 0 && <TrendingDown className="w-4 h-4 text-red-500" />}
                      <span className={`text-sm font-bold ${item.fark > 0 ? 'text-green-600' : item.fark < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                        {item.fark > 0 ? `+${item.fark}` : item.fark}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1">Mevcut Seviye</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full ${i <= item.mevcutSeviye ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{SEVİYE_ETIKET[item.mevcutSeviye]}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 mb-1">Gerekli Minimum</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className={`h-2 flex-1 rounded-full ${i <= item.minSeviye ? 'bg-orange-400' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{SEVİYE_ETIKET[item.minSeviye]}</p>
                    </div>
                  </div>
                  {item.fark < 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Gelişim gerekiyor: {Math.abs(item.fark)} seviye eksik
                    </div>
                  )}
                  {item.fark >= 0 && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-2 py-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Yeterli seviye{item.fark > 0 ? ` (${item.fark} seviye üstünde)` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {secilenEmployee && !gapAnaliz && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-sm text-yellow-700">
              Bu pozisyon için yetkinlik gereksinimi tanımlı değil. Bir pozisyon seçin veya gereksinimleri tanımlayın.
            </div>
          )}
        </div>
      )}

      {/* --- TAKDİR & ROZET SEKMESİ --- */}
      {aktifSekme === 'takdir' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">Çalışanlar birbirlerine takdir mesajı ve puan gönderebilir</p>
            <button
              onClick={() => setTakdirForm(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Takdir Gönder
            </button>
          </div>

          <div className="space-y-3">
            {takdirler.map((t) => (
              <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-4 relative group shadow-sm">
                <button
                  onClick={() => deleteTakdir(t.id)}
                  className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      <span className="text-indigo-700">{t.gonderen}</span>
                      {' → '}
                      <span className="text-green-700">{t.alan}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{t.mesaj}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.tarih}</p>
                  </div>
                  <div className="flex flex-shrink-0">
                    {Array.from({ length: t.puan }).map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {takdirler.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
                Henüz takdir mesajı yok
              </div>
            )}
          </div>

          {takdirForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-gray-800">Takdir Gönder</p>
                  <button onClick={() => setTakdirForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Kime</label>
                  <select value={yeniTakdir.alan} onChange={(e) => setYeniTakdir({ ...yeniTakdir, alan: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                    <option value="">Personel seçin</option>
                    {employees.map((e) => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Mesajınız</label>
                  <textarea value={yeniTakdir.mesaj} onChange={(e) => setYeniTakdir({ ...yeniTakdir, mesaj: e.target.value })}
                    rows={3} placeholder="Neden takdir ediyorsunuz?"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Puan</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button key={p} onClick={() => setYeniTakdir({ ...yeniTakdir, puan: p })}
                        className={`text-2xl transition-colors ${p <= yeniTakdir.puan ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setTakdirForm(false)} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm text-gray-600">İptal</button>
                  <button
                    disabled={!yeniTakdir.alan || !yeniTakdir.mesaj}
                    onClick={() => {
                      setTakdirler((prev) => [{
                        id: `t${Date.now()}`, gonderen: 'Siz', alan: yeniTakdir.alan,
                        mesaj: yeniTakdir.mesaj, puan: yeniTakdir.puan,
                        tarih: new Date().toISOString().split('T')[0],
                      }, ...prev]);
                      setTakdirForm(false);
                      setYeniTakdir({ alan: '', mesaj: '', puan: 5 });
                    }}
                    className="flex-1 bg-indigo-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <Save className="w-4 h-4" />Gönder
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default YetkinlikMatrisi;
