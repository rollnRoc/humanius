import React from 'react';
import { EmployeeDetails } from '../../types/tazminatTypes';
import { calculateReinstatementPay, formatCurrency } from '../../utils/tazminatCalculators';
import { Scale, RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  employee: EmployeeDetails;
  idleMonths: number;
  setIdleMonths: (val: number) => void;
  nonStartMonths: number;
  setNonStartMonths: (val: number) => void;
}

export const ReinstatementCalculator: React.FC<Props> = ({
  employee,
  idleMonths,
  setIdleMonths,
  nonStartMonths,
  setNonStartMonths
}) => {
  const reinstatement = calculateReinstatementPay(employee, idleMonths, nonStartMonths);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-600" />
            İşe İade & Boşta Geçen Süre Tazminatları Hesabı
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4857 SK Madde 20-21 uyarınca Mahkeme / Arabuluculuk kararıyla hükmedilen işe iade alacakları.
          </p>
        </div>
        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
          Mahkeme Kararı Uyumlu
        </span>
      </div>

      {/* Input Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Idle Months */}
        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100">
          <label className="block text-xs font-bold text-purple-900 mb-1">Boşta Geçen Süre Ücreti (Ay)</label>
          <select
            value={idleMonths}
            onChange={(e) => setIdleMonths(parseInt(e.target.value))}
            className="w-full text-sm font-bold rounded-lg border border-purple-200 px-3 py-2 bg-white text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value={1}>1 Aylık Boşta Geçen Süre</option>
            <option value={2}>2 Aylık Boşta Geçen Süre</option>
            <option value={3}>3 Aylık Boşta Geçen Süre</option>
            <option value={4}>4 Aylık Boşta Geçen Süre (Yasal Üst Sınır)</option>
          </select>
          <p className="text-[10px] text-purple-800 mt-1">Giydirilmiş brüt ücret üzerinden hesaplanır (SGK, Gelir & Damga Vergili).</p>
        </div>

        {/* Non-Start Months */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1">İşe Başlatmama Tazminatı (Ay)</label>
          <select
            value={nonStartMonths}
            onChange={(e) => setNonStartMonths(parseInt(e.target.value))}
            className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            <option value={4}>4 Aylık Ücret Tutarı</option>
            <option value={5}>5 Aylık Ücret Tutarı</option>
            <option value={6}>6 Aylık Ücret Tutarı</option>
            <option value={7}>7 Aylık Ücret Tutarı</option>
            <option value={8}>8 Aylık Ücret Tutarı (Yasal Üst Sınır)</option>
          </select>
          <p className="text-[10px] text-slate-500 mt-1">Çıplak brüt maaş üzerinden hesaplanır (SGK ve Gelir Vergisinden Muaf, Sadece Damga V.).</p>
        </div>
      </div>

      {/* Calculation Summary Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="font-bold text-slate-800 block text-xs border-b border-slate-200 pb-1">1. Boşta Geçen Süre Ücreti Detayı</span>
          <div className="flex justify-between">
            <span className="text-slate-600">Brüt Tutar ({idleMonths} ay):</span>
            <span className="font-bold text-slate-800">{formatCurrency(reinstatement.idleGrossPay)}</span>
          </div>
          <div className="flex justify-between text-purple-900 font-bold bg-purple-50 p-1.5 rounded">
            <span>Net Boşta Geçen Süre Ücreti:</span>
            <span>{formatCurrency(reinstatement.idleNetPay)}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
          <span className="font-bold text-slate-800 block text-xs border-b border-slate-200 pb-1">2. İşe Başlatmama Tazminatı Detayı</span>
          <div className="flex justify-between">
            <span className="text-slate-600">Brüt Tutar ({nonStartMonths} ay):</span>
            <span className="font-bold text-slate-800">{formatCurrency(reinstatement.nonStartGrossPay)}</span>
          </div>
          <div className="flex justify-between text-purple-900 font-bold bg-purple-50 p-1.5 rounded">
            <span>Net İşe Başlatmama Tazminatı:</span>
            <span>{formatCurrency(reinstatement.nonStartNetPay)}</span>
          </div>
        </div>
      </div>

      {/* Net Total Reinstatement Result */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-900 text-white flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-purple-200 uppercase font-bold tracking-wider block">Toplam Net İşe İade Alacakları Tutarı</span>
          <span className="text-2xl font-black">{formatCurrency(reinstatement.totalNetReinstatement)}</span>
        </div>
        <Scale className="w-8 h-8 text-purple-300 opacity-90" />
      </div>
    </div>
  );
};
