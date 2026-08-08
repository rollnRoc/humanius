import React, { useState, useEffect } from 'react';
import { 
  EmployeeDetails, 
  CalculationMode 
} from '../types/tazminatTypes';
import { PRESET_SCENARIOS } from '../data/presetScenarios';
import { 
  calculateSeverancePay, 
  calculateNoticePay, 
  calculateOvertimePay, 
  calculateAnnualLeavePay, 
  calculateReinstatementPay,
  buildDeductionMatrix,
  formatCurrency 
} from '../utils/tazminatCalculators';
import { EmployeeWageForm } from './TazminatHesaplama/EmployeeWageForm';
import { SeveranceNoticeCalculator } from './TazminatHesaplama/SeveranceNoticeCalculator';
import { OvertimeCalculator } from './TazminatHesaplama/OvertimeCalculator';
import { AnnualLeaveCalculator } from './TazminatHesaplama/AnnualLeaveCalculator';
import { ReinstatementCalculator } from './TazminatHesaplama/ReinstatementCalculator';
import { DeductionMatrixSummary } from './TazminatHesaplama/DeductionMatrixSummary';
import { ExpertReportModal } from './TazminatHesaplama/ExpertReportModal';
import { employeeService } from '../services/employeeService';
import { useAuth } from '../contexts/AuthContext';
import { 
  Scale, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  RotateCcw, 
  FileSpreadsheet, 
  Printer, 
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

export default function TazminatHesaplama() {
  const { profile } = useAuth();
  const effectiveCompanyId = profile?.company_id ?? '';

  const [activeTab, setActiveTab] = useState<CalculationMode>('severance_notice');
  const [employee, setEmployee] = useState<EmployeeDetails>(PRESET_SCENARIOS[0].employee);
  
  // Custom parameters
  const [annualLeaveUsed, setAnnualLeaveUsed] = useState<number>(PRESET_SCENARIOS[0].annualLeaveUsed || 10);
  const [overtimeHours, setOvertimeHours] = useState<number>(10);
  const [overtimeWeeks, setOvertimeWeeks] = useState<number>(50);
  const [overtimeEquity, setOvertimeEquity] = useState<number>(30);
  const [reinstatementIdleMonths, setReinstatementIdleMonths] = useState<number>(4);
  const [reinstatementNonStartMonths, setReinstatementNonStartMonths] = useState<number>(5);

  // System employee list
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        if (effectiveCompanyId) {
          const list = await employeeService.getAll(effectiveCompanyId);
          setEmployeesList(list || []);
        }
      } catch (err) {
        console.error('Employees load error:', err);
      }
    };
    loadEmployees();
  }, [effectiveCompanyId]);

  const handleSelectSystemEmployee = (empId: string) => {
    const found = employeesList.find(e => e.id === empId);
    if (!found) return;

    setEmployee({
      fullName: found.name || 'Personel',
      tcNo: found.tc_no || '',
      department: found.department || 'Genel',
      position: found.position || 'Personel',
      startDate: found.hire_date || '2021-01-01',
      endDate: new Date().toISOString().split('T')[0],
      nakedWage: parseFloat(found.salary) || 30000,
      nakedWageType: 'gross',
      dailyFood: 200,
      monthlyRoad: 2000,
      annualBonus: 0,
      otherBenefitsMonthly: 0,
      exitReason: 'İşveren Tarafından Haklı Neden Olmaksızın Fesih (Kod 04)'
    });
  };

  const handlePresetSelect = (presetId: string) => {
    const found = PRESET_SCENARIOS.find(p => p.id === presetId);
    if (!found) return;

    setEmployee(found.employee);
    if (found.annualLeaveUsed !== undefined) setAnnualLeaveUsed(found.annualLeaveUsed);
    if (found.overtimeHours !== undefined) setOvertimeHours(found.overtimeHours);
    if (found.overtimeWeeks !== undefined) setOvertimeWeeks(found.overtimeWeeks);
    if (found.overtimeEquity !== undefined) setOvertimeEquity(found.overtimeEquity);
  };

  // Perform Calculations
  const severance = calculateSeverancePay(employee);
  const notice = calculateNoticePay(employee);
  const overtime = calculateOvertimePay(employee, overtimeHours, overtimeWeeks, overtimeEquity);
  const annualLeave = calculateAnnualLeavePay(employee, annualLeaveUsed);
  const reinstatement = calculateReinstatementPay(employee, reinstatementIdleMonths, reinstatementNonStartMonths);
  const matrix = buildDeductionMatrix(severance, notice, overtime, annualLeave);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/30 rounded-2xl border border-blue-400/30 shadow-inner">
            <Scale className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">Tazminat & Bilirkişi Hesaplama Motoru</h1>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                4857 SK & SGK Uyumlu
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Kıdem, İhbar, Fazla Mesai, Yıllık İzin ve Kesinti Matrislerini resmi bilirkişi standartlarında hesaplayın.
            </p>
          </div>
        </div>

        {/* Action Button: Print/Report */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-3 rounded-2xl shadow-lg transition-all border border-blue-400/30 hover:scale-105 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Resmi Bilirkişi Raporu Oluştur (PDF)
          </button>
        </div>
      </div>

      {/* Preset Scenarios Fast Picker Bar */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Hazır Senaryo Yükle:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_SCENARIOS.map(preset => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-900 hover:bg-amber-500 hover:text-white transition-all shadow-2xs"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Employee Wage & Period Form */}
      <EmployeeWageForm 
        employee={employee}
        onChange={setEmployee}
        employeesList={employeesList}
        onSelectEmployee={handleSelectSystemEmployee}
      />

      {/* 2. Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 bg-slate-100/60 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('severance_notice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'severance_notice' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Kıdem & İhbar Tazminatı
        </button>

        <button
          onClick={() => setActiveTab('overtime')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'overtime' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Fazla Mesai Alacağı
        </button>

        <button
          onClick={() => setActiveTab('annual_leave')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'annual_leave' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Kullanılmayan Yıllık İzin
        </button>

        <button
          onClick={() => setActiveTab('reinstatement')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'reinstatement' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          İşe İade & Boşta Geçen Süre
        </button>

        <button
          onClick={() => setActiveTab('deduction_matrix')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'deduction_matrix' 
              ? 'bg-blue-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-white hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Kesinti Matrisi Tablosu
        </button>
      </div>

      {/* Tab Content Display */}
      <div>
        {activeTab === 'severance_notice' && (
          <SeveranceNoticeCalculator employee={employee} />
        )}

        {activeTab === 'overtime' && (
          <OvertimeCalculator 
            employee={employee}
            overtimeHours={overtimeHours}
            setOvertimeHours={setOvertimeHours}
            overtimeWeeks={overtimeWeeks}
            setOvertimeWeeks={setOvertimeWeeks}
            overtimeEquity={overtimeEquity}
            setOvertimeEquity={setOvertimeEquity}
          />
        )}

        {activeTab === 'annual_leave' && (
          <AnnualLeaveCalculator 
            employee={employee}
            annualLeaveUsed={annualLeaveUsed}
            setAnnualLeaveUsed={setAnnualLeaveUsed}
          />
        )}

        {activeTab === 'reinstatement' && (
          <ReinstatementCalculator 
            employee={employee}
            idleMonths={reinstatementIdleMonths}
            setIdleMonths={setReinstatementIdleMonths}
            nonStartMonths={reinstatementNonStartMonths}
            setNonStartMonths={setReinstatementNonStartMonths}
          />
        )}

        {activeTab === 'deduction_matrix' && (
          <DeductionMatrixSummary matrix={matrix} />
        )}
      </div>

      {/* Summary Footer Widget */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 border border-slate-800">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block">Hesaplanan Toplam Net Hakediş (Tüm Kalemler)</span>
          <div className="text-3xl font-black text-green-400 mt-1">
            {formatCurrency(matrix.totalNet)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Brüt Toplam: {formatCurrency(matrix.totalGross)} · Toplam Kesinti: {formatCurrency(matrix.totalDeduction)}
          </p>
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xs px-6 py-3.5 rounded-xl shadow-lg transition-all transform hover:scale-105"
        >
          <Printer className="w-4 h-4" />
          Raporu İncele ve Yazdır
        </button>
      </div>

      {/* Expert Report Modal */}
      <ExpertReportModal 
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        employee={employee}
        severance={severance}
        notice={notice}
        overtime={overtime}
        annualLeave={annualLeave}
        reinstatement={reinstatement}
        matrix={matrix}
      />
    </div>
  );
}
