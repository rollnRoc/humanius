export interface JobTemplate {
  id: string;
  category: string;
  title: string;
  department: string;
  reportsTo: string;
  summary: string;
  tasks: { surec: string; yetkinlik: string; davranis: string; raci: string; kpi: string }[];
  kpis: { label: string; value: string }[];
  yonetselYetkinlikler: { baslik: string; aciklama: string }[];
  teknikBeceriler: { baslik: string; aciklama: string }[];
}

export const JOB_TEMPLATES: JobTemplate[] = [
  // ─── 1. İNSAN KAYNAKLARI & İDARİ İŞLER ──────────────────────────────────────
  {
    id: 'hr-specialist',
    category: 'İnsan Kaynakları',
    title: 'İnsan Kaynakları Uzmanı',
    department: 'İnsan Kaynakları',
    reportsTo: 'İnsan Kaynakları Müdürü',
    summary: 'Şirketin işe alım, özlük işleri, izin takibi, performans değerlendirme ve eğitim süreçlerinin mevzuata ve şirket prosedürlerine uygun şekilde yürütülmesini sağlar.',
    tasks: [
      { surec: 'Özlük İşleri Takibi', yetkinlik: 'İş Kanunu & SGK Mevzuatı', davranis: 'Titiz ve Gizliliğe Uygun', raci: 'Sorumlu', kpi: 'Özlük dosyalarının eksiksiz tutulması' },
      { surec: 'İşe Alım ve Mülakat', yetkinlik: 'Mülakat Teknikleri', davranis: 'Tarafsız ve İletişim Odaklı', raci: 'Sorumlu', kpi: 'Pozisyon kapatma süresi (Max 30 gün)' },
      { surec: 'İzin & Devam Takibi', yetkinlik: 'PDKS & İzin Yönetimi', davranis: 'Düzenli Takip', raci: 'Sorumlu', kpi: 'İzin kayıtlarının %100 güncelliği' },
      { surec: 'Eğitim & Onboarding', yetkinlik: 'Oryantasyon Yönetimi', davranis: 'Destekleyici ve Açık', raci: 'Destekleyen', kpi: 'Yeni çalışan memnuniyet puanı' }
    ],
    kpis: [
      { label: 'Özlük Dosyası Tamlık Oranı', value: '%100' },
      { label: 'Ortalama İşe Alım Tamamlama Süresi', value: '< 30 Gün' },
      { label: 'Çalışan Memnuniyet Puanı', value: '> %85' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Etkili İletişim', aciklama: 'Çalışanlar ve yönetim arasında köprü kurma yeteneği.' },
      { baslik: 'Gizlilik ve Etik', aciklama: 'Kişisel verilerin korunması ve şirket gizliliğine tam uyum.' }
    ],
    teknikBeceriler: [
      { baslik: '4857 Sayılı İş Kanunu', aciklama: 'İş hukuku ve SGK mevzuat bilgisi.' },
      { baslik: 'İYS ve İK Yazılımları', aciklama: 'HRMS ve PDKS sistemlerini aktif kullanma.' }
    ]
  },
  {
    id: 'hr-manager',
    category: 'İnsan Kaynakları',
    title: 'İnsan Kaynakları Müdürü',
    department: 'İnsan Kaynakları',
    reportsTo: 'Genel Müdür / Şirket Yöneticisi',
    summary: 'Şirketin insan kaynakları stratejilerini, organizasyonel gelişim hedeflerini, performans ve ücret politikalarını belirler ve yönetir.',
    tasks: [
      { surec: 'İK Stratejileri Yönetimi', yetkinlik: 'Stratejik İK Yönetimi', davranis: 'Lider ve Vizyoner', raci: 'Hesap Veren', kpi: 'Şirket İK hedeflerine ulaşma oranı' },
      { surec: 'Organizasyonel Gelişim', yetkinlik: 'Yetenek Yönetimi & Norm Kadro', davranis: 'Gelişim Odaklı', raci: 'Hesap Veren', kpi: 'Çalışan bağlılığı oranı' },
      { surec: 'Performans & Ücret Yönetimi', yetkinlik: 'Bordro & Performans Mimarisi', davranis: 'Adil ve Oportünist', raci: 'Hesap Veren', kpi: 'Performans değerlendirme dönemlerinin tamamlama oranı' }
    ],
    kpis: [
      { label: 'Personel Turn-Over (Ayrılma) Oranı', value: '< %10' },
      { label: 'İK Bütçesine Uyum', value: '%98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Liderlik ve Koçluk', aciklama: 'Ekibe yön verme ve çalışan potansiyelini çıkarma.' },
      { baslik: 'Kriz ve Çatışma Yönetimi', aciklama: 'Kurum içi uzlaşı sağlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'Stratejik İK & Bütçeleme', aciklama: 'İnsan gücü planlaması ve İK bütçeleme.' },
      { baslik: 'Bordro ve İş Hukuku', aciklama: 'İş mahkemesi ve arabuluculuk süreçleri bilgisi.' }
    ]
  },
  {
    id: 'admin-affairs',
    category: 'İdari İşler',
    title: 'İdari İşler Uzmanı',
    department: 'İdari İşler',
    reportsTo: 'İdari İşler Müdürü',
    summary: 'Şirket binalarının bakımı, temizlik, güvenlik, yemek, servis, araç filosu ve genel idari operasyonların sorunsuz yürütülmesini sağlar.',
    tasks: [
      { surec: 'Araç Filo & Yemek/Servis Yönetimi', yetkinlik: 'Tedarikçi ve Operasyon Yönetimi', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Servis ve yemek hizmeti memnuniyet puanı' },
      { surec: 'Bina Bakım & Onarım', yetkinlik: 'Tesis Yönetimi', davranis: 'Önleyici ve Titiz', raci: 'Sorumlu', kpi: 'Arıza giderme süresi (< 24 saat)' }
    ],
    kpis: [
      { label: 'İdari İşler Hizmet Memnuniyeti', value: '> %90' },
      { label: 'Tesis Arıza Çözüm Süresi', value: '< 24 Saat' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Problem Çözme', aciklama: 'Saha arızalarına anında müdahale etme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Tesis Yönetimi', aciklama: 'Bina otomasyonu ve bina bakım süreçleri.' }
    ]
  },

  // ─── 2. MUHASEBE & FİNANS ───────────────────────────────────────────────────
  {
    id: 'accounting-assistant',
    category: 'Muhasebe & Finans',
    title: 'Ön Muhasebe Elemanı',
    department: 'Muhasebe',
    reportsTo: 'Mali İşler / Muhasebe Müdürü',
    summary: 'Alış ve satış faturalarının kesilmesi, cari hesap takibi, mutabakatlar, kasa/banka hareketlerinin sisteme işlenmesini gerçekleştirir.',
    tasks: [
      { surec: 'Fatura ve İrsaliye İşlemleri', yetkinlik: 'e-Fatura / e-Arşiv Portal Kullanımı', davranis: 'Hatasız ve Dikkatli', raci: 'Sorumlu', kpi: 'Fatura giriş hata oranı (%0)' },
      { surec: 'Cari Hesap Mutabakatı', yetkinlik: 'Cari Takip ve Hesap Özetleri', davranis: 'İletişim Odaklı', raci: 'Sorumlu', kpi: 'Aylık mutabakat tamamlama süresi' },
      { surec: 'Kasa ve Banka Takibi', yetkinlik: 'Banka Hareket İşleme', davranis: 'Güvenilir', raci: 'Sorumlu', kpi: 'Günlük kasa denkleştirmesi' }
    ],
    kpis: [
      { label: 'Fatura İşleme Doğruluğu', value: '%100' },
      { label: 'Müşteri/Tedarikçi Mutabakat Tamamlama', value: '%95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Detay Odaklılık', aciklama: 'Rakamlar ve belgeler üzerinde hassasiyet.' }
    ],
    teknikBeceriler: [
      { baslik: 'Logo / ERP Muhasebe Yazılımları', aciklama: 'Fatura ve irsaliye modülleri.' },
      { baslik: 'MS Excel', aciklama: 'Tablolama ve hesaplama.' }
    ]
  },
  {
    id: 'accounting-specialist',
    category: 'Muhasebe & Finans',
    title: 'Genel Muhasebe Uzmanı',
    department: 'Muhasebe',
    reportsTo: 'Mali İşler Müdürü',
    summary: 'Şirketin yasal defter kayıtları, KDV/Muhtasar/Geçici vergi beyannameleri, mizan kontrolü ve dönem sonu kapanış işlemlerini yürütür.',
    tasks: [
      { surec: 'Beyanname Hazırlığı', yetkinlik: 'Vergi Mevzuatı (KDV, Muhtasar, Geçici)', davranis: 'Mevzuata Uyumlu', raci: 'Sorumlu', kpi: 'Zamanında vergi beyan ve ödeme takibi' },
      { surec: 'Mizan ve Dönem Sonu Kapanış', yetkinlik: 'Genel Muhasebe & Dönem Sonu', davranis: 'Analitik', raci: 'Sorumlu', kpi: 'Aylık mizan denkleştirme' }
    ],
    kpis: [
      { label: 'Beyanname Zamanında Verme Oranı', value: '%100' },
      { label: 'Mizan Hata Oranı', value: '%0' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Analitik Düşünme', aciklama: 'Mali tabloları doğru okuma ve yorumlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'Vergi Usul Kanunu (VUK)', aciklama: 'Güncel vergi mevzuatı bilgisi.' },
      { baslik: 'Tek Düzen Hesap Planı', aciklama: 'Hesap planı hakimiyeti.' }
    ]
  },

  // ─── 3. ÜRETİM, SANAYİ & SAHA ──────────────────────────────────────────────
  {
    id: 'painter-specialist',
    category: 'Üretim & İmalat',
    title: 'Otomotiv / İmalat Boya Ustası',
    department: 'Üretim & İmalat',
    reportsTo: 'Üretim / Atölye Şefi',
    summary: 'Üretim veya onarım aşamasındaki parçaların/araçların yüzey zımpara, astar, renk karışımı ve tabanca boyama işlemlerini kalite standartlarına ve İSG kurallarına uygun olarak yapar.',
    tasks: [
      { surec: 'Yüzey Hazırlığı ve Zımpara', yetkinlik: 'Yüzey Temizleme & Macun/Astar', davranis: 'Titiz ve Detaycı', raci: 'Sorumlu', kpi: 'Yüzey pürüzlülük hatası yapmama' },
      { surec: 'Renk Karışımı & Viskozite', yetkinlik: 'Boya Karışım Standartları', davranis: 'Hassas Ölçüm', raci: 'Sorumlu', kpi: 'Renk tonu tutarlılığı (%100)' },
      { surec: 'Tabanca Boyama ve Fırınlama', yetkinlik: 'Boya Tabancası & Kabin Kullanımı', davranis: 'İSG Kurallarına Uyumlu', raci: 'Sorumlu', kpi: 'Boya akması/portakallanma hatasızlık oranı (> %98)' },
      { surec: 'Ekipman Temizliği', yetkinlik: 'Kabin & Tabanca Bakımı', davranis: 'Düzenli ve Temiz', raci: 'Sorumlu', kpi: 'Ekipman arızasızlık süresi' }
    ],
    kpis: [
      { label: 'Boya Kalite Onay Oranı', value: '> %98' },
      { label: 'Yeniden Boyama (Re-work) Oranı', value: '< %2' },
      { label: 'İSG ve Maske Kullanım Uyum Puanı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Kalite ve Ustalık Bilinci', aciklama: 'İşçilikte en yüksek görsel ve teknik kaliteyi hedefleme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Boya Kabini ve Tabanca Kullanımı', aciklama: 'HVLP tabancalar ve kabin havalandırma kontrolü.' },
      { baslik: 'Boya Kimyası ve Viskozite', aciklama: 'Tiner, sertleştirici ve renk skalası bilgisi.' }
    ]
  },
  {
    id: 'production-operator',
    category: 'Üretim & İmalat',
    title: 'Üretim / Montaj Elemanı',
    department: 'Üretim & İmalat',
    reportsTo: 'Üretim Vardiya Amiri',
    summary: 'Üretim hattındaki montaj, birleştirme, paketleme ve ürün işleme adımlarını iş emri standartlarına uygun olarak gerçekleştirir.',
    tasks: [
      { surec: 'Hattın Çalıştırılması & Montaj', yetkinlik: 'El Aletleri ve Montaj', davranis: 'Hızlı ve İSG Uyumlu', raci: 'Sorumlu', kpi: 'Vardiya bazlı üretim adedini yakalama' },
      { surec: 'İlk Parça Kalite Kontrolü', yetkinlik: 'Görsel Kalite Kontrol', davranis: 'Dikkatli', raci: 'Sorumlu', kpi: 'Hatalı parça üretmeme' }
    ],
    kpis: [
      { label: 'Üretim Hedefini Yakalama Oranı', value: '%100' },
      { label: 'Fire / Iskarta Oranı', value: '< %1' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Ekip Çalışması', aciklama: 'Hat üzerindeki çalışma arkadaşlarıyla uyum.' }
    ],
    teknikBeceriler: [
      { baslik: 'Pnömatik & El Aletleri', aciklama: 'Somun sıkma, perçin, matkap vb. aletlerin kullanımı.' }
    ]
  },
  {
    id: 'quality-control-specialist',
    category: 'Üretim & İmalat',
    title: 'Kalite Kontrol Uzmanı',
    department: 'Kalite Güvence',
    reportsTo: 'Kalite Güvence Müdürü',
    summary: 'Gelen hammadde, üretim içi yarı mamul ve bitmiş ürünlerin teknik resim ve kalite kriterlerine uygunluğunu kumpas, mikrometre vb. ölçüm aletleriyle denetler.',
    tasks: [
      { surec: 'Giriş & Üretim Kalite Kontrolü', yetkinlik: 'Teknik Resim & Ölçüm Aletleri', davranis: 'Tarafsız ve Şeffaf', raci: 'Sorumlu', kpi: 'Hatalı hammaddenin üretime girmesini engelleme' },
      { surec: 'Uygunsuzluk Raporlama (DF/HATA)', yetkinlik: 'Düzeltici Önleyici Faaliyet (DÖF)', davranis: 'Analitik ve Sorgulayıcı', raci: 'Sorumlu', kpi: 'DÖF kapatma süresi' }
    ],
    kpis: [
      { label: 'Müşteri İadesi / Şikayeti Oranı', value: '< %0.5' },
      { label: 'Ölçüm Hassasiyeti Doğruluğu', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Süreç Disiplini', aciklama: 'Tavizsiz kalite anlayışı.' }
    ],
    teknikBeceriler: [
      { baslik: 'Teknik Resim Okuma', aciklama: 'Geometrik toleranslar ve teknik çizim hakimiyeti.' },
      { baslik: 'Kumpas / Mikrometre / CMM', aciklama: 'Hassas Ölçüm aletleri.' }
    ]
  },
  {
    id: 'maintenance-technician',
    category: 'Üretim & İmalat',
    title: 'Bakım Onarım Teknisyeni',
    department: 'Bakım Onarım',
    reportsTo: 'Bakım Müdürü',
    summary: 'Üretim makinelerinin ve tesis ekipmanlarının periyodik koruyucu bakımlarını yapar, oluşan arızalara hızlıca müdahale ederek üretimin durmasını engeller.',
    tasks: [
      { surec: 'Periyodik Bakım', yetkinlik: 'Mekanik & Elektrik Bakım', davranis: 'Önleyici', raci: 'Sorumlu', kpi: 'Planlı bakım takvimine %100 uyum' },
      { surec: 'Arıza Müdahale & Onarım', yetkinlik: 'Arıza Teşhis (Troubleshooting)', davranis: 'Hızlı ve Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Makine duruş süresi (Downtime) < %2' }
    ],
    kpis: [
      { label: 'Makine Kullanılabilirlik (OEE) Puanı', value: '> %88' },
      { label: 'Plansız Arıza Duruş Süresi', value: '< 2 Saat / Ay' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stres Yönetimi', aciklama: 'Arıza anında soğukkanlı ve hızlı müdahale.' }
    ],
    teknikBeceriler: [
      { baslik: 'Mekanik & Hidrolik / Pnömatik', aciklama: 'Makine aksamı arıza ve bakım bilgisi.' },
      { baslik: 'Elektrik Pano & PLC Temel', aciklama: 'Elektrik şeması okuma.' }
    ]
  },

  // ─── 4. DEPO & LOJİSTİK ─────────────────────────────────────────────────────
  {
    id: 'warehouse-specialist',
    category: 'Depo & Lojistik',
    title: 'Depo ve Sevkiyat Sorumlusu',
    department: 'Lojistik & Depo',
    reportsTo: 'Depo / Lojistik Müdürü',
    summary: 'Mal kabul, raflama, stok takibi, sipariş toplama ve sevkiyat araçlarına yükleme süreçlerini eksiksiz yürütür.',
    tasks: [
      { surec: 'Mal Kabul ve Raflama', yetkinlik: 'Stok Sayım & El Terminali', davranis: 'Düzenli', raci: 'Sorumlu', kpi: 'Gelen ürünlerin 2 saat içinde raflanması' },
      { surec: 'Sipariş Toplama ve Sevkiyat', yetkinlik: 'İrsaliye ve Ambalajlama', davranis: 'Hatasız', raci: 'Sorumlu', kpi: 'Yanlış ürün sevkiyatı hatası (%0)' },
      { surec: 'Stok Sayımı ve Sayım Doğrulama', yetkinlik: 'Envanter Yönetimi', davranis: 'Dürüst ve Şeffaf', raci: 'Sorumlu', kpi: 'Stok doğruluk oranı (> %99)' }
    ],
    kpis: [
      { label: 'Stok Doğruluk Oranı', value: '> %99' },
      { label: 'Sevkiyat Zamanında Teslimat Oranı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Düzen ve Tertip (5S)', aciklama: 'Depo alanının temiz ve tertertip tutulması.' }
    ],
    teknikBeceriler: [
      { baslik: 'El Terminali / WMS Yazılımları', aciklama: 'Barkod okuyucu ve depo modülü kullanımı.' }
    ]
  },

  // ─── 5. SATIŞ & PAZARLAMA ───────────────────────────────────────────────────
  {
    id: 'sales-representative',
    category: 'Satış & Pazarlama',
    title: 'Satış Temsilcisi / Danışmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Yeni müşteri kazanımı sağlama, mevcut müşterilerle ilişkileri yürütme, teklif hazırlama ve satış kotasını gerçekleştirme süreçlerini yürütür.',
    tasks: [
      { surec: 'Müşteri Ziyareti & Saha Satış', yetkinlik: 'İkna & Müzakere', davranis: 'Sonuç Odaklı ve Güleryüzlü', raci: 'Sorumlu', kpi: 'Haftalık müşteri ziyaret sayısı' },
      { surec: 'Teklif Hazırlama ve Takip', yetkinlik: 'Fiyatlandırma & CRM', davranis: 'Hızlı ve Takipçi', raci: 'Sorumlu', kpi: 'Teklifin satışa dönme oranı' }
    ],
    kpis: [
      { label: 'Aylık Satış Kotasını Gerçekleştirme', value: '%100' },
      { label: 'Yeni Müşteri Kazanım Adedi', value: '> 5 / Ay' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Müşteri Odaklılık', aciklama: 'İhtiyacı doğru anlayıp çözme.' }
    ],
    teknikBeceriler: [
      { baslik: 'CRM Yazılımları', aciklama: 'Müşteri kartı ve teklif yönetimi.' }
    ]
  },

  // ─── 6. YAZILIM & IT ────────────────────────────────────────────────────────
  {
    id: 'software-developer',
    category: 'Yazılım & IT',
    title: 'Yazılım Geliştirici / Mühendisi',
    department: 'Bilgi Teknolojileri',
    reportsTo: 'Yazılım / IT Müdürü',
    summary: 'Şirketin web, mobil ve iç yazılım uygulamalarının analiz, tasarım, kodlama, test ve bakım süreçlerini gerçekleştirir.',
    tasks: [
      { surec: 'Kod Geliştirme & Mimari', yetkinlik: 'Clean Code & Algoritma', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Zamanında sprint/kod teslimatı' },
      { surec: 'API Entegrasyonu & DB', yetkinlik: 'REST API & SQL/NoSQL', davranis: 'Güvenli Kodlama', raci: 'Sorumlu', kpi: 'Düşük kod hata (Bug) oranı' }
    ],
    kpis: [
      { label: 'Sprint Hedefi Tamamlama Oranı', value: '> %90' },
      { label: 'Prod Hata (Bug) Oranı', value: '< %2' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Sürekli Öğrenme', aciklama: 'Yeni teknolojileri takip etme.' }
    ],
    teknikBeceriler: [
      { baslik: 'React / Node.js / Python / C#', aciklama: 'Modern yazılım dilleri ve kütüphaneleri.' },
      { baslik: 'Git & CI/CD', aciklama: 'Versiyon kontrol sistemleri.' }
    ]
  }
];
