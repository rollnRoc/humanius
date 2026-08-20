import React, { useState, useEffect, useMemo } from 'react';
import { Star, Target, TrendingUp, MessageSquare, Plus, ChevronRight, Award, Trash2 } from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface PerformansDegerlendirme {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  donem: string;
  degerlendiren: string;
  teknikYetkinlik: number;
  iletisim: number;
  takim: number;
  liderlik: number;
  uyum: number;
  genelPuan: number;
  gucluyonler: string;
  gelisimAlanlari: string;
  hedefler: string;
  durum: 'taslak' | 'tamamlandi' | 'onaylandi';
}

interface OKR {
  id: string;
  employeeId: string;
  employeeName: string;
  hedef: string;
  donem: string;
  kilit_sonuclar: { metin: string; ilerleme: number }[];
  genel_ilerleme: number;
  durum: 'aktif' | 'tamamlandi' | 'iptal';
}

interface GeriBildirim {
  id: string;
  gonderen: string;
  alici: string;
  mesaj: string;
  tarih: string;
  tip: 'olumlu' | 'gelistirici' | 'nötr';
}

interface PerformansYonetimiProps {
  employees: Employee[];
  userRole?: string;
}

const puanRengi = (puan: number) => {
  if (puan >= 4) return 'text-green-600';
  if (puan >= 3) return 'text-yellow-600';
  return 'text-red-500';
};

const PuanYildizlari: React.FC<{ puan: number; max?: number }> = ({ puan, max = 5 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < Math.round(puan) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`}
      />
    ))}
  </div>
);

const PerformansYonetimi: React.FC<PerformansYonetimiProps> = ({ employees, userRole = 'employee' }) => {
  const { profile, appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole);
  const companyId = profile?.company_id || 'default';

  const currentEmployee = useMemo(() => {
    return employees.find(
      (emp) =>
        emp.email?.toLowerCase() === profile?.email?.toLowerCase() ||
        emp.name?.toLowerCase() === profile?.full_name?.toLowerCase()
    ) || employees[0];
  }, [employees, profile]);

  const [aktifSekme, setAktifSekme] = useState<'degerlendirme' | 'okr'>('degerlendirme');
  const [secilenEmployee, setSecilenEmployee] = useState<string | null>(null);
  
  // Modaller
  const [showNewForm, setShowNewForm] = useState(false);
  const [showOkrForm, setShowOkrForm] = useState(false);

  // Dönem listesi
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const donemler = [
    `${currentYear}-Q1`,
    `${currentYear}-Q2`,
    `${currentYear}-Q3`,
    `${currentYear}-Q4`,
  ];
  const guncelDonem = `${currentYear}-Q${currentQuarter}`;

  // State'ler (Boş başlar, localStorage'dan yüklenir)
  const [degerlendirmeler, setDegerlendirmeler] = useState<PerformansDegerlendirme[]>([]);
  const [okrListesi, setOkrListesi] = useState<OKR[]>([]);

  // Yeni Değerlendirme Formu State
  const [yeniDeg, setYeniDeg] = useState({
    employeeId: '',
    donem: guncelDonem,
    teknikYetkinlik: 3,
    iletisim: 3,
    takim: 3,
    liderlik: 3,
    uyum: 3,
    yorumlar: '',
    gelisimAlanlari: '',
    hedefler: ''
  });

  // Yeni OKR Formu State
  const [yeniOkr, setYeniOkr] = useState({
    employeeId: '',
    hedef: '',
    donem: guncelDonem,
    kr1: '',
    kr2: '',
    kr3: ''
  });

  // LocalStorage'dan yükleme
  useEffect(() => {
    const storedDeg = localStorage.getItem(`humanius_performances_${companyId}`);
    if (storedDeg) {
      try {
        setDegerlendirmeler(JSON.parse(storedDeg));
      } catch {}
    }

    const storedOkr = localStorage.getItem(`humanius_okrs_${companyId}`);
    if (storedOkr) {
      try {
        setOkrListesi(JSON.parse(storedOkr));
      } catch {}
    }
  }, [companyId]);

  // Role-filtered data lists
  const goruntulenenDegerlendirmeler = useMemo(() => {
    if (isManagement) return degerlendirmeler;
    if (!currentEmployee) return [];
    return degerlendirmeler.filter(
      (deg) =>
        deg.employeeId === currentEmployee.id ||
        deg.employeeName?.toLowerCase() === currentEmployee.name?.toLowerCase()
    );
  }, [degerlendirmeler, isManagement, currentEmployee]);

  const goruntulenenOkrs = useMemo(() => {
    if (isManagement) return okrListesi;
    if (!currentEmployee) return [];
    return okrListesi.filter(
      (okr) =>
        okr.employeeId === currentEmployee.id ||
        okr.employeeName?.toLowerCase() === currentEmployee.name?.toLowerCase()
    );
  }, [okrListesi, isManagement, currentEmployee]);

  // Dinamik Hesaplamalar
  const genelOrtalama = goruntulenenDegerlendirmeler.length
    ? (goruntulenenDegerlendirmeler.reduce((s, d) => s + d.genelPuan, 0) / goruntulenenDegerlendirmeler.length).toFixed(1)
    : '—';

  const tamamlananCount = goruntulenenDegerlendirmeler.filter((d) => d.durum !== 'taslak').length;
  const okrTamamlanan = goruntulenenOkrs.filter((o) => o.genel_ilerleme >= 100).length;
  const aktifOkr = goruntulenenOkrs.filter((o) => o.durum === 'aktif').length;

  // Yeni Değerlendirme Kaydet
  const handleSaveEvaluation = () => {
    if (!yeniDeg.employeeId) {
      alert('Lütfen bir personel seçin.');
      return;
    }
    const emp = employees.find(e => e.id === yeniDeg.employeeId)!;
    const newD: PerformansDegerlendirme = {
      id: `deg-custom-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      donem: yeniDeg.donem,
      degerlendiren: profile?.full_name || 'Yönetici',
      teknikYetkinlik: yeniDeg.teknikYetkinlik,
      iletisim: yeniDeg.iletisim,
      takim: yeniDeg.takim,
      liderlik: yeniDeg.liderlik,
      uyum: yeniDeg.uyum,
      genelPuan: (yeniDeg.teknikYetkinlik + yeniDeg.iletisim + yeniDeg.takim + yeniDeg.liderlik + yeniDeg.uyum) / 5,
      gucluyonler: yeniDeg.yorumlar || 'Girilen not bulunmuyor.',
      gelisimAlanlari: yeniDeg.gelisimAlanlari || 'Girilen gelişim alanı bulunmuyor.',
      hedefler: yeniDeg.hedefler || 'Hedef atanmadı.',
      durum: 'tamamlandi'
    };

    const updated = [newD, ...degerlendirmeler];
    setDegerlendirmeler(updated);
    localStorage.setItem(`humanius_performances_${companyId}`, JSON.stringify(updated));
    setShowNewForm(false);
    setYeniDeg({
      employeeId: '',
      donem: guncelDonem,
      teknikYetkinlik: 3,
      iletisim: 3,
      takim: 3,
      liderlik: 3,
      uyum: 3,
      yorumlar: '',
      gelisimAlanlari: '',
      hedefler: ''
    });
  };

  // Yeni OKR Kaydet
  const handleSaveOkr = () => {
    if (!yeniOkr.employeeId || !yeniOkr.hedef) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }
    const emp = employees.find(e => e.id === yeniOkr.employeeId)!;
    const krs = [yeniOkr.kr1, yeniOkr.kr2, yeniOkr.kr3].filter(Boolean).map(metin => ({
      metin,
      ilerleme: 0
    }));

    const newOkr: OKR = {
      id: `okr-custom-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      hedef: yeniOkr.hedef,
      donem: yeniOkr.donem,
      kilit_sonuclar: krs,
      genel_ilerleme: 0,
      durum: 'aktif'
    };

    const updated = [newOkr, ...okrListesi];
    setOkrListesi(updated);
    localStorage.setItem(`humanius_okrs_${companyId}`, JSON.stringify(updated));
    setShowOkrForm(false);
    setYeniOkr({
      employeeId: '',
      hedef: '',
      donem: guncelDonem,
      kr1: '',
      kr2: '',
      kr3: ''
    });
  };

  // Veri Silme İşlemleri
  const handleDeleteEvaluation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu değerlendirmeyi silmek istediğinize emin misiniz?')) {
      const updated = degerlendirmeler.filter(d => d.id !== id);
      setDegerlendirmeler(updated);
      localStorage.setItem(`humanius_performances_${companyId}`, JSON.stringify(updated));
    }
  };

  const handleDeleteOkr = (id: string) => {
    if (window.confirm('Bu OKR kaydını silmek istediğinize emin misiniz?')) {
      const updated = okrListesi.filter(o => o.id !== id);
      setOkrListesi(updated);
      localStorage.setItem(`humanius_okrs_${companyId}`, JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Performans Yönetimi</h2>
          <p className="text-sm text-gray-500 mt-0.5">360° değerlendirme ve OKR/KPI takibi</p>
        </div>
        {isManagement && (
          <div className="flex gap-2">
            {aktifSekme === 'degerlendirme' && (
              <button
                onClick={() => setShowNewForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Yeni Değerlendirme
              </button>
            )}
            {aktifSekme === 'okr' && (
              <button
                onClick={() => setShowOkrForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Yeni OKR Ekle
              </button>
            )}
          </div>
        )}
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Genel Ortalama</p>
          <p className={`text-2xl font-bold ${puanRengi(Number(genelOrtalama) || 0)}`}>{genelOrtalama} {goruntulenenDegerlendirmeler.length > 0 ? '/ 5' : ''}</p>
          {goruntulenenDegerlendirmeler.length > 0 ? <PuanYildizlari puan={Number(genelOrtalama)} /> : <span className="text-[10px] text-gray-400">Veri bulunmuyor</span>}
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Tamamlanan Değerlendirme</p>
          <p className="text-2xl font-bold text-gray-800">{tamamlananCount}</p>
          <p className="text-xs text-gray-400">{goruntulenenDegerlendirmeler.length} toplam</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Aktif OKR</p>
          <p className="text-2xl font-bold text-indigo-600">{aktifOkr}</p>
          <p className="text-xs text-gray-400">{okrTamamlanan} tamamlandı</p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['degerlendirme', 'okr'] as const).map((sekme) => (
          <button
            key={sekme}
            onClick={() => setAktifSekme(sekme)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              aktifSekme === sekme
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {sekme === 'degerlendirme' ? '360° Değerlendirme' : 'OKR / KPI Takibi'}
          </button>
        ))}
      </div>

      {/* 360° Değerlendirme */}
      {aktifSekme === 'degerlendirme' && (
        <div className="space-y-3">
          {goruntulenenDegerlendirmeler.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="font-semibold text-gray-500">Değerlendirme Verisi Bulunmuyor</p>
              <p className="text-xs mt-1">
                {isManagement ? 'Henüz girilmiş bir performans değerlendirmesi yok. Sağ üstten yeni bir tane ekleyebilirsiniz.' : 'Size ait henüz girilmiş bir performans değerlendirmesi bulunmamaktadır.'}
              </p>
            </div>
          ) : (
            goruntulenenDegerlendirmeler.map((deg) => (
              <div
                key={deg.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 transition-colors cursor-pointer relative group"
                onClick={() => setSecilenEmployee(secilenEmployee === deg.id ? null : deg.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                      {deg.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{deg.employeeName}</p>
                      <p className="text-xs text-gray-500">{deg.department} • {deg.donem}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${puanRengi(deg.genelPuan)}`}>{deg.genelPuan.toFixed(1)}</p>
                      <PuanYildizlari puan={deg.genelPuan} />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                      Tamamlandı
                    </span>
                    {isManagement && (
                      <button
                        onClick={(e) => handleDeleteEvaluation(deg.id, e)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${secilenEmployee === deg.id ? 'rotate-90' : ''}`} />
                  </div>
                </div>

                {secilenEmployee === deg.id && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      {[
                        { label: 'Teknik Yetkinlik', puan: deg.teknikYetkinlik },
                        { label: 'İletişim', puan: deg.iletisim },
                        { label: 'Takım Çalışması', puan: deg.takim },
                        { label: 'Liderlik', puan: deg.liderlik },
                        { label: 'Uyum', puan: deg.uyum },
                      ].map((kriter) => (
                        <div key={kriter.label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">{kriter.label}</p>
                          <p className={`text-lg font-bold ${puanRengi(kriter.puan)}`}>{kriter.puan}/5</p>
                          <PuanYildizlari puan={kriter.puan} />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-xs font-semibold text-green-600 mb-1">Güçlü Yönler</p>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{deg.gucluyonler}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-orange-500 mb-1">Gelişim Alanları</p>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{deg.gelisimAlanlari}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-blue-600 mb-1">Hedefler</p>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{deg.hedefler}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* OKR / KPI */}
      {aktifSekme === 'okr' && (
        <div className="space-y-4">
          {goruntulenenOkrs.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
              <Target className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p className="font-semibold text-gray-500">Hedef (OKR) Bulunmuyor</p>
              <p className="text-xs mt-1">
                {isManagement ? 'Henüz eklenmiş bir hedef yok. Sağ üstten yeni bir OKR oluşturabilirsiniz.' : 'Size tanımlanmış aktif bir hedef (OKR) bulunmamaktadır.'}
              </p>
            </div>
          ) : (
            goruntulenenOkrs.map((okr) => (
              <div key={okr.id} className="bg-white rounded-2xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-indigo-500" />
                      <p className="font-semibold text-gray-800">{okr.hedef}</p>
                    </div>
                    <p className="text-xs text-gray-500">{okr.employeeName} • {okr.donem}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Genel İlerleme</p>
                      <p className="text-lg font-bold text-indigo-600">%{okr.genel_ilerleme}</p>
                    </div>
                    <div className="relative w-12 h-12">
                      <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3"
                          strokeDasharray={`${okr.genel_ilerleme} ${100 - okr.genel_ilerleme}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    {isManagement && (
                      <button
                        onClick={() => handleDeleteOkr(okr.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors ml-2"
                        title="Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {okr.kilit_sonuclar.map((kr, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-600">{kr.metin}</p>
                          <span className="text-xs font-semibold text-gray-700">%{kr.ilerleme}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              kr.ilerleme >= 80 ? 'bg-green-500' : kr.ilerleme >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${kr.ilerleme}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};

export default PerformansYonetimi;
