import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const UpcomingEvents: React.FC = () => {
  const { t } = useLanguage();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');

  const events = [
    { id: 1, title: 'Ahmet Yılmaz - Yıllık İzin', date: `${currentYear}-${currentMonth}-15`, type: 'izin' },
    { id: 2, title: 'IT Departmanı Toplantısı', date: `${currentYear}-${currentMonth}-18`, type: 'toplanti' },
    { id: 3, title: 'Bordro Hazırlama Son Gün', date: `${currentYear}-${currentMonth}-20`, type: 'bordro' },
    { id: 4, title: 'Yeni Personel Oryantasyonu', date: `${currentYear}-${currentMonth}-22`, type: 'egitim' }
  ];

  const getEventColor = (type: string) => {
    const colors = {
      izin: 'bg-yellow-50 border-yellow-200 text-yellow-700',
      toplanti: 'bg-blue-50 border-blue-200 text-blue-700',
      bordro: 'bg-red-50 border-red-200 text-red-700',
      egitim: 'bg-green-50 border-green-200 text-green-700'
    };
    return colors[type as keyof typeof colors] || colors.toplanti;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">{t('upcomingEvents.title')}</h3>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {events.map(event => (
            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{event.title}</p>
                  <p className="text-xs text-gray-500">{event.date}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs border ${getEventColor(event.type)}`}>
                {event.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UpcomingEvents;