import React from 'react';
import { EmployeeDetails } from '../../types/tazminatTypes';
import { calculateAnnualLeavePay, formatCurrency } from '../../utils/tazminatCalculators';
import { Calendar, CheckCircle, Info } from 'lucide-react';

interface Props {
  employee: EmployeeDetails;
  annualLeaveUsed: number;
  setAnnualLeaveUsed: (val: number) => void;
}

export const AnnualLeaveCalculator: React.FC<Props> = ({
  employee,
  annualLeaveUsed,
  setAnnualLeaveUsed
}) => {
  const leave = calculateAnnualLeavePay(employee, annualLeaveUsed);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Kullanılmayan Yıllık İzin Ücreti Alacağı Hesabı
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            4857 SK Madde 53-59 uyarınca hizmet süresine göre hak edilen ve iş akdi feshinde ödenen izin hakkı.
          </p>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          Çıplak Brüt Maaş Üzerinden
        </span>
      </div>

      {/* Input Parameters & Statutory Rules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Statutory Earned Days */}
        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
          <span className="text-xs font-bold text-emerald-900 block">Yasal Hak Edilen İzin Süresi</span>
          <span className="text-2xl font-black text-emerald-700 block mt-1">{leave.earnedDays} Gün</span>
          <p className="text-[10px] text-emerald-800 mt-1">Kıdeme göre 4857 SK uyarınca otomatik hesaplandı.</p>
        </div>

        {/* Used Days Input */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-700 mb-1">Çalışanın Kullandığı Toplam İzin (Gün)</label>
          <input
            type="number"
            value={annualLeaveUsed}
            onChange={(e) => setAnnualLeaveUsed(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full text-sm font-bold rounded-lg border border-slate-300 px-3 py-2 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            placeholder="ör. 10"
          />
          <p className="text-[10px] text-slate-400 mt-1">İzin defterinde kayıtlı gün sayısı</p>
        </div>

        {/* Remaining Days */}
        <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-emerald-300 block">Ödenecek Kalan İzin Gün Sayısı</span>
          <span className="text-2xl font-black text-white block mt-1">{leave.remainingDays} Gün</span>
          <p className="text-[10px] text-slate-300 mt-1">Son günlük çıplak brüt maaş ile çarpılır.</p>
        </div>
      </div>

      {/* Breakdown Details Table */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">İzin Alacağı Yasal Kesinti Detayı</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200">
              <span className="text-slate-600">Günlük Çıplak Brüt Ücret (/30):</span>
              <span className="font-bold text-slate-800">{formatCurrency(leave.dailyGrossWage)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 font-bold">
              <span className="text-slate-800">Brüt İzin Ücreti ({leave.remainingDays} gün * {formatCurrency(leave.dailyGrossWage)}):</span>
              <span className="text-slate-900">{formatCurrency(leave.grossLeavePay)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between py-1.5 border-b border-slate-200 text-red-600">
              <span>SGK İşçi Payı (%14) + İşsizlik (%1):</span>
              <span className="font-bold">- {formatCurrency(leave.sgkWorkerTax + leave.unemploymentTax)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-200 text-red-600">
              <span>Gelir Vergisi (%15) + Damga Vergisi (%0,759):</span>
              <span className="font-bold">- {formatCurrency(leave.incomeTax + leave.stampTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Leave Result Footer */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shadow-md">
        <div>
          <span className="text-[10px] text-emerald-100 uppercase font-bold tracking-wider block">Net Ödenecek İzin Ücreti</span>
          <span className="text-2xl font-black">{formatCurrency(leave.netLeavePay)}</span>
        </div>
        <CheckCircle className="w-8 h-8 text-emerald-200 opacity-90" />
      </div>
    </div>
  );
};
