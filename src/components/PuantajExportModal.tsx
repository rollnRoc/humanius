import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Filter,
  Search,
  Building2,
  Users,
  Briefcase,
  RotateCcw,
  Calendar,
  Clock,
  AlertCircle,
  FileText,
  Table,
} from 'lucide-react';
import { PersonelAylikPuantaj } from '../utils/puantajHesaplama';
import {
  exportPuantajExcel,
  exportGunlukDetayliExcel,
  GunlukDetayliRaporItem,
} from '../utils/puantajPdf';

interface PuantajExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCalculatedPuantaj: PersonelAylikPuantaj[];
  companyName: string;
  selectedYear: number;
  selectedMonthIndex: number;
  departments?: any[];
  companies?: any[];
}

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const PuantajExportModal: React.FC<PuantajExportModalProps> = ({
  isOpen,
  onClose,
  allCalculatedPuantaj,
  companyName,
  selectedYear,
  selectedMonthIndex,
  departments = [],
  companies = [],
}) => {
  // Rapor Türü: 'monthly' (Aylık Resmi Puantaj) veya 'daily' (Günlük Detaylı Mesai)
  const [reportType, setReportType] = useState<'monthly' | 'daily'>('monthly');

  // Filtreler
  const [selectedSgkSicil, setSelectedSgkSicil] = useState<string>('all');
  const [customSgkQuery, setCustomSgkQuery] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedPosition, setSelectedPosition] = useState<string>('all');
  const [selectedEmployeeType, setSelectedEmployeeType] = useState<string>('all');
  const [mesaiFilter, setMesaiFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Benzersiz İş Yeri SGK Sicil Numaraları
  const uniqueSgkSicilList = useMemo(() => {
    const list = new Set<string>();
    allCalculatedPuantaj.forEach((p) => {
      const emp = p.employee;
      const val = (emp?.is_yeri_sgk_sicil_no || (emp as any)?.isYeriSgkSicilNo || '').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allCalculatedPuantaj]);

  // Benzersiz Departmanlar
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    departments.forEach((d: any) => {
      const name = typeof d === 'string' ? d : d?.name || d?.id || '';
      if (name && String(name).trim()) set.add(String(name).trim());
    });
    allCalculatedPuantaj.forEach((p) => {
      const dept = (p.employee?.department || '').trim();
      if (dept) set.add(dept);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [departments, allCalculatedPuantaj]);

  // Benzersiz Pozisyonlar
  const uniquePositions = useMemo(() => {
    const list = new Set<string>();
    allCalculatedPuantaj.forEach((p) => {
      const val = (p.employee?.position || '').trim();
      if (val) list.add(val);
    });
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [allCalculatedPuantaj]);

  // Filtrelenmiş Puantaj Kayıtları
  const filteredRecords = useMemo(() => {
    return allCalculatedPuantaj.filter((p) => {
      const emp = p.employee;
      if (!emp) return false;

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

      // 4. Çalışan Tipi
      if (selectedEmployeeType !== 'all') {
        const type = emp.employeeType || (emp as any).employee_type || 'normal';
        if (type !== selectedEmployeeType) return false;
      }

      // 5. Mesai & Devamsızlık Filtresi
      if (mesaiFilter === 'fazla_mesai') {
        if ((p.ozet?.toplamFazlaMesaiSaat || 0) <= 0) return false;
      } else if (mesaiFilter === 'eksik_gun') {
        const hasMissing =
          (p.ozet?.devamsizGun || 0) > 0 ||
          (p.ozet?.ucretsizIzinGun || 0) > 0 ||
          (p.ozet?.raporluGun || 0) > 0;
        if (!hasMissing) return false;
      } else if (mesaiFilter === 'izinli') {
        const hasLeave =
          (p.ozet?.yillikIzinGun || 0) > 0 ||
          (p.ozet?.ucretliIzinGun || 0) > 0 ||
          (p.ozet?.raporluGun || 0) > 0;
        if (!hasLeave) return false;
      } else if (mesaiFilter === 'tam_bordro') {
        if (p.ozet?.bordroGun !== 30) return false;
      }

      // 6. Genel Arama
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const textToSearch = [
          emp.name,
          emp.tc_no,
          emp.sicil_no,
          isYeriSgk,
          emp.department,
          emp.position,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [
    allCalculatedPuantaj,
    selectedSgkSicil,
    customSgkQuery,
    selectedDepartment,
    selectedPosition,
    selectedEmployeeType,
    mesaiFilter,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSelectedSgkSicil('all');
    setCustomSgkQuery('');
    setSelectedDepartment('all');
    setSelectedPosition('all');
    setSelectedEmployeeType('all');
    setMesaiFilter('all');
    setSearchQuery('');
  };

  // İstatistikler
  const totalFiiliSaat = useMemo(() => {
    return filteredRecords.reduce((acc, p) => acc + (p.ozet?.fiiliCalismaSaat || 0), 0);
  }, [filteredRecords]);

  const totalFazlaMesai = useMemo(() => {
    return filteredRecords.reduce((acc, p) => acc + (p.ozet?.toplamFazlaMesaiSaat || 0), 0);
  }, [filteredRecords]);

  const totalEksikGun = useMemo(() => {
    return filteredRecords.reduce(
      (acc, p) => acc + (p.ozet?.devamsizGun || 0) + (p.ozet?.ucretsizIzinGun || 0),
      0
    );
  }, [filteredRecords]);

  // Excel İndirme İşlemi
  const handleExport = () => {
    if (filteredRecords.length === 0) {
      alert('Filtrelere uygun personel kaydı bulunamadı.');
      return;
    }

    if (reportType === 'monthly') {
      // 1. Aylık Resmi Puantaj Cetveli
      exportPuantajExcel(companyName, selectedYear, selectedMonthIndex, filteredRecords);
    } else {
      // 2. Günlük Detaylı Mesai & PDKS Raporu
      const dailyItems: GunlukDetayliRaporItem[] = filteredRecords.flatMap((p) => {
        if (!p || !p.gunler) return [];
        const emp = p.employee || ({} as any);
        const shiftStart = p.shift?.start_time || '08:30';
        const shiftEnd = p.shift?.end_time || '18:00';
        const shiftHours = `${shiftStart} - ${shiftEnd}`;

        return p.gunler.map((g) => ({
          employeeName: emp.name || 'İsimsiz Personel',
          tcNo: emp.tc_no || emp.tcNo || '',
          sicilNo: emp.sicil_no || emp.sicilNo || '',
          isYeriSgkSicilNo: emp.is_yeri_sgk_sicil_no || emp.isYeriSgkSicilNo || '',
          department: emp.department || 'Genel',
          tarih: g.tarih,
          gunAdi: g.gunAdi,
          shiftHours,
          girisSaati: g.girisSaati,
          cikisSaati: g.cikisSaati,
          molaDk: g.molaDk || 0,
          netSureSaat: g.netSureSaat || 0,
          fazlaMesaiSaat: g.fazlaMesaiSaat || 0,
          gecikmeDk: g.gecikmeDk || 0,
          kod: g.kod,
          kodAciklama: g.kodAciklama || '',
          isOngoing: g.isOngoing,
        }));
      });

      const periodStr = `${AY_ADLARI[selectedMonthIndex]}_${selectedYear}`;
      exportGunlukDetayliExcel(companyName, periodStr, dailyItems);
    }

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
        <div className="relative px-6 sm:px-8 py-5 sm:py-6 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white flex items-center justify-between shrink-0 border-b border-white/10 shadow-sm">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-teal-500/10 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shadow-inner shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Puantaj Tablosu Excel Dışa Aktarma
                </h2>
                <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-md">
                  {AY_ADLARI[selectedMonthIndex]} {selectedYear}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/75 mt-1 leading-normal">
                İş yeri SGK no, departman ve mesai filtreli resmi puantaj & günlük PDKS Excel çıktısı
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
          {/* 1. BÖLÜM: RAPOR FORMATI SEÇİMİ */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Excel Rapor Formatı Seçin
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setReportType('monthly')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  reportType === 'monthly'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    reportType === 'monthly' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>Aylık Resmi Puantaj Cetveli</span>
                    {reportType === 'monthly' && (
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Seçili</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    1-31 günlük çetele kodları, fiili çalışma saatleri, hafta tatili, izinler ve 30G bordro günü tablosu
                  </p>
                </div>
              </div>

              <div
                onClick={() => setReportType('daily')}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                  reportType === 'daily'
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    reportType === 'daily' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <span>Günlük Detaylı Mesai & PDKS Raporu</span>
                    {reportType === 'daily' && (
                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">Seçili</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Gün gün satır satır giriş-çıkış saati, mola dk, net çalışma, fazla mesai, gecikme ve durum açıklamaları
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2. BÖLÜM: DETAYLI FİLTRELER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>Puantaj Filtreleri</span>
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Filtreleri Sıfırla</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* İş Yeri SGK Sicil No (ÖNEMLİ VURGU) */}
              <div className="sm:col-span-2 lg:col-span-1 bg-amber-50/70 border border-amber-300 rounded-xl p-2.5 shadow-xs">
                <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
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
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all" className="text-gray-900 bg-white">Tüm Pozisyonlar</option>
                  {uniquePositions.map((p) => (
                    <option key={p} value={p} className="text-gray-900 bg-white">
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Çalışan Tipi */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Çalışan Tipi</label>
                <select
                  value={selectedEmployeeType}
                  onChange={(e) => setSelectedEmployeeType(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all" className="text-gray-900 bg-white">Tümü (Normal & Emekli)</option>
                  <option value="normal" className="text-gray-900 bg-white">Normal Çalışan</option>
                  <option value="emekli" className="text-gray-900 bg-white">Emekli Çalışan</option>
                </select>
              </div>

              {/* Mesai / Devamsızlık Durumu */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Mesai / İzin Durumu</span>
                </label>
                <select
                  value={mesaiFilter}
                  onChange={(e) => setMesaiFilter(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-2.5 py-2 text-xs font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="all" className="text-gray-900 bg-white">Tüm Personeller</option>
                  <option value="fazla_mesai" className="text-gray-900 bg-white">⏱️ Sadece Fazla Mesaisi Olanlar</option>
                  <option value="eksik_gun" className="text-gray-900 bg-white">⚠️ Sadece Devamsız / Eksik Günü Olanlar</option>
                  <option value="izinli" className="text-gray-900 bg-white">📅 Sadece İzinli / Raporlu Olanlar</option>
                  <option value="tam_bordro" className="text-gray-900 bg-white">✅ Sadece Tam Bordro (30 Gün)</option>
                </select>
              </div>

              {/* Genel Metin Arama */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Personel adı, TC Kimlik no veya sicil no ile anlık filtrele..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-gray-200 text-gray-800 rounded-xl text-xs outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. BÖLÜM: DÖNEM & CANLI İSTATİSTİK BAR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-gray-500">Puantaj Dönemi</div>
              <div className="text-sm font-bold text-gray-900 mt-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{AY_ADLARI[selectedMonthIndex]} {selectedYear}</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-emerald-800">Eşleşen Personel</div>
              <div className="text-sm font-extrabold text-emerald-700 mt-1 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" />
                <span>{filteredRecords.length} / {allCalculatedPuantaj.length} kişi</span>
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-blue-800">Toplam Fiili Çalışma</div>
              <div className="text-sm font-extrabold text-blue-700 mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{totalFiiliSaat.toFixed(1)} saat</span>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
              <div className="text-[11px] font-medium text-amber-800">Toplam Fazla Mesai</div>
              <div className="text-sm font-extrabold text-amber-700 mt-1 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{totalFazlaMesai.toFixed(1)} saat</span>
              </div>
            </div>
          </div>

          {/* 4. BÖLÜM: CANLI ÖNİZLEME TABLOSU */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-gray-700">Rapor Kapsamındaki Personeller</span>
              </div>
              <div className="text-xs font-bold text-slate-700">
                Eşleşen: <span className="text-emerald-600 text-sm font-black">{filteredRecords.length}</span> kişi
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="py-4 text-center text-xs text-gray-500">
                Filtre kriterlerine uyan herhangi bir puantaj kaydı bulunamadı. Lütfen filtrelerinizi gevşetin.
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-gray-600 sticky top-0 border-b border-gray-200 font-semibold">
                    <tr>
                      <th className="py-1.5 px-3">No</th>
                      <th className="py-1.5 px-3">Personel</th>
                      <th className="py-1.5 px-3">TC Kimlik</th>
                      <th className="py-1.5 px-3">İş Yeri SGK Sicil No</th>
                      <th className="py-1.5 px-3">Departman</th>
                      <th className="py-1.5 px-3 text-right">Fiili Saat</th>
                      <th className="py-1.5 px-3 text-right">Fazla Mesai</th>
                      <th className="py-1.5 px-3 text-center">Bordro Günü</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {filteredRecords.slice(0, 10).map((rec, idx) => {
                      const emp = rec.employee;
                      const isYeriSgk = emp?.is_yeri_sgk_sicil_no || (emp as any)?.isYeriSgkSicilNo;
                      return (
                        <tr key={emp?.id || idx} className="hover:bg-slate-50/80">
                          <td className="py-1.5 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-1.5 px-3 font-medium text-gray-900">{emp?.name || '-'}</td>
                          <td className="py-1.5 px-3 font-mono text-[11px] text-gray-600">{emp?.tc_no || '-'}</td>
                          <td className="py-1.5 px-3">
                            {isYeriSgk ? (
                              <span className="font-mono text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded">
                                {isYeriSgk}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 text-gray-600">{emp?.department || '-'}</td>
                          <td className="py-1.5 px-3 text-right font-semibold text-gray-800">
                            {rec.ozet?.fiiliCalismaSaat?.toFixed(1) || 0}s
                          </td>
                          <td className="py-1.5 px-3 text-right font-semibold text-amber-700">
                            {rec.ozet?.toplamFazlaMesaiSaat > 0 ? `+${rec.ozet.toplamFazlaMesaiSaat.toFixed(1)}s` : '-'}
                          </td>
                          <td className="py-1.5 px-3 text-center font-bold text-gray-700">
                            {rec.ozet?.bordroGun || 30}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredRecords.length > 10 && (
                  <div className="py-1.5 text-center text-[11px] text-gray-400 bg-slate-50 border-t border-gray-100">
                    ...ve {filteredRecords.length - 10} kişi daha Excel dosyasına dahil edilecek.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            Dönem: <strong className="text-gray-800">{AY_ADLARI[selectedMonthIndex]} {selectedYear}</strong> | Eşleşen:{' '}
            <strong className="text-emerald-700">{filteredRecords.length} personel</strong>
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
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {reportType === 'monthly' ? 'Puantaj Cetvelini İndir (.xlsx)' : 'Günlük Mesai Raporunu İndir (.xlsx)'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PuantajExportModal;
