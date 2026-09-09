import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, Filter, Search, Trash2, XCircle } from 'lucide-react';
import type { IzinTalebi } from '../types/izin';
import type { Employee, Department } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatIzinTuru } from '../utils/izinCalculations';

interface IzinliKisilerProps {
  izinTalepleri: IzinTalebi[];
  employees: Employee[];
  departments: Department[];
  onDeleteLeave?: (leaveId: string) => void;
  onCancelLeave?: (leaveId: string) => void;
}

const IzinliKisiler: React.FC<IzinliKisilerProps> = ({ izinTalepleri, employees, departments, onDeleteLeave, onCancelLeave }) => {
  const { profile } = useAuth();
  const userRole = profile?.role || 'employee';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  type SortField = 'name' | 'department' | 'tur' | 'start' | 'end' | 'gun';
  type SortOrder = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField>('start');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sadece onaylanmis izinleri goster
  const approvedLeaves = useMemo(() => {
    return izinTalepleri.filter(t => t.durum === 'onaylandi');
  }, [izinTalepleri]);

  const activeLeaves = useMemo(() => {
    const list = approvedLeaves.map(leave => {
      const emp = employees.find(e => e.id === leave.employeeId);
      return { ...leave, employee: emp };
    }).filter(leave => {
      if (!leave.employee) return false;
      
      const matchSearch = !searchTerm || 
        leave.employee.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchDept = selectedDept === 'all' || leave.employee.department === selectedDept;

      const startDate = new Date(leave.baslangicTarihi);
      const startMonthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
      const matchMonth = selectedMonth === 'all' || startMonthStr === selectedMonth;

      return matchSearch && matchDept && matchMonth;
    });

    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.employee?.name || '').localeCompare(b.employee?.name || '', 'tr');
          break;
        case 'department':
          cmp = (a.employee?.department || '').localeCompare(b.employee?.department || '', 'tr');
          break;
        case 'tur':
          cmp = formatIzinTuru(a.izinTuru).localeCompare(formatIzinTuru(b.izinTuru), 'tr');
          break;
        case 'start':
          cmp = (a.baslangicTarihi || '').localeCompare(b.baslangicTarihi || '');
          break;
        case 'end':
          cmp = (a.bitisTarihi || '').localeCompare(b.bitisTarihi || '');
          break;
        case 'gun':
          cmp = (a.kullanilanGun || a.gunSayisi || 0) - (b.kullanilanGun || b.gunSayisi || 0);
          break;
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [approvedLeaves, employees, searchTerm, selectedDept, selectedMonth, sortField, sortOrder]);

  const months = useMemo(() => {
    const mSet = new Set<string>();
    const currentYear = new Date().getFullYear();
    for (let m = 1; m <= 12; m++) {
      mSet.add(`${currentYear}-${String(m).padStart(2, '0')}`);
    }
    approvedLeaves.forEach(l => {
      const d = new Date(l.baslangicTarihi);
      mSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(mSet).sort().reverse().map(val => {
      const [y, m] = val.split('-');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
      const label = dateObj.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
      return { val, label };
    });
  }, [approvedLeaves]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">İzinli Kişiler Listesi</h2>
          <p className="text-sm text-gray-500 mt-1">
            Şirket genelinde onaylanmış izni bulunan personellerin güncel takvimi.
          </p>
        </div>
        <div className="p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-2 font-medium">
          <CalendarIcon className="w-5 h-5" />
          Toplam {activeLeaves.length} İzin Kaydı
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Personel ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none"
          />
        </div>
        
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tüm Departmanlar</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 min-w-[180px]">
          <CalendarIcon className="w-5 h-5 text-gray-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tüm Aylar</option>
            {months.map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'name' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Ada göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>Personel</span>
                  {sortField === 'name' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('department')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'department' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'Departmana göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>Departman</span>
                  {sortField === 'department' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('tur')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'tur' ? (sortOrder === 'asc' ? 'A → Z Sıralı' : 'Z → A Sıralı') : 'İzin türüne göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>İzin Türü</span>
                  {sortField === 'tur' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('start')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'start' ? (sortOrder === 'asc' ? 'Eskiden Yeniye' : 'Yeniden Eskiye') : 'Başlangıç tarihine göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>Başlangıç</span>
                  {sortField === 'start' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? '0-9' : '9-0'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('end')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'end' ? (sortOrder === 'asc' ? 'Eskiden Yeniye' : 'Yeniden Eskiye') : 'Bitiş tarihine göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>Bitiş</span>
                  {sortField === 'end' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? '0-9' : '9-0'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('gun')}
                className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                title={sortField === 'gun' ? (sortOrder === 'asc' ? 'Küçükten Büyüğe' : 'Büyükten Küçüğe') : 'Süreye göre sırala'}
              >
                <div className="flex items-center gap-1.5">
                  <span>Süre</span>
                  {sortField === 'gun' ? (
                    <>
                      <span className="text-blue-600 font-bold text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {sortOrder === 'asc' ? '0-9' : '9-0'}
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-300 text-xs">↕</span>
                  )}
                </div>
              </th>
              {!['employee', 'user'].includes(userRole) && <th className="px-6 py-4 text-right">İşlemler</th>}
            </tr>
          </thead>
          <tbody>
            {activeLeaves.length > 0 ? (
              activeLeaves.map((leave, idx) => (
                <tr key={leave.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{leave.employee?.name}</td>
                  <td className="px-6 py-4 text-gray-600">{leave.employee?.department}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                      {formatIzinTuru(leave.izinTuru)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(leave.baslangicTarihi).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(leave.bitisTarihi).toLocaleDateString('tr-TR')}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{leave.kullanilanGun} Gün</td>
                  {!['employee', 'user'].includes(userRole) && (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => onCancelLeave && onCancelLeave(leave.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                          title="İzni İptal Et"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteLeave && onDeleteLeave(leave.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="İzin Talebini Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={!['employee', 'user'].includes(userRole) ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-lg font-medium">İzinli personel bulunamadı</p>
                  <p className="text-sm mt-1">Seçilen kriterlere uygun onaylanmış izin kaydı yoktur.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IzinliKisiler;
