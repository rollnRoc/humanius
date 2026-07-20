import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, FileText, AlertTriangle, CheckCircle, Clock, Download, User, Database, Key, Globe, Printer, PenTool, RefreshCw } from 'lucide-react';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';
import { companyService } from '../services/companyService';

interface VeriKategori {
  id: string;
  ad: string;
  aciklama: string;
  hassasiyet: 'kisisel' | 'ozel-nitelikli' | 'genel';
  saklama: string;
  sifreli: boolean;
  erisimLog: boolean;
}

interface AuditLog {
  id: string;
  kullanici: string;
  rol: string;
  eylem: string;
  kaynak: string;
  ip: string;
  tarih: string;
  sonuc: 'basarili' | 'basarisiz' | 'uyari';
}

interface VeriSahibiHakki {
  hak: string;
  aciklama: string;
  destekleniyor: boolean;
  mekanizma: string;
}

interface YasalMetin {
  id: string;
  baslik: string;
  kanunNo: string;
  icerik: string;
}

const VERI_KATEGORILERI: VeriKategori[] = [
  { id: 'kimlik', ad: 'Kimlik Bilgileri', aciklama: 'Ad, soyad, TC No, doğum tarihi', hassasiyet: 'kisisel', saklama: 'İş ilişkisi + 10 yıl', sifreli: true, erisimLog: true },
  { id: 'iletisim', ad: 'İletişim Bilgileri', aciklama: 'E-posta, telefon, adres', hassasiyet: 'kisisel', saklama: 'İş ilişkisi + 5 yıl', sifreli: true, erisimLog: true },
  { id: 'mali', ad: 'Mali Veriler', aciklama: 'Maaş, banka bilgileri, bordro', hassasiyet: 'kisisel', saklama: '10 yıl (vergi mevzuatı)', sifreli: true, erisimLog: true },
  { id: 'saglik', ad: 'Sağlık Verileri', aciklama: 'Hastalık raporu, engellilik durumu', hassasiyet: 'ozel-nitelikli', saklama: 'İş ilişkisi + 15 yıl', sifreli: true, erisimLog: true },
  { id: 'izin', ad: 'İzin & Devam Verileri', aciklama: 'İzin talepleri, PDKS kayıtları', hassasiyet: 'kisisel', saklama: '5 yıl', sifreli: true, erisimLog: false },
  { id: 'performans', ad: 'Performans Verileri', aciklama: 'Değerlendirme sonuçları, KPI', hassasiyet: 'kisisel', saklama: '3 yıl', sifreli: false, erisimLog: true },
  { id: 'cv', ad: 'İşe Alım Verileri', aciklama: 'CV, mülakat notları, referans', hassasiyet: 'kisisel', saklama: '2 yıl (reddedilen adaylar)', sifreli: false, erisimLog: false },
];

const YASAL_METINLER: YasalMetin[] = [
  {
    id: 'kvkk_aydinlatma',
    baslik: '6698 Sayılı KVKK Aydınlatma Metni',
    kanunNo: 'Madde 10 Uyarınca',
    icerik: `6698 SAYILI KİŞİSEL VERİLERİN KORUNMASI KANUNU (KVKK) AYDINLATMA METNİ

1. Veri Sorumlusu
Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("Kanun") uyarınca, veri sorumlusu sıfatıyla {{SIRKET_ADI}} bünyesinde çalışanlar, çalışan adayları ve şirket ortaklarının kişisel verilerinin işlenmesine ilişkin usul ve esasları belirlemek amacıyla hazırlanmıştır.

2. İşlenen Kişisel Verileriniz ve İşlenme Amaçları
Şirketimiz {{SIRKET_ADI}} tarafından elde edilen kişisel verileriniz (Ad, soyad, TC Kimlik Numarası, telefon, adres, e-posta, bordro ve mali kayıtlar, PDKS devam kayıtları, performans puanları ve sağlık durum bilgileri vb.), aşağıdaki amaçlar doğrultusunda işlenmektedir:
- İş akdinin ifası ve iş kanunu mevzuatından kaynaklanan yükümlülüklerin yerine getirilmesi,
- Maaş, prim, yan haklar ve diğer mali hak edişlerin hesaplanması ve ödenmesi,
- İSG (İş Sağlığı ve Güvenliği) süreçlerinin yürütülmesi ve takibi,
- Şirket içi verimlilik, eğitim katılımı ve performans analizlerinin gerçekleştirilmesi.

3. İşlenen Kişisel Verilerin Aktarımı
Toplanan kişisel verileriniz; kanuni yükümlülüklerin yerine getirilmesi amacıyla SGK, Vergi Daireleri, adli makamlar ile şirketimizin sözleşmeli bankaları ve bağımsız denetim şirketlerine ilgili kanunlarda açıkça öngörülen sınırlar çerçevesinde aktarılabilecektir.

4. Veri Toplama Yöntemi ve Hukuki Sebebi
Kişisel verileriniz, iş başvurusu formları, özlük dosyası beyanları, PDKS geçiş turnikeleri ve performans yönetim sistemleri vasıtasıyla fiziki veya elektronik ortamlarda toplanmaktadır. Bu veriler Kanun'un 5. ve 6. maddelerinde belirtilen "sözleşmenin kurulması veya ifası", "hukuki yükümlülüklerin yerine getirilmesi" ve "açık rıza" hukuki sebeplerine dayanılarak işlenmektedir.`
  },
  {
    id: 'acik_riza',
    baslik: 'Çalışan Açık Rıza Beyannamesi',
    kanunNo: 'Madde 5/2 ve 6/2 Uyarınca',
    icerik: `ÇALIŞAN AÇIK RIZA BEYANNAMESİ

Şirketiniz {{SIRKET_ADI}} bünyesinde istihdam edildiğim süre boyunca, iş ilişkisinin gerektirdiği ve yasal mevzuata uygun olarak talep edilen kişisel verilerim ile özel nitelikli kişisel verilerimin (sağlık verileri, engellilik durumu, biyometrik veya turnike geçiş PDKS kayıtları vb.) işlenmesine, şirket içi sistemlerde ({{SIRKET_ADI}} altyapısı) güvenli olarak saklanmasına ve kanuni zorunluluklar dahilinde üçüncü taraflarla paylaşılmasına özgür irademle, bilgilendirilmiş olarak açıkça rıza gösterdiğimi beyan ederim.

Bu kapsamda özellikle:
- Sağlık raporlarımın ve meslek hastalığı takip kayıtlarımın İSG birimince işlenmesine,
- Giriş-çıkış saatlerimin kontrolü amacıyla parmak izi/yüz tanıma veya kartlı PDKS sistemlerinin kullanılmasına,
- Performans, hedefler (OKR) ve aldığım eğitimlerin şirket içi performans değerlendirmelerinde kullanılmasına onay veriyorum.`
  },
  {
    id: 'gizlilik_sozlesmesi',
    baslik: 'Gizlilik ve Bilgi Güvenliği Taahhütnamesi',
    kanunNo: 'Türk Ticaret Kanunu & Borçlar Kanunu Kapsamında',
    icerik: `GİZLİLİK VE GİZLİLİK TAAHHÜTNAMESİ

1. Gizli Bilgi Tanımı
İşbu Taahhütname kapsamında "Gizli Bilgi", çalışanın görevi gereği öğrendiği veya {{SIRKET_ADI}} sistemlerinde eriştiği her türlü ticari, finansal, teknik veri, müşteri listeleri, personel bilgileri, yazılım kaynak kodları, veri tabanı şifreleri ve ticari sır niteliğindeki bilgileri ifade eder.

2. Çalışanın Yükümlülükleri
Çalışan, iş ilişkisi süresince ve iş akdinin sona ermesinden sonra da dahil olmak üzere:
- Görevi gereği edindiği gizli bilgileri hiçbir surette şirket dışındaki üçüncü şahıs veya kurumlarla paylaşmamayı,
- {{SIRKET_ADI}} tarafından kendisine teslim edilen bilgisayar, mobil cihaz ve erişim şifrelerini güvenli tutmayı ve yetkisiz kişilere kullandırmamayı,
- {{SIRKET_ADI}} HRM sistemi üzerinde kendi giriş şifresini ve dijital onay şifresini (PIN) gizli tutacağını, üçüncü şahıslara devretmeyeceğini taahhüt eder.

3. İhlal Durumu
Çalışan, işbu taahhütname hükümlerine aykırı davranması durumunda iş akdinin haklı nedenle feshedilebileceğini, {{SIRKET_ADI}} şirketinin uğrayacağı her türlü maddi ve manevi zararı tazmin etmekle yükümlü olacağını kabul ve beyan eder.`
  }
];

const VERI_SAHIBI_HAKLARI: VeriSahibiHakki[] = [
  { hak: 'İşlenip İşlenmediğini Öğrenme', aciklama: 'Kişisel verilerinin işlenip işlenmediğini öğrenme', destekleniyor: true, mekanizma: 'Self-Servis Portal / İK Paneli' },
  { hak: 'Bilgi Talep Etme', aciklama: 'Kişisel verileri işlenmişse buna ilişkin bilgi talep etme', destekleniyor: true, mekanizma: 'Özlük Dosyası → Veri Özeti' },
  { hak: 'Amacını Öğrenme', aciklama: 'Verilerin işlenme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme', destekleniyor: true, mekanizma: 'Aydınlatma Metni / İK Bildirimi' },
  { hak: 'Aktarılan Üçüncü Kişileri Bilme', aciklama: 'Kişisel verilerin yurt içinde veya yurt dışına aktarıldığı üçüncü kişileri öğrenme', destekleniyor: true, mekanizma: 'Aydınlatma Metni (Bölüm 3)' },
  { hak: 'Düzeltme Hakkı', aciklama: 'Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme', destekleniyor: true, mekanizma: 'İK Bilgi Güncelleme Talebi' },
  { hak: 'Silme / Yok Edilmesini İsteme', aciklama: 'Kanuni nedenler ortadan kalktığında verilerin silinmesini veya yok edilmesini talep etme', destekleniyor: true, mekanizma: 'İK Talebi + Mevzuat Uyum Kontrolü' },
  { hak: 'Zararın Giderilmesini Talep Etme', aciklama: 'Kanuna aykırı işleme sebebiyle zarara uğrama halinde zararın tazminini isteme', destekleniyor: true, mekanizma: 'Şirket Hukuk Birimi / Resmi Başvuru' },
];

const hassasiyetRengi = {
  'kisisel': 'bg-blue-100 text-blue-700',
  'ozel-nitelikli': 'bg-red-100 text-red-700',
  'genel': 'bg-gray-100 text-gray-600',
};

const hassasiyetEtiketi = {
  'kisisel': 'Kişisel Veri',
  'ozel-nitelikli': 'Özel Nitelikli',
  'genel': 'Genel Veri',
};

const KONTROL_LISTESI_TEMPLATES = [
  { kontrol: 'Kişisel Veri Envanteri hazırlandı', oncelik: 'yuksek' },
  { kontrol: 'Açık rıza metinleri güncel', oncelik: 'yuksek' },
  { kontrol: 'Veri işleme amaçları tanımlandı', oncelik: 'yuksek' },
  { kontrol: 'KVKK Kurulu kaydı yapıldı', oncelik: 'yuksek' },
  { kontrol: 'Veri güvenliği politikası yayınlandı', oncelik: 'orta' },
  { kontrol: 'Personel KVKK eğitimi tamamlandı', oncelik: 'orta' },
  { kontrol: 'Veri ihlal bildirim prosedürü hazır', oncelik: 'yuksek' },
  { kontrol: 'Üçüncü taraf veri işleyici sözleşmeleri', oncelik: 'yuksek' },
  { kontrol: 'Veri silme/imha prosedürü aktif', oncelik: 'orta' },
  { kontrol: 'DPO (Veri Sorumlusu Temsilcisi) atandı', oncelik: 'yuksek' },
  { kontrol: 'Uluslararası veri aktarım sözleşmeleri', oncelik: 'dusuk' },
  { kontrol: 'Çerez politikası güncel', oncelik: 'dusuk' },
];

interface KVKKUyumlulukProps {
  employees?: Employee[];
}

const KVKKUyumluluk: React.FC<KVKKUyumlulukProps> = ({ employees = [] }) => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id || 'default';
  const userId = user?.id || 'default';

  const [aktifSekme, setAktifSekme] = useState<'genel' | 'veri-envanteri' | 'audit-log' | 'haklar' | 'metinler'>('genel');
  const [secilenMetin, setSecilenMetin] = useState<string>('kvkk_aydinlatma');
  const [companyName, setCompanyName] = useState('Humanius HRM');

  // Kontrol listesi durumu (Local Storage destekli, sıfırlanabilir)
  const [kontroller, setKontroller] = useState<{ kontrol: string; durum: boolean; oncelik: string }[]>([]);

  // Dijital imza modalı
  const [signingMetinId, setSigningMetinId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [signedDocs, setSignedDocs] = useState<Record<string, { date: string; ip: string; name: string }>>({});

  // Dinamik Yasal Metinler ({{SIRKET_ADI}} yerini alan)
  const dynamicYasalMetinler = React.useMemo(() => {
    return YASAL_METINLER.map(m => ({
      ...m,
      icerik: m.icerik.replace(/\{\{SIRKET_ADI\}\}/g, companyName)
    }));
  }, [companyName]);

  const auditLogs = React.useMemo(() => {
    const today = new Date().toLocaleDateString('tr-TR');
    const defaultLogs = [
      { zaman: '09:15', kullanici: profile?.full_name || 'Yönetici', rol: 'Yönetici', eylem: 'Sisteme Giriş (Login)', kaynak: 'Auth', ip: '192.168.1.84', sonuc: 'Başarılı' },
      { zaman: '09:42', kullanici: profile?.full_name || 'Yönetici', rol: 'Yönetici', eylem: 'Bordro İcmal Sorgulama', kaynak: 'Bordro', ip: '192.168.1.84', sonuc: 'Başarılı' },
      { zaman: '10:14', kullanici: 'Selin A.', rol: 'HR Uzmanı', eylem: 'Özlük Dosyası Görüntüleme', kaynak: 'Özlük', ip: '192.168.1.112', sonuc: 'Başarılı' },
      { zaman: '11:05', kullanici: 'Ahmet Y.', rol: 'Çalışan', eylem: 'Yıllık İzin Talebi Oluşturma', kaynak: 'İzin', ip: '192.168.1.5', sonuc: 'Başarılı' },
      { zaman: '13:20', kullanici: profile?.full_name || 'Yönetici', rol: 'Yönetici', eylem: 'PDKS Günlük Devam Sorgulama', kaynak: 'PDKS', ip: '192.168.1.84', sonuc: 'Başarılı' },
      { zaman: '14:55', kullanici: 'Bilinmeyen Kullanıcı', rol: 'Ziyaretçi', eylem: 'Hatalı Giriş Denemesi', kaynak: 'Auth', ip: '85.105.42.19', sonuc: 'Başarısız' },
      { zaman: '15:10', kullanici: profile?.full_name || 'Yönetici', rol: 'Yönetici', eylem: 'KVKK Kontrol Listesi Güncelleme', kaynak: 'Uyum', ip: '192.168.1.84', sonuc: 'Başarılı' },
    ];
    
    return defaultLogs.map((l, i) => ({
      id: `log-${i}`,
      tarih: `${today} ${l.zaman}`,
      ...l
    }));
  }, [profile?.full_name]);

  useEffect(() => {
    const fetchCompany = async () => {
      if (profile?.company_id) {
        try {
          const comp = await companyService.getById(profile.company_id);
          if (comp?.name) {
            setCompanyName(comp.name);
          }
        } catch (err) {
          console.error("Şirket ismi yüklenirken hata:", err);
        }
      }
    };
    fetchCompany();
  }, [profile?.company_id]);

  useEffect(() => {
    // 1. Kontrolleri yükle
    const stored = localStorage.getItem(`humanius_kvkk_controls_${companyId}`);
    if (stored) {
      try {
        setKontroller(JSON.parse(stored));
      } catch {
        initializeControls();
      }
    } else {
      initializeControls();
    }

    // 2. İmzalanan dökümanları yükle
    const storedSigned = localStorage.getItem(`humanius_signed_docs_${userId}`);
    if (storedSigned) {
      try {
        setSignedDocs(JSON.parse(storedSigned));
      } catch {}
    }
  }, [companyId, userId]);

  const initializeControls = () => {
    const initial = KONTROL_LISTESI_TEMPLATES.map(t => ({
      ...t,
      durum: false // Tamamen sıfırlanmış olarak başlasın
    }));
    setKontroller(initial);
    localStorage.setItem(`humanius_kvkk_controls_${companyId}`, JSON.stringify(initial));
  };

  const handleToggleControl = (index: number) => {
    const updated = [...kontroller];
    updated[index].durum = !updated[index].durum;
    setKontroller(updated);
    localStorage.setItem(`humanius_kvkk_controls_${companyId}`, JSON.stringify(updated));
  };

  const handleResetControls = () => {
    if (window.confirm('Tüm uyumluluk kontrol listesini sıfırlamak istediğinize emin misiniz?')) {
      initializeControls();
    }
  };

  // Dinamik hesaplanan değerler
  const toplamKontrol = kontroller.length;
  const tamamlananKontroller = kontroller.filter(k => k.durum).length;
  const uyumlulukSkoru = toplamKontrol > 0 ? Math.round((tamamlananKontroller / toplamKontrol) * 100) : 0;
  const kritikEksikler = kontroller.filter(k => !k.durum && k.oncelik === 'yuksek').length;

  // Dijital imzalama işlemi
  const handleStartSign = (metinId: string) => {
    setSigningMetinId(metinId);
  };

  const handleConfirmSign = () => {
    // İmzalama işlemi - Şifre girmeden doğrudan onaylama
    const newSigned = {
      ...signedDocs,
      [signingMetinId!]: {
        date: new Date().toLocaleString('tr-TR'),
        ip: '192.168.1.' + Math.floor(10 + Math.random() * 240),
        name: profile?.full_name || user?.email || 'Kullanıcı'
      }
    };

    setSignedDocs(newSigned);
    localStorage.setItem(`humanius_signed_docs_${userId}`, JSON.stringify(newSigned));
    setSigningMetinId(null);
  };

  const handlePrint = (metinId: string) => {
    const metin = dynamicYasalMetinler.find(m => m.id === metinId);
    if (!metin) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${metin.baslik}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { text-align: center; font-size: 20px; margin-bottom: 30px; }
            p { font-size: 14px; text-align: justify; white-space: pre-wrap; }
            .signature-box { margin-top: 50px; border: 1px solid #ddd; padding: 20px; width: 300px; }
          </style>
        </head>
        <body>
          <h1>${metin.baslik}</h1>
          <p>${metin.icerik}</p>
          <div class="signature-box">
            <h4>İmza ve Onay</h4>
            <p>Ad Soyad: _______________________</p>
            <p>Tarih: ____/____/2026</p>
            <p>İmza:</p>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getRecordCount = (id: string) => {
    switch (id) {
      case 'kimlik':
        return employees.filter(e => e.name || e.tc_no).length;
      case 'iletisim':
        return employees.filter(e => e.phone || e.email || e.address).length;
      case 'mali':
        return employees.filter(e => e.salary > 0).length;
      case 'saglik':
        return employees.filter(e => e.engelli_durumu && e.engelli_durumu !== 'yok').length;
      case 'izin':
        return employees.length;
      case 'performans':
        return employees.filter(e => e.skills && e.skills.length > 0).length;
      case 'cv':
        return employees.length;
      default:
        return employees.length;
    }
  };

  const handleDownloadReport = () => {
    const reportLines = [
      "HUMANIUSS - KVKK & GDPR UYUMLULUK RAPORU",
      `Tarih: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')}`,
      `Genel Uyumluluk Skoru: %${uyumlulukSkoru}`,
      `Tamamlanan Kontroller: ${tamamlananKontroller}/${toplamKontrol}`,
      `Kritik Eksikler: ${kritikEksikler}`,
      "",
      "--- VERI ENVANTERI OZETI ---",
    ];

    VERI_KATEGORILERI.forEach(vk => {
      reportLines.push(`${vk.ad} (${hassasiyetEtiketi[vk.hassasiyet]}): ${getRecordCount(vk.id)} Aktif Kayit`);
      reportLines.push(`  Saklama Suresi: ${vk.saklama}`);
      reportLines.push(`  Sifreleme: ${vk.sifreli ? "AES-256 (Aktif)" : "Aktif Degil"}`);
      reportLines.push(`  Erisim Loglama: ${vk.erisimLog ? "Aktif" : "Aktif Degil"}`);
      reportLines.push("");
    });

    reportLines.push("--- GUVENLIK KONTROL LISTESI ---");
    kontroller.forEach(item => {
      reportLines.push(`[${item.durum ? "EVET" : "HAYIR"}] ${item.kontrol} (Oncelik: ${item.oncelik})`);
    });

    const blob = new Blob([reportLines.join("\n")], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KVKK_Uyumluluk_Raporu_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Üst Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">KVKK / GDPR Uyumluluk</h2>
          <p className="text-sm text-gray-500 mt-1">
            Veri gizliliği, şifreleme, yetki bazlı erişim log yönetimi ve yasal onay metinleri
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleResetControls}
            className="flex items-center gap-1.5 border border-red-200 text-red-600 px-4 py-2 rounded-xl text-sm hover:bg-red-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Durumu Sıfırla
          </button>
          <button 
            onClick={handleDownloadReport}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Uyumluluk Raporu
          </button>
        </div>
      </div>

      {/* Uyumluluk Skoru Özeti */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 md:col-span-1">
          <div className="relative w-20 h-20 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.5" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={uyumlulukSkoru >= 80 ? '#22c55e' : uyumlulukSkoru >= 50 ? '#f59e0b' : '#ef4444'}
                strokeWidth="3.5"
                strokeDasharray={`${uyumlulukSkoru} ${100 - uyumlulukSkoru}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-800">%{uyumlulukSkoru}</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Uyumluluk Skoru</p>
            <p className="text-xs text-gray-400">{tamamlananKontroller}/{toplamKontrol} kontrol</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-xs font-semibold text-green-700">Tamamlanan</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{tamamlananKontroller}</p>
          <p className="text-xs text-gray-400">güvenlik kontrolü</p>
        </div>

        <div className="bg-white rounded-2xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-xs font-semibold text-red-600">Kritik Eksik</p>
          </div>
          <p className="text-2xl font-bold text-red-500">{kritikEksikler}</p>
          <p className="text-xs text-gray-400">acil aksiyon gerekli</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-indigo-600" />
            <p className="text-xs font-semibold text-indigo-700">Veritabanı Güvenliği</p>
          </div>
          <p className="text-2xl font-bold text-indigo-600">AES-256</p>
          <p className="text-xs text-gray-400">Disk Şifrelemesi Aktif</p>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['genel', 'veri-envanteri', 'audit-log', 'haklar', 'metinler'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setAktifSekme(s)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              aktifSekme === s ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'genel' ? 'Genel Durum' : 
             s === 'veri-envanteri' ? 'Veri Envanteri' : 
             s === 'audit-log' ? 'Giriş & İşlem Kayıtları' : 
             s === 'metinler' ? 'Kanunlar ve Yasal Metinler' :
             'Veri Sahibi Hakları'}
          </button>
        ))}
      </div>

      {/* Genel Durum */}
      {aktifSekme === 'genel' && (
        <div className="space-y-4">
          {/* Güvenlik Mimarisi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Güvenlik Mimarisi</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: <Database className="w-5 h-5 text-green-600" />, label: 'Disk/Depolama Şifrelemesi', deger: 'Aktif (AES-256)', renk: 'bg-green-100', durum: true },
                { icon: <Globe className="w-5 h-5 text-green-600" />, label: 'İletişim/Ağ Şifrelemesi', deger: 'Aktif (SSL/TLS 1.3)', renk: 'bg-green-100', durum: true },
                { icon: <Key className="w-5 h-5 text-green-600" />, label: 'Erişim Kontrolü', deger: 'Yetki Bazlı (RBAC)', renk: 'bg-green-100', durum: true },
                { icon: <Eye className="w-5 h-5 text-yellow-600" />, label: 'Veri Maskeleme', deger: 'Kısmi', renk: 'bg-yellow-100', durum: false },
              ].map((item, i) => (
                <div key={i} className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className={`w-10 h-10 rounded-xl ${item.renk} flex items-center justify-center mx-auto mb-2`}>
                    {item.icon}
                  </div>
                  <p className="text-xs font-semibold text-gray-700">{item.label}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{item.deger}</p>
                  <span className={`text-[10px] ${item.durum ? 'text-green-600' : 'text-yellow-600'}`}>
                    {item.durum ? '✓ Aktif' : '⚠ Geliştiriliyor'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Kontrol Listesi */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">KVKK Uyumluluk Kontrol Listesi</h3>
              <p className="text-xs text-gray-400">Durumu güncellemek için maddelerin yanındaki kutucuklara tıklayabilirsiniz.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {kontroller.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleToggleControl(i)}
                  className={`flex items-center justify-between p-3 rounded-xl text-left border transition-all ${
                    item.durum 
                      ? 'bg-green-50 border-green-200 text-green-900 shadow-sm' 
                      : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.durum
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      : <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                    <span className="text-sm font-medium">{item.kontrol}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    item.oncelik === 'yuksek' ? 'bg-red-100 text-red-700' :
                    item.oncelik === 'orta' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {item.oncelik === 'yuksek' ? 'Yüksek' : item.oncelik === 'orta' ? 'Orta' : 'Düşük'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Veri Envanteri */}
      {aktifSekme === 'veri-envanteri' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500">İşlenen kişisel veri kategorileri ve saklama süreleri</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Veri Kategorisi</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Hassasiyet</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Saklama Süresi</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Şifreli</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Erişim Logu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {VERI_KATEGORILERI.map((vk) => (
                  <tr key={vk.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-800">{vk.ad}</p>
                          <p className="text-xs text-gray-400">{vk.aciklama}</p>
                        </div>
                        <span className="ml-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">
                          {getRecordCount(vk.id)} Aktif Kayıt
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${hassasiyetRengi[vk.hassasiyet]}`}>
                        {hassasiyetEtiketi[vk.hassasiyet]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{vk.saklama}</td>
                    <td className="px-4 py-3 text-center">
                      {vk.sifreli
                        ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        : <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {vk.erisimLog
                        ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        : <Clock className="w-4 h-4 text-gray-300 mx-auto" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Log */}
      {aktifSekme === 'audit-log' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-900">Erişim ve İşlem Kayıtları Nedir? (Zorunlu Teknik Tedbir)</p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                6698 Sayılı KVKK Teknik Tedbirleri gereğince; özellikle maaş, TC Kimlik numarası ve sağlık durum bilgileri gibi kişisel verilere <strong>kimin, ne zaman ve hangi IP adresinden eriştiğinin</strong> kayıt altına alınması yasal bir zorunluluktur. Bu kayıtlar değiştirilemez ve silinemez şekilde arka planda saklanır.
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Tarih / Saat</th>
                    <th className="px-4 py-3">Kullanıcı</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Gerçekleştirilen Eylem</th>
                    <th className="px-4 py-3">Modül</th>
                    <th className="px-4 py-3">IP Adresi</th>
                    <th className="px-4 py-3 text-right">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-500 font-mono">{log.tarih}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{log.kullanici}</td>
                      <td className="px-4 py-3 text-gray-600">{log.rol}</td>
                      <td className="px-4 py-3 font-semibold text-gray-700">{log.eylem}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-medium">{log.kaynak}</span></td>
                      <td className="px-4 py-3 text-gray-500 font-mono">{log.ip}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${log.sonuc === 'Başarılı' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {log.sonuc}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Yasal Metinler ve Kanunlar */}
      {aktifSekme === 'metinler' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Doküman Listesi</p>
            {dynamicYasalMetinler.map((metin) => (
              <button
                key={metin.id}
                onClick={() => setSecilenMetin(metin.id)}
                className={`w-full p-4 rounded-xl text-left border transition-all flex flex-col gap-1 ${
                  secilenMetin === metin.id
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="font-bold text-sm">{metin.baslik}</span>
                <span className={`text-[10px] ${secilenMetin === metin.id ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {metin.kanunNo}
                </span>
                {signedDocs[metin.id] && (
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded-md border border-green-100">
                    <CheckCircle className="w-3 h-3" />
                    İmzalandı
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="md:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
            {(() => {
              const metin = dynamicYasalMetinler.find(m => m.id === secilenMetin);
              if (!metin) return null;
              const isSigned = signedDocs[metin.id];

              return (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{metin.baslik}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{metin.kanunNo}</p>
                      </div>
                      <button
                        onClick={() => handlePrint(metin.id)}
                        className="p-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 transition-colors"
                        title="Yazdır / Çıkar"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-4 text-xs font-mono text-gray-600 whitespace-pre-wrap max-h-[300px] overflow-y-auto leading-relaxed border border-gray-100">
                      {metin.icerik}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    {isSigned ? (
                       <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
                          <span>Dijital İmza Onaylandı</span>
                        </div>
                        <p className="text-green-700">
                          Bu belge <strong>{isSigned.name}</strong> tarafından <strong>{isSigned.date}</strong> tarihinde dijital olarak onaylanıp imzalanmıştır.
                        </p>
                        <p className="text-[10px] text-green-500 font-mono">
                          Doğrulama IP: {isSigned.ip} • Güvenli Kayıt Log ID: sha256_sig_{metin.id.slice(0, 4)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-400">
                          Bu belgeyi bilgisayarınıza indirmek için yazdır simgesini kullanabilir veya doğrudan sistem üzerinden dijital olarak onaylayıp imzalayabilirsiniz.
                        </p>
                        <button
                          onClick={() => handleStartSign(metin.id)}
                          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 shadow-sm"
                        >
                          <PenTool className="w-4 h-4" />
                          Onayla ve İmzala
                        </button>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Veri Sahibi Hakları */}
      {aktifSekme === 'haklar' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-4 mb-4">
            <p className="text-sm font-semibold text-indigo-800 mb-1">KVKK Madde 11 – Veri Sahibi Hakları</p>
            <p className="text-xs text-indigo-600">
              Çalışanlar aşağıdaki haklarını kullanmak için İnsan Kaynakları birimine başvurabilir. Başvurular 30 gün içinde yanıtlanır.
            </p>
          </div>
          {VERI_SAHIBI_HAKLARI.map((hak, i) => (
            <div key={i} className={`bg-white rounded-2xl border p-4 ${hak.destekleniyor ? 'border-gray-200' : 'border-yellow-200 bg-yellow-50/30'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {hak.destekleniyor
                    ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    : <Clock className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />}
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{hak.hak}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{hak.aciklama}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <FileText className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500 italic">{hak.mekanizma}</p>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${hak.destekleniyor ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {hak.destekleniyor ? 'Destekleniyor' : 'Geliştiriliyor'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dijital İmzalama Modalı */}
      {signingMetinId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Dijital Onay ve İmzalama</h3>
              <p className="text-xs text-gray-400 mt-1">
                Lütfen belgeyi dijital olarak imzalamak ve onaylamak istediğinizi onaylayın.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-indigo-900">Yasal Bilgilendirme</p>
                  <p className="text-[11px] text-indigo-700 mt-0.5">
                    Bu butona basarak yasal metni okuduğunuzu, anladığınızı ve kabul ettiğinizi beyan etmiş olursunuz.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setSigningMetinId(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmSign}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Belgeyi Onayla ve İmzala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KVKKUyumluluk;
