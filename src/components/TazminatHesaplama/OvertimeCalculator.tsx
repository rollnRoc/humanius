import React, { useState } from 'react';
import { EmployeeDetails } from '../../types/tazminatTypes';
import { calculateOvertimePay, formatCurrency } from '../../utils/tazminatCalculators';
import { Clock, Percent, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  employee: EmployeeDetails;
  overtimeHours: number;
  setOvertimeHours: (val: number) => void;
  overtimeWeeks: number;
  setOvertimeWeeks: (val: number) => void;
  overtimeEquity: number;
  setOvertimeEquity: (val: number) => void;
}

export const OvertimeCalculator: React.FC<Props> = ({
  employee,
  overtimeHours,
  setOvertimeHours,
  overtimeWeeks,
  setOvertimeWeeks,
  overtimeEquity,
  setOvertimeEquity
}) => {
  const overtime = calculateOvertimePay(employee, overtimeHours, overtimeWeeks, overtimeEquity);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            Fazla Çalışma (Fazla Mesai) Alacağı Hesabı
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4857 SK Madde 41 uyarınca haftalık 45 saati aşan %50 zamlı çalışmalar ve Yargıtay Hakkaniyet İndirimi.
          </p>
        </div>
        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
          %50 Zamlı Saatlik Ücret
        </span>
      </div>

      {/* Input Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overtime Hours per Week */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1">Haftalık Ort. Fazla Mesai (Saat)</label>
          <input
            type="number"
            value={overtimeHours}
            onChange={(e) => setOvertimeHours(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            placeholder="ör. 10"
          />
          <p className="text-[10px] text-slate-400 mt-1">Haftada 45 saatin üzerindeki süre</p>
        </div>

        {/* Total Overtime Weeks */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1">Mesai Yapılan Toplam Hafta Sayısı</label>
          <input
            type="number"
            value={overtimeWeeks}
            onChange={(e) => setOvertimeWeeks(Math.max(0, parseFloat(e.target.value) || 0))}
            className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
            placeholder="ör. 50"
          />
          <p className="text-[10px] text-slate-400 mt-1">Yılda yaklaşık 52 çalışma haftası</p>
        </div>

        {/* Equity Discount (Yargıtay İndirimi) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-amber-600" /> Yargıtay Hakkaniyet İndirimi (%)
          </label>
          <select
            value={overtimeEquity}
            onChange={(e) => setOvertimeEquity(parseFloat(e.target.value))}
            className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value={0}>%0 (İndirim Yapılmayacak)</option>
            <option value={20}>%20 Hakkaniyet İndirimi</option>
            <option value={30}>%30 Yargıtay Standart İndirimi (Tavsiye Edilen)</option>
            <option value={40}>%40 Hakkaniyet İndirimi</option>
            <option value={50}>%50 Yüksek İndirim</option>
          </select>
          <p className="text-[10px] text-amber-700 font-medium mt-1">Tanık beyanına dayalı mesaide %30 uygulanır.</p>
        </div>
      </div>

      {/* Calculation Results Table */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fazla Çalışma Hesaplama Detayı</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-600">Saatlik Giydirilmiş Maaş (/225):</span>
              <span className="font-bold text-slate-800">{formatCurrency(overtime.hourlyRate)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-600">%50 Zamlı Mesai Saat Ücreti:</span>
              <span className="font-bold text-amber-700">{formatCurrency(overtime.hourlyRate * 1.5)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-600">Toplam Mesai Saati ({overtimeHours} s/hf * {overtimeWeeks} hf):</span>
              <span className="font-bold text-slate-900">{overtimeHours * overtimeWeeks} Saat</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-600">Ham Brüt Fazla Mesai Tutarı:</span>
              <span className="font-bold text-slate-900">{formatCurrency(overtime.totalBaseOvertime)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 text-amber-800 font-medium">
              <span>Hakkaniyet İndirimi (%{overtimeEquity}):</span>
              <span className="font-bold">- {formatCurrency(overtime.equityDiscountAmount)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 bg-amber-50 px-2 rounded font-bold">
              <span className="text-amber-900">İndirim Sonrası Brüt Mesai:</span>
              <span className="text-amber-900">{formatCurrency(overtime.grossOvertimeAfterEquity)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 text-red-600">
              <span>SGK İşçi & İşsizlik Payı (%15):</span>
              <span className="font-bold">- {formatCurrency(overtime.sgkWorkerTax + overtime.unemploymentTax)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 text-red-600">
              <span>Gelir & Damga Vergisi (%15 + %0,759):</span>
              <span className="font-bold">- {formatCurrency(overtime.incomeTax + overtime.stampTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Overtime Result Footer */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-amber-100 uppercase font-bold tracking-wider block">Net Ele Geçen Fazla Çalışma Ücreti</span>
          <span className="text-2xl font-black">{formatCurrency(overtime.netOvertime)}</span>
        </div>
        <CheckCircle2 className="w-8 h-8 text-amber-200 opacity-90" />
      </div>
    </div>
  );
};
