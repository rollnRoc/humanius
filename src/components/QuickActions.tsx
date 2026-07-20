import React from 'react';
import { Calendar, Bell, FileText, Award } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface QuickActionsProps {
  onBulkLeave?: () => void;
  onBulkAlert?: () => void;
  onUploadPayroll?: () => void;
  onAssignCertificate?: () => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onBulkLeave,
  onBulkAlert,
  onUploadPayroll,
  onAssignCertificate
}) => {
  const { t } = useLanguage();

  const actions = [
    { label: t('quickActions.bulkLeave'), icon: Calendar, onClick: onBulkLeave },
    { label: t('quickActions.bulkAlert'), icon: Bell, onClick: onBulkAlert },
    { label: t('quickActions.uploadPayroll'), icon: FileText, onClick: onUploadPayroll }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-bold text-gray-800">{t('quickActions.title')}</h3>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={action.onClick}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm w-full"
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm whitespace-nowrap">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuickActions;