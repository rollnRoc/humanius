import React, { useState } from 'react';
import { FileText, Calculator } from 'lucide-react';
import BordroCalculator from './BordroCalculator';
import BordroList from './BordroList';
import { Employee } from '../types';
import { BordroItem } from '../types/bordro';
import { useAuth } from '../contexts/AuthContext';

interface BordroMainProps {
  employees: Employee[];
  onSaveBordro: (bordro: BordroItem) => void;
  bordrolar?: BordroItem[];
  onEdit?: (bordro: BordroItem) => void;
  onDelete?: (id: string) => void;
  onView?: (bordro: BordroItem) => void;
  onImport?: (bordrolar: Partial<BordroItem>[]) => void;
  onSendForApproval?: (bordro: BordroItem) => void;
}

export default function BordroMain({
  employees,
  onSaveBordro,
  bordrolar = [],
  onEdit = () => {},
  onDelete = () => {},
  onView = () => {},
  onImport = () => {},
  onSendForApproval = () => {}
}: BordroMainProps) {
  const { profile, appRole } = useAuth();
  const isSuper = profile?.role === 'superadmin' || appRole === 'superadmin';

  const [activeTab, setActiveTab] = useState<'normal' | 'emekli'>('normal');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Sadece seçili personelin bordroları ve süper yönetici gizliliği
  const employeeBordrolar = bordrolar.filter(b => {
    const bName = String(b.employeeName || (b as any).employees?.name || '').toLowerCase();
    const isSuperAdminBordro = 
      (b as any).role === 'superadmin' || 
      bName.includes('süper admin') || 
      bName.includes('bhv test');

    if (!isSuper && isSuperAdminBordro) return false;

    if (!selectedEmployee) return true;
    return b.employee_id === selectedEmployee.id || b.employeeName === selectedEmployee.name;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Personel Bilgileri</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personel Seçin</label>
            <select
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const employee = employees.find(emp => emp.id === e.target.value);
                setSelectedEmployee(employee || null);
              }}
              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Personel Seçiniz</option>
              {employees.map(employee => {
                const isEmpEmekli = employee.employeeType === 'emekli' || (employee as any).employee_type === 'emekli';
                return (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department} {isEmpEmekli ? ' (Emekli)' : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bordro Dönemi</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personel Tipi</label>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('normal')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === 'normal'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Normal
              </button>
              <button
                onClick={() => setActiveTab('emekli')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                  activeTab === 'emekli'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Calculator className="w-4 h-4" />
                Emekli (SGDP)
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        {!selectedEmployee ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Personel Seçiniz</h3>
            <p className="text-gray-500">Bordro hesaplaması için önce bir personel seçmelisiniz</p>
          </div>
        ) : activeTab === 'normal' ? (
          <div className="space-y-6">
            <BordroCalculator
              employees={employees}
              onSaveBordro={onSaveBordro}
              onSendForApproval={onSendForApproval}
              selectedEmployee={selectedEmployee}
              period={period}
              isEmekli={false}
            />
            <BordroList
              bordrolar={employeeBordrolar}
              employees={employees}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onImport={onImport}
              onSendForApproval={onSendForApproval}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Emekli Çalışan Bordro Modu (SGDP: %7.5 İşçi Primi, %24.5 İşveren Primi)
              </span>
              <span className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg">Aktif SGDP Rejimi</span>
            </div>
            <BordroCalculator
              employees={employees}
              onSaveBordro={onSaveBordro}
              onSendForApproval={onSendForApproval}
              selectedEmployee={selectedEmployee}
              period={period}
              isEmekli={true}
            />
            <BordroList
              bordrolar={employeeBordrolar}
              employees={employees}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
              onImport={onImport}
              onSendForApproval={onSendForApproval}
            />
          </div>
        )}
      </div>
    </div>
  );
}
