import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { IzinTalebi } from '../types/izin';
import { formatDate, formatIzinTuru, getCompanyIzinTuruLabels } from '../utils/izinCalculations';

interface IzinTakvimiProps {
  izinTalepleri: IzinTalebi[];
}

const IzinTakvimi: React.FC<IzinTakvimiProps> = ({ izinTalepleri }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mevcut ayın ilk ve son günü
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Takvim başlangıcı (önceki ayın son günleri dahil)
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay());
  
  // Takvim bitişi (sonraki ayın ilk günleri dahil)
  const endDate = new Date(lastDayOfMonth);
  endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()));

  // Takvim günlerini oluştur
  const calendarDays = [];
  const currentCalendarDate = new Date(startDate);
  
  while (currentCalendarDate <= endDate) {
    calendarDays.push(new Date(currentCalendarDate));
    currentCalendarDate.setDate(currentCalendarDate.getDate() + 1);
  }

  // Belirli bir günde izinli personelleri bul
  const getIzinlerForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return izinTalepleri.filter(talep => {
      const start = new Date(talep.baslangicTarihi);
      const end = new Date(talep.bitisTarihi);
      return date >= start && date <= end;
    });
  };

  // Önceki ay
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Sonraki ay
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Ay ve yıl formatı
  const monthYear = currentDate.toLocaleDateString('tr-TR', { 
    month: 'long', 
    year: 'numeric' 
  });

  const weekDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const getTuruColor = (turu: string) => {
    const colors = {
      yillik: 'bg-blue-100 text-blue-800',
      mazeret: 'bg-purple-100 text-purple-800',
      hastalik: 'bg-red-100 text-red-800',
      dogum: 'bg-pink-100 text-pink-800',
      babalik: 'bg-indigo-100 text-indigo-800',
      evlilik: 'bg-rose-100 text-rose-800',
      olum: 'bg-gray-100 text-gray-800',
      askerlik: 'bg-green-100 text-green-800',
      ucretsiz: 'bg-orange-100 text-orange-800'
    };
    return colors[turu as keyof typeof colors] || colors.yillik;
  };

  return (
    <div className="space-y-6">
      {/* Takvim Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">{monthYear}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Takvim */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Hafta Günleri */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Takvim Günleri */}
        <div className="grid grid-cols-7">
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const izinler = getIzinlerForDate(date);
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div
                key={index}
                className={`min-h-[64px] p-1.5 border-b border-r border-gray-100 ${
                  !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                } ${isToday ? 'bg-blue-50' : ''} ${isWeekend ? 'bg-gray-25' : ''}`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  !isCurrentMonth ? 'text-gray-400' : isToday ? 'text-blue-600' : 'text-gray-800'
                }`}>
                  {date.getDate()}
                </div>
                
                <div className="space-y-1">
                  {izinler.slice(0, 2).map((izin, idx) => (
                    <div
                      key={idx}
                      className={`text-xs px-2 py-1 rounded-md truncate ${getTuruColor(izin.izinTuru)}`}
                      title={`${izin.employeeName} - ${formatIzinTuru(izin.izinTuru)}${izin.yolIzniTalep ? ` (+${izin.yolIzniGun} gün yol izni)` : ''}`}
                    >
                      <div>
                        {String(izin.employeeName ?? '').trim().split(/\s+/)[0] || 'Personel'}
                        {izin.yolIzniTalep && (
                          <div className="text-xs opacity-75">+{izin.yolIzniGun}g</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {izinler.length > 2 && (
                    <div className="text-xs text-gray-500 px-2">
                      +{izinler.length - 2} daha
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* İzin Türü Açıklamaları */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-3">İzin Türü Renk Kodları</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(getCompanyIzinTuruLabels()).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getTuruColor(key).replace('text-', 'bg-').split(' ')[0]}`} />
              <span className="text-xs text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IzinTakvimi;