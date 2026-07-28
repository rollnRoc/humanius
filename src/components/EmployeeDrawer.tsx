import React, { useState, useEffect } from 'react';
import { X, User, Briefcase, Mail, ClipboardCheck, CheckCircle2, Circle } from 'lucide-react';
import { Employee, Company, Department } from '../types';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteUsers } from '../auth/roles';

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
  const showCompanySelector = appRole === 'superadmin';

  const [formData, setFormData] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState('genel');
  const [checked, setChecked] = useState<Set<string>>(new Set());

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
        { id: 'sz2', label: 'Gizlilik Sözleşmesi İmzalandı' },
        { id: 'sz3', label: 'Etik Kurallar Formu İmzalandı' },
        { id: 'sz4', label: 'KVKK Aydınlatma Formu İmzalandı' },
      ],
    },
    {
      baslik: 'Sistem & Ekipman',
      maddeler: [
        { id: 'se1', label: 'E-posta Hesabı Açıldı' },
        { id: 'se2', label: 'Bilgisayar / Ekipman Teslim Edildi' },
        { id: 'se3', label: 'Kimlik Kartı / Rozet Teslim Edildi' },
        { id: 'se4', label: 'Sistem Erişimleri Tanımlandı' },
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

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  useEffect(() => {
    if (employee) {
      setFormData({ ...employee });
    }
  }, [employee]);

  if (!isOpen || !formData) return null;

  const handleSave = () => {
    onSave(formData);
  };

  const handleInputChange = (field: keyof Employee, value: any) => {
    setFormData({ ...formData, [field]: value });
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
                    <label htmlFor="employee-joindate" className="block text-sm font-medium text-gray-700 mb-2">İşe Giriş Tarihi</label>
                    <input
                      id="employee-joindate"
                      type="date"
                      value={formData.joinDate}
                      onChange={(e) => handleInputChange('joinDate', e.target.value)}
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
                    <label htmlFor="employee-sicilno" className="block text-sm font-medium text-gray-700 mb-2">SGK Sicil No</label>
                    <input
                      id="employee-sicilno"
                      type="text"
                      value={formData.sicil_no || ''}
                      onChange={(e) => handleInputChange('sicil_no', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      placeholder="SGK Sicil Numarası"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'is' && (
              <div className="space-y-6">
                {/* Sistem Erişim Hesabı & Oturum Bilgileri Card matching user screenshot */}
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
                  <p className="text-xs text-gray-500 mb-4">
                    Personel sisteme giriş yapmak istediğinde bu e-posta ve başlangıç şifresi ile oturum açabilir.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Giriş E-postası</label>
                      <input
                        type="email"
                        value={formData.email || (formData.name ? `${formData.name.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9]/g, '')}@humanius.com` : '')}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="adsoyad@humanius.com"
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Başlangıç Şifresi</label>
                      <input
                        type="text"
                        value={formData.approval_passcode || '987654'}
                        onChange={(e) => handleInputChange('approval_passcode', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-600 rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1.5">Sistem Yetki Rolü</label>
                      <select
                        value={formData.role || 'employee'}
                        onChange={(e) => handleInputChange('role', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="employee">Personel</option>
                        <option value="manager">Müdür</option>
                        <option value="hr">İK Uzmanı</option>
                        <option value="admin">Şirket Yöneticisi</option>
                        {appRole === 'superadmin' && <option value="superadmin">Süper Yönetici</option>}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {showCompanySelector && (
                    <div>
                      <label htmlFor="employee-company" className="block text-sm font-medium text-gray-700 mb-2">Şirket</label>
                      <select
                        id="employee-company"
                        value={formData.company}
                        onChange={(e) => handleInputChange('company', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
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
                </div>
              </div>
            )}

            {activeTab === 'iletisim' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="employee-phone" className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                    <input
                      id="employee-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-email" className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      id="employee-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="employee-address" className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                    <textarea
                      id="employee-address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
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