import React, { useMemo } from 'react';
import { Calendar, Cake, Award, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { Employee } from '../types';
import type { IzinTalebi } from '../types/izin';

interface UpcomingEventsProps {
  employees?: Employee[];
  izinTalepleri?: IzinTalebi[];
}

const IZIN_TURU_LABEL: Record<string, string> = {
  yillik: 'Yıllık İzin',
  mazeret: 'Mazeret İzni',
  hastalik: 'Hastalık İzni',
  dogum: 'Doğum İzni',
  babalik: 'Babalık İzni',
  evlilik: 'Evlilik İzni',
  olum: 'Ölüm İzni',
  ucretsiz: 'Ücretsiz İzin',
};

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ employees = [], izinTalepleri = [] }) => {
  const { t } = useLanguage();

  const realEvents = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMonth = now.getMonth();

    const items: Array<{
      id: string;
      title: string;
      date: string;
      type: 'izin' | 'dogum' | 'kidem' | 'bordro';
      badgeText: string;
      icon: 'calendar' | 'cake' | 'award' | 'bordro';
    }> = [];

    // 1. Real Upcoming Approved & Pending Leaves
    const upcomingLeaves = izinTalepleri
      .filter((t) => (t.durum === 'onaylandi' || t.durum === 'beklemede') && t.bitisTarihi >= todayStr)
      .sort((a, b) => a.baslangicTarihi.localeCompare(b.baslangicTarihi))
      .slice(0, 4);

    for (const leave of upcomingLeaves) {
      items.push({
        id: `leave-${leave.id}`,
        title: `${leave.employeeName || 'Personel'} - ${IZIN_TURU_LABEL[leave.izinTuru] || 'İzin'}`,
        date: `${leave.baslangicTarihi} ~ ${leave.bitisTarihi} (${leave.gunSayisi || 1} Gün)`,
        type: 'izin',
        badgeText: leave.durum === 'onaylandi' ? 'Onaylandı' : 'Beklemede',
        icon: 'calendar',
      });
    }

    // 2. Real Upcoming Birthdays in current month
    for (const emp of employees) {
      const birthStr = emp.birth_date || (emp as any).birthDate;
      if (birthStr) {
        const bd = new Date(birthStr);
        if (!isNaN(bd.getTime()) && bd.getMonth() === currentMonth) {
          const dayFormatted = String(bd.getDate()).padStart(2, '0');
          const monthFormatted = String(currentMonth + 1).padStart(2, '0');
          items.push({
            id: `bday-${emp.id}`,
            title: `🎂 ${emp.name} - Doğum Günü`,
            date: `${now.getFullYear()}-${monthFormatted}-${dayFormatted}`,
            type: 'dogum',
            badgeText: 'Doğum Günü',
            icon: 'cake',
          });
        }
      }
    }

    // 3. Real Work Anniversaries in current month
    for (const emp of employees) {
      const joinStr = emp.join_date || emp.joinDate;
      if (joinStr) {
        const jd = new Date(joinStr);
        if (!isNaN(jd.getTime()) && jd.getMonth() === currentMonth) {
          const years = Math.max(1, now.getFullYear() - jd.getFullYear());
          const dayFormatted = String(jd.getDate()).padStart(2, '0');
          const monthFormatted = String(currentMonth + 1).padStart(2, '0');
          items.push({
            id: `anniv-${emp.id}`,
            title: `🎉 ${emp.name} - ${years}. Çalışma Yılı Yıldönümü`,
            date: `${now.getFullYear()}-${monthFormatted}-${dayFormatted}`,
            type: 'kidem',
            badgeText: 'Kıdem Yıldönümü',
            icon: 'award',
          });
        }
      }
    }

    // 4. Monthly Payroll Deadline
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentMonthFormatted = String(currentMonth + 1).padStart(2, '0');
    items.push({
      id: 'payroll-closing',
      title: 'Aylık Bordro Kapanışı & Maaş Tahakkuku',
      date: `${now.getFullYear()}-${currentMonthFormatted}-${lastDayOfMonth}`,
      type: 'bordro',
      badgeText: 'Bordro Kapanış',
      icon: 'bordro',
    });

    return items.slice(0, 5);
  }, [employees, izinTalepleri]);

  const getEventBadgeStyle = (type: string) => {
    switch (type) {
      case 'izin':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'dogum':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'kidem':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'bordro':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">{t('upcomingEvents.title')}</h3>
      </div>
      <div className="p-4">
        {realEvents.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            Yakın tarihte planlanmış izin veya kayıtlı olay bulunmuyor.
          </div>
        ) : (
          <div className="space-y-3">
            {realEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100/80 transition-colors">
                <div className="flex items-center gap-3">
                  {event.icon === 'cake' ? (
                    <Cake className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  ) : event.icon === 'award' ? (
                    <Award className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : event.icon === 'bordro' ? (
                    <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                  ) : (
                    <Calendar className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.date}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getEventBadgeStyle(event.type)}`}>
                  {event.badgeText}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;