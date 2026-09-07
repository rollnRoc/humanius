import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  X,
  MapPin,
  Plane
} from 'lucide-react';
import { IzinTalebi } from '../types/izin';
import type { Employee } from '../types';
import { formatIzinTuru, getCompanyIzinTuruLabels } from '../utils/izinCalculations';

interface IzinTakvimiProps {
  izinTalepleri: IzinTalebi[];
  employees?: Employee[];
}

function formatLongDateTR(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  } catch {}
  return dateStr;
}

const IzinTakvimi: React.FC<IzinTakvimiProps> = ({ izinTalepleri, employees = [] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Bugünün tarih dizesi
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Seçili gün: varsayılan bugün
  const [selectedDate, setSelectedDate] = useState<string | null>(todayStr);

  // Mevcut ayın ilk ve son günü
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Takvim başlangıcı (Pazartesi = 0, önceki ayın son günleri dahil)
  const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7;
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDayOfWeek);
  
  // Takvim bitişi (Pazar = 6, sonraki ayın ilk günleri dahil)
  const endDayOfWeek = (lastDayOfMonth.getDay() + 6) % 7;
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

  // Takvim günlerini oluştur
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  // Belirli bir günde izinli personelleri bul
  const getIzinlerForDateStr = (dateString: string) => {
    return izinTalepleri.filter(talep => {
      const s = (talep.baslangicTarihi || '').split('T')[0];
      const e = (talep.bitisTarihi || '').split('T')[0];
      return Boolean(s && e && dateString >= s && dateString <= e && talep.durum !== 'reddedildi');
    });
  };

  const getIzinlerForDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return getIzinlerForDateStr(`${y}-${m}-${d}`);
  };

  // Önceki / Sonraki ay
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(todayStr);
  };

  // Ay ve yıl formatı
  const monthYear = currentDate.toLocaleDateString('tr-TR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getTuruColor = (turu: string) => {
    const colors = {
      yillik: 'bg-blue-100 text-blue-800 border-blue-200',
      mazeret: 'bg-purple-100 text-purple-800 border-purple-200',
      hastalik: 'bg-rose-100 text-rose-800 border-rose-200',
      dogum: 'bg-pink-100 text-pink-800 border-pink-200',
      babalik: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      evlilik: 'bg-amber-100 text-amber-800 border-amber-200',
      olum: 'bg-gray-100 text-gray-800 border-gray-200',
      askerlik: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      ucretsiz: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[turu as keyof typeof colors] || colors.yillik;
  };

  // Seçilen günün izinleri
  const selectedDateLeaves = useMemo(() => {
    if (!selectedDate) return [];
    return getIzinlerForDateStr(selectedDate);
  }, [selectedDate, izinTalepleri]);

  // Mevcut ay içindeki toplam izin sayısı
  const monthlyTotalLeaves = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    return izinTalepleri.filter((t) => {
      if (t.durum === 'reddedildi') return false;
      const s = new Date(t.baslangicTarihi);
      const e = new Date(t.bitisTarihi);
      return (s.getFullYear() === currentYear && s.getMonth() === currentMonth) ||
             (e.getFullYear() === currentYear && e.getMonth() === currentMonth);
    }).length;
  }, [currentDate, izinTalepleri]);

  // Personel bilgilerini zenginleştirme (departman / pozisyon)
  const getEmployeeInfo = (empId: string, empName?: string) => {
    const matched = employees.find(e => e.id === empId || e.name === empName);
    return {
      department: matched?.department || 'Departman Belirtilmedi',
      position: matched?.position || 'Görev Belirtilmedi',
    };
  };

  return (
    <div className="space-y-5">
      {/* ── İki Kolonlu Duyarlı Düzen (Takvim + Gün Detayı) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Sol Taraf: Takvim (7 sütun) */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Takvim Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={previousMonth}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                title="Önceki Ay"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-base font-bold text-gray-900 capitalize min-w-[130px] text-center">
                {monthYear}
              </h3>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                title="Sonraki Ay"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
              >
                Bugün
              </button>
            </div>

            {/* İstatistik Rozeti */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl">
                Bu Ay {monthlyTotalLeaves} İzin Kaydı
              </span>
            </div>
          </div>

          {/* Takvim Tablosu */}
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
            {/* Hafta Günleri Başlıkları */}
            <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-200">
              {weekDays.map((day, idx) => (
                <div
                  key={day}
                  className={`p-2 text-center text-xs font-bold ${
                    idx >= 5 ? 'text-rose-500 bg-rose-50/30' : 'text-gray-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Takvim Günleri */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 bg-gray-100/50">
              {calendarDays.map((date, index) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                const dateString = `${y}-${m}-${d}`;

                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = dateString === todayStr;
                const isSelected = selectedDate === dateString;
                const izinler = getIzinlerForDate(date);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <div
                    key={index}
                    onClick={() => setSelectedDate(dateString)}
                    className={`min-h-[72px] sm:min-h-[80px] p-1.5 flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-blue-600 bg-blue-50/80 shadow-xs z-10'
                        : !isCurrentMonth
                        ? 'bg-gray-50/70 text-gray-300'
                        : isToday
                        ? 'bg-blue-50/40 hover:bg-blue-50'
                        : isWeekend
                        ? 'bg-slate-50/50 hover:bg-slate-100/70'
                        : 'bg-white hover:bg-blue-50/20'
                    }`}
                  >
                    {/* Gün Numarası ve İndikatör */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold rounded-full flex items-center justify-center ${
                          isToday
                            ? 'w-5 h-5 bg-blue-600 text-white shadow-xs'
                            : isSelected
                            ? 'text-blue-900 font-extrabold'
                            : !isCurrentMonth
                            ? 'text-gray-400'
                            : 'text-gray-700'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      {izinler.length > 0 && (
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100 px-1 rounded-md">
                          {izinler.length}
                        </span>
                      )}
                    </div>
                    
                    {/* İzin Hapları (Pills) */}
                    <div className="space-y-1">
                      {izinler.slice(0, 2).map((izin) => {
                        const firstName = (izin.employeeName || 'Personel').trim().split(/\s+/)[0];
                        return (
                          <div
                            key={izin.id}
                            className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold truncate border ${getTuruColor(izin.izinTuru)}`}
                            title={`${izin.employeeName} — ${formatIzinTuru(izin.izinTuru)} (${izin.gunSayisi} gün)`}
                          >
                            <span>{firstName}</span>
                          </div>
                        );
                      })}

                      {izinler.length > 2 && (
                        <div className="text-[9px] text-gray-500 font-bold px-1 text-center bg-gray-100 rounded">
                          +{izinler.length - 2} daha
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 italic">
            💡 İpucu: Takvim üzerindeki herhangi bir güne tıklayarak o gün izinli olan tüm personellerin detaylı listesini sağ panelde görebilirsiniz.
          </p>
        </div>

        {/* Sağ Taraf: Seçilen Günün Detay Paneli (5 sütun) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">SEÇİLEN GÜN DETAYI</p>
                <h3 className="text-base font-bold text-gray-900 mt-0.5 capitalize">
                  {selectedDate ? formatLongDateTR(selectedDate) : 'Gün Seçilmedi'}
                </h3>
              </div>

              {selectedDate && (
                <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
                  {selectedDateLeaves.length} İzinli
                </span>
              )}
            </div>

            {/* İzinli Personeller Listesi */}
            {selectedDateLeaves.length === 0 ? (
              <div className="p-8 text-center bg-gray-50/70 border border-dashed border-gray-200 rounded-xl space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-gray-700">Bu tarihte izinli personel bulunmamaktadır.</p>
                <p className="text-[11px] text-gray-500">Çalışanların tümü mesai planında görünmektedir.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {selectedDateLeaves.map((talep) => {
                  const empInfo = getEmployeeInfo(talep.employeeId, talep.employeeName);
                  const turColor = getTuruColor(talep.izinTuru);

                  return (
                    <div
                      key={talep.id}
                      className="p-3.5 rounded-xl border border-gray-150 bg-gray-50/60 hover:bg-gray-100/70 transition-all shadow-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            {talep.employeeName || 'İsimsiz Personel'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            <span className="font-semibold text-gray-700">{empInfo.department}</span>
                            {empInfo.position && ` · ${empInfo.position}`}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            talep.durum === 'onaylandi'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {talep.durum === 'onaylandi' ? '✓ Onaylandı' : '⏳ Beklemede'}
                        </span>
                      </div>

                      {/* İzin Türü ve Tarih Detayları */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className={`font-bold px-2 py-0.5 rounded-md border ${turColor}`}>
                          {formatIzinTuru(talep.izinTuru)}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          {talep.gunSayisi} Gün
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-600 font-medium">
                          📅 {talep.baslangicTarihi} — {talep.bitisTarihi}
                        </span>
                      </div>

                      {/* Yol İzni (varsa) */}
                      {talep.yolIzniTalep && (
                        <div className="flex items-center gap-1 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                          <Plane className="w-3.5 h-3.5" />
                          <span>+{talep.yolIzniGun} gün yol izni talep edildi ({talep.seyahatYeri || 'Şehir Dışı'})</span>
                        </div>
                      )}

                      {/* Açıklama / Gerekçe */}
                      {talep.aciklama && (
                        <p className="text-xs text-gray-600 italic bg-white p-2 rounded-lg border border-gray-100">
                          &quot;{talep.aciklama}&quot;
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── İzin Türü Renk Kodları Açıklamaları (Legend) ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
        <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>İzin Türü Renk Kodları</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {Object.entries(getCompanyIzinTuruLabels()).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50">
              <span className={`w-3 h-3 rounded-full border ${getTuruColor(key)}`} />
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IzinTakvimi;