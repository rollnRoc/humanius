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
  // ─── 1. SATIŞ & SHOWROOM GÖREV TANIMLARI ────────────────────────────────────
  {
    id: 'satis-danismani',
    category: 'Satış',
    title: 'Satış Danışmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Şirketin satış hedefleri doğrultusunda müşterileri güler yüzle karşılamak, ihtiyaç analizi yaparak uygun araç ve donanım seçeneklerini sunmak, test sürüşü ve teklif süreçlerini yönetmektir. Müşteri memnuniyetini en üst düzeyde tutarak müşteri portföyünü geliştirmek ve satış sonrası takip adımlarını eksiksiz yürütmekten sorumludur.',
    tasks: [
      { surec: 'Müşteri Karşılama ve İhtiyaç Analizi', yetkinlik: 'İletişim & Dinleme Becerisi', davranis: 'Güler Yüzlü ve Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Müşteri karşılama memnuniyet puanı (> %95)' },
      { surec: 'Araç Tanıtımı ve Test Sürüşü', yetkinlik: 'Ürün ve Teknik Donanım Bilgisi', davranis: 'İkna Edici ve Emniyetli', raci: 'Sorumlu', kpi: 'Test sürüşü dönüşüm oranı (> %40)' },
      { surec: 'Fiyat Teklifi ve Satış Kapama', yetkinlik: 'Müzakere ve Finansal Teklif', davranis: 'Sonuç Odaklı', raci: 'Sorumlu', kpi: 'Aylık araç satış hedefi tutturma (%100)' },
      { surec: 'Satış Sonrası Takip & Müşteri Bağlılığı', yetkinlik: 'CRM Takibi', davranis: 'Düzenli İletişim', raci: 'Sorumlu', kpi: 'Müşteri bağlılığı ve tavsiye oranı' }
    ],
    kpis: [
      { label: 'Aylık Araç Satış Adet Hedefi', value: '%100 Uyum' },
      { label: 'Test Sürüşü Satışa Dönüşüm Oranı', value: '> %40' },
      { label: 'Müşteri Memnuniyeti (CSI/NPS) Puanı', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'İkna ve Müzakere', aciklama: 'Müşteri itirazlarını doğru karşılayarak katma değerli satış kapama.' },
      { baslik: 'Müşteri Odaklılık', aciklama: 'Müşteri ihtiyaçlarını en ince detayına kadar analiz etme ve yönlendirme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Araç Teknik ve Donanım Bilgisi', aciklama: 'Marka araç modelleri, opsiyon paketleri ve teknolojik donanımlara tam hakimiyet.' },
      { baslik: 'CRM ve Satış Sistemleri', aciklama: 'Müşteri kayıt, teklif ve sipariş takip yazılımları.' }
    ]
  },
  {
    id: 'ikinci-el-satis-danismani',
    category: 'Satış',
    title: '2.El Satış Danışmanı',
    department: '2.El Satış',
    reportsTo: '2.El Müdürü',
    summary: 'İkinci el araç tedarik, ekspertiz, değerleme, sergileme ve satış süreçlerini yönetmektir. İkinci el piyasası trendlerini takip ederek doğru fiyatlama ve ekspertiz standartlarına uygun olarak aracı satın alma ve müşteriye şeffaf bir şekilde satmaktan sorumludur.',
    tasks: [
      { surec: 'Ekspertiz ve Araç Değerleme', yetkinlik: 'Piyasa ve Ekspertiz Bilgisi', davranis: 'Orijinallik ve Şeffaflık', raci: 'Sorumlu', kpi: 'Doğru ekspertiz değerleme oranı (%100)' },
      { surec: '2.El Araç Satışı ve Takas', yetkinlik: 'Takas Analizi ve İkna Becerisi', davranis: 'Güven Verici', raci: 'Sorumlu', kpi: 'Aylık 2.El satış kotası' },
      { surec: 'Noter ve Ruhsat Takibi', yetkinlik: 'Devir ve İdari Prosedürler', davranis: 'Titiz ve Hızlı', raci: 'Sorumlu', kpi: 'Noter devir süresi (< 24 saat)' }
    ],
    kpis: [
      { label: 'Aylık 2.El Araç Satış Adedi', value: '%100 Uyum' },
      { label: 'Ekspertiz Doğruluk Oranı', value: '%100' },
      { label: 'Stokta Kalma Süresi (Turn-over)', value: '< 30 Gün' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Piyasa Analizi ve Risk Yönetimi', aciklama: 'İkinci el araç piyasasındaki fiyat dalgalanmalarını öngörme.' }
    ],
    teknikBeceriler: [
      { baslik: '2.El Araç Ekspertiz Yazılımları', aciklama: 'Tramer, hasar kaydı, ekspertiz ve değerleme araçları.' }
    ]
  },
  {
    id: 'filo-satis-uzmani',
    category: 'Satış',
    title: 'Filo Satış Uzmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Kurumsal firmalar, filo kiralama şirketleri ve kamu idareleri ile ilişkileri yürütmek, toplu araç satışı ve ihale süreçlerini yönetmektir. Kurumsal müşteri portföyünü genişletmek ve uzun vadeli filo tedarik sözleşmelerini imzalamaktan sorumludur.',
    tasks: [
      { surec: 'Kurumsal Müşteri Ziyareti ve Portföy', yetkinlik: 'B2B Satış ve Kurumsal İletişim', davranis: 'Profesyonel ve Stratejik', raci: 'Sorumlu', kpi: 'Yeni kurumsal müşteri adedi' },
      { surec: 'Filo Teklif & İhale Hazırlığı', yetkinlik: 'Bütçeleme & İhale Mevzuatı', davranis: 'Titiz ve Zamanında', raci: 'Sorumlu', kpi: 'İhale kazanma başarı oranı' }
    ],
    kpis: [
      { label: 'Yıllık Filo Satış Adet Hedefi', value: '%100 Uyum' },
      { label: 'Kurumsal Müşteri Portföy Büyümesi', value: '> %20' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stratejik B2B İlişki Yönetimi', aciklama: 'Kurumsal karar vericiler ile güvene dayalı ilişkiler kurma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Filo Kiralama & İhale Yazılımları', aciklama: 'Toplu satış maliyet analiz tabloları ve ihale dosyaları.' }
    ]
  },
  {
    id: 'dijital-deneyim-danismani',
    category: 'Satış',
    title: 'Dijital Deneyim Danışmanı',
    department: 'Satış',
    reportsTo: 'Satış Müdürü',
    summary: 'Online kanallardan, web sitesinden ve sosyal medyadan gelen dijital satış taleplerini (Lead) anında karşılamak, dijital showroom deneyimi sunmak ve müşteriyi fiziki test sürüşü veya çevrimiçi araç konfigürasyonuna yönlendirmektir.',
    tasks: [
      { surec: 'Dijital Lead Karşılama ve Dönüşüm', yetkinlik: 'Hızlı İletişim & Dijital Satış', davranis: 'Hızlı ve Etkileşimli', raci: 'Sorumlu', kpi: 'İlk yanıt süresi (< 15 dakika)' },
      { surec: 'Online Araç Konfigürasyon ve Sunum', yetkinlik: 'Dijital Araç Tanıtımı', davranis: 'Yenilikçi', raci: 'Sorumlu', kpi: 'Lead satışa dönüşüm oranı' }
    ],
    kpis: [
      { label: 'Lead İlk Temas Süresi', value: '< 15 Dakika' },
      { label: 'Dijital Müşteri Dönüşüm Oranı', value: '> %25' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Dijital Uyum ve Hız', aciklama: 'Yeni nesil iletişim kanallarını en verimli şekilde kullanma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Omnichannel CRM & Chat Araçları', aciklama: 'Dijital pazarlama ve sohbet/çağrı entegrasyonları.' }
    ]
  },

  // ─── 2. SERVİS & TEKNİK GÖREV TANIMLARI ────────────────────────────────────
  {
    id: 'servis-danismani',
    category: 'Servis',
    title: 'Servis Danışmanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Servise gelen araç sahiplerini güler yüzle karşılamak, araç şikayet ve bakım taleplerini dinleyerek iş emri açmak, tahmini maliyet ve teslim süresini bildirmek, atölye ile araç sahibi arasında köprü kurarak aracın zamanında ve sorunsuz teslim edilmesini sağlamaktır.',
    tasks: [
      { surec: 'Müşteri Karşılama ve İş Emri Açma', yetkinlik: 'Otomotiv Mekanik/Servis Bilgisi', davranis: 'Güler Yüzlü ve Empatik', raci: 'Sorumlu', kpi: 'Eksiksiz iş emri açma oranı (%100)' },
      { surec: 'Maliyet ve Zaman Bilgilendirmesi', yetkinlik: 'Fiyatlandırma & Paket Hesaplama', davranis: 'Şeffaf', raci: 'Sorumlu', kpi: 'Sürpriz maliyet şikayeti olmaması' },
      { surec: 'Araç Teslimat ve Açıklama', yetkinlik: 'Teknik Anlatım ve İletişim', davranis: 'Çözüm Odaklı', raci: 'Sorumlu', kpi: 'Servis memnuniyet (CSI) puanı (> %95)' }
    ],
    kpis: [
      { label: 'Servis Müşteri Memnuniyeti (CSI)', value: '> %95' },
      { label: 'Zamanında Teslimat Oranı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Müşteri İlişkileri ve İletişim', aciklama: 'Teknik detayları müşterinin anlayacağı sadelikte anlatabilme.' }
    ],
    teknikBeceriler: [
      { baslik: 'DMS Servis Yazılımları', aciklama: 'İş emri, yedek parça ve işçilik modülü kullanımı.' }
    ]
  },
  {
    id: 'kaporta-boya-servis-danismani',
    category: 'Servis',
    title: 'Kaporta ve Boya Servis Danışmanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Hasarlı araçların kabulü, sigorta ve kasko ekspertiz süreçlerinin takibi, onarım iş emrinin hazırlanması, kaporta ve boya atölyesindeki adımların izlenmesi ve hasarsız teslimatın gerçekleştirilmesidir.',
    tasks: [
      { surec: 'Hasar Kabul ve Ekspertiz Takibi', yetkinlik: 'Sigorta & Ekspertiz Prosedürleri', davranis: 'Titiz ve Takipçi', raci: 'Sorumlu', kpi: 'Ekspertiz dosya açım süresi' },
      { surec: 'Onarım Süreç Takibi ve Teslimat', yetkinlik: 'Kaporta/Boya İşçilik Bilgisi', davranis: 'Şeffaf', raci: 'Sorumlu', kpi: 'Kusursuz teslimat oranı' }
    ],
    kpis: [
      { label: 'Sigorta Dosya Onay Süresi', value: '< 48 Saat' },
      { label: 'Hasar Onarım Müşteri Memnuniyeti', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Sigorta Şirketi İlişki Yönetimi', aciklama: 'Eksperler ve sigorta yetkilileri ile koordinasyon.' }
    ],
    teknikBeceriler: [
      { baslik: 'Audatex / Eurotax Hasar Yazılımları', aciklama: 'Hasar parça ve işçilik hesaplama sistemleri.' }
    ]
  },
  {
    id: 'mekanik-teknisyeni',
    category: 'Servis',
    title: 'Mekanik Teknisyeni',
    department: 'Servis',
    reportsTo: 'Mekanik Formen',
    summary: 'Araçların periyodik bakımlarını, motor, şanzıman, fren, süspansiyon ve elektronik sistem arızalarının teşhis ve onarımlarını imalatçı standartlarına ve güvenlik kurallarına uygun olarak gerçekleştirmektir.',
    tasks: [
      { surec: 'Periyodik Bakım ve Onarım', yetkinlik: 'Mekanik & Otomotiv Elektroniği', davranis: 'Titiz ve Kaliteli', raci: 'Sorumlu', kpi: 'Bakım standart süresine uyum' },
      { surec: 'Arıza Teşhis ve Test', yetkinlik: 'Diagnostik Cihaz Kullanımı', davranis: 'Analitik', raci: 'Sorumlu', kpi: 'İlk seferde doğru teşhis ve tamir (%100)' }
    ],
    kpis: [
      { label: 'Tekrarlayan Arıza (Re-fix) Oranı', value: '< %1' },
      { label: 'İş Emri Kapatma Zamanlaması', value: '%95 Uyum' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'İSG ve Atölye Düzeni', aciklama: 'Koruyucu ekipman ve temiz çalışma prensibi.' }
    ],
    teknikBeceriler: [
      { baslik: 'Diagnostik Arıza Tespit Cihazları', aciklama: 'Orijinal arıza tespit yazılımları ve el aletleri.' }
    ]
  },
  {
    id: 'boya-teknisyeni',
    category: 'Servis',
    title: 'Boya Teknisyeni',
    department: 'Servis',
    reportsTo: 'Boya Formeni',
    summary: 'Hasarlı veya yenilenen araç parçalarının yüzey zımparalama, macun, astar, renk kodlama ve kabin içi boyama ile fırınlama adımlarını hatasız bir şekilde tamamlamaktır.',
    tasks: [
      { surec: 'Yüzey Hazırlığı ve Astar', yetkinlik: 'Zımpara ve Macun Uygulama', davranis: 'Pürüzsüz İmalat', raci: 'Sorumlu', kpi: 'Yüzey hazırlık kalitesi' },
      { surec: 'Renk Karışımı ve Kabin Boyama', yetkinlik: 'Renk Skalası & HVLP Tabanca', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'Sıfır renk farkı ve pürüzsüz boya' }
    ],
    kpis: [
      { label: 'Boya Kalite Onay Oranı', value: '> %98' },
      { label: 'Yeniden Boyama (Tekrar) Oranı', value: '< %2' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Ustalık ve Estetik Görüş', aciklama: 'Mikron düzeyinde pürüzsüzlük elde etme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Boya Kabini ve Fırınlama', aciklama: 'Kabin iklimlendirme, tiner ve renk karıştırma.' }
    ]
  },
  {
    id: 'boya-formeni',
    category: 'Servis',
    title: 'Boya Formeni',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Boya atölyesindeki iş akışını, boya teknisyenlerinin iş dağılımını, malzeme kullanımını ve çıkan boya kalitesini denetlemek, atölye verimliliğini ve emniyetini sağlamaktır.',
    tasks: [
      { surec: 'Atölye İş Dağılımı ve Kalite Denetimi', yetkinlik: 'Atölye Sevk ve İdare', davranis: 'Lider ve Denetçi', raci: 'Hesap Veren', kpi: 'Atölye zamanında teslimat oranı' },
      { surec: 'Sarf Malzeme ve Stok Kontrolü', yetkinlik: 'Maliyet & Malzeme Takibi', davranis: 'Tasarruflu', raci: 'Sorumlu', kpi: 'Boya sarfiyat bütçesine uyum' }
    ],
    kpis: [
      { label: 'Boya Atölye Verimlilik Puanı', value: '> %90' },
      { label: 'Boya Hata / Tekrar Oranı', value: '< %1.5' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Ekip Sevk ve İdaresi', aciklama: 'Teknisyenlerin günlük iş bölümünü adil yönetme.' }
    ],
    teknikBeceriler: [
      { baslik: 'İleri Seviye Boya Teknolojileri', aciklama: 'Renk tutturma, spektrofotometre kullanımı.' }
    ]
  },
  {
    id: 'govde-teknisyeni',
    category: 'Servis',
    title: 'Gövde (Kaporta) Teknisyeni',
    department: 'Servis',
    reportsTo: 'Gövde Formeni',
    summary: 'Kazalı araçların şasi, kaporta, sac düzeltme, parça değişimi ve çektirme işlemlerini imalatçı şasi tolerans ölçülerine uygun olarak gerçekleştirmektir.',
    tasks: [
      { surec: 'Şasi ve Sac Düzeltme', yetkinlik: 'Şasi Tezgahı & Çektirme', davranis: 'Emniyetli', raci: 'Sorumlu', kpi: 'Milimetrik şasi ölçüm uyumu' },
      { surec: 'Parça Değişim ve Kaynak', yetkinlik: 'Punta & Gazaltı Kaynağı', davranis: 'Sağlam ve Titiz', raci: 'Sorumlu', kpi: 'Kaynak mukavemet kalitesi' }
    ],
    kpis: [
      { label: 'Şasi Tolerans Ölçüm Hassasiyeti', value: '%100 Uyum' },
      { label: 'Kaporta Onarım Süre Uyum Oranı', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Güvenlik Bilinci', aciklama: 'Araç yapısının güvenliğini bozmadan onarma.' }
    ],
    teknikBeceriler: [
      { baslik: 'Punta ve Punto Kaynak Cihazları', aciklama: 'Alüminyum ve çelik sac doğrultma tezgâhları.' }
    ]
  },
  {
    id: 'yikamaci',
    category: 'Servis',
    title: 'Yıkamacı / Araç Temizlik Elemanı',
    department: 'Servis',
    reportsTo: 'Servis Müdürü',
    summary: 'Servisten veya satıştan çıkan araçların iç ve dış temizliğini, kuaför ve cilalama işlemlerini özenle yaparak müşteriye pırıl pırıl teslim edilmesini sağlamaktır.',
    tasks: [
      { surec: 'İç ve Dış Araç Yıkama', yetkinlik: 'Oto Temizlik Malzemeleri', davranis: 'Özenli ve Hızlı', raci: 'Sorumlu', kpi: 'Aracın lekesiz teslim edilmesi' },
      { surec: 'Detaylı Temizlik & Kuaför', yetkinlik: 'Döşeme Temizleme ve Cila', davranis: 'Titiz', raci: 'Sorumlu', kpi: 'Müşteri temizlik memnuniyeti' }
    ],
    kpis: [
      { label: 'Araç Başı Temizlik Süresi', value: '< 20 Dakika' },
      { label: 'Temizlik Kusursuzluk Puanı', value: '> %98' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Özen ve Hizmet Anlayışı', aciklama: 'Müşterinin aracına kendi aracı gibi özen gösterme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Basınçlı Yıkama ve Süpürge', aciklama: 'Oto bakım ve detaylı temizlik kimyasalları.' }
    ]
  },

  // ─── 3. YEDEK PARÇA GÖREV TANIMLARI ─────────────────────────────────────────
  {
    id: 'yedek-parca-uzmani',
    category: 'Yedek Parça',
    title: 'Yedek Parça Uzmanı',
    department: 'Yedek Parça',
    reportsTo: 'Yedek Parça Müdürü',
    summary: 'Servis ve dış müşterilerin yedek parça taleplerini katalogdan sorgulamak, doğru parça kodunu tespit etmek, sipariş oluşturmak ve stok seviyelerini optimize etmektir.',
    tasks: [
      { surec: 'Parça Kodu Sorgulama (EPC)', yetkinlik: 'Elektronik Parça Kataloğu', davranis: 'Hatasız', raci: 'Sorumlu', kpi: 'Yanlış parça sipariş hatası (%0)' },
      { surec: 'Servis Atölye Parça Çıkışı', yetkinlik: 'WMS / Depo Modülü', davranis: 'Hızlı', raci: 'Sorumlu', kpi: 'Atölyeye parça verme süresi (< 5 dk)' }
    ],
    kpis: [
      { label: 'Parça Kodu Doğruluk Oranı', value: '%100' },
      { label: 'Stok Bulundurma (Fill-rate) Oranı', value: '> %95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Takip ve Düzen', aciklama: 'Parça raflarının ve stoklarının kontrolü.' }
    ],
    teknikBeceriler: [
      { baslik: 'EPC (Electronic Parts Catalog)', aciklama: 'Marka orijinal yedek parça yazılımları.' }
    ]
  },
  {
    id: 'yedek-parca-muduru',
    category: 'Yedek Parça',
    title: 'Yedek Parça Müdürü',
    department: 'Yedek Parça',
    reportsTo: 'Genel Müdür',
    summary: 'Yedek parça departmanının stok bütçesini, ciro ve kar marjlarını yönetmek, fabrikayla parça sipariş ve ikmal ilişkilerini yürütmektir.',
    tasks: [
      { surec: 'Stok ve Ciro Yönetimi', yetkinlik: 'Stok Bütçeleme & Finans', davranis: 'Stratejik', raci: 'Hesap Veren', kpi: 'Yedek parça ciro ve karlılık hedefi' }
    ],
    kpis: [
      { label: 'Stok Devir Hızı', value: '> 6 Kez / Yıl' },
      { label: 'Yedek Parça Kar Marjı Uyum Oranı', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Tedarik Zinciri Yönetimi', aciklama: 'Minimum stokla maksimum bulunabilirlik sağlama.' }
    ],
    teknikBeceriler: [
      { baslik: 'ERP & Stok Devir Analitiği', aciklama: 'Öngörüsel stok sipariş yazılımları.' }
    ]
  },

  // ─── 4. İNSAN KAYNAKLARI & İDARİ İŞLER ──────────────────────────────────────
  {
    id: 'hr-specialist',
    category: 'İnsan Kaynakları',
    title: 'İnsan Kaynakları Uzmanı',
    department: 'İnsan Kaynakları',
    reportsTo: 'İnsan Kaynakları Müdürü',
    summary: 'Şirketin işe alım, özlük işleri, izin takibi, performans değerlendirme ve eğitim süreçlerinin mevzuata ve şirket prosedürlerine uygun şekilde yürütülmesini sağlar.',
    tasks: [
      { surec: 'Özlük İşleri Takibi', yetkinlik: 'İş Kanunu & SGK Mevzuatı', davranis: 'Titiz ve Gizliliğe Uygun', raci: 'Sorumlu', kpi: 'Özlük dosyalarının eksiksiz tutulması' },
      { surec: 'İşe Alım ve Mülakat', yetkinlik: 'Mülakat Teknikleri', davranis: 'Tarafsız ve İletişim Odaklı', raci: 'Sorumlu', kpi: 'Pozisyon kapatma süresi (Max 30 gün)' }
    ],
    kpis: [
      { label: 'Özlük Dosyası Tamlık Oranı', value: '%100' },
      { label: 'Ortalama İşe Alım Tamamlama Süresi', value: '< 30 Gün' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Etkili İletişim', aciklama: 'Çalışanlar ve yönetim arasında köprü kurma yeteneği.' }
    ],
    teknikBeceriler: [
      { baslik: '4857 Sayılı İş Kanunu', aciklama: 'İş hukuku ve SGK mevzuat bilgisi.' }
    ]
  },

  // ─── 5. MUHASEBE & FİNANS ───────────────────────────────────────────────────
  {
    id: 'muhasebe-elemani',
    category: 'Muhasebe & Finans',
    title: 'Muhasebe Elemanı',
    department: 'Yönetim',
    reportsTo: 'Muhasebe Müdürü',
    summary: 'Alış ve satış faturalarının işlenmesi, cari hesap mutabakatlarının yapılması, kasa/banka kayıtlarının tutulması ve günlük muhasebe evraklarının arşivlenmesinden sorumludur.',
    tasks: [
      { surec: 'Fatura Giriş & Cari Mutabakat', yetkinlik: 'e-Fatura & Genel Muhasebe', davranis: 'Hatasız ve Dikkatli', raci: 'Sorumlu', kpi: 'Fatura işleme doğruluğu (%100)' }
    ],
    kpis: [
      { label: 'Fatura İşleme Doğruluğu', value: '%100' },
      { label: 'Cari Mutabakat Tamamlama', value: '%95' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Detay Odaklılık', aciklama: 'Rakamlar ve belgeler üzerinde hassasiyet.' }
    ],
    teknikBeceriler: [
      { baslik: 'ERP Muhasebe Modülleri', aciklama: 'Fatura ve irsaliye entegrasyonu.' }
    ]
  },
  {
    id: 'muhasebe-muduru',
    category: 'Muhasebe & Finans',
    title: 'Muhasebe Müdürü',
    department: 'Yönetim',
    reportsTo: 'Genel Müdür',
    summary: 'Şirketin mali tablolarının, bilanço ve gelir tablolarının hazırlanması, vergi beyannamelerinin kontrolü, finansal raporlama ve mali denetim süreçlerini yönetmektir.',
    tasks: [
      { surec: 'Mali Tablolar & Vergi Yönetimi', yetkinlik: 'VUK, IFRS & Vergi Mevzuatı', davranis: 'Analitik', raci: 'Hesap Veren', kpi: 'Beyanname ve raporlama %100 zamanında' }
    ],
    kpis: [
      { label: 'Bilanço ve Mizan Kapanış Uyum Oranı', value: '%100' },
      { label: 'Vergi Beyanname Zamanlaması', value: '%100' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Finansal Liderlik', aciklama: 'Şirket bütçe ve kar/zarar yönetimini yönlendirme.' }
    ],
    teknikBeceriler: [
      { baslik: 'İleri Seviye Mali Analiz & VUK', aciklama: 'Vergi mevzuatı ve mali denetim.' }
    ]
  },

  // ─── 6. ÜST YÖNETİM ────────────────────────────────────────────────────────
  {
    id: 'genel-mudur',
    category: 'Üst Yönetim',
    title: 'Genel Müdür',
    department: 'Yönetim',
    reportsTo: 'Bayi Sahibi / Yönetim Kurulu',
    summary: 'Şirketin tüm operasyonel, finansal, satış, servis ve insan kaynakları süreçlerini şirket vizyonu ve yıllık karlılık hedefleri doğrultusunda yönetmek, markanın temsilini en üst düzeyde yapmaktır.',
    tasks: [
      { surec: 'Şirket Stratejisi ve Karlılık Yönetimi', yetkinlik: 'Üst Düzey Yönetim & Bütçe', davranis: 'Lider ve Vizyoner', raci: 'Hesap Veren', kpi: 'Yıllık şirket ciro ve karlılık hedefleri' }
    ],
    kpis: [
      { label: 'Yıllık Şirket Karlılık Hedefi', value: '%100 Uyum' },
      { label: 'Genel Müşteri Memnuniyeti (CSI)', value: '> %96' }
    ],
    yonetselYetkinlikler: [
      { baslik: 'Stratejik Liderlik', aciklama: 'Tüm departmanları ortak hedefe yönlendirme.' }
    ],
    teknikBeceriler: [
      { baslik: 'Kurumsal Yönetim ve Mali Tablolar', aciklama: 'Bilanço, P&L ve finansal yatırım analitiği.' }
    ]
  }
];
