import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Upload, Download, Trash2, FileText, User, Calendar,
  AlertTriangle, Briefcase, Clock, RefreshCw, Plus, X, ChevronDown, Lock,
  Building2, Phone, Mail, MapPin, Shield, FileBadge, ClipboardList, CheckCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ozlukDosyasiService, OzlukDosya } from '../services/ozlukDosyasiService';
import { gorevTanimiService, type GorevTanimi } from '../services/gorevTanimiService';
import { employeeService } from '../services/employeeService';
import PasscodeVerificationModal from './PasscodeVerificationModal';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import type { BordroItem } from '../types/bordro';
import BordroOnay from './BordroOnay';
import GorevTanimiOnay from './GorevTanimiOnay';
import BordroList from './BordroList';
import { bordroService } from '../services/bordroService';
import { QRCodeSVG } from 'qrcode.react';
import bcrypt from 'bcryptjs';

// Belge kategorileri
const BELGE_KATEGORILER = [
  { id: 'ise_giris_bildirgesi', label: 'İş Yeri Giriş Bildirgesi', aciklama: 'SGK işe giriş bildirge belgesi' },
  { id: 'adli_sicil', label: 'Adli Sicil Kaydı', aciklama: 'Cumhuriyet Savcılığından alınan adli sicil belgesi' },
  { id: 'adres_belgesi', label: 'Adres Belgesi', aciklama: 'e-Devlet üzerinden alınan yerleşim yeri belgesi' },
  { id: 'gorev_tanimi_belgesi', label: 'Görev Tanımı Dosyası', aciklama: 'Onaylı görev tanımı belgesi' },
  { id: 'diger', label: 'Diğer Belgeler', aciklama: 'Diğer resmi belgeler' },
] as const;

type KategoriId = typeof BELGE_KATEGORILER[number]['id'];

type TabId = 'genel' | 'belgeler' | 'bordro' | 'izin' | 'gorev-tanimi' | 'tutanaklar' | 'sikayetler';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'genel', label: 'Genel Bilgiler', icon: User },
  { id: 'belgeler', label: 'Belgeler', icon: FolderOpen },
  { id: 'bordro', label: 'Bordro Özeti', icon: Briefcase },
  { id: 'izin', label: 'İzin Durumu', icon: Calendar },
  { id: 'gorev-tanimi', label: 'Görev Tanımı', icon: ClipboardList },
  { id: 'tutanaklar', label: 'Tutanaklar', icon: FileText },
  { id: 'sikayetler', label: 'Şikayetler', icon: AlertTriangle },
];

// İzin türü etiketi
const izinTuruLabel = (tur: string) => {
  const map: Record<string, string> = {
    yillik: 'Yıllık İzin', mazeret: 'Mazeret', hastalik: 'Hastalık',
    dogum: 'Doğum', babalik: 'Babalık', evlilik: 'Evlilik', olum: 'Ölüm',
    ucretsiz: 'Ücretsiz',
  };
  return map[tur] ?? tur;
};

const durumLabel = (d: string) => {
  const map: Record<string, { text: string; cls: string }> = {
    beklemede: { text: 'Beklemede', cls: 'bg-amber-100 text-amber-700' },
    onaylandi: { text: 'Onaylandı', cls: 'bg-green-100 text-green-700' },
    reddedildi: { text: 'Reddedildi', cls: 'bg-red-100 text-red-700' },
  };
  return map[d] ?? { text: d, cls: 'bg-gray-100 text-gray-600' };
};

//  !alıxma süresi hesaplama 
function calismaSuresi(joinDate?: string): string {
  if (!joinDate) return '-';
  const start = new Date(joinDate);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 1) return '1 aydan az';
  const yil = Math.floor(months / 12);
  const ay = months % 12;
  const parts: string[] = [];
  if (yil > 0) parts.push(`${yil} yıl`);
  if (ay > 0) parts.push(`${ay} ay`);
  return parts.join(' ') || '-';
}

//  Dosya satırı bilexeni 
interface DosyaSatiriProps {
  dosya: OzlukDosya;
  onDelete: (dosya: OzlukDosya) => void;
  onDownload: (dosya: OzlukDosya) => void;
}

const DosyaSatiri: React.FC<DosyaSatiriProps> = ({ dosya, onDelete, onDownload }) => (
  <div className="flex items-start justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
    <div className="flex-1 min-w-0">
      {dosya.dosya_adi ? (
        <p className="text-sm font-medium text-gray-800 truncate">{dosya.dosya_adi}</p>
      ) : null}
      {dosya.notlar ? (
        <p className="text-sm text-gray-700 whitespace-pre-line">{dosya.notlar}</p>
      ) : null}
      <p className="text-xs text-gray-400 mt-0.5">
        {new Date(dosya.created_at).toLocaleDateString('tr-TR')}
      </p>
    </div>
    <div className="flex items-center gap-1 shrink-0">
      {dosya.dosya_yolu && (
        <button
          onClick={() => onDownload(dosya)}
          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
          title="İndir"
        >
          <Download className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={() => onDelete(dosya)}
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
        title="Sil"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);

//  Ana bilexen 

interface OzlukDosyasiProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
  bordrolar: BordroItem[];
  selectedEmpId?: string;
  isAccessGranted?: boolean;
  onSelectEmployee?: (empId: string) => void;
}

const OzlukDosyasi: React.FC<OzlukDosyasiProps> = ({
  employees,
  izinTalepleri,
  izinHaklari,
  bordrolar,
  selectedEmpId,
  isAccessGranted = false,
  onSelectEmployee,
}) => {
  const { profile, appRole } = useAuth();
  const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';
  const effectiveCompanyId = profile?.company_id ?? DEMO_COMPANY_ID;
  const storageEnabled = import.meta.env.VITE_SUPABASE_STORAGE_ENABLED !== 'false';

  // ~irkete göre filtrele
  const companyEmployees = employees.filter(
    (e) => !profile?.company_id || e.company_id === profile.company_id
  );

  const [activeTab, setActiveTab] = useState<TabId>('genel');

  // Belgeler
  const [dosyalar, setDosyalar] = useState<OzlukDosya[]>([]);
  const [dosyaLoading, setDosyaLoading] = useState(false);
  const [dosyaError, setDosyaError] = useState<string | null>(null);

  // Belge yükleme
  const [uploadingKategori, setUploadingKategori] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Görev tanımları
  const [gorevTanimlari, setGorevTanimlari] = useState<GorevTanimi[]>([]);
  const [gorevTanimiLoading, setGorevTanimiLoading] = useState(false);

  // Tutanak / Şikayet yazı ekleme
  const [yeniYazi, setYeniYazi] = useState<Record<string, string>>({});
  const [yaziKaydediliyor, setYaziKaydediliyor] = useState<Record<string, boolean>>({});

  // Yedekleme
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Bordro Onay
  const [bordroApprovals, setBordroApprovals] = useState<any[]>([]);
  const [bordroApprovalsLoading, setBordroApprovalsLoading] = useState(true);
  const [showBordroOnay, setShowBordroOnay] = useState<BordroItem | null>(null);

  // Görev Tanımı Onay
  const [activeOnayGorevTanimi, setActiveOnayGorevTanimi] = useState<GorevTanimi | null>(null);

  const selectedEmp = companyEmployees.find((e) => e.id === selectedEmpId) ?? null;

  const currentEmployeeMatch = React.useMemo(() => {
    return employees.find(e => e.email?.toLowerCase() === profile?.email?.toLowerCase());
  }, [employees, profile]);

  const isSelf = selectedEmpId === currentEmployeeMatch?.id;

  const loadGorevTanimlari = () => {
    if (!selectedEmpId || !effectiveCompanyId) { setGorevTanimlari([]); return; }
    setGorevTanimiLoading(true);
    gorevTanimiService
      .getGorevTanimlari(effectiveCompanyId)
      .then((data) => {
        const filtrelenmis = (data ?? []).filter(
          (g: GorevTanimi) => g.employee_id === selectedEmpId && 
            (g.onay_durumu === 'onaylandi' || g.onay_durumu === 'beklemede' || !g.onay_durumu)
        );
        setGorevTanimlari(filtrelenmis);
      })
      .catch(() => setGorevTanimlari([]))
      .finally(() => setGorevTanimiLoading(false));
  };

  // Görev tanımlarını yükle
  useEffect(() => {
    loadGorevTanimlari();
  }, [selectedEmpId, effectiveCompanyId]);

  // Bordro Onayları yükle
  const loadBordroApprovals = async () => {
    if (!selectedEmpId) {
      setBordroApprovals([]);
      setBordroApprovalsLoading(false);
      return;
    }
    setBordroApprovalsLoading(true);
    try {
      const approvals = await bordroService.getEmployeeApprovals(selectedEmpId);
      setBordroApprovals(approvals || []);
    } catch (error) {
      console.error('Bordro onayları yüklenemedi:', error);
    } finally {
      setBordroApprovalsLoading(false);
    }
  };

  useEffect(() => {
    loadBordroApprovals();
  }, [selectedEmpId]);

  // Belge yükle
  useEffect(() => {
    if (!selectedEmpId) { setDosyalar([]); return; }
    setDosyaLoading(true);
    setDosyaError(null);
    ozlukDosyasiService
      .getDosyalar(selectedEmpId)
      .then((items) => {
        setDosyalar(items);
        setDosyaError(null);
      })
      .catch((err) => setDosyaError(err?.message ?? 'Belgeler yüklenemedi'))
      .finally(() => setDosyaLoading(false));
  }, [selectedEmpId]);

  // Yedekleme doxrulama
  const handleBackupVerify = async (passcode: string): Promise<boolean> => {
    if (!selectedEmp) return false;
    const stored = selectedEmp.approval_passcode;
    if (stored && stored !== passcode) return false;
    performBackup();
    return true;
  };

  const reloadDosyalar = async () => {
    if (!selectedEmpId) return;
    setDosyaLoading(true);
    setDosyaError(null);
    try {
      setDosyalar(await ozlukDosyasiService.getDosyalar(selectedEmpId));
      setDosyaError(null);
    } catch (err: any) {
      setDosyaError(err?.message ?? 'Belgeler yüklenemedi');
    } finally {
      setDosyaLoading(false);
    }
  };

  // Dosya yükleme
  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kategori: string
  ) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEmp) return;
    setUploadingKategori(kategori);
    try {
      setDosyaError(null);
      await ozlukDosyasiService.uploadDosya(
        effectiveCompanyId,
        selectedEmp.id,
        kategori,
        file
      );
      await reloadDosyalar();
    } catch (err: any) {
      setDosyaError(err?.message ?? 'Dosya yüklenemedi');
    } finally {
      setUploadingKategori(null);
      if (e.target) e.target.value = '';
    }
  };

  // İndirme
  const handleDownload = async (dosya: OzlukDosya) => {
    if (!dosya.dosya_yolu) return;
    try {
      const url = await ozlukDosyasiService.getSignedUrl(dosya.dosya_yolu);
      const a = document.createElement('a');
      a.href = url;
      a.download = dosya.dosya_adi ?? 'dosya';
      a.target = '_blank';
      a.click();
    } catch (err: any) {
      alert(`İndirme baxlatılamadı: ${err?.message ?? 'Bilinmeyen hata'}`);
    }
  };

  // Silme
  const handleDelete = async (dosya: OzlukDosya) => {
    if (!window.confirm(`"${dosya.dosya_adi ?? 'Bu kayıt'}" silinsin mi?`)) return;
    try {
      await ozlukDosyasiService.deleteDosya(dosya.id, dosya.dosya_yolu);
      setDosyalar((prev) => prev.filter((d) => d.id !== dosya.id));
    } catch (err: any) {
      alert(`Silinemedi: ${err?.message ?? 'Bilinmeyen hata'}`);
    }
  };

  // Yazı kaydet (tutanak/şikayet)
  const handleSaveYazi = async (kategori: string) => {
    const metin = yeniYazi[kategori]?.trim();
    if (!metin || !selectedEmp) return;
    setYaziKaydediliyor((prev) => ({ ...prev, [kategori]: true }));
    try {
      setDosyaError(null);
      await ozlukDosyasiService.saveYaziKaydi(
        effectiveCompanyId,
        selectedEmp.id,
        kategori,
        metin
      );
      setYeniYazi((prev) => ({ ...prev, [kategori]: '' }));
      await reloadDosyalar();
    } catch (err: any) {
      setDosyaError(err?.message ?? 'Kaydedilemedi');
    } finally {
      setYaziKaydediliyor((prev) => ({ ...prev, [kategori]: false }));
    }
  };

  // Yedekleme ixlemi (doxrudan çaxrılır, xifre kontrolü handleBackupVerify'da)
  const performBackup = () => {
    if (!selectedEmp) return;

    const empBordroForBackup = bordrolar.filter((b) => b.employee_id === selectedEmpId);
    const empIzinHakkiForBackup = izinHaklari.find((h) => h.employeeId === selectedEmpId);
    const empIzinTalepleriForBackup = izinTalepleri.filter((t) => t.employeeId === selectedEmpId);

    const yedek = {
      tarih: new Date().toISOString(),
      personel: {
        id: selectedEmp.id,
        ad_soyad: selectedEmp.name,
        tc_no: selectedEmp.tc_no ?? '-',
        sicil_no: selectedEmp.sicil_no ?? '-',
        departman: selectedEmp.department,
        pozisyon: selectedEmp.position,
        ise_giris: selectedEmp.join_date,
        telefon: selectedEmp.phone,
        email: selectedEmp.email,
        adres: selectedEmp.address,
        personel_turu: selectedEmp.employeeType,
        durum: selectedEmp.status,
      },
      belge_kategoriler: BELGE_KATEGORILER.map((k) => ({
        id: k.id,
        baslik: k.label,
        aciklama: k.aciklama,
        dosyalar: dosyaByKategori(k.id).map((d) => ({
          ad: d.dosya_adi,
          not: d.notlar,
          tarih: d.created_at,
        })),
      })),
      tutanaklar: dosyaByKategori('tutanak').map((d) => ({
        ad: d.dosya_adi,
        not: d.notlar,
        tarih: d.created_at,
      })),
      sikayetler: dosyaByKategori('sikayet').map((d) => ({
        ad: d.dosya_adi,
        not: d.notlar,
        tarih: d.created_at,
      })),
      bordrolar: empBordroForBackup
        .sort((a, b) => b.period.localeCompare(a.period))
        .map((b) => ({
          donem: b.period,
          brut: b.brut_maas,
          net: b.net_maas,
          sgk: b.sgk_isci_payi,
        })),
      izin_hakki: empIzinHakkiForBackup
        ? {
            toplam: empIzinHakkiForBackup.toplamHak,
            kullanilan: empIzinHakkiForBackup.kullanilanIzin,
            kalan: empIzinHakkiForBackup.kalanIzin,
            calisma_yili: empIzinHakkiForBackup.calismaYili,
          }
        : null,
      izin_talepleri: empIzinTalepleriForBackup.map((t) => ({
        tur: t.izinTuru,
        baslangic: t.baslangicTarihi,
        bitis: t.bitisTarihi,
        gun: t.gunSayisi,
        durum: t.durum,
      })),
      gorev_tanimlari: gorevTanimlari.map((g) => ({
        ad: g.gorev_adi,
        aciklama: g.gorev_aciklama,
        sorumluluklar: g.sorumluluklar,
        yetki_sorumluluklar: g.yetki_ve_sorumluluklar,
        performans: g.performans_kriterleri,
        calismalar: g.calismalar,
        onay_tarihi: g.onay_tarihi,
      })),
    };

    // localStorage'a da kaydet
    localStorage.setItem(`ozluk_yedek_${selectedEmpId}`, JSON.stringify(yedek));

    // Tarayıcı "Farklı Kaydet" dialogunu aç
    const tarihStr = new Date().toISOString().slice(0, 10);
    const empAdi = (selectedEmp.name ?? 'personel').replace(/\s+/g, '_');
    const dosyaAdi = `ozluk_${empAdi}_${tarihStr}.json`;

    const blob = new Blob([JSON.stringify(yedek, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = dosyaAdi;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // İzin verileri
  const empIzinHakki = selectedEmpId
    ? izinHaklari.find((h) => h.employeeId === selectedEmpId)
    : undefined;
  const empIzinTalepleri = selectedEmpId
    ? izinTalepleri
        .filter((t) => t.employeeId === selectedEmpId)
        .sort(
          (a, b) =>
            new Date(b.baslangicTarihi).getTime() - new Date(a.baslangicTarihi).getTime()
        )
    : [];

  // Bordro verileri
  const empBordrolar = selectedEmpId
    ? [...bordrolar]
        .filter((b) => b.employee_id === selectedEmpId)
        .sort((a, b) => b.period.localeCompare(a.period))
    : [];

  // Kategori bazlı dosyalar
  const dosyaByKategori = (kategori: string) =>
    dosyalar.filter((d) => d.kategori === kategori);

  const normalizedDosyaError = dosyaError?.toLowerCase() ?? '';
  const ozlukSetupEksik =
    normalizedDosyaError.includes('ozluk_dosyalari') ||
    normalizedDosyaError.includes('schema cache') ||
    normalizedDosyaError.includes('bucket not found');

  const baglantiHatasi =
    normalizedDosyaError.includes('name resolution failed') ||
    normalizedDosyaError.includes('failed to fetch') ||
    normalizedDosyaError.includes('networkerror');

  const storageKapaliMesaji = !storageEnabled
    ? 'Local ortamda Storage servisi kapali oldugu icin belge yukleme ve indirme devre disi. Veritabani belgeleri listelenebilir, ancak dosya islemleri kullanilamaz.'
    : null;

  const ozlukSetupMesaji = ozlukSetupEksik
    ? 'Özlük dosyası altyapısı bu Supabase projesinde henüz kurulmamış. Lütfen kurulum adımlarını tamamlayın.'
    : baglantiHatasi
    ? 'Bağlantı hatası: Sunucu ile iletişim kurulamadı. Lütfen internet bağlantınızı kontrol edin veya sayfayı yenileyin.'
    : null;

  //    Render                                                                   

  return (
    <div className="space-y-6">
      {/* Baxlık */}
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-xl">
          <FolderOpen className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Çalışan Özlük Dosyası</h1>
          <p className="text-sm text-gray-500">Personel belgeleri, izin geçmişi ve bordro özeti</p>
        </div>
      </div>

      {/* Personel seçimi */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[260px]">
          <label className="block text-xs font-semibold text-gray-600 mb-1">Personel Seçin</label>
          <div className="relative">
            <select
              value={selectedEmpId || ''}
              onChange={(e) => {
                if (onSelectEmployee) onSelectEmployee(e.target.value);
                setActiveTab('genel');
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 pr-9 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">  Personel seçin  </option>
              {companyEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                  {emp.department ? `   ${emp.department}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
        {selectedEmp && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-2">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {selectedEmp.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedEmp.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedEmp.department} ⬢ {selectedEmp.position}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedEmp?.approval_passcode) {
                  setShowBackupModal(true);
                } else {
                  // Şifre tanımlı değil, direkt yedekle
                  performBackup();
                }
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow-sm"
              title="Özlük dosyasını yerel depoya yedekle"
            >
              <Download className="w-4 h-4" />
              Yedekle
            </button>
          </div>
        )}
      </div>

      {!selectedEmpId && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Özlük dosyasını görüntülemek için personel seçin</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">Yukarıdaki açılır menüden veya aşağıdaki listeden bir çalışan seçerek devam edin</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {companyEmployees.map(emp => (
              <div 
                key={emp.id} 
                onClick={() => {
                  if (onSelectEmployee) onSelectEmployee(emp.id);
                  setActiveTab('genel');
                }}
                className="p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-sm cursor-pointer transition-all bg-gray-50 hover:bg-blue-50 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="font-medium text-gray-900 truncate">{emp.name}</div>
                  <div className="text-xs text-gray-500 truncate">{emp.department || 'Departman Yok'}</div>
                </div>
              </div>
            ))}
          </div>
          {companyEmployees.length === 0 && (
             <div className="text-red-500 p-4 bg-red-50 rounded-lg mt-4">Şirketinize ait personel bulunamadı. Lütfen önce sisteme personel ekleyin.</div>
          )}
        </div>
      )}

      {/* Yedekleme Güvenli Belge Onayı modalı */}
      {showBackupModal && selectedEmp && (
        <PasscodeVerificationModal
          isOpen={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          onVerify={handleBackupVerify}
          employeeName={selectedEmp.name}
          title="Özlük Dosyası Yedekleme"
          actionLabel="Yedekle"
          actionDescription="Personelin tüm özlük bilgileri (belgeler, bordro, izin, görev tanımı, tutanaklar) yerel depolamaya kaydedilecek."
          actionColor="indigo"
          tcNo={selectedEmp.tc_no ?? undefined}
        />
      )}

      {selectedEmp && (
        <div className="animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/*  Genel Bilgiler  */}
              {activeTab === 'genel' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoSatiri icon={User} label="Ad Soyad" value={selectedEmp.name} />
                  <InfoSatiri icon={FileBadge} label="TC Kimlik No" value={selectedEmp.tc_no ?? '-'} />
                  <InfoSatiri icon={FileBadge} label="Sicil No" value={selectedEmp.sicil_no ?? '-'} />
                  <InfoSatiri icon={Building2} label="Departman" value={selectedEmp.department || '-'} />
                  <InfoSatiri icon={Briefcase} label="Pozisyon / Unvan" value={selectedEmp.position || '-'} />
                   <InfoSatiri
                    icon={Calendar}
                    label="İşe Giriş Tarihi"
                    value={
                      selectedEmp.join_date
                        ? new Date(selectedEmp.join_date).toLocaleDateString('tr-TR')
                        : '-'
                    }
                  />
                  <InfoSatiri
                    icon={Clock}
                    label="Çalışma Süresi"
                    value={calismaSuresi(selectedEmp.join_date)}
                  />
                  <InfoSatiri icon={Phone} label="Telefon" value={selectedEmp.phone || '-'} />
                  <InfoSatiri icon={Mail} label="E-posta" value={selectedEmp.email || '-'} />
                  <InfoSatiri icon={MapPin} label="Adres" value={selectedEmp.address || '-'} />
                  <InfoSatiri
                    icon={Shield}
                    label="Personel Türü"
                    value={selectedEmp.employeeType === 'emekli' ? 'Emekli' : 'Normal'}
                  />
                  <InfoSatiri
                    icon={Shield}
                    label="Durum"
                    value={
                      selectedEmp.status === 'active'
                        ? 'Aktif'
                        : selectedEmp.status === 'onLeave'
                        ? 'İzinde'
                        : 'Pasif'
                    }
                  />
                </div>
              )}

              {/*  Belgeler  */}
              {activeTab === 'belgeler' && (
                <div className="space-y-4">
                  {storageKapaliMesaji && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {storageKapaliMesaji}
                    </div>
                  )}
                  {dosyaError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {ozlukSetupMesaji ?? dosyaError}
                    </div>
                  )}
                  {BELGE_KATEGORILER.map((kat) => {
                    const katDosyalar = dosyaByKategori(kat.id);
                    return (
                      <div key={kat.id} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-semibold text-gray-800">{kat.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{kat.aciklama}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <input
                              ref={(el) => { fileInputRefs.current[kat.id] = el; }}
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                              onChange={(e) => handleFileSelect(e, kat.id)}
                            />
                            <button
                              onClick={() => fileInputRefs.current[kat.id]?.click()}
                              disabled={uploadingKategori === kat.id || ozlukSetupEksik || !storageEnabled}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
                            >
                              {uploadingKategori === kat.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              Dosya Seç
                            </button>
                          </div>
                        </div>

                        {dosyaLoading ? (
                          <p className="text-xs text-gray-400 text-center py-2">Yükleniyor...</p>
                        ) : katDosyalar.length === 0 ? (
                          <p className="text-xs text-gray-400 py-1">Henüz dosya eklenmedi.</p>
                        ) : (
                          <div className="space-y-2">
                            {katDosyalar.map((d) => (
                              <DosyaSatiri
                                key={d.id}
                                dosya={d}
                                onDelete={handleDelete}
                                onDownload={handleDownload}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/*  Bordro zeti  */}
              {activeTab === 'bordro' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">
                      Toplam {empBordrolar.length} bordro kaydı
                    </p>
                  </div>
                  {empBordrolar.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                      <Briefcase className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Bu personel için bordro kaydı bulunamadı</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Dönem</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Brüt Ücret</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Net Ücret</th>
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Durum</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {empBordrolar.map((b) => {
                              const approval = bordroApprovals.find(a => a.bordro_id === b.id);
                              return (
                            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-gray-800">{b.period}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">
                                {Number(b.brut_maas).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                                {Number(b.net_maas).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {bordroApprovalsLoading ? (
                                  <span className="text-xs text-gray-400">Yükleniyor...</span>
                                ) : approval ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
                                    approval.approval_status === 'onaylandi' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    {approval.approval_status === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}
                                  </span>
                                ) : b.approval_status === 'beklemede' ? (
                                  <button
                                    onClick={() => setShowBordroOnay(b)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                  >
                                    <Shield className="w-4 h-4" />
                                    Bordroyu Onayla
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-400">Onay Beklenmiyor</span>
                                )}
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/*  İzin Durumu  */}
              {activeTab === 'izin' && (
                <div className="space-y-5">
                  {/* İzin hakları özeti */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <IzinKartı label="Toplam Hak" value={`${empIzinHakki?.toplamHak ?? '-'} gün`} color="blue" />
                    <IzinKartı label="Kullanılan" value={`${empIzinHakki?.kullanilanIzin ?? 0} gün`} color="amber" />
                    <IzinKartı label="Kalan" value={`${empIzinHakki?.kalanIzin ?? 0} gün`} color="green" />
                    <IzinKartı label="Çalışma Yılı" value={`${empIzinHakki?.calismaYili ?? '-'} yıl`} color="purple" />
                  </div>

                  {/* İzin talepleri tablosu */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      İzin Talepleri ({empIzinTalepleri.length} kayıt)
                    </p>
                    {empIzinTalepleri.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center">
                        <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Bu personel için izin talebi bulunamadı</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">İzin Türü</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Başlangıç</th>
                              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Bitiş</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Gün</th>
                              <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Durum</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {empIzinTalepleri.map((t) => {
                              const { text, cls } = durumLabel(t.durum);
                              return (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-2.5 text-gray-800">{izinTuruLabel(t.izinTuru)}</td>
                                  <td className="px-4 py-2.5 text-gray-600">
                                    {new Date(t.baslangicTarihi).toLocaleDateString('tr-TR')}
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-600">
                                    {new Date(t.bitisTarihi).toLocaleDateString('tr-TR')}
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-medium text-gray-800">
                                    {t.gunSayisi}
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                                      {text}
                                    </span>
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
              )}

              {/*  Görev Tanımı  */}
              {activeTab === 'gorev-tanimi' && (
                <div className="space-y-4">
                  {gorevTanimiLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                    </div>
                  ) : gorevTanimlari.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center">
                      <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Bu personel için onaylanmış görev tanımı bulunamadı</p>
                    </div>
                  ) : (
                    gorevTanimlari.map((g) => {
                      const isApproved = g.onay_durumu === 'onaylandi';
                      const isRejected = g.onay_durumu === 'reddedildi';
                      const containerClass = isApproved 
                        ? 'border-green-200 bg-green-50/50' 
                        : isRejected 
                        ? 'border-red-200 bg-red-50/50' 
                        : 'border-yellow-200 bg-yellow-50/50';
                      
                      const StatusIcon = isApproved ? CheckCircle : isRejected ? AlertTriangle : Clock;
                      const iconColor = isApproved ? 'text-green-600' : isRejected ? 'text-red-600' : 'text-yellow-600';
                      
                      const badgeClass = isApproved 
                        ? 'bg-green-100 text-green-700 border-green-200' 
                        : isRejected 
                        ? 'bg-red-100 text-red-700 border-red-200' 
                        : 'bg-yellow-100 text-yellow-700 border-yellow-200';
                      
                      const badgeText = isApproved ? 'Onaylandı' : isRejected ? 'Reddedildi' : 'Onay Bekliyor';
                      const itemBorderClass = isApproved 
                        ? 'border-green-100' 
                        : isRejected 
                        ? 'border-red-100' 
                        : 'border-yellow-100';
                      const dotColor = isApproved ? 'text-green-500' : isRejected ? 'text-red-500' : 'text-yellow-500';

                      return (
                        <div key={g.id} className={`rounded-xl border p-4 space-y-4 ${containerClass}`}>
                          {/* Başlık */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                                <h3 className="text-base font-semibold text-gray-900">{g.gorev_adi}</h3>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 ml-6">
                                {g.is_birimi && <span className="mr-2">{g.is_birimi}</span>}
                                {g.bagli_oldugu_pozisyon && <span>Bağlı: {g.bagli_oldugu_pozisyon}</span>}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}>
                                {badgeText}
                              </span>
                              {g.onay_tarihi && (
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(g.onay_tarihi).toLocaleDateString('tr-TR')}
                                </p>
                              )}
                              {!isApproved && !isRejected && isSelf && (
                                <button
                                  onClick={() => setActiveOnayGorevTanimi(g)}
                                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                                >
                                  <Shield className="w-3.5 h-3.5" />
                                  Oku ve Onayla
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Açıklama */}
                          {g.gorev_aciklama && (
                            <div className={`bg-white rounded-lg border p-3 ${itemBorderClass}`}>
                              <p className="text-xs font-semibold text-gray-600 mb-1">Görev Açıklaması</p>
                              <p className="text-sm text-gray-700 whitespace-pre-line">{g.gorev_aciklama}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {g.sorumluluklar?.length > 0 && (
                              <div className={`bg-white rounded-lg border p-3 ${itemBorderClass}`}>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Sorumluluklar</p>
                                <ul className="space-y-1">
                                  {g.sorumluluklar.map((s, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className={`${dotColor} shrink-0`}>⬢</span>{s}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {g.yetki_ve_sorumluluklar?.length > 0 && (
                              <div className={`bg-white rounded-lg border p-3 ${itemBorderClass}`}>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Yetki ve Sorumluluklar</p>
                                <ul className="space-y-1">
                                  {g.yetki_ve_sorumluluklar.map((y, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className="text-blue-500 shrink-0">⬢</span>{y}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {g.performans_kriterleri?.length > 0 && (
                              <div className={`bg-white rounded-lg border p-3 ${itemBorderClass}`}>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Performans Kriterleri</p>
                                <ul className="space-y-1">
                                  {g.performans_kriterleri.map((p, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className="text-purple-500 shrink-0">⬢</span>{p}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {g.calismalar?.length > 0 && (
                              <div className={`bg-white rounded-lg border p-3 ${itemBorderClass}`}>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Çalışmalar</p>
                                <ul className="space-y-1">
                                  {g.calismalar.map((c, i) => (
                                    <li key={i} className="text-sm text-gray-700 flex gap-2">
                                      <span className="text-amber-500 shrink-0">⬢</span>{c}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/*  Tutanaklar  */}
              {activeTab === 'tutanaklar' && (
                <TutanakSikayetPanel
                  kategori="tutanak"
                  baslik="Tutanaklar"
                  aciklama="Disiplin, uyarı, toplantı tutanakları gibi resmi yazılı kayıtlar"
                  dosyalar={dosyaByKategori('tutanak')}
                  yeniYazi={yeniYazi['tutanak'] ?? ''}
                  kaydediliyor={yaziKaydediliyor['tutanak'] ?? false}
                  uploadingKategori={uploadingKategori}
                  disabled={ozlukSetupEksik || !storageEnabled}
                  fileInputRef={(el) => { fileInputRefs.current['tutanak'] = el; }}
                  onYaziChange={(v) => setYeniYazi((prev) => ({ ...prev, tutanak: v }))}
                  onSaveYazi={() => handleSaveYazi('tutanak')}
                  onFileSelect={(e) => handleFileSelect(e, 'tutanak')}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              )}

              {/*    Şikayetler                                   */}
              {activeTab === 'sikayetler' && (
                <TutanakSikayetPanel
                  kategori="sikayet"
                  baslik="Şikayetler"
                  aciklama="Çalışana yapılan şikayet bildirimleri ve ilgili belgeler"
                  dosyalar={dosyaByKategori('sikayet')}
                  yeniYazi={yeniYazi['sikayet'] ?? ''}
                  kaydediliyor={yaziKaydediliyor['sikayet'] ?? false}
                  uploadingKategori={uploadingKategori}
                  disabled={ozlukSetupEksik || !storageEnabled}
                  fileInputRef={(el) => { fileInputRefs.current['sikayet'] = el; }}
                  onYaziChange={(v) => setYeniYazi((prev) => ({ ...prev, sikayet: v }))}
                  onSaveYazi={() => handleSaveYazi('sikayet')}
                  onFileSelect={(e) => handleFileSelect(e, 'sikayet')}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {showBordroOnay && selectedEmp && (
        <BordroOnay
          bordro={showBordroOnay}
          employeeId={selectedEmp.id}
          employeeName={selectedEmp.name}
          initialShowModal={true}
          onApprovalComplete={() => {
            setShowBordroOnay(null);
            loadBordroApprovals();
          }}
        />
      )}
      {activeOnayGorevTanimi && selectedEmp && (
        <GorevTanimiOnay
          gorevTanimiId={activeOnayGorevTanimi.id || ''}
          employeeId={selectedEmp.id}
          employeeName={selectedEmp.name}
          documentName={activeOnayGorevTanimi.gorev_adi}
          onClose={() => setActiveOnayGorevTanimi(null)}
          onSuccess={() => {
            setActiveOnayGorevTanimi(null);
            loadGorevTanimlari();
          }}
        />
      )}
    </div>
  );
};

//  Yardımcı bilexenler 

const InfoSatiri: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}> = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
    <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  </div>
);

const IzinKartı: React.FC<{
  label: string;
  value: string;
  color: 'blue' | 'amber' | 'green' | 'purple';
}> = ({ label, value, color }) => {
  const colorMap = {
    blue: 'bg-blue-50 border-blue-100 text-blue-900',
    amber: 'bg-amber-50 border-amber-100 text-amber-900',
    green: 'bg-green-50 border-green-100 text-green-900',
    purple: 'bg-purple-50 border-purple-100 text-purple-900',
  };
  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
};

interface TutanakSikayetPanelProps {
  kategori: string;
  baslik: string;
  aciklama: string;
  dosyalar: OzlukDosya[];
  yeniYazi: string;
  kaydediliyor: boolean;
  uploadingKategori: string | null;
  disabled: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onYaziChange: (v: string) => void;
  onSaveYazi: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (d: OzlukDosya) => void;
  onDownload: (d: OzlukDosya) => void;
}

const TutanakSikayetPanel: React.FC<TutanakSikayetPanelProps> = ({
  kategori,
  baslik,
  aciklama,
  dosyalar,
  yeniYazi,
  kaydediliyor,
  uploadingKategori,
  disabled,
  fileInputRef,
  onYaziChange,
  onSaveYazi,
  onFileSelect,
  onDelete,
  onDownload,
}) => {
  const innerRef = useRef<HTMLInputElement | null>(null);

  return (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-gray-800">{baslik}</h3>
      <p className="text-xs text-gray-500 mt-0.5">{aciklama}</p>
    </div>

    {/* Yeni ekleme */}
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Yeni Kayıt Ekle</p>
      <textarea
        value={yeniYazi}
        onChange={(e) => onYaziChange(e.target.value)}
        rows={3}
        placeholder={`${baslik} metnini buraya yazın...`}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={onSaveYazi}
          disabled={!yeniYazi.trim() || kaydediliyor || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {kaydediliyor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Yazı Olarak Kaydet
        </button>
        <span className="text-gray-400 text-xs">veya</span>
        <input
          ref={(el) => { innerRef.current = el; fileInputRef(el); }}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={onFileSelect}
        />
        <button
          onClick={() => innerRef.current?.click()}
          disabled={uploadingKategori === kategori || disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 text-gray-700 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
        >
          {uploadingKategori === kategori ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          Dosya Yükle
        </button>
      </div>
    </div>

    {/* Mevcut kayıtlar */}
    {dosyalar.length === 0 ? (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
        <FileText className="w-8 h-8 text-gray-200 mx-auto mb-1" />
        <p className="text-sm text-gray-400">Henüz {baslik.toLowerCase()} kaydı yok</p>
      </div>
    ) : (
      <div className="space-y-2">
        {dosyalar.map((d) => (
          <DosyaSatiri key={d.id} dosya={d} onDelete={onDelete} onDownload={onDownload} />
        ))}
      </div>
    )}
  </div>
  );
};

export default OzlukDosyasi;


