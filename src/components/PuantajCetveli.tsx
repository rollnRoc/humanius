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
  AlertCircle,
  User,
  ArrowUpDown
} from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaKaydi } from '../services/pdksService';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR, SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG } from '../services/shiftService';
import {
  hesaplaPersonelAylikPuantaj,
  PersonelAylikPuantaj,
  PuantajKodu,
  GunlukPuantajDetay
} from '../utils/puantajHesaplama';
import {
  printPuantajCetveliPdf,
  exportPuantajCsv,
  printGunlukDetayliRaporPdf,
  exportGunlukDetayliCsv,
  GunlukDetayliRaporItem,
} from '../utils/puantajPdf';

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
  const [selectedDailyEmployeeId, setSelectedDailyEmployeeId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Veri Durumları
  const [vardiyaKayitlari, setVardiyaKayitlari] = useState<VardiyaKaydi[]>([]);
  const [companyShifts, setCompanyShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cumartesi Çalışma Yapılandırması
  const [saturdayConfig, setSaturdayConfig] = useState<SaturdayWorkConfig>(DEFAULT_SATURDAY_CONFIG);
  const [saturdayModalOpen, setSaturdayModalOpen] = useState<boolean>(false);
  const [isSavingSaturday, setIsSavingSaturday] = useState<boolean>(false);

  // Cumartesi Modal Form Değerleri
  const [modalIsSatWork, setModalIsSatWork] = useState<boolean>(false);
  const [modalSatStart, setModalSatStart] = useState<string>('08:30');
  const [modalSatEnd, setModalSatEnd] = useState<string>('13:00');
  const [modalSatBreak, setModalSatBreak] = useState<number>(0);
  const [modalSatTolerance, setModalSatTolerance] = useState<number>(15);
  const [satSaveSuccess, setSatSaveSuccess] = useState<boolean>(false);

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
      const targetCompanyId = profile?.company_id || employees[0]?.company_id || undefined;
      const [fetchedVardiyalar, fetchedShifts, fetchedAssignments, fetchedSaturday] = await Promise.all([
        pdksService.getVardiyalar(),
        shiftService.getShifts(targetCompanyId),
        shiftService.getAssignments(targetCompanyId),
        shiftService.getSaturdayConfig(targetCompanyId),
      ]);
      setVardiyaKayitlari(fetchedVardiyalar);
      setCompanyShifts(fetchedShifts.length > 0 ? fetchedShifts : VARSAYILAN_VARDIYALAR);
      setShiftAssignments(fetchedAssignments);
      setSaturdayConfig(fetchedSaturday);
    } catch (err) {
      console.warn('Puantaj verileri yüklenirken hata oluştu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPuantajData();

    const handleUpdate = () => loadPuantajData();
    window.addEventListener('humanius_shifts_updated', handleUpdate);
    window.addEventListener('humanius_saturday_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadPuantajData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('humanius_shifts_updated', handleUpdate);
      window.removeEventListener('humanius_saturday_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [profile?.company_id, employees]);

  // Cumartesi Ayarları Modal İşlemleri
  const handleOpenSaturdayModal = () => {
    setModalIsSatWork(saturdayConfig.isSaturdayWork);
    setModalSatStart(saturdayConfig.startTime || '08:30');
    setModalSatEnd(saturdayConfig.endTime || '13:00');
    setModalSatBreak(saturdayConfig.breakMinutes ?? 0);
    setModalSatTolerance(saturdayConfig.toleranceMinutes ?? 15);
    setSatSaveSuccess(false);
    setSaturdayModalOpen(true);
  };

  const handleSaveSaturdayConfig = async () => {
    setIsSavingSaturday(true);
    const targetCompanyId = profile?.company_id || employees[0]?.company_id || 'default';
    const newConfig: SaturdayWorkConfig = {
      isSaturdayWork: modalIsSatWork,
      startTime: modalSatStart,
      endTime: modalSatEnd,
      breakMinutes: Number(modalSatBreak || 0),
      toleranceMinutes: Number(modalSatTolerance || 15),
    };

    try {
      await shiftService.saveSaturdayConfig(targetCompanyId, newConfig);
      setSaturdayConfig(newConfig);
      setSatSaveSuccess(true);
      setTimeout(() => {
        setSaturdayModalOpen(false);
        setSatSaveSuccess(false);
      }, 600);
    } catch (err) {
      console.error('Cumartesi ayarı kaydedilirken hata:', err);
    } finally {
      setIsSavingSaturday(false);
    }
  };

  const applySaturdayPreset = (preset: 'half1' | 'half2' | 'full') => {
    setModalIsSatWork(true);
    if (preset === 'half1') {
      setModalSatStart('08:30');
      setModalSatEnd('13:00');
      setModalSatBreak(0);
      setModalSatTolerance(15);
    } else if (preset === 'half2') {
      setModalSatStart('09:00');
      setModalSatEnd('14:00');
      setModalSatBreak(0);
      setModalSatTolerance(15);
    } else if (preset === 'full') {
      setModalSatStart('08:30');
      setModalSatEnd('18:00');
      setModalSatBreak(60);
      setModalSatTolerance(15);
    }
  };

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
        saturdayConfig,
      });
    });
  }, [employees, selectedYear, selectedMonthIndex, companyShifts, shiftAssignments, vardiyaKayitlari, izinTalepleri, adminOverrides, saturdayConfig]);

  const filteredPuantaj = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allCalculatedPuantaj
      .filter((p) => {
        const emp = p.employee;
        const matchesSearch =
          !term ||
          emp.name.toLowerCase().includes(term) ||
          (emp.tcNo && emp.tcNo.includes(term)) ||
          (emp.department && emp.department.toLowerCase().includes(term)) ||
          (emp.position && emp.position.toLowerCase().includes(term));

        const matchesDept = selectedDepartment === 'all' || emp.department === selectedDepartment;

        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        const cmp = (a.employee.name || '').localeCompare(b.employee.name || '', 'tr');
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [allCalculatedPuantaj, searchTerm, selectedDepartment, sortOrder]);

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
      saturdayConfig,
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

  // Seçili Personel (Günlük Detay Görünümü İçin)
  const activeDailyEmployeeId = useMemo(() => {
    if (selectedDailyEmployeeId && (selectedDailyEmployeeId === 'all' || filteredPuantaj.some(p => p.employee.id === selectedDailyEmployeeId))) {
      return selectedDailyEmployeeId;
    }
    return filteredPuantaj[0]?.employee.id || '';
  }, [filteredPuantaj, selectedDailyEmployeeId]);

  const selectedPuantajRecord = useMemo(() => {
    return filteredPuantaj.find((p) => p.employee.id === activeDailyEmployeeId) || filteredPuantaj[0];
  }, [filteredPuantaj, activeDailyEmployeeId]);

  const currentDailyEmpIndex = useMemo(() => {
    return filteredPuantaj.findIndex((p) => p.employee.id === activeDailyEmployeeId);
  }, [filteredPuantaj, activeDailyEmployeeId]);

  const handlePrevEmployee = () => {
    if (currentDailyEmpIndex > 0) {
      setSelectedDailyEmployeeId(filteredPuantaj[currentDailyEmpIndex - 1].employee.id);
    }
  };

  const handleNextEmployee = () => {
    if (currentDailyEmpIndex < filteredPuantaj.length - 1 && currentDailyEmpIndex !== -1) {
      setSelectedDailyEmployeeId(filteredPuantaj[currentDailyEmpIndex + 1].employee.id);
    }
  };

  // Günlük Detaylı Döküm Öğeleri ve Çıktı Fonksiyonları
  const dailyFilteredItems: GunlukDetayliRaporItem[] = useMemo(() => {
    const list =
      activeDailyEmployeeId === 'all'
        ? filteredPuantaj
        : selectedPuantajRecord
        ? [selectedPuantajRecord]
        : [];

    return list.flatMap((p) =>
      p.gunler
        .filter((g) => selectedDayFilter === 'all' || g.gunNo === selectedDayFilter)
        .map((g) => ({
          employeeName: p.employee.name,
          tcNo: p.employee.tcNo,
          department: p.employee.department || 'Genel',
          tarih: g.tarih,
          gunAdi: g.gunAdi,
          shiftHours: `${p.shift.start_time} - ${p.shift.end_time}`,
          girisSaati: g.girisSaati,
          cikisSaati: g.cikisSaati,
          molaDk: g.molaDk,
          netSureSaat: g.netSureSaat,
          fazlaMesaiSaat: g.fazlaMesaiSaat,
          gecikmeDk: g.gecikmeDk,
          kod: g.kod,
          kodAciklama: g.kodAciklama,
        }))
    );
  }, [filteredPuantaj, activeDailyEmployeeId, selectedPuantajRecord, selectedDayFilter]);

  const handlePrintDailyPdf = () => {
    const periodStr =
      selectedDayFilter === 'all'
        ? `${AY_ADLARI[selectedMonthIndex]} ${selectedYear}`
        : `${selectedDayFilter} ${AY_ADLARI[selectedMonthIndex]} ${selectedYear}`;

    const filterTitle =
      activeDailyEmployeeId === 'all'
        ? (selectedDepartment === 'all' ? 'Tüm Departmanlar' : selectedDepartment)
        : `${selectedPuantajRecord?.employee.name} (${selectedPuantajRecord?.employee.department || 'Genel'})`;

    printGunlukDetayliRaporPdf({
      companyName: profile?.company_name || 'Humanius HRMS',
      periodStr,
      departmentFilter: filterTitle,
      items: dailyFilteredItems,
      preparedBy: profile?.full_name || 'İnsan Kaynakları & PDKS Sorumlusu',
    });
  };

  const handleExportDailyCsv = () => {
    const periodStr =
      selectedDayFilter === 'all'
        ? `${AY_ADLARI[selectedMonthIndex]}_${selectedYear}`
        : `${selectedDayFilter}_${AY_ADLARI[selectedMonthIndex]}_${selectedYear}`;

    const prefix =
      activeDailyEmployeeId === 'all'
        ? 'Toplu_Gunluk'
        : `${selectedPuantajRecord?.employee.name.replace(/\s+/g, '_') || 'Personel'}_Gunluk`;

    exportGunlukDetayliCsv(
      profile?.company_name || 'Humanius',
      `${prefix}_${periodStr}`,
      dailyFilteredItems
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
          {/* Cumartesi Çalışma Ayarı Butonu */}
          <button
            onClick={handleOpenSaturdayModal}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer border ${
              saturdayConfig.isSaturdayWork
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/20'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title="Cumartesi Çalışma Düzeni ve Mesai Saatlerini Ayarla"
          >
            <Calendar className={`w-4 h-4 ${saturdayConfig.isSaturdayWork ? 'text-amber-600' : 'text-gray-400'}`} />
            <div className="text-left leading-tight">
              <span className="block text-[9px] text-gray-400 font-semibold uppercase tracking-wider">Cumartesi</span>
              <span>
                {saturdayConfig.isSaturdayWork
                  ? `Çalışma Var (${saturdayConfig.startTime} - ${saturdayConfig.endTime})`
                  : 'Tatil (5 Günlük Düzen)'}
              </span>
            </div>
            {isManagement && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${saturdayConfig.isSaturdayWork ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-600'}`}>
                Ayarla
              </span>
            )}
          </button>

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

          {/* Alfabetik Sıralama Butonu */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
            title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>{sortOrder === 'asc' ? 'A → Z Sırala' : 'Z → A Sırala'}</span>
          </button>

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
          {saturdayConfig.isSaturdayWork ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px]">
              Cmt : Çalışma Var ({saturdayConfig.startTime} - {saturdayConfig.endTime})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold text-[11px]">
              AT : Akdi Tatil (Cmt)
            </span>
          )}
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
                  <th
                    onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="px-3 py-3 font-bold border-r border-gray-300 bg-gray-100 sticky left-0 z-30 min-w-[200px] cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Personel Bilgisi</span>
                      <span className="text-blue-600 font-bold text-xs">
                        {sortOrder === 'asc' ? '▲' : '▼'}
                      </span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                      </span>
                    </div>
                  </th>

                  {/* Gün Başlıkları (1 - 30/31) */}
                  {filteredPuantaj[0]?.gunler.map((g) => {
                    const bg = g.isPazar
                      ? 'bg-red-50 text-red-700'
                      : g.isCumartesi
                      ? (saturdayConfig.isSaturdayWork ? 'bg-amber-50 text-amber-900 border-amber-200 font-bold' : 'bg-slate-100 text-slate-700')
                      : g.isResmiTatil
                      ? 'bg-purple-50 text-purple-700'
                      : 'bg-gray-50 text-gray-700';

                    return (
                      <th
                        key={g.tarih}
                        className={`px-1 py-2 text-center border-r border-gray-200 min-w-[34px] ${bg}`}
                        title={`${g.tarih} ${g.gunAdi}${g.resmiTatilAdi ? ' - ' + g.resmiTatilAdi : ''}${g.isCumartesi && saturdayConfig.isSaturdayWork ? ' (Cumartesi Çalışması: ' + saturdayConfig.startTime + ' - ' + saturdayConfig.endTime + ')' : ''}`}
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
                        } else if (g.kod === '-') {
                          badgeStyle = 'bg-transparent text-gray-300 hover:bg-gray-100 font-normal';
                          displayVal = '-';
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

      {/* GÖRÜNÜM B: GÜNLÜK DETAYLI HAREKET LİSTESİ (PERSONEL BAZLI) */}
      {activeTab === 'daily' && (
        <div className="space-y-4">
          {/* PERSONEL VE GÜN SEÇİCİ KART */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Sol: Personel Seçici */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs">
                  <User className="w-4 h-4" />
                  <span>Personel:</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevEmployee}
                    disabled={currentDailyEmpIndex <= 0}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Önceki Personel"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={activeDailyEmployeeId}
                    onChange={(e) => setSelectedDailyEmployeeId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none bg-gray-50 focus:ring-2 focus:ring-blue-100 min-w-[240px]"
                  >
                    {filteredPuantaj.map((p) => (
                      <option key={p.employee.id} value={p.employee.id}>
                        {p.employee.name} ({p.employee.department || 'Genel'})
                      </option>
                    ))}
                    <option value="all">👥 Tüm Personelleri Göster (Toplu Liste)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleNextEmployee}
                    disabled={currentDailyEmpIndex >= filteredPuantaj.length - 1 || currentDailyEmpIndex === -1}
                    className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                    title="Sonraki Personel"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Gün Filtresi */}
                <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-gray-200">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">Filtre:</span>
                  <select
                    value={selectedDayFilter}
                    onChange={(e) => setSelectedDayFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none bg-gray-50"
                  >
                    <option value="all">Tüm Günler (Tüm Ay)</option>
                    {filteredPuantaj[0]?.gunler.map((g) => (
                      <option key={g.tarih} value={g.gunNo}>
                        {g.gunNo} {AY_ADLARI[selectedMonthIndex]} ({g.gunAdi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sağ: Çıktı Butonları */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 mr-1">
                  Kayıt: <strong>{dailyFilteredItems.length} Gün</strong>
                </span>
                <button
                  onClick={handlePrintDailyPdf}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Seçili Kayıtları PDF Olarak Yazdır"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>{activeDailyEmployeeId === 'all' ? 'Toplu Günlük PDF' : 'Personel Günlük PDF'}</span>
                </button>
                <button
                  onClick={handleExportDailyCsv}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Seçili Kayıtları Excel/CSV İndir"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel / CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* SEÇİLİ PERSONEL ÖZET BİLGİ KARTI */}
          {activeDailyEmployeeId !== 'all' && selectedPuantajRecord && (
            <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-white rounded-xl shadow-xs border border-blue-100 p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {selectedPuantajRecord.employee.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      {selectedPuantajRecord.employee.name}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {selectedPuantajRecord.employee.department || 'Genel'}
                      </span>
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{selectedPuantajRecord.employee.position || 'Personel'}</span>
                      {selectedPuantajRecord.employee.tcNo && (
                        <>
                          <span>•</span>
                          <span>TC: {selectedPuantajRecord.employee.tcNo}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono text-gray-600">Vardiya: {selectedPuantajRecord.shift.start_time} - {selectedPuantajRecord.shift.end_time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="bg-white border border-emerald-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Fiili Çalışma</div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      {selectedPuantajRecord.ozet.fiiliCalismaGun}g <span className="text-xs font-normal">({selectedPuantajRecord.ozet.fiiliCalismaSaat}s)</span>
                    </div>
                  </div>
                  <div className="bg-white border border-amber-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-amber-600 font-bold uppercase">Fazla Mesai</div>
                    <div className="text-sm font-extrabold text-amber-700">
                      +{selectedPuantajRecord.ozet.toplamFazlaMesaiSaat}s
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-blue-600 font-bold uppercase">Bordro Gün (30G)</div>
                    <div className="text-sm font-extrabold text-blue-700">
                      {selectedPuantajRecord.ozet.bordroGun} gün
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">İzin / Rapor</div>
                    <div className="text-sm font-extrabold text-gray-700">
                      {selectedPuantajRecord.ozet.ucretliIzinGun + selectedPuantajRecord.ozet.raporluGun} gün
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GÜNLÜK DÖKÜM TABLOSU */}
          <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase text-[10px] border-b border-gray-200">
                  <tr>
                    {activeDailyEmployeeId === 'all' && <th className="px-4 py-3">Personel</th>}
                    <th className="px-4 py-3">Tarih</th>
                    <th className="px-4 py-3 text-center">Vardiya</th>
                    <th className="px-4 py-3 text-center">İlk Giriş Saati</th>
                    <th className="px-4 py-3 text-center">Son Çıkış Saati</th>
                    <th className="px-4 py-3 text-center">Yasal Mola</th>
                    <th className="px-4 py-3 text-center bg-emerald-50 text-emerald-900">Net Fiili Süre</th>
                    <th className="px-4 py-3 text-center">Fazla Mesai</th>
                    <th className="px-4 py-3 text-center">Geç Kalma</th>
                    <th className="px-4 py-3 text-center">Puantaj Durumu</th>
                    <th className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyFilteredItems.map((item, idx) => {
                    const record = filteredPuantaj.find(p => p.employee.name === item.employeeName);
                    const dayObj = record?.gunler.find(g => g.tarih === item.tarih);

                    let badgeStyle = 'bg-gray-100 text-gray-600';
                    if (item.kod === 'Ç') badgeStyle = 'bg-emerald-100 text-emerald-800';
                    else if (item.kod === 'HT') badgeStyle = 'bg-blue-100 text-blue-800';
                    else if (item.kod === 'AT') badgeStyle = 'bg-slate-100 text-slate-700';
                    else if (item.kod === 'UBGT') badgeStyle = 'bg-purple-100 text-purple-800';
                    else if (item.kod === 'Yİ' || item.kod === 'Mİ') badgeStyle = 'bg-teal-100 text-teal-800';
                    else if (item.kod === 'R') badgeStyle = 'bg-amber-100 text-amber-800';
                    else if (item.kod === 'Üİ') badgeStyle = 'bg-orange-100 text-orange-800';
                    else if (item.kod === 'D') badgeStyle = 'bg-red-100 text-red-800';
                    else if (item.kod === '-') badgeStyle = 'bg-gray-50 text-gray-400 font-normal';

                    return (
                      <tr key={`${item.employeeName}_${item.tarih}_${idx}`} className="hover:bg-blue-50/30 transition-colors">
                        {activeDailyEmployeeId === 'all' && (
                          <td className="px-4 py-2.5 font-bold text-gray-900">
                            {item.employeeName}
                            <div className="text-[10px] text-gray-400 font-normal">{item.department}</div>
                          </td>
                        )}
                        <td className="px-4 py-2.5 font-mono text-gray-700 font-medium">
                          {item.tarih} <span className="text-[10px] text-gray-500 font-sans">({item.gunAdi})</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono text-gray-500 text-[11px]">
                          {item.shiftHours}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-blue-700">
                          {item.girisSaati || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-blue-700">
                          {item.cikisSaati || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500">
                          {item.molaDk} dk
                        </td>
                        <td className="px-4 py-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/20">
                          {item.netSureSaat > 0 ? `${item.netSureSaat} saat` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-600">
                          {item.fazlaMesaiSaat > 0 ? `+${item.fazlaMesaiSaat}s` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-rose-600">
                          {item.gecikmeDk > 0 ? `${item.gecikmeDk} dk` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${badgeStyle}`}>
                            {item.kod} - {item.kodAciklama}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {record && dayObj && (
                            <button
                              onClick={() => handleOpenEditCell(record, dayObj)}
                              className="p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-all cursor-pointer"
                              title="Kaydı Düzenle"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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

      {/* CUMARTESİ ÇALIŞMA DÜZENİ VE MESAİ AYARI MODALI */}
      {saturdayModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
            {/* Modal Başlık */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Cumartesi Çalışma Düzeni & Mesai Ayarı</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Haftalık çalışma düzenini ve Cumartesi mesai kurallarını belirleyin.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSaturdayModalOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Çalışma Düzeni Seçimi (5 Günlük vs 6 Günlük) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-gray-700 block">Haftalık Çalışma Sistemi:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 5 Günlük Seçenek */}
                <div
                  onClick={() => setModalIsSatWork(false)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    !modalIsSatWork
                      ? 'border-blue-500 bg-blue-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-gray-900">5 Günlük Düzen</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!modalIsSatWork ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                      {!modalIsSatWork && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">
                    Cumartesi <strong>Akdi Tatil (AT)</strong> sayılır. Cumartesi çalışıldığında tam mesai işlenir.
                  </p>
                </div>

                {/* 6 Günlük Seçenek */}
                <div
                  onClick={() => setModalIsSatWork(true)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    modalIsSatWork
                      ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-amber-950">6 Günlük Düzen</span>
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${modalIsSatWork ? 'border-amber-600 bg-amber-600' : 'border-gray-300'}`}>
                      {modalIsSatWork && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-snug">
                    Cumartesi <strong>Fiili Çalışma (Ç)</strong> günüdür. Gelmeyen personele Devamsız (D) yazılır.
                  </p>
                </div>
              </div>
            </div>

            {/* Cumartesi Çalışma Varsa Saat Ayarları */}
            {modalIsSatWork && (
              <div className="space-y-4 p-4 rounded-xl bg-amber-50/40 border border-amber-200/70">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Hızlı Çalışma Şablonları:</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applySaturdayPreset('half1')}
                      className={`p-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        modalSatStart === '08:30' && modalSatEnd === '13:00'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <div>08:30 - 13:00</div>
                      <div className="text-[10px] font-normal opacity-90">Yarım Gün (4.5s)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySaturdayPreset('half2')}
                      className={`p-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        modalSatStart === '09:00' && modalSatEnd === '14:00'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <div>09:00 - 14:00</div>
                      <div className="text-[10px] font-normal opacity-90">Yarım Gün (5.0s)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => applySaturdayPreset('full')}
                      className={`p-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        modalSatStart === '08:30' && modalSatEnd === '18:00'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                          : 'bg-white hover:bg-amber-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      <div>08:30 - 18:00</div>
                      <div className="text-[10px] font-normal opacity-90">Tam Gün (60dk Mola)</div>
                    </button>
                  </div>
                </div>

                {/* Detaylı Saat Girişleri */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-amber-200/50">
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Başlama:</label>
                    <input
                      type="time"
                      value={modalSatStart}
                      onChange={(e) => setModalSatStart(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white text-xs outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Bitiş:</label>
                    <input
                      type="time"
                      value={modalSatEnd}
                      onChange={(e) => setModalSatEnd(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white text-xs outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Mola (Dk):</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={modalSatBreak}
                      onChange={(e) => setModalSatBreak(Number(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white text-xs outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">Tolerans (Dk):</label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={modalSatTolerance}
                      onChange={(e) => setModalSatTolerance(Number(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white text-xs outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-100/60 p-2.5 rounded-lg">
                  <Info className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    Cumartesi mesai bitiş saatinden sonraki çalışmalar otomatik olarak <strong>Fazla Mesai (FM)</strong> sütununa eklenir.
                  </span>
                </div>
              </div>
            )}

            {/* Bilgi Kutusu */}
            <div className="text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Bu yapılandırma şirket veritabanına anında işlenir. Puantaj çizelgesi, günlük detaylar ve resmi PDF/Excel çıktıları bu ayarlara göre otomatik yeniden hesaplanır.
              </span>
            </div>

            {/* Alt Aksiyon Butonları */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSaturdayModalOpen(false)}
                disabled={isSavingSaturday}
                className="px-4 py-2 border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 text-xs cursor-pointer transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSaveSaturdayConfig}
                disabled={isSavingSaturday}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {satSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kaydedildi!</span>
                  </>
                ) : isSavingSaturday ? (
                  <span>Kaydediliyor...</span>
                ) : (
                  <span>Ayarları Kaydet</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuantajCetveli;
