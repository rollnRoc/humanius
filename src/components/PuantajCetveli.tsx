import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  ArrowUpDown,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { pdksService, VardiyaKaydi } from '../services/pdksService';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR, SaturdayWorkConfig, DEFAULT_SATURDAY_CONFIG } from '../services/shiftService';
import { leaveTypeService } from '../services/leaveTypeService';
import { izinService } from '../services/izinService';
import { IzinTuruKural } from './IzinTanimlari';
import { getCompanyIzinTurleri } from '../utils/izinCalculations';
import {
  hesaplaPersonelAylikPuantaj,
  PersonelAylikPuantaj,
  PuantajKodu,
  GunlukPuantajDetay,
  getCalismaSaati,
} from '../utils/puantajHesaplama';
import { getTodayYYYYMMDD } from '../utils/sanitize';

function puantajKoduToIzinTuru(kod: string, leaveTypes?: any[]): string {
  const clean = String(kod || '').trim().toUpperCase();
  if (clean === 'Yİ' || clean === 'YI') return 'yillik';
  if (clean === 'Mİ' || clean === 'MZ') return 'mazeret';
  if (clean === 'RP' || clean === 'R' || clean === 'HA') return 'hastalik';
  if (clean === 'Üİ' || clean === 'UC') return 'ucretsiz';
  if (clean === 'EV') return 'evlilik';
  if (clean === 'EG') return 'egitim';
  if (clean === 'DĞ') return 'dogum';
  if (clean === 'BB') return 'babalik';
  if (clean === 'OL') return 'olum';
  if (clean === 'ASK') return 'askerlik';

  if (leaveTypes && Array.isArray(leaveTypes)) {
    const matched = leaveTypes.find(
      (lt) => lt.kod?.toUpperCase() === clean || lt.id?.toLowerCase() === clean.toLowerCase()
    );
    if (matched) return matched.id;
  }
  return clean.toLowerCase();
}

function isLeavePuantajKod(kod: string, leaveTypes?: any[]): boolean {
  const clean = String(kod || '').trim().toUpperCase();
  const known = ['Yİ', 'YI', 'Mİ', 'MZ', 'RP', 'R', 'HA', 'Üİ', 'UC', 'EV', 'EG', 'DĞ', 'BB', 'OL', 'ASK'];
  if (known.includes(clean)) return true;
  if (leaveTypes && Array.isArray(leaveTypes)) {
    return leaveTypes.some((lt) => lt.kod?.toUpperCase() === clean || lt.id?.toUpperCase() === clean);
  }
  return false;
}
import {
  printPuantajCetveliPdf,
  exportPuantajExcel,
  exportPuantajCsv,
  printGunlukDetayliRaporPdf,
  exportGunlukDetayliExcel,
  exportGunlukDetayliCsv,
  GunlukDetayliRaporItem,
} from '../utils/puantajPdf';
import PuantajExportModal from './PuantajExportModal';

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
  const [showPuantajExportModal, setShowPuantajExportModal] = useState(false);

  // Filtreler
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');
  const [selectedDailyEmployeeId, setSelectedDailyEmployeeId] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  type PuantajSortField = 'name' | 'department' | 'fiili' | 'ht' | 'yillik' | 'ucretsiz' | 'rapor' | 'devamsiz' | 'bordro' | 'fm';
  const [matrixSortField, setMatrixSortField] = useState<PuantajSortField>('name');
  const [matrixSortOrder, setMatrixSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleMatrixSort = (field: PuantajSortField) => {
    if (matrixSortField === field) {
      setMatrixSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setMatrixSortField(field);
      setMatrixSortOrder('asc');
    }
  };

  type DailySortField = 'employeeName' | 'tarih' | 'shiftHours' | 'girisSaati' | 'cikisSaati' | 'molaDk' | 'netSureSaat' | 'fazlaMesaiSaat' | 'gecikmeDk' | 'kod';
  const [dailySortField, setDailySortField] = useState<DailySortField>('tarih');
  const [dailySortOrder, setDailySortOrder] = useState<'asc' | 'desc'>('asc');

  const handleDailySort = (field: DailySortField) => {
    if (dailySortField === field) {
      setDailySortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDailySortField(field);
      setDailySortOrder('asc');
    }
  };

  // Veri Durumları
  const [vardiyaKayitlari, setVardiyaKayitlari] = useState<VardiyaKaydi[]>([]);
  const [companyShifts, setCompanyShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [shiftAssignments, setShiftAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cumartesi Çalışma Yapılandırması
  const [saturdayConfig, setSaturdayConfig] = useState<SaturdayWorkConfig>(DEFAULT_SATURDAY_CONFIG);

  // Çıktı Al Dropdown Menüsü
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tanımlı Şirket İzin Türleri
  const [leaveTypes, setLeaveTypes] = useState<IzinTuruKural[]>(() => {
    const compId = profile?.company_id || employees[0]?.company_id;
    return getCompanyIzinTurleri(compId) as any[];
  });

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
      // Canlı veritabanı (pdks_vardiya_kayitlari) temel alındığından adminOverrides temiz başlatılır
      setAdminOverrides({});

      const targetCompanyId = profile?.company_id || employees[0]?.company_id || undefined;
      const [fetchedVardiyalar, fetchedShifts, fetchedAssignments, fetchedSaturday, fetchedLeaveTypes] = await Promise.all([
        pdksService.getVardiyalar(targetCompanyId),
        shiftService.getShifts(targetCompanyId),
        shiftService.getAssignments(targetCompanyId),
        shiftService.getSaturdayConfig(targetCompanyId),
        leaveTypeService.getLeaveTypes(targetCompanyId),
      ]);
      setVardiyaKayitlari(fetchedVardiyalar);
      setCompanyShifts(fetchedShifts.length > 0 ? fetchedShifts : VARSAYILAN_VARDIYALAR);
      setShiftAssignments(fetchedAssignments);
      setSaturdayConfig(fetchedSaturday);
      if (fetchedLeaveTypes && fetchedLeaveTypes.length > 0) {
        setLeaveTypes(fetchedLeaveTypes);
      }
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
    window.addEventListener('humanius_puantaj_updated', handleUpdate);
    window.addEventListener('humanius_saturday_updated', handleUpdate);
    window.addEventListener('humanius_izin_turleri_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadPuantajData();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('humanius_shifts_updated', handleUpdate);
      window.removeEventListener('humanius_puantaj_updated', handleUpdate);
      window.removeEventListener('humanius_saturday_updated', handleUpdate);
      window.removeEventListener('humanius_izin_turleri_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [profile?.company_id, employees]);



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
        allShifts: companyShifts,
        vardiyaKayitlari,
        izinTalepleri,
        adminOverrides,
        saturdayConfig,
        leaveTypes,
      });
    });
  }, [employees, selectedYear, selectedMonthIndex, companyShifts, shiftAssignments, vardiyaKayitlari, izinTalepleri, adminOverrides, saturdayConfig, leaveTypes]);

  const filteredPuantaj = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allCalculatedPuantaj
      .filter((p) => {
        const emp = p?.employee;
        if (!emp) return false;
        const empName = (emp.name || '').toLowerCase();
        const empTc = String(emp.tc_no || (emp as any).tcNo || '');
        const empDept = (emp.department || '').toLowerCase();
        const empPos = (emp.position || '').toLowerCase();

        const matchesSearch =
          !term ||
          empName.includes(term) ||
          empTc.includes(term) ||
          empDept.includes(term) ||
          empPos.includes(term);

        const matchesDept = selectedDepartment === 'all' || (emp.department || '') === selectedDepartment;

        return matchesSearch && matchesDept;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (matrixSortField) {
          case 'name':
            cmp = (a.employee?.name || '').localeCompare(b.employee?.name || '', 'tr');
            break;
          case 'department':
            cmp = (a.employee?.department || 'Genel').localeCompare(b.employee?.department || 'Genel', 'tr');
            break;
          case 'fiili':
            cmp = (a.ozet?.fiiliCalismaSaat || 0) - (b.ozet?.fiiliCalismaSaat || 0);
            break;
          case 'ht':
            cmp = (a.ozet?.haftaTatiliGun || 0) - (b.ozet?.haftaTatiliGun || 0);
            break;
          case 'yillik':
            cmp = (a.ozet?.yillikIzinGun || 0) - (b.ozet?.yillikIzinGun || 0);
            break;
          case 'ucretsiz':
            cmp = (a.ozet?.ucretsizIzinGun || 0) - (b.ozet?.ucretsizIzinGun || 0);
            break;
          case 'rapor':
            cmp = (a.ozet?.raporluGun || 0) - (b.ozet?.raporluGun || 0);
            break;
          case 'devamsiz':
            cmp = (a.ozet?.devamsizGun || 0) - (b.ozet?.devamsizGun || 0);
            break;
          case 'bordro':
            cmp = (a.ozet?.bordroGun || 0) - (b.ozet?.bordroGun || 0);
            break;
          case 'fm':
            cmp = (a.ozet?.toplamFazlaMesaiSaat || 0) - (b.ozet?.toplamFazlaMesaiSaat || 0);
            break;
          default:
            cmp = (a.employee?.name || '').localeCompare(b.employee?.name || '', 'tr');
        }
        return matrixSortOrder === 'asc' ? cmp : -cmp;
      });
  }, [allCalculatedPuantaj, searchTerm, selectedDepartment, matrixSortField, matrixSortOrder]);

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
    const totalIzinliRaporlu = filteredPuantaj.reduce((acc, p) => acc + (p.ozet.toplamIzinGun || p.ozet.yillikIzinGun + p.ozet.ucretliIzinGun) + p.ozet.raporluGun, 0);
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

  // Düzenlenen hücrede onaylı izin talebi var mı?
  const editActiveLeave = useMemo(() => {
    if (!editTarget) return null;
    const { employee, gun } = editTarget;
    return (izinTalepleri || []).find((t) => {
      const tEmpId = t.employeeId || t.employee_id;
      if (!tEmpId || tEmpId !== employee.id) return false;
      const tDurum = String(t.durum || '').toLowerCase();
      if (!['onaylandi', 'onaylandı', 'ik onayladı', 'yönetici onayladı'].includes(tDurum)) return false;
      const s = (t.baslangicTarihi || t.baslangic_tarihi || '').split('T')[0];
      const e = (t.bitisTarihi || t.bitis_tarihi || '').split('T')[0];
      return Boolean(s && e && gun.tarih >= s && gun.tarih <= e);
    });
  }, [editTarget, izinTalepleri]);

  const isEditCellLeave = useMemo(() => {
    if (!editTarget) return false;
    return Boolean(editActiveLeave) || isLeavePuantajKod(editTarget.gun.kod, leaveTypes);
  }, [editTarget, editActiveLeave, leaveTypes]);

  // Hücre Düzenleme Aç
  const handleOpenEditCell = (rec: PersonelAylikPuantaj, gun: GunlukPuantajDetay) => {
    if (!isManagement) return;
    setEditTarget({ employee: rec.employee, gun });
    setEditKod(gun.kod);
    setEditGiris(gun.girisSaati || '08:30');
    setEditCikis(gun.cikisSaati || '');
    setEditNotlar(gun.notlar || '');
    setEditModalOpen(true);
  };

  // İzni Kaldır (İzin kaydını sil/böl, yıllık izni tekrar hesapla ve otomatik güne dön)
  const handleRemoveLeaveFromCell = async () => {
    if (!editTarget) return;
    const { employee, gun } = editTarget;
    const targetCompId = employee.company_id || profile?.company_id || 'default';

    try {
      // 1. İzin talebini sil veya böl (yıllık izinse otomatik bakiye hesaplar)
      await izinService.removeOrSplitLeaveDate(employee.id, gun.tarih, targetCompId);

      // 2. pdks_vardiya_kayitlari tablosundaki bu tarihe ait kaydı sil
      const existing = vardiyaKayitlari.find(
        (v) => (v.employee_id === employee.id || (v as any).employeeId === employee.id) && v.tarih === gun.tarih
      );
      if (existing?.id) {
        await pdksService.deleteVardiya(existing.id);
      }

      // 3. Local override varsa temizle
      const overrideKey = `${employee.id}_${gun.tarih}`;
      setAdminOverrides((prev) => {
        const next = { ...prev };
        delete next[overrideKey];
        return next;
      });

      // 4. Personelin yıllık izin bakiyesini doğrula
      await izinService.recalculateEmployeeAnnualLeave(employee.id, targetCompId);

      // 5. Olayları tetikle ve verileri yenile
      window.dispatchEvent(new CustomEvent('humanius_izin_updated', { detail: { employeeId: employee.id } }));
      window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
      window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));

      setEditModalOpen(false);
      await loadPuantajData();
    } catch (err) {
      console.error('İzin kaldırma hatası:', err);
      alert('İzin kaldırılırken bir hata oluştu.');
    }
  };

  // Hücre Düzenleme Kaydet
  const handleSaveCellEdit = async () => {
    if (!editTarget) return;
    const { employee, gun } = editTarget;
    const overrideKey = `${employee.id}_${gun.tarih}`;
    const targetCompId = employee.company_id || profile?.company_id || 'default';
    const matchedCustom = leaveTypes.find((lt) => lt.kod === editKod || lt.id === editKod);
    const customDesc = matchedCustom?.ad;
    const cleanGiris = editGiris && editGiris.trim() !== '-' && editGiris.trim() !== '' ? editGiris.trim() : null;
    const cleanCikis = editCikis && editCikis.trim() !== '-' && editCikis.trim() !== '' ? editCikis.trim() : null;

    const isPrevLeave = Boolean(editActiveLeave) || isLeavePuantajKod(gun.kod, leaveTypes);
    const isNewLeave = isLeavePuantajKod(editKod, leaveTypes);

    const isPastDay = gun.tarih < getTodayYYYYMMDD();
    const effectiveGiris = cleanGiris || '08:30';
    const effectiveCikis = cleanCikis || (isPastDay ? '18:00' : null);

    const newOverride = {
      kod: editKod,
      giris: editKod === 'Ç' ? effectiveGiris : '-',
      cikis: editKod === 'Ç' ? (effectiveCikis || '-') : '-',
      notlar: editNotlar || undefined,
      kodAciklama:
        editKod === 'Ç'
          ? (effectiveCikis ? `Fiili Çalışma (${effectiveGiris}-${effectiveCikis})` : `Vardiyası Devam Ediyor (Giriş: ${effectiveGiris})`)
          : editKod === 'Yİ' || editKod === 'YI'
          ? 'Yıllık Ücretli İzin'
          : editKod === 'EG'
          ? 'Eğitim İzni'
          : editKod === 'Mİ' || editKod === 'MZ'
          ? 'Mazeret İzni'
          : editKod === 'R' || editKod === 'HA' || editKod === 'RP'
          ? 'İstirahat (SGK Raporu)'
          : editKod === 'Üİ' || editKod === 'UC'
          ? 'Ücretsiz İzin'
          : editKod === 'HT'
          ? 'Hafta Tatili'
          : editKod === 'AT'
          ? 'Akdi Tatil'
          : editKod === 'UBGT'
          ? 'Resmi Tatil'
          : editKod === 'D'
          ? 'Devamsız'
          : customDesc || 'Özel İzin',
    };

    const nextOverrides = { ...adminOverrides, [overrideKey]: newOverride };
    setAdminOverrides(nextOverrides);

    try {
      if (editKod === 'Ç') {
        // İzinli günden fiili çalışmaya dönüldü: Onaylı izni kaldır/böl
        if (isPrevLeave) {
          await izinService.removeOrSplitLeaveDate(employee.id, gun.tarih, targetCompId);
        }

        const notlarText = `[PUANTAJ:Ç] Fiili Çalışma (${effectiveGiris}-${effectiveCikis || 'Devam'}) ${editNotlar ? '- ' + editNotlar : ''}`.trim();
        await pdksService.createVardiya({
          company_id: targetCompId,
          employee_id: employee.id,
          tarih: gun.tarih,
          vardiya_tipi: 'tam-gun',
          giris_saati: effectiveGiris,
          cikis_saati: effectiveCikis,
          durum: 'zamaninda',
          notlar: notlarText,
        });
      } else if (isNewLeave) {
        // Yeni bir izin kodu seçildi (Yİ, Mİ, RP, Üİ vb.)
        const newLeaveType = puantajKoduToIzinTuru(editKod, leaveTypes);

        // Önceki izin varsa temizle/böl (yıllık izin ise bakiyesi iade edilir)
        if (isPrevLeave) {
          await izinService.removeOrSplitLeaveDate(employee.id, gun.tarih, targetCompId);
        }

        // Yeni onaylı izin talebini oluştur (yıllık ise bakiyesi otomatik düşülür)
        await izinService.addApprovedLeaveFromPuantaj({
          employeeId: employee.id,
          companyId: targetCompId,
          date: gun.tarih,
          leaveType: newLeaveType,
          aciklama: `Puantaj Düzenleme (${editKod}) ${editNotlar ? '- ' + editNotlar : ''}`.trim(),
        });

        const kodAciklama = editKod === 'Yİ' ? 'Yıllık Ücretli İzin' : (customDesc || 'İzinli');
        const notlarText = `[PUANTAJ:${editKod}] ${kodAciklama} ${editNotlar ? '- ' + editNotlar : ''}`.trim();
        await pdksService.createVardiya({
          company_id: targetCompId,
          employee_id: employee.id,
          tarih: gun.tarih,
          vardiya_tipi: 'tam-gun',
          giris_saati: null,
          cikis_saati: null,
          durum: 'izinli',
          notlar: notlarText,
        });
      } else {
        // HT, AT, UBGT, D vb. kodlar
        if (isPrevLeave) {
          await izinService.removeOrSplitLeaveDate(employee.id, gun.tarih, targetCompId);
        }

        const kodAciklama = editKod === 'HT' ? 'Hafta Tatili' : (editKod === 'AT' ? 'Akdi Tatil' : (editKod === 'UBGT' ? 'Resmi Tatil' : 'Devamsız'));
        const notlarText = `[PUANTAJ:${editKod}] ${kodAciklama} ${editNotlar ? '- ' + editNotlar : ''}`.trim();
        await pdksService.createVardiya({
          company_id: targetCompId,
          employee_id: employee.id,
          tarih: gun.tarih,
          vardiya_tipi: 'tam-gun',
          giris_saati: null,
          cikis_saati: null,
          durum: editKod === 'D' ? 'gelmedi' : 'izinli',
          notlar: notlarText,
        });
      }

      // Personelin yıllık izin bakiyesini her durumda garantilemek için yeniden hesapla
      await izinService.recalculateEmployeeAnnualLeave(employee.id, targetCompId);
    } catch (err) {
      console.warn('Puantaj hücre kaydı güncelleme hatası:', err);
    }

    setEditModalOpen(false);
    window.dispatchEvent(new CustomEvent('humanius_izin_updated', { detail: { employeeId: employee.id } }));
    window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
    window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
    await loadPuantajData();
  };

  // Manuel Düzeltmeyi Kaldır (Otomatik Hesaplamaya Dön)
  const handleClearCellEdit = async () => {
    if (!editTarget) return;
    const { employee, gun } = editTarget;
    const overrideKey = `${employee.id}_${gun.tarih}`;
    const nextOverrides = { ...adminOverrides };
    delete nextOverrides[overrideKey];
    setAdminOverrides(nextOverrides);

    // Veritabanındaki puantaj kaydını sil
    try {
      const existing = vardiyaKayitlari.find(
        (v) => (v.employee_id === employee.id || (v as any).employeeId === employee.id) && v.tarih === gun.tarih
      );
      if (existing) {
        await pdksService.deleteVardiya(existing.id);
      }
    } catch (e) {
      console.warn('Puantaj hücre kaydı silinirken hata:', e);
    }

    setEditModalOpen(false);
    window.dispatchEvent(new CustomEvent('humanius_shifts_updated'));
    window.dispatchEvent(new CustomEvent('humanius_puantaj_updated'));
    await loadPuantajData();
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

  const handleExportExcel = () => {
    setShowPuantajExportModal(true);
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
    if (selectedDailyEmployeeId && (selectedDailyEmployeeId === 'all' || filteredPuantaj.some(p => p.employee?.id === selectedDailyEmployeeId))) {
      return selectedDailyEmployeeId;
    }
    return filteredPuantaj[0]?.employee?.id || '';
  }, [filteredPuantaj, selectedDailyEmployeeId]);

  const selectedPuantajRecord = useMemo(() => {
    return filteredPuantaj.find((p) => p.employee?.id === activeDailyEmployeeId) || filteredPuantaj[0];
  }, [filteredPuantaj, activeDailyEmployeeId]);

  const currentDailyEmpIndex = useMemo(() => {
    return filteredPuantaj.findIndex((p) => p.employee?.id === activeDailyEmployeeId);
  }, [filteredPuantaj, activeDailyEmployeeId]);

  const handlePrevEmployee = () => {
    if (currentDailyEmpIndex > 0 && filteredPuantaj[currentDailyEmpIndex - 1]?.employee?.id) {
      setSelectedDailyEmployeeId(filteredPuantaj[currentDailyEmpIndex - 1].employee.id);
    }
  };

  const handleNextEmployee = () => {
    if (currentDailyEmpIndex < filteredPuantaj.length - 1 && currentDailyEmpIndex !== -1 && filteredPuantaj[currentDailyEmpIndex + 1]?.employee?.id) {
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

    return list.flatMap((p) => {
      if (!p || !p.gunler) return [];
      const emp = p.employee || ({} as any);
      const shiftStart = p.shift?.start_time || '08:30';
      const shiftEnd = p.shift?.end_time || '18:00';
      const shiftHours = `${shiftStart} - ${shiftEnd}`;

      return p.gunler
        .filter((g) => selectedDayFilter === 'all' || g.gunNo === selectedDayFilter)
        .map((g) => ({
          employeeName: emp.name || 'İsimsiz Personel',
          tcNo: emp.tc_no || emp.tcNo || '',
          sicilNo: emp.sicil_no || emp.sicilNo || '',
          isYeriSgkSicilNo: emp.is_yeri_sgk_sicil_no || emp.isYeriSgkSicilNo || '',
          department: emp.department || 'Genel',
          tarih: g.tarih,
          gunAdi: g.gunAdi,
          shiftHours,
          girisSaati: g.girisSaati,
          cikisSaati: g.cikisSaati,
          molaDk: g.molaDk || 0,
          netSureSaat: g.netSureSaat || 0,
          fazlaMesaiSaat: g.fazlaMesaiSaat || 0,
          gecikmeDk: g.gecikmeDk || 0,
          kod: g.kod,
          kodAciklama: g.kodAciklama || '',
          isOngoing: g.isOngoing,
        }));
    }).sort((a, b) => {
      let cmp = 0;
      switch (dailySortField) {
        case 'employeeName':
          cmp = (a.employeeName || '').localeCompare(b.employeeName || '', 'tr');
          break;
        case 'tarih':
          cmp = (a.tarih || '').localeCompare(b.tarih || '');
          break;
        case 'shiftHours':
          cmp = (a.shiftHours || '').localeCompare(b.shiftHours || '');
          break;
        case 'girisSaati':
          cmp = (a.girisSaati || '').localeCompare(b.girisSaati || '');
          break;
        case 'cikisSaati':
          cmp = (a.cikisSaati || '').localeCompare(b.cikisSaati || '');
          break;
        case 'molaDk':
          cmp = (a.molaDk || 0) - (b.molaDk || 0);
          break;
        case 'netSureSaat':
          cmp = (a.netSureSaat || 0) - (b.netSureSaat || 0);
          break;
        case 'fazlaMesaiSaat':
          cmp = (a.fazlaMesaiSaat || 0) - (b.fazlaMesaiSaat || 0);
          break;
        case 'gecikmeDk':
          cmp = (a.gecikmeDk || 0) - (b.gecikmeDk || 0);
          break;
        case 'kod':
          cmp = (a.kod || '').localeCompare(b.kod || '', 'tr');
          break;
        default:
          cmp = (a.tarih || '').localeCompare(b.tarih || '');
      }
      return dailySortOrder === 'asc' ? cmp : -cmp;
    });
  }, [filteredPuantaj, activeDailyEmployeeId, selectedPuantajRecord, selectedDayFilter, dailySortField, dailySortOrder]);

  const handlePrintDailyPdf = () => {
    const periodStr =
      selectedDayFilter === 'all'
        ? `${AY_ADLARI[selectedMonthIndex]} ${selectedYear}`
        : `${selectedDayFilter} ${AY_ADLARI[selectedMonthIndex]} ${selectedYear}`;

    const filterTitle =
      activeDailyEmployeeId === 'all'
        ? (selectedDepartment === 'all' ? 'Tüm Departmanlar' : selectedDepartment)
        : `${selectedPuantajRecord?.employee?.name || 'Personel'} (${selectedPuantajRecord?.employee?.department || 'Genel'})`;

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
        : `${(selectedPuantajRecord?.employee?.name || 'Personel').replace(/\s+/g, '_')}_Gunluk`;

    exportGunlukDetayliCsv(
      profile?.company_name || 'Humanius',
      `${prefix}_${periodStr}`,
      dailyFilteredItems
    );
  };

  const handleExportDailyExcel = () => {
    setShowPuantajExportModal(true);
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

          {/* Çıktı Al Dropdown Menüsü */}
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setExportDropdownOpen(prev => !prev)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Puantaj Cetveli Çıktı ve Dışa Aktarma Seçenekleri"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Çıktı Al</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-30 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setExportDropdownOpen(false);
                    handlePrintPdf();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Resmi Puantaj (PDF)</div>
                    <div className="text-[10px] text-gray-400">A4 Yatay İmzalı Belge</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setExportDropdownOpen(false);
                    handleExportExcel();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Excel İndir (.xlsx)</div>
                    <div className="text-[10px] text-gray-400">Bordro & Muhasebe Uyumlu</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setExportDropdownOpen(false);
                    handleExportCsv();
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-xs font-semibold text-gray-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                    <Download className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">CSV İndir (.csv)</div>
                    <div className="text-[10px] text-gray-400">Virgülle Ayrılmış Metin</div>
                  </div>
                </button>
              </div>
            )}
          </div>
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]" title="Fiili çalışma olan günlerde hücrede net çalışma saati (örn: 8.5s) gösterilir">
            Sayı / Ç : Fiili Çalışma (Saat)
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-700 text-white font-extrabold text-[11px] shadow-2xs" title="Yıllık Ücretli İzin">
            Yİ : Yıllık İzin
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-800 text-white font-extrabold text-[11px] shadow-2xs" title="Evlilik İzni">
            EV : Evlilik İzni
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-orange-700 text-white font-extrabold text-[11px] shadow-2xs" title="Mazeret İzni">
            Mİ : Mazeret İzni
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-600 text-white font-extrabold text-[11px] shadow-2xs" title="Eğitim İzni">
            EG : Eğitim İzni
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[11px]">
            RP / R : SGK Raporu
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 font-bold text-[11px]">
            Üİ : Ücretsiz İzin
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[11px]">
            D : Devamsız
          </span>
          {leaveTypes
            .filter((lt) => !['yillik', 'mazeret', 'hastalik', 'ucretsiz', 'evlilik'].includes(lt.id) && lt.kod !== 'YI' && lt.kod !== 'MZ' && lt.kod !== 'HA' && lt.kod !== 'UC' && lt.kod !== 'EV')
            .map((lt) => (
              <span
                key={lt.id}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-600 text-white font-bold text-[11px] shadow-2xs"
                title={lt.aciklama || lt.ad}
              >
                {lt.kod} : {lt.ad}
              </span>
            ))}
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
                    onClick={() => handleMatrixSort('name')}
                    className="px-3 py-3 font-bold border-r border-gray-300 bg-gray-100 sticky left-0 z-30 min-w-[200px] cursor-pointer hover:bg-gray-200 transition-colors select-none"
                    title={matrixSortField === 'name' && matrixSortOrder === 'asc' ? 'Z → A Sırala' : 'A → Z Sırala'}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Personel Bilgisi</span>
                      {matrixSortField === 'name' ? (
                        <>
                          <span className="text-blue-600 font-bold text-xs">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                          <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {matrixSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-300 text-xs">↕</span>
                      )}
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
                        title={`${g.tarih} ${g.gunAdi}${g.resmiTatilAdi ? ' - ' + g.resmiTatilAdi : ''}${g.isCumartesi && saturdayConfig.isSaturdayWork ? ' (6 Günlük Düzen: Cumartesi Çalışması)' : ''}`}
                      >
                        <div className="font-extrabold text-[11px]">{g.gunNo}</div>
                        <div className="text-[9px] font-normal opacity-80">{g.gunAdi}</div>
                      </th>
                    );
                  })}

                  {/* Sağ Özet Sütunları */}
                  <th
                    onClick={() => handleMatrixSort('fiili')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-emerald-50 text-emerald-800 font-bold min-w-[65px] cursor-pointer hover:bg-emerald-100 transition-colors select-none"
                    title="Fiili Çalışılan Gün/Saat Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Fiili Gün/Saat</span>
                      {matrixSortField === 'fiili' ? (
                        <span className="text-emerald-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('ht')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-blue-50 text-blue-800 font-bold min-w-[40px] cursor-pointer hover:bg-blue-100 transition-colors select-none"
                    title="Hafta Tatili Gün Sayısı Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>HT</span>
                      {matrixSortField === 'ht' ? (
                        <span className="text-blue-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('yillik')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-rose-50 text-rose-900 font-extrabold min-w-[48px] cursor-pointer hover:bg-rose-100 transition-colors select-none"
                    title="Yıllık Ücretli İzin Gün Sayısı Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Yıllık İzin</span>
                      {matrixSortField === 'yillik' ? (
                        <span className="text-rose-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('ucretsiz')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-orange-50 text-orange-800 font-bold min-w-[48px] cursor-pointer hover:bg-orange-100 transition-colors select-none"
                    title="Ücretsiz İzin Gün Sayısı Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Ücr. İzin</span>
                      {matrixSortField === 'ucretsiz' ? (
                        <span className="text-orange-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('rapor')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-amber-50 text-amber-800 font-bold min-w-[40px] cursor-pointer hover:bg-amber-100 transition-colors select-none"
                    title="SGK İstirahat Raporlu Gün Sayısı Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Rap.</span>
                      {matrixSortField === 'rapor' ? (
                        <span className="text-amber-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('devamsiz')}
                    className="px-2 py-3 text-center border-r border-gray-200 bg-red-50 text-red-800 font-bold min-w-[40px] cursor-pointer hover:bg-red-100 transition-colors select-none"
                    title="Mazeretsiz Devamsız Gün Sayısı Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Dev.</span>
                      {matrixSortField === 'devamsiz' ? (
                        <span className="text-red-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('bordro')}
                    className="px-2 py-3 text-center border-r border-gray-300 bg-blue-600 text-white font-extrabold min-w-[65px] cursor-pointer hover:bg-blue-700 transition-colors select-none"
                    title="Bordro Günü (30G) Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Bordro (30G)</span>
                      {matrixSortField === 'bordro' ? (
                        <span className="text-white font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-blue-200 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleMatrixSort('fm')}
                    className="px-2 py-3 text-center bg-amber-50 text-amber-800 font-bold min-w-[55px] cursor-pointer hover:bg-amber-100 transition-colors select-none"
                    title="Toplam Fazla Mesai Saati Sırala"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>FM Saat</span>
                      {matrixSortField === 'fm' ? (
                        <span className="text-amber-700 font-bold text-[10px]">{matrixSortOrder === 'asc' ? '▲' : '▼'}</span>
                      ) : (
                        <span className="text-gray-300 text-[10px]">↕</span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPuantaj.map((p) => {
                  const emp = p?.employee;
                  const ozet = p?.ozet || ({} as any);
                  const empId = emp?.id || `emp-${Math.random()}`;

                  return (
                    <tr key={empId} className="hover:bg-blue-50/40 transition-colors">
                      {/* Sticky Personel Adı */}
                      <td className="px-3 py-2.5 border-r border-gray-200 bg-white sticky left-0 z-10 font-medium">
                        <div className="font-bold text-gray-900 leading-tight">{emp?.name || 'İsimsiz'}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span>{emp?.department || 'Genel'}</span>
                          <span>•</span>
                          <span>{emp?.position || '-'}</span>
                        </div>
                      </td>

                      {/* Günlük Hücreler */}
                      {p.gunler.map((g) => {
                        let cellBg = 'bg-white';
                        let badgeStyle = 'bg-gray-100 text-gray-600 border border-gray-200';
                        let displayVal = g.kod;

                        if (g.kod === 'Ç') {
                          if (g.isOngoing) {
                            badgeStyle = 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-300 font-bold';
                            displayVal = 'Devam';
                          } else {
                            badgeStyle = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-200 font-bold';
                            const hours = getCalismaSaati(g, p.shift, saturdayConfig);
                            displayVal = hours > 0 && hours < 0.1 ? `${Math.max(1, Math.round(hours * 60))}dk` : `${hours}s`;
                          }
                        } else if (g.kod === 'HT') {
                          badgeStyle = 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200 font-bold';
                        } else if (g.kod === 'AT') {
                          badgeStyle = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-bold';
                        } else if (g.kod === 'UBGT') {
                          badgeStyle = 'bg-purple-100 text-purple-800 hover:bg-purple-200 border border-purple-200 font-bold';
                        } else if (g.kod === 'Yİ' || g.kod === 'YI') {
                          badgeStyle = 'bg-rose-700 text-white hover:bg-rose-600 border border-rose-800 font-extrabold shadow-2xs';
                        } else if (g.kod === 'EV') {
                          badgeStyle = 'bg-amber-800 text-white hover:bg-amber-700 border border-amber-900 font-extrabold shadow-2xs';
                        } else if (g.kod === 'Mİ' || g.kod === 'MZ') {
                          badgeStyle = 'bg-orange-700 text-white hover:bg-orange-600 border border-orange-800 font-extrabold shadow-2xs';
                        } else if (g.kod === 'EG') {
                          badgeStyle = 'bg-slate-600 text-white hover:bg-slate-500 border border-slate-700 font-extrabold shadow-2xs';
                        } else if (g.kod === 'DO') {
                          badgeStyle = 'bg-pink-700 text-white hover:bg-pink-600 border border-pink-800 font-extrabold shadow-2xs';
                        } else if (g.kod === 'OL') {
                          badgeStyle = 'bg-stone-600 text-white hover:bg-stone-500 border border-stone-700 font-extrabold shadow-2xs';
                        } else if (g.kod === 'BA') {
                          badgeStyle = 'bg-amber-600 text-white hover:bg-amber-500 border border-amber-700 font-bold';
                        } else if (g.kod === 'R' || g.kod === 'HA' || g.kod === 'RP') {
                          badgeStyle = 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300 font-bold';
                        } else if (g.kod === 'Üİ' || g.kod === 'UC') {
                          badgeStyle = 'bg-orange-100 text-orange-900 hover:bg-orange-200 border border-orange-300 font-bold';
                        } else if (g.kod === 'D') {
                          badgeStyle = 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-200 font-bold';
                        } else if (g.kod === '-') {
                          badgeStyle = 'bg-transparent text-gray-300 hover:bg-gray-100 font-normal';
                          displayVal = '-';
                        } else {
                          // Dinamik / özel izin kodu
                          badgeStyle = 'bg-slate-600 text-white hover:bg-slate-500 border border-slate-700 font-extrabold';
                        }

                        if (g.isPazar) cellBg = 'bg-red-50/20';
                        if (g.isCumartesi) cellBg = 'bg-slate-50/40';

                        return (
                          <td
                            key={g.tarih}
                            onClick={() => handleOpenEditCell(p, g)}
                            className={`px-0.5 py-1 text-center border-r border-gray-100 ${cellBg} cursor-pointer transition-all hover:ring-1 hover:ring-blue-400`}
                            title={`${emp.name} - ${g.tarih} (${g.gunAdi})\nDurum: ${g.kodAciklama}\nGiriş: ${g.girisSaati || '-'}\nÇıkış: ${g.cikisSaati || (g.isOngoing ? 'Vardiyası Devam Ediyor' : '-')}\nNet Süre: ${g.netSureSaat > 0 && g.netSureSaat < 0.1 ? `${Math.max(1, Math.round(g.netSureSaat * 60))} dk (${g.netSureSaat} saat)` : `${g.netSureSaat} saat`}\n(Düzenlemek için tıklayın)`}
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span
                                className={`inline-flex items-center justify-center gap-0.5 w-full py-0.5 rounded text-[10px] font-bold tracking-tight ${badgeStyle}`}
                              >
                                {g.isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
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
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-bold text-rose-800 bg-rose-50/50" title="Yıllık İzin">
                        {ozet.yillikIzinGun > 0 ? ozet.yillikIzinGun : '-'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-orange-700 bg-orange-50/30" title="Ücretsiz İzin">
                        {ozet.ucretsizIzinGun > 0 ? ozet.ucretsizIzinGun : '-'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-amber-700 bg-amber-50/30" title="Raporlu">
                        {ozet.raporluGun > 0 ? ozet.raporluGun : '-'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-gray-200 font-semibold text-red-700 bg-red-50/30" title="Devamsız">
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
                      <option key={p.employee?.id} value={p.employee?.id}>
                        {p.employee?.name || 'İsimsiz'} ({p.employee?.department || 'Genel'})
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
                  onClick={handleExportDailyExcel}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Seçili Kayıtları Excel (.xlsx) İndir"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportDailyCsv}
                  className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  title="Seçili Kayıtları CSV (.csv) İndir"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>CSV</span>
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
                    {(selectedPuantajRecord.employee?.name || '?').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      {selectedPuantajRecord.employee?.name || 'İsimsiz Personel'}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        {selectedPuantajRecord.employee?.department || 'Genel'}
                      </span>
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{selectedPuantajRecord.employee?.position || 'Personel'}</span>
                      {(selectedPuantajRecord.employee?.tc_no || selectedPuantajRecord.employee?.tcNo) && (
                        <>
                          <span>•</span>
                          <span>TC: {selectedPuantajRecord.employee?.tc_no || selectedPuantajRecord.employee?.tcNo}</span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-mono text-gray-600">Vardiya: {selectedPuantajRecord.shift?.start_time || '08:30'} - {selectedPuantajRecord.shift?.end_time || '18:00'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="bg-white border border-emerald-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase">Fiili Çalışma</div>
                    <div className="text-sm font-extrabold text-emerald-700">
                      {selectedPuantajRecord.ozet?.fiiliCalismaGun || 0}g <span className="text-xs font-normal">({selectedPuantajRecord.ozet?.fiiliCalismaSaat || 0}s)</span>
                    </div>
                  </div>
                  <div className="bg-white border border-amber-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-amber-600 font-bold uppercase">Fazla Mesai</div>
                    <div className="text-sm font-extrabold text-amber-700">
                      +{(selectedPuantajRecord.ozet?.toplamFazlaMesaiSaat || 0)}s
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-blue-600 font-bold uppercase">Bordro Gün (30G)</div>
                    <div className="text-sm font-extrabold text-blue-700">
                      {selectedPuantajRecord.ozet?.bordroGun || 0} gün
                    </div>
                  </div>
                  <div className="bg-white border border-rose-300 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-rose-700 font-extrabold uppercase">Yıllık İzin</div>
                    <div className="text-sm font-extrabold text-rose-800">
                      {selectedPuantajRecord.ozet?.yillikIzinGun || 0} gün
                    </div>
                  </div>
                  <div className="bg-white border border-orange-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-orange-600 font-bold uppercase">Ücretsiz İzin</div>
                    <div className="text-sm font-extrabold text-orange-700">
                      {selectedPuantajRecord.ozet?.ucretsizIzinGun || 0} gün
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 px-3.5 py-1.5 rounded-xl text-center shadow-xs">
                    <div className="text-[10px] text-gray-500 font-bold uppercase">Rapor / Mazeret</div>
                    <div className="text-sm font-extrabold text-gray-700">
                      {(selectedPuantajRecord.ozet?.ucretliIzinGun || 0) + (selectedPuantajRecord.ozet?.raporluGun || 0)} gün
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
                    {activeDailyEmployeeId === 'all' && (
                      <th
                        onClick={() => handleDailySort('employeeName')}
                        className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                        title="Personel Adına Göre Sırala"
                      >
                        <div className="flex items-center gap-1">
                          <span>Personel</span>
                          {dailySortField === 'employeeName' ? (
                            <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                          ) : (
                            <span className="text-gray-300">↕</span>
                          )}
                        </div>
                      </th>
                    )}
                    <th
                      onClick={() => handleDailySort('tarih')}
                      className="px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Tarihe Göre Sırala"
                    >
                      <div className="flex items-center gap-1">
                        <span>Tarih</span>
                        {dailySortField === 'tarih' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('shiftHours')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Vardiya Saatlerine Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Vardiya</span>
                        {dailySortField === 'shiftHours' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('girisSaati')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Giriş Saatine Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>İlk Giriş Saati</span>
                        {dailySortField === 'girisSaati' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('cikisSaati')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Çıkış Saatine Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Son Çıkış Saati</span>
                        {dailySortField === 'cikisSaati' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('molaDk')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Yasal Molaya Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Yasal Mola</span>
                        {dailySortField === 'molaDk' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('netSureSaat')}
                      className="px-4 py-3 text-center bg-emerald-50 text-emerald-900 cursor-pointer hover:bg-emerald-100 transition-colors select-none"
                      title="Net Fiili Süreye Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Net Fiili Süre</span>
                        {dailySortField === 'netSureSaat' ? (
                          <span className="text-emerald-700 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('fazlaMesaiSaat')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Fazla Mesaiye Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Fazla Mesai</span>
                        {dailySortField === 'fazlaMesaiSaat' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('gecikmeDk')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Geç Kalmaya Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Geç Kalma</span>
                        {dailySortField === 'gecikmeDk' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleDailySort('kod')}
                      className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      title="Puantaj Durumuna Göre Sırala"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Puantaj Durumu</span>
                        {dailySortField === 'kod' ? (
                          <span className="text-blue-600 font-bold">{dailySortOrder === 'asc' ? '▲' : '▼'}</span>
                        ) : (
                          <span className="text-gray-300">↕</span>
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dailyFilteredItems.map((item, idx) => {
                    const record = filteredPuantaj.find(p => p.employee?.name === item.employeeName);
                    const dayObj = record?.gunler?.find(g => g.tarih === item.tarih);

                    let badgeStyle = 'bg-gray-100 text-gray-600 border border-gray-200';
                    if (item.kod === 'Ç') badgeStyle = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                    else if (item.kod === 'HT') badgeStyle = 'bg-blue-100 text-blue-800 border border-blue-200';
                    else if (item.kod === 'AT') badgeStyle = 'bg-slate-100 text-slate-700 border border-slate-200';
                    else if (item.kod === 'UBGT') badgeStyle = 'bg-purple-100 text-purple-800 border border-purple-200';
                    else if (item.kod === 'Yİ' || item.kod === 'YI') badgeStyle = 'bg-rose-700 text-white border border-rose-800 font-extrabold';
                    else if (item.kod === 'EV') badgeStyle = 'bg-amber-800 text-white border border-amber-900 font-extrabold';
                    else if (item.kod === 'Mİ' || item.kod === 'MZ') badgeStyle = 'bg-orange-700 text-white border border-orange-800 font-extrabold';
                    else if (item.kod === 'EG') badgeStyle = 'bg-slate-600 text-white border border-slate-700 font-extrabold';
                    else if (item.kod === 'DO') badgeStyle = 'bg-pink-700 text-white border border-pink-800 font-extrabold';
                    else if (item.kod === 'OL') badgeStyle = 'bg-stone-600 text-white border border-stone-700 font-extrabold';
                    else if (item.kod === 'BA') badgeStyle = 'bg-amber-600 text-white border border-amber-700 font-bold';
                    else if (item.kod === 'R' || item.kod === 'HA' || item.kod === 'RP') badgeStyle = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
                    else if (item.kod === 'Üİ' || item.kod === 'UC') badgeStyle = 'bg-orange-100 text-orange-900 border border-orange-300 font-bold';
                    else if (item.kod === 'D') badgeStyle = 'bg-red-100 text-red-800 border border-red-200 font-bold';
                    else if (item.kod === '-') badgeStyle = 'bg-gray-50 text-gray-400 font-normal';
                    else badgeStyle = 'bg-slate-600 text-white border border-slate-700 font-bold';

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
                          {item.cikisSaati ? (
                            item.cikisSaati
                          ) : item.isOngoing ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Vardiyası Devam Ediyor
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-gray-500">
                          {item.molaDk} dk
                        </td>
                        <td className="px-4 py-2.5 text-center font-extrabold text-emerald-700 bg-emerald-50/20">
                          {item.netSureSaat > 0 ? (item.netSureSaat < 0.1 ? `${item.netSureSaat} saat (~${Math.max(1, Math.round(item.netSureSaat * 60))} dk)` : `${item.netSureSaat} saat`) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-amber-600">
                          {item.fazlaMesaiSaat > 0 ? `+${item.fazlaMesaiSaat}s` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center font-semibold text-rose-600">
                          {item.gecikmeDk > 0 ? `${item.gecikmeDk} dk` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.isOngoing
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : badgeStyle
                            }`}
                          >
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

            {isEditCellLeave && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-900 flex-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Kayıtlı İzin Bulundu</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 font-bold uppercase text-amber-800">
                      {editActiveLeave ? (editActiveLeave.izinTuru || 'İzin') : editTarget.gun.kodAciklama}
                    </span>
                  </div>
                  <p className="mt-0.5 text-amber-800 font-medium">
                    {editActiveLeave
                      ? `${editActiveLeave.baslangicTarihi} - ${editActiveLeave.bitisTarihi} (${editActiveLeave.gunSayisi} gün)`
                      : `${editTarget.gun.tarih} (${editTarget.gun.kodAciklama})`}
                  </p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Bu izni aşağıdaki listeden başka bir türe/çalışmaya dönüştürebilir veya <strong>"İzni Kaldır"</strong> butonuyla tamamen silebilirsiniz. Yıllık izin değiştirildiğinde veya kaldırıldığında personelin kalan yıllık izni otomatik olarak yeniden hesaplanır.
                  </p>
                </div>
              </div>
            )}

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
                  <option value="EV">EV : Evlilik İzni (3 Gün Ücretli)</option>
                  <option value="Mİ">Mİ : Mazeret İzni (Ölüm, Babalık vb.)</option>
                  <option value="EG">EG : Eğitim İzni (Toplam İzinde Toplanmaz)</option>
                  <option value="RP">RP : SGK İstirahat Raporu</option>
                  <option value="R">R : SGK Raporu</option>
                  <option value="Üİ">Üİ : Ücretsiz İzin</option>
                  <option value="D">D : Devamsız (Giriş Yok)</option>
                  {leaveTypes
                    .filter((lt) => !['yillik', 'mazeret', 'hastalik', 'ucretsiz', 'evlilik'].includes(lt.id) && lt.kod !== 'YI' && lt.kod !== 'MZ' && lt.kod !== 'HA' && lt.kod !== 'UC' && lt.kod !== 'EV')
                    .map((lt) => (
                      <option key={lt.id} value={lt.kod}>
                        {lt.kod} : {lt.ad}
                      </option>
                    ))}
                </select>
              </div>

              {editKod === 'Ç' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700 block">Giriş Saati:</label>
                      {editGiris && (
                        <button
                          type="button"
                          onClick={() => setEditGiris('')}
                          className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold cursor-pointer"
                          title="Giriş saatini temizler"
                        >
                          Girişi Sıfırla
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={editGiris}
                      onChange={(e) => setEditGiris(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-gray-700 block">
                        Çıkış Saati {editTarget?.gun?.isOngoing && <span className="text-[10px] text-emerald-600 font-normal">(Devam Ediyor)</span>}:
                      </label>
                      {editCikis && (
                        <button
                          type="button"
                          onClick={() => setEditCikis('')}
                          className="text-[10px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                          title="Çıkış saatini kaldırır ve mesaiyi açık/devam ediyor yapar"
                        >
                          Çıkışı Sıfırla
                        </button>
                      )}
                    </div>
                    <input
                      type="time"
                      value={editCikis}
                      onChange={(e) => setEditCikis(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono font-bold bg-white"
                    />
                    {editTarget?.gun?.isOngoing && !editCikis && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Boş bırakılırsa mesai devam ediyor olarak korunur.</p>
                    )}
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

              {isEditCellLeave && (
                <button
                  type="button"
                  onClick={handleRemoveLeaveFromCell}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                  title="Bu tarihteki izni iptal eder, personeli normal güne döndürür ve yıllık iznini tekrar hesaplar"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  İzni Kaldır (Normal Güne Döndür & Yıllık İzni Güncelle)
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              {editTarget && adminOverrides[`${editTarget.employee.id}_${editTarget.gun.tarih}`] ? (
                <button
                  type="button"
                  onClick={handleClearCellEdit}
                  className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold text-xs cursor-pointer"
                  title="Manuel düzeltmeyi kaldırıp otomatik puantaj değerine dön"
                >
                  Otomatik Değere Dön
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
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
        </div>
      )}



      <PuantajExportModal
        isOpen={showPuantajExportModal}
        onClose={() => setShowPuantajExportModal(false)}
        allCalculatedPuantaj={allCalculatedPuantaj}
        companyName={profile?.company_name || 'Humanius'}
        selectedYear={selectedYear}
        selectedMonthIndex={selectedMonthIndex}
        departments={departments}
      />
    </div>
  );
};

export default PuantajCetveli;
