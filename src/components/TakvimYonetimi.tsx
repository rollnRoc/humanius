import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Filter, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle, XCircle, FileText, Users, Building } from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { IzinTalebi } from '../types/izin';
import { BordroItem } from '../types/bordro';
import { TakvimEtkinlik, EtkinlikTuru, YapilandirilmisEtkinlik } from '../types/takvim';
import { 
  createAutomaticEvents, 
  getEventsInRange, 
  organizeEventsByDate, 
  getEtkinlikRengi, 
  getEtkinlikNoktaRengi,
  getEtkinlikTuruAdi, 
  getOncelikRengi, 
  getDurumRengi, 
  formatTarih, 
  formatTarihAraligi,
  RESMI_TATILLER_2024,
  getResmiTatillerForYear,
  IS_KANUNU_SURELERI,
  BORDRO_SURELERI,
  EGITIM_SURELERI
} from '../utils/takvimUtils';

const formatDateToYYYYMMDD = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

interface TakvimYonetimiProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  bordrolar: BordroItem[];
}

const TakvimYonetimi: React.FC<TakvimYonetimiProps> = ({
  employees,
  izinTalepleri,
  bordrolar
}) => {
  const { appRole } = useAuth();
  const isManagement = ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || 'employee');

  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinlik[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'takvim' | 'etkinlikler' | 'süreler'>('takvim');
  const [filtreEtkinlikTuru, setFiltreEtkinlikTuru] = useState<string>('all');
  const [filtreDepartman, setFiltreDepartman] = useState<string>('all');
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [customEtkinlikler, setCustomEtkinlikler] = useState<TakvimEtkinlik[]>(() => {
    try {
      const saved = localStorage.getItem('humanius_custom_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [yeniEtkinlik, setYeniEtkinlik] = useState<{ baslik: string; aciklama: string; tarih: string; tur: EtkinlikTuru }>({ baslik: '', aciklama: '', tarih: '', tur: 'toplanti' });

  // Keep state synced with localStorage and handle other tabs/components updating it
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('humanius_custom_events');
        if (saved) {
          setCustomEtkinlikler(JSON.parse(saved));
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage when modified locally
  useEffect(() => {
    try {
      localStorage.setItem('humanius_custom_events', JSON.stringify(customEtkinlikler));
    } catch {}
  }, [customEtkinlikler]);

  // Otomatik ve ozel etkinlikleri birlestir
  useEffect(() => {
    const otomatikEtkinlikler = createAutomaticEvents(employees, izinTalepleri, bordrolar, currentDate.getFullYear());
    setEtkinlikler([...otomatikEtkinlikler, ...customEtkinlikler]);
  }, [employees, izinTalepleri, bordrolar, customEtkinlikler, currentDate]);

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

  // Filtrelenmiş etkinlikler
  const filteredEvents = etkinlikler.filter(etkinlik => {
    const turMatch = filtreEtkinlikTuru === 'all' || etkinlik.tur === filtreEtkinlikTuru;
    const departmanMatch = filtreDepartman === 'all' || etkinlik.departman === filtreDepartman;
    return turMatch && departmanMatch;
  });

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
  const departments = [...new Set(employees.map(e => e.department))];

  // Bu ayın kutlamaları (Doğum günleri ve Yıldönümleri)
  const currentMonthNum = String(currentDate.getMonth() + 1).padStart(2, '0');
  const monthPrefix = `${currentDate.getFullYear()}-${currentMonthNum}`;
  const buAyinKutlamalari = filteredEvents
    .filter((e) => (e.tur === 'dogum_gunu' || e.tur === 'yildonumu') && e.tarih.startsWith(monthPrefix))
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  // Belirli bir günün etkinliklerini getir
  const getEventsForDate = (date: Date): TakvimEtkinlik[] => {
    const dayStr = formatDateToYYYYMMDD(date);
    return filteredEvents.filter(etkinlik => {
      const startStr = etkinlik.tarih;
      const endStr = etkinlik.bitisTarihi || startStr;
      return dayStr >= startStr && dayStr <= endStr;
    });
  };

  // Resmi tatil kontrolü
  const isResmiTatil = (date: Date): ResmiTatil | null => {
    const dayStr = formatDateToYYYYMMDD(date);
    return getResmiTatillerForYear(date.getFullYear()).find(tatil => tatil.tarih === dayStr) || null;
  };

  const tabs = [
    { id: 'takvim', label: 'Takvim Görünümü', icon: Calendar },
    { id: 'etkinlikler', label: 'Etkinlik Listesi', icon: FileText },
    { id: 'süreler', label: 'Kanuni Süreler', icon: Clock }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex space-x-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          {activeTab === 'takvim' && (
            <div className="flex items-center gap-4">
              {/* Filtreler */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filtreEtkinlikTuru}
                  onChange={(e) => setFiltreEtkinlikTuru(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Tüm Etkinlikler</option>
                  <option value="dogum_gunu">Doğum Günleri</option>
                  <option value="yildonumu">Çalışma Yıldönümleri</option>
                  <option value="izin">İzin Talepleri & Bildirimleri</option>
                  <option value="tatil">Resmi Tatiller & İzin Günleri</option>
                  <option value="egitim">Eğitimler & Seminerler</option>
                  <option value="diger">Diğer / Duyurular</option>
                </select>

                <select
                  value={filtreDepartman}
                  onChange={(e) => setFiltreDepartman(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="all">Tüm Departmanlar</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {isManagement && (
                <button
                  onClick={() => setShowNewEvent(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Yeni Etkinlik
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'takvim' && (
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

              {/* Bu Ayın Doğum Günü ve Yıldönümleri Banner */}
              {buAyinKutlamalari.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 shadow-xs">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-bold text-gray-800 text-sm">
                      {monthYear} Doğum Günü ve Çalışma Yıldönümü Hatırlatmaları ({buAyinKutlamalari.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {buAyinKutlamalari.map((kutlama) => (
                      <div
                        key={kutlama.id}
                        onClick={() => setSelectedDate(kutlama.tarih)}
                        className="bg-white/90 backdrop-blur-xs border border-pink-100 hover:border-pink-300 rounded-xl p-3 cursor-pointer transition-all hover:shadow-xs flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{kutlama.baslik}</p>
                          <p className="text-[11px] text-gray-500 truncate">{kutlama.departman || 'Genel Departman'}</p>
                        </div>
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded-lg shrink-0">
                          📅 {new Date(kutlama.tarih).getDate()} {monthYear.split(' ')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Takvim */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {/* Hafta Günleri */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {weekDays.map(day => (
                    <div key={day} className="p-2 text-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Takvim Günleri (Ekran Sığdırma İçin Kompakt Hücre Yüksekliği) */}
                <div className="grid grid-cols-7">
                  {calendarDays.map((date, index) => {
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isToday = date.toDateString() === new Date().toDateString();
                    const dateString = formatDateToYYYYMMDD(date);
                    const dayEvents = getEventsForDate(date);
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const resmiTatil = isResmiTatil(date);
                    const maxDisplayEvents = resmiTatil ? 1 : 2;

                    return (
                      <div
                        key={index}
                        onClick={() => setSelectedDate(dateString)}
                        className={`min-h-[58px] sm:min-h-[64px] p-1.5 border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50/50 transition-all flex flex-col justify-between ${
                          !isCurrentMonth ? 'bg-gray-50/60 text-gray-400' : 'bg-white'
                        } ${isToday ? 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-300' : ''} ${
                          isWeekend || resmiTatil ? 'bg-red-50/40' : ''
                        } ${selectedDate === dateString ? 'ring-2 ring-blue-500 z-10' : ''}`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className={
                            !isCurrentMonth ? 'text-gray-400' : 
                            isToday ? 'text-blue-600 font-extrabold' : 
                            isWeekend || resmiTatil ? 'text-red-600' : 'text-gray-800'
                          }>
                            {date.getDate()}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="bg-blue-600 text-white text-[9px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center shadow-2xs">
                              {dayEvents.length}
                            </span>
                          )}
                        </div>
                        
                        {/* Kompakt Etkinlik Gösterimi */}
                        <div className="space-y-0.5 mt-0.5 overflow-hidden">
                          {resmiTatil && (
                            <div className="text-[9px] font-semibold bg-red-100 text-red-700 px-1 py-0.5 rounded truncate leading-tight">
                              🔴 {resmiTatil.ad}
                            </div>
                          )}
                          
                          {dayEvents.slice(0, maxDisplayEvents).map((etkinlik, idx) => (
                            <div
                              key={idx}
                              className={`text-[9px] px-1 py-0.5 rounded border truncate leading-tight font-medium ${getEtkinlikRengi(etkinlik.tur)}`}
                              title={`${etkinlik.baslik} - ${etkinlik.aciklama}`}
                            >
                              {etkinlik.baslik}
                            </div>
                          ))}
                          {dayEvents.length > maxDisplayEvents && (
                            <div className="text-[8.5px] text-gray-400 font-medium px-0.5">
                              +{dayEvents.length - maxDisplayEvents} daha
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seçili Gün Detayları Modalı */}
              {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                  <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                      <h4 className="text-lg font-bold text-gray-800">
                        {formatTarih(selectedDate)} Etkinlikleri
                      </h4>
                      <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-gray-200 rounded-lg">
                        <XCircle className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                    <div className="p-4 overflow-y-auto">
                      {(() => {
                        const gunEtkinlikleri = organizeEventsByDate(filteredEvents, selectedDate);
                        
                        if (gunEtkinlikleri.etkinlikler.length === 0) {
                          return (
                            <div className="text-center py-8">
                              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500">Bu günde etkinlik bulunmuyor</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-3">
                            {gunEtkinlikleri.etkinlikler.map(etkinlik => (
                              <div key={etkinlik.id} className="border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-shadow">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h5 className="font-bold text-gray-800">{etkinlik.baslik}</h5>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getEtkinlikRengi(etkinlik.tur)}`}>
                                        {getEtkinlikTuruAdi(etkinlik.tur)}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">{etkinlik.aciklama}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTarihAraligi(etkinlik.tarih, etkinlik.bitisTarihi)}</span>
                                      {etkinlik.departman && (
                                        <span className="flex items-center gap-1"><Building className="w-3 h-3" /> {etkinlik.departman}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'etkinlikler' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etkinlik</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kişi Sayısı</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredEvents
                      .sort((a, b) => new Date(a.tarih).getTime() - new Date(b.tarih).getTime())
                      .map((etkinlik) => (
                        <tr key={etkinlik.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div>
                              <div className="text-sm font-medium text-gray-800">{etkinlik.baslik}</div>
                              <div className="text-xs text-gray-500">{etkinlik.aciklama}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs border ${getEtkinlikRengi(etkinlik.tur)}`}>
                              {getEtkinlikTuruAdi(etkinlik.tur)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-800">
                            {formatTarihAraligi(etkinlik.tarih, etkinlik.bitisTarihi)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {etkinlik.departman || '-'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getOncelikRengi(etkinlik.oncelik)}`}>
                              {etkinlik.oncelik}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getDurumRengi(etkinlik.durum)}`}>
                              {etkinlik.durum.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {etkinlik.ilgiliPersonel?.length || 0}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'süreler' && (
            <div className="space-y-6">
              {/* İş Kanunu Süreleri */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">İş Kanunu Süreleri</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Yıllık İzin Süreleri</h4>
                    <div className="space-y-1 text-sm text-blue-700">
                      <div>1-5 yıl: {IS_KANUNU_SURELERI.yillikIzin.birIlaBesYil} gün</div>
                      <div>5-15 yıl: {IS_KANUNU_SURELERI.yillikIzin.besIlaOnbesYil} gün</div>
                      <div>15+ yıl: {IS_KANUNU_SURELERI.yillikIzin.onbesYilUstunde} gün</div>
                      <div>50+ yaş ek: +{IS_KANUNU_SURELERI.yillikIzin.elliYasUstundeEkIzin} gün</div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Özel İzin Süreleri</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <div>Mazeret İzni: {IS_KANUNU_SURELERI.mazeretIzni} gün</div>
                      <div>Doğum İzni: {IS_KANUNU_SURELERI.dogumIzni} gün</div>
                      <div>Babalık İzni: {IS_KANUNU_SURELERI.babalikIzni} gün</div>
                      <div>Evlilik İzni: {IS_KANUNU_SURELERI.evlilikIzni} gün</div>
                      <div>Ölüm İzni: {IS_KANUNU_SURELERI.olumIzni} gün</div>
                      <div>Yol İzni: {IS_KANUNU_SURELERI.yolIzni} gün</div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-800 mb-2">Çalışma Süreleri</h4>
                    <div className="space-y-1 text-sm text-yellow-700">
                      <div>Haftalık: {IS_KANUNU_SURELERI.haftalikCalismaSaati} saat</div>
                      <div>Günlük: {IS_KANUNU_SURELERI.gunlukCalismaSaati} saat</div>
                      <div>Fazla Mesai Sınırı: {IS_KANUNU_SURELERI.fazlaMesaiSiniri} saat/yıl</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bordro ve SGK Süreleri */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Bordro ve SGK Süreleri</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">Aylık İşlemler</h4>
                    <div className="space-y-1 text-sm text-purple-700">
                      <div>Bordro Hazırlık: {BORDRO_SURELERI.bordroHazirlikGunleri} gün</div>
                      <div>Bordro Ödeme: {BORDRO_SURELERI.bordroOdemeGunleri} gün</div>
                      <div>SGK Bildirimi: Ayın {BORDRO_SURELERI.sgkBildirimi}'üne kadar</div>
                      <div>Vergi Beyannamesi: Ayın {BORDRO_SURELERI.vergiBeyannamesi}'sına kadar</div>
                    </div>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-medium text-orange-800 mb-2">Yıllık İşlemler</h4>
                    <div className="space-y-1 text-sm text-orange-700">
                      <div>Bordro Kapanışı: {BORDRO_SURELERI.yillikBordroKapanisi}</div>
                      <div>Prim Bildirimi: Ayın {BORDRO_SURELERI.primBildirimi}'üne kadar</div>
                      <div>Yıllık Beyanname: 31 Mart'a kadar</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eğitim Süreleri */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Eğitim ve Gelişim Süreleri</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-2">Zorunlu Eğitimler</h4>
                    <div className="space-y-1 text-sm text-green-700">
                      <div>İşe Giriş: {EGITIM_SURELERI.iseGirisEgitimi} gün</div>
                      <div>İş Sağlığı: {EGITIM_SURELERI.isSagligiEgitimi} saat</div>
                      <div>Periyodik: {EGITIM_SURELERI.periyodikEgitim} günde bir</div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-medium text-indigo-800 mb-2">Değerlendirme Süreleri</h4>
                    <div className="space-y-1 text-sm text-indigo-700">
                      <div>Performans: {EGITIM_SURELERI.performansDegerlendirme} günde bir</div>
                      <div>Kariyer Planlama: {EGITIM_SURELERI.kariyer_planlama} günde bir</div>
                    </div>
                  </div>

                  <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                    <h4 className="font-medium text-pink-800 mb-2">Resmi Tatiller</h4>
                    <div className="space-y-1 text-sm text-pink-700">
                      <div>Toplam: {getResmiTatillerForYear(currentDate.getFullYear()).length} gün</div>
                      <div>Milli Bayramlar: 7 gün</div>
                      <div>Dini Bayramlar: 7 gün</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resmi Tatil Listesi */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">{currentDate.getFullYear()} Resmi Tatil Günleri</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getResmiTatillerForYear(currentDate.getFullYear()).map(tatil => (
                    <div key={tatil.tarih} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div>
                        <div className="font-medium text-red-800">{tatil.ad}</div>
                        <div className="text-sm text-red-600">Resmi Tatil</div>
                      </div>
                      <div className="text-sm text-red-700">
                        {formatTarih(tatil.tarih)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Etkinlik Renk Kodları */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h4 className="text-sm font-medium text-gray-800 mb-3">Etkinlik Türü Renk Kodları</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {(['tatil', 'izin', 'egitim', 'toplanti', 'diger'] as EtkinlikTuru[]).map(tur => (
            <div key={tur} className="flex items-center gap-2">
              <div className={`w-3.5 h-3.5 rounded-full ${getEtkinlikNoktaRengi(tur)}`} />
              <span className="text-xs font-semibold text-gray-700">{getEtkinlikTuruAdi(tur)}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Yeni Etkinlik Ekleme Modali */}
      {showNewEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Yeni Etkinlik Ekle</h3>
              <button onClick={() => setShowNewEvent(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Etkinlik Türü / Kategori</label>
                <select
                  value={yeniEtkinlik.tur}
                  onChange={(e) => setYeniEtkinlik({ ...yeniEtkinlik, tur: e.target.value as EtkinlikTuru })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-white text-sm font-medium text-gray-800"
                >
                  <option value="tatil">🟢 Tatil (Resmi & Genel Tatiller)</option>
                  <option value="izin">🟠 İzin (Personel İzinleri)</option>
                  <option value="egitim">🔵 Eğitim (Eğitim & Seminerler)</option>
                  <option value="toplanti">🟣 Toplantı (Toplantı & Etkinlikler)</option>
                  <option value="diger">🔘 Diğer (Genel & Çeşitli Etkinlikler)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                <input
                  type="date"
                  value={yeniEtkinlik.tarih}
                  onChange={(e) => setYeniEtkinlik({ ...yeniEtkinlik, tarih: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                <input
                  type="text"
                  value={yeniEtkinlik.baslik}
                  onChange={(e) => setYeniEtkinlik({ ...yeniEtkinlik, baslik: e.target.value })}
                  placeholder="Örn: Ekip Toplantısı"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detay / Açıklama</label>
                <textarea
                  value={yeniEtkinlik.aciklama}
                  onChange={(e) => setYeniEtkinlik({ ...yeniEtkinlik, aciklama: e.target.value })}
                  placeholder="Toplantı detayları..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 min-h-[80px]"
                />
              </div>

              {yeniEtkinlik.tarih && (() => {
                const [y] = yeniEtkinlik.tarih.split('-').map(Number);
                const tatiller = getResmiTatillerForYear(y || 2026);
                const tatil = tatiller.find(t => t.tarih === yeniEtkinlik.tarih);
                if (!tatil) return null;
                return (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>Dikkat:</strong> Seçilen tarih ({tatil.ad}) resmi tatildir!</span>
                  </div>
                );
              })()}
              <button
                onClick={() => {
                  if (!yeniEtkinlik.baslik || !yeniEtkinlik.tarih) {
                    alert('Lütfen başlık ve tarih giriniz.');
                    return;
                  }
                  const newEv: TakvimEtkinlik = {
                    id: `custom-${Date.now()}`,
                    tarih: yeniEtkinlik.tarih,
                    baslik: yeniEtkinlik.baslik,
                    aciklama: yeniEtkinlik.aciklama,
                    tur: yeniEtkinlik.tur || 'toplanti',
                    durum: 'beklemede' as any,
                    oncelik: 'normal' as any
                  };
                  const updatedCustomEvents = [...customEtkinlikler, newEv];
                  setCustomEtkinlikler(updatedCustomEvents);
                  try {
                    localStorage.setItem('humanius_custom_events', JSON.stringify(updatedCustomEvents));
                    localStorage.setItem('humanius_new_alert_notification', 'true');
                  } catch {}
                  window.dispatchEvent(new Event('storage'));
                  setYeniEtkinlik({ baslik: '', aciklama: '', tarih: '', tur: 'toplanti' });
                  setShowNewEvent(false);
                }}
                className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakvimYonetimi;