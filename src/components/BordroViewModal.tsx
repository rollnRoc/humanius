import React, { useState, useEffect } from 'react';
import { X, FileText } from 'lucide-react';
import { BordroItem } from '../types/bordro';
import { formatNumber } from '../utils/bordroCalculations';

interface BordroViewModalProps {
  bordro: BordroItem;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
  onApprovalComplete?: () => void;
  isEmployeeView?: boolean;
  onSendForApproval?: (bordro: BordroItem) => void;
}

const BordroViewModal: React.FC<BordroViewModalProps> = ({
  bordro,
  employeeId,
  employeeName,
  onClose,
  onApprovalComplete,
  isEmployeeView = false,
  onSendForApproval
}) => {

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Bordro Detayı</h2>
              <p className="text-sm text-gray-500">{employeeName} - {bordro.period}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kazançlar</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Temel Maaş</span>
                  <span className="font-medium text-gray-800">{formatNumber(bordro.temel_kazanc)} ₺</span>
                </div>
                {bordro.yol_parasi > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Yol Parası</span>
                    <span className="font-medium text-gray-800">{formatNumber(bordro.yol_parasi)} ₺</span>
                  </div>
                )}
                {bordro.gida_yardimi > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Gıda Yardımı</span>
                    <span className="font-medium text-gray-800">{formatNumber(bordro.gida_yardimi)} ₺</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                  <span className="font-semibold text-green-700">Toplam Kazanç</span>
                  <span className="font-bold text-green-700">{formatNumber(bordro.toplam_kazanc)} ₺</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Kesintiler</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Gelir Vergisi</span>
                  <span className="font-medium text-gray-800">{formatNumber(bordro.gelir_vergisi)} ₺</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Damga Vergisi</span>
                  <span className="font-medium text-gray-800">{formatNumber(bordro.damga_vergisi)} ₺</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">SGK İşçi Payı</span>
                  <span className="font-medium text-gray-800">{formatNumber(bordro.sgk_isci_payi)} ₺</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">İşsizlik Sigortası</span>
                  <span className="font-medium text-gray-800">{formatNumber(bordro.issizlik_sigortasi)} ₺</span>
                </div>
                <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                  <span className="font-semibold text-red-700">Toplam Kesinti</span>
                  <span className="font-bold text-red-700">{formatNumber(bordro.toplam_kesinti)} ₺</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-blue-900">NET MAAŞ</span>
              <span className="text-3xl font-bold text-blue-900">{formatNumber(bordro.net_maas)} ₺</span>
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};

export default BordroViewModal;
