import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Inbox,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  MessageSquarePlus,
  CheckCheck,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  messageService,
  MESAJ_KATEGORILERI,
  MesajKategori,
  MessageRecipient,
  YoneticiMesaji,
} from '../services/messageService';

interface YoneticiMesajModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  currentUser: {
    id: string;
    employeeId?: string;
    name: string;
    email: string;
    role: string;
    department?: string;
    position?: string;
  };
  initialTab?: 'inbox' | 'compose' | 'sent';
  onMessagesChanged?: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'Y';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const YoneticiMesajModal: React.FC<YoneticiMesajModalProps> = ({
  isOpen,
  onClose,
  companyId,
  currentUser,
  initialTab,
  onMessagesChanged,
}) => {
  const isManagerOrAdmin =
    currentUser.role === 'admin' ||
    currentUser.role === 'hr' ||
    currentUser.role === 'manager';

  const defaultTab: 'inbox' | 'compose' | 'sent' =
    initialTab || (isManagerOrAdmin ? 'inbox' : 'compose');

  const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'sent'>(defaultTab);
  const [recipients, setRecipients] = useState<MessageRecipient[]>([]);
  const [inboxMessages, setInboxMessages] = useState<YoneticiMesaji[]>([]);
  const [sentMessages, setSentMessages] = useState<YoneticiMesaji[]>([]);
  const [loading, setLoading] = useState(false);

  // Compose form state
  const [selectedRecipientKey, setSelectedRecipientKey] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<MesajKategori>('mazeret');
  const [priority, setPriority] = useState<'normal' | 'yuksek' | 'acil'>('normal');
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Inbox filter
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || (isManagerOrAdmin ? 'inbox' : 'compose'));
      setFeedback(null);
    }
  }, [isOpen, initialTab, isManagerOrAdmin]);

  const loadData = useCallback(async () => {
    if (!companyId || companyId === 'default') return;
    setLoading(true);
    try {
      const [recips, inbox, sent] = await Promise.all([
        messageService.getCompanyRecipients({
          companyId,
          senderId: currentUser.id,
          senderEmail: currentUser.email,
          senderDepartment: currentUser.department,
        }),
        messageService.getInboxMessages({
          companyId,
          userId: currentUser.id,
          employeeId: currentUser.employeeId,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }),
        messageService.getSentMessages({
          companyId,
          userId: currentUser.id,
          employeeId: currentUser.employeeId,
          userEmail: currentUser.email,
          userName: currentUser.name,
        }),
      ]);

      setRecipients(recips);
      setInboxMessages(inbox);
      setSentMessages(sent);

      if (recips.length > 0 && !selectedRecipientKey) {
        const first = recips[0];
        setSelectedRecipientKey(first.email || first.id);
      }
    } catch (err) {
      console.error('[YoneticiMesajModal] Veri yükleme hatası:', err);
    } finally {
      setLoading(false);
    }
  }, [
    companyId,
    currentUser.id,
    currentUser.employeeId,
    currentUser.email,
    currentUser.name,
    currentUser.department,
    selectedRecipientKey,
  ]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Escape tuşu ile kapatma ve arka plan kaydırmasını kilitleme
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const selectedRecipient = recipients.find(
    (r) => (r.email || r.id) === selectedRecipientKey
  );

  const unreadInboxCount = inboxMessages.filter((m) => !m.isRead).length;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedRecipient) {
      setFeedback({
        type: 'error',
        text: 'Lütfen mesajın iletileceği yöneticiyi seçin.',
      });
      return;
    }

    if (!subject.trim() || !messageText.trim()) {
      setFeedback({
        type: 'error',
        text: 'Lütfen konu başlığı ve açıklama mesajınızı eksiksiz girin.',
      });
      return;
    }

    setSending(true);
    try {
      const res = await messageService.sendMessage({
        companyId,
        senderId: currentUser.id,
        senderEmail: currentUser.email,
        senderName: currentUser.name,
        senderDepartment: currentUser.department,
        senderPosition: currentUser.position,
        recipient: selectedRecipient,
        category: selectedCategory,
        subject,
        message: messageText,
        priority,
      });

      if (!res.success) {
        setFeedback({
          type: 'error',
          text: res.error || 'Mesaj gönderilemedi.',
        });
      } else {
        setFeedback({
          type: 'success',
          text: `Mesajınız yalnızca ${selectedRecipient.name} (${selectedRecipient.roleLabel}) hesabına başarıyla iletildi.`,
        });
        setSubject('');
        setMessageText('');
        setPriority('normal');
        await loadData();
        onMessagesChanged?.();
        setTimeout(() => {
          setActiveTab('sent');
        }, 1000);
      }
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    const ok = await messageService.markAsRead(companyId, messageId);
    if (ok) {
      setInboxMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      );
      onMessagesChanged?.();
    }
  };

  const handleMarkAllAsRead = async () => {
    const ok = await messageService.markAllInboxAsRead({
      companyId,
      userId: currentUser.id,
      employeeId: currentUser.employeeId,
      userEmail: currentUser.email,
      userName: currentUser.name,
    });
    if (ok) {
      const nowIso = new Date().toISOString();
      setInboxMessages((prev) =>
        prev.map((m) => ({ ...m, isRead: true, readAt: m.readAt || nowIso }))
      );
      onMessagesChanged?.();
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getCategoryBadgeColor = (cat: MesajKategori) => {
    return (
      MESAJ_KATEGORILERI.find((c) => c.id === cat)?.badgeColor ||
      'bg-slate-100 text-slate-800 border-slate-200'
    );
  };

  const getPriorityBadge = (p: 'normal' | 'yuksek' | 'acil') => {
    if (p === 'acil') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 border border-red-200">
          Acil
        </span>
      );
    }
    if (p === 'yuksek') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
          Yüksek Öncelik
        </span>
      );
    }
    return null;
  };

  const filteredInbox =
    inboxFilter === 'unread' ? inboxMessages.filter((m) => !m.isRead) : inboxMessages;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
              {isManagerOrAdmin && activeTab === 'inbox' ? (
                <Inbox className="w-5 h-5 text-indigo-300" />
              ) : (
                <MessageSquarePlus className="w-5 h-5 text-indigo-300" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight truncate">
                {isManagerOrAdmin
                  ? 'Yönetici Mesaj & Bildirim Merkezi'
                  : 'Yöneticiye Açıklamalı Mesaj İlet'}
              </h2>
              <p className="text-xs text-slate-300 truncate">
                {isManagerOrAdmin
                  ? 'Yalnızca şahsınıza gönderilen mesajları görüntülersiniz.'
                  : 'Mesajınız yalnızca seçtiğiniz şirket yöneticisi veya birim amirine iletilir.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 pt-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto shrink-0">
          {(isManagerOrAdmin || inboxMessages.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('inbox');
                setFeedback(null);
              }}
              className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'inbox'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Bana Gelen Mesajlar</span>
              {unreadInboxCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-600 text-white">
                  {unreadInboxCount} Yeni
                </span>
              ) : (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-700">
                  {inboxMessages.length}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('compose');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'compose'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Yeni Mesaj İlet</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sent');
              setFeedback(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'sent'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Gönderdiğim Mesajlar</span>
            <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-200 text-slate-700">
              {sentMessages.length}
            </span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm flex-1">
            Mesaj bilgileri yükleniyor...
          </div>
        ) : activeTab === 'compose' ? (
          <form onSubmit={handleSend} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {feedback && (
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs sm:text-sm ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-medium">{feedback.text}</span>
                </div>
              )}

              {/* 1. Alıcı Seçimi */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    1. Alıcı Yönetici / Birim Amiri Seçin
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {recipients.length} yetkili bulundu
                  </span>
                </div>

                {recipients.length === 0 ? (
                  <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs">
                    Şirketinize tanımlı bir yönetici veya birim amiri bulunamadı.
                  </div>
                ) : (
                  <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/90 max-h-44 overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {recipients.map((r) => {
                        const rKey = r.email || r.id;
                        const isSelected = selectedRecipientKey === rKey;
                        return (
                          <button
                            key={rKey}
                            type="button"
                            onClick={() => setSelectedRecipientKey(rKey)}
                            className={`text-left p-2.5 rounded-xl border transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                                : 'border-slate-200/80 bg-white/80 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {getInitials(r.name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                                  {r.name}
                                </span>
                                {r.isOwnDepartmentManager && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    Amiriniz
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <span
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    r.role === 'admin'
                                      ? 'bg-purple-100 text-purple-800'
                                      : r.role === 'hr'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {r.roleLabel}
                                </span>
                                {r.department && (
                                  <span className="text-[10px] text-slate-500 font-medium truncate">
                                    • {r.department}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-600 text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Gizlilik Güvencesi: Gönderdiğiniz mesaj <strong>sadece seçtiğiniz yöneticiye</strong> iletilir, diğer yöneticiler göremez.
                  </span>
                </div>
              </div>

              {/* 2. Kategori ve Öncelik */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    2. Bildirim Konu Kategorisi
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as MesajKategori)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    {MESAJ_KATEGORILERI.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    3. Öncelik Düzeyi
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as 'normal' | 'yuksek' | 'acil')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="yuksek">Yüksek Öncelik</option>
                    <option value="acil">Acil Durum</option>
                  </select>
                </div>
              </div>

              {/* 3. Konu Başlığı */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  4. Konu Başlığı
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Örn: Bugünkü mesai başlangıcı hakkında bilgilendirme / Mazeret açıklaması"
                  maxLength={120}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  required
                />
              </div>

              {/* 4. Açıklama Mesajı */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  5. Açıklamanız / Mesajınız
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  placeholder="Yöneticinize iletmek istediğiniz detaylı açıklamayı buraya yazabilirsiniz..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y outline-none"
                  required
                />
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-500 truncate hidden sm:block">
                {selectedRecipient ? (
                  <span>
                    Alıcı: <strong className="text-slate-800">{selectedRecipient.name}</strong> ({selectedRecipient.roleLabel})
                  </span>
                ) : (
                  <span>Lütfen bir alıcı seçin</span>
                )}
              </div>
              <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-colors"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={sending || recipients.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {sending
                      ? 'İletiliyor...'
                      : selectedRecipient
                      ? `${selectedRecipient.name} Hesabına İlet`
                      : 'Mesajı İlet'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        ) : activeTab === 'inbox' ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Inbox Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInboxFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    inboxFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tümü ({inboxMessages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInboxFilter('unread')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    inboxFilter === 'unread'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Okunmamış ({unreadInboxCount})
                </button>
              </div>

              {unreadInboxCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Tümünü Okundu İşaretle
                </button>
              )}
            </div>

            {filteredInbox.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  {inboxFilter === 'unread'
                    ? 'Okunmamış mesajınız bulunmuyor.'
                    : 'Henüz şahsınıza iletilmiş bir personel mesajı bulunmuyor.'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Personeller alıcı olarak sizi seçtiğinde mesajlar burada listelenir.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInbox.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl border transition-all ${
                      !msg.isRead
                        ? 'bg-indigo-50/40 border-indigo-300 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {msg.senderName}
                        </span>
                        {msg.senderDepartment && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            <Building2 className="w-3 h-3 text-slate-500" />
                            {msg.senderDepartment}
                            {msg.senderPosition ? ` • ${msg.senderPosition}` : ''}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeColor(
                            msg.category
                          )}`}
                        >
                          {msg.categoryLabel}
                        </span>
                        {getPriorityBadge(msg.priority)}
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium">
                        {formatDateTime(msg.createdAt)}
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                      {msg.subject}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                      {msg.message}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Alıcı: <strong>{msg.recipientName}</strong> ({msg.recipientRoleLabel})
                      </span>

                      {!msg.isRead ? (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(msg.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Okundu Olarak İşaretle
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <CheckCheck className="w-3.5 h-3.5" />
                          Okundu {msg.readAt ? `• ${formatDateTime(msg.readAt)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Sent Messages Tab */
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {sentMessages.length === 0 ? (
              <div className="py-14 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Henüz gönderdiğiniz bir mesaj bulunmuyor.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  "Yeni Mesaj İlet" sekmesinden şirket yöneticinize veya birim amirinize mesaj gönderebilirsiniz.
                </p>
              </div>
            ) : (
              sentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-900">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Alıcı: {msg.recipientName}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {msg.recipientRoleLabel}
                        {msg.recipientDepartment ? ` • ${msg.recipientDepartment}` : ''}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${getCategoryBadgeColor(
                          msg.category
                        )}`}
                      >
                        {msg.categoryLabel}
                      </span>
                      {getPriorityBadge(msg.priority)}
                    </div>

                    <span className="text-[11px] text-slate-500 font-medium">
                      {formatDateTime(msg.createdAt)}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 text-sm">{msg.subject}</h4>
                  <p className="text-xs sm:text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {msg.message}
                  </p>

                  <div className="flex items-center justify-end pt-1">
                    {msg.isRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        <CheckCheck className="w-3.5 h-3.5" />
                        Yönetici Tarafından Okundu{' '}
                        {msg.readAt ? `(${formatDateTime(msg.readAt)})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        İletildi • Henüz Okunmadı
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
