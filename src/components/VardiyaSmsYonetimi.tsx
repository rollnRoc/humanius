import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  MessageSquare,
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Building2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Phone,
  Sliders,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Info,
  CalendarCheck,
  ExternalLink,
  ChevronDown,
  ArrowRight,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import type { Employee, CompanyOfficeLocation } from '../types';
import {
  shiftService,
  CompanyShift,
  VARSAYILAN_VARDIYALAR,
  inferOfficeForShift,
  isShiftMatchingOffice,
} from '../services/shiftService';
import { companyService } from '../services/companyService';
import { smsService, SmsConfig, SmsLogEntry } from '../services/smsService';
import { shiftSmsScheduler, ShiftSmsCheckResult } from '../services/shiftSmsScheduler';
import { showConfirm, showSuccess, showError } from '../utils/swal';
import { getTodayYYYYMMDD } from '../utils/sanitize';
import { useAuth } from '../contexts/AuthContext';

interface VardiyaSmsYonetimiProps {
  employees: Employee[];
  companyId?: string;
}

export const VardiyaSmsYonetimi: React.FC<VardiyaSmsYonetimiProps> = ({
  employees,
  companyId = 'default',
}) => {
  const { appRole } = useAuth();
  const isSuperAdmin = appRole === 'superadmin';
  const isHrOrAdmin = isSuperAdmin || appRole === 'admin' || appRole === 'hr';

  // Active Main Tab: 'vardiya' | 'sms'
  const [activeTab, setActiveTab] = useState<'vardiya' | 'sms'>('vardiya');

  // ─── Vardiya Yönetimi State ──────────────────────────────────────────────
  const [shifts, setShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [offices, setOffices] = useState<CompanyOfficeLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOfficeId, setFilterOfficeId] = useState<string>('all');
  const [searchEmp, setSearchEmp] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [deptTargetDept, setDeptTargetDept] = useState('');
  const [deptTargetShiftId, setDeptTargetShiftId] = useState('');

  // Shift Edit / Add Form State
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState<CompanyShift | null>(null);
  const [formName, setFormName] = useState('');
  const [formOfficeId, setFormOfficeId] = useState('');
  const [formStart, setFormStart] = useState('08:30');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formBreak, setFormBreak] = useState(60);
  const [formTolerance, setFormTolerance] = useState(15);
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSatStart, setFormSatStart] = useState('08:30');
  const [formSatEnd, setFormSatEnd] = useState('13:00');
  const [formSatBreak, setFormSatBreak] = useState(30);

  // ─── SMS Bildirim State ──────────────────────────────────────────────────
  const todayStr = getTodayYYYYMMDD();
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'yesterday' | 'custom' | 'all'>('today');
  const [customDate, setCustomDate] = useState(todayStr);
  const [smsSearch, setSmsSearch] = useState('');
  const [smsTypeFilter, setSmsTypeFilter] = useState<'all' | 'start_reminder' | 'end_reminder' | 'test'>('all');
  const [smsStatusFilter, setSmsStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(() => smsService.getConfig(companyId));
  const [isCheckingSms, setIsCheckingSms] = useState(false);
  const [selectedMessageModal, setSelectedMessageModal] = useState<SmsLogEntry | null>(null);

  // Test SMS Modal State
  const [showTestSmsModal, setShowTestSmsModal] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testNote, setTestNote] = useState('Humanius Vardiya SMS Testi');
  const [isSendingTest, setIsSendingTest] = useState(false);

  // SMS Configuration Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editUsername, setEditUsername] = useState(smsConfig.username);
  const [editPassword, setEditPassword] = useState(smsConfig.password);
  const [editSourceAddr, setEditSourceAddr] = useState(smsConfig.source_addr);
  const [editStartDelay, setEditStartDelay] = useState(smsConfig.start_delay_minutes);
  const [editEndDelay, setEditEndDelay] = useState(smsConfig.end_delay_minutes);
  const [editLoginUrl, setEditLoginUrl] = useState(smsConfig.login_url);

  // Effective company ID
  const effectiveCompanyId = useMemo(() => {
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) return companyId;
    const foundEmp = employees.find((e) => e.company_id);
    return foundEmp?.company_id || companyId || 'default';
  }, [companyId, employees]);

  // Departments list
  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Load shifts and assignments
  const loadShiftData = async () => {
    setLoading(true);
    try {
      const [fetchedShifts, fetchedAssignments, fetchedOffices] = await Promise.all([
        shiftService.getShifts(effectiveCompanyId),
        shiftService.getAssignments(effectiveCompanyId),
        companyService.getOfficeLocations(effectiveCompanyId),
      ]);
      setOffices(fetchedOffices || []);

      const resolvedShifts = (fetchedShifts || []).map((s) => {
        if (!s.office_id && s.office_name && fetchedOffices && fetchedOffices.length > 0) {
          const match = fetchedOffices.find(
            (o) => o.name.trim().toLocaleLowerCase('tr-TR') === s.office_name?.trim().toLocaleLowerCase('tr-TR')
          );
          if (match) {
            return { ...s, office_id: match.id };
          }
        }
        return s;
      });

      setShifts(resolvedShifts);
      setAssignments(fetchedAssignments);

      if (resolvedShifts.length > 0) {
        setBulkShiftId((prev) => prev || resolvedShifts[0].id);
        setDeptTargetShiftId((prev) => prev || resolvedShifts[0].id);
      }
      if (departments.length > 0) {
        setDeptTargetDept((prev) => prev || departments[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Load SMS logs according to selected date filter
  const loadSmsLogs = () => {
    let targetDate: string | undefined = undefined;
    if (dateFilterMode === 'today') {
      targetDate = todayStr;
    } else if (dateFilterMode === 'yesterday') {
      targetDate = yesterdayStr;
    } else if (dateFilterMode === 'custom') {
      targetDate = customDate;
    } else {
      targetDate = undefined; // 'all'
    }

    const fetched = smsService.getLogs(targetDate);
    setSmsLogs(fetched);
  };

  useEffect(() => {
    loadShiftData();
    const handleOfficeUpdate = () => loadShiftData();
    window.addEventListener('humanius_office_locations_updated', handleOfficeUpdate);
    return () => window.removeEventListener('humanius_office_locations_updated', handleOfficeUpdate);
  }, [effectiveCompanyId]);

  useEffect(() => {
    const currentCfg = smsService.getConfig(effectiveCompanyId);
    setSmsConfig(currentCfg);
    setEditUsername(currentCfg.username);
    setEditPassword(currentCfg.password);
    setEditSourceAddr(currentCfg.source_addr);
    setEditStartDelay(currentCfg.start_delay_minutes);
    setEditEndDelay(currentCfg.end_delay_minutes);
    setEditLoginUrl(currentCfg.login_url);
    loadSmsLogs();
  }, [effectiveCompanyId, dateFilterMode, customDate]);

  useEffect(() => {
    const handleSmsUpdate = () => loadSmsLogs();
    window.addEventListener('humanius_sms_updated', handleSmsUpdate);
    return () => window.removeEventListener('humanius_sms_updated', handleSmsUpdate);
  }, [dateFilterMode, customDate]);

  // Filtered shifts based on office
  const displayedShifts = useMemo(() => {
    return shifts.filter((s) => isShiftMatchingOffice(s, filterOfficeId, offices));
  }, [shifts, filterOfficeId, offices]);

  // Filtered employees for assignment table
  const displayedEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !searchEmp.trim() ||
        emp.name.toLocaleLowerCase('tr-TR').includes(searchEmp.toLocaleLowerCase('tr-TR')) ||
        (emp.tc_no || emp.tcNo || '').includes(searchEmp) ||
        (emp.sicil_no || emp.sicilNo || '').includes(searchEmp);

      const matchDept = selectedDept === 'all' || emp.department === selectedDept;

      return matchSearch && matchDept;
    });
  }, [employees, searchEmp, selectedDept]);

  // Filtered SMS logs
  const filteredSmsLogs = useMemo(() => {
    return smsLogs.filter((log) => {
      const matchSearch =
        !smsSearch.trim() ||
        log.employee_name.toLocaleLowerCase('tr-TR').includes(smsSearch.toLocaleLowerCase('tr-TR')) ||
        log.phone.includes(smsSearch) ||
        log.message.toLocaleLowerCase('tr-TR').includes(smsSearch.toLocaleLowerCase('tr-TR'));

      const matchType = smsTypeFilter === 'all' || log.type === smsTypeFilter;
      const matchStatus = smsStatusFilter === 'all' || log.status === smsStatusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [smsLogs, smsSearch, smsTypeFilter, smsStatusFilter]);

  // SMS Statistics
  const smsStats = useMemo(() => {
    const total = filteredSmsLogs.length;
    const success = filteredSmsLogs.filter((l) => l.status === 'success').length;
    const failed = filteredSmsLogs.filter((l) => l.status === 'failed').length;
    const uniqueEmployees = new Set(filteredSmsLogs.map((l) => l.employee_name)).size;
    return { total, success, failed, uniqueEmployees };
  }, [filteredSmsLogs]);

  // ─── Vardiya Ekle / Düzenle İşlemleri ─────────────────────────────────────
  const handleOpenNewShift = () => {
    setEditingShift(null);
    setFormName('');
    setFormStart('08:30');
    setFormEnd('18:00');
    setFormBreak(60);
    setFormTolerance(15);
    setFormColor('#3b82f6');
    setFormIsDefault(shifts.length === 0);
    setFormOfficeId(filterOfficeId !== 'all' ? filterOfficeId : '');
    setFormSatStart('08:30');
    setFormSatEnd('13:00');
    setFormSatBreak(30);
    setShowShiftForm(true);
  };

  const handleOpenEditShift = (shift: CompanyShift) => {
    setEditingShift(shift);
    setFormName(shift.name);
    setFormStart(shift.start_time);
    setFormEnd(shift.end_time);
    setFormBreak(shift.break_minutes);
    setFormTolerance(shift.tolerance_minutes);
    setFormColor(shift.color || '#3b82f6');
    setFormIsDefault(Boolean(shift.is_default));
    setFormSatStart(shift.saturday_start_time || '08:30');
    setFormSatEnd(shift.saturday_end_time || '13:00');
    setFormSatBreak(shift.saturday_break_minutes != null ? shift.saturday_break_minutes : 30);
    const inferred = inferOfficeForShift(shift, offices);
    setFormOfficeId(inferred ? inferred.office_id : '');
    setShowShiftForm(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStart || !formEnd) {
      showError('Eksik Bilgi', 'Lütfen vardiya adı, başlangıç ve bitiş saatlerini doldurunuz.');
      return;
    }

    try {
      const selectedOffice = offices.find((o) => o.id === formOfficeId);
      const officeName = selectedOffice ? selectedOffice.name : '';
      const officeId = selectedOffice ? selectedOffice.id : '';

      const shiftData: CompanyShift = {
        id: editingShift ? editingShift.id : `shift-${Date.now()}`,
        name: formName.trim(),
        start_time: formStart,
        end_time: formEnd,
        break_minutes: Number(formBreak) || 0,
        tolerance_minutes: Number(formTolerance) || 0,
        color: formColor,
        is_default: formIsDefault,
        office_id: officeId || undefined,
        office_name: officeName || undefined,
        saturday_start_time: formSatStart || '08:30',
        saturday_end_time: formSatEnd || '13:00',
        saturday_break_minutes: Number(formSatBreak) || 30,
      };

      await shiftService.saveShift(effectiveCompanyId, shiftData);
      await loadShiftData();
      setShowShiftForm(false);
      setEditingShift(null);
      showSuccess(
        editingShift ? 'Vardiya Güncellendi' : 'Yeni Vardiya Eklendi',
        `"${shiftData.name}" vardiyası başarıyla kaydedildi.`
      );
    } catch (err) {
      console.error('Vardiya kaydetme hatası:', err);
      showError('Hata', 'Vardiya kaydedilirken bir hata oluştu.');
    }
  };

  const handleDeleteShift = async (shiftId: string, name: string) => {
    if (shifts.length <= 1) {
      showError('İşlem Engellendi', 'Sistemde en az 1 adet varsayılan vardiya bulunmalıdır.');
      return;
    }
    const confirmed = await showConfirm({
      title: 'Vardiyayı Sil',
      text: `"${name}" vardiyasını silmek istediğinize emin misiniz? Bu vardiyaya atanmış personeller varsayılan vardiyaya aktarılacaktır.`,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      await shiftService.deleteShift(effectiveCompanyId, shiftId);
      await loadShiftData();
      showSuccess('Silindi', `"${name}" vardiyası silindi.`);
    } catch (err) {
      console.error('Vardiya silme hatası:', err);
      showError('Hata', 'Vardiya silinirken bir hata meydana geldi.');
    }
  };

  // ─── Personel Atama İşlemleri ─────────────────────────────────────────────
  const handleSingleAssign = async (employeeId: string, shiftId: string) => {
    try {
      await shiftService.assignShift(effectiveCompanyId, employeeId, shiftId);
      setAssignments((prev) => ({ ...prev, [employeeId]: shiftId }));
      showSuccess('Vardiya Atandı', 'Personel vardiyası başarıyla güncellendi.');
    } catch (err) {
      console.error('Atama hatası:', err);
      showError('Hata', 'Vardiya ataması sırasında hata oluştu.');
    }
  };

  const handleBulkAssignSelected = async () => {
    if (selectedEmpIds.length === 0) {
      showError('Seçim Yapılmadı', 'Lütfen vardiya atanacak personelleri listeden işaretleyiniz.');
      return;
    }
    if (!bulkShiftId) {
      showError('Vardiya Seçilmedi', 'Lütfen hedef vardiyayı seçiniz.');
      return;
    }

    const targetShift = shifts.find((s) => s.id === bulkShiftId);
    const confirmed = await showConfirm({
      title: 'Toplu Vardiya Ataması',
      text: `Seçilen ${selectedEmpIds.length} personeli "${targetShift?.name}" vardiyasına atamak istediğinize emin misiniz?`,
      confirmButtonText: 'Evet, Ata',
    });
    if (!confirmed) return;

    try {
      await shiftService.bulkAssign(effectiveCompanyId, selectedEmpIds, bulkShiftId);
      await loadShiftData();
      setSelectedEmpIds([]);
      showSuccess('Toplu Atama Başarılı', `${selectedEmpIds.length} personel "${targetShift?.name}" vardiyasına atandı.`);
    } catch (err) {
      console.error('Toplu atama hatası:', err);
      showError('Hata', 'Toplu atama sırasında bir hata oluştu.');
    }
  };

  const handleDeptAssign = async () => {
    if (!deptTargetDept) {
      showError('Departman Seçilmedi', 'Lütfen hedef departmanı seçiniz.');
      return;
    }
    if (!deptTargetShiftId) {
      showError('Vardiya Seçilmedi', 'Lütfen hedef vardiyayı seçiniz.');
      return;
    }

    const deptEmployees = employees.filter((e) => e.department === deptTargetDept);
    if (deptEmployees.length === 0) {
      showError('Personel Bulunamadı', `"${deptTargetDept}" departmanında kayıtlı personel bulunmuyor.`);
      return;
    }

    const targetShift = shifts.find((s) => s.id === deptTargetShiftId);
    const confirmed = await showConfirm({
      title: 'Departman Bazlı Toplu Atama',
      text: `"${deptTargetDept}" departmanındaki ${deptEmployees.length} personelin tamamı "${targetShift?.name}" vardiyasına atanacak. Onaylıyor musunuz?`,
      confirmButtonText: 'Evet, Ata',
    });
    if (!confirmed) return;

    try {
      const empIds = deptEmployees.map((e) => e.id);
      await shiftService.bulkAssign(effectiveCompanyId, empIds, deptTargetShiftId);
      await loadShiftData();
      showSuccess(
        'Departman Atandı',
        `"${deptTargetDept}" departmanındaki ${empIds.length} personel "${targetShift?.name}" vardiyasına atandı.`
      );
    } catch (err) {
      console.error('Departman atama hatası:', err);
      showError('Hata', 'Departman ataması sırasında hata oluştu.');
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedEmpIds.length === displayedEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(displayedEmployees.map((e) => e.id));
    }
  };

  // ─── SMS Bildirim İşlemleri ──────────────────────────────────────────────
  const handleToggleSmsEnabled = () => {
    if (!isSuperAdmin) {
      showError('Yetki Kısıtlaması', 'Vardiya SMS servisini yalnızca Süper Yönetici açıp kapatabilir.');
      return;
    }
    const nextState = !smsConfig.enabled;
    const updated = smsService.saveConfig(effectiveCompanyId, { enabled: nextState });
    setSmsConfig(updated);
    if (nextState) {
      showSuccess('SMS Servisi Açıldı', 'Vardiya SMS servisi bu firma için aktif edildi.');
    } else {
      showSuccess('SMS Servisi Duraklatıldı', 'Vardiya SMS servisi bu firma için duraklatıldı.');
    }
  };

  const handleSaveSmsConfig = () => {
    const updated = smsService.saveConfig(effectiveCompanyId, {
      username: editUsername,
      password: editPassword,
      source_addr: editSourceAddr,
      start_delay_minutes: Number(editStartDelay) || 15,
      end_delay_minutes: Number(editEndDelay) || 15,
      login_url: editLoginUrl.trim() || 'https://humanius.net',
    });
    setSmsConfig(updated);
    setShowConfigModal(false);
    showSuccess('Ayarlar Kaydedildi', 'Verimor SMS entegrasyon ayarları başarıyla kaydedildi.');
  };

  const handleManualSmsCheck = async () => {
    setIsCheckingSms(true);
    try {
      const res: ShiftSmsCheckResult = await shiftSmsScheduler.checkAndSendShiftSms({
        employees,
        companyId: effectiveCompanyId,
      });

      loadSmsLogs();

      if (res.startSmsSent === 0 && res.endSmsSent === 0 && res.errors.length === 0) {
        showSuccess(
          'Tarama Tamamlandı',
          `Kontrol edilen ${res.checkedEmployeesCount} aktif personelden SMS gerektiren yeni bir gecikme bulunamadı.`
        );
      } else if (res.errors.length > 0) {
        showError(
          'Tarama Tamamlandı (Hatalarla)',
          `Gönderilen SMS: ${res.startSmsSent + res.endSmsSent} adet.\nHata alan: ${res.errors.length} adet.\n\nİlk Hata: ${res.errors[0]?.error}`
        );
      } else {
        showSuccess(
          'Vardiya SMS Taraması Başarılı',
          `• Vardiya Başlatma Uyarısı: ${res.startSmsSent} personele gönderildi\n• Vardiya Bitirme Uyarısı: ${res.endSmsSent} personele gönderildi`
        );
      }
    } catch (err: any) {
      showError('Hata', `Tarama sırasında bir hata oluştu: ${err?.message || err}`);
    } finally {
      setIsCheckingSms(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      showError('Eksik Numara', 'Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await smsService.sendTestSms(testPhone, testNote);
      loadSmsLogs();
      if (res.success) {
        showSuccess('Test SMS İletildi', `Test SMS'i ${testPhone} numarasına başarıyla gönderildi.`);
        setShowTestSmsModal(false);
      } else {
        showError('Test SMS Gönderilemedi', res.error || 'Bilinmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      showError('Hata', `Test gönderimi sırasında hata oluştu: ${err?.message || err}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearSmsLogs = async () => {
    const confirmed = await showConfirm({
      title: 'SMS Günlüğünü Temizle',
      text: 'Tüm SMS gönderim kayıtları silinecektir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?',
      confirmButtonText: 'Evet, Temizle',
      isDanger: true,
    });
    if (!confirmed) return;

    smsService.clearLogs();
    setSmsLogs([]);
    showSuccess('Temizlendi', 'SMS kayıt günlüğü başarıyla temizlendi.');
  };

  // Helper to lookup employee details from employees list
  const getEmployeeDetails = (empId: string, fallbackName: string) => {
    const found = employees.find((e) => e.id === empId || e.name === fallbackName);
    return {
      department: found?.department || 'Genel',
      position: found?.position || 'Personel',
      tc: found?.tc_no || found?.tcNo || '',
    };
  };

  const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || VARSAYILAN_VARDIYALAR[0];

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* ─── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
              ⏰
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Vardiya ve SMS Yönetimi
                </h1>
                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  Puantaj & PDKS
                </span>
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    smsConfig.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      smsConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  {smsConfig.enabled ? 'Otomatik SMS Aktif' : 'SMS Servisi Kapalı'}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Şirket mesai vardiyalarını tanımlayın, personellere vardiya atayın ve gecikmelerde gönderilen SMS bildirim günlüklerini takip edin.
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTestSmsModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-blue-600" />
              Test SMS Gönder
            </button>
            <button
              onClick={() => setShowConfigModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-600" />
              SMS Ayarları
            </button>
            {isSuperAdmin && (
              <button
                onClick={handleToggleSmsEnabled}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  smsConfig.enabled
                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {smsConfig.enabled ? 'SMS Servisini Duraklat' : 'SMS Servisini Başlat'}
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('vardiya')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'vardiya'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            Vardiya Yönetimi & Atamalar
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                activeTab === 'vardiya' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {shifts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              activeTab === 'sms'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            SMS Gönderim Günlüğü
            {smsStats.total > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeTab === 'sms' ? 'bg-indigo-800 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {smsStats.total}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── TAB 1: VARDIYA YÖNETİMİ ────────────────────────────────────────── */}
      {activeTab === 'vardiya' && (
        <div className="space-y-6">
          {/* Shifts Section Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Tanımlı Mesai Vardiyaları
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Varsayılan çalışma saatlerini ve ofis/şube bazlı özel vardiyaları buradan belirleyebilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {offices.length > 0 && (
                  <select
                    value={filterOfficeId}
                    onChange={(e) => setFilterOfficeId(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-semibold text-slate-700"
                  >
                    <option value="all">🏢 Tüm Ofisler ({shifts.length})</option>
                    {offices.map((off) => (
                      <option key={off.id} value={off.id}>
                        📍 {off.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={handleOpenNewShift}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Vardiya Tanımla
                </button>
              </div>
            </div>

            {/* Shift Edit / Create Form */}
            {showShiftForm && (
              <form
                onSubmit={handleSaveShift}
                className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 space-y-4 animate-fadeIn"
              >
                <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-600" />
                    {editingShift ? 'Vardiyayı Düzenle' : 'Yeni Vardiya Tanımla'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowShiftForm(false)}
                    className="text-slate-400 hover:text-slate-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Vardiya Adı *</label>
                    <input
                      type="text"
                      required
                      placeholder="Örn: 1. Vardiya (Sabah), Gece Vardiyası..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      Bağlı Olduğu Ofis / Şube
                    </label>
                    <select
                      value={formOfficeId}
                      onChange={(e) => setFormOfficeId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="">🏢 Tüm Ofisler (Şirket Geneli)</option>
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>
                          📍 {off.name} {off.il ? `(${off.il})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hafta İçi Giriş Saati *</label>
                    <input
                      type="time"
                      required
                      value={formStart}
                      onChange={(e) => setFormStart(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Hafta İçi Çıkış Saati *</label>
                    <input
                      type="time"
                      required
                      value={formEnd}
                      onChange={(e) => setFormEnd(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Öğle Molası (Dakika)</label>
                    <input
                      type="number"
                      min="0"
                      max="240"
                      value={formBreak}
                      onChange={(e) => setFormBreak(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tolerans Süresi (Dakika)</label>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={formTolerance}
                      onChange={(e) => setFormTolerance(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Cumartesi ve Pazar (Hafta Sonu) Ayarları */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-bold text-amber-950">
                        Cumartesi & Pazar Çalışma Saatleri (Cmt / Paz - Hafta Sonu Mesaisi)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setFormSatStart('08:30');
                          setFormSatEnd('13:00');
                          setFormSatBreak(30);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition shadow-2xs cursor-pointer"
                      >
                        08:30 - 13:00 (Yarım Gün)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSatStart('08:30');
                          setFormSatEnd('16:00');
                          setFormSatBreak(30);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition shadow-2xs cursor-pointer"
                      >
                        08:30 - 16:00
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormSatStart(formStart);
                          setFormSatEnd(formEnd);
                          setFormSatBreak(formBreak);
                        }}
                        className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg transition shadow-2xs cursor-pointer"
                      >
                        Hafta İçi İle Aynı
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Cmt / Paz Giriş Saati
                      </label>
                      <input
                        type="time"
                        value={formSatStart}
                        onChange={(e) => setFormSatStart(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-amber-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Cmt / Paz Çıkış Saati
                      </label>
                      <input
                        type="time"
                        value={formSatEnd}
                        onChange={(e) => setFormSatEnd(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-amber-500 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                        Cmt / Paz Mola Süresi (Dk)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        value={formSatBreak}
                        onChange={(e) => setFormSatBreak(Number(e.target.value))}
                        className="w-full bg-white border border-amber-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-amber-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Bottom Row */}
                <div className="flex items-center justify-between pt-2 border-t border-indigo-100 flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsDefault}
                        onChange={(e) => setFormIsDefault(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Şirketin Varsayılan Vardiyası Olsun
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-medium">Etiket Rengi:</span>
                      <input
                        type="color"
                        value={formColor}
                        onChange={(e) => setFormColor(e.target.value)}
                        className="w-7 h-6 p-0 border-0 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowShiftForm(false)}
                      className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-white cursor-pointer"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {editingShift ? 'Güncelle' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Shifts Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedShifts.map((shift) => {
                const assignedCount = Object.values(assignments).filter((sid) => sid === shift.id).length;
                const isDefault = Boolean(shift.is_default);
                const inferredOffice = inferOfficeForShift(shift, offices);
                const officeBadgeName = inferredOffice ? inferredOffice.office_name : '';

                return (
                  <div
                    key={shift.id}
                    className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all relative group"
                    style={{ borderLeftWidth: '6px', borderLeftColor: shift.color || '#3b82f6' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm tracking-tight">{shift.name}</h4>
                          {isDefault && (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                              ✓ Varsayılan
                            </span>
                          )}
                        </div>
                        {officeBadgeName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 font-semibold mt-1.5 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                            <MapPin className="w-3 h-3 text-indigo-500" />
                            {officeBadgeName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1.5 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            Tüm Ofisler
                          </span>
                        )}
                      </div>

                      {/* Prominent, colored, clickable action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(shift)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200/90 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="Vardiyayı Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Düzenle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteShift(shift.id, shift.name)}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200/90 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                          title="Bu Vardiyayı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Hafta İçi:
                        </span>
                        <span className="font-mono font-bold text-slate-900 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200/60">
                          {shift.start_time} - {shift.end_time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-amber-600" />
                          Cmt / Paz (Hafta Sonu):
                        </span>
                        <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200/80">
                          {shift.saturday_start_time || '08:30'} - {shift.saturday_end_time || '13:00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                        <span>☕ Öğle Molası: <strong>{shift.break_minutes} dk</strong></span>
                        <span>⏱️ Tolerans: <strong>{shift.tolerance_minutes} dk</strong></span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Atanan Personel:
                      </span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-lg">
                        {assignedCount} Kişi
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Personnel Shift Assignments Section Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  Personel Vardiya Atamaları
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Çalışanları toplu veya tek tek vardiyalara atayın. Özel atanmayanlar varsayılan vardiyaya ({defaultShift.name}) tabidir.
                </p>
              </div>

              {/* Bulk Quick Assignment Bar */}
              <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Toplu Departman Ata:
                </span>
                <select
                  value={deptTargetDept}
                  onChange={(e) => setDeptTargetDept(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium outline-none"
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={deptTargetShiftId}
                  onChange={(e) => setDeptTargetShiftId(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium outline-none"
                >
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.start_time}-{s.end_time})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleDeptAssign}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Uygula
                </button>
              </div>
            </div>

            {/* Filter and Selection Tools */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchEmp}
                    onChange={(e) => setSearchEmp(e.target.value)}
                    placeholder="Personel veya TC no ile ara..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 w-56"
                  />
                </div>

                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-medium text-slate-700"
                >
                  <option value="all">Tüm Departmanlar ({departments.length})</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Employees Bulk Action */}
              {selectedEmpIds.length > 0 && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-indigo-900">
                    {selectedEmpIds.length} Personel Seçildi:
                  </span>
                  <select
                    value={bulkShiftId}
                    onChange={(e) => setBulkShiftId(e.target.value)}
                    className="text-xs bg-white border border-indigo-300 rounded-lg px-2 py-1 font-semibold"
                  >
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssignSelected}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Ata
                  </button>
                  <button
                    onClick={() => setSelectedEmpIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 px-1"
                  >
                    İptal
                  </button>
                </div>
              )}
            </div>

            {/* Personnel Assignment Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={
                          displayedEmployees.length > 0 &&
                          selectedEmpIds.length === displayedEmployees.length
                        }
                        onChange={handleToggleSelectAll}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="py-3 px-4">Personel</th>
                    <th className="py-3 px-4">Departman / Görev</th>
                    <th className="py-3 px-4">Mevcut Vardiyası</th>
                    <th className="py-3 px-4">Vardiyayı Değiştir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedEmployees.map((emp) => {
                    const assignedShiftId = assignments[emp.id];
                    const activeShift =
                      shifts.find((s) => s.id === assignedShiftId) || defaultShift;
                    const isCustomAssigned = Boolean(assignedShiftId);
                    const isSelected = selectedEmpIds.includes(emp.id);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-slate-50/80 transition ${
                          isSelected ? 'bg-indigo-50/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedEmpIds((prev) =>
                                prev.includes(emp.id)
                                  ? prev.filter((id) => id !== emp.id)
                                  : [...prev, emp.id]
                              );
                            }}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px]">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div>{emp.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                {emp.tc_no || emp.tcNo || emp.sicil_no || emp.sicilNo || '-'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-800 font-medium">{emp.department || 'Genel'}</div>
                          <div className="text-[11px] text-slate-500">{emp.position || 'Personel'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                            style={{
                              backgroundColor: `${activeShift.color || '#3b82f6'}15`,
                              color: activeShift.color || '#1d4ed8',
                              border: `1px solid ${activeShift.color || '#3b82f6'}30`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: activeShift.color || '#3b82f6' }}
                            />
                            {activeShift.name} ({activeShift.start_time} - {activeShift.end_time})
                          </span>
                          {!isCustomAssigned && (
                            <span className="text-[10px] text-slate-400 ml-1.5">(Varsayılan)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={assignedShiftId || ''}
                            onChange={(e) => handleSingleAssign(emp.id, e.target.value)}
                            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">⚙️ Varsayılan Vardiya ({defaultShift.name})</option>
                            {shifts.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.start_time} - {s.end_time})
                              </option>
                            ))}
                          </select>
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

      {/* ─── TAB 2: SMS GÖNDERİM GÜNLÜĞÜ ────────────────────────────────────── */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          {/* SMS Filter & Action Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  SMS Gönderim Kayıt Günlüğü
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vardiyasını zamanında başlatmayan veya bitirmeyen personellere gönderilen SMS bildirimleri.
                </p>
              </div>

              {/* Date Filter Buttons & Custom Date Picker */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setDateFilterMode('today')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      dateFilterMode === 'today'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setDateFilterMode('yesterday')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      dateFilterMode === 'yesterday'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Dün
                  </button>
                  <button
                    onClick={() => setDateFilterMode('all')}
                    className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                      dateFilterMode === 'all'
                        ? 'bg-white text-indigo-700 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tüm Geçmiş
                  </button>
                </div>

                {/* Custom Date Input */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilterMode('custom');
                    }}
                    className="text-xs bg-transparent border-0 outline-none text-slate-700 font-semibold cursor-pointer"
                    title="Özel Tarih Seçiniz"
                  />
                </div>

                {/* Actions */}
                <button
                  onClick={loadSmsLogs}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                  title="Yenile"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  onClick={handleManualSmsCheck}
                  disabled={isCheckingSms}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Geciken personelleri hemen tara ve SMS gönder"
                >
                  <Send className={`w-3.5 h-3.5 ${isCheckingSms ? 'animate-spin' : ''}`} />
                  {isCheckingSms ? 'Taranıyor...' : 'Manuel SMS Tara'}
                </button>

                {smsLogs.length > 0 && (
                  <button
                    onClick={handleClearSmsLogs}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                    title="SMS Günlüğünü Temizle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search and Secondary Filter Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={smsSearch}
                    onChange={(e) => setSmsSearch(e.target.value)}
                    placeholder="Personel adı, telefon veya mesaj..."
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-500 w-64"
                  />
                </div>

                <select
                  value={smsTypeFilter}
                  onChange={(e) => setSmsTypeFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-medium text-slate-700"
                >
                  <option value="all">Tüm Bildirim Türleri</option>
                  <option value="start_reminder">Vardiya Başlatma Uyarısı</option>
                  <option value="end_reminder">Vardiya Bitirme Uyarısı</option>
                  <option value="test">Test SMS</option>
                </select>

                <select
                  value={smsStatusFilter}
                  onChange={(e) => setSmsStatusFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none font-medium text-slate-700"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="success">Başarılı / İletildi</option>
                  <option value="failed">Hatalı / İletilemedi</option>
                </select>
              </div>

              {/* Date Info Label */}
              <div className="text-xs text-slate-500 font-medium">
                Gösterilen Tarih:{' '}
                <strong className="text-slate-800">
                  {dateFilterMode === 'today'
                    ? `Bugün (${todayStr})`
                    : dateFilterMode === 'yesterday'
                    ? `Dün (${yesterdayStr})`
                    : dateFilterMode === 'custom'
                    ? customDate
                    : 'Tüm Kayıtlar'}
                </strong>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Toplam Gönderim
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">{smsStats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Başarılı İletim
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{smsStats.success}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                Hatalı / İletilemeyen
              </span>
              <div className="text-2xl font-black text-rose-700 mt-1">{smsStats.failed}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Farklı Personel
              </span>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {smsStats.uniqueEmployees} Kişi
              </div>
            </div>
          </div>

          {/* SMS Recipients Table ("sadece kimlere sms atılığı görüntülensin") */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {filteredSmsLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-700">SMS Gönderim Kaydı Bulunmuyor</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {dateFilterMode === 'today'
                      ? 'Bugün için henüz SMS uyarısı gönderilmiş bir personel bulunmuyor.'
                      : 'Seçili tarih filtresine uygun kayıt bulunamadı.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Tarih / Saat</th>
                      <th className="py-3.5 px-4">Personel (Alıcı)</th>
                      <th className="py-3.5 px-4">Telefon Numarası</th>
                      <th className="py-3.5 px-4">Bildirim Nedeni</th>
                      <th className="py-3.5 px-4">İlgili Vardiya</th>
                      <th className="py-3.5 px-4">Mesaj Metni</th>
                      <th className="py-3.5 px-4">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSmsLogs.map((log) => {
                      const dateObj = new Date(log.timestamp);
                      const timeStr = isNaN(dateObj.getTime())
                        ? '-'
                        : dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                      const dateStr = isNaN(dateObj.getTime())
                        ? log.date
                        : dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                      const empMeta = getEmployeeDetails(log.employee_id, log.employee_name);
                      const isSuccess = log.status === 'success';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-mono font-bold text-slate-900">{timeStr}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{dateStr}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {log.employee_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {empMeta.department} • {empMeta.position}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {log.phone}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                log.type === 'start_reminder'
                                  ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                  : log.type === 'end_reminder'
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {log.type === 'start_reminder'
                                ? 'Vardiya Başlatma'
                                : log.type === 'end_reminder'
                                ? 'Vardiya Bitirme'
                                : 'Test SMS'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{log.shift_name}</div>
                            {log.shift_time && log.shift_time !== '-' && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {log.shift_time}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <button
                              onClick={() => setSelectedMessageModal(log)}
                              className="text-left group cursor-pointer block"
                              title="Mesajın tamamını gör"
                            >
                              <p className="line-clamp-2 text-slate-600 text-[11px] group-hover:text-indigo-600 transition">
                                {log.message}
                              </p>
                              <span className="text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition">
                                Tamamını Oku ↗
                              </span>
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              {isSuccess ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  İletildi
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200"
                                  title={log.error_message || 'Gönderim hatası'}
                                >
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  Hata
                                </span>
                              )}
                            </div>
                            {log.error_message && (
                              <div className="text-[10px] text-rose-600 mt-1 max-w-xs truncate" title={log.error_message}>
                                {log.error_message}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MODAL: FULL SMS MESSAGE PREVIEW ─────────────────────────────────── */}
      {selectedMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">SMS Bildirim Detayı</h3>
              </div>
              <button
                onClick={() => setSelectedMessageModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Alıcı Personel:</span>
                  <strong className="text-slate-800">{selectedMessageModal.employee_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefon:</span>
                  <span className="font-mono text-slate-800">{selectedMessageModal.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tarih & Saat:</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedMessageModal.timestamp).toLocaleString('tr-TR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vardiya:</span>
                  <span className="text-slate-800">{selectedMessageModal.shift_name}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gönderilen SMS Metni:</label>
                <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {selectedMessageModal.message}
                </div>
              </div>

              {selectedMessageModal.error_message && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                  <strong>Hata Detayı:</strong> {selectedMessageModal.error_message}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMessageModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: TEST SMS SENDER ─────────────────────────────────────────── */}
      {showTestSmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Test SMS Gönder</h3>
              </div>
              <button
                onClick={() => setShowTestSmsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendTestSms} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alıcı Telefon Numarası *
                </label>
                <input
                  type="text"
                  required
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="05332702776"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Test Notu / Açıklama
                </label>
                <input
                  type="text"
                  value={testNote}
                  onChange={(e) => setTestNote(e.target.value)}
                  placeholder="Humanius Vardiya SMS Testi"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowTestSmsModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSendingTest ? 'Gönderiliyor...' : 'Gönder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: VERIMOR SMS CONFIG ──────────────────────────────────────── */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Verimor SMS Entegrasyon Ayarları</h3>
                  <p className="text-[11px] text-slate-500">API kimlik bilgileri ve vardiya bildirim süreleri</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Verimor Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="908502428910"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Verimor Şifre / API Key
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SMS Başlığı (Source Addr)
                  </label>
                  <input
                    type="text"
                    value={editSourceAddr}
                    onChange={(e) => setEditSourceAddr(e.target.value)}
                    placeholder="Boş (Varsayılan)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    SMS Altı Giriş Linki
                  </label>
                  <input
                    type="text"
                    value={editLoginUrl}
                    onChange={(e) => setEditLoginUrl(e.target.value)}
                    placeholder="https://humanius.net"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Başlatma Gecikmesi (Dk)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editStartDelay}
                    onChange={(e) => setEditStartDelay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">08:30 vardiyası için 08:45</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Bitirme Gecikmesi (Dk)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editEndDelay}
                    onChange={(e) => setEditEndDelay(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400">18:00 vardiyası için 18:15</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <strong>Verimor IP Güvenlik Uyarısı:</strong> Verimor hesabınızda IP kısıtlaması aktifse, sunucu IP adresinizin Verimor panelinden (<strong>Güvenlik &gt; İzinli IP'ler</strong>) listeye eklenmiş olması gerekmektedir. İzinli olmayan IP'lerde Verimor <code>403 İzinsiz IP</code> yanıtı verir.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSaveSmsConfig}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Ayarları Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
