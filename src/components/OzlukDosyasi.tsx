import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Upload, Download, Trash2, FileText, User, Calendar,
  AlertTriangle, Briefcase, Clock, RefreshCw, Plus, X, ChevronDown, Lock,
  Building2, Phone, Mail, MapPin, Shield, FileBadge, ClipboardList, CheckCircle, Eye,
  BookOpen, Award, Printer, Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ozlukDosyasiService, OzlukDosya } from '../services/ozlukDosyasiService';
import { gorevTanimiService, type GorevTanimi } from '../services/gorevTanimiService';
import { employeeService } from '../services/employeeService';
import type { Employee } from '../types';
import type { IzinTalebi, IzinHakki } from '../types/izin';
import type { BordroItem } from '../types/bordro';
import BordroViewModal from './BordroViewModal';
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

type TabId = 'genel' | 'belgeler' | 'bordro' | 'izin' | 'gorev-tanimi' | 'egitimler' | 'tutanaklar' | 'sikayetler';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'genel', label: 'Genel Bilgiler', icon: User },
  { id: 'belgeler', label: 'Belgeler', icon: FolderOpen },
  { id: 'bordro', label: 'Bordro Özeti', icon: Briefcase },
  { id: 'izin', label: 'İzin Durumu', icon: Calendar },
  { id: 'gorev-tanimi', label: 'Görev Tanımı', icon: ClipboardList },
  { id: 'egitimler', label: 'Eğitimler & Sertifikalar', icon: BookOpen },
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
  selectedEmp?: Employee | null;
  companyName?: string;
}

const DosyaSatiri: React.FC<DosyaSatiriProps> = ({
  dosya,
  onDelete,
  onDownload,
  selectedEmp,
  companyName,
}) => {
  const hasUploadedFile = Boolean(dosya.dosya_yolu);
  const hasTextContent = Boolean(dosya.notlar);

  const handlePrintDocument = () => {
    printTutanakPdf(
      dosya.dosya_adi || 'Resmi Tutanak Evrağı',
      dosya.notlar || 'Resmi tutanak metni kaydı.',
      selectedEmp,
      companyName,
      new Date(dosya.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
    );
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs hover:border-gray-300 transition-all">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {dosya.dosya_adi && (
            <span className="text-sm font-bold text-gray-900">{dosya.dosya_adi}</span>
          )}
          {hasUploadedFile ? (
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              İmzalı Yüklü Dosya Var
            </span>
          ) : (
            <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Yazılı Kayıt (Fiziksel İmza Bekleniyor)
            </span>
          )}
        </div>

        {dosya.notlar && (
          <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-line leading-relaxed">
            {dosya.notlar}
          </p>
        )}

        <p className="text-[11px] text-gray-400">
          Kayıt Tarihi: {new Date(dosya.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center flex-wrap">
        {hasUploadedFile && (
          <button
            onClick={() => onDownload(dosya)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors border border-blue-200"
            title="Yüklü İmzalı Dosyayı İndir"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            Dosya İndir
          </button>
        )}

        {hasTextContent && (
          <button
            onClick={handlePrintDocument}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-xs"
            title="Fiziksel İmza İçin A4 Belge PDF Yazdır / İndir"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            PDF Yazdır / İndir
          </button>
        )}

        <button
          onClick={() => onDelete(dosya)}
          className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100"
          title="Kaydı Sil"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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
  const [fizikselDosyaVar, setFizikselDosyaVar] = useState<Record<string, boolean>>({});

  // Görev tanımları
  const [gorevTanimlari, setGorevTanimlari] = useState<GorevTanimi[]>([]);
  const [gorevTanimiLoading, setGorevTanimiLoading] = useState(false);

  // Tutanak / Şikayet yazı ekleme
  const [yeniYazi, setYeniYazi] = useState<Record<string, string>>({});
  const [yaziKaydediliyor, setYaziKaydediliyor] = useState<Record<string, boolean>>({});



  const [showBordroOnay, setShowBordroOnay] = useState<BordroItem | null>(null);

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
      await ozlukDosyasiService.deleteDosya(dosya.id, dosya.dosya_yolu, selectedEmpId);
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
  const rawIzinHakki = selectedEmpId
    ? izinHaklari.find((h) => h.employeeId === selectedEmpId)
    : undefined;

  const empIzinHakki = React.useMemo(() => {
    if (rawIzinHakki && rawIzinHakki.toplamHak !== undefined && rawIzinHakki.toplamHak !== null) {
      return rawIzinHakki;
    }
    if (!selectedEmp) return undefined;

    const joinDateStr = selectedEmp.join_date || (selectedEmp as any).ise_giris_tarihi || (selectedEmp as any).created_at;
    let calismaYili = 0;
    let toplamHak = 14;

    if (joinDateStr) {
      const joinDate = new Date(joinDateStr);
      if (!isNaN(joinDate.getTime())) {
        const now = new Date();
        calismaYili = Math.max(0, now.getFullYear() - joinDate.getFullYear());
        if (calismaYili < 5) toplamHak = 14;
        else if (calismaYili < 15) toplamHak = 20;
        else toplamHak = 26;
      }
    }

    const empTalepleri = izinTalepleri.filter(t => t.employeeId === selectedEmp.id && t.durum === 'onaylandi' && t.izinTuru === 'yillik');
    const kullanilanIzin = empTalepleri.reduce((sum, t) => sum + (t.gunSayisi || 0) + (t.yolIzniTalep ? (t.yolIzniGun || 0) : 0), 0);
    const kalanIzin = Math.max(0, toplamHak - kullanilanIzin);

    return {
      id: `dynamic-${selectedEmp.id}`,
      employeeId: selectedEmp.id,
      toplamHak,
      kullanilanIzin,
      kalanIzin,
      calismaYili,
    } as IzinHakki;
  }, [rawIzinHakki, selectedEmp, izinTalepleri]);

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

// ─── Resmi Tutanak / İbraname A4 PDF Yazdırma & İndirme Yardımcısı ───────────
const printTutanakPdf = (
  tutanakBaslik: string,
  tutanakMetni: string,
  emp?: Employee | null,
  companyName?: string,
  tarihStr?: string
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const today = tarihStr || new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>${tutanakBaslik} - Resmi Evrak</title>
      <style>
        @page { size: A4 portrait; margin: 15mm 15mm; }
        * { box-sizing: border-box; }
        body { font-family: 'Times New Roman', Times, serif, Arial; color: #000; line-height: 1.5; font-size: 11pt; padding: 10px; background: #fff; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .company-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .doc-title { font-size: 13pt; font-weight: bold; margin-top: 10px; text-decoration: underline; letter-spacing: 1px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
        .meta-table td { border: 1px solid #666; padding: 6px 10px; }
        .meta-bg { background-color: #f2f2f2; font-weight: bold; width: 25%; }
        .body-text { margin-bottom: 30px; text-align: justify; text-indent: 30px; font-size: 11pt; white-space: pre-wrap; word-break: break-word; }
        .declaration { font-size: 9.5pt; font-style: italic; background: #f9f9f9; border: 1px solid #ccc; padding: 10px; margin-bottom: 40px; }
        .signature-grid { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 15px; margin-top: 30px; page-break-inside: avoid; }
        .sig-box { width: 48%; border: 1px solid #333; padding: 12px; font-size: 9.5pt; text-align: center; min-height: 120px; margin-bottom: 10px; }
        .sig-box-title { font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; }
        .footer { margin-top: 40px; font-size: 8.5pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-title">${companyName || 'KURUMSAL ŞİRKET YÖNETİMİ'}</div>
        <div style="font-size: 9pt; color: #444; margin-top: 2px;">İNSAN KAYNAKLARI VE DİSİPLİN KURULU BAŞKANLIĞI</div>
        <div class="doc-title">${tutanakBaslik.toUpperCase()}</div>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-bg">Personel Adı Soyadı:</td>
          <td>${emp ? emp.name : '—'}</td>
          <td class="meta-bg">Tarih:</td>
          <td>${today}</td>
        </tr>
        <tr>
          <td class="meta-bg">TC Kimlik No:</td>
          <td>${emp ? (emp.tcNo || emp.tc_no || '—') : '—'}</td>
          <td class="meta-bg">Doküman Ref:</td>
          <td>FR-IK-TUT-${Math.floor(1000 + Math.random() * 9000)}</td>
        </tr>
        <tr>
          <td class="meta-bg">Departman / Görev:</td>
          <td colspan="3">${emp ? `${emp.department || '—'} / ${emp.position || '—'}` : '—'}</td>
        </tr>
      </table>

      <div class="body-text">${tutanakMetni}</div>

      <div class="declaration">
        <strong>Çalışan Tebliğ & Beyan Metni:</strong> İşbu tutanak / ibraname belgesi tarafıma bizzat tebliğ edilmiş olup, metni okudum, anladım ve ıslak imzalı bir nüshasını elden teslim aldım.
      </div>

      <div class="signature-grid">
        <div class="sig-box">
          <div class="sig-box-title">TEBLİĞ EDEN / İŞVEREN YETKİLİSİ</div>
          <div>Adı Soyadı: .......................................</div>
          <div>Unvanı: İK Yöneticisi / İşveren Vekili</div>
          <div style="margin-top: 30px;">İmza & Kaşe: ...............................</div>
        </div>

        <div class="sig-box">
          <div class="sig-box-title">TEBLİĞ EDİLEN / ÇALIŞAN</div>
          <div>Adı Soyadı: ${emp ? emp.name : '.......................................'}</div>
          <div>"Okudum, anladım, bir nüshasını aldım"</div>
          <div style="margin-top: 30px;">İmza & Tarih: ...............................</div>
        </div>

        <div class="sig-box">
          <div class="sig-box-title">TANIK 1 (ŞAHİT)</div>
          <div>Adı Soyadı: .......................................</div>
          <div>Unvanı: ...........................................</div>
          <div style="margin-top: 30px;">İmza: ............................................</div>
        </div>

        <div class="sig-box">
          <div class="sig-box-title">TANIK 2 (ŞAHİT)</div>
          <div>Adı Soyadı: .......................................</div>
          <div>Unvanı: ...........................................</div>
          <div style="margin-top: 30px;">İmza: ............................................</div>
        </div>
      </div>

      <div class="footer">
        İnsan Kaynakları Yönetim Sistemi · 4857 sayılı İş Kanunu ve ISO 9001 Standartlarına Uygun Tanzim Edilmiştir.
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// ─── Hazır Hukuki Şablonlar Listesi ──────────────────────────────────────────
const TUTANAK_SABLONLARI = [
  {
    id: 'ibraname',
    label: '📄 İşten Çıkarma İbranamesi ve Borcu Yoktur Belgesi (4857 s. K. Uygun)',
    baslik: 'İBRANAME VE BORCU YOKTUR BELGESİ',
    generateText: (emp: Employee, companyName: string, dateStr: string, reasonStr: string) => `
İBRANAME VE BORCU YOKTUR BELGESİ

İşveren Şirket: ${companyName}
Çalışan Adı Soyadı: ${emp.name}
TC Kimlik No: ${emp.tcNo || emp.tc_no || '12345678901'}
Departman / Pozisyon: ${emp.department || 'Genel'} / ${emp.position || 'Personel'}
İşe Giriş Tarihi: ${emp.joinDate || emp.join_date || '—'}
Fesih / İşten Ayrılış Tarihi: ${dateStr}

Yukarıda açık kimliği yazılı personelin iş akdi ${dateStr} tarihi itibarıyla sona ermiştir. Personelin çalışmış olduğu döneme ilişkin kıdem tazminatı, ihbar tazminatı, ödenmemiş ücret alacağı, fazla mesai ücretleri, yıllık izin ücreti, hafta tatili ve genel tatil alacakları da dahil olmak üzere doğmuş ve doğabilecek tüm alacakları eksiksiz olarak hesaplanıp tarafına ödenmiştir.

İşbu ibraname ile çalışan; işveren ${companyName} şirketini ve yöneticilerini geçmişe ve geleceğe dönük olarak gayrikabili rücu serbestçe ibra ettiğini, işverenden hiçbir nam ve ad altında alacağı kalmadığını kabul, beyan ve taahhüt eder.

İşbu belge 2 (iki) nüsha olarak tanzim edilmiş, okunup anlaşılarak karşılıklı imza altına alınmıştır.
`
  },
  {
    id: 'devamsizlik',
    label: '⚠️ Mesai Devamsızlık / Mazeretsiz İşe Gelmeme Tutanağı',
    baslik: 'MAZERETSİZ İŞE GELMEME VE DEVAMSIZLIK TUTANAĞI',
    generateText: (emp: Employee, companyName: string, dateStr: string, reasonStr: string) => `
MAZERETSİZ İŞE GELMEME VE DEVAMSIZLIK TUTANAĞI

İşveren Şirket: ${companyName}
Tutanak Tarihi: ${dateStr}
Çalışan Adı Soyadı: ${emp.name}
TC Kimlik No: ${emp.tcNo || emp.tc_no || '12345678901'}
Departman / Pozisyon: ${emp.department || 'Genel'} / ${emp.position || 'Personel'}

Açıklama / Olay Tespiti:
Şirketimizde ${emp.position || 'personel'} olarak görev yapmakta olan ${emp.name}, ${dateStr} tarihinde mesai başlangıç saatinden itibaren işverene veya yetkili amirlere herhangi bir mazeret veya izin bildiriminde bulunmaksızın görevine gelmemiştir. ${reasonStr ? `\n\nEk Detay: ${reasonStr}` : ''}

Yapılan telefon aramalarında ulaşılamamış / sunulan mazeret geçerli görülmemiştir. 4857 sayılı İş Kanunu'nun 25/II-g maddesi uyarınca yasal işlem yapılmak üzere işbu tutanak tanzim olunmuştur.
`
  },
  {
    id: 'talimat_aykirilik',
    label: '📝 Görev ve İş Talimatlarına Aykırılık Tutanağı',
    baslik: 'GÖREV VE İŞ TALİMATLARINA AYKIRILIK TUTANAĞI',
    generateText: (emp: Employee, companyName: string, dateStr: string, reasonStr: string) => `
GÖREV VE İŞ TALİMATLARINA AYKIRILIK TUTANAĞI

İşveren Şirket: ${companyName}
Tutanak Tarihi: ${dateStr}
Çalışan Adı Soyadı: ${emp.name}
TC Kimlik No: ${emp.tcNo || emp.tc_no || '12345678901'}
Departman / Pozisyon: ${emp.department || 'Genel'} / ${emp.position || 'Personel'}

Olay ve İhlal Özeti:
${reasonStr || 'Verilen görevi zamanında ve talimatlara uygun olarak yerine getirmeme tespiti.'}

Şirketimiz ${emp.department || 'Genel'} departmanında ${emp.position || 'personel'} olarak görev yapan ${emp.name}, yukarıda belirtilen konu ile ilgili olarak kendisine verilen yazılı/sözlü iş talimatlarına ve şirket prosedürlerine aykırı davranmıştır. İşbu tutanak personelin savunmasının talep edilmesi ve özlük dosyasına işlenmesi amacıyla düzenlenmiştir.
`
  },
  {
    id: 'disiplin_ihlali',
    label: '⚖️ İş Yeri Disiplin ve Düzen İhlali Tutanağı',
    baslik: 'İŞ YERİ DİSİPLİN VE DÜZEN İHLALİ TUTANAĞI',
    generateText: (emp: Employee, companyName: string, dateStr: string, reasonStr: string) => `
İŞ YERİ DİSİPLİN VE DÜZEN İHLALİ TUTANAĞI

İşveren Şirket: ${companyName}
Tutanak Tarihi: ${dateStr}
Çalışan Adı Soyadı: ${emp.name}
TC Kimlik No: ${emp.tcNo || emp.tc_no || '12345678901'}
Departman / Pozisyon: ${emp.department || 'Genel'} / ${emp.position || 'Personel'}

Disiplin İhlali Özeti:
${reasonStr || 'İş yerinde mesai saatleri içerisinde iş disiplinini ve huzurunu bozucu davranışlarda bulunulduğu tespit edilmiştir.'}

Yukarıda detayları yer alan durum, ${dateStr} tarihinde iş yeri dahilinde gerçekleşmiş olup şirket içi huzur ve disiplini olumsuz etkilemiştir. İşbu tutanak durumu resmi kayıt altına almak ve yasal süreçleri başlatmak üzere tanzim edilmiştir.
`
  },
  {
    id: 'istifa_dilekcesi',
    label: '💼 İstifa ve İş Akdi Fesih Dilekçesi / Protokolü',
    baslik: 'İSTİFA VE İŞ AKDİ FESİH PROTOKOLÜ',
    generateText: (emp: Employee, companyName: string, dateStr: string, reasonStr: string) => `
İSTİFA VE İŞ AKDİ FESİH PROTOKOLÜ

İşveren Şirket: ${companyName}
İstifa Tarihi: ${dateStr}
Çalışan Adı Soyadı: ${emp.name}
TC Kimlik No: ${emp.tcNo || emp.tc_no || '12345678901'}
Departman / Pozisyon: ${emp.department || 'Genel'} / ${emp.position || 'Personel'}

İşveren Şirket Yetkililerine,
Şirketiniz bünyesinde ${emp.joinDate || emp.join_date || '—'} tarihinden bu yana ${emp.position || 'personel'} olarak sürdürmekte olduğum görevimden, kendi istek ve rızam ile ${dateStr} tarihi itibarıyla istifa ederek ayrılıyorum. ${reasonStr ? `\n\nAyrılış Nedeni: ${reasonStr}` : ''}

Görev yaptığım süre zarfında doğan tüm haklarımın tarafıma ödendiğini, şirket ile ilgili herhangi bir alacağımın bulunmadığını beyan eder, gereğinin yapılmasını arz ederim.
`
  }
];

//     Dosya satırı bilexeni                                                                   

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
              onClick={performBackup}
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
                            <label className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                              <input
                                type="checkbox"
                                checked={!!(fizikselDosyaVar[kat.id])}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setFizikselDosyaVar(prev => ({ ...prev, [kat.id]: checked }));
                                }}
                                className="w-3.5 h-3.5 text-blue-600 rounded"
                              />
                              <span>Fiziksel Dosyasında Var</span>
                            </label>
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
                              Dijital Dosya Yükle
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
                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">İşlemler</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {empBordrolar.map((b) => {
                              return (
                            <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2.5 font-medium text-gray-800">{b.period}</td>
                              <td className="px-4 py-2.5 text-right text-gray-700">
                                 {Number(b.brut_maas).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-green-700">
                                {Number(b.net_maas).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  onClick={() => setShowBordroOnay(b)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  Görüntüle
                                </button>
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
                      const itemBorderClass = 'border-gray-100';
                      const dotColor = 'text-blue-500';

                      return (
                        <div key={g.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
                          {/* Başlık */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <ClipboardList className="w-4 h-4 shrink-0 text-blue-600" />
                                <h3 className="text-base font-semibold text-gray-900">{g.gorev_adi}</h3>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 ml-6">
                                {g.is_birimi && <span className="mr-2">{g.is_birimi}</span>}
                                {g.bagli_oldugu_pozisyon && <span>Bağlı: {g.bagli_oldugu_pozisyon}</span>}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              {g.created_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Kayıt: {new Date(g.created_at).toLocaleDateString('tr-TR')}
                                </p>
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
                  selectedEmp={selectedEmp}
                  companyName={(selectedEmp as any)?.company || 'Kurumsal Şirket'}
                  fileInputRef={(el) => { fileInputRefs.current['tutanak'] = el; }}
                  onYaziChange={(v) => setYeniYazi((prev) => ({ ...prev, tutanak: v }))}
                  onSaveYazi={() => handleSaveYazi('tutanak')}
                  onFileSelect={(e) => handleFileSelect(e, 'tutanak')}
                  onDelete={handleDelete}
                  onDownload={handleDownload}
                />
              )}

              {/*    Eğitimler & Sertifikalar                    */}
              {activeTab === 'egitimler' && (() => {
                const saved = localStorage.getItem(`humanius_sertifikalar_${effectiveCompanyId}`);
                const allCerts = saved ? JSON.parse(saved) : [];
                const empCerts = allCerts.filter((c: any) => c.employeeId === selectedEmp.id || c.employeeName === selectedEmp.name);
                const tamamlananlar = empCerts.filter((c: any) => c.durum !== 'devam_ediyor');
                const atananlar = empCerts.filter((c: any) => c.durum === 'devam_ediyor');

                return (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-blue-600" />
                          Eğitimler & Sertifikalar
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">Personelin katıldığı, tamamladığı ve devam eden eğitim süreçleri.</p>
                      </div>
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200">
                        {empCerts.length} Toplam Eğitim Kaydı
                      </span>
                    </div>

                    {empCerts.length === 0 ? (
                      <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-500">
                        <Award className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                        <p className="font-semibold text-sm">Henüz Kayıtlı Eğitim Bulunmuyor</p>
                        <p className="text-xs text-gray-400 mt-1">Sol menüdeki "Eğitim & Gelişim (LMS)" modülünden yeni bir eğitim atayabilir veya sertifika kaydı ekleyebilirsiniz.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Atanan / Devam Eden Eğitimler */}
                        {atananlar.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-amber-600" />
                              Devam Eden / Atanan Eğitimler ({atananlar.length})
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {atananlar.map((cert: any) => (
                                <div key={cert.id} className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 shadow-sm flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-4 h-4 text-amber-600 shrink-0" />
                                      <h5 className="font-bold text-sm text-gray-800">{cert.egitimAdi}</h5>
                                    </div>
                                    <p className="text-xs text-amber-800 font-medium">Hedef Tamamlama Tarihi: {cert.hedefTarih || cert.tamamlanmaTarihi || '-'}</p>
                                  </div>
                                  <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-300">
                                    🟡 Devam Ediyor
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Tamamlanan Eğitimler */}
                        {tamamlananlar.length > 0 && (
                          <div>
                            <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              Tamamlanan Eğitimler & Sertifikalar ({tamamlananlar.length})
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                              {tamamlananlar.map((cert: any) => (
                                <div key={cert.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-start justify-between">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <Award className="w-4 h-4 text-yellow-500 shrink-0" />
                                      <h5 className="font-bold text-sm text-gray-800">{cert.egitimAdi}</h5>
                                    </div>
                                    <p className="text-xs text-gray-500">Tamamlanma Tarihi: {cert.tamamlanmaTarihi || '-'}</p>
                                    {cert.gecerlilikSuresi && (
                                      <p className="text-xs text-blue-600 font-medium">Geçerlilik: {cert.gecerlilikSuresi} Ay</p>
                                    )}
                                  </div>
                                  {typeof cert.puan === 'number' && cert.puan !== null ? (
                                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full border border-green-200">
                                      %{cert.puan} Başarı
                                    </span>
                                  ) : (
                                    <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200">
                                      ✓ Tamamlandı
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

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
                  selectedEmp={selectedEmp}
                  companyName={(selectedEmp as any)?.company || 'Kurumsal Şirket'}
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
        <BordroViewModal
          bordro={showBordroOnay}
          employeeId={selectedEmp.id}
          employeeName={selectedEmp.name}
          onClose={() => setShowBordroOnay(null)}
          isEmployeeView={true}
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
  selectedEmp?: Employee | null;
  companyName?: string;
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
  selectedEmp,
  companyName,
  fileInputRef,
  onYaziChange,
  onSaveYazi,
  onFileSelect,
  onDelete,
  onDownload,
}) => {
  const innerRef = useRef<HTMLInputElement | null>(null);
  const [secilenSablonId, setSecilenSablonId] = useState<string>('');
  const [sablonAciklama, setSablonAciklama] = useState<string>('');
  const [sablonTarihi, setSablonTarihi] = useState<string>(new Date().toISOString().split('T')[0]);

  const handleApplySablon = (sablonId: string) => {
    setSecilenSablonId(sablonId);
    if (!sablonId) return;
    const sablon = TUTANAK_SABLONLARI.find((s) => s.id === sablonId);
    if (sablon && selectedEmp) {
      const formattedDate = new Date(sablonTarihi).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
      const metin = sablon.generateText(selectedEmp, companyName || 'Kurumsal Şirket', formattedDate, sablonAciklama);
      onYaziChange(metin);
    }
  };

  const handlePrintDraftPdf = () => {
    if (!yeniYazi.trim()) return;
    const sablon = TUTANAK_SABLONLARI.find((s) => s.id === secilenSablonId);
    const docTitle = sablon ? sablon.baslik : `${baslik} Resmi Belgesi`;
    printTutanakPdf(docTitle, yeniYazi, selectedEmp, companyName);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            {baslik}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{aciklama}</p>
        </div>
      </div>

      {/* Hazır Hukuki Şablon Seçim Paneli (Özellikle Tutanak Kategorisi İçin) */}
      {kategori === 'tutanak' && selectedEmp && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white shadow-md space-y-3 border border-blue-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                Hazır Hukuki Şablon & İbraname Jeneratörü
              </span>
            </div>
            <span className="text-[11px] text-blue-200 font-medium">4857 s. K. Uyumlu Otomatik Belge Doldurucu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-blue-200 block mb-1">Şablon Türü Seçin:</label>
              <select
                value={secilenSablonId}
                onChange={(e) => handleApplySablon(e.target.value)}
                className="w-full bg-slate-800 text-white border border-blue-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">-- Şablon Seçiniz (İbraname, Devamsızlık, Talimat Aykırılığı vb.) --</option>
                {TUTANAK_SABLONLARI.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-blue-200 block mb-1">Olay / Fesih Tarihi:</label>
              <input
                type="date"
                value={sablonTarihi}
                onChange={(e) => {
                  setSablonTarihi(e.target.value);
                  if (secilenSablonId) handleApplySablon(secilenSablonId);
                }}
                className="w-full bg-slate-800 text-white border border-blue-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Yeni ekleme / Metin & Dosya Alanı */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <p className="text-xs font-extrabold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            Yeni Kayıt / Düzenleme Alanı
          </p>
          {yeniYazi.trim() && (
            <button
              onClick={handlePrintDraftPdf}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              Fiziksel İmza İçin PDF Yazdır
            </button>
          )}
        </div>

        <textarea
          value={yeniYazi}
          onChange={(e) => onYaziChange(e.target.value)}
          rows={5}
          placeholder={`${baslik} metnini buraya yazın veya yukarıdaki hazır hukuki şablonlardan birini seçin...`}
          className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono leading-relaxed"
        />

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            onClick={onSaveYazi}
            disabled={!yeniYazi.trim() || kaydediliyor || disabled}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {kaydediliyor ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Yazılı Kaydı Özlük Dosyasına Kaydet
          </button>

          <span className="text-gray-400 text-xs font-bold">veya</span>

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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold bg-white border-2 border-gray-300 text-gray-800 rounded-xl hover:bg-gray-50 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {uploadingKategori === kategori ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-blue-600" />
            )}
            Fiziksel İmzalı Evrak / Dosya Yükle
          </button>
        </div>
      </div>

      {/* Mevcut kayıtlar */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider flex items-center justify-between">
          <span>Kayıtlı {baslik} ({dosyalar.length})</span>
          <span className="text-[11px] font-normal text-gray-500">Resmi Özlük Arşivi</span>
        </h4>

        {dosyalar.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center bg-gray-50/50">
            <FileText className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-gray-500">Henüz {baslik.toLowerCase()} kaydı yok</p>
            <p className="text-xs text-gray-400 mt-1">Hazır şablon seçerek veya metin/dosya ekleyerek kayıt oluşturabilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {dosyalar.map((d) => (
              <DosyaSatiri
                key={d.id}
                dosya={d}
                onDelete={onDelete}
                onDownload={onDownload}
                selectedEmp={selectedEmp}
                companyName={companyName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OzlukDosyasi;


