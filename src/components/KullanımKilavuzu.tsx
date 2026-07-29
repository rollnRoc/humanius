import React, { useState } from 'react';
import { Rocket, BookOpen, HelpCircle, CheckCircle, ChevronRight, Users, CreditCard, Calendar, Bell, Clock, GraduationCap, Settings, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel } from '../auth/roles';
import type { AppRole } from '../auth/roles';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'baslangic' | 'moduller' | 'sss';

interface Step {
  title: string;
  description: string;
  tip?: string;
  roles: AppRole[];
}

interface ModuleGuide {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  steps: string[];
  roles: AppRole[];
}

interface FAQItem {
  question: string;
  answer: string;
  roles: AppRole[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALL_ROLES: AppRole[] = ['superadmin', 'admin', 'hr', 'manager', 'employee', 'user'];
const MGMT_ROLES: AppRole[] = ['superadmin', 'admin', 'hr'];
const MGMT_AND_MANAGER: AppRole[] = ['superadmin', 'admin', 'hr', 'manager'];
const EMP_ROLES: AppRole[] = ['employee', 'user'];

const QUICK_START_STEPS: Step[] = [
  // ── Admin / HR ──
  {
    title: 'Personel ve kullanıcı hesaplarını tek adımda oluşturun',
    description: 'Şirket Yönetimi → Personel Listesi menüsünden "Yeni Personel" butonuna tıklayın. Personel genel bilgileriyle birlikte form içerisindeki "Sistem Erişim Hesabı & Oturum Bilgileri" alanından E-posta, Varsayılan Şifre (987654) ve Sistem Yetki Rolünü (İK, Müdür, Personel) seçerek kaydı tamamlayın.',
    tip: 'Personel ve Kullanıcı hesabı tek formda otomatik açılır; ayrı kullanıcı ekleme sayfasına gerek kalmaz.',
    roles: MGMT_ROLES,
  },
  {
    title: 'Bordro hesaplaması yapın',
    description: 'Bordro ve İcmal menüsüne gidip personel seçin, dönemi belirleyin ve bordroyu otomatik hesaplatın. Sabit maaşlı personellerin bordroları her ay otomatik gelir; mesai veya prim varsa detaydan ekleyebilirsiniz.',
    tip: 'Personel, kendi hesabından bordro onay şifresi ile bordroyu görüntüleyip onaylayabilir.',
    roles: MGMT_ROLES,
  },
  {
    title: 'PDKS & Devam giriş/çıkış saatlerini düzenleyin',
    description: 'Akıllı PDKS ve Devam Kontrolü menüsüne gidin. Çalışanların mesaiye geliş-gidiş saatlerini tablo üzerindeki "✏️ Düzenle" butonuna tıklayarak Giriş Saati ve Çıkış Saati şeklinde güncelleyin. Geç kalma, erken çıkış ve fazla mesai durumları anında hesaplanır.',
    roles: MGMT_ROLES,
  },
  {
    title: 'Eğitim tanımlayın ve personele atayın',
    description: 'Eğitim & Gelişim (LMS) modülüne gidip eğitim kataloğuna yeni eğitimler ekleyin. Eğitim kartlarındaki "🎓 Eğitimi Personele Ata / Kaydet" butonuna tıklayarak ilgili personele eğitimi atayabilirsiniz.',
    roles: MGMT_ROLES,
  },
  {
    title: 'KVKK ve Yasal Metinleri Islak İmzaya Hazırlayın',
    description: 'KVKK & GDPR Uyumluluk menüsündeki Yasal Metinler sekmesinden sözleşme ve aydınlatma metinlerini şirket bilginize göre görüntüleyin. "Yazdır / PDF İndir (Islak İmza)" butonuna basarak imza bloklu çıktısını alıp arşivleyin.',
    roles: MGMT_ROLES,
  },
  // ── Manager ──
  {
    title: 'Departman personelinizi kontrol edin',
    description: 'Arama sayfasından veya Personel Listesinden departmanınızdaki personeli görüntüleyin.',
    roles: ['manager'],
  },
  {
    title: 'Ekibinizin izin taleplerini inceleyin',
    description: 'İzin Yönetimi menüsünden ekibinizdeki bekleyen izin taleplerini görüntüleyin, çakışma durumlarını kontrol edip onay/red işlemlerini yapın.',
    roles: ['manager'],
  },
  {
    title: 'Devam kontrolü ve fazla mesaileri onaylayın',
    description: 'PDKS ekranından ekibinizin giriş/çıkış saatlerini kontrol edin ve oluşan fazla mesai taleplerini "FM ✓ Onayla" ile onaylayın.',
    roles: ['manager'],
  },
  {
    title: 'OKR hedeflerini güncelleyin',
    description: 'OKR Hedefler menüsünden departman ve bireysel hedeflerin ilerleme yüzdesini güncelleyin.',
    roles: ['manager'],
  },
  // ── Employee ──
  {
    title: 'Sisteme başlangıç şifresi ile giriş yapın',
    description: 'İK tarafından oluşturulan e-posta adresiniz ve varsayılan şifreniz (987654) ile oturum açın. Sol menüdeki "Şifre Değiştir" sayfasından kendi şifrenizi belirleyin.',
    roles: EMP_ROLES,
  },
  {
    title: 'Özlük bilgilerinizi ve eğitimlerinizi görün',
    description: 'Personel Kartı ve Özlük menüsünden ad, adres, özlük evrakları ve "Eğitimler & Sertifikalar" sekmesinden tamamladığınız eğitimleri inceleyin.',
    roles: EMP_ROLES,
  },
  {
    title: 'İzin talebi oluşturun',
    description: 'İzin Yönetimi menüsünden yeni izin talebi oluşturabilirsiniz. İzin türünü seçin (yıllık, mazeret, hastalık vb.), tarih aralığını belirleyin ve gönderin.',
    tip: 'Talebinizin onay durumunu aynı ekrandan anlık takip edebilirsiniz.',
    roles: EMP_ROLES,
  },
];

const MODULE_GUIDES: ModuleGuide[] = [
  {
    id: 'personel',
    title: 'Şirket ve Personel Yönetimi',
    icon: Users,
    color: 'blue',
    description: 'Tüm personel bilgilerinin ve kullanıcı hesaplarının tek ekrandan yönetimi.',
    steps: [
      'Personel Listesi menüsüne gidin',
      '"Yeni Personel" butonuna tıklayın',
      'Personel genel bilgileriyle birlikte "Sistem Erişim Hesabı" alanından e-posta, varsayılan şifre ve rolü belirleyin',
      'Personel kartına tıklayarak Belgeler, İzinler ve "Eğitimler & Sertifikalar" sekmelerine ulaşın',
    ],
    roles: MGMT_ROLES,
  },
  {
    id: 'pdks',
    title: 'PDKS & Devam Kontrolü',
    icon: Clock,
    color: 'violet',
    description: 'Giriş/çıkış saatleri takibi, vardiya düzenleme, geç kalma toleransı ve fazla mesai onayı.',
    steps: [
      'PDKS & Devam Kontrolü menüsüne gidin',
      'Tablodaki ilgili çalışan için "✏️ Düzenle" butonuna tıklayın',
      'Giriş Saati ve Çıkış Saati bilgilerini girip kaydedin',
      'Oluşan fazla mesaileri "FM ✓" butonuyla onaylayın',
    ],
    roles: MGMT_AND_MANAGER,
  },
  {
    id: 'egitim',
    title: 'Eğitim & Gelişim (LMS)',
    icon: GraduationCap,
    color: 'indigo',
    description: 'Eğitim kataloğu oluşturma, personele eğitim atama ve özlük dosyasında sertifikalandırma.',
    steps: [
      'Eğitim & Gelişim (LMS) menüsüne gidin',
      '"Yeni Eğitim Ekle" butonu ile eğitim tanımlayın',
      'Eğitim kartı üzerindeki "🎓 Eğitimi Personele Ata / Kaydet" butonuna basarak atama yapın',
      'Personelin aldığı tüm eğitim ve sertifikalar Özlük Dosyasında otomatik listelenir',
    ],
    roles: ALL_ROLES,
  },
  {
    id: 'kvkk',
    title: 'KVKK & GDPR Uyumluluk',
    icon: Settings,
    color: 'emerald',
    description: 'Yasal aydınlatma metinleri, açık rıza beyanları ve ıslak imzalı yazdırma belgeleri.',
    steps: [
      'KVKK & GDPR Uyumluluk menüsüne gidin',
      'Yasal Metinler sekmesinden metinleri görüntüleyin',
      'Şirket adı otomasyonu ile hazırlanan metin için "Yazdır / PDF İndir (Islak İmza)" butonunu kullanın',
    ],
    roles: MGMT_ROLES,
  },
];

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'İlk defa sisteme nasıl giriş yaparım?',
    answer: 'İK yöneticiniz tarafından tanımlanan kurum e-posta adresiniz ve varsayılan başlangıç şifreniz (987654) ile oturum açabilirsiniz. Giriş yaptıktan sonra "Şifre Değiştir" menüsünden kendi şifrenizi güncelleyin.',
    roles: ALL_ROLES,
  },
  {
    question: 'Devam kontrolünde giriş/çıkış saatini yanlış giren personeli nasıl düzeltirim?',
    answer: 'PDKS & Devam Kontrolü sayfasında ilgili personelin satırındaki "✏️ Düzenle" butonuna tıklayarak hem Giriş Saati hem de Çıkış Saati bilgilerini güncelleyebilirsiniz.',
    roles: MGMT_AND_MANAGER,
  },
  {
    question: 'Eğitimi personele nasıl atayabilirim?',
    answer: 'Eğitim & Gelişim (LMS) ekranındaki eğitim kartının altında bulunan "🎓 Eğitimi Personele Ata / Kaydet" butonuna tıklayarak eğitimi personele atayabilirsiniz.',
    roles: MGMT_ROLES,
  },
  {
    question: 'Mesai başlatma butonu neden çalışmıyor?',
    answer: 'Tarayıcınızın konum iznini onayladığınızdan emin olun. Konum servisleriniz kapalıysa veya şirket konumuyla uyuşmuyorsa mesai başlatılamaz. Konum izinlerini sıfırlayıp tekrar vermeyi deneyin.',
    roles: ALL_ROLES,
  },
  {
    question: 'Duyuru veya etkinlik nasıl yayınlanır?',
    answer: 'Uyarılar Takvimi sayfasındaki "+" veya "Yeni Etkinlik Ekle" butonuyla tüm şirket için duyurular yayınlayabilirsiniz. Etkinlik tipi "Duyuru" veya "SGK Bildirimi" gibi seçeneklerle özelleştirilebilir.',
    roles: MGMT_ROLES,
  },
  {
    question: 'Başka bir personelin bilgilerini görebilir miyim?',
    answer: 'Hayır. Personel rolündeki kullanıcılar sadece kendi verilerini (bordro, izin, eğitim) görebilir. Diğer çalışanların bilgilerine erişim veritabanı seviyesinde engellenmiştir.',
    roles: EMP_ROLES,
  },
];

// ─── Color helpers ────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; light: string; dot: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    light: 'bg-blue-100',    dot: 'bg-blue-500' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',   text: 'text-green-700',   light: 'bg-green-100',   dot: 'bg-green-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', light: 'bg-emerald-100', dot: 'bg-emerald-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   light: 'bg-amber-100',   dot: 'bg-amber-500' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  light: 'bg-violet-100',  dot: 'bg-violet-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    light: 'bg-rose-100',    dot: 'bg-rose-500' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200',  text: 'text-indigo-700',  light: 'bg-indigo-100',  dot: 'bg-indigo-500' },
  slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-700',   light: 'bg-slate-100',   dot: 'bg-slate-500' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    text: 'text-cyan-700',    light: 'bg-cyan-100',    dot: 'bg-cyan-500' },
};

// ─── Component ────────────────────────────────────────────────────────────────

const KullanımKilavuzu: React.FC = () => {
  const { profile, appRole } = useAuth();
  const effectiveRole: AppRole = appRole || 'employee';

  const [activeTab, setActiveTab] = useState<TabId>('baslangic');
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('humanius_guide_completed');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      try { localStorage.setItem('humanius_guide_completed', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const mySteps = QUICK_START_STEPS.filter(s => s.roles.includes(effectiveRole));
  const myModules = MODULE_GUIDES.filter(m => m.roles.includes(effectiveRole));
  const myFaqs = FAQ_ITEMS.filter(f => f.roles.includes(effectiveRole));
  const completedCount = mySteps.filter((_, i) => completedSteps.has(i)).length;
  const progressPct = mySteps.length ? Math.round((completedCount / mySteps.length) * 100) : 0;

  const tabs: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'baslangic', label: 'Hızlı Başlangıç', icon: Rocket },
    { id: 'moduller', label: 'Modül Rehberi', icon: BookOpen },
    { id: 'sss', label: 'Sık Sorulan Sorular', icon: HelpCircle },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">Kullanım Kılavuzu</h1>
          <p className="text-blue-100 text-sm">
            Hoş geldiniz, <span className="font-semibold text-white">{profile?.full_name || 'Kullanıcı'}</span> —
            <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{getRoleLabel(effectiveRole)}</span>
          </p>
          <p className="text-blue-200 text-xs mt-2">
            Bu kılavuz, rolünüze özel hazırlanmıştır. Aşağıdaki adımları takip ederek sistemi verimli bir şekilde kullanabilirsiniz.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex gap-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Hızlı Başlangıç ── */}
      {activeTab === 'baslangic' && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">İlerleme Durumunuz</h3>
                <p className="text-xs text-gray-500 mt-0.5">{completedCount} / {mySteps.length} adım tamamlandı</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">{progressPct}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          {mySteps.map((step, idx) => {
            const done = completedSteps.has(idx);
            return (
              <div
                key={idx}
                className={`bg-white border rounded-xl p-5 transition-all cursor-pointer hover:shadow-sm ${
                  done ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                }`}
                onClick={() => toggleStep(idx)}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                    done ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {done ? <CheckCircle className="w-5 h-5 animate-pulse" /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm ${done ? 'text-green-800 line-through' : 'text-gray-800'}`}>
                      {step.title}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{step.description}</p>
                    {step.tip && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <span className="font-semibold shrink-0">💡 İpucu:</span>
                        <span>{step.tip}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-300 shrink-0 mt-1 transition-transform ${done ? 'rotate-90' : ''}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Modül Rehberi ── */}
      {activeTab === 'moduller' && (
        <div className="space-y-3">
          {myModules.map(mod => {
            const Icon = mod.icon;
            const c = COLOR_MAP[mod.color] || COLOR_MAP.blue;
            const isExpanded = expandedModule === mod.id;
            return (
              <div
                key={mod.id}
                className={`bg-white border rounded-xl overflow-hidden transition-all ${isExpanded ? `${c.border} shadow-sm` : 'border-gray-200'}`}
              >
                <button
                  onClick={() => setExpandedModule(isExpanded ? null : mod.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl ${c.light} ${c.text} flex items-center justify-center shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm">{mod.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{mod.description}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isExpanded && (
                  <div className={`px-5 pb-5 border-t ${c.border}`}>
                    <p className="text-sm text-gray-600 mt-4 mb-4">{mod.description}</p>
                    <div className="space-y-2.5">
                      {mod.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full ${c.light} ${c.text} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                            {i + 1}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: SSS ── */}
      {activeTab === 'sss' && (
        <div className="space-y-3">
          {myFaqs.map((faq, idx) => {
            const isOpen = expandedFaq === idx;
            return (
              <div key={idx} className={`bg-white border rounded-xl overflow-hidden transition-all ${isOpen ? 'border-blue-200 shadow-sm' : 'border-gray-200'}`}>
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : idx)}
                  className="w-full flex items-center gap-3 p-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <span className="flex-1 font-medium text-sm text-gray-800">{faq.question}</span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <p className="text-sm text-gray-600 mt-4 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-6">
        <p className="text-xs text-gray-400">Humanius HRMS — Kullanım Kılavuzu v3.0</p>
      </div>
    </div>
  );
};

export default KullanımKilavuzu;
