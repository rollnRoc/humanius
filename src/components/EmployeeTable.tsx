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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [employees]);

  const totalPages = Math.ceil(employees.length / pageSize) || 1;
  const paginatedEmployees = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return employees.slice(start, start + pageSize);
  }, [employees, currentPage, pageSize]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSystemRoleBadge = (role?: string) => {
    switch (role) {
      case 'superadmin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">👑 Süper Yönetici</span>;
      case 'admin':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">🛡️ Şirket Yöneticisi</span>;
      case 'hr':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">👥 İK Uzmanı</span>;
      case 'manager':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">👔 Birim Amiri</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">👤 Personel</span>;
    }
  };

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
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sistem Rolü</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışan Tipi</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.mobile')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedEmployees.map((employee, index) => (
              <tr 
                key={employee.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onEmployeeClick(employee)}
              >
                <td className="px-4 py-3 text-sm text-gray-500">{(currentPage - 1) * pageSize + index + 1}</td>
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
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {/* Hızlı Aksiyonlar Menüsü */}
                    {openMenuId === employee.id && (
                      <div
                        ref={menuRef}
                        className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 min-w-[200px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            onEmployeeClick(employee);
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                        >
                          <Eye className="w-3.5 h-3.5" /> Özlük Kartını Gör
                        </button>
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'gorev');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                        >
                          ✏️ Görev Tanımı Oluştur
                        </button>
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'bordro');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                        >
                          💰 Bordro Hesapla
                        </button>
                        <button
                          onClick={() => {
                            onEmployeeActionSelect?.(employee, 'izin');
                            setOpenMenuId(null);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 flex items-center gap-2"
                        >
                          📅 İzin Talebi Aç
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.company}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.department || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{employee.position || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {getSystemRoleBadge(employee.role)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {employee.employeeType === 'emekli' || (employee as any).employee_type === 'emekli' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Emekli (SGDP)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      Normal (SGK)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{getStatusBadge(employee.status)}</td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {employee.phone ? (
                    <a 
                      href={`tel:${employee.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors whitespace-nowrap"
                    >
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{employee.phone}</span>
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEmployeeClick(employee)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title={t('table.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const row = [
                          employee.name,
                          employee.company,
                          employee.department,
                          employee.position,
                          employee.status,
                          employee.phone || ''
                        ];
                        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + row.join(';') + "\n";
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const link = document.createElement('a');
                        const url = URL.createObjectURL(blob);
                        link.setAttribute('href', url);
                        link.setAttribute('download', `${employee.name.replace(/\s+/g, '_')}_bilgileri.csv`);
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

      {/* Pagination Footer */}
      {employees.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-600">
          <div>
            Toplam <strong>{employees.length}</strong> kayıttan <strong>{(currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, employees.length)}</strong> arası gösteriliyor
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Sayfa Başı:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Önceki
              </button>
              <span className="px-2 font-semibold text-gray-800">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-40"
              >
                Sonraki
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeTable;