import React, { useState } from 'react';
import { EmployeeDetails } from '../../types/tazminatTypes';
import { calculateSeverancePay, calculateNoticePay, formatCurrency } from '../../utils/tazminatCalculators';
import { HISTORICAL_SEVERANCE_CEILINGS } from '../../data/statutoryData';
import { ShieldCheck, Info, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  employee: EmployeeDetails;
}

export const SeveranceNoticeCalculator: React.FC<Props> = ({ employee }) => {
  const [customCeiling, setCustomCeiling] = useState<number | undefined>(undefined);

  const severance = calculateSeverancePay(employee, customCeiling);
  const notice = calculateNoticePay(employee);

  return (
    <div className="space-y-6">
      {/* Worked Duration Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-300 tracking-wider uppercase block">Toplam Çalışma ve Hizmet Süresi</span>
          <h3 className="text-2xl font-black text-white mt-1">
            {severance.workedYears} Yıl {severance.workedMonths} Ay {severance.workedDays} Gün
          </h3>
          <p className="text-xs text-slate-300 mt-1">
            Toplam Takvim Günü: <span className="font-bold text-amber-300">{severance.totalDaysWorked} Gün</span>
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 text-right min-w-[200px]">
          <span className="text-[10px] text-slate-300 block">Kıdem Hesabına Esas Maaş</span>
          <span className="text-lg font-bold text-green-300">{formatCurrency(Math.min(severance.clothedGrossWage, severance.applicableCeiling))}</span>
          {severance.ceilingApplied && (
            <span className="block text-[10px] text-amber-300 font-medium mt-0.5">⚠️ Kıdem Tavanına Takıldı</span>
          )}
        </div>
      </div>

      {/* Grid: Severance Card & Notice Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 🛡️ KIDEM TAZMİNATI CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                Kıdem Tazminatı Hesabı
              </h3>
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                1475 SK M.14
              </span>
            </div>

            {/* Ceiling Config Option */}
            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">Uygulanan Kıdem Tavanı:</span>
              <div className="flex items-center gap-2">
                <select
                  value={customCeiling ?? severance.applicableCeiling}
                  onChange={(e) => setCustomCeiling(parseFloat(e.target.value))}
                  className="border border-slate-300 rounded-lg px-2 py-1 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                >
                  {HISTORICAL_SEVERANCE_CEILINGS.map(c => (
                    <option key={`${c.year}-${c.period}`} value={c.ceiling}>
                      {c.year} {c.period} ({formatCurrency(c.ceiling)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Calculation Breakdown Table */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Giydirilmiş Brüt Maaş:</span>
                <span className="font-bold text-slate-800">{formatCurrency(severance.clothedGrossWage)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Dönem Kıdem Tavanı:</span>
                <span className="font-bold text-slate-800">{formatCurrency(severance.applicableCeiling)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold bg-blue-50/50 px-2 rounded">
                <span className="text-blue-900">Hesaba Esas Aylık Tutar:</span>
                <span className="font-extrabold text-blue-900">{formatCurrency(Math.min(severance.clothedGrossWage, severance.applicableCeiling))}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Brüt Kıdem Tazminatı:</span>
                <span className="font-bold text-slate-900">{formatCurrency(severance.grossSeverance)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-red-600">
                <span>Damga Vergisi (%0,759):</span>
                <span className="font-bold">- {formatCurrency(severance.stampTax)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-500 text-[11px]">
                <span>Gelir Vergisi Kesintisi:</span>
                <span className="font-bold text-green-600">MUAF (%0)</span>
              </div>
            </div>
          </div>

          {/* Net Result Footer */}
          <div className="mt-4 p-4 rounded-xl bg-blue-600 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold tracking-wider block">Net Ödenecek Kıdem</span>
              <span className="text-xl font-black">{formatCurrency(severance.netSeverance)}</span>
            </div>
            <ShieldCheck className="w-8 h-8 text-blue-300 opacity-80" />
          </div>
        </div>

        {/* ⏱️ İHBAR TAZMİNATI CARD */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                İhbar Tazminatı Hesabı
              </h3>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                4857 SK M.17
              </span>
            </div>

            {/* Notice Period Badge */}
            <div className="mb-4 bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 text-xs flex items-center justify-between">
              <span className="font-semibold text-indigo-900">Hak Edilen İhbar Öneli:</span>
              <span className="text-sm font-black text-indigo-700 bg-white px-3 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                {notice.noticeWeeks} Hafta ({notice.noticeWeeks * 7} Gün)
              </span>
            </div>

            {/* Notice Calculation Breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Haftalık Giydirilmiş Maaş:</span>
                <span className="font-bold text-slate-800">{formatCurrency(severance.clothedGrossWage / 4.3333)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 font-semibold">
                <span className="text-slate-700">Brüt İhbar Tazminatı:</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(notice.grossNotice)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-red-600">
                <span>Gelir Vergisi Kesintisi (%15):</span>
                <span className="font-bold">- {formatCurrency(notice.incomeTax)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 text-red-600">
                <span>Damga Vergisi (%0,759):</span>
                <span className="font-bold">- {formatCurrency(notice.stampTax)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-500 text-[11px]">
                <span>Toplam Yasal Kesinti:</span>
                <span className="font-bold text-red-600">- {formatCurrency(notice.totalTax)}</span>
              </div>
            </div>
          </div>

          {/* Net Result Footer */}
          <div className="mt-4 p-4 rounded-xl bg-indigo-700 text-white flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider block">Net Ödenecek İhbar</span>
              <span className="text-xl font-black">{formatCurrency(notice.netNotice)}</span>
            </div>
            <Clock className="w-8 h-8 text-indigo-300 opacity-80" />
          </div>
        </div>
      </div>
    </div>
  );
};
