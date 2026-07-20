import React from 'react';
import { Stats } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface StatsCardsProps {
  stats: Stats;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const { t } = useLanguage();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl mb-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-gray-200">
        <h2 className="font-bold text-gray-800">{t('stats.employeeList')}</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-sm">
            <span className="text-green-700">{t('stats.active')}:</span>
            <strong className="text-green-700">{stats.active}</strong>
          </span>
          <span className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full text-sm">
            <span className="text-yellow-700">{t('stats.onLeave')}:</span>
            <strong className="text-yellow-700">{stats.onLeave}</strong>
          </span>
          <span className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full text-sm">
            <span className="text-red-700">{t('stats.inactive')}:</span>
            <strong className="text-red-700">{stats.inactive}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;