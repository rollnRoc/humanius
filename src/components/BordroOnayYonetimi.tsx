import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Eye, Calendar, User, Shield, FileText } from 'lucide-react';
import { bordroService } from '../services/bordroService';
import { employeeService } from '../services/employeeService';
import bcrypt from 'bcryptjs';
import { useAuth } from '../contexts/AuthContext';
import { emailService } from '../services/emailService';
import BordroViewModal from './BordroViewModal';
import PasscodeVerificationModal from './PasscodeVerificationModal';

interface BordroOnayItem {
  id: string;
  period: string;
  employee_id: string;
  employee_name: string;
  brut_maas: number;
  net_maas: number;
  toplam_kesinti: number;
  approval_status: 'beklemede' | 'onaylandi' | 'reddedildi';
  approval_date?: string;
  sicil_no?: string;
  tc_no?: string;
  employees?: {
    name?: string;
    department?: string;
  } | null;
}

const BordroOnayYonetimi: React.FC = () => {
  const { user } = useAuth();
  const [bordrolar, setBordrolar] = useState<BordroOnayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'beklemede' | 'onaylandi' | 'reddedildi'>('beklemede');
  const [selectedBordro, setSelectedBordro] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [currentAction, setCurrentAction] = useState<{
    bordroId: string;
    employeeId: string;
    employeeName: string;
    type: 'approve' | 'reject';
  } | null>(null);

  const loadBordrolar = async () => {
    if (!user?.user_metadata?.company_id) return;

    try {
      setLoading(true);
      const data = await bordroService.getAll(user.user_metadata.company_id);
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        employee_name: item.employee_name || item.employees?.name || item.employee_id,
      })) as BordroOnayItem[];
      setBordrolar(mappedData);
    } catch (error) {
      console.error('Error loading bordrolar:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBordrolar();
  }, [user]);

  const handleApprove = (bordroId: string, employeeId: string, employeeName: string) => {
    setCurrentAction({
      bordroId,
      employeeId,
      employeeName,
      type: 'approve'
    });
    setShowPasscodeModal(true);
  };

  const handleReject = (bordroId: string, employeeId: string, employeeName: string) => {
    setCurrentAction({
      bordroId,
      employeeId,
      employeeName,
      type: 'reject'
    });
    setShowPasscodeModal(true);
  };

  const handlePasscodeVerify = async (passcode: string): Promise<boolean> => {
    if (!user?.user_metadata?.company_id || !currentAction) return false;

    try {
      // Onaylayan kişinin (login olan kullanıcının) şifresi kontrol edilmeli
      const empList = await employeeService.getAll(user.user_metadata.company_id);
      const matchedEmployee = empList.find(e => e.email.toLowerCase() === user.email?.toLowerCase());
      if (!matchedEmployee) return false;

      const storedPasscode = matchedEmployee.approval_passcode;
      let isValid = false;
      if (storedPasscode) {
        try {
          isValid = bcrypt.compareSync(passcode, storedPasscode);
        } catch {
          isValid = false;
        }
        if (!isValid && storedPasscode === passcode) {
          isValid = true;
        }
      } else {
        // Eğer onay şifresi tanımlanmamışsa doğrudan onaylasın
        isValid = true;
      }

      if (!isValid) {
        return false;
      }

      setActionLoading(currentAction.bordroId);

      const approval = {
        bordro_id: currentAction.bordroId,
        company_id: user.user_metadata.company_id,
        employee_id: currentAction.employeeId,
        employee_name: currentAction.employeeName,
        verification_method: 'passcode' as const,
        approval_status: currentAction.type === 'approve' ? 'onaylandi' as const : 'reddedildi' as const,
        ip_address: '',
        user_agent: navigator.userAgent
      };

      await bordroService.createApproval(approval);
      
      // E-posta bildirimi gönder
      if (currentAction.type === 'approve') {
        const employee = await employeeService.getById(currentAction.employeeId);
        if (employee && employee.email) {
          const bordro = bordrolar.find(b => b.id === currentAction.bordroId);
          if (bordro) {
            await emailService.sendBordroApprovalEmail(
              employee.email, 
              currentAction.employeeName, 
              bordro.period
            );
          }
        }
      }

      await loadBordrolar();

      setShowPasscodeModal(false);
      setCurrentAction(null);
      setActionLoading(null);

      return true;
    } catch (error) {
      console.error('Error processing approval:', error);
      setActionLoading(null);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Onay işlemi sırasında beklenmeyen bir hata oluştu.'
      );
    }
  };

  const handleView = (bordro: BordroOnayItem) => {
    setSelectedBordro({
      ...bordro,
      employeeId: bordro.employee_id,
      employeeName: bordro.employee_name,
      brütMaas: bordro.brut_maas,
      netMaas: bordro.net_maas,
      toplamKesinti: bordro.toplam_kesinti,
      sicilNo: bordro.sicil_no,
      tcNo: bordro.tc_no
    });
    setShowModal(true);
  };

  const filteredBordrolar = bordrolar.filter(b => {
    const status = b.approval_status || 'beklemede';
    return status === selectedTab;
  });

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'onaylandi':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Onaylandı
          </span>
        );
      case 'reddedildi':
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Reddedildi
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium">
            <Clock className="w-3 h-3" />
            Onay Bekliyor
          </span>
        );
    }
  };

  const getTabCount = (status: 'beklemede' | 'onaylandi' | 'reddedildi') => {
    return bordrolar.filter(b => (b.approval_status || 'beklemede') === status).length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Bordro Onay Yönetimi</h2>
        </div>
        <p className="text-sm text-gray-600">
          Bordroları gözden geçirin, onaylayın veya reddedin. Tüm işlemler kayıt altına alınır.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 p-4">
            <button
              onClick={() => setSelectedTab('beklemede')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                selectedTab === 'beklemede'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              Onay Bekleyenler
              <span className="ml-1 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded-full text-xs font-bold">
                {getTabCount('beklemede')}
              </span>
            </button>
            <button
              onClick={() => setSelectedTab('onaylandi')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                selectedTab === 'onaylandi'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              Onaylananlar
              <span className="ml-1 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                {getTabCount('onaylandi')}
              </span>
            </button>
            <button
              onClick={() => setSelectedTab('reddedildi')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                selectedTab === 'reddedildi'
                  ? 'bg-red-100 text-red-700 border border-red-300'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Reddedilenler
              <span className="ml-1 px-2 py-0.5 bg-red-200 text-red-800 rounded-full text-xs font-bold">
                {getTabCount('reddedildi')}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Personel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dönem
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brüt Maaş
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Maaş
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredBordrolar.map((bordro) => (
                  <tr key={bordro.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-300 flex items-center justify-center text-xs text-blue-700 font-semibold">
                          {bordro.employee_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '??'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-800">{bordro.employee_name}</div>
                          {bordro.sicil_no && (
                            <div className="text-xs text-gray-500">Sicil: {bordro.sicil_no}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatPeriod(bordro.period)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">
                      {bordro.brut_maas?.toLocaleString('tr-TR') || 0} ₺
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-600">
                      {bordro.net_maas?.toLocaleString('tr-TR') || 0} ₺
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(bordro.approval_status || 'beklemede')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(bordro)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {selectedTab === 'beklemede' && (
                          <>
                            <button
                              onClick={() => handleApprove(bordro.id, bordro.employee_id, bordro.employee_name)}
                              disabled={actionLoading === bordro.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Onayla"
                            >
                              <CheckCircle className="w-3 h-3" />
                              {actionLoading === bordro.id ? 'İşleniyor...' : 'Onayla'}
                            </button>
                            <button
                              onClick={() => handleReject(bordro.id, bordro.employee_id, bordro.employee_name)}
                              disabled={actionLoading === bordro.id}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              title="Reddet"
                            >
                              <XCircle className="w-3 h-3" />
                              {actionLoading === bordro.id ? 'İşleniyor...' : 'Reddet'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {!loading && filteredBordrolar.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {selectedTab === 'beklemede' && 'Onay bekleyen bordro bulunmuyor.'}
                {selectedTab === 'onaylandi' && 'Onaylanmış bordro bulunmuyor.'}
                {selectedTab === 'reddedildi' && 'Reddedilmiş bordro bulunmuyor.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedBordro && (
        <BordroViewModal
          bordro={selectedBordro}
          employeeId={selectedBordro.employeeId}
          employeeName={selectedBordro.employeeName}
          onClose={() => {
            setShowModal(false);
            setSelectedBordro(null);
          }}
          onApprovalComplete={() => {
            setShowModal(false);
            setSelectedBordro(null);
            loadBordrolar();
          }}
        />
      )}

      {currentAction && (
        <PasscodeVerificationModal
          isOpen={showPasscodeModal}
          onClose={() => {
            setShowPasscodeModal(false);
            setCurrentAction(null);
          }}
          onVerify={handlePasscodeVerify}
          employeeName={currentAction.employeeName}
          title="Güvenli Belge Onayı"
          actionType={currentAction.type}
        />
      )}
    </div>
  );
};

export default BordroOnayYonetimi;
