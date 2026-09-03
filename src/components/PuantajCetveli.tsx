import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Printer,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  FileText,
  Sliders,
  Sparkles,
  Info,
  X,
  Edit3,
  CalendarCheck,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaKaydi } from '../services/pdksService';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR } from '../services/shiftService';
import {
  hesaplaPersonelAylikPuantaj,
  PersonelAylikPuantaj,
  PuantajKodu,
  GunlukPuantajDetay
} from '../utils/puantajHesaplama';
import { printPuantajCetveliPdf, exportPuantajCsv } from '../utils/puantajPdf';

interface PuantajCetveliProps {
  employees: Employee[];
  izinTalepleri?: any[];
  departments?: any[];
  onNavigateToPdks?: () => void;
}

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PuantajCetveli: React.FC<PuantajCetveliProps> = ({
  employees,
  izinTalepleri = [],
  departments = [],
  onNavigateToPdks,
}) => {
  const { profile, appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole);

  // Tarih Seçimi (Yıl ve Ay)
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(today.getMonth());

  // Görünüm Modu: Matris (Çizelge) veya Günlük Detay
  const [activeTab, setActiveTab] = useState<'matrix' | 'daily'>('matrix');

  // Filtreler
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');

  // Veri Durumları
  const [vardiyaKayitlari, setVardiyaKayitlari] = useState<VardiyaKaydi[]>([]);
  const [companyShifts, setCompanyShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Hücre Düzenleme (Quick Edit) Modalı
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editTarget, setEditTarget] = useState<{
    employee: Employee;
    gun: GunlukPuantajDetay;
  } | null>(null);
  const [editKod, setEditKod] = useState<PuantajKodu>('Ç');
  const [editGiris, setEditGiris] = useState<string>('08:30');
  const [editCikis, setEditCikis] = useState<string>('18:00');
  const [editNotlar, setEditNotlar] = useState<string>('');

  // Manuel Düzeltmeler (Overrides)
  const [adminOverrides, setAdminOverrides] = useState<Record<string, any>>(() => {
    try {
      const s = localStorage.getItem('humanius_puantaj_overrides');
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  // Departman Listesi
  const deptList = useMemo(() => {
    if (departments && departments.length > 0) {
      return departments.map((d: any) => (typeof d === 'string' ? d : d.name)).filter(Boolean);
    }
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];
  }, [departments, employees]);

  // Ay Değiştirme
  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedYear((prev) => prev - 1);
      setSelectedMonthIndex(11);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedYear((prev) => prev + 1);
      setSelectedMonthIndex(0);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  // Verileri Yükle
  const loadPuantajData = async () => {
    setIsLoading(true);
    try {
      const targetCompanyId = profile?.company_id || undefined;
      const [fetchedVardiyalar, fetchedShifts, fetchedAssignments] = await Promise.all([
        pdksService.getVardiyalar(),
        shiftService.getShifts(targetCompanyId),
        shiftService.getAssignments(targetCompanyId),
      ]);
      setVardiyaKayitlari(fetchedVardiyalar);
      setCompanyShifts(fetchedShifts.length > 0 ? fetchedShifts : VARSAYILAN_VARDIYALAR);
      setShiftAssignments(fetchedAssignments);
    } catch (err) {
      console.warn('Puantaj verileri yüklenirken hata oluştu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPuantajData();
  }, [profile?.company_id]);

  // Puantaj Hesaplamaları
  const allCalculatedPuantaj: PersonelAylikPuantaj[] = useMemo(() => {
    const defaultShift = companyShifts.find((s) => s.is_default) || companyShifts[0] || VARSAYILAN_VARDIYALAR[0];

    return employees.map((emp) => {
      const assignedShiftId = shiftAssignments[emp.id];
      const empShift = companyShifts.find((s) => s.id === assignedShiftId) || defaultShift;

      return hesaplaPersonelAylikPuantaj({
        employee: emp,
        year: selectedYear,
        monthIndex: selectedMonthIndex,
        shift: empShift,
        vardiyaKayitlari,
        izinTalepleri,
        adminOverrides,
      });
    });
  }, [employees, selectedYear, selectedMonthIndex, companyShifts, shiftAssignments, vardiyaKayitlari, izinTalepleri, adminOverrides]);

  // Filtrelenmiş Puantaj
  const filteredPuantaj = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allCalculatedPuantaj.filter((p) => {
      const emp = p.employee;
      const matchesSearch =
        !term ||
        emp.name.toLowerCase().includes(term) ||
        (emp.tcNo && emp.tcNo.includes(term)) ||
        (emp.department && emp.department.toLowerCase().includes(term)) ||
        (emp.position && emp.position.toLowerCase().includes(term));

      const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;

      return matchesSearch && matchesDept;
    });
  }, [allCalculatedPuantaj, searchTerm, selectedDepartment]);

  // İstatistik Kartları (KPIs)
  const totalStats = useMemo(() => {
    const totalEmployees = filteredPuantaj.length;
    if (totalEmployees === 0) {
      return {
        totalEmployees: 0,
        totalFiiliSaat: 0,
        avgFiiliSaat: 0,
        totalFazlaMesai: 0,
        totalIzinliRaporlu: 0,
        tamBordroOrani: 0,
      };
    }

    const totalFiiliSaat = filteredPuantaj.reduce((acc, p) => acc + p.ozet.fiiliCalismaSaat, 0);
    const totalFazlaMesai = filteredPuantaj.reduce((acc, p) => acc + p.ozet.toplamFazlaMesaiSaat, 0);
    const totalIzinliRaporlu = filteredPuantaj.reduce((acc, p) => acc + p.ozet.ucretliIzinGun + p.ozet.raporluGun, 0);
    const tamBordroSayisi = filteredPuantaj.filter((p) => p.ozet.bordroGun === 30).length;

    return {
      totalEmployees,
      totalFiiliSaat: parseFloat(totalFiiliSaat.toFixed(1)),
      avgFiiliSaat: parseFloat((totalFiiliSaat / totalEmployees).toFixed(1)),
      totalFazlaMesai: parseFloat(totalFazlaMesai.toFixed(1)),
      totalIzinliRaporlu,
      tamBordroOrani: Math.round((tamBordroSayisi / totalEmployees) * 100),
    };
  }, [filteredPuantaj]);

  // Hücre Düzenleme Aç
  const handleOpenEditCell = (rec: PersonelAylikPuantaj, gun: GunlukPuantajDetay) => {
    if (!isManagement) return;
    setEditTarget({ employee: rec.employee, gun });
    setEditKod(gun.kod);
    setEditGiris(gun.girisSaati || '08:30');
    setEditCikis(gun.cikisSaati || '18:00');
    setEditNotlar(gun.notlar || '');
    setEditModalOpen(true);
  };

  // Hücre Düzenleme Kaydet
  const handleSaveCellEdit = async () => {
    if (!editTarget) return;
    const { employee, gun } = editTarget;
    const overrideKey = `${employee.id}_${gun.tarih}`;

    const newOverride = {
      kod: editKod,
      giris: editKod === 'Ç' ? editGiris : '-',
      cikis: editKod === 'Ç' ? editCikis : '-',
      notlar: editNotlar || undefined,
      kodAciklama:
        editKod === 'Ç'
          ? `Fiili Çalışma (${editGiris}-${editCikis})`
          : editKod === 'Yİ'
          ? 'Yıllık Ücretli İzin'
          : editKod === 'Mİ'
          ? 'Mazeret İzni'
          : editKod === 'R'
          ? 'İstirahat (SGK Raporu)'
          : editKod === 'Üİ'
          ? 'Ücretsiz İzin'
          : editKod === 'HT'
          ? 'Hafta Tatili'
          : editKod === 'UBGT'
          ? 'Resmi Tatil'
          : 'Devamsız',
    };

    const nextOverrides = { ...adminOverrides, [overrideKey]: newOverride };
    setAdminOverrides(nextOverrides);
    localStorage.setItem('humanius_puantaj_overrides', JSON.stringify(nextOverrides));

    // Veritabanına da güncelleyelim (arka planda)
    try {
      if (editKod === 'Ç') {
        await pdksService.createVardiya({
          company_id: employee.company_id || profile?.company_id || 'default',
          employee_id: employee.id,
          tarih: gun.tarih,
          vardiya_tipi: 'sabah',
          giris_saati: editGiris,
          cikis_saati: editCikis,
          durum: 'zamaninda',
          notlar: editNotlar || 'Puantaj ekranından manuel düzenlendi',
        });
      }
    } catch (err) {
      console.warn('Veritabanı puantaj güncelleme uyarısı:', err);
    }

    setEditModalOpen(false);
  };

  // Çıktı Fonksiyonları
  const handlePrintPdf = () => {
    printPuantajCetveliPdf({
      companyName: profile?.company_name || 'Humanius HRMS',
      year: selectedYear,
      monthIndex: selectedMonthIndex,
      records: filteredPuantaj,
      departmentFilter: selectedDepartment === 'all' ? 'Tüm Departmanlar' : selectedDepartment,
      preparedBy: profile?.full_name || 'İnsan Kaynakları & PDKS Sorumlusu',
    });
  };

  const handleExportCsv = () => {
    exportPuantajCsv(
      profile?.company_name || 'Humanius',
      selectedYear,
      selectedMonthIndex,
      filteredPuantaj
    );
  };

  return (
    <div className="space-y-6">
      {/* ÜST BAŞLIK & DÖNEM SEÇİCİ */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Aylık Personel Puantaj Cetveli</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                4857 Sayılı İş Kanunu ve UBGT mevzuatına tam uyumlu günlük çalışma, hafta tatili, izin ve bordro çizelgesi.
              </p>
            </div>
          </div>
        </div>

        {/* Ay / Yıl Seçici & Aksiyonlar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Dönem Değiştirme Butonları */}
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-gray-600 cursor-pointer"
              title="Önceki Ay"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 py-1 text-sm font-bold text-gray-800 min-w-[130px] text-center flex items-center justify-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>
                {AY_ADLARI[selectedMonthIndex]} {selectedYear}
              </span>
            </div>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white hover:shadow-xs rounded-lg transition-all text-gray-600 cursor-pointer"
              title="Sonraki Ay"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Yazdır & Excel Butonları */}
          <button
            onClick={handlePrintPdf}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Resmi A4 Yatay İmzalı Puantaj Cetveli Yazdır"
          >
            <Printer className="w-4 h-4 text-blue-400" />
            <span>Resmi Puantaj (PDF)</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            title="Bordro ve Muhasebe Uyumlu Excel/CSV Aktarımı"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Excel / CSV İndir</span>
          </button>
        </div>
      </div>

      {/* KPI İSTATİSTİK KARTLARI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Toplam Personel</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalStats.totalEmployees}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Puantaj kapsamındaki kişi</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Fiili Çalışma</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{totalStats.totalFiiliSaat} <span className="text-xs font-normal text-gray-500">saat</span></div>
          <div className="text-[11px] text-gray-400 mt-0.5">Kişi başı ort. {totalStats.avgFiiliSaat}s</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Fazla Mesai (FM)</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">+{totalStats.totalFazlaMesai} <span className="text-xs font-normal text-gray-500">saat</span></div>
          <div className="text-[11px] text-gray-400 mt-0.5">%50 zamlı tahakkuk</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>İzinli & Raporlu</span>
            <Briefcase className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">{totalStats.totalIzinliRaporlu} <span className="text-xs font-normal text-gray-500">gün</span></div>
          <div className="text-[11px] text-gray-400 mt-0.5">Yıllık, mazeret ve rapor</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Maktu 30G Tam Oran</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">%{totalStats.tamBordroOrani}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">30 gün tam bordro hak edişi</div>
        </div>
      </div>

      {/* ARAMA VE BİRİM / DEPARTMAN FİLTRE PANELİ */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Personel ara (Ad, Soyad, TC No, Pozisyon, Departman)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none text-sm"
            />
          </div>

          {/* Sekme Değiştirici: Matris Çizelge vs Günlük Detay */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              📅 Aylık Puantaj Matrisi (1-31 Gün)
            </button>
            <button
              onClick={() => setActiveTab('daily')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'daily'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              ⏱️ Günlük Detaylı Hareketler
            </button>
          </div>
        </div>

        {/* Departman / Birim Filtre Butonları */}
        {deptList.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSelectedDepartment('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedDepartment === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              Tümü ({allCalculatedPuantaj.length})
            </button>
            {deptList.map((dept) => {
              const count = allCalculatedPuantaj.filter((p) => p.employee.department === dept).length;
              const isSelected = selectedDepartment === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {dept} {count > 0 ? `(${count})` : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* PUANTAJ KODLARI LEJANTI (HIZLI AÇIKLAMA BARI) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700">Puantaj Kodları:</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
            Ç : Fiili Çalışma
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold text-[11px]">
            HT : Hafta Tatili (Paz)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[11px]">
            AT : Akdi Tatil (Cmt)
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[11px]">
            UBGT : Resmi Tatil
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[11px]">
            Yİ : Yıllık İzin
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
            R : SGK Raporu
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold text-[11px]">
            Üİ : Ücretsiz İzin
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[11px]">
            D : Devamsız
          </span>
        </div>
        <div className="text-[11px] text-slate-500 italic">
          💡 Hücreye tıklayarak ilgili günün giriş/çıkış saatini veya durumunu anında düzenleyebilirsiniz.
        </div>
      </div>

      {/* GÖRÜNÜM A: AYLIK PUANTAJ MATRİSİ */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[680px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-gray-100 text-gray-700 sticky top-0 z-20 border-b border-gray-300">
                <tr>
                  <th className="px-3 py-3 font-bold border-r border-gray-300 bg-gray-100 sticky left-0 z-30 min-w-[200px]">
                    Personel Bilgisi
                  </th>
                  <th className="px-2 py-3 font-bold border-r border-gray-200 text-center min-w-[70px]">
                    Vardiya
                  </th>

                  {/* Gün Başlıkları (1 - 30/31) */}
                  {filteredPuantaj[0]?.gunler.map((g) => {
                    const bg = g.isPazar
                      ? 'bg-red-50 text-red-700'
                      : g.isCumartesi
                      ? 'bg-slate-100 text-slate-700'
                      : g.isResmiTatil
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-50 text-gray-700';

                    return (
                      <th
                        key={g.tarih}
                        className={`px-1 py-2 text-center border-r border-gray-200 min-w-[34px] ${bg}`}
                        title={`${g.tarih} ${g.gunAdi}${g.resmiTatilAdi ? ' - ' + g.resmiTatilAdi : ''}`}
                      >
                        <div className="font-extrabold text-[11px]">{g.gunNo}</div>
                        <div className="text-[9px] font-normal opacity-80">{g.gunAdi}</div>
                      </th>
                    );
                  })}

                  {/* Sağ Özet Sütunları */}
                  <th className="px-2 py-3 text-center border-r border-gray-200 bg-emerald-50 text-emerald-800 font-bold min-w-[65px]">
                    Fiili Gün/Saat
                  </th>
                  <th className="px-2 py-3 text-center border-r border-gray-200 bg-blue-50 text-blue-800 font-bold min-w-[40px]">
                    HT
                  </th>
                  <th className="px-2 py-3 text-center border-r border-gray-200 bg-teal-50 text-teal-800 font-bold min-w-[40px]">
                    İzin
                  </th>
                  <th className="px-2 py-3 text-center border-r border-gray-200 bg-amber-50 text-amber-800 font-bold min-w-[40px]">
                    Rap.
                  </th>
                  <th className="px-2 py-3 text-center border-r border-gray-200 bg-red-50 text-red-800 font-bold min-w-[40px]">
                    Dev.
                  </th>
                  <th className="px-2 py-3 text-center border-r border-gray-300 bg-blue-600 text-white font-extrabold min-w-[65px]">
                    Bordro (30G)
                  </th>
                  <th className="px-2 py-3 text-center bg-amber-50 text-amber-800 font-bold min-w-[55px]">
                    FM Saat
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPuantaj.map((p) => {
                  const emp = p.employee;
                  const ozet = p.ozet;

                  return (
                    <tr key={emp.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Sticky Personel Adı */}
                      <td className="px-3 py-2.5 border-r border-gray-200 bg-white sticky left-0 z-10 font-medium">
                        <div className="font-bold text-gray-900 leading-tight">{emp.name}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span>{emp.department || 'Genel'}</span>
                          <span>•</span>
                          <span>{emp.position || '-'}</span>
                        </div>
                      </td>

                      {/* Vardiya Bilgisi */}
                      <td className="px-1.5 py-2 text-center border-r border-gray-200 text-[10px] text-gray-600">
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {p.shift.start_time}-{p.shift.end_time}
                        </span>
                      </td>

                      {/* Günlük Hücreler */}
                      {p.gunler.map((g) => {
                        let cellBg = 'bg-white';
                        let badgeStyle = 'bg-gray-100 text-gray-600';
                        let displayVal = g.kod;

                        if (g.kod === 'Ç') {
                          badgeStyle = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
                          displayVal = g.netSureSaat > 0 ? `${g.netSureSaat}s` : 'Ç';
                        } else if (g.kod === 'HT') {
                          badgeStyle = 'bg-blue-100 text-blue-800 hover:bg-blue-200';
                        } else if (g.kod === 'AT') {
                          badgeStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                        } else if (g.kod === 'UBGT') {
                          badgeStyle = 'bg-purple-100 text-purple-800 hover:bg-purple-200';
                        } else if (g.kod === 'Yİ' || g.kod === 'Mİ') {
                          badgeStyle = 'bg-teal-100 text-teal-800 hover:bg-teal-200';
                        } else if (g.kod === 'R') {
                          badgeStyle = 'bg-amber-100 text-amber-800 hover:bg-amber-200';
                        } else if (g.kod === 'Üİ') {
                          badgeStyle = 'bg-orange-100 text-orange-800 hover:bg-orange-200';
                        } else if (g.kod === 'D') {
                          badgeStyle = 'bg-red-100 text-red-800 hover:bg-red-200';
                        }

                        if (g.isPazar) cellBg = 'bg-red-50/20';
                        if (g.isCumartesi) cellBg = 'bg-slate-50/40';

                        return (
                          <td
                            key={g.tarih}
                            onClick={() => handleOpenEditCell(p, g)}
                            className={`px-0.5 py-1 text-center border-r border-gray-100 ${cellBg} cursor-pointer transition-all hover:ring-1 hover:ring-blue-400`}
                            title={`${emp.name} - ${g.tarih} (${g.gunAdi})\nDurum: ${g.kodAciklama}\nGiriş: ${g.girisSaati || '-'}\nÇıkış: ${g.cikisSaati || '-'}\nNet Süre: ${g.netSureSaat} saat\n(Düzenlemek için tıklayın)`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span
                                className={`inline-block w-full py-0.5 rounded text-[10px] font-bold tracking-tight ${badgeStyle}`}
                              >
                                {displayVal}
                              </span>
                              {g.yasalUyari11Saat && (
                                <span className="text-[8px] text-amber-600 font-bold" title="Günlük 11 saat yasal sınır aşımı!">⚠️11s</span>
                              )}
                            </div>
                          </td>
                        );
                      })}

                      {/* Sağ Toplam Değerleri */}
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-bold text-emerald-700 bg-emerald-50/30">
                        {ozet.fiiliCalismaGun}g <span className="text-[10px] font-normal">({ozet.fiiliCalismaSaat}s)</span>
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-blue-700 bg-blue-50/30">
                        {ozet.haftaTatiliGun}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-teal-700 bg-teal-50/30">
                        {ozet.ucretliIzinGun}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-amber-700 bg-amber-50/30">
                        {ozet.raporluGun > 0 ? ozet.raporluGun : '-'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-red-700 bg-red-50/30">
                        {ozet.devamsizGun > 0 ? ozet.devamsizGun : '-'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-300 font-extrabold text-blue-700 bg-blue-50">
                        {ozet.bordroGun} <span className="text-[9px] font-normal">gün</span>
                      </td>
                      <td className="px-2 py-2 text-center font-bold text-amber-600 bg-amber-50/30">
                        {ozet.toplamFazlaMesaiSaat > 0 ? `+${ozet.toplamFazlaMesaiSaat}s` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GÖRÜNÜM B: GÜNLÜK DETAYLI HAREKET LİSTESİ */}
      {activeTab === 'daily' && (
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-800">Gün Filtresi:</span>
              <select
                value={selectedDayFilter}
                onChange={(e) => setSelectedDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-semibold outline-none bg-gray-50"
              >
                <option value="all">Tüm Günler (Tüm Ay)</option>
                {filteredPuantaj[0]?.gunler.map((g) => (
                  <option key={g.tarih} value={g.gunNo}>
                    {g.gunNo} {AY_ADLARI[selectedMonthIndex]} ({g.gunAdi})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500">
              Gösterilen kayıt: <strong>{filteredPuantaj.length} Personel</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Personel</th>
                  <th className="px-4 py-3">Tarih</th>
                  <th className="px-4 py-3 text-center">Vardiya</th>
                  <th className="px-4 py-3 text-center">İlk Giriş Saati</th>
                  <th className="px-4 py-3 text-center">Son Çıkış Saati</th>
                  <th className="px-4 py-3 text-center">Yasal Mola</th>
                  <th className="px-4 py-3 text-center">Net Süre</th>
                  <th className="px-4 py-3 text-center">Fazla Mesai</th>
                  <th className="px-4 py-3 text-center">Geç Kalma</th>
                  <th className="px-4 py-3 text-center">Puantaj Durumu</th>
                  <th className="px-4 py-3 text-center">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPuantaj.flatMap((p) =>
                  p.gunler
                    .filter((g) => selectedDayFilter === 'all' || g.gunNo === selectedDayFilter)
                    .map((g) => {
                      const emp = p.employee;
                      return (
                        <tr key={`${emp.id}_${g.tarih}`} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-bold text-gray-900">
                            {emp.name}
                            <div className="text-[10px] text-gray-400 font-normal">{emp.department || 'Genel'}</div>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-700">
                            {g.tarih} <span className="text-[10px] text-gray-400">({g.gunAdi})</span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-mono text-gray-500">
                            {p.shift.start_time} - {p.shift.end_time}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-blue-700">
                            {g.girisSaati || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-blue-700">
                            {g.cikisSaati || '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500">
                            {g.molaDk} dk
                          </td>
                          <td className="px-4 py-2.5 text-center font-extrabold text-emerald-700">
                            {g.netSureSaat > 0 ? `${g.netSureSaat} saat` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-amber-600">
                            {g.fazlaMesaiSaat > 0 ? `+${g.fazlaMesaiSaat}s` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center font-semibold text-rose-600">
                            {g.gecikmeDk > 0 ? `${g.gecikmeDk} dk` : '-'}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-800">
                              {g.kod} - {g.kodAciklama}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => handleOpenEditCell(p, g)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-all cursor-pointer"
                              title="Kaydı Düzenle"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* HIZLI HÜCRE DÜZENLEME MODALI */}
      {editModalOpen && editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Puantaj Gününü Düzenle</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editTarget.employee.name} • {editTarget.gun.tarih} ({editTarget.gun.gunAdi})
                </p>
              </div>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Puantaj Durumu (Mevzuat Kodu):</label>
                <select
                  value={editKod}
                  onChange={(e) => setEditKod(e.target.value as PuantajKodu)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="Ç">Ç : Fiili Çalışma (Normal Mesai)</option>
                  <option value="HT">HT : Hafta Tatili (Pazar / Madde 46)</option>
                  <option value="AT">AT : Akdi Tatil (Cumartesi)</option>
                  <option value="UBGT">UBGT : Resmi Tatil (Ulusal Bayram)</option>
                  <option value="Yİ">Yİ : Yıllık Ücretli İzin</option>
                  <option value="Mİ">Mİ : Mazeret İzni (Evlilik, Ölüm vb.)</option>
                  <option value="R">R : SGK İstirahat Raporu</option>
                  <option value="Üİ">Üİ : Ücretsiz İzin</option>
                  <option value="D">D : Devamsız (Giriş Yok)</option>
                </select>
              </div>

              {editKod === 'Ç' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Giriş Saati:</label>
                    <input
                      type="time"
                      value={editGiris}
                      onChange={(e) => setEditGiris(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">Çıkış Saati:</label>
                    <input
                      type="time"
                      value={editCikis}
                      onChange={(e) => setEditCikis(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-gray-700 block mb-1">Açıklama / Not:</label>
                <input
                  type="text"
                  placeholder="Revizyon gerekçesi (Örn: Saha görevi onaylandı)"
                  value={editNotlar}
                  onChange={(e) => setEditNotlar(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-xs cursor-pointer"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveCellEdit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
              >
                Değişiklikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuantajCetveli;
