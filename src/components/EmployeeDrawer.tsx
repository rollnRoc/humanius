import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Briefcase, Mail, ClipboardCheck, CheckCircle2, Circle, AlertCircle, MapPin, UserCheck, Users, Shield, Crown, KeyRound } from 'lucide-react';
import { Employee, Company, Department } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteUsers } from '../auth/roles';
import { supabase } from '../lib/supabase';
import { userService } from '../services/userService';
import iller, { type IlIlceItem } from '../lib/illce';
import { getEmployeeLocationMeta, parseAddressCity, parseIsYeriSgkFromAddress, getEmployeeIsYeriSgkSicil } from '../utils/employeeLocationMeta';
import { normalizeDateForInput } from '../utils/dateUtils';

interface EmployeeDrawerProps {
  isOpen: boolean;
  employee: Employee | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  onDelete: (id: string) => void;
  companies: Company[];
  departments: Department[];
}

const EmployeeDrawer: React.FC<EmployeeDrawerProps> = ({
  isOpen,
  employee,
  isNew,
  onClose,
  onSave,
  onDelete,
  companies,
  departments
}) => {
  useScrollLock(isOpen);
  const { appRole } = useAuth();
  const showCompanySelector = true;

  const [formData, setFormData] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('genel');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [emailStatus, setEmailStatus] = useState<'checking' | 'available' | 'taken' | 'idle'>('idle');

  // Sistem yetki rol seçenekleri ve açıklamaları
  const roleOptions = useMemo(() => [
    {
      value: 'employee',
      label: 'Personel',
      description: 'Kendi izin, avans ve özlük bilgilerini görüntüler, sistemde talep oluşturabilir.',
      icon: User,
    },
    {
      value: 'manager',
      label: 'Birim / Departman Amiri',
      description: 'Ekibinin izin onaylarını, mesai takipleri ve performans süreçlerini yönetir.',
      icon: UserCheck,
    },
    {
      value: 'hr',
      label: 'İK Uzmanı',
      description: 'Personel özlük dosyaları, bordro işlemleri, izin onayları ve İK süreçlerini yürütür.',
      icon: Users,
    },
    {
      value: 'admin',
      label: 'Şirket Yöneticisi',
      description: 'Şirket genelinde tüm modüllere, ayarlara, raporlara ve kullanıcı yönetimine tam yetki.',
      icon: Shield,
    },
    ...(appRole === 'superadmin' ? [{
      value: 'superadmin',
      label: 'Süper Yönetici',
      description: 'Tüm şirketler ve genel teknik altyapı üzerinde en üst düzey tam yetki.',
      icon: Crown,
    }] : []),
  ], [appRole]);

  // 81 ilin alfabetik sıralı listesi
  const sortedIller = useMemo(() => {
    return [...iller].sort((a, b) => a.il.localeCompare(b.il, 'tr'));
  }, []);

  // Seçilen ile ait ilçe listesi
  const selectedIlData = useMemo(() => {
    if (!formData?.il) return null;
    return iller.find((item) => item.il.toLowerCase() === formData.il.toLowerCase()) || null;
  }, [formData?.il]);

  const availableIlceler = useMemo(() => {
    if (!selectedIlData) return [];
    return [...selectedIlData.ilceleri].sort((a, b) => a.localeCompare(b, 'tr'));
  }, [selectedIlData]);

  const handleIlChange = (newIl: string) => {
    setFormData((prev) => (prev ? { ...prev, il: newIl, ilce: '' } : null));
  };

  const handleIlceChange = (newIlce: string) => {
    setFormData((prev) => (prev ? { ...prev, ilce: newIlce } : null));
  };

  const ONAY_GRUPLARI = [
    {
      baslik: 'Evrak Kontrol',
      maddeler: [
        { id: 'ev1', label: 'Nüfus Cüzdanı Fotokopisi' },
        { id: 'ev2', label: 'İkametgah Belgesi' },
        { id: 'ev3', label: 'Sağlık Raporu' },
        { id: 'ev4', label: 'Diploma / Transkript' },
        { id: 'ev5', label: 'Özgeçmiş (CV)' },
        { id: 'ev6', label: 'Adli Sicil Kaydı' },
      ],
    },
    {
      baslik: 'Sözleşmeler',
      maddeler: [
        { id: 'sz1', label: 'İş Sözleşmesi İmzalandı' },
        { id: 'sz4', label: 'KVKK Aydınlatma Formu İmzalandı' },
      ],
    },
    {
      baslik: 'Sistem & Ekipman',
      maddeler: [
        { id: 'se1', label: 'E-posta Hesabı Açıldı' },
        { id: 'se2', label: 'Ekipmanları Teslim Edildi' },
        { id: 'se3', label: 'Sistem Erişimleri Tanımlandı' },
      ],
    },
    {
      baslik: 'Oryantasyon',
      maddeler: [
        { id: 'or1', label: 'Oryantasyon Eğitimi Tamamlandı' },
        { id: 'or2', label: 'Departman Tanıtımı Yapıldı' },
        { id: 'or3', label: 'İş Güvenliği Eğitimi Verildi' },
      ],
    },
    {
      baslik: 'Onay',
      maddeler: [
        { id: 'on1', label: 'İK Onayı Verildi' },
        { id: 'on2', label: 'Yönetici Onayı Verildi' },
      ],
    },
  ];

  const tumMaddeler = ONAY_GRUPLARI.flatMap((g) => g.maddeler);
  const tamamlananSayi = tumMaddeler.filter((m) => checked.has(m.id)).length;
  const toplamSayi = tumMaddeler.length;
  const yuzde = Math.round((tamamlananSayi / toplamSayi) * 100);

  const toAsciiEmail = (str: string) => {
    return str.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '');
  };

  const effectiveEmail = (formData?.email || (formData?.name ? `${toAsciiEmail(formData.name)}@humanius.net` : '')).trim().toLowerCase();

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen || !effectiveEmail || effectiveEmail.length < 5) {
      setEmailStatus('idle');
      return;
    }

    // If editing existing employee and email matches their current email (or .net version), it is their own valid email!
    if (!isNew && employee?.email) {
      const originalEmail = String(employee.email).trim().toLowerCase();
      const originalEmailNet = originalEmail.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net');
      if (effectiveEmail === originalEmail || effectiveEmail === originalEmailNet) {
        setEmailStatus('available');
        return;
      }
    }

    let active = true;
    setEmailStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const altEmailCom = effectiveEmail.replace('humanius.net', 'humanius.com');
        const altEmailComTr = effectiveEmail.replace('humanius.net', 'humanius.com.tr');

        const { data: empMatches } = await supabase
          .from('employees')
          .select('id, name, email')
          .or(`email.eq.${effectiveEmail},email.eq.${altEmailCom},email.eq.${altEmailComTr}`);

        const { data: profMatches } = await supabase
          .from('profiles')
          .select('id, email')
          .or(`email.eq.${effectiveEmail},email.eq.${altEmailCom},email.eq.${altEmailComTr}`);

        const excludeId = formData?.id || employee?.id || '';
        const otherEmpMatches = (empMatches || []).filter(e => e.id !== excludeId);
        const otherProfMatches = (profMatches || []).filter(p => p.id !== excludeId);

        if (active) {
          if (otherEmpMatches.length > 0 || otherProfMatches.length > 0) {
            setEmailStatus('taken');
          } else {
            setEmailStatus('available');
          }
        }
      } catch {
        if (active) setEmailStatus('idle');
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [effectiveEmail, formData?.id, employee?.id, employee?.email, isNew, isOpen]);

  useEffect(() => {
    if (isOpen) {
      if (employee) {
        const rawJd = employee.joinDate || employee.join_date || (employee as any).ise_giris_tarihi || '';
        const formattedJd = normalizeDateForInput(rawJd);
        const rawBd = (employee as any).birth_date || (employee as any).birthDate || (employee as any).dogum_tarihi || '';
        const formattedBd = normalizeDateForInput(rawBd);
        const cEmail = employee.contact_email ?? (employee as any).personal_email ?? '';

        const locMeta = getEmployeeLocationMeta(employee.id, employee.email);
        const parsedAddr = parseAddressCity(employee.address);
        const resolvedIl = (employee.il && String(employee.il).trim()) || locMeta.il || parsedAddr.il || '';
        const resolvedIlce = (employee.ilce && String(employee.ilce).trim()) || locMeta.ilce || parsedAddr.ilce || '';
        const cleanAddr = parsedAddr.cleanAddress || employee.address || '';
        const resolvedIsYeriSgk =
          (employee.is_yeri_sgk_sicil_no && String(employee.is_yeri_sgk_sicil_no).trim()) ||
          ((employee as any).isYeriSgkSicilNo && String((employee as any).isYeriSgkSicilNo).trim()) ||
          parseIsYeriSgkFromAddress(employee.address) ||
          getEmployeeIsYeriSgkSicil(employee.id, employee.email) ||
          '';

        setFormData({
          ...employee,
          address: cleanAddr,
          contact_email: cEmail,
          personal_email: cEmail,
          joinDate: formattedJd,
          join_date: formattedJd,
          birthDate: formattedBd,
          birth_date: formattedBd,
          il: resolvedIl,
          ilce: resolvedIlce,
          role: employee.role || 'employee',
          level: employee.level || 'Junior',
          medeni_durum: (employee as any).medeni_durum || 'bekar',
          cocuk_sayisi: (employee as any).cocuk_sayisi !== undefined ? Number((employee as any).cocuk_sayisi) : 0,
          engelli_durumu: (employee as any).engelli_durumu || 'yok',
          is_yeri_sgk_sicil_no: resolvedIsYeriSgk,
          isYeriSgkSicilNo: resolvedIsYeriSgk,
        });

        // Also fetch exact profile role to guarantee 100% sync with real user role
        if (employee.id || employee.email || employee.name) {
          (async () => {
            try {
              let profRole = null;
              const em = (employee.email || '').trim().toLowerCase();
              const allUsers = await userService.getAll();
              const matched = allUsers.find(u => 
                (em && u.email?.trim().toLowerCase() === em) || 
                (employee.id && u.id === employee.id) ||
                (employee.name && u.full_name?.trim().toLowerCase() === employee.name.trim().toLowerCase())
              );
              if (matched?.role) {
                profRole = matched.role;
              }
              if (profRole) {
                setFormData(prev => prev ? { ...prev, role: profRole } : null);
              }
            } catch {}
          })();
        }
      } else {
        const today = new Date().toISOString().split('T')[0];
        const initialComp = (companies && companies.length > 0) ? companies[0] : '';
        setFormData({
          name: '',
          company: initialComp,
          department: '',
          position: '',
          level: 'Junior',
          salary: 0,
          status: 'active',
          phone: '',
          email: '',
          contact_email: '',
          personal_email: '',
          address: '',
          il: '',
          ilce: '',
          skills: [],
          employeeType: 'normal',
          employee_type: 'normal',
          medeni_durum: 'bekar',
          cocuk_sayisi: 0,
          engelli_durumu: 'yok',
          tc_no: '',
          sicil_no: '',
          is_yeri_sgk_sicil_no: '',
          isYeriSgkSicilNo: '',
          joinDate: today,
          join_date: today,
          birthDate: '',
          birth_date: '',
          approval_passcode: '987654',
          role: 'employee',
        } as any);
      }
    }
  }, [employee, isOpen, companies]);

  if (!isOpen || !formData) return null;

  const handleSave = () => {
    if (emailStatus === 'taken') {
      alert('Bu e-posta adresi sistemde zaten kayıtlı. Lütfen başka bir e-posta tanımlayın.');
      return;
    }
    const rawEmail = (formData.email || '').trim().toLowerCase();
    const cleanEmail = rawEmail
      .replace(/\.+@/, '@')
      .replace(/^\.+/, '')
      .replace(/\.{2,}/g, '.');

    const finalJd = normalizeDateForInput(formData.joinDate || formData.join_date) || new Date().toISOString().split('T')[0];
    const finalBd = normalizeDateForInput((formData as any).birth_date || (formData as any).birthDate) || null;
    const isYeriSgk = (formData.is_yeri_sgk_sicil_no || (formData as any).isYeriSgkSicilNo || '').trim();

    onSave({
      ...formData,
      email: cleanEmail,
      joinDate: finalJd,
      join_date: finalJd,
      birthDate: finalBd || undefined,
      birth_date: finalBd || undefined,
      level: formData.level || 'Junior',
      is_yeri_sgk_sicil_no: isYeriSgk,
      isYeriSgkSicilNo: isYeriSgk,
      medeni_durum: (formData as any).medeni_durum || 'bekar',
      cocuk_sayisi: Number((formData as any).cocuk_sayisi) || 0,
      engelli_durumu: (formData as any).engelli_durumu || 'yok',
      approval_passcode: formData.approval_passcode || '987654',
    });
  };

  const handleInputChange = (field: keyof Employee, value: any) => {
    if (field === 'name') {
      const prevName = formData?.name || '';
      const prevDerivedEmail = prevName ? `${toAsciiEmail(prevName)}@humanius.net` : '';
      const currentEmail = formData?.email || '';
      const shouldSyncEmail = !currentEmail || currentEmail === prevDerivedEmail || isNew;
      const newDerivedEmail = value ? `${toAsciiEmail(value)}@humanius.net` : '';

      setFormData(prev => prev ? {
        ...prev,
        name: value,
        email: shouldSyncEmail ? newDerivedEmail : prev.email
      } : null);
    } else if (field === 'joinDate' || field === 'join_date') {
      const cleanValue = normalizeDateForInput(value);
      setFormData(prev => prev ? { ...prev, joinDate: cleanValue, join_date: cleanValue } : null);
    } else if (field === 'birth_date' || field === 'birthDate') {
      const cleanValue = normalizeDateForInput(value);
      setFormData(prev => prev ? { ...prev, birth_date: cleanValue, birthDate: cleanValue } : null);
    } else if (field === 'contact_email' || field === 'personal_email') {
      setFormData(prev => prev ? { ...prev, contact_email: value, personal_email: value } : null);
    } else if (field === 'is_yeri_sgk_sicil_no' || (field as any) === 'isYeriSgkSicilNo') {
      const cleanVal = value !== undefined && value !== null ? String(value) : '';
      setFormData(prev => prev ? { ...prev, is_yeri_sgk_sicil_no: cleanVal, isYeriSgkSicilNo: cleanVal } : null);
    } else {
      setFormData(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const tabs = [
    { id: 'genel', label: 'Genel Bilgiler', icon: User },
    { id: 'is', label: 'İş Bilgileri', icon: Briefcase },
    { id: 'iletisim', label: 'İletişim', icon: Mail },
    { id: 'onay', label: 'Dijital Onay Süreci', icon: ClipboardCheck },
  ];

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={`fixed inset-y-0 right-0 max-w-4xl w-full bg-white border-l border-gray-200 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      } flex flex-col`}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {isNew ? 'Yeni Personel Ekle' : 'Personel Düzenle'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Tabs */}
          <div className="w-72 border-r border-gray-200 p-4 overflow-y-auto">
            <div className="space-y-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-50 border border-gray-200 bg-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <button
                onClick={handleSave}
                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                {isNew ? 'Personel Ekle' : 'Değişiklikleri Kaydet'}
              </button>
              {!isNew && canDeleteUsers(appRole) && (
                <button
                  onClick={() => onDelete(formData.id)}
                  className="w-full bg-red-600 text-white py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors"
                >
                  Personeli Sil
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'genel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="employee-name" className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad *</label>
                    <input
                      id="employee-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="Örn: Sunay Berberoğlu"
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-tcno" className="block text-sm font-medium text-gray-700 mb-2">TC Kimlik No</label>
                    <input
                      id="employee-tcno"
                      type="text"
                      maxLength={11}
                      value={formData.tc_no || ''}
                      onChange={(e) => handleInputChange('tc_no', e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="11 haneli TC No"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-joindate" className="block text-sm font-medium text-gray-700 mb-2">İşe Giriş Tarihi</label>
                    <input
                      id="employee-joindate"
                      type="date"
                      value={formData.joinDate || formData.join_date || ''}
                      onChange={(e) => handleInputChange('joinDate', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-birthdate" className="block text-sm font-medium text-gray-700 mb-2">Doğum Tarihi</label>
                    <input
                      id="employee-birthdate"
                      type="date"
                      value={(formData as any).birth_date || (formData as any).birthDate || ''}
                      onChange={(e) => handleInputChange('birth_date' as any, e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-medeni" className="block text-sm font-medium text-gray-700 mb-2">Medeni Durum</label>
                    <select
                      id="employee-medeni"
                      value={(formData as any).medeni_durum || 'bekar'}
                      onChange={(e) => handleInputChange('medeni_durum' as any, e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="bekar">Bekar</option>
                      <option value="evli">Evli</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="employee-cocuk" className="block text-sm font-medium text-gray-700 mb-2">Çocuk Sayısı</label>
                    <input
                      id="employee-cocuk"
                      type="number"
                      min={0}
                      value={(formData as any).cocuk_sayisi ?? 0}
                      onChange={(e) => handleInputChange('cocuk_sayisi' as any, parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="employee-engelli" className="block text-sm font-medium text-gray-700 mb-2">Engelli Durumu</label>
                    <select
                      id="employee-engelli"
                      value={(formData as any).engelli_durumu || 'yok'}
                      onChange={(e) => handleInputChange('engelli_durumu' as any, e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="yok">Engeli Yok</option>
                      <option value="birinci">1. Derece (%80+)</option>
                      <option value="ikinci">2. Derece (%60-%79)</option>
                      <option value="ucuncu">3. Derece (%40-%59)</option>
                    </select>
                  </div>

                  {/* Gizli alanlar: SGK Sicil No, İş Yeri SGK Sicil No, İkamet İli ve İlçesi (Sistem bütünlüğü için DOM'da tutulur) */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="employee-sicilno">SGK Sicil No</label>
                    <input
                      id="employee-sicilno"
                      type="text"
                      value={formData.sicil_no || ''}
                      onChange={(e) => handleInputChange('sicil_no', e.target.value)}
                      placeholder="SGK Sicil Numarası"
                    />
                    <label htmlFor="employee-is-yeri-sgk-sicil-no">İş Yeri SGK Sicil No</label>
                    <input
                      id="employee-is-yeri-sgk-sicil-no"
                      type="text"
                      value={formData.is_yeri_sgk_sicil_no || (formData as any).isYeriSgkSicilNo || ''}
                      onChange={(e) => handleInputChange('is_yeri_sgk_sicil_no' as any, e.target.value)}
                      placeholder="İş Yeri SGK Sicil Numarası"
                    />
                    <label htmlFor="employee-il">İkamet İli</label>
                    <select
                      id="employee-il"
                      value={formData.il || ''}
                      onChange={(e) => handleIlChange(e.target.value)}
                    >
                      <option value="">-- İl Seçin --</option>
                      {sortedIller.map((item) => (
                        <option key={item.plaka} value={item.il}>
                          {item.il} ({item.plaka < 10 ? `0${item.plaka}` : item.plaka})
                        </option>
                      ))}
                    </select>
                    <label htmlFor="employee-ilce">İkamet İlçesi</label>
                    <select
                      id="employee-ilce"
                      value={formData.ilce || ''}
                      disabled={!formData.il}
                      onChange={(e) => handleIlceChange(e.target.value)}
                    >
                      <option value="">{formData.il ? '-- İlçe Seçin --' : '-- Önce İl Seçiniz --'}</option>
                      {availableIlceler.map((ilce) => (
                        <option key={ilce} value={ilce}>
                          {ilce}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'is' && (
              <div className="space-y-6">
                {/* Sistem Erişim Hesabı & Oturum Bilgileri Card */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-800 text-base">Sistem Erişim Hesabı & Oturum Bilgileri</h3>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                      Otomatik Oluşturulur
                    </span>
                  </div>
                  <div className="mb-4 p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-start gap-2.5 shadow-xs">
                    <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-blue-950 leading-relaxed">
                      <span className="font-bold text-blue-900 block mb-0.5">
                        ⚡ Sistem Tarafından Otomatik Tanımlanır
                      </span>
                      Personel sisteme giriş yapmak istediğinde, sistem tarafından otomatik olarak atanan bu kurumsal e-posta ve başlangıç şifresi (<strong className="font-mono font-bold text-blue-900 bg-white px-1.5 py-0.5 rounded border border-blue-200">987654</strong>) ile oturum açabilir.
                    </div>
                  </div>

                  {/* Giriş E-postası ve Başlangıç Şifresi Yan Yana */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Giriş E-postası</label>
                      <input
                        type="email"
                        value={formData.email || (formData.name ? `${toAsciiEmail(formData.name)}@humanius.net` : '')}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="adsoyad@humanius.net"
                        className={`w-full bg-white border ${
                          emailStatus === 'taken' ? 'border-rose-400 focus:border-rose-500 bg-rose-50/20' :
                          emailStatus === 'available' ? 'border-emerald-400 focus:border-emerald-500 bg-emerald-50/20' :
                          'border-gray-200 focus:border-blue-500'
                        } text-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none transition-all`}
                      />
                      {emailStatus === 'checking' && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                          <span>Sistem kontrol ediliyor...</span>
                        </div>
                      )}
                      {emailStatus === 'taken' && (
                        <div className="mt-1.5 flex items-start gap-1.5 text-[11px] text-rose-700 font-semibold bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          <span>Bu e-posta sistemde zaten kayıtlı, lütfen başka bir e-posta tanımlayın.</span>
                        </div>
                      )}
                      {emailStatus === 'available' && effectiveEmail.length >= 5 && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Bu e-posta kayıt için uygundur.</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
                        <span>Başlangıç Şifresi</span>
                        <span className="text-[10px] text-gray-400 font-medium">(Sabit)</span>
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="987654"
                        className="w-full bg-gray-100 border border-gray-200 text-gray-400 font-mono rounded-xl px-3 py-2.5 text-sm cursor-not-allowed select-none outline-none"
                      />
                    </div>
                  </div>

                  {/* Sistem Yetki Rolü - Altta Geniş ve Yanında Ufak Açıklamalar ile */}
                  <div className="mt-4 pt-4 border-t border-blue-100/70">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-gray-700">
                        Sistem Yetki Rolü
                      </label>
                      <span className="text-[11px] text-gray-400">
                        Personelin sistemdeki rolünü ve yetki kapsamını belirler
                      </span>
                    </div>

                    <div className="space-y-2">
                      {roleOptions.map((r) => {
                        const isSelected = (formData.role || 'employee') === r.value;
                        const IconComponent = r.icon;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => handleInputChange('role', r.value)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'border-blue-500 bg-white shadow-sm ring-2 ring-blue-500/20'
                                : 'border-gray-200 bg-white/70 hover:border-gray-300 hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                                isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                              }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className={`text-xs font-bold mr-2 ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                                  {r.label}
                                </span>
                                <span className="text-[11px] text-gray-500 hidden sm:inline">
                                  — {r.description}
                                </span>
                                <p className="text-[11px] text-gray-500 sm:hidden mt-0.5">
                                  {r.description}
                                </p>
                              </div>
                            </div>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Form ve geriye dönük uyumluluk için gizli select */}
                    <select
                      id="employee-role"
                      value={formData.role || 'employee'}
                      onChange={(e) => handleInputChange('role', e.target.value)}
                      className="hidden"
                      aria-hidden="true"
                    >
                      <option value="employee">Personel</option>
                      <option value="manager">Birim / Departman Amiri</option>
                      <option value="hr">İK Uzmanı</option>
                      <option value="admin">Şirket Yöneticisi</option>
                      {appRole === 'superadmin' && <option value="superadmin">Süper Yönetici</option>}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Şirket Seçimi (Gizli - Sistem Bütünlüğü Korunur) */}
                  {showCompanySelector && (
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="employee-company" className="block text-sm font-medium text-gray-700 mb-2">Şirket</label>
                      <select
                        id="employee-company"
                        value={formData.company || ''}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="">-- Şirket Seçin --</option>
                        {companies.map(company => (
                          <option key={company} value={company}>
                            {company}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="employee-department" className="block text-sm font-medium text-gray-700 mb-2">Departman</label>
                    <input
                      id="employee-department"
                      type="text"
                      list="departments-list"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="Departman girin veya seçin"
                    />
                    <datalist id="departments-list">
                      {departments.map(dept => (
                        <option key={dept} value={dept} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="employee-position" className="block text-sm font-medium text-gray-700 mb-2">Pozisyon</label>
                    <input
                      id="employee-position"
                      type="text"
                      value={formData.position}
                      onChange={(e) => handleInputChange('position', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-level" className="block text-sm font-medium text-gray-700 mb-2">Kıdem Seviyesi</label>
                    <select
                      id="employee-level"
                      value={formData.level || 'Junior'}
                      onChange={(e) => handleInputChange('level', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="Junior">Junior</option>
                      <option value="Mid">Mid</option>
                      <option value="Senior">Senior</option>
                      <option value="Lead">Lead</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="employee-type" className="block text-sm font-medium text-gray-700 mb-2">Çalışan Tipi</label>
                    <select
                      id="employee-type"
                      value={formData.employeeType}
                      onChange={(e) => handleInputChange('employeeType', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="normal">Normal Çalışan</option>
                      <option value="emekli">Emekli</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="job-employee-sicilno" className="block text-sm font-medium text-gray-700 mb-2">SGK Sicil No</label>
                    <input
                      id="job-employee-sicilno"
                      type="text"
                      value={formData.sicil_no || ''}
                      onChange={(e) => handleInputChange('sicil_no', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="SGK Sicil Numarası"
                    />
                  </div>
                  <div>
                    <label htmlFor="job-is-yeri-sgk-sicil-no" className="block text-sm font-medium text-gray-700 mb-2">İş Yeri SGK Sicil No</label>
                    <input
                      id="job-is-yeri-sgk-sicil-no"
                      type="text"
                      value={formData.is_yeri_sgk_sicil_no || (formData as any).isYeriSgkSicilNo || ''}
                      onChange={(e) => handleInputChange('is_yeri_sgk_sicil_no' as any, e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="İş Yeri SGK Sicil Numarası"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-status" className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
                    <select
                      id="employee-status"
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="active">Aktif</option>
                      <option value="onLeave">İzinde</option>
                      <option value="inactive">Pasif</option>
                    </select>
                  </div>

                  {/* Temel Maaş / Brüt Ücret (Gizli - Sistem Bütünlüğü Korunur) */}
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="employee-salary" className="block text-sm font-medium text-gray-700 mb-2">Temel Maaş / Brüt Ücret (₺)</label>
                    <input
                      id="employee-salary"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.salary || ''}
                      onChange={(e) => handleInputChange('salary', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'iletisim' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label htmlFor="employee-phone" className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      id="employee-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="05XX XXX XX XX"
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="employee-contact-email" className="block text-sm font-medium text-gray-700 mb-2">Kişisel / İletişim E-postası</label>
                    <input
                      id="employee-contact-email"
                      type="email"
                      value={formData.contact_email || (formData as any).personal_email || ''}
                      onChange={(e) => handleInputChange('contact_email' as any, e.target.value)}
                      placeholder="kisisel.eposta@gmail.com"
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-employee-il" className="block text-sm font-medium text-gray-700 mb-2">İl (Şehir)</label>
                    <select
                      id="contact-employee-il"
                      value={formData.il || ''}
                      onChange={(e) => handleIlChange(e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium"
                    >
                      <option value="">-- İl Seçin --</option>
                      {sortedIller.map((item) => (
                        <option key={`contact-${item.plaka}`} value={item.il}>
                          {item.il} ({item.plaka < 10 ? `0${item.plaka}` : item.plaka})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-employee-ilce" className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <select
                      id="contact-employee-ilce"
                      value={formData.ilce || ''}
                      disabled={!formData.il}
                      onChange={(e) => handleIlceChange(e.target.value)}
                      className={`w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-medium ${
                        !formData.il ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">{formData.il ? '-- İlçe Seçin --' : '-- Önce İl Seçiniz --'}</option>
                      {availableIlceler.map((ilce) => (
                        <option key={`contact-${ilce}`} value={ilce}>
                          {ilce}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="employee-address" className="block text-sm font-medium text-gray-700 mb-2">Açık Adres Detayı</label>
                    <textarea
                      id="employee-address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      placeholder="Mahalle, cadde, sokak, bina ve daire no..."
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'onay' && (
              <div className="space-y-5">
                {/* İlerleme çubuğu */}
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Tamamlanma Durumu</span>
                    <span className={`text-sm font-bold ${yuzde === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                      {tamamlananSayi} / {toplamSayi} — %{yuzde}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-300 ${yuzde === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${yuzde}%` }}
                    />
                  </div>
                  {yuzde === 100 && (
                    <p className="text-xs text-green-600 font-medium mt-2">✓ Tüm adımlar tamamlandı</p>
                  )}
                </div>

                {/* Gruplar */}
                {ONAY_GRUPLARI.map((grup) => {
                  const grupTamamlanan = grup.maddeler.filter((m) => checked.has(m.id)).length;
                  return (
                    <div key={grup.baslik} className="border border-gray-200 rounded-2xl overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-700">{grup.baslik}</span>
                        <span className="text-xs text-gray-400">{grupTamamlanan}/{grup.maddeler.length}</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {grup.maddeler.map((madde) => {
                          const isChecked = checked.has(madde.id);
                          return (
                            <button
                              key={madde.id}
                              type="button"
                              onClick={() => toggleCheck(madde.id)}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${isChecked ? 'bg-green-50' : ''}`}
                            >
                              {isChecked
                                ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                              <span className={`text-sm ${isChecked ? 'text-green-700 line-through' : 'text-gray-700'}`}>
                                {madde.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDrawer;