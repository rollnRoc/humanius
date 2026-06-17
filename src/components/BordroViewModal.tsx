import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { BordroItem } from '../types/bordro';
import { formatNumber } from '../utils/bordroCalculations';
import BordroOnay from './BordroOnay';
import { bordroService } from '../services/bordroService';
import { useAuth } from '../contexts/AuthContext';

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
  const { appRole } = useAuth();
  const effectiveEmployeeView = isEmployeeView || ['employee', 'user'].includes(appRole);

  const [approvalStatus, setApprovalStatus] = useState<'beklemede' | 'onaylandi' | 'reddedildi' | 'taslak'>(
    bordro.approval_status || 'taslak'
  );
  const [approvalDetails, setApprovalDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovalStatus();
  }, [bordro.id]);

  const loadApprovalStatus = async () => {
    try {
      setLoading(true);
      console.log('loadApprovalStatus: bordro.id =', bordro.id, 'bordro.approval_status =', bordro.approval_status);
      const approvals = await bordroService.getApprovals(bordro.id);
      console.log('loadApprovalStatus: fetched approvals =', approvals);

      if (approvals && approvals.length > 0) {
        const latestApproval = approvals[0];
        console.log('loadApprovalStatus: setting approval status from database =', latestApproval.approval_status);
        setApprovalStatus(latestApproval.approval_status as any);
        setApprovalDetails(latestApproval);
      } else {
        console.log('loadApprovalStatus: setting approval status from bordro prop =', bordro.approval_status || 'taslak');
        setApprovalStatus(bordro.approval_status || 'taslak');
        setApprovalDetails(null);
      }
    } catch (error) {
      console.error('Onay durumu yüklenemedi, fallback kullanılıyor:', error);
      // Fallback: If DB query fails (e.g. due to RLS), preserve the status from the prop
      setApprovalStatus(bordro.approval_status || 'taslak');
      setApprovalDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalComplete = () => {
    loadApprovalStatus();
    if (onApprovalComplete) {
      onApprovalComplete();
    }
  };

  const getStatusBadge = () => {
    if (loading) {
      return (
        <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm">
          <Clock className="w-4 h-4 animate-spin" />
          Yükleniyor...
        </span>
      );
    }

    switch (approvalStatus) {
      case 'onaylandi':
        return (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Onaylandı
          </span>
        );
      case 'reddedildi':
        return (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
            <XCircle className="w-4 h-4" />
            Reddedildi
          </span>
        );
      case 'beklemede':
        return (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium">
            <Clock className="w-4 h-4" />
            Onay Bekliyor
          </span>
        );
      case 'taslak':
      default:
        return (
          <span className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
            <FileText className="w-4 h-4" />
            Taslak (Onaya Gönderilmedi)
          </span>
        );
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getVerificationMethodText = (method: string) => {
    if (!method) return 'Belirtilmemiş';

    switch (method) {
      case 'signature':
        return 'Dijital İmza';
      case 'id_document':
        return 'Kimlik Belgesi';
      case 'passcode':
        return 'Şifre Doğrulama';
      default:
        return method;
    }
  };

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
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">Onay Durumu:</span>
            {getStatusBadge()}
          </div>

          {approvalDetails && approvalStatus === 'onaylandi' && (
            <div className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-green-900">Güvenli Onay Detayları</h3>
                  <p className="text-xs text-green-700">Zaman damgalı ve şifrelenmiş kayıt</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-xs font-semibold text-green-800">Onay Tarihi</span>
                  </div>
                  <p className="text-sm font-medium text-green-900 ml-6">
                    {formatDateTime(approvalDetails.timestamp)}
                  </p>
                </div>

                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    {approvalDetails.verification_method === 'signature' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    ) : approvalDetails.verification_method === 'id_document' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    )}
                    <span className="text-xs font-semibold text-green-800">Doğrulama Yöntemi</span>
                  </div>
                  <p className="text-sm font-medium text-green-900 ml-6">
                    {getVerificationMethodText(approvalDetails.verification_method)}
                  </p>
                </div>

                {approvalDetails.ip_address && (
                  <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                      <span className="text-xs font-semibold text-green-800">IP Adresi</span>
                    </div>
                    <p className="text-sm font-mono text-green-900 ml-6">
                      {approvalDetails.ip_address}
                    </p>
                  </div>
                )}

                <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-xs font-semibold text-green-800">Onaylayan</span>
                  </div>
                  <p className="text-sm font-medium text-green-900 ml-6">
                    {approvalDetails.employee_name}
                  </p>
                </div>
              </div>

              {/* Dijital İmza Gösterimi */}
              {approvalDetails.verification_method === 'signature' && approvalDetails.signature_data && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Dijital İmza
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-green-300 inline-block">
                    <img
                      src={approvalDetails.signature_data}
                      alt="Dijital İmza"
                      className="h-24 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Kimlik Belgesi Gösterimi */}
              {approvalDetails.verification_method === 'id_document' && approvalDetails.id_document_data && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                    Kimlik Belgesi
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-green-300 inline-block">
                    <img
                      src={approvalDetails.id_document_data}
                      alt="Kimlik Belgesi"
                      className="h-32 object-contain rounded"
                    />
                  </div>
                </div>
              )}

              {/* Şifre Doğrulama Bilgisi */}
              {approvalDetails.verification_method === 'passcode' && (
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <h4 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Şifre Doğrulama
                  </h4>
                  <p className="text-sm text-green-700">
                    Personel şifresi ile doğrulanmıştır
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-200">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs text-green-700 font-medium">
                  Bu onay 256-bit şifreleme ile korunmaktadır
                </span>
              </div>
            </div>
          )}

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

          {approvalStatus === 'beklemede' && !loading && effectiveEmployeeView && (
            <BordroOnay
              bordro={bordro}
              employeeId={employeeId}
              employeeName={employeeName}
              onApprovalComplete={handleApprovalComplete}
            />
          )}
          
          {approvalStatus === 'beklemede' && !loading && !effectiveEmployeeView && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
              <Clock className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-yellow-800">Personel Onayı Bekleniyor</h3>
              <p className="text-xs text-yellow-700 mt-1">Bu bordro personelin onayına gönderilmiştir. Personel onayladıktan sonra durumu güncellenecektir.</p>
            </div>
          )}

          {approvalStatus === 'taslak' && !loading && !effectiveEmployeeView && onSendForApproval && (
            <div className="mt-6">
              <button
                onClick={() => {
                  onSendForApproval(bordro);
                  onClose();
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Send className="w-5 h-5" />
                Personelin Onayına Gönder
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BordroViewModal;
