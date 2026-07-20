import React, { useState } from 'react';
import { Shield, User, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { Employee } from '../types';

interface GlobalEmployeeHeaderProps {
  employee: Employee;
  isAccessGranted: boolean;
  onAccessGranted: () => void;
}

export const GlobalEmployeeHeader: React.FC<GlobalEmployeeHeaderProps> = ({
  employee,
  isAccessGranted,
  onAccessGranted
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <div className="mb-6 animate-fade-in bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="font-bold text-blue-900 text-base">İşlem Yapılan Kişi: {employee.name.toLocaleUpperCase('tr-TR')}</span>
          <span className="text-blue-700 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="w-5 h-5 text-blue-600" />
            Devam eden işlemler var.
          </span>
        </div>
        <button 
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors"
        >
          Personel Kartını Aç <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 animate-fade-in flex flex-col gap-6">
      {/* SAĞ: KART */}
      <div className="flex-1 flex flex-col gap-4">
        {/* İŞLEM DURUM BARI */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <span className="font-bold text-blue-900 text-base">İşlem Yapılan Kişi: {employee.name.toLocaleUpperCase('tr-TR')}</span>
            <span className="text-blue-700 flex items-center gap-2 text-sm font-medium hidden sm:flex">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              Bu kişinin işlemleri devam etmektedir.
            </span>
          </div>
          <button 
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-2 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold text-sm transition-colors shrink-0"
          >
            Kartı Küçült <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* İKİLİ PANO (GENEL BİLGİLER & QR) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* SOL PANEL: PERSONEL GENEL BİLGİLERİ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-500 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> PERSONEL GENEL BİLGİLERİ
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Adı Soyadı:</span>
                <span className="font-semibold text-gray-900">{employee.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Departman:</span>
                <span className="font-semibold text-gray-900">{employee.department || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-500">Şirket:</span>
                <span className="font-semibold text-gray-900">{employee.company_id ? 'Humanius (Demo)' : '-'}</span>
              </div>
            </div>
          </div>

          {/* SAĞ PANEL: GÜVENLİ ERİŞİM VE KONTROL (QR) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-gray-500 mb-4 border-b border-gray-100 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" /> GÜVENLİ ERİŞİM VE KONTROL (QR)
            </h3>
            <div className="flex-1 flex items-center justify-center gap-8">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <QRCodeSVG 
                  value={`https://humanius.net/evrak-kontrol?token=encrypted_${employee.id}`} 
                  size={120} 
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="flex flex-col items-start gap-2">
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold w-full text-sm">
                  <CheckCircle className="w-5 h-5" />
                  Evrak Doğrulama Aktif
                </div>
                <p className="text-xs text-gray-500 max-w-[200px]">
                  Bu QR kodu okutarak personelin resmi evraklarını ve zimmet kayıtlarını güvenli bir şekilde kontrol edebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
