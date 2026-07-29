import React from 'react';
import { Plus, FileDown, FileUp } from 'lucide-react';
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
  companies: Company[];
  departments: Department[];
}

const Toolbar: React.FC<ToolbarProps> = ({
  selectedDepartment,
  onDepartmentChange,
  selectedCompany,
  onCompanyChange,
  onNewEmployee,
  onExportCSV,
  companies,
  departments
}) => {
  const { t } = useLanguage();
  const { appRole } = useAuth();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      {/* Department Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onDepartmentChange('all')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
            selectedDepartment === 'all'
              ? 'bg-blue-100 border border-blue-300 text-blue-700'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
          }`}
        >
          {t('toolbar.all')}
        </button>
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => onDepartmentChange(dept)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              selectedDepartment === dept
                ? 'bg-blue-100 border border-blue-300 text-blue-700'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {appRole === 'superadmin' && (
          <>
            <label className="text-xs text-gray-500">{t('toolbar.company')}</label>
            <select
              value={selectedCompany}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t('toolbar.all')}</option>
              {companies.map(company => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </>
        )}
        
        <button
          onClick={onNewEmployee}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg"
        >
          <Plus className="w-4 h-4" />
          {t('toolbar.newEmployee')}
        </button>
        
        <button
          onClick={onExportCSV}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <FileDown className="w-4 h-4" />
          {t('toolbar.exportCSV')}
        </button>

      </div>
    </div>
  );
};

export default Toolbar;