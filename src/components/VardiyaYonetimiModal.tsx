import React, { useState, useEffect, useMemo } from 'react';
import { X, Clock, Plus, Trash2, Edit2, CheckCircle, Users, Sliders, Check, Search, Filter, AlertCircle, ShieldCheck } from 'lucide-react';
import type { Employee } from '../types';
import { shiftService, CompanyShift, VARSAYILAN_VARDIYALAR } from '../services/shiftService';

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
  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments'>('shifts');
  const [shifts, setShifts] = useState<CompanyShift[]>(VARSAYILAN_VARDIYALAR);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

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

  // Bulk Assignment Form State
  const [searchEmp, setSearchEmp] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [deptTargetShiftId, setDeptTargetShiftId] = useState('');
  const [deptTargetDept, setDeptTargetDept] = useState('');

  const departments = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [employees]);

  // Load shifts and assignments on mount or companyId change
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedShifts, fetchedAssignments] = await Promise.all([
        shiftService.getShifts(companyId),
        shiftService.getAssignments(companyId),
      ]);
      setShifts(fetchedShifts);
      setAssignments(fetchedAssignments);
      if (fetchedShifts.length > 0) {
        setBulkShiftId(fetchedShifts[0].id);
        setDeptTargetShiftId(fetchedShifts[0].id);
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
    }
  }, [isOpen, companyId]);

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
    setShowShiftForm(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStart || !formEnd) {
      alert('Lütfen vardiya adı, başlangıç ve bitiş saatlerini doldurunuz.');
      return;
    }

    const shiftData: CompanyShift = {
      id: editingShift ? editingShift.id : `shift-${Date.now()}`,
      name: formName.trim(),
      start_time: formStart,
      end_time: formEnd,
      break_minutes: Number(formBreak) || 0,
      tolerance_minutes: Number(formTolerance) || 0,
      color: formColor,
      is_default: formIsDefault,
    };

    await shiftService.saveShift(companyId, shiftData);
    await loadData();
    setShowShiftForm(false);
    setEditingShift(null);
  };

  const handleDeleteShift = async (shiftId: string, name: string) => {
    if (shifts.length <= 1) {
      alert('En az 1 adet varsayılan vardiya bulunmalıdır.');
      return;
    }
    if (!window.confirm(`"${name}" vardiyasını silmek istediğinize emin misiniz?`)) return;

    try {
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      await shiftService.deleteShift(companyId, shiftId);
      await loadData();
    } catch (err) {
      console.error('Silme hatası:', err);
      alert('Vardiya silinirken bir sorun oluştu.');
      await loadData();
    }
  };

  const handleSingleAssign = async (employeeId: string, shiftId: string) => {
    setAssignments((prev) => ({ ...prev, [employeeId]: shiftId }));
    await shiftService.assignShift(companyId, employeeId, shiftId);
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
    await shiftService.bulkAssign(companyId, targetEmpIds, deptTargetShiftId);
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
    await shiftService.bulkAssign(companyId, selectedEmpIds, bulkShiftId);
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
                Şirket vardiyalarını tanımlayın, departman veya personel bazında esnek atama yapın.
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
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'shifts' ? (
            <div className="space-y-6">
              {/* Top Controls */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p className="text-xs text-gray-500 font-medium">
                  Şirketinizde uygulanan tüm mesai ve vardiya saatlerini buradan oluşturup yönetebilirsiniz.
                </p>
                <button
                  onClick={handleOpenNewShift}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" /> Yeni Vardiya Tanımla
                </button>
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
                        className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
                      >
                        {editingShift ? 'Güncelle' : 'Kaydet'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Shifts List Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shifts.map((shift) => {
                  const assignedCount = Object.values(assignments).filter((sid) => sid === shift.id).length;
                  const isDefault = Boolean(shift.is_default);

                  return (
                    <div
                      key={shift.id}
                      className="bg-white border rounded-2xl p-5 shadow-xs transition-all hover:border-indigo-200 relative group"
                      style={{ borderLeftWidth: '6px', borderLeftColor: shift.color || '#3b82f6' }}
                    >
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm">{shift.name}</h4>
                            {isDefault && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                ✓ Varsayılan
                              </span>
                            )}
                          </div>
                          <p className="text-xl font-mono font-black text-gray-800 mt-1">
                            {shift.start_time} - {shift.end_time}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100">
                          <button
                            onClick={() => handleOpenEditShift(shift)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
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
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time} - {s.end_time})
                        </option>
                      ))}
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
                      {shifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.start_time}-{s.end_time})
                        </option>
                      ))}
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
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({s.start_time} - {s.end_time})
                                  </option>
                                ))}
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
