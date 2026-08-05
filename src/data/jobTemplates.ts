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
    category: 'İnsan Kaynakları & İdari İşler',
    title: 'İnsan Kaynakları Uzmanı',
    department: 'İnsan Kaynakları',
    reportsTo: 'İnsan Kaynakları Müdürü',
    summary: 'Şirketin insan kaynakları politikasını ve kurumsal kültürünü destekleyecek şekilde işe alım, aday tarama, mülakat organizasyonları, çalışan özlük dosyalarının İş Kanunu ve SGK mevzuatına uygun tutulması, izin ve devam takibi ile oryantasyon süreçlerini yürütmektir. Çalışan memnuniyetini artırıcı etkinlik ve eğitim organizasyonlarında aktif rol oynayarak iç iletişimi güçlü tutmaktan sorumludur.',
    tasks: [
      { surec: 'Özlük İşleri & SGK Bildirimleri', yetkinlik: '4857 Sayılı İş Kanunu & SGK', davranis: 'Titiz ve Gizliliğe Uyumlu', raci: 'Sorumlu', kpi: 'Özlük dosyalarının eksiksiz tutulması (%100)' },
      { surec: 'İşe Alım ve Mülakat Organizasyonu', yetkinlik: 'Yetkinlik Bazlı Mülakat', davranis: 'Tarafsız ve İletişim Odaklı', raci: 'Sorumlu', kpi: 'Pozisyon kapatma süresi (Max 30 gün)' },
      { surec: 'PDKS & İzin Yönetimi', yetkinlik: 'PDKS ve İzin Takip Yazılımları', davranis: 'Düzenli ve Hızlı', raci: 'Sorumlu', kpi: 'İzin kayıtlarının %100 güncelliği' },
      { surec: 'Oryantasyon & Eğitime Katılım', yetkinlik: 'Onboarding Programları', davranis: 'Destekleyici', raci: 'Destekleyen', kpi: 'Yeni çalışan oryantasyon memnuniyet puanı' }
    ],
    kpis: [
      { label: 'Özlük Dosyası Tamlık Oranı', value: '%100' },
      { label: 'Ortalama İşe Alım Tamamlama Süresi', value: '< 30 Gün' },
      { label: 'Çalışan Memnuniyet Puanı', value: '> %85' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Etkili İletişim ve Empati', aciklama: 'Çalışanlar ve yönetim arasında şeffaf ve güven veren iletişim kurma.' },
      { baslik: 'Gizlilik ve Etik Standartlar', aciklama: 'KVKK ve şirket içi gizli bilgilerin tam korunması.' }
    ],
    teknikBeceriler: [
      { baslik: 'İş Hukuku ve SGK Mevzuatı', aciklama: '4857 sayılı İş Kanunu ve İş Sağlığı Güvenliği mevzuat bilgisi.' },
      { baslik: 'HRMS & PDKS Sistemleri', aciklama: 'İK ve personel devam kontrol yazılımlarını aktif kullanma.' }
    ]
  },
  {
    id: 'hr-manager',
    category: 'İnsan Kaynakları & İdari İşler',
    title: 'İnsan Kaynakları Müdürü',
    department: 'İnsan Kaynakları',
    reportsTo: 'Genel Müdür',
    summary: 'Şirketin uzun vadeli stratejik hedeflerine paralel insan kaynakları vizyonunu ve bütçesini oluşturmaktır. Organizasyonel gelişim, yetenek yönetimi, performans değerlendirme mimarisi, ücret ve yan haklar politikası ile iş hukuku ve sendikal/yasal süreçleri genel yönetim adına koordine ve sevk etmektir.',
    tasks: [
      { surec: 'İK Stratejileri ve Bütçeleme', yetkinlik: 'Stratejik İK Yönetimi', davranis: 'Lider ve Vizyoner', raci: 'Hesap Veren', kpi: 'Şirket İK hedeflerine ve bütçesine uyum' },
      { surec: 'Organizasyonel Gelişim & Norm Kadro', yetkinlik: 'Yetenek Yönetimi & Yedekleme', davranis: 'Gelişim Odaklı', raci: 'Hesap Veren', kpi: 'Personel turnover (ayrılma) oranı (< %10)' },
      { surec: 'Performans & Ücret Yönetimi', yetkinlik: 'Performans Sistem Mimarisi', davranis: 'Adil', raci: 'Hesap Veren', kpi: 'Performans değerlendirme tamamlama oranı (%100)' }
    ],
    kpis: [
      { label: 'Personel Turn-Over (Ayrılma) Oranı', value: '< %10' },
      { label: 'İK Bütçesine Uyum', value: '%98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Liderlik ve Koçluk', aciklama: 'Ekip üyelerini geliştirme ve kurum içi liderlik etme.' },
      { baslik: 'Kriz ve Çatışma Yönetimi', aciklama: 'İç huzur ve çalışma barışını koruma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Stratejik İK Planlaması', aciklama: 'İnsan gücü planlama, KPI belirleme ve ücret riski analizi.' },
      { baslik: 'İş Hukuku ve Arabuluculuk', aciklama: 'Mahkeme ve arabuluculuk süreçleri hakimiyeti.' }
    ]
  },
  {
    id: 'recruitment-specialist',
    category: 'İnsan Kaynakları & İdari İşler',
    title: 'İşe Alım Uzmanı (Talent Acquisition)',
    department: 'İnsan Kaynakları',
    reportsTo: 'İnsan Kaynakları Müdürü',
    summary: 'Şirketin açık pozisyonları için doğru aday kaynağını bulmak, ilan yayınlamak, yetkinlik bazlı ön görüşmeler ve mülakatlar gerçekleştirmek, kişilik envanteri ve referans kontrollerini tamamlayarak şirkete en nitelikli yetenekleri kazandırmaktır.',
    tasks: [
      { surec: 'Aday Arama & İlan Yönetimi', yetkinlik: 'LinkedIn Recruiter & Kariyer Portalları', davranis: 'Proaktif', raci: 'Sorumlu', kpi: 'Aday havuzu çeşitliliği' },
      { surec: 'Yetkinlik Bazlı Mülakat', yetkinlik: 'Mülakat Teknikleri', davranis: 'Tarafsız ve Analitik', raci: 'Sorumlu', kpi: 'İşe alım başarı ve uyum oranı' }
    ],
    kpis: [
      { label: 'Pozisyon Kapatma Süresi', value: '< 25 Gün' },
      { label: 'Yeni İşe Alınan 6 Aylık Tutundurma Oranı', value: '> %90' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Aday Deneyimi Yönetimi', aciklama: 'Şirket işveren markasını üst düzeyde temsil etme.' }
    ],
    teknikBeceriler: [
      { baslik: 'ATS (Aday Takip Sistemleri)', aciklama: 'Kariyer.net, LinkedIn, Yetenek kapısı araçları.' }
    ]
  },
  {
    id: 'admin-affairs-specialist',
    category: 'İnsan Kaynakları & İdari İşler',
    title: 'İdari İşler Uzmanı',
    department: 'İdari İşler',
    reportsTo: 'İdari İşler Müdürü',
    summary: 'Şirket binalarının bakımı, temizlik, güvenlik, personel servisleri, yemekhane hizmetleri, şirket araç filosu ve genel sarf malzeme tedarik operasyonlarının kesintisiz, hijyenik ve ekonomik şekilde yürütülmesini sağlamaktır.',
    tasks: [
      { surec: 'Filo, Servis ve Yemek Hizmetleri', yetkinlik: 'Tedarikçi Yönetimi & Saha Denetimi', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'İdari hizmet memnuniyet puanı (> %90)' },
      { surec: 'Bina Bakım ve Güvenlik', yetkinlik: 'Tesis Yönetimi', davranis: 'Önleyici', raci: 'Sorumlu', kpi: 'Arıza giderme süresi (< 24 saat)' }
    ],
    kpis: [
      { label: 'İdari İşler Memnuniyeti', value: '> %90' },
      { label: 'Tesis Arıza Çözüm Süresi', value: '< 24 Saat' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Saha Operasyon Takibi', aciklama: 'Fiziki şartları sürekli denetleme ve anında müdahale.' }
    ],
    teknikBeceriler: [
      { baslik: 'Tesis ve Bina Otomasyonu', aciklama: 'Bina güvenlik ve filo takip sistemleri.' }
    ]
  },
  {
    id: 'isg-uzmani',
    category: 'İnsan Kaynakları & İdari İşler',
    title: 'İş Sağlığı ve Güvenliği (İSG) Uzmanı',
    department: 'İdari İşler & İSG',
    reportsTo: 'Genel Müdür',
    summary: 'Çalışma ortamındaki iş kazası ve meslek hastalığı risklerini tespit etmek, risk analizleri hazırlamak, çalışanlara yasal İSG eğitimlerini vermek, kişisel koruyucu donanım (KKD) kullanımını denetlemek ve sıfır iş kazası hedefini sağlamaktır.',
    tasks: [
      { surec: 'Risk Değerlendirmesi ve Saha Denetimi', yetkinlik: '6331 Sayılı İSG Kanunu', davranis: 'Tavizsiz ve Dikkatli', raci: 'Sorumlu', kpi: 'İSG uygunsuzluklarının kapatılma oranı (%100)' },
      { surec: 'İSG Eğitimleri & Kaza İnceleme', yetkinlik: 'Kaza Kök Neden Analizi', davranis: 'Eğitici', raci: 'Sorumlu', kpi: 'İş kazası sıklık oranı (< 0.5)' }
    ],
    kpis: [
      { label: 'İş Kazası Sıklık Oranı (LTIFR)', value: '0 Kaza' },
      { label: 'Yasal İSG Eğitim Tamamlama Oranı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Güvenlik Kültürü Oluşturma', aciklama: 'Tüm çalışanlarda güvenlik bilincini yerleştirme.' }
    ],
    teknikBeceriler: [
      { baslik: 'İSG Mevzuatı ve Sertifikasyonu', aciklama: 'A/B/C Sınıfı İş Güvenliği Uzmanlığı belgesi.' }
    ]
  },

  // ─── 2. MUHASEBE & FİNANS ───────────────────────────────────────────────────
  {
    id: 'muhasebe-elemani',
    category: 'Muhasebe & Finans',
    title: 'Ön Muhasebe Elemanı',
    department: 'Muhasebe',
    reportsTo: 'Muhasebe Müdürü',
    summary: 'Alış ve satış faturalarının kesilmesi ve sisteme girilmesi, cari hesap mutabakatlarının yapılması, banka ekstreleri ve kasa hareketlerinin günlük işlenmesi ile evrak arşivleme süreçlerini eksiksiz yürütmektir.',
    tasks: [
      { surec: 'Fatura ve İrsaliye İşlemleri', yetkinlik: 'e-Fatura / e-Arşiv Portal Kullanımı', davranis: 'Hatasız ve Dikkatli', raci: 'Sorumlu', kpi: 'Fatura giriş hata oranı (%0)' },
      { surec: 'Cari Hesap Mutabakatı', yetkinlik: 'Cari Takip ve Hesap Özetleri', davranis: 'İletişim Odaklı', raci: 'Sorumlu', kpi: 'Aylık mutabakat tamamlama süresi' },
      { surec: 'Kasa ve Banka Kayıtları', yetkinlik: 'Banka Ekstre İşleme', davranis: 'Güvenilir', raci: 'Sorumlu', kpi: 'Günlük kasa denkleştirmesi' }
    ],
    kpis: [
      { label: 'Fatura İşleme Doğruluğu', value: '%100' },
      { label: 'Cari Mutabakat Tamamlama', value: '%95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Detay Odaklılık', aciklama: 'Rakamlar ve belgeler üzerinde hassasiyet.' }
    ],
    teknikBeceriler: [
      { baslik: 'Logo / ERP Muhasebe Yazılımları', aciklama: 'Fatura ve irsaliye modülleri.' }
    ]
  },
  {
    id: 'genel-muhasebe-uzmani',
    category: 'Muhasebe & Finans',
    title: 'Genel Muhasebe Uzmanı',
    department: 'Muhasebe',
    reportsTo: 'Muhasebe Müdürü',
    summary: 'Şirketin yasal defter kayıtları, KDV, Muhtasar, Geçici Vergi ve Kurumlar Vergisi beyannamelerinin kontrolü ve verilmesi, mizan denkleştirme ve dönem sonu kapanış işlemlerini kanunlara uygun yürütmektir.',
    tasks: [
      { surec: 'Beyanname Hazırlığı & Vergi', yetkinlik: 'VUK & Vergi Mevzuatı', davranis: 'Mevzuata Uyumlu', raci: 'Sorumlu', kpi: 'Zamanında vergi beyan ve ödeme takibi' },
      { surec: 'Mizan ve Dönem Sonu Kapanış', yetkinlik: 'Genel Muhasebe & Kapanış', davranis: 'Analitik', raci: 'Sorumlu', kpi: 'Aylık mizan denkleştirme' }
    ],
    kpis: [
      { label: 'Beyanname Zamanında Verme Oranı', value: '%100' },
      { label: 'Mizan Hata Oranı', value: '%0' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Analitik Düşünme', aciklama: 'Mali tabloları doğru okuma ve yorumlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'Tek Düzen Hesap Planı', aciklama: 'VUK ve hesap planı hakimiyeti.' }
    ]
  },
  {
    id: 'muhasebe-muduru',
    category: 'Muhasebe & Finans',
    title: 'Muhasebe Müdürü',
    department: 'Muhasebe',
    reportsTo: 'Genel Müdür',
    summary: 'Şirketin bilanço, gelir tablosu ve nakit akış tablolarının hazırlanmasını denetlemek, vergi ve bağımsız denetim süreçlerini yönetmek, mali riskleri minimize ederek yönetime doğru finansal rapor sunmaktır.',
    tasks: [
      { surec: 'Mali Raporlama & Bilanço', yetkinlik: 'VUK, IFRS & Mali Denetim', davranis: 'Stratejik', raci: 'Hesap Veren', kpi: 'Mali tabloların hatasız kapanışı' }
    ],
    kpis: [
      { label: 'Bilanço ve Mizan Kapanış Uyum Oranı', value: '%100' },
      { label: 'Vergi Uyum ve Denetim Başarısı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Finansal Liderlik', aciklama: 'Şirket mali disiplinini sağlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'İleri Seviye Mali Analiz', aciklama: 'Bilanço, P&L, IFRS standartları.' }
    ]
  },
  {
    id: 'finansal-analist',
    category: 'Muhasebe & Finans',
    title: 'Finansal Analist / Bütçe Uzmanı',
    department: 'Finans',
    reportsTo: 'Muhasebe Müdürü',
    summary: 'Aylık bütçe-gerçekleşen sapma analizlerini yapmak, nakit akış tahminlerini hazırlamak, yatırımların geri dönüş sürelerini hesaplayarak yönetime karar destek raporları sunmaktır.',
    tasks: [
      { surec: 'Bütçe & Sapma Analizleri', yetkinlik: 'Finansal Model & Bütçe', davranis: 'Sorgulayıcı', raci: 'Sorumlu', kpi: 'Sapma analizi rapor zamanlaması' }
    ],
    kpis: [
      { label: 'Nakit Akış Tahmin İsabeti', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Raporlama ve Sunum', aciklama: 'Karmaşık verileri yönetime net sunma.' }
    ],
    teknikBeceriler: [
      { baslik: 'İleri Seviye Excel & PowerBI', aciklama: 'Finansal modelleme ve dashboard.' }
    ]
  },

  // ─── 3. SATIŞ & PAZARLAMA ───────────────────────────────────────────────────
  {
    id: 'satis-danismani',
    category: 'Satış & Pazarlama',
    title: 'Satış Danışmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Şirketin satış hedefleri doğrultusunda müşterileri güler yüzle karşılamak, ihtiyaç analizi yaparak uygun ürün ve hizmet paketlerini sunmak, teklif ve sözleşme süreçlerini yönetmektir. Müşteri memnuniyetini en üst düzeyde tutarak satış sonrası takip adımlarını eksiksiz yürütmekten sorumludur.',
    tasks: [
      { surec: 'Müşteri Karşılama ve İhtiyaç Analizi', yetkinlik: 'İletişim & Dinleme Becerisi', davranis: 'Güler Yüzlü', raci: 'Sorumlu', kpi: 'Müşteri karşılama memnuniyet puanı (> %95)' },
      { surec: 'Ürün Tanıtımı ve Deneyim', yetkinlik: 'Ürün Bilgisi', davranis: 'İkna Edici', raci: 'Sorumlu', kpi: 'Sunum dönüşüm oranı (> %40)' },
      { surec: 'Teklif ve Satış Kapama', yetkinlik: 'Müzakere', davranis: 'Sonuç Odaklı', raci: 'Sorumlu', kpi: 'Aylık satış hedefi tutturma (%100)' }
    ],
    kpis: [
      { label: 'Aylık Satış Adet Hedefi', value: '%100 Uyum' },
      { label: 'Müşteri Memnuniyeti (CSI/NPS)', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'İkna ve Müzakere', aciklama: 'Müşteri itirazlarını doğru karşılayarak satış kapama.' }
    ],
    teknikBeceriler: [
      { baslik: 'CRM ve Satış Sistemleri', aciklama: 'Müşteri kayıt, teklif ve sipariş takip yazılımları.' }
    ]
  },
  {
    id: 'ikinci-el-satis-danismani',
    category: 'Satış & Pazarlama',
    title: '2.El Satış Danışmanı',
    department: '2.El Satış',
    reportsTo: '2.El Müdürü',
    summary: 'İkinci el araç tedarik, ekspertiz, değerleme, sergileme ve satış süreçlerini yönetmektir. İkinci el piyasası trendlerini takip ederek doğru fiyatlama ve ekspertiz standartlarına uygun olarak aracı satın alma ve müşteriye şeffaf bir şekilde satmaktan sorumludur.',
    tasks: [
      { surec: 'Ekspertiz ve Değerleme', yetkinlik: 'Piyasa & Ekspertiz Bilgisi', davranis: 'Şeffaf', raci: 'Sorumlu', kpi: 'Doğru ekspertiz oranı (%100)' },
      { surec: 'Satış ve Takas', yetkinlik: 'Takas Analizi', davranis: 'Güven Verici', raci: 'Sorumlu', kpi: 'Aylık 2.El satış kotası' }
    ],
    kpis: [
      { label: 'Aylık 2.El Satış Adedi', value: '%100 Uyum' },
      { label: 'Ekspertiz Doğruluk Oranı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Piyasa Analizi', aciklama: 'İkinci el araç piyasa dinamiklerini takip etme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Ekspertiz ve Tramer Yazılımları', aciklama: 'Değerleme ve sorgulama sistemleri.' }
    ]
  },
  {
    id: 'filo-satis-uzmani',
    category: 'Satış & Pazarlama',
    title: 'Filo Satış Uzmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Kurumsal firmalar, filo kiralama şirketleri ve kamu idareleri ile ilişkileri yürütmek, toplu satış ve ihale süreçlerini yönetmektir. Kurumsal müşteri portföyünü genişletmek ve uzun vadeli tedarik sözleşmelerini imzalamaktan sorumludur.',
    tasks: [
      { surec: 'Kurumsal Müşteri Ziyareti', yetkinlik: 'B2B Satış', davranis: 'Profesyonel', raci: 'Sorumlu', kpi: 'Yeni kurumsal müşteri adedi' },
      { surec: 'Filo Teklif & İhale', yetkinlik: 'Bütçeleme & İhale', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'İhale kazanma oranı' }
    ],
    kpis: [
      { label: 'Yıllık Filo Satış Adet Hedefi', value: '%100 Uyum' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'B2B İlişki Yönetimi', aciklama: 'Kurumsal karar vericilerle ilişkiler kurma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Maliyet ve İhale Analiz Tabloları', aciklama: 'Toplu satış maliyet analizleri.' }
    ]
  },
  {
    id: 'dijital-deneyim-danismani',
    category: 'Satış & Pazarlama',
    title: 'Dijital Deneyim Danışmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Online kanallardan ve web sitesinden gelen dijital talepleri (Lead) anında karşılamak, çevrimiçi ürün konfigürasyonu sunmak ve müşteriyi fiziki veya dijital randevuya yönlendirerek satışı kapatmaktır.',
    tasks: [
      { surec: 'Dijital Lead Karşılama', yetkinlik: 'Hızlı İletişim', davranis: 'Hızlı', raci: 'Sorumlu', kpi: 'İlk yanıt süresi (< 15 dakika)' }
    ],
    kpis: [
      { label: 'Lead İlk Temas Süresi', value: '< 15 Dakika' },
      { label: 'Dijital Müşteri Dönüşümü', value: '> %25' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Dijital Hız ve Uyum', aciklama: 'Yeni nesil iletişim kanallarını kullanma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Omnichannel CRM', aciklama: 'Dijital pazarlama ve sohbet/çağrı entegrasyonları.' }
    ]
  },
  {
    id: 'dijital-pazarlama-uzmani',
    category: 'Satış & Pazarlama',
    title: 'Dijital Pazarlama & Sosyal Medya Uzmanı',
    department: 'Pazarlama',
    reportsTo: 'Satış Müdürü',
    summary: 'Şirketin sosyal medya hesaplarını yönetmek, Google/Meta reklam kampanyalarını kurgulamak, web sitesi trafiğini ve dijital potansiyel müşteri adaylarını (Lead) artırmak ve marka imajını güçlendirmektir.',
    tasks: [
      { surec: 'Sosyal Medya & Reklam Kampanyaları', yetkinlik: 'Meta Ads & Google Ads', davranis: 'Yaratıcı', raci: 'Sorumlu', kpi: 'Maliyet başına edinilen lead (CPL)' }
    ],
    kpis: [
      { label: 'Aylık Dijital Müşteri Adayı (Lead)', value: '> 200 Lead' },
      { label: 'Reklam Bütçesi Geri Dönüşü (ROAS)', value: '> %350' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Kreatif İletişim', aciklama: 'Etkileyici görsel ve metin içerikleri kurgulama.' }
    ],
    teknikBeceriler: [
      { baslik: 'Google Analytics & Meta Business', aciklama: 'Dijital pazarlama ve reklam panoları.' }
    ]
  },

  // ─── 4. SERVİS & HASAR GÖREV TANIMLARI ─────────────────────────────────────
  {
    id: 'servis-danismani',
    category: 'Servis & Hasar',
    title: 'Servis Danışmanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Servise gelen araç sahiplerini güler yüzle karşılamak, araç şikayet ve bakım taleplerini dinleyerek iş emri açmak, tahmini maliyet ve teslim süresini bildirmek, atölye ile araç sahibi arasında köprü kurarak aracın zamanında ve sorunsuz teslim edilmesini sağlamaktır.',
    tasks: [
      { surec: 'Müşteri Karşılama ve İş Emri', yetkinlik: 'Otomotiv Servis Bilgisi', davranis: 'Güler Yüzlü', raci: 'Sorumlu', kpi: 'Eksiksiz iş emri açma (%100)' },
      { surec: 'Maliyet ve Teslimat Bilgilendirmesi', yetkinlik: 'Fiyatlandırma', davranis: 'Şeffaf', raci: 'Sorumlu', kpi: 'Servis memnuniyet (CSI) puanı (> %95)' }
    ],
    kpis: [
      { label: 'Servis Müşteri Memnuniyeti (CSI)', value: '> %95' },
      { label: 'Zamanında Teslimat Oranı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Müşteri İlişkileri', aciklama: 'Teknik detayları müşterinin anlayacağı dilde anlatma.' }
    ],
    teknikBeceriler: [
      { baslik: 'DMS Servis Yazılımları', aciklama: 'İş emri ve işçilik modülü kullanımı.' }
    ]
  },
  {
    id: 'kaporta-boya-servis-danismani',
    category: 'Servis & Hasar',
    title: 'Kaporta ve Boya Servis Danışmanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Hasarlı araçların kabulü, sigorta ve kasko ekspertiz süreçlerinin takibi, onarım iş emrinin hazırlanması, kaporta ve boya atölyesindeki adımların izlenmesi ve hasarsız teslimatın gerçekleştirilmesidir.',
    tasks: [
      { surec: 'Hasar Kabul ve Ekspertiz', yetkinlik: 'Sigorta & Ekspertiz Prosedürleri', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'Dosya onay süresi (< 48 saat)' }
    ],
    kpis: [
      { label: 'Sigorta Dosya Onay Süresi', value: '< 48 Saat' },
      { label: 'Hasar Onarım Müşteri Memnuniyeti', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Sigorta Şirketi İlişkileri', aciklama: 'Eksperler ile koordinasyon.' }
    ],
    teknikBeceriler: [
      { baslik: 'Audatex / Eurotax Hasar Sistemleri', aciklama: 'Hasar parça ve işçilik hesaplama.' }
    ]
  },
  {
    id: 'musteri-iliskileri-uzmani',
    category: 'Servis & Hasar',
    title: 'Müşteri İlişkileri Uzmanı (CRM)',
    department: 'Servis & Müşteri İlişkileri',
    reportsTo: 'Servis Müdürü',
    summary: 'Satış veya servis hizmeti alan müşterileri teslimat sonrası arayarak memnuniyet anketlerini (CSI/SSI) yapmak, şikayet ve önerileri kayıt altına alıp ilgili departmanlara ileterek hızlı çözümlenmesini sağlamaktır.',
    tasks: [
      { surec: 'Memnuniyet Aramaları & Şikayet Yönetimi', yetkinlik: 'Telefonda İletişim & Empati', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Arama tamamlama oranı (> %90)' }
    ],
    kpis: [
      { label: 'Şikayet Çözüm Süresi', value: '< 24 Saat' },
      { label: 'Genel Müşteri Tavsiye Etme Skoru (NPS)', value: '> %90' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Problem Çözme ve Empati', aciklama: 'Kızgın müşterileri sakinleştirip uzlaşma sağlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'CRM Çağrı Sistemleri', aciklama: 'Müşteri geribildirim ve anket panoları.' }
    ]
  },

  // ─── 5. ÜRETİM & İMALAT (TEKNİK ATÖLYE) ──────────────────────────────────
  {
    id: 'mekanik-teknisyeni',
    category: 'Üretim & İmalat',
    title: 'Mekanik Teknisyeni',
    department: 'Servis',
    reportsTo: 'Mekanik Formen',
    summary: 'Araçların periyodik bakımlarını, motor, şanzıman, fren, süspansiyon ve elektronik sistem arızalarının teşhis ve onarımlarını imalatçı standartlarına ve güvenlik kurallarına uygun olarak gerçekleştirmektir.',
    tasks: [
      { surec: 'Periyodik Bakım ve Onarım', yetkinlik: 'Mekanik & Otomotiv Elektroniği', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'Bakım süresine uyum' },
      { surec: 'Arıza Teşhis', yetkinlik: 'Diagnostik Cihaz', davranis: 'Analitik', raci: 'Sorumlu', kpi: 'İlk seferde doğru tamir (%100)' }
    ],
    kpis: [
      { label: 'Tekrarlayan Arıza (Re-fix) Oranı', value: '< %1' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'İSG ve Atölye Düzeni', aciklama: 'Koruyucu ekipman ve temiz çalışma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Diagnostik Cihazlar', aciklama: 'Orijinal arıza tespit yazılımları.' }
    ]
  },
  {
    id: 'boya-teknisyeni',
    category: 'Üretim & İmalat',
    title: 'Boya Teknisyeni / Ustası',
    department: 'Servis & İmalat',
    reportsTo: 'Boya Formeni',
    summary: 'Hasarlı veya yenilenen araç parçalarının yüzey zımparalama, macun, astar, renk kodlama ve kabin içi boyama ile fırınlama adımlarını hatasız bir şekilde tamamlamaktır.',
    tasks: [
      { surec: 'Yüzey Hazırlığı ve Astar', yetkinlik: 'Zımpara ve Macun', davranis: 'Pürüzsüz İmalat', raci: 'Sorumlu', kpi: 'Yüzey hazırlık kalitesi' },
      { surec: 'Renk Karışımı ve Kabin Boyama', yetkinlik: 'Renk Skalası & HVLP Tabanca', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'Sıfır renk farkı ve pürüzsüzlük' }
    ],
    kpis: [
      { label: 'Boya Kalite Onay Oranı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Ustalık ve Estetik', aciklama: 'Mikron düzeyinde pürüzsüzlük.' }
    ],
    teknikBeceriler: [
      { baslik: 'Boya Kabini ve Tabanca', aciklama: 'Kabin iklimlendirme ve tiner karıştırma.' }
    ]
  },
  {
    id: 'boya-formeni',
    category: 'Üretim & İmalat',
    title: 'Boya Formeni',
    department: 'Servis & İmalat',
    reportsTo: 'Servis Müdürü',
    summary: 'Boya atölyesindeki iş akışını, boya teknisyenlerinin iş dağılımını, malzeme kullanımını ve çıkan boya kalitesini denetlemek, atölye verimliliğini ve emniyetini sağlamaktır.',
    tasks: [
      { surec: 'Atölye İş Dağılımı ve Kalite', yetkinlik: 'Atölye Sevk ve İdare', davranis: 'Lider', raci: 'Hesap Veren', kpi: 'Atölye verimliliği' }
    ],
    kpis: [
      { label: 'Boya Atölye Verimliliği', value: '> %90' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Ekip Sevk ve İdaresi', aciklama: 'Teknisyenlerin günlük iş bölümünü adil yönetme.' }
    ],
    teknikBeceriler: [
      { baslik: 'İleri Boya Teknolojisi', aciklama: 'Spektrofotometre ve renk ayarı.' }
    ]
  },
  {
    id: 'govde-teknisyeni',
    category: 'Üretim & İmalat',
    title: 'Gövde (Kaporta) Teknisyeni',
    department: 'Servis & İmalat',
    reportsTo: 'Gövde Formeni',
    summary: 'Kazalı araçların şasi, kaporta, sac düzeltme, parça değişimi ve çektirme işlemlerini imalatçı şasi tolerans ölçülerine uygun olarak gerçekleştirmektir.',
    tasks: [
      { surec: 'Şasi ve Sac Düzeltme', yetkinlik: 'Şasi Tezgahı', davranis: 'Emniyetli', raci: 'Sorumlu', kpi: 'Milimetrik şasi uyumu' }
    ],
    kpis: [
      { label: 'Şasi Tolerans Uyum Oranı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Güvenlik Bilinci', aciklama: 'Araç yapısının emniyetini koruma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Punta ve Punto Kaynağı', aciklama: 'Sac doğrultma tezgâhları.' }
    ]
  },
  {
    id: 'yikamaci',
    category: 'Üretim & İmalat',
    title: 'Yıkamacı / Araç Temizlik Elemanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Servisten veya satıştan çıkan araçların iç ve dış temizliğini, kuaför ve cilalama işlemlerini özenle yaparak müşteriye pırıl pırıl teslim edilmesini sağlamaktır.',
    tasks: [
      { surec: 'İç ve Dış Temizlik', yetkinlik: 'Oto Temizlik Malzemeleri', davranis: 'Özenli', raci: 'Sorumlu', kpi: 'Temiz teslimat' }
    ],
    kpis: [
      { label: 'Temizlik Kusursuzluk Puanı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Özen ve Hizmet Anlayışı', aciklama: 'Müşteri aracına kendi aracı gibi bakma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Oto Temizlik Cihazları', aciklama: 'Basınçlı yıkama ve süpürgeler.' }
    ]
  },
  {
    id: 'quality-control-specialist',
    category: 'Üretim & İmalat',
    title: 'Kalite Kontrol Uzmanı',
    department: 'Kalite Güvence',
    reportsTo: 'Kalite Güvence Müdürü',
    summary: 'Gelen hammadde, üretim içi yarı mamul ve bitmiş ürünlerin teknik resim ve kalite kriterlerine uygunluğunu kumpas, mikrometre vb. ölçüm aletleriyle denetlemek ve hatasız üretimi garanti etmektir.',
    tasks: [
      { surec: 'Kalite Kontrol & Denetim', yetkinlik: 'Teknik Resim & Ölçüm Aletleri', davranis: 'Tarafsız', raci: 'Sorumlu', kpi: 'Hatalı parçanın sızmaması (%0)' }
    ],
    kpis: [
      { label: 'Müşteri Şikayet / İade Oranı', value: '< %0.5' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Tavizsiz Kalite Anlayışı', aciklama: 'Standart dışı imalatı anında durdurma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Teknik Resim & Hassas Ölçüm', aciklama: 'Kumpas, mikrometre ve CMM cihazları.' }
    ]
  },

  // ─── 6. DEPO & LOJİSTİK GÖREV TANIMLARI ─────────────────────────────────────
  {
    id: 'yedek-parca-uzmani',
    category: 'Depo & Lojistik',
    title: 'Yedek Parça Uzmanı',
    department: 'Yedek Parça',
    reportsTo: 'Yedek Parça Müdürü',
    summary: 'Servis ve dış müşterilerin yedek parça taleplerini katalogdan sorgulamak, doğru parça kodunu tespit etmek, sipariş oluşturmak ve stok seviyelerini optimize etmektir.',
    tasks: [
      { surec: 'Parça Kodu Sorgulama', yetkinlik: 'Elektronik Parça Kataloğu', davranis: 'Hatasız', raci: 'Sorumlu', kpi: 'Yanlış parça sipariş hatası (%0)' },
      { surec: 'Servis Parça Çıkışı', yetkinlik: 'WMS / Depo Modülü', davranis: 'Hızlı', raci: 'Sorumlu', kpi: 'Atölyeye parça verme süresi (< 5 dk)' }
    ],
    kpis: [
      { label: 'Parça Kodu Doğruluk Oranı', value: '%100' },
      { label: 'Stok Bulundurma Oranı', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stok Düzeni', aciklama: 'Parça raflarının tertertip takibi.' }
    ],
    teknikBeceriler: [
      { baslik: 'EPC (Electronic Parts Catalog)', aciklama: 'Marka orijinal parça yazılımları.' }
    ]
  },
  {
    id: 'warehouse-specialist',
    category: 'Depo & Lojistik',
    title: 'Depo ve Sevkiyat Sorumlusu',
    department: 'Lojistik & Depo',
    reportsTo: 'Depo Müdürü',
    summary: 'Mal kabul, raflama, stok takibi, sipariş toplama ve sevkiyat araçlarına yükleme süreçlerini eksiksiz ve el terminali barkod sistemiyle yürütmektir.',
    tasks: [
      { surec: 'Mal Kabul ve Sevkiyat', yetkinlik: 'El Terminali & İrsaliye', davranis: 'Düzenli', raci: 'Sorumlu', kpi: 'Stok doğruluk oranı (> %99)' }
    ],
    kpis: [
      { label: 'Stok Doğruluk Oranı', value: '> %99' },
      { label: 'Sevkiyat Zamanında Teslimat', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: '5S Depo Düzeni', aciklama: 'Depo alanının tertertip tutulması.' }
    ],
    teknikBeceriler: [
      { baslik: 'WMS & Barkod Okuyucu', aciklama: 'Depo yönetim yazılımları.' }
    ]
  },

  // ─── 7. YAZILIM & IT GÖREV TANIMLARI ────────────────────────────────────────
  {
    id: 'software-developer',
    category: 'Yazılım & IT',
    title: 'Yazılım Geliştirici / Mühendisi',
    department: 'Bilgi Teknolojileri',
    reportsTo: 'Yazılım / IT Müdürü',
    summary: 'Şirketin web, mobil ve iç yazılım uygulamalarının analiz, tasarım, kodlama, test ve bakım süreçlerini modern mimarilere uygun olarak gerçekleştirmektir.',
    tasks: [
      { surec: 'Kod Geliştirme & Mimari', yetkinlik: 'Clean Code & Algoritma', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Zamanında kod teslimatı' },
      { surec: 'API & DB Entegrasyonu', yetkinlik: 'REST API & SQL/NoSQL', davranis: 'Güvenli Kodlama', raci: 'Sorumlu', kpi: 'Düşük hata (Bug) oranı' }
    ],
    kpis: [
      { label: 'Sprint Hedefini Tamamlama', value: '> %90' },
      { label: 'Canlı Ortam Hata (Bug) Oranı', value: '< %2' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Sürekli Öğrenme', aciklama: 'Yeni teknolojileri takip etme ve uyarlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'React / Node.js / Python / C#', aciklama: 'Modern yazılım dilleri ve Git versiyon kontrolü.' }
    ]
  },
  {
    id: 'it-support-specialist',
    category: 'Yazılım & IT',
    title: 'IT / Sistem Destek Uzmanı',
    department: 'Bilgi Teknolojileri',
    reportsTo: 'IT Müdürü',
    summary: 'Şirket içi bilgisayar, yazıcı, ağ (network), sunucu ve kullanıcı hesaplarının kurulum, bakım, güvenlik güncellemeleri ve teknik destek süreçlerini yürütmektir.',
    tasks: [
      { surec: 'Donanım & Ağ Kurulumu', yetkinlik: 'Windows/Linux & Network', davranis: 'Hızlı', raci: 'Sorumlu', kpi: 'Kullanıcı arıza çağrı kapama süresi (< 1 saat)' }
    ],
    kpis: [
      { label: 'IT Arıza Çağrı Çözüm Süresi', value: '< 1 Saat' },
      { label: 'Sistem Kesintisizlik (Uptime)', value: '> %99.5' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Problem Çözme', aciklama: 'Saha teknik arızalarına hızlı müdahale.' }
    ],
    teknikBeceriler: [
      { baslik: 'Active Directory & Firewalls', aciklama: 'Ağ ve kullanıcı yetkilendirme sistemleri.' }
    ]
  },

  // ─── 8. ÜST YÖNETİM GÖREV TANIMLARI ────────────────────────────────────────
  {
    id: 'genel-mudur',
    category: 'Yönetim',
    title: 'Genel Müdür',
    department: 'Yönetim',
    reportsTo: 'Bayi Sahibi / Yönetim Kurulu',
    summary: 'Şirketin tüm operasyonel, finansal, satış, servis ve insan kaynakları süreçlerini şirket vizyonu ve yıllık karlılık hedefleri doğrultusunda yönetmek, markanın temsilini en üst düzeyde yapmaktır.',
    tasks: [
      { surec: 'Şirket Stratejisi ve Karlılık', yetkinlik: 'Üst Düzey Yönetim & Bütçe', davranis: 'Lider', raci: 'Hesap Veren', kpi: 'Yıllık şirket ciro ve karlılık hedefleri' }
    ],
    kpis: [
      { label: 'Yıllık Şirket Karlılık Hedefi', value: '%100 Uyum' },
      { label: 'Genel Müşteri Memnuniyeti (CSI)', value: '> %96' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stratejik Liderlik', aciklama: 'Tüm departmanları ortak kurumsal hedefe yönlendirme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Kurumsal Yönetim ve Mali Tablolar', aciklama: 'Bilanço, P&L ve finansal yatırım analitiği.' }
    ]
  },

  // ─── 9. ÇEVRE, İSG & SÜRDÜRÜLEBİLİRLİK GÖREV TANIMLARI ─────────────────────
  {
    id: 'cevre-gorevlisi',
    category: 'Çevre & İSG',
    title: 'Çevre Görevlisi / Çevre Mühendisi',
    department: 'Çevre ve İş Sağlığı Güvenliği (İSG-Ç)',
    reportsTo: 'Çevre Müdürü / İSG-Ç Müdürü',
    summary: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı mevzuatına ve ISO 14001 Çevre Yönetim Sistemi standartlarına uygun olarak; şirketin/tesisin emisyon, atık su, tehlikeli/tehlikesiz atık bertarafı, sıfır atık belgelendirmesi ve çevre izin/lisans süreçlerini sahada aktif şekilde yürütmek, denetimlere hazırlamak ve yasal beyanları gerçekleştirmektir.',
    tasks: [
      { surec: 'Çevre İzin, Lisans ve Yasal Beyanlar', yetkinlik: 'Entegre Çevre Bilgi Sistemi (EÇBS) & Mevzuat', davranis: 'Titiz ve Mevzuata Uyumlu', raci: 'Sorumlu', kpi: 'Yasal çevre beyanlarının süresinde ve eksiksiz yapılması (%100)' },
      { surec: 'Atık Yönetimi ve Sıfır Atık Süreçleri', yetkinlik: 'Tehlikeli / Tehlikesiz Atık Ayrıştırma & Motat', davranis: 'Takipçi ve Çevreye Duyarlı', raci: 'Sorumlu', kpi: 'Atık geri kazanım ve bertaraf sertifikasyonu tutarlılığı' },
      { surec: 'Çevre Denetimleri ve Saha Kontrolleri', yetkinlik: 'ISO 14001 İç Tetkik & Saha İncelemesi', davranis: 'Gözlemci ve Hızlı Müdahale Eden', raci: 'Sorumlu', kpi: 'Saha çevre uygunsuzluklarının kapatılma oranı (%95+)' },
      { surec: 'Çevre Bilinçlendirme Eğitimleri', yetkinlik: 'Kurumsal Çevre ve Sıfır Atık Eğitimi', davranis: 'Eğitici ve Motivasyon Sağlayan', raci: 'Destekleyen', kpi: 'Personel çevre eğitimi tamamlama oranı' }
    ],
    kpis: [
      { label: 'Yasal Çevre Beyan ve Bildirim Zamanında Yapılma Oranı', value: '%100' },
      { label: 'ISO 14001 Saha Çevre Uygunsuzluk Kapatma Süresi', value: '< 7 Gün' },
      { label: 'Geri Dönüştürülebilir Atık Ayrıştırma Başarısı', value: '> %90' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Mevzuat ve Standartlara Uyum', aciklama: 'Güncel yasal düzenlemeleri ve çevresel standartları hassasiyetle takip etme.' },
      { baslik: 'Risk Tespiti ve Kriz Önleme', aciklama: 'Çevresel kirlilik risklerini önceden saptayıp aksiyon alma.' }
    ],
    teknikBeceriler: [
      { baslik: 'EÇBS & MOTAT Sistemleri', aciklama: 'Bakanlık Entegre Çevre Bilgi Sistemi ve Atık Taşıma sistemlerine hakimiyet.' },
      { baslik: 'ISO 14001 Çevre Yönetim Sistemi', aciklama: 'Çevre yönetim standartları, iç tetkik ve belgelendirme süreçleri.' }
    ]
  },
  {
    id: 'cevre-muduru',
    category: 'Çevre & İSG',
    title: 'Çevre Yönetim Müdürü / Çevre Müdürü',
    department: 'Çevre ve İş Sağlığı Güvenliği (İSG-Ç)',
    reportsTo: 'Genel Müdür / Operasyon Direktörü',
    summary: 'Şirketin tüm tesis ve operasyonlarındaki çevre vizyonunu, sürdürülebilirlik stratejilerini, karbon ayak izi azaltım hedeflerini, ISO 14001 Çevre Yönetim Sistemini ve EHS (İSG-Ç) bütçesini yönetmektir. Bakanlık ve yasal denetimlerde şirketi en üst düzeyde temsil etmek, yeşil dönüşüm ve sıfır atık projelerini liderlik ederek yürütmektir.',
    tasks: [
      { surec: 'Stratejik Çevre ve Sürdürülebilirlik Yönetimi', yetkinlik: 'Kurumsal Çevre Stratejisi & Karbon Ayak İzi', davranis: 'Vizyoner ve Stratejik Lider', raci: 'Hesap Veren', kpi: 'Yıllık karbon emisyonu ve enerji tasarrufu hedefleri' },
      { surec: 'Yasal Risk ve Ruhsatlandırma Yönetimi', yetkinlik: 'ÇED Olumlu Belgesi & Çevre İzin/Lisans', davranis: 'Kuralcı ve Temsil Kabiliyeti Yüksek', raci: 'Hesap Veren', kpi: 'Sıfır yasal çevre cezası / cezasız denetim kapatma' },
      { surec: 'ISO 14001 & ESG Uyum Bütçesi', yetkinlik: 'Sürdürülebilirlik Bütçesi & Yönetim Gözden Geçirme', davranis: 'Maliyet ve Sonuç Odaklı', raci: 'Hesap Veren', kpi: 'Çevre bütçesi gerçekleşme uyumu ve sertifikasyon sürdürülebilirliği' },
      { surec: 'Çevre Ekibi ve Danışman Yönetimi', yetkinlik: 'Liderlik & Danışman Firma Koordinasyonu', davranis: 'Yönlendirici ve Geliştirici', raci: 'Hesap Veren', kpi: 'Çevre ekibi performans puanı' }
    ],
    kpis: [
      { label: 'Yasal Çevre Ceza / Uyarı Sayısı', value: '0 (Sıfır)' },
      { label: 'Yıllık Karbon Ayak İzi Azaltım Oranı', value: '> %10' },
      { label: 'ISO 14001 Dış Denetim Uygunsuzluk Sayısı', value: '0 Major' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stratejik Çevre Liderliği', aciklama: 'Şirket yatırımlarında çevre ve yeşil dönüşüm kriterlerini entegre etme.' },
      { baslik: 'Yasal Temsil ve İlişki Yönetimi', aciklama: 'Bakanlık, il müdürlükleri ve denetim organlarıyla kurumsal ilişkileri yürütme.' }
    ],
    teknikBeceriler: [
      { baslik: 'AB Yeşil Mutabakatı & SKDM (CBAM)', aciklama: 'Sınırda Karbon Düzenleme Mekanizması ve kurumsal sürdürülebilirlik raporlaması.' },
      { baslik: 'ÇED ve Entegre Çevre İzin Süreçleri', aciklama: 'Büyük ölçekli sanayi tesislerinde ÇED ve Çevre İzin Lisans yönetimi.' }
    ]
  }
];
