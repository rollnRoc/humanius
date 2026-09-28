import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Filter,
  CheckSquare,
  Square,
  Search,
  Building2,
  Users,
  Briefcase,
  Shield,
  RotateCcw,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { Employee, Company, Department } from '../types';

interface EmployeeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  companies?: Company[];
  departments?: Department[];
}

interface ColumnOption {
  key: string;
  label: string;
  category: 'kimlik' | 'is' | 'iletisim' | 'adres';
  defaultSelected: boolean;
}

const AVAILABLE_COLUMNS: ColumnOption[] = [
  { key: 'name', label: 'Adı Soyadı', category: 'kimlik', defaultSelected: true },
  { key: 'tc_no', label: 'TC Kimlik No', category: 'kimlik', defaultSelected: true },
  { key: 'sicil_no', label: 'Personel Sicil No', category: 'kimlik', defaultSelected: true },
  { key: 'is_yeri_sgk_sicil_no', label: 'İş Yeri SGK Sicil No', category: 'kimlik', defaultSelected: true },
  { key: 'birth_date', label: 'Doğum Tarihi', category: 'kimlik', defaultSelected: false },
  
  { key: 'company', label: 'Şirket', category: 'is', defaultSelected: true },
  { key: 'department', label: 'Departman', category: 'is', defaultSelected: true },
  { key: 'position', label: 'Pozisyon', category: 'is', defaultSelected: true },
  { key: 'role', label: 'Sistem Rolü', category: 'is', defaultSelected: true },
  { key: 'employee_type', label: 'Çalışan Tipi', category: 'is', defaultSelected: true },
  { key: 'status', label: 'Durum', category: 'is', defaultSelected: true },
  { key: 'join_date', label: 'İşe Giriş Tarihi', category: 'is', defaultSelected: true },

  { key: 'phone', label: 'Telefon', category: 'iletisim', defaultSelected: true },
  { key: 'email', label: 'Kurumsal E-posta', category: 'iletisim', defaultSelected: true },
  { key: 'contact_email', label: 'Kişisel E-posta', category: 'iletisim', defaultSelected: false },

  { key: 'il', label: 'İkamet İli', category: 'adres', defaultSelected: true },
  { key: 'ilce', label: 'İkamet İlçesi', category: 'adres', defaultSelected: true },
  { key: 'address', label: 'Açık Adres', category: 'adres', defaultSelected: false },
];

export const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({
  isOpen,
  onClose,
  employees,
  companies = [],
  departments = [],
}) => {
  // Filtre State'leri
  const [selectedSgkSicil, setSelectedSgkSicil] = useState<string>('all');
  const [customSgkQuery, setCustomSgkQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sütun Seçim State'i
  const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      init[col.key] = col.defaultSelected;
    });
    return init;
  });

  // Mevcut benzersiz İş Yeri SGK Sicil Numaraları
  const uniqueSgkSicilList = useMemo(() => {
    const list = new Set<string>();
    employees.forEach((e) => {
      const val = (e.is_yeri_sgk_sicil_no || (e as any).isYeriSgkSicilNo || '').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [employees]);

  // Mevcut benzersiz Departmanlar (string, object ve employee verilerinden harmanlanmış)
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d: any) => {
      const name = typeof d === 'string' ? d : d?.name || d?.id || '';
      if (name && String(name).trim()) set.add(String(name).trim());
    });
    employees.forEach((e) => {
      const dept = (e.department || (e as any).department_name || '').trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [departments, employees]);

  // Mevcut benzersiz Pozisyonlar
  const uniquePositions = useMemo(() => {
    const list = new Set<string>();
    employees.forEach((e) => {
      const val = (e.position || '').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [employees]);

  // Filtrelenmiş Personel Listesi
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const isYeriSgk = (emp.is_yeri_sgk_sicil_no || (emp as any).isYeriSgkSicilNo || '').trim();
      
      // 1. İş Yeri SGK Sicil No Filtresi
      if (selectedSgkSicil !== 'all') {
        if (selectedSgkSicil === 'empty') {
          if (isYeriSgk !== '') return false;
        } else if (isYeriSgk !== selectedSgkSicil) {
          return false;
        }
      }
      if (customSgkQuery.trim()) {
        const q = customSgkQuery.trim().toLowerCase();
        if (!isYeriSgk.toLowerCase().includes(q)) return false;
      }

      // 2. Departman Filtresi
      if (selectedDepartment !== 'all') {
        if ((emp.department || '').trim() !== selectedDepartment.trim()) return false;
      }

      // 3. Pozisyon Filtresi
      if (selectedPosition !== 'all') {
        if ((emp.position || '').trim() !== selectedPosition.trim()) return false;
      }

      // 4. Sistem Rolü Filtresi
      if (selectedRole !== 'all') {
        if ((emp.role || 'employee') !== selectedRole) return false;
      }

      // 5. Çalışan Tipi Filtresi
      if (selectedEmployeeType !== 'all') {
        const type = emp.employeeType || (emp as any).employee_type || 'normal';
        if (type !== selectedEmployeeType) return false;
      }

      // 6. Durum Filtresi
      if (selectedStatus !== 'all') {
        if ((emp.status || 'active') !== selectedStatus) return false;
      }

      // 7. İşe Giriş Tarih Aralığı
      const joinStr = emp.joinDate || emp.join_date ? String(emp.joinDate || emp.join_date).split('T')[0] : '';
      if (startDate && joinStr && joinStr < startDate) return false;
      if (endDate && joinStr && joinStr > endDate) return false;

      // 8. Genel Metin Araması
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const textToSearch = [
          emp.name,
          emp.tc_no,
          emp.sicil_no,
          isYeriSgk,
          emp.email,
          emp.phone,
          emp.department,
          emp.position,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [
    employees,
    selectedSgkSicil,
    customSgkQuery,
    selectedDepartment,
    selectedPosition,
    selectedRole,
    selectedEmployeeType,
    selectedStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSelectedSgkSicil('all');
    setCustomSgkQuery('');
    setSelectedDepartment('all');
    setSelectedPosition('all');
    setSelectedRole('all');
    setSelectedEmployeeType('all');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const handleSelectAllColumns = () => {
    const next: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      next[col.key] = true;
    });
    setSelectedColumns(next);
  };

  const handleDeselectAllColumns = () => {
    const next: Record<string, boolean> = {};
    AVAILABLE_COLUMNS.forEach((col) => {
      next[col.key] = false;
    });
    // Her halükarda isim seçili kalsın
    next['name'] = true;
    setSelectedColumns(next);
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const selectedColCount = Object.values(selectedColumns).filter(Boolean).length;

  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('Seçilen filtrelere uygun personel bulunamadı.');
      return;
    }

    if (selectedColCount === 0) {
      alert('Lütfen en az bir sütun seçiniz.');
      return;
    }

    // Aktif sütunlar listesi
    const activeCols = AVAILABLE_COLUMNS.filter((c) => selectedColumns[c.key]);
    const headers = ['No', ...activeCols.map((c) => c.label)];

    const dataRows = filteredEmployees.map((emp, index) => {
      const isYeriSgk = (emp.is_yeri_sgk_sicil_no || (emp as any).isYeriSgkSicilNo || '').trim();
      const joinStr = emp.joinDate || emp.join_date ? String(emp.joinDate || emp.join_date).split('T')[0] : '';
      const birthStr = (emp as any).birth_date || (emp as any).birthDate ? String((emp as any).birth_date || (emp as any).birthDate).split('T')[0] : '';
      
      const roleText =
        emp.role === 'superadmin' ? 'Süper Yönetici' :
        emp.role === 'admin' ? 'Şirket Yöneticisi' :
        emp.role === 'hr' ? 'İK Uzmanı' :
        emp.role === 'manager' ? 'Birim Amiri' : 'Personel';

      const typeText = (emp.employeeType || (emp as any).employee_type) === 'emekli' ? 'Emekli' : 'Normal Çalışan';
      const statusText = emp.status === 'active' ? 'Aktif' : emp.status === 'onLeave' ? 'İzinli' : 'Ayrılmış';

      const rowValues: any[] = [index + 1];

      activeCols.forEach((col) => {
        switch (col.key) {
          case 'name':
            rowValues.push(emp.name || '');
            break;
          case 'tc_no':
            rowValues.push(emp.tc_no || '');
            break;
          case 'sicil_no':
            rowValues.push(emp.sicil_no || '');
            break;
          case 'is_yeri_sgk_sicil_no':
            rowValues.push(isYeriSgk);
            break;
          case 'birth_date':
            rowValues.push(birthStr);
            break;
          case 'company':
            rowValues.push(emp.company || '');
            break;
          case 'department':
            rowValues.push(emp.department || '');
            break;
          case 'position':
            rowValues.push(emp.position || '');
            break;
          case 'role':
            rowValues.push(roleText);
            break;
          case 'employee_type':
            rowValues.push(typeText);
            break;
          case 'status':
            rowValues.push(statusText);
            break;
          case 'join_date':
            rowValues.push(joinStr);
            break;
          case 'phone':
            rowValues.push(emp.phone || '');
            break;
          case 'email':
            rowValues.push(emp.email || '');
            break;
          case 'contact_email':
            rowValues.push((emp as any).contact_email || (emp as any).personal_email || '');
            break;
          case 'il':
            rowValues.push(emp.il || '');
            break;
          case 'ilce':
            rowValues.push(emp.ilce || '');
            break;
          case 'address':
            rowValues.push(emp.address || '');
            break;
          default:
            rowValues.push((emp as any)[col.key] || '');
        }
      });

      return rowValues;
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

    // Hücre kenarlıkları ve stillendirme
    const thinBorder = {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    };

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      fill: { fgColor: { rgb: '1E3A8A' } }, // Koyu lacivert
      alignment: { horizontal: 'center', vertical: 'center' },
      border: thinBorder,
    };

    const defaultCellStyle = {
      font: { sz: 9 },
      alignment: { vertical: 'center' },
      border: thinBorder,
    };

    if (ws['!ref']) {
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[addr];
          if (!cell) continue;

          if (R === 0) {
            cell.s = headerStyle;
          } else {
            cell.s = { ...defaultCellStyle };
            if (C === 0) {
              cell.s.alignment = { horizontal: 'center', vertical: 'center' };
            }
          }
        }
      }
    }

    // Otomatik Sütun Genişlikleri
    const colWidths = headers.map((h, i) => {
      if (i === 0) return { wch: 6 }; // No
      let maxLen = h.length;
      dataRows.forEach((r) => {
        const val = String(r[i] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(Math.max(maxLen + 3, 12), 45) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Personel Listesi');

    const todayStr = new Date().toISOString().split('T')[0];
    const sgkSuffix = selectedSgkSicil !== 'all' ? `_SGK_${selectedSgkSicil}` : '';
    const fileName = `Humanius_Personel_Listesi${sgkSuffix}_${todayStr}.xlsx`;

    XLSX.writeFile(wb, fileName);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-blue-500/25 to-indigo-500/10 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Personel Listesi Excel Dışa Aktarma
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-md">
                  XLSX
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100/75 mt-1 leading-normal">
                Gelişmiş filtreleme ve sütun seçimi ile özelleştirilmiş resmi Excel (.xlsx) çıktısı alın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0 ml-4 shadow-xs"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-gray-800">
          {/* 1. BÖLÜM: GELİŞMİŞ FİLTRELER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Filter className="w-4 h-4 text-blue-600" />
                <span>Rapor Filtreleri</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filtreleri Sıfırla</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* İş Yeri SGK Sicil No (ÖNEMLİ VURGU) */}
              <div className="sm:col-span-2 lg:col-span-1 bg-amber-50/60 border border-amber-200/80 rounded-xl p-2.5">
                <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  <span>İş Yeri SGK Sicil No</span>
                </label>
                <select
                  value={selectedSgkSicil}
                  onChange={(e) => setSelectedSgkSicil(e.target.value)}
                  className="w-full bg-white border border-amber-300 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="all" className="text-gray-900 bg-white">Tümü (Tüm İş Yeri SGK No'ları)</option>
                  <option value="empty" className="text-gray-900 bg-white">Boş / Tanımsız Olanlar</option>
                  {uniqueSgkSicilList.map((sgk) => (
                    <option key={sgk} value={sgk} className="text-gray-900 bg-white">
                      {sgk}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Veya elle SGK sicil no filtrele..."
                  value={customSgkQuery}
                  onChange={(e) => setCustomSgkQuery(e.target.value)}
                  className="w-full mt-1.5 bg-white border border-amber-200 text-gray-800 rounded-lg px-2.5 py-1 text-xs outline-none focus:ring-1 focus:ring-amber-400 placeholder:text-gray-400"
                />
              </div>

              {/* Departman */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                  <span>Departman</span>
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">Tüm Departmanlar</option>
                  {availableDepartments.map((dept) => (
                    <option key={dept} value={dept} className="text-gray-900 bg-white">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pozisyon */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Pozisyon / Unvan</label>
                <select
                  value={selectedPosition}
                  onChange={(e) => setSelectedPosition(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">Tüm Pozisyonlar</option>
                  {uniquePositions.map((p) => (
                    <option key={p} value={p} className="text-gray-900 bg-white">
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sistem Rolü */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-gray-400" />
                  <span>Sistem Rolü</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">Tüm Roller</option>
                  <option value="superadmin" className="text-gray-900 bg-white">👑 Süper Yönetici</option>
                  <option value="admin" className="text-gray-900 bg-white">🛡️ Şirket Yöneticisi</option>
                  <option value="hr" className="text-gray-900 bg-white">👥 İK Uzmanı</option>
                  <option value="manager" className="text-gray-900 bg-white">👔 Birim Amiri</option>
                  <option value="employee" className="text-gray-900 bg-white">👤 Standart Personel</option>
                </select>
              </div>

              {/* Çalışan Tipi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Çalışan Tipi</label>
                <select
                  value={selectedEmployeeType}
                  onChange={(e) => setSelectedEmployeeType(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">Tümü (Normal & Emekli)</option>
                  <option value="normal" className="text-gray-900 bg-white">Normal Çalışan</option>
                  <option value="emekli" className="text-gray-900 bg-white">Emekli Çalışan</option>
                </select>
              </div>

              {/* Personel Durumu */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Çalışma Durumu</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-2 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all" className="text-gray-900 bg-white">Tümü (Aktif, İzinli, Ayrılmış)</option>
                  <option value="active" className="text-gray-900 bg-white">Aktif Personel</option>
                  <option value="onLeave" className="text-gray-900 bg-white">İzinde Olanlar</option>
                  <option value="terminated" className="text-gray-900 bg-white">İşten Ayrılanlar</option>
                </select>
              </div>

              {/* İşe Giriş Tarihi Başlangıç - Bitiş */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>İşe Giriş Başlangıç</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>İşe Giriş Bitiş</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Genel Arama */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="İsim, TC No, Sicil No, E-posta veya Telefon ile anlık filtrele..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 text-gray-800 rounded-xl text-xs outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 2. BÖLÜM: DAHİL EDİLECEK SÜTUNLAR */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Excel'e Aktarılacak Sütunlar</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedColCount} / {AVAILABLE_COLUMNS.length} seçildi
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllColumns}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                >
                  Tümünü Seç
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={handleDeselectAllColumns}
                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold hover:underline cursor-pointer"
                >
                  Temizle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
              {AVAILABLE_COLUMNS.map((col) => {
                const isChecked = !!selectedColumns[col.key];
                const isSgkCol = col.key === 'is_yeri_sgk_sicil_no';
                return (
                  <label
                    key={col.key}
                    onClick={() => toggleColumn(col.key)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs font-medium transition-all select-none cursor-pointer ${
                      isChecked
                        ? isSgkCol
                          ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-bold shadow-xs'
                          : 'bg-blue-50/70 border-blue-200 text-blue-900'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className={`w-4 h-4 shrink-0 ${isSgkCol ? 'text-amber-600' : 'text-blue-600'}`} />
                    ) : (
                      <Square className="w-4 h-4 shrink-0 text-gray-300" />
                    )}
                    <span className="truncate">{col.label}</span>
                    {isSgkCol && (
                      <span className="ml-auto text-[10px] bg-amber-200/80 text-amber-800 px-1 rounded font-bold">
                        SGK
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. BÖLÜM: CANLI EŞLEŞEN PERSONEL ÖNİZLEMESİ */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-700">Rapor Kapsamındaki Personeller</span>
              </div>
              <div className="text-xs font-bold text-slate-700">
                Eşleşen: <span className="text-emerald-600 text-sm font-black">{filteredEmployees.length}</span> / {employees.length} kişi
              </div>
            </div>

            {filteredEmployees.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-500">
                Filtre kriterlerine uyan herhangi bir personel bulunamadı. Lütfen filtrelerinizi gevşetin.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-gray-600 sticky top-0 border-b border-gray-200 font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">No</th>
                      <th className="py-1.5 px-3">Adı Soyadı</th>
                      <th className="py-1.5 px-3">TC Kimlik</th>
                      <th className="py-1.5 px-3">İş Yeri SGK Sicil No</th>
                      <th className="py-1.5 px-3">Departman</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredEmployees.slice(0, 10).map((emp, idx) => (
                      <tr key={emp.id || idx} className="hover:bg-slate-50/80">
                        <td className="py-1.5 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-medium text-gray-900">{emp.name || '-'}</td>
                        <td className="py-1.5 px-3 font-mono text-[11px] text-gray-600">{emp.tc_no || '-'}</td>
                        <td className="py-1.5 px-3">
                          {emp.is_yeri_sgk_sicil_no || (emp as any).isYeriSgkSicilNo ? (
                            <span className="font-mono text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                              {emp.is_yeri_sgk_sicil_no || (emp as any).isYeriSgkSicilNo}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 text-gray-600">{emp.department || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length > 10 && (
                  <div className="py-1.5 text-center text-[11px] text-gray-400 bg-slate-50 border-t border-gray-100">
                    ...ve {filteredEmployees.length - 10} kişi daha Excel dosyasına dahil edilecek.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            Toplam <strong className="text-gray-800">{filteredEmployees.length}</strong> personel ve <strong className="text-gray-800">{selectedColCount}</strong> sütun dışa aktarılacak
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={filteredEmployees.length === 0 || selectedColCount === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Excel İndir (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeExportModal;
