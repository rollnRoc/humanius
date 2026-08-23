import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Award,
  Plus,
  ChevronRight,
  Trash2,
  X,
  Search,
  UserCheck,
  Users,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  BarChart3,
  Target,
  FileCheck2
} from 'lucide-react';
import type { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

export type DegerlendiriciTuru = 'yonetici' | 'oz' | 'akran' | 'ast';

export interface PerformansDegerlendirme {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  donem: string;
  degerlendiren: string;
  degerlendiriciTuru: DegerlendiriciTuru;
  teknikYetkinlik: number;
  iletisim: number;
  takim: number;
  liderlik: number;
  uyum: number;
  genelPuan: number;
  gucluyonler: string;
  gelisimAlanlari: string;
  hedefler: string;
  durum: 'taslak' | 'tamamlandi';
  tarih: string;
}

interface PerformansYonetimiProps {
  employees: Employee[];
  userRole?: string;
}

const DEGERLENDIRICI_ETIKETLERI: Record<DegerlendiriciTuru, { label: string; color: string; icon: any }> = {
  yonetici: { label: 'Yönetici Değerlendirmesi', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: ShieldCheck },
  oz: { label: 'Öz Değerlendirme (Kendisi)', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck },
  akran: { label: 'Akran / Çalışma Arkadaşı', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Users },
  ast: { label: 'Ast / Ekip Üyesi', color: 'bg-amber-50 text-amber-700 border-amber-200', icon: Target },
};

const puanRengi = (puan: number) => {
  if (puan >= 4.5) return 'text-emerald-600';
  if (puan >= 3.5) return 'text-blue-600';
  if (puan >= 2.5) return 'text-amber-600';
  return 'text-rose-600';
};

const PuanYildizlari: React.FC<{ puan: number; max?: number }> = ({ puan, max = 5 }) => (
  <div className="flex gap-1 items-center">
    {Array.from({ length: max }).map((_, i) => {
      const active = i < Math.round(puan);
      return (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${active ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
        />
      );
    })}
  </div>
);

const PerformansYonetimi: React.FC<PerformansYonetimiProps> = ({ employees, userRole = 'employee' }) => {
  const { profile, appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || 'employee');
  const companyId = profile?.company_id || 'default';

  const currentEmployee = useMemo(() => {
    return (
      employees.find(
        (emp) =>
          emp.email?.toLowerCase() === profile?.email?.toLowerCase() ||
          emp.name?.toLowerCase() === profile?.full_name?.toLowerCase()
      ) || employees[0]
    );
  }, [employees, profile]);

  const [secilenDegerlendirmeId, setSecilenDegerlendirmeId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  // Filtreler
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenDepartman, setSecilenDepartman] = useState<string>('hepsi');
  const [secilenDonemFiltre, setSecilenDonemFiltre] = useState<string>('hepsi');
  const [secilenTurFiltre, setSecilenTurFiltre] = useState<string>('hepsi');

  // Dönem listesi
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;
  const donemler = [
    `${currentYear}-Q1`,
    `${currentYear}-Q2`,
    `${currentYear}-Q3`,
    `${currentYear}-Q4`,
    `${currentYear - 1}-Q4`,
  ];
  const guncelDonem = `${currentYear}-Q${currentQuarter}`;

  // State'ler
  const [degerlendirmeler, setDegerlendirmeler] = useState<PerformansDegerlendirme[]>([]);

  // Yeni Değerlendirme Formu State
  const [yeniDeg, setYeniDeg] = useState({
    employeeId: '',
    donem: guncelDonem,
    degerlendiriciTuru: 'yonetici' as DegerlendiriciTuru,
    teknikYetkinlik: 4,
    iletisim: 4,
    takim: 4,
    liderlik: 3,
    uyum: 4,
    gucluyonler: '',
    gelisimAlanlari: '',
    hedefler: '',
    durum: 'tamamlandi' as 'taslak' | 'tamamlandi',
  });

  // LocalStorage'dan veri yükleme
  useEffect(() => {
    const storedDeg = localStorage.getItem(`humanius_performances_${companyId}`);
    if (storedDeg) {
      try {
        setDegerlendirmeler(JSON.parse(storedDeg));
      } catch {}
    } else {
      // Örnek başlangıç 360 verileri (boş olmaması için zengin demo)
      if (employees.length > 0) {
        const seedData: PerformansDegerlendirme[] = employees.slice(0, 4).map((emp, idx) => ({
          id: `seed-deg-${idx}`,
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department || 'Genel',
          donem: guncelDonem,
          degerlendiren: idx % 2 === 0 ? 'Yönetici (İlk Amir)' : emp.name,
          degerlendiriciTuru: idx % 2 === 0 ? 'yonetici' : 'oz',
          teknikYetkinlik: 4 + (idx % 2 === 0 ? 0.5 : 0),
          iletisim: 4,
          takim: 4.5,
          liderlik: 3.5,
          uyum: 4,
          genelPuan: 4.1,
          gucluyonler: 'Yüksek iş disiplini, analitik düşünme ve ekip içi yapıcı iletişim.',
          gelisimAlanlari: 'Zaman yönetimi ve önceliklendirme süreçlerinde mentorluk desteği faydalı olacaktır.',
          hedefler: 'Yeni çeyrekte proje liderliği ve ilgili teknik sertifikasyon sürecini tamamlama.',
          durum: 'tamamlandi',
          tarih: new Date().toISOString().split('T')[0],
        }));
        setDegerlendirmeler(seedData);
        localStorage.setItem(`humanius_performances_${companyId}`, JSON.stringify(seedData));
      }
    }
  }, [companyId, employees, guncelDonem]);

  // Departman listesi
  const departmanlar = useMemo(() => {
    const deps = new Set(employees.map((e) => e.department).filter(Boolean));
    return Array.from(deps);
  }, [employees]);

  // Filtrelenmiş liste
  const goruntulenenDegerlendirmeler = useMemo(() => {
    let list = isManagement
      ? degerlendirmeler
      : degerlendirmeler.filter(
          (deg) =>
            deg.employeeId === currentEmployee?.id ||
            deg.employeeName?.toLowerCase() === currentEmployee?.name?.toLowerCase()
        );

    if (aramaMetni.trim()) {
      const query = aramaMetni.toLowerCase();
      list = list.filter(
        (d) =>
          d.employeeName.toLowerCase().includes(query) ||
          d.department.toLowerCase().includes(query) ||
          d.degerlendiren.toLowerCase().includes(query)
      );
    }

    if (secilenDepartman !== 'hepsi') {
      list = list.filter((d) => d.department === secilenDepartman);
    }

    if (secilenDonemFiltre !== 'hepsi') {
      list = list.filter((d) => d.donem === secilenDonemFiltre);
    }

    if (secilenTurFiltre !== 'hepsi') {
      list = list.filter((d) => d.degerlendiriciTuru === secilenTurFiltre);
    }

    return list;
  }, [
    degerlendirmeler,
    isManagement,
    currentEmployee,
    aramaMetni,
    secilenDepartman,
    secilenDonemFiltre,
    secilenTurFiltre,
  ]);

  // İstatistikler
  const genelOrtalama = useMemo(() => {
    if (!goruntulenenDegerlendirmeler.length) return '—';
    const sum = goruntulenenDegerlendirmeler.reduce((acc, d) => acc + d.genelPuan, 0);
    return (sum / goruntulenenDegerlendirmeler.length).toFixed(1);
  }, [goruntulenenDegerlendirmeler]);

  const tamamlananCount = goruntulenenDegerlendirmeler.filter((d) => d.durum === 'tamamlandi').length;
  const yoneticiDegerlendirmeCount = goruntulenenDegerlendirmeler.filter((d) => d.degerlendiriciTuru === 'yonetici').length;
  const ozDegerlendirmeCount = goruntulenenDegerlendirmeler.filter((d) => d.degerlendiriciTuru === 'oz').length;

  // Yeni Değerlendirme Kaydet
  const handleSaveEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!yeniDeg.employeeId) {
      alert('Lütfen değerlendirilecek personeli seçin.');
      return;
    }
    const emp = employees.find((e) => e.id === yeniDeg.employeeId);
    if (!emp) {
      alert('Seçilen personel bulunamadı.');
      return;
    }

    const genelPuan = Number(
      (
        (yeniDeg.teknikYetkinlik +
          yeniDeg.iletisim +
          yeniDeg.takim +
          yeniDeg.liderlik +
          yeniDeg.uyum) /
        5
      ).toFixed(1)
    );

    const newEvaluation: PerformansDegerlendirme = {
      id: `deg-custom-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department || 'Genel',
      donem: yeniDeg.donem,
      degerlendiren:
        yeniDeg.degerlendiriciTuru === 'oz'
          ? `${emp.name} (Öz Değerlendirme)`
          : profile?.full_name || 'Şirket Yöneticisi',
      degerlendiriciTuru: yeniDeg.degerlendiriciTuru,
      teknikYetkinlik: yeniDeg.teknikYetkinlik,
      iletisim: yeniDeg.iletisim,
      takim: yeniDeg.takim,
      liderlik: yeniDeg.liderlik,
      uyum: yeniDeg.uyum,
      genelPuan,
      gucluyonler: yeniDeg.gucluyonler.trim() || 'İş sorumluluğu yüksek ve göreve bağlılık sergiliyor.',
      gelisimAlanlari: yeniDeg.gelisimAlanlari.trim() || 'İletişim ve organizasyonel gelişim hedefleri desteklenecek.',
      hedefler: yeniDeg.hedefler.trim() || 'Dönemsel iş hedeflerine uyum ve yetkinlik eğitimlerinin tamamlanması.',
      durum: yeniDeg.durum,
      tarih: new Date().toISOString().split('T')[0],
    };

    const updated = [newEvaluation, ...degerlendirmeler];
    setDegerlendirmeler(updated);
    localStorage.setItem(`humanius_performances_${companyId}`, JSON.stringify(updated));
    setShowNewForm(false);

    // Formu sıfırla
    setYeniDeg({
      employeeId: '',
      donem: guncelDonem,
      degerlendiriciTuru: 'yonetici',
      teknikYetkinlik: 4,
      iletisim: 4,
      takim: 4,
      liderlik: 3,
      uyum: 4,
      gucluyonler: '',
      gelisimAlanlari: '',
      hedefler: '',
      durum: 'tamamlandi',
    });
  };

  // Silme
  const handleDeleteEvaluation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bu performans değerlendirmesini silmek istediğinize emin misiniz?')) {
      const updated = degerlendirmeler.filter((d) => d.id !== id);
      setDegerlendirmeler(updated);
      localStorage.setItem(`humanius_performances_${companyId}`, JSON.stringify(updated));
      if (secilenDegerlendirmeId === id) {
        setSecilenDegerlendirmeId(null);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık ve Aksiyon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">360° Performans Değerlendirme</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Yetkinlik bazlı, çok boyutlu (Yönetici, Öz Değerlendirme, Akran) performans takip sistemi
          </p>
        </div>

        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-indigo-100"
        >
          <Plus className="w-4 h-4" />
          Yeni Değerlendirme Ekle
        </button>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Genel Ortalama Puan</span>
            <BarChart3 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-3xl font-extrabold ${puanRengi(Number(genelOrtalama) || 0)}`}>
              {genelOrtalama}
            </p>
            {genelOrtalama !== '—' && <span className="text-xs font-semibold text-gray-400">/ 5.0</span>}
          </div>
          <div className="mt-2">
            {genelOrtalama !== '—' ? (
              <PuanYildizlari puan={Number(genelOrtalama)} />
            ) : (
              <span className="text-xs text-gray-400">Kayıtlı veri yok</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Tamamlanan Form</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-gray-900">{tamamlananCount}</p>
          <p className="text-xs text-gray-500 mt-2">
            Toplam {goruntulenenDegerlendirmeler.length} değerlendirme formu
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Yönetici Puanlamaları</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-extrabold text-purple-700">{yoneticiDegerlendirmeCount}</p>
          <p className="text-xs text-gray-500 mt-2">Amir/Yönetici onaylı değerlendirmeler</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500">Öz Değerlendirmeler</span>
            <UserCheck className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-extrabold text-blue-700">{ozDegerlendirmeCount}</p>
          <p className="text-xs text-gray-500 mt-2">Çalışanların kendi öz puanlamaları</p>
        </div>
      </div>

      {/* Arama ve Filtreleme Çubuğu */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Arama */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Personel adı, departman veya değerlendiren ara..."
              value={aramaMetni}
              onChange={(e) => setAramaMetni(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-gray-100/60 focus:bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          {/* Departman */}
          <div className="w-full md:w-48">
            <select
              value={secilenDepartman}
              onChange={(e) => setSecilenDepartman(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-gray-700"
            >
              <option value="hepsi">Tüm Departmanlar</option>
              {departmanlar.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Dönem */}
          <div className="w-full md:w-36">
            <select
              value={secilenDonemFiltre}
              onChange={(e) => setSecilenDonemFiltre(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-gray-700"
            >
              <option value="hepsi">Tüm Dönemler</option>
              {donemler.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Değerlendirici Türü */}
          <div className="w-full md:w-44">
            <select
              value={secilenTurFiltre}
              onChange={(e) => setSecilenTurFiltre(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-gray-700"
            >
              <option value="hepsi">Tüm Değerlendiriciler</option>
              <option value="yonetici">Yönetici Değerlendirmesi</option>
              <option value="oz">Öz Değerlendirme</option>
              <option value="akran">Akran Değerlendirmesi</option>
              <option value="ast">Ast Değerlendirmesi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Değerlendirme Listesi */}
      <div className="space-y-3">
        {goruntulenenDegerlendirmeler.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 p-6">
            <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h3 className="text-base font-bold text-gray-700">Değerlendirme Kaydı Bulunamadı</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Arama kriterlerinize uygun kayıt bulunmuyor veya henüz yeni bir 360° performans değerlendirmesi eklenmedi.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              İlk Değerlendirmeyi Başlat
            </button>
          </div>
        ) : (
          goruntulenenDegerlendirmeler.map((deg) => {
            const isOpen = secilenDegerlendirmeId === deg.id;
            const badge = DEGERLENDIRICI_ETIKETLERI[deg.degerlendiriciTuru] || DEGERLENDIRICI_ETIKETLERI.yonetici;
            const BadgeIcon = badge.icon;

            return (
              <div
                key={deg.id}
                onClick={() => setSecilenDegerlendirmeId(isOpen ? null : deg.id)}
                className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                  isOpen
                    ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-md'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-xs'
                }`}
              >
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Personel Bilgisi */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-xs">
                        {deg.employeeName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 text-base">{deg.employeeName}</h4>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.color}`}
                          >
                            <BadgeIcon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {deg.department} • <span className="font-medium text-gray-700">{deg.donem} Dönemi</span> • Değerlendiren:{' '}
                          <span className="font-medium text-gray-700">{deg.degerlendiren}</span>
                        </p>
                      </div>
                    </div>

                    {/* Puan ve Aksiyon */}
                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <span className={`text-2xl font-extrabold ${puanRengi(deg.genelPuan)}`}>
                            {deg.genelPuan.toFixed(1)}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold">/ 5.0</span>
                        </div>
                        <PuanYildizlari puan={deg.genelPuan} />
                      </div>

                      {isManagement && (
                        <button
                          onClick={(e) => handleDeleteEvaluation(deg.id, e)}
                          className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Değerlendirmeyi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isOpen ? 'rotate-90 text-indigo-600' : ''
                        }`}
                      />
                    </div>
                  </div>

                  {/* Genişletilmiş 360° Yetkinlik Detayı */}
                  {isOpen && (
                    <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 animate-in fade-in duration-200">
                      {/* 5 Yetkinlik Kriter Çubuğu */}
                      <div>
                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          360° Yetkinlik Boyutları ve Skorları
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                          {[
                            { label: 'İş & Teknik Yetkinlik', puan: deg.teknikYetkinlik },
                            { label: 'İletişim & İşbirliği', puan: deg.iletisim },
                            { label: 'Takım Çalışması', puan: deg.takim },
                            { label: 'Liderlik & İnisiyatif', puan: deg.liderlik },
                            { label: 'Uyum & Adaptasyon', puan: deg.uyum },
                          ].map((kriter) => {
                            const yuzde = Math.round((kriter.puan / 5) * 100);
                            return (
                              <div
                                key={kriter.label}
                                className="bg-gray-50 border border-gray-100 rounded-xl p-3.5"
                              >
                                <p className="text-xs text-gray-600 font-medium mb-1 truncate" title={kriter.label}>
                                  {kriter.label}
                                </p>
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className={`text-base font-extrabold ${puanRengi(kriter.puan)}`}>
                                    {kriter.puan} / 5
                                  </span>
                                  <span className="text-[11px] font-semibold text-gray-400">%{yuzde}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      kriter.puan >= 4
                                        ? 'bg-emerald-500'
                                        : kriter.puan >= 3
                                        ? 'bg-blue-500'
                                        : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${yuzde}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Niteliksel Geri Bildirimler */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs mb-2">
                            <Sparkles className="w-4 h-4 text-emerald-600" />
                            Güçlü Yönler & Başarılar
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{deg.gucluyonler}</p>
                        </div>

                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs mb-2">
                            <Target className="w-4 h-4 text-amber-600" />
                            Gelişim Alanları & İhtiyaçlar
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{deg.gelisimAlanlari}</p>
                        </div>

                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                          <div className="flex items-center gap-1.5 text-indigo-800 font-bold text-xs mb-2">
                            <FileCheck2 className="w-4 h-4 text-indigo-600" />
                            Gelecek Dönem Gelişim Hedefleri
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">{deg.hedefler}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* YENİ DEĞERLENDİRME MODALI */}
      {showNewForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Yeni 360° Performans Değerlendirmesi</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Çalışan yetkinliklerini değerlendirin ve gelişim hedeflerini belirleyin
                </p>
              </div>
              <button
                onClick={() => setShowNewForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvaluation} className="space-y-5">
              {/* Personel ve Dönem Seçimi */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Değerlendirilecek Personel <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={yeniDeg.employeeId}
                    onChange={(e) => setYeniDeg({ ...yeniDeg, employeeId: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">Personel Seçiniz...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} — {emp.department || 'Genel'} ({emp.position || 'Personel'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Dönem <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={yeniDeg.donem}
                    onChange={(e) => setYeniDeg({ ...yeniDeg, donem: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    {donemler.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Değerlendirici Türü */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Değerlendirme Kaynağı (360° Boyutu)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'yonetici', label: '👑 Yönetici' },
                      { id: 'oz', label: '🙋 Öz Değerlendirme' },
                      { id: 'akran', label: '👥 Akran (İş Arkadaşı)' },
                      { id: 'ast', label: '🏢 Ast (Ekip Üyesi)' },
                    ] as const
                  ).map((tur) => (
                    <button
                      key={tur.id}
                      type="button"
                      onClick={() => setYeniDeg({ ...yeniDeg, degerlendiriciTuru: tur.id })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                        yeniDeg.degerlendiriciTuru === tur.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tur.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Yetkinlik Puanlamaları (1 - 5) */}
              <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-4 space-y-3.5">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Yetkinlik Kriter Puanlaması (1 - 5 Puan)
                </h4>

                {[
                  { key: 'teknikYetkinlik', label: '1. İş & Teknik Yetkinlik', desc: 'Görev uzmanlığı, iş çıktısı kalitesi ve teknik bilgi düzeyi' },
                  { key: 'iletisim', label: '2. İletişim & İşbirliği', desc: 'Açık iletişim, dinleme ve ekip arkadaşlarıyla etkin koordinasyon' },
                  { key: 'takim', label: '3. Takım Çalışması & Ruh', desc: 'Ekip hedeflerine katkı, yardımseverlik ve yapıcı tutum' },
                  { key: 'liderlik', label: '4. Liderlik & İnisiyatif', desc: 'Sorumluluk alma, problem çözme ve yönlendirme kabiliyeti' },
                  { key: 'uyum', label: '5. Uyum & Adaptasyon', desc: 'Değişime ve şirket kültürüne hızlı uyum, sürekli öğrenme' },
                ].map((kriter) => {
                  const currentValue = (yeniDeg as any)[kriter.key];
                  return (
                    <div
                      key={kriter.key}
                      className="bg-white p-3 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-bold text-gray-800">{kriter.label}</p>
                        <p className="text-[11px] text-gray-500">{kriter.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setYeniDeg({ ...yeniDeg, [kriter.key]: num })}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              currentValue === num
                                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200 scale-105'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Niteliksel Geri Bildirim Alanları */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    🌟 Güçlü Yönler ve Başarılar
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Çalışanın öne çıkan güçlü yönlerini ve başarılarını yazın..."
                    value={yeniDeg.gucluyonler}
                    onChange={(e) => setYeniDeg({ ...yeniDeg, gucluyonler: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    🎯 Gelişim Alanları ve İhtiyaçlar
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Çalışanın desteklenmesi veya geliştirmesi gereken alanlar..."
                    value={yeniDeg.gelisimAlanlari}
                    onChange={(e) => setYeniDeg({ ...yeniDeg, gelisimAlanlari: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    🚀 Gelecek Dönem Hedefleri & Aksiyon Planı
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Önümüzdeki çeyrek için belirlenen aksiyonlar, eğitimler ve hedefler..."
                    value={yeniDeg.hedefler}
                    onChange={(e) => setYeniDeg({ ...yeniDeg, hedefler: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                </div>
              </div>

              {/* Butonlar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-all shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Değerlendirmeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformansYonetimi;

