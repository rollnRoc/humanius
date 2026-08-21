import React from 'react';
import { Plus, FileDown, Search, X } from 'lucide-react';
import { Company, Department } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface ToolbarProps {
  selectedDepartment: string;
  onDepartmentChange: (dept: string) => void;
  selectedCompany: string;
  onCompanyChange: (company: string) => void;
  onNewEmployee: () => void;
  onExportCSV: () => void;
  onImportExcel?: () => void;
  companies: Company[];
  departments: Department[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  totalResultCount?: number;
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedDepartment,
  onDepartmentChange,
  selectedCompany,
  onCompanyChange,
  onNewEmployee,
  onExportCSV,
  onImportExcel,
  companies,
  departments,
  searchTerm = '',
  onSearchChange,
  totalResultCount
}) => {
  const { t } = useLanguage();
  const { appRole } = useAuth();

  return (
    <div className="space-y-3 mb-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Global Multi-Column Search Input & Search Button */}
        <div className="flex items-center gap-2 flex-1 min-w-[300px] max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Personel ara (Ad, Soyad, TC, Telefon, Pozisyon...)"
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium placeholder:text-gray-400 text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
            />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange?.('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                title="Aramayı Temizle"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Ara</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {appRole === 'superadmin' && (
            <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
              <label className="text-xs text-gray-500 font-medium">{t('toolbar.company')}:</label>
              <select
                value={selectedCompany}
                onChange={(e) => onCompanyChange(e.target.value)}
                className="bg-transparent text-gray-800 text-sm font-semibold outline-none cursor-pointer"
              >
                <option value="all">{t('toolbar.all')}</option>
                {companies.map(company => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <button
            onClick={onNewEmployee}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('toolbar.newEmployee')}
          </button>

          {onImportExcel && (
            <button
              onClick={onImportExcel}
              className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm cursor-pointer"
              title="Excel veya CSV dosyasından toplu personel aktarımı yapın"
            >
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>Excel'den Aktar</span>
            </button>
          )}
          
          <button
            onClick={onExportCSV}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all text-sm cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-gray-500" />
            {t('toolbar.exportCSV')}
          </button>
        </div>
      </div>

      {/* Department Filter Pills & Active Search Info */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => onDepartmentChange('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              selectedDepartment === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {t('toolbar.all')}
          </button>
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => onDepartmentChange(dept)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedDepartment === dept
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {searchTerm && (
          <div className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span>Arama sonucu: <strong>{totalResultCount ?? 0}</strong> personel bulundu</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;