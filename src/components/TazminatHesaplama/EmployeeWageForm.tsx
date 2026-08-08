import React from 'react';
import { EmployeeDetails } from '../../types/tazminatTypes';
import { calculateClothedWage, formatCurrency } from '../../utils/tazminatCalculators';
import { User, Calendar, DollarSign, Utensils, Bus, Gift, PlusCircle } from 'lucide-react';

interface Props {
  employee: EmployeeDetails;
  onChange: (updated: EmployeeDetails) => void;
  employeesList?: any[];
  onSelectEmployee?: (empId: string) => void;
}

export const EmployeeWageForm: React.FC<Props> = ({ 
  employee, 
  onChange,
  employeesList = [],
  onSelectEmployee
}) => {
  const handleChange = (field: keyof EmployeeDetails, value: any) => {
    onChange({ ...employee, [field]: value });
  };

  const { nakedGross, clothedGross } = calculateClothedWage(employee);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Personel Çalışma & Maaş Bilgileri
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hizmet süresi, brüt/net ücret ve giydirilmiş maaş kalemlerini belirleyin.
          </p>
        </div>

        {/* Existing Employee Quick Picker */}
        {employeesList && employeesList.length > 0 && onSelectEmployee && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Sistemden Kişi Seç:</span>
            <select
              onChange={(e) => e.target.value && onSelectEmployee(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-800 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">-- Mevcut Personel Seçin --</option>
              {employeesList.map(e => (
                <option key={e.id} value={e.id}>{e.name} ({e.position || 'Personel'})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Form Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Adı Soyadı</label>
          <input
            type="text"
            value={employee.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="ör. Ahmet Yılmaz"
          />
        </div>

        {/* TC No */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">T.C. Kimlik No</label>
          <input
            type="text"
            maxLength={11}
            value={employee.tcNo || ''}
            onChange={(e) => handleChange('tcNo', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="11 haneli T.C."
          />
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Departman</label>
          <input
            type="text"
            value={employee.department}
            onChange={(e) => handleChange('department', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="ör. Üretim"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Pozisyon / Görev</label>
          <input
            type="text"
            value={employee.position}
            onChange={(e) => handleChange('position', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="ör. Kıdemli Mühendis"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-blue-600" /> İşe Giriş Tarihi
          </label>
          <input
            type="date"
            value={employee.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-red-600" /> İşten Çıkış Tarihi
          </label>
          <input
            type="date"
            value={employee.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Naked Wage */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-green-600" /> Çıplak Maaş Tutarı
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={employee.nakedWage || ''}
              onChange={(e) => handleChange('nakedWage', parseFloat(e.target.value) || 0)}
              className="flex-1 text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-800"
              placeholder="0.00"
            />
            <select
              value={employee.nakedWageType}
              onChange={(e) => handleChange('nakedWageType', e.target.value as any)}
              className="text-xs font-bold border border-slate-300 rounded-xl px-2 bg-slate-100 text-slate-700"
            >
              <option value="gross">BRÜT</option>
              <option value="net">NET</option>
            </select>
          </div>
        </div>

        {/* Exit Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">İşten Çıkış Nedeni (Kod)</label>
          <select
            value={employee.exitReason}
            onChange={(e) => handleChange('exitReason', e.target.value)}
            className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium"
          >
            <option value="İşveren Tarafından Haklı Neden Olmaksızın Fesih (Kod 04)">Kod 04: İşveren Haklı Neden Olmaksızın Fesih</option>
            <option value="Çalışan Haklı Nedenle Fesih (Kod 25)">Kod 25: Çalışan Haklı Nedenle Fesih</option>
            <option value="Emeklilik (Kod 08)">Kod 08: Emeklilik Nedeniyle Ayrılma</option>
            <option value="Askerlik (Kod 14)">Kod 14: Askerlik Nedeniyle Ayrılma</option>
            <option value="Evlilik (Kadın Çalışan - Kod 13)">Kod 13: Kadın Çalışan Evlilik</option>
            <option value="İstifa / Kendi İsteğiyle Ayrılma (Kod 03)">Kod 03: İstifa (İhbar Önel Uyumlu)</option>
          </select>
        </div>
      </div>

      {/* Clothed Wage Components (Giydirilmiş Ücret Eklentileri) */}
      <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <PlusCircle className="w-4 h-4 text-blue-600" />
          Aylık Giydirilmiş Ücret Eklentileri (Sosyal Yardım & İkramiyeler)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Food */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Utensils className="w-3 h-3 text-amber-500" /> Günlük Yemek Yardımı (TL)
            </label>
            <input
              type="number"
              value={employee.dailyFood || ''}
              onChange={(e) => handleChange('dailyFood', parseFloat(e.target.value) || 0)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            <p className="text-[10px] text-slate-400 mt-1">Aylık Payı: {formatCurrency((employee.dailyFood || 0) * 30)}</p>
          </div>

          {/* Road */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Bus className="w-3 h-3 text-indigo-500" /> Aylık Yol / Ulaşım Desteği
            </label>
            <input
              type="number"
              value={employee.monthlyRoad || ''}
              onChange={(e) => handleChange('monthlyRoad', parseFloat(e.target.value) || 0)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            <p className="text-[10px] text-slate-400 mt-1">Aylık Net/Brüt Tutar</p>
          </div>

          {/* Bonus */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Gift className="w-3 h-3 text-purple-500" /> Yıllık Toplam İkramiye / Prim
            </label>
            <input
              type="number"
              value={employee.annualBonus || ''}
              onChange={(e) => handleChange('annualBonus', parseFloat(e.target.value) || 0)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            <p className="text-[10px] text-slate-400 mt-1">Aylık Payı (/12): {formatCurrency((employee.annualBonus || 0) / 12)}</p>
          </div>

          {/* Other */}
          <div className="bg-white p-3 rounded-lg border border-slate-200">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Diğer Aylık Yan Haklar</label>
            <input
              type="number"
              value={employee.otherBenefitsMonthly || ''}
              onChange={(e) => handleChange('otherBenefitsMonthly', parseFloat(e.target.value) || 0)}
              className="w-full text-xs font-semibold rounded-lg border border-slate-300 px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="0.00"
            />
            <p className="text-[10px] text-slate-400 mt-1">Yakacak, Bayram vb.</p>
          </div>
        </div>
      </div>

      {/* Clothed Wage Summary Display */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-900 to-slate-900 text-white shadow-md">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 block">Hesaplamaya Esas Taban Ücretler</span>
          <div className="flex flex-wrap gap-4 mt-1">
            <span>Çıplak Brüt: <strong className="text-amber-300">{formatCurrency(nakedGross)}</strong></span>
            <span className="text-slate-400">|</span>
            <span>Giydirilmiş Brüt Ücret: <strong className="text-green-400 text-sm">{formatCurrency(clothedGross)}</strong></span>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] font-bold px-3 py-1 rounded-full">
            T.C. İş Kanunu Uyumlu
          </span>
        </div>
      </div>
    </div>
  );
};
