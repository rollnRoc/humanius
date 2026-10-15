import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Plus, Trash2, Edit2, CheckCircle, Users, Sliders, Check, Search, Filter, AlertCircle, ShieldCheck, Building2, MapPin, Calendar, MessageSquare, Send, RefreshCw, CheckCircle2, Smartphone, ShieldAlert, Play, Info } from 'lucide-react';
import type { Employee, CompanyOfficeLocation } from '../types';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR, inferOfficeForShift, isShiftMatchingOffice } from '../services/shiftService';
import { companyService } from '../services/companyService';
import { smsService, SmsConfig, SmsLogEntry } from '../services/smsService';
import { shiftSmsScheduler } from '../services/shiftSmsScheduler';
import { showConfirm, showSuccess, showError } from '../utils/swal';
import { getTodayYYYYMMDD } from '../utils/sanitize';
import { useAuth } from '../contexts/AuthContext';

interface VardiyaYonetimiModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  companyId?: string;
}

export const VardiyaYonetimiModal: React.FC<VardiyaYonetimiModalProps> = ({
  isOpen,
  onClose,
  employees,
  companyId = 'default',
}) => {
  const { appRole } = useAuth();
  const isSuperAdmin = appRole === 'superadmin';

  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments' | 'sms'>('shifts');
  const [shifts, setShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Office state & filtering
  const [offices, setOffices] = useState<CompanyOfficeLocation[]>([]);
  const [formOfficeId, setFormOfficeId] = useState<string>('');
  const [filterOfficeId, setFilterOfficeId] = useState<string>('all');

  // Shift Form State
  const [editingShift, setEditingShift] = useState<CompanyShift | null>(null);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formStart, setFormStart] = useState('08:30');
  const [formEnd, setFormEnd] = useState('18:00');
  const [formBreak, setFormBreak] = useState(60);
  const [formTolerance, setFormTolerance] = useState(15);
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formSatStart, setFormSatStart] = useState('08:30');
  const [formSatEnd, setFormSatEnd] = useState('13:00');
  const [formSatBreak, setFormSatBreak] = useState(30);

  // Bulk Assignment Form State
  const [searchEmp, setSearchEmp] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [deptTargetShiftId, setDeptTargetShiftId] = useState('');
  const [deptTargetDept, setDeptTargetDept] = useState('');

  // SMS Tab States
  const [smsConfig, setSmsConfig] = useState<SmsConfig>(() => smsService.getConfig(companyId));
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [smsFilterDate, setSmsFilterDate] = useState<'today' | 'all'>('today');
  const [smsChecking, setSmsChecking] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestNote, setSmsTestNote] = useState('Humanius Test');
  const [showSmsConfigEdit, setShowSmsConfigEdit] = useState(false);

  // Edit config state
  const [editSmsUsername, setEditSmsUsername] = useState(smsConfig.username);
  const [editSmsPassword, setEditSmsPassword] = useState(smsConfig.password);
  const [editSmsSourceAddr, setEditSmsSourceAddr] = useState(smsConfig.source_addr);
  const [editSmsStartDelay, setEditSmsStartDelay] = useState(smsConfig.start_delay_minutes);
  const [editSmsEndDelay, setEditSmsEndDelay] = useState(smsConfig.end_delay_minutes);
  const [editSmsLoginUrl, setEditSmsLoginUrl] = useState(smsConfig.login_url);

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [employees]);

  const effectiveCompanyId = useMemo(() => {
    if (companyId && companyId !== 'default' && !companyId.includes('demo')) return companyId;
    const foundEmp = employees.find((e) => e.company_id);
    return foundEmp?.company_id || companyId || 'default';
  }, [companyId, employees]);

  const displayedShifts = useMemo(() => {
    return shifts.filter((s) => isShiftMatchingOffice(s, filterOfficeId, offices));
  }, [shifts, filterOfficeId, offices]);

  // Load shifts, assignments, and company offices
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedShifts, fetchedAssignments, fetchedOffices] = await Promise.all([
        shiftService.getShifts(effectiveCompanyId),
        shiftService.getAssignments(effectiveCompanyId),
        companyService.getOfficeLocations(effectiveCompanyId),
      ]);
      setOffices(fetchedOffices || []);

      // If shift has office_name but missing office_id, match it with fetchedOffices
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
        setBulkShiftId(resolvedShifts[0].id);
        setDeptTargetShiftId(resolvedShifts[0].id);
      }
      if (departments.length > 0) {
        setDeptTargetDept(departments[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
      const handleOfficeUpdate = () => loadData();
      window.addEventListener('humanius_office_locations_updated', handleOfficeUpdate);
      return () => {
        window.removeEventListener('humanius_office_locations_updated', handleOfficeUpdate);
      };
    }
  }, [isOpen, effectiveCompanyId]);

  useEffect(() => {
    if (isOpen) {
      const cfg = smsService.getConfig(effectiveCompanyId);
      setSmsConfig(cfg);
      setEditSmsUsername(cfg.username);
      setEditSmsPassword(cfg.password);
      setEditSmsSourceAddr(cfg.source_addr);
      setEditSmsStartDelay(cfg.start_delay_minutes);
      setEditSmsEndDelay(cfg.end_delay_minutes);
      setEditSmsLoginUrl(cfg.login_url);
      setSmsLogs(smsService.getLogs(smsFilterDate === 'today' ? getTodayYYYYMMDD() : undefined));
    }
  }, [isOpen, effectiveCompanyId, smsFilterDate]);

  useEffect(() => {
    const handleSmsUpdate = () => {
      setSmsLogs(smsService.getLogs(smsFilterDate === 'today' ? getTodayYYYYMMDD() : undefined));
    };
    window.addEventListener('humanius_sms_updated', handleSmsUpdate);
    return () => window.removeEventListener('humanius_sms_updated', handleSmsUpdate);
  }, [smsFilterDate]);

  if (!isOpen) return null;

  const defaultShift = shifts.find((s) => s.is_default) || shifts[0] || VARSAYILAN_VARDIYALAR[0];

  const handleOpenNewShift = () => {
    setEditingShift(null);
    setFormName('');
    setFormStart('08:30');
    setFormEnd('18:00');
    setFormBreak(60);
    setFormTolerance(15);
    setFormColor('#3b82f6');
    setFormIsDefault(shifts.length === 0);
    setFormOfficeId(filterOfficeId !== 'all' && filterOfficeId !== 'general' ? filterOfficeId : '');
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
      alert('Lütfen vardiya adı, başlangıç ve bitiş saatlerini doldurunuz.');
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
      await loadData();
      setShowShiftForm(false);
      setEditingShift(null);
      setFormOfficeId('');
    } catch (err) {
      console.error('Vardiya kaydetme hatası:', err);
      alert('Vardiya kaydedilirken bir hata oluştu.');
    }
  };

  const handleDeleteShift = async (shiftId: string, name: string) => {
    if (shifts.length <= 1) {
      showError('İşlem Engellendi', 'En az 1 adet varsayılan vardiya bulunmalıdır.');
      return;
    }
    const confirmed = await showConfirm({
      title: 'Vardiyayı Sil',
      text: `"${name}" vardiyasını silmek istediğinize emin misiniz?`,
      confirmButtonText: 'Evet, Sil',
      cancelButtonText: 'Vazgeç',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      await shiftService.deleteShift(effectiveCompanyId, shiftId);
      await loadData();
      showSuccess('Vardiya Silindi', `"${name}" vardiyası başarıyla silindi.`);
    } catch (err) {
      console.error('Silme hatası:', err);
      showError('Hata', 'Vardiya silinirken bir sorun oluştu.');
      await loadData();
    }
  };

  const handleSingleAssign = async (employeeId: string, shiftId: string) => {
    setAssignments((prev) => ({ ...prev, [employeeId]: shiftId }));
    await shiftService.assignShift(effectiveCompanyId, employeeId, shiftId);
  };

  const handleDeptAssign = async () => {
    if (!deptTargetDept || !deptTargetShiftId) {
      alert('Lütfen geçerli bir departman ve vardiya seçiniz.');
      return;
    }
    const targetEmpIds = employees
      .filter((emp) => emp.department === deptTargetDept)
      .map((emp) => emp.id);

    if (targetEmpIds.length === 0) {
      alert('Bu departmanda personel bulunamadı.');
      return;
    }

    const updated = { ...assignments };
    targetEmpIds.forEach((id) => {
      updated[id] = deptTargetShiftId;
    });
    setAssignments(updated);
    await shiftService.bulkAssign(effectiveCompanyId, targetEmpIds, deptTargetShiftId);
    alert(`Başarılı: "${deptTargetDept}" departmanındaki ${targetEmpIds.length} personelin vardiyası güncellendi.`);
  };

  const handleBulkSelectedAssign = async () => {
    if (selectedEmpIds.length === 0 || !bulkShiftId) {
      alert('Lütfen en az bir personel ve atanacak vardiyayı seçiniz.');
      return;
    }

    const updated = { ...assignments };
    selectedEmpIds.forEach((id) => {
      updated[id] = bulkShiftId;
    });
    setAssignments(updated);
    await shiftService.bulkAssign(effectiveCompanyId, selectedEmpIds, bulkShiftId);
    alert(`Başarılı: Seçilen ${selectedEmpIds.length} personelin vardiyası güncellendi.`);
    setSelectedEmpIds([]);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = !searchEmp || emp.name.toLowerCase().includes(searchEmp.toLowerCase()) || (emp.email || '').toLowerCase().includes(searchEmp.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const handleToggleSelectAll = () => {
    if (selectedEmpIds.length === filteredEmployees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleToggleSelectEmp = (empId: string) => {
    setSelectedEmpIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-lg">
              ⏰
            </div>
            <div>
              <h3 className="font-bold text-base">Vardiya & Çalışma Saatleri Yönetimi</h3>
              <p className="text-xs text-indigo-200">
                Şirket vardiyalarını tanımlayın, ofis bazında filtreleyin, departman veya personel bazında esnek atama yapın.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/80 px-6 pt-2">
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'shifts'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            1. Vardiya Tanımları ({shifts.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'assignments'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            2. Personel & Departman Atamaları ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-xs font-bold transition-all ${
              activeTab === 'sms'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            3. SMS Bildirimleri & Hatırlatıcılar
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'shifts' ? (
            <div className="space-y-6">
              {/* Top Controls & Office Filter */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Şirketinizde uygulanan tüm mesai ve vardiya saatlerini buradan oluşturup yönetebilirsiniz.
                  </p>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {offices.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-indigo-50/70 border border-indigo-150 px-3 py-1.5 rounded-xl">
                      <Filter className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-bold text-indigo-900">Ofis:</span>
                      <select
                        value={filterOfficeId}
                        onChange={(e) => setFilterOfficeId(e.target.value)}
                        className="bg-transparent text-xs font-bold text-indigo-950 outline-none cursor-pointer"
                      >
                        <option value="all">Tüm Ofisler ({shifts.length})</option>
                        <option value="general">🌐 Şirket Geneli (Ofissiz)</option>
                        {offices.map((off) => {
                          const count = shifts.filter((s) =>
                            isShiftMatchingOffice(s, off.id, offices)
                          ).length;
                          return (
                            <option key={off.id} value={off.id}>
                              📍 {off.name} ({count})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                  <button
                    onClick={handleOpenNewShift}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Yeni Vardiya Tanımla
                  </button>
                </div>
              </div>

              {/* Shift Form (Add / Edit) */}
              {showShiftForm && (
                <form
                  onSubmit={handleSaveShift}
                  className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 space-y-4 animate-fadeIn"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <h4 className="font-bold text-sm text-indigo-950 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      {editingShift ? 'Vardiyayı Düzenle' : 'Yeni Vardiya Oluştur'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowShiftForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block font-semibold text-gray-700 mb-1">Vardiya Adı *</label>
                      <input
                        type="text"
                        required
                        placeholder="Örn: 1. Vardiya (Sabah), Gece Vardiyası..."
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-1">
                      <label className="block font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                        Bağlı Olduğu Ofis / Şube
                      </label>
                      <select
                        value={formOfficeId}
                        onChange={(e) => setFormOfficeId(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 font-semibold"
                      >
                        <option value="">🏢 Tüm Ofisler (Şirket Geneli)</option>
                        {offices.map((off) => (
                          <option key={off.id} value={off.id}>
                            📍 {off.name} {off.il ? `(${off.il})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1">
                        Bu ofise bağlı çalışanlar mesai başlarken bu vardiyayı görür.
                      </p>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Giriş Saati *</label>
                      <input
                        type="time"
                        required
                        value={formStart}
                        onChange={(e) => setFormStart(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Çıkış Saati *</label>
                      <input
                        type="time"
                        required
                        value={formEnd}
                        onChange={(e) => setFormEnd(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Mola Süresi (Dakika)</label>
                      <input
                        type="number"
                        min="0"
                        max="240"
                        value={formBreak}
                        onChange={(e) => setFormBreak(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Geç Kalma Toleransı (Dk)</label>
                      <input
                        type="number"
                        min="0"
                        max="120"
                        value={formTolerance}
                        onChange={(e) => setFormTolerance(Number(e.target.value))}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Etiket Rengi</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={formColor}
                          onChange={(e) => setFormColor(e.target.value)}
                          className="w-10 h-8 p-0 border-0 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-gray-600">{formColor}</span>
                      </div>
                    </div>

                    {/* Cumartesi Çalışma Saatleri Bölümü */}
                    <div className="col-span-full bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-amber-950">
                            Cumartesi Çalışma Saatleri (6 Günlük Düzen İçin)
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
                            className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
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
                            className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
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
                            className="text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                          >
                            Hafta İçi İle Aynı
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                            Cumartesi Giriş Saati
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
                            Cumartesi Çıkış Saati
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
                            Cumartesi Mola (Dk)
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

                      <p className="text-[10px] text-amber-800/90 leading-normal">
                        ℹ️ Şirketinizde 6 günlük çalışma düzeni seçildiğinde, bu vardiyaya bağlı personellerin Cumartesi günü mesai ve puantaj hesabı burada belirlenen saatlere göre yapılır.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-indigo-100 flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsDefault}
                        onChange={(e) => setFormIsDefault(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      Şirketin Varsayılan Vardiyası Olsun (Özel vardiya atanmamış personeller buna dahil olur)
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowShiftForm(false)}
                        className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                      >
                        {editingShift ? 'Güncelle' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Shifts List Cards */}
              {displayedShifts.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500 space-y-2">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="font-bold text-sm text-gray-700">Bu ofis için henüz vardiya tanımlanmamış</p>
                  <p className="text-xs text-gray-500">
                    "Yeni Vardiya Tanımla" butonuna basarak bu ofise özel mesai saatleri ekleyebilirsiniz.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayedShifts.map((shift) => {
                    const assignedCount = Object.values(assignments).filter((sid) => sid === shift.id).length;
                    const isDefault = Boolean(shift.is_default);
                    const inferredOffice = inferOfficeForShift(shift, offices);
                    const officeBadgeName = inferredOffice ? inferredOffice.office_name : '';

                    return (
                      <div
                        key={shift.id}
                        className="bg-white border rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200 relative group"
                        style={{ borderLeftWidth: '6px', borderLeftColor: shift.color || '#3b82f6' }}
                      >
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-gray-900 text-sm">{shift.name}</h4>
                              {officeBadgeName ? (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-500" />
                                  {officeBadgeName}
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Building2 className="w-2.5 h-2.5 text-gray-400" />
                                  Tüm Ofisler
                                </span>
                              )}
                              {isDefault && (
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                  ✓ Varsayılan
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 font-mono font-bold text-xs text-gray-800 bg-gray-100/90 px-2 py-0.5 rounded-md">
                                <Clock className="w-3 h-3 text-blue-600" />
                                Hafta İçi: {shift.start_time} - {shift.end_time}
                              </span>
                              <span className="flex items-center gap-1 font-mono font-bold text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">
                                <Calendar className="w-3 h-3 text-amber-600" />
                                Cmt: {shift.saturday_start_time || '08:30'} - {shift.saturday_end_time || '13:00'} ({shift.saturday_break_minutes ?? 30} dk mola)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                            <button
                              onClick={() => handleOpenEditShift(shift)}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Düzenle"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShift(shift.id, shift.name);
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Bu Vardiyayı Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-center text-xs">
                          <div className="bg-gray-50 rounded-xl p-2">
                            <p className="text-[10px] text-gray-400">Mola</p>
                            <p className="font-bold text-gray-700">{shift.break_minutes} dk</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2">
                            <p className="text-[10px] text-gray-400">Tolerans</p>
                            <p className="font-bold text-gray-700">{shift.tolerance_minutes} dk</p>
                          </div>
                          <div className="bg-indigo-50/60 rounded-xl p-2">
                            <p className="text-[10px] text-indigo-500">Atanan</p>
                            <p className="font-bold text-indigo-700">
                              {assignedCount > 0 ? `${assignedCount} Kişi` : (isDefault ? 'Otomatik' : '0 Kişi')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bulk Department Assignment Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Departman Bazında Hızlı Toplu Vardiya Atama
                </div>
                <p className="text-xs text-indigo-800">
                  Bir departmandaki tüm personelleri tek işlemle seçilen vardiyaya geçirebilirsiniz.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Departman</label>
                    <select
                      value={deptTargetDept}
                      onChange={(e) => setDeptTargetDept(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                    >
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept} ({employees.filter((e) => e.department === dept).length} Kişi)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Atanacak Vardiya</label>
                    <select
                      value={deptTargetShiftId}
                      onChange={(e) => setDeptTargetShiftId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500"
                    >
                      {shifts.map((s) => {
                        const off = inferOfficeForShift(s, offices);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} {off ? `[📍 ${off.office_name}]` : '[🏢 Genel]'} ({s.start_time} - {s.end_time})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleDeptAssign}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" /> Departmana Uygula
                    </button>
                  </div>
                </div>
              </div>

              {/* Employee Selection & Table Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Personel veya e-posta ara..."
                      value={searchEmp}
                      onChange={(e) => setSearchEmp(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-500"
                    />
                  </div>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium outline-none bg-white"
                  >
                    <option value="all">Tüm Departmanlar</option>
                    {departments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedEmpIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-200 animate-fadeIn">
                    <span className="text-xs font-bold text-indigo-900">
                      {selectedEmpIds.length} Personel Seçili:
                    </span>
                    <select
                      value={bulkShiftId}
                      onChange={(e) => setBulkShiftId(e.target.value)}
                      className="border border-indigo-200 rounded-lg px-2 py-1 text-xs font-semibold bg-white"
                    >
                      {shifts.map((s) => {
                        const off = inferOfficeForShift(s, offices);
                        return (
                          <option key={s.id} value={s.id}>
                            {s.name} {off ? `[📍 ${off.office_name}]` : '[🏢 Genel]'} ({s.start_time}-{s.end_time})
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      onClick={handleBulkSelectedAssign}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-xs"
                    >
                      Toplu Ata
                    </button>
                  </div>
                )}
              </div>

              {/* Employee Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={filteredEmployees.length > 0 && selectedEmpIds.length === filteredEmployees.length}
                          onChange={handleToggleSelectAll}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="p-3.5">Personel</th>
                      <th className="p-3.5">Departman / Pozisyon</th>
                      <th className="p-3.5">Atanmış Vardiya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredEmployees.map((emp) => {
                      const assignedShiftId = assignments[emp.id];
                      const activeShift = shifts.find((s) => s.id === assignedShiftId) || defaultShift;
                      const isCustomAssigned = Boolean(assignedShiftId);
                      const isSelected = selectedEmpIds.includes(emp.id);

                      return (
                        <tr
                          key={emp.id}
                          className={`hover:bg-indigo-50/30 transition-colors ${
                            isSelected ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectEmp(emp.id)}
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-3.5">
                            <p className="font-bold text-gray-900">{emp.name}</p>
                            <p className="text-[11px] text-gray-400">{emp.email || '-'}</p>
                          </td>
                          <td className="p-3.5">
                            <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                              {emp.department || 'Genel'}
                            </span>
                            <p className="text-[11px] text-gray-500 mt-0.5">{emp.position || '-'}</p>
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <select
                                value={activeShift.id}
                                onChange={(e) => handleSingleAssign(emp.id, e.target.value)}
                                className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200"
                                style={{
                                  borderLeftWidth: '4px',
                                  borderLeftColor: activeShift.color || '#3b82f6',
                                }}
                              >
                                {shifts.map((s) => {
                                  const off = inferOfficeForShift(s, offices);
                                  return (
                                    <option key={s.id} value={s.id}>
                                      {s.name} {off ? `[📍 ${off.office_name}]` : ''} ({s.start_time} - {s.end_time})
                                    </option>
                                  );
                                })}
                              </select>
                              {isCustomAssigned ? (
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                                  Özel
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-2 py-0.5 rounded-full">
                                  Varsayılan
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sms' && (
            <div className="space-y-6">
              {/* Süper Yönetici Bilgilendirmesi / Kısıtlaması */}
              {!isSuperAdmin && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800 shadow-xs">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    <strong>Firma SMS Yetki Kuralı:</strong> Vardiya SMS bildirim servisi tüm firmalarda varsayılan olarak kapalıdır ve yalnızca <strong>Süper Yönetici</strong> tarafından açılıp kapatılabilir.
                  </span>
                </div>
              )}

              {/* Status and info cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Otomatik Servis
                      </span>
                      <div
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                          smsConfig.enabled
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            smsConfig.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                          }`}
                        />
                        {smsConfig.enabled ? 'Aktif (60sn)' : 'Devre Dışı'}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      {smsConfig.enabled
                        ? 'Sistem vardiyaları dakikada bir otomatik tarıyor.'
                        : 'Otomatik SMS gönderimi şu anda kapalıdır.'}
                    </p>
                  </div>
                  <button
                    onClick={
                      isSuperAdmin
                        ? () => {
                            const nextState = !smsConfig.enabled;
                            const updated = smsService.saveConfig(effectiveCompanyId, { enabled: nextState });
                            setSmsConfig(updated);
                            if (nextState) {
                              showSuccess('Vardiya SMS servisi bu firma için başlatıldı.');
                            } else {
                              showSuccess('Vardiya SMS servisi bu firma için duraklatıldı.');
                            }
                          }
                        : undefined
                    }
                    disabled={!isSuperAdmin}
                    className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      !isSuperAdmin
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : smsConfig.enabled
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    }`}
                    title={!isSuperAdmin ? 'Bu ayar yalnızca Süper Yönetici tarafından değiştirilebilir.' : undefined}
                  >
                    {!isSuperAdmin ? (
                      <>
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                        Süper Yönetici Yetkisi Gerekir
                      </>
                    ) : (
                      smsConfig.enabled ? 'Servisi Duraklat' : 'Servisi Başlat'
                    )}
                  </button>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Vardiya Başlatma Uyarısı
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    +{smsConfig.start_delay_minutes} Dakika Gecikmede
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Örn: <strong>08:30</strong> vardiyasındaki personel <strong>08:45</strong>'te hala giriş yapmadıysa SMS atılır.
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Vardiya Bitirme Uyarısı
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    +{smsConfig.end_delay_minutes} Dakika Gecikmede
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Örn: <strong>18:00</strong> vardiyasındaki personel <strong>18:15</strong>'te hala mesaiyi bitirmediyse SMS atılır.
                  </p>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Şimdi Vardiyaları Tara ve Gecikenlere SMS At</h4>
                    <p className="text-xs text-slate-600">
                      Otomatik döngüyü beklemeden hemen tarama yapıp geciken personellere SMS gönderir.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setShowSmsConfigEdit(!showSmsConfigEdit)}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    Ayarları Düzenle
                  </button>
                  <button
                    onClick={async () => {
                      setSmsChecking(true);
                      try {
                        const res = await shiftSmsScheduler.checkAndSendShiftSms({ employees, companyId: effectiveCompanyId });
                        setSmsLogs(smsService.getLogs(smsFilterDate === 'today' ? getTodayYYYYMMDD() : undefined));
                        if (res.startSmsSent === 0 && res.endSmsSent === 0 && res.errors.length === 0) {
                          showSuccess(`Tarama tamamlandı: Kontrol edilen ${res.checkedEmployeesCount} aktif personelden SMS gerektiren yeni bir gecikme bulunamadı.`);
                        } else if (res.errors.length > 0) {
                          showError(`Tarama tamamlandı. Gönderilen: ${res.startSmsSent + res.endSmsSent} adet. Hata alan: ${res.errors.length} adet.\n\nİlk Hata: ${res.errors[0]?.error}`);
                        } else {
                          showSuccess(`Vardiya SMS taraması tamamlandı!\n• Başlatma Uyarısı: ${res.startSmsSent} personele gönderildi\n• Bitirme Uyarısı: ${res.endSmsSent} personele gönderildi`);
                        }
                      } catch (err: any) {
                        showError(`Hata: ${err?.message || err}`);
                      } finally {
                        setSmsChecking(false);
                      }
                    }}
                    disabled={smsChecking}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${smsChecking ? 'animate-spin' : ''}`} />
                    {smsChecking ? 'Taranıyor...' : 'Şimdi Kontrol Et'}
                  </button>
                </div>
              </div>

              {/* Collapsible Config Settings */}
              {showSmsConfigEdit && (
                <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-bold text-slate-800">Verimor SMS API & Zamanlama Ayarları</h3>
                    </div>
                    <span className="text-xs text-slate-500">onayliform & BigPortal ile birebir uyumlu</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Verimor Kullanıcı Adı
                      </label>
                      <input
                        type="text"
                        value={editSmsUsername}
                        onChange={(e) => setEditSmsUsername(e.target.value)}
                        placeholder="908502428910"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Verimor Şifre / API Key
                      </label>
                      <input
                        type="password"
                        value={editSmsPassword}
                        onChange={(e) => setEditSmsPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        SMS Başlığı (Source Addr)
                      </label>
                      <input
                        type="text"
                        value={editSmsSourceAddr}
                        onChange={(e) => setEditSmsSourceAddr(e.target.value)}
                        placeholder="Boş (Varsayılan)"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Başlatma Gecikmesi (Dakika)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={editSmsStartDelay}
                        onChange={(e) => setEditSmsStartDelay(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                      <span className="text-[11px] text-slate-500">Örn: 15 dk (08:30 için 08:45)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bitirme Gecikmesi (Dakika)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={editSmsEndDelay}
                        onChange={(e) => setEditSmsEndDelay(Number(e.target.value))}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                      <span className="text-[11px] text-slate-500">Örn: 15 dk (18:00 için 18:15)</span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        SMS Altı Giriş Linki
                      </label>
                      <input
                        type="text"
                        value={editSmsLoginUrl}
                        onChange={(e) => setEditSmsLoginUrl(e.target.value)}
                        placeholder="https://humanius.net"
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                      />
                      <span className="text-[11px] text-slate-500">Personelin tıklayacağı URL</span>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Verimor IP Güvenlik Uyarısı:</strong> Verimor hesabınızda IP kısıtlaması aktif olduğunda, SMS gönderilecek sunucu veya istemcinin IP adresinin Verimor panelinden (<strong>Güvenlik &gt; İzinli IP'ler</strong>) listeye eklenmiş olması gerekmektedir. İzinli olmayan IP'lerde Verimor <code>403 (İzinsiz IP)</code> yanıtı verir.
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSmsConfigEdit(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = smsService.saveConfig(effectiveCompanyId, {
                          username: editSmsUsername,
                          password: editSmsPassword,
                          source_addr: editSmsSourceAddr,
                          start_delay_minutes: Number(editSmsStartDelay) || 15,
                          end_delay_minutes: Number(editSmsEndDelay) || 15,
                          login_url: editSmsLoginUrl.trim() || 'https://humanius.net',
                        });
                        setSmsConfig(updated);
                        setShowSmsConfigEdit(false);
                        showSuccess('SMS ayarları başarıyla kaydedildi.');
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      Kaydet
                    </button>
                  </div>
                </div>
              )}

              {/* Test SMS Sending Form */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tek Seferlik Test SMS Gönder
                  </h3>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!smsTestPhone.trim()) {
                      showError('Lütfen geçerli bir telefon numarası giriniz.');
                      return;
                    }
                    const res = await smsService.sendTestSms(smsTestPhone, smsTestNote, effectiveCompanyId);
                    setSmsLogs(smsService.getLogs(smsFilterDate === 'today' ? getTodayYYYYMMDD() : undefined));
                    if (res.success) {
                      showSuccess(`Test SMS'i ${smsTestPhone} numarasına iletildi.`);
                    } else {
                      showError(`Test SMS gönderilemedi!\n\n${res.error || 'Bilinmeyen hata'}`);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="text"
                    value={smsTestPhone}
                    onChange={(e) => setSmsTestPhone(e.target.value)}
                    placeholder="Telefon (Örn: 05332702776)"
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <input
                    type="text"
                    value={smsTestNote}
                    onChange={(e) => setSmsTestNote(e.target.value)}
                    placeholder="Test Mesajı Açıklaması"
                    className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Test Gönder
                  </button>
                </form>
              </div>

              {/* SMS Logs Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Gönderilen SMS Kayıt Günlüğü
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                      {smsLogs.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                      <button
                        onClick={() => setSmsFilterDate('today')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          smsFilterDate === 'today'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Bugün
                      </button>
                      <button
                        onClick={() => setSmsFilterDate('all')}
                        className={`px-2.5 py-1 rounded-md font-semibold transition ${
                          smsFilterDate === 'all'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tüm Geçmiş
                      </button>
                    </div>
                    {smsLogs.length > 0 && (
                      <button
                        onClick={async () => {
                          const conf = await showConfirm('SMS günlüğünü temizlemek istediğinize emin misiniz?');
                          if (conf) {
                            smsService.clearLogs();
                            setSmsLogs([]);
                            showSuccess('SMS günlüğü temizlendi.');
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Günlüğü Temizle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {smsLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-medium">
                      {smsFilterDate === 'today'
                        ? 'Bugün için henüz gönderilmiş bir SMS kaydı bulunmuyor.'
                        : 'Kayıtlı SMS geçmişi bulunmuyor.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="py-2.5 px-3">Saat</th>
                          <th className="py-2.5 px-3">Personel</th>
                          <th className="py-2.5 px-3">Telefon</th>
                          <th className="py-2.5 px-3">Bildirim Türü</th>
                          <th className="py-2.5 px-3">Vardiya</th>
                          <th className="py-2.5 px-3">Durum</th>
                          <th className="py-2.5 px-3">Detay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {smsLogs.map((log) => {
                          const timeStr = new Date(log.timestamp).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                          const isSuccess = log.status === 'success';

                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition">
                              <td className="py-2 px-3 text-slate-500 font-mono">{timeStr}</td>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {log.employee_name}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-600">{log.phone}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                    log.type === 'start_reminder'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : log.type === 'end_reminder'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                      : 'bg-slate-100 text-slate-800 border border-slate-200'
                                  }`}
                                >
                                  {log.type === 'start_reminder'
                                    ? 'Vardiya Başlatma'
                                    : log.type === 'end_reminder'
                                    ? 'Vardiya Bitirme'
                                    : 'Test SMS'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {log.shift_time !== '-' ? log.shift_time : log.shift_name}
                              </td>
                              <td className="py-2 px-3">
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${
                                    isSuccess ? 'text-emerald-700' : 'text-red-700'
                                  }`}
                                >
                                  {isSuccess ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      İletildi
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                      Hata
                                    </>
                                  )}
                                </span>
                              </td>
                              <td
                                className="py-2 px-3 text-slate-500 max-w-xs truncate"
                                title={log.error_message || log.message}
                              >
                                {log.error_message ? (
                                  <span className="text-red-600">{log.error_message}</span>
                                ) : (
                                  log.message
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
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Tüm vardiya ve personel atamaları bulut veritabanına anında senkronize edilir.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold shadow-xs transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
