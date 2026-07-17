import React, { useState, useRef, useEffect } from 'react';
import { CreditCard as Edit, Trash2, Phone, Eye, FileDown, ChevronDown } from 'lucide-react';
import { Employee } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface EmployeeTableProps {
  employees: Employee[];
  onEmployeeClick: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onEmployeeActionSelect?: (employee: Employee, action: 'gorev' | 'bordro' | 'izin') => void;
}

const EmployeeTable: React.FC<EmployeeTableProps> = ({
  employees,
  onEmployeeClick,
  onDeleteEmployee,
  onEmployeeActionSelect
}) => {
  const { t } = useLanguage();
  const { appRole } = useAuth();
  const showSalary = appRole !== 'manager';
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-50 border-green-200 text-green-700',
      onLeave: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      inactive: 'bg-red-50 border-red-200 text-red-700'
    };
    const labels = {
      active: t('status.active'),
      onLeave: t('status.onLeave'),
      inactive: t('status.inactive')
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs border ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getInitials = (name: string) => {
    const safeName = String(name ?? '').trim();
    if (!safeName) return '?';
    return safeName
      .split(/\s+/)
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="overflow-x-auto min-h-[350px]">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.company')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.department')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.position')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan Tipi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.level')}</th>
              {showSalary && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.salary')}</th>}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.mobile')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {employees.map((employee, index) => (
              <tr 
                key={employee.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEmployeeClick(employee)}
              >
                <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3 relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex items-center justify-center text-xs text-gray-600">
                      {getInitials(employee.name)}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === employee.id ? null : employee.id);
                      }}
                      className="flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 transition-colors"
                    >
                      {employee.name}
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {openMenuId === employee.id && (
                      <div
                        ref={menuRef}
                        className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'gorev');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          Görev Tanımı
                        </button>
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'bordro');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          Bordro
                        </button>
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'izin');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          İzin Yönetimi
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.company}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.department}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{employee.position}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs border ${employee.employeeType === 'emekli' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                    {employee.employeeType === 'emekli' ? 'Emekli' : 'Normal Çalışan'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.level}</td>
                {showSalary && (
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">
                    {employee.salary.toLocaleString('tr-TR')} ₺
                  </td>
                )}
                <td className="px-4 py-3">
                  {getStatusBadge(employee.status)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEmployeeClick(employee)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('table.view')}
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {appRole !== 'employee' && appRole !== 'user' && (
                        <button
                          onClick={() => onEmployeeClick(employee)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={t('table.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    <button
                      onClick={() => {
                        const csvContent = [
                          ['Ad Soyad', 'Şirket', 'Departman', 'Pozisyon', 'Seviye', 'Ücret', 'Durum', 'Telefon', 'Email'].join(','),
                          [employee.name, employee.company, employee.department, employee.position, employee.level, employee.salary, employee.status, employee.phone, employee.email].join(',')
                        ].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `${employee.name.replace(/\s+/g, '_')}_bilgileri.csv`);
                        link.style.visibility = 'hidden';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title={t('table.download')}
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteEmployee(employee.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title={t('table.delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeTable;