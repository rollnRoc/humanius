import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Smartphone,
  ExternalLink,
  Trash2,
  Sliders,
  Play,
  Info,
} from 'lucide-react';
import type { Employee } from '../types';
import { smsService, SmsConfig, SmsLogEntry } from '../services/smsService';
import { shiftSmsScheduler, ShiftSmsCheckResult } from '../services/shiftSmsScheduler';
import { getTodayYYYYMMDD } from '../utils/sanitize';
import { showSuccess, showError, showConfirm } from '../utils/swal';
import { useAuth } from '../contexts/AuthContext';

interface VardiyaSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  companyId?: string;
}

export const VardiyaSmsModal: React.FC<VardiyaSmsModalProps> = ({
  isOpen,
  onClose,
  employees,
  companyId,
}) => {
  const { appRole } = useAuth();
  const isSuperAdmin = appRole === 'superadmin';

  const [config, setConfig] = useState<SmsConfig>(() => smsService.getConfig(companyId));
  const [logs, setLogs] = useState<SmsLogEntry[]>([]);
  const [filterDate, setFilterDate] = useState<'today' | 'all'>('today');
  const [isChecking, setIsChecking] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testNote, setTestNote] = useState('Humanius Vardiya SMS Testi');
  const [showConfigEdit, setShowConfigEdit] = useState(false);

  // Edit config state
  const [editUsername, setEditUsername] = useState(config.username);
  const [editPassword, setEditPassword] = useState(config.password);
  const [editSourceAddr, setEditSourceAddr] = useState(config.source_addr);
  const [editStartDelay, setEditStartDelay] = useState(config.start_delay_minutes);
  const [editEndDelay, setEditEndDelay] = useState(config.end_delay_minutes);
  const [editLoginUrl, setEditLoginUrl] = useState(config.login_url);

  const todayStr = getTodayYYYYMMDD();

  const loadLogs = () => {
    const all = smsService.getLogs(filterDate === 'today' ? todayStr : undefined);
    setLogs(all);
  };

  useEffect(() => {
    if (isOpen) {
      const currentConfig = smsService.getConfig(companyId);
      setConfig(currentConfig);
      setEditUsername(currentConfig.username);
      setEditPassword(currentConfig.password);
      setEditSourceAddr(currentConfig.source_addr);
      setEditStartDelay(currentConfig.start_delay_minutes);
      setEditEndDelay(currentConfig.end_delay_minutes);
      setEditLoginUrl(currentConfig.login_url);
      loadLogs();
    }
  }, [isOpen, companyId, filterDate]);

  useEffect(() => {
    const handleUpdate = () => loadLogs();
    window.addEventListener('humanius_sms_updated', handleUpdate);
    return () => window.removeEventListener('humanius_sms_updated', handleUpdate);
  }, [filterDate]);

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    if (!isSuperAdmin) {
      showError('Vardiya SMS servisini yalnızca Süper Yönetici açıp kapatabilir.');
      return;
    }
    const nextState = !config.enabled;
    const updated = smsService.saveConfig(companyId, { enabled: nextState });
    setConfig(updated);
    if (nextState) {
      showSuccess('Vardiya SMS servisi bu firma için başlatıldı.');
    } else {
      showSuccess('Vardiya SMS servisi bu firma için duraklatıldı.');
    }
  };

  const handleSaveConfig = () => {
    const updated = smsService.saveConfig(companyId, {
      username: editUsername,
      password: editPassword,
      source_addr: editSourceAddr,
      start_delay_minutes: Number(editStartDelay) || 15,
      end_delay_minutes: Number(editEndDelay) || 15,
      login_url: editLoginUrl.trim() || 'https://humanius.net',
    });
    setConfig(updated);
    setShowConfigEdit(false);
    showSuccess('SMS ayarları başarıyla kaydedildi.');
  };

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res: ShiftSmsCheckResult = await shiftSmsScheduler.checkAndSendShiftSms({
        employees,
        companyId,
      });

      loadLogs();

      if (res.startSmsSent === 0 && res.endSmsSent === 0 && res.errors.length === 0) {
        showSuccess(
          `Tarama tamamlandı: Kontrol edilen ${res.checkedEmployeesCount} aktif personelden SMS gerektiren yeni bir gecikme bulunamadı.`
        );
      } else if (res.errors.length > 0) {
        showError(
          `Tarama tamamlandı. Gönderilen: ${res.startSmsSent + res.endSmsSent} adet. Hata alan: ${res.errors.length} adet.\n\nİlk Hata: ${res.errors[0]?.error}`
        );
      } else {
        showSuccess(
          `Vardiya SMS taraması başarıyla tamamlandı!\n• Başlatma Uyarısı: ${res.startSmsSent} personele gönderildi\n• Bitirme Uyarısı: ${res.endSmsSent} personele gönderildi`
        );
      }
    } catch (err: any) {
      showError(`Tarama sırasında bir hata oluştu: ${err?.message || err}`);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      showError('Lütfen geçerli bir telefon numarası giriniz.');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await smsService.sendTestSms(testPhone, testNote);
      loadLogs();
      if (res.success) {
        showSuccess(`Test SMS'i ${testPhone} numarasına başarıyla iletildi.`);
      } else {
        showError(
          `Test SMS gönderilemedi!\n\n${res.error || 'Bilinmeyen bir hata oluştu.'}`
        );
      }
    } catch (err: any) {
      showError(`Test gönderimi sırasında hata oluştu: ${err?.message || err}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleClearLogs = async () => {
    const confirmed = await showConfirm(
      'SMS kayıt günlüğünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
    );
    if (confirmed) {
      smsService.clearLogs();
      setLogs([]);
      showSuccess('SMS günlüğü temizlendi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-800">Vardiya SMS Bildirimleri</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Verimor Entegrasyonu
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Vardiyasını zamanında başlatmayan veya bitirmeyen personellere otomatik SMS uyarısı gönderir.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/30">
          {/* Süper Yönetici Bilgilendirmesi / Kısıtlaması */}
          {!isSuperAdmin && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-xs text-amber-800 shadow-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>
                <strong>Firma SMS Yetki Kuralı:</strong> Vardiya SMS bildirim servisi tüm firmalarda varsayılan olarak kapalıdır ve yalnızca <strong>Süper Yönetici</strong> tarafından açılıp kapatılabilir.
              </span>
            </div>
          )}

          {/* Status & Rules Summary Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Otomatik Servis
                  </span>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      config.enabled
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {config.enabled ? 'Aktif (60sn)' : 'Devre Dışı'}
                  </div>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {config.enabled
                    ? 'Sistem vardiyaları dakikada bir otomatik tarıyor.'
                    : 'Otomatik SMS gönderimi şu anda kapalıdır.'}
                </p>
              </div>
              <button
                onClick={isSuperAdmin ? handleToggleEnabled : undefined}
                disabled={!isSuperAdmin}
                className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  !isSuperAdmin
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : config.enabled
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                }`}
                title={!isSuperAdmin ? 'Bu ayar yalnızca Süper Yönetici tarafından değiştirilebilir.' : undefined}
              >
                {!isSuperAdmin ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
                    Süper Yönetici Yetkisi Gerekir
                  </>
                ) : (
                  config.enabled ? 'Servisi Duraklat' : 'Servisi Başlat'
                )}
              </button>
            </div>

            {/* Start Rule Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Başlatma Uyarısı
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                +{config.start_delay_minutes} Dakika Gecikmede
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Örn: <strong>08:30</strong> vardiyasına atanmış personel <strong>08:45</strong>'te hala giriş yapmadıysa SMS atılır.
              </p>
            </div>

            {/* End Rule Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Bitirme Uyarısı
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-800">
                +{config.end_delay_minutes} Dakika Gecikmede
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Örn: <strong>18:00</strong> vardiyasındaki personel <strong>18:15</strong>'te hala mesaiyi bitirmediyse SMS atılır.
              </p>
            </div>
          </div>

          {/* Quick Actions & Manual Trigger Bar */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600/10 text-blue-700 flex items-center justify-center shrink-0">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Anlık Vardiya Taraması Yap</h4>
                <p className="text-xs text-slate-600">
                  Otomatik döngüyü beklemeden hemen geciken personelleri tespit eder ve SMS gönderir.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setShowConfigEdit(!showConfigEdit)}
                className="flex-1 sm:flex-initial px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                Ayarları Düzenle
              </button>
              <button
                onClick={handleManualCheck}
                disabled={isChecking}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Taranıyor...' : 'Şimdi Kontrol Et ve Gönder'}
              </button>
            </div>
          </div>

          {/* Collapsible Config Settings */}
          {showConfigEdit && (
            <div className="bg-white p-5 rounded-xl border border-slate-300 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Verimor SMS API & Zamanlama Ayarları</h3>
                </div>
                <span className="text-xs text-slate-500">onayliform & BigPortal ile birebir uyumlu</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verimor Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="908502428910"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Verimor Şifre / API Key
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMS Başlığı (Source Addr)
                  </label>
                  <input
                    type="text"
                    value={editSourceAddr}
                    onChange={(e) => setEditSourceAddr(e.target.value)}
                    placeholder="Boş (Varsayılan)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Başlatma Gecikmesi (Dakika)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editStartDelay}
                    onChange={(e) => setEditStartDelay(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">Örn: 15 dk (08:30 için 08:45)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bitirme Gecikmesi (Dakika)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editEndDelay}
                    onChange={(e) => setEditEndDelay(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">Örn: 15 dk (18:00 için 18:15)</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SMS Altı Giriş Linki
                  </label>
                  <input
                    type="text"
                    value={editLoginUrl}
                    onChange={(e) => setEditLoginUrl(e.target.value)}
                    placeholder="https://humanius.net"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
                  />
                  <span className="text-[11px] text-slate-500">Personelin tıklayacağı URL</span>
                </div>
              </div>

              {/* IP Whitelisting Warning Alert */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Verimor IP Güvenlik Uyarısı:</strong> Verimor hesabınızda IP kısıtlaması aktif olduğunda, SMS gönderilecek sunucu veya istemcinin IP adresinin Verimor panelinden (<strong>Güvenlik &gt; İzinli IP'ler</strong>) listeye eklenmiş olması gerekmektedir. İzinli olmayan IP'lerde Verimor <code>403 (İzinsiz IP)</code> yanıtı verir.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfigEdit(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                >
                  Kaydet
                </button>
              </div>
            </div>
          )}

          {/* Test SMS Sending Form */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tek Seferlik Test SMS Gönder
              </h3>
            </div>
            <form onSubmit={handleSendTestSms} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="Telefon (Örn: 05332702776)"
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              />
              <input
                type="text"
                value={testNote}
                onChange={(e) => setTestNote(e.target.value)}
                placeholder="Test Mesajı Açıklaması"
                className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 bg-white"
              />
              <button
                type="submit"
                disabled={isSendingTest}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                {isSendingTest ? 'Gönderiliyor...' : 'Test Gönder'}
              </button>
            </form>
          </div>

          {/* SMS Logs Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Gönderilen SMS Kayıt Günlüğü
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                  {logs.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setFilterDate('today')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterDate === 'today'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    onClick={() => setFilterDate('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold transition ${
                      filterDate === 'all'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tüm Geçmiş
                  </button>
                </div>
                {logs.length > 0 && (
                  <button
                    onClick={handleClearLogs}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Günlüğü Temizle"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium">
                  {filterDate === 'today'
                    ? 'Bugün için henüz gönderilmiş bir SMS kaydı bulunmuyor.'
                    : 'Kayıtlı SMS geçmişi bulunmuyor.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Saat</th>
                      <th className="py-2.5 px-3">Personel</th>
                      <th className="py-2.5 px-3">Telefon</th>
                      <th className="py-2.5 px-3">Bildirim Türü</th>
                      <th className="py-2.5 px-3">Vardiya</th>
                      <th className="py-2.5 px-3">Durum</th>
                      <th className="py-2.5 px-3">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map((log) => {
                      const timeStr = new Date(log.timestamp).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isSuccess = log.status === 'success';

                      return (
                        <tr key={log.id} className="hover:bg-slate-50 transition">
                          <td className="py-2 px-3 text-slate-500 font-mono">{timeStr}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {log.employee_name}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-600">{log.phone}</td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                log.type === 'start_reminder'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : log.type === 'end_reminder'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}
                            >
                              {log.type === 'start_reminder'
                                ? 'Vardiya Başlatma'
                                : log.type === 'end_reminder'
                                ? 'Vardiya Bitirme'
                                : 'Test SMS'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {log.shift_time !== '-' ? log.shift_time : log.shift_name}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                isSuccess ? 'text-emerald-700' : 'text-red-700'
                              }`}
                            >
                              {isSuccess ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  İletildi
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                                  Hata
                                </>
                              )}
                            </span>
                          </td>
                          <td
                            className="py-2 px-3 text-slate-500 max-w-xs truncate"
                            title={log.error_message || log.message}
                          >
                            {log.error_message ? (
                              <span className="text-red-600">{log.error_message}</span>
                            ) : (
                              log.message
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Smartphone className="w-4 h-4 text-blue-600" />
            <span>
              SMS Şablonu: <code>...vardiyanız başlamıştır/tamamlanmıştır... {config.login_url}</code>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
