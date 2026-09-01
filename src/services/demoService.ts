// Humanius HRM — Demo Modu Mock Veritabanı ve CRUD Servisi

export interface DemoEmployee {
  id: string;
  company_id: string;
  name: string;
  tc_no: string;
  sicil_no: string;
  department: string;
  position: string;
  level: 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager';
  salary: number;
  status: 'active' | 'onLeave' | 'inactive';
  phone: string;
  email: string;
  join_date: string;
  address: string;
  avatar_url: string | null;
  skills: string[];
  medeni_durum: 'bekar' | 'evli';
  cocuk_sayisi: number;
  engelli_durumu: 'yok' | 'birinci' | 'ikinci' | 'ucuncu';
  created_at: string;
  updated_at: string;
}

export interface DemoIzinTalebi {
  id: string;
  company_id: string;
  employee_id: string;
  izin_turu: string;
  baslangic_tarihi: string;
  bitis_tarihi: string;
  gun_sayisi: number;
  aciklama: string;
  yol_izni_talep: boolean;
  yol_izni_gun: number;
  seyahat_yeri: string;
  il_disi_seyahat: boolean;
  belge_url: string | null;
  durum: 'beklemede' | 'bekliyor' | 'onaylandi' | 'reddedildi';
  onaylayan_id: string | null;
  onay_tarihi: string | null;
  red_nedeni: string | null;
  talep_tarihi: string;
  created_at: string;
  updated_at: string;
  employees?: { name: string; department: string };
}

export interface DemoIzinHakki {
  id: string;
  company_id: string;
  employee_id: string;
  yil: number;
  toplam_hak: number;
  kullanilan_izin: number;
  kalan_izin: number;
  calisma_yili: number;
  ise_giris_tarihi: string | null;
  hesaplama_tarihi: string;
  mazeret_izin: number;
  hastalik_izin: number;
  idari_izin?: number;
  ekstra_izin?: number;
  hakedis_gecmisi?: {
    id: string;
    izin_turu: string;
    gun_sayisi: number;
    islem_tipi: 'ekle' | 'belirle';
    tarih: string;
    aciklama: string;
    ekleyen: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface DemoBordroItem {
  id: string;
  company_id: string;
  employee_id: string;
  yil: number;
  ay: number;
  brut_maas: number;
  net_maas: number;
  sgk_isci_payi: number;
  issizlik_isci_payi: number;
  gelir_vergisi_matrahi: number;
  kumulatif_gelir_vergisi_matrahi: number;
  gelir_vergisi: number;
  damga_vergisi: number;
  sgk_isveren_payi: number;
  issizlik_isveren_payi: number;
  toplam_isveren_maliyeti: number;
  fazla_mesai_saat: number;
  fazla_mesai_ucreti: number;
  kesintiler: number;
  ek_odemeler: number;
  durum: 'taslak' | 'onay_bekliyor' | 'onaylandi' | 'odendi';
  onay_kodu: string | null;
  onay_tarihi: string | null;
  created_at: string;
  updated_at: string;
  employees?: { name: string; department: string; tc_no: string };
}

export interface DemoPDKSRecord {
  id: string;
  company_id: string;
  employee_id: string;
  tarih: string;
  giris_saati: string;
  cikis_saati: string | null;
  sure_dakika: number | null;
  durum: string;
  giris_koordinat: string | null;
  cikis_koordinat: string | null;
  created_at: string;
  updated_at: string;
}

// Zenginleştirilmiş Personellik Hazır Veri Seti (Tüm E-postalar @humanius.net)
const MOCK_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'emp-0',
    company_id: 'demo-company-id-9999',
    name: 'Beyza Yıldırım',
    tc_no: '10000000001',
    sicil_no: 'CEO-001',
    department: 'Genel Yönetim',
    position: 'Genel Müdür & CEO',
    level: 'Manager',
    salary: 120000,
    status: 'active',
    phone: '0555 100 0000',
    email: 'beyza.yildirim@humanius.net',
    join_date: '2020-01-01',
    address: 'Levent / İstanbul',
    avatar_url: null,
    skills: ['Kurumsal Liderlik', 'Stratejik Yönetim', 'İş Geliştirme'],
    medeni_durum: 'evli',
    cocuk_sayisi: 2,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-1',
    company_id: 'demo-company-id-9999',
    name: 'Selin Aksoy',
    tc_no: '11223344556',
    sicil_no: 'HR-001',
    department: 'İnsan Kaynakları',
    position: 'İnsan Kaynakları Müdürü',
    level: 'Manager',
    salary: 75000,
    status: 'active',
    phone: '0555 111 2233',
    email: 'selin.aksoy@humanius.net',
    join_date: '2022-04-15',
    address: 'Beşiktaş / İstanbul',
    avatar_url: null,
    skills: ['İş Hukuku', 'Bordrolama', 'Performans Yönetimi'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-10',
    company_id: 'demo-company-id-9999',
    name: 'Burak Aydın',
    tc_no: '67890123456',
    sicil_no: 'ENG-000',
    department: 'Yazılım',
    position: 'Yazılım & Ürün Müdürü',
    level: 'Manager',
    salary: 82000,
    status: 'active',
    phone: '0555 000 1122',
    email: 'burak.aydin@humanius.net',
    join_date: '2021-05-01',
    address: 'Sarıyer / İstanbul',
    avatar_url: null,
    skills: ['Agile', 'Scrum', 'Ürün Stratejisi', 'Yazılım Mimarisi'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-2',
    company_id: 'demo-company-id-9999',
    name: 'Ahmet Yılmaz',
    tc_no: '99887766554',
    sicil_no: 'ENG-001',
    department: 'Yazılım',
    position: 'Kıdemli Yazılım Geliştirici',
    level: 'Senior',
    salary: 65000,
    status: 'active',
    phone: '0555 222 3344',
    email: 'ahmet.yilmaz@humanius.net',
    join_date: '2023-01-10',
    address: 'Kadıköy / İstanbul',
    avatar_url: null,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-11',
    company_id: 'demo-company-id-9999',
    name: 'Deniz Yıldırım',
    tc_no: '78901234567',
    sicil_no: 'ENG-004',
    department: 'Yazılım',
    position: 'Kıdemli UI/UX Tasarımcı',
    level: 'Senior',
    salary: 60000,
    status: 'active',
    phone: '0555 123 4567',
    email: 'deniz.yildirim@humanius.net',
    join_date: '2023-08-15',
    address: 'Beyoğlu / İstanbul',
    avatar_url: null,
    skills: ['Figma', 'UI Design', 'UX Research', 'Design Systems'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-12',
    company_id: 'demo-company-id-9999',
    name: 'Hakan Koç',
    tc_no: '89012345678',
    sicil_no: 'SLS-001',
    department: 'Satış',
    position: 'Satış Direktörü',
    level: 'Manager',
    salary: 95000,
    status: 'active',
    phone: '0555 234 5678',
    email: 'hakan.koc@humanius.net',
    join_date: '2020-01-15',
    address: 'Göktürk / İstanbul',
    avatar_url: null,
    skills: ['Stratejik Satış', 'Müşteri Portföyü', 'Liderlik'],
    medeni_durum: 'evli',
    cocuk_sayisi: 2,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-3',
    company_id: 'demo-company-id-9999',
    name: 'Buse Yıldız',
    tc_no: '55667788990',
    sicil_no: 'SLS-002',
    department: 'Satış',
    position: 'Satış Uzmanı',
    level: 'Mid',
    salary: 45000,
    status: 'active',
    phone: '0555 333 4455',
    email: 'buse.yildiz@humanius.net',
    join_date: '2024-03-01',
    address: 'Şişli / İstanbul',
    avatar_url: null,
    skills: ['B2B Satış', 'Müşteri Yönetimi', 'Pazarlama'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-7',
    company_id: 'demo-company-id-9999',
    name: 'Elif Şahin',
    tc_no: '34567890123',
    sicil_no: 'MKT-001',
    department: 'Pazarlama',
    position: 'Pazarlama Müdürü',
    level: 'Manager',
    salary: 68000,
    status: 'active',
    phone: '0555 777 8899',
    email: 'elif.sahin@humanius.net',
    join_date: '2023-06-01',
    address: 'Bakırköy / İstanbul',
    avatar_url: null,
    skills: ['Pazarlama Stratejisi', 'SEO', 'Sosyal Medya', 'Google Ads'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-15',
    company_id: 'demo-company-id-9999',
    name: 'Sibel Çetin',
    tc_no: '13579246801',
    sicil_no: 'MKT-002',
    department: 'Pazarlama',
    position: 'Kurumsal İletişim Uzmanı',
    level: 'Mid',
    salary: 46000,
    status: 'active',
    phone: '0555 567 8901',
    email: 'sibel.cetin@humanius.net',
    join_date: '2023-11-01',
    address: 'Karaköy / İstanbul',
    avatar_url: null,
    skills: ['Basın Bülteni', 'Etkinlik Yönetimi', 'İç İletişim'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-5',
    company_id: 'demo-company-id-9999',
    name: 'Zeynep Kaya',
    tc_no: '12345678901',
    sicil_no: 'FIN-001',
    department: 'Finans & Muhasebe',
    position: 'Finans & Muhasebe Müdürü',
    level: 'Manager',
    salary: 80000,
    status: 'active',
    phone: '0555 555 6677',
    email: 'zeynep.kaya@humanius.net',
    join_date: '2021-09-01',
    address: 'Ataşehir / İstanbul',
    avatar_url: null,
    skills: ['Bütçe Planlama', 'Bordrolama', 'SAP', 'Vergi Mevzuatı'],
    medeni_durum: 'evli',
    cocuk_sayisi: 2,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-13',
    company_id: 'demo-company-id-9999',
    name: 'Fatma Ünal',
    tc_no: '90123456789',
    sicil_no: 'FIN-002',
    department: 'Finans & Muhasebe',
    position: 'Genel Muhasebe Uzmanı',
    level: 'Mid',
    salary: 48000,
    status: 'active',
    phone: '0555 345 6789',
    email: 'fatma.unal@humanius.net',
    join_date: '2023-04-10',
    address: 'Zeytinburnu / İstanbul',
    avatar_url: null,
    skills: ['Genel Muhasebe', 'Fatura', 'E-Fatura', 'Beyannameler'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-6',
    company_id: 'demo-company-id-9999',
    name: 'Murat Öztürk',
    tc_no: '23456789012',
    sicil_no: 'OPS-001',
    department: 'Operasyon & Lojistik',
    position: 'Operasyon Müdürü',
    level: 'Manager',
    salary: 70000,
    status: 'active',
    phone: '0555 666 7788',
    email: 'murat.ozturk@humanius.net',
    join_date: '2022-02-15',
    address: 'Ümraniye / İstanbul',
    avatar_url: null,
    skills: ['Tedarik Zinciri', 'Lojistik Yönetimi', 'Süreç İyileştirme'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-20',
    company_id: 'demo-company-id-9999',
    name: 'Volkan Doğan',
    tc_no: '68024680246',
    sicil_no: 'OPS-002',
    department: 'Operasyon & Lojistik',
    position: 'Saha ve Depo Sorumlusu',
    level: 'Mid',
    salary: 41000,
    status: 'active',
    phone: '0555 012 3456',
    email: 'volkan.dogan@humanius.net',
    join_date: '2023-05-20',
    address: 'Sancaktepe / İstanbul',
    avatar_url: null,
    skills: ['Stok Takibi', 'Depo Yönetimi', 'Sevkiyat'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-4',
    company_id: 'demo-company-id-9999',
    name: 'Can Demir',
    tc_no: '44556677889',
    sicil_no: 'SUP-001',
    department: 'Müşteri İlişkileri',
    position: 'Müşteri İlişkileri Müdürü',
    level: 'Manager',
    salary: 55000,
    status: 'active',
    phone: '0555 444 5566',
    email: 'can.demir@humanius.net',
    join_date: '2023-05-15',
    address: 'Kartal / İstanbul',
    avatar_url: null,
    skills: ['Müşteri Yönetimi', 'Problem Çözme', 'CRM Stratejisi'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-8',
    company_id: 'demo-company-id-9999',
    name: 'Emre Arslan',
    tc_no: '45678901234',
    sicil_no: 'ENG-002',
    department: 'Yazılım',
    position: 'DevOps & Sistem Yöneticisi',
    level: 'Senior',
    salary: 68000,
    status: 'active',
    phone: '0555 888 9900',
    email: 'emre.arslan@humanius.net',
    join_date: '2022-11-20',
    address: 'Maltepe / İstanbul',
    avatar_url: null,
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-9',
    company_id: 'demo-company-id-9999',
    name: 'Gamze Çelik',
    tc_no: '56789012345',
    sicil_no: 'HR-002',
    department: 'İnsan Kaynakları',
    position: 'İK Uzman Yardımcısı',
    level: 'Junior',
    salary: 38000,
    status: 'active',
    phone: '0555 999 0011',
    email: 'gamze.celik@humanius.net',
    join_date: '2024-09-10',
    address: 'Pendik / İstanbul',
    avatar_url: null,
    skills: ['İşe Alım', 'Oryantasyon', 'Özlük İşleri'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-14',
    company_id: 'demo-company-id-9999',
    name: 'Onur Yalçın',
    tc_no: '01234567890',
    sicil_no: 'ENG-003',
    department: 'Yazılım',
    position: 'Kalite Güvence (QA) Mühendisi',
    level: 'Mid',
    salary: 52000,
    status: 'active',
    phone: '0555 456 7890',
    email: 'onur.yalcin@humanius.net',
    join_date: '2024-01-15',
    address: 'Gaziosmanpaşa / İstanbul',
    avatar_url: null,
    skills: ['Cypress', 'Selenium', 'API Testi', 'Manuel Test'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-16',
    company_id: 'demo-company-id-9999',
    name: 'Özgür Polat',
    tc_no: '24680135792',
    sicil_no: 'PRD-001',
    department: 'Üretim & İmalat',
    position: 'Üretim & Montaj Sorumlusu',
    level: 'Mid',
    salary: 42000,
    status: 'active',
    phone: '0555 678 9012',
    email: 'ozgur.polat@humanius.net',
    join_date: '2022-07-20',
    address: 'Tuzla / İstanbul',
    avatar_url: null,
    skills: ['İSG', 'Mekanik Montaj', 'Kalite Kontrol'],
    medeni_durum: 'evli',
    cocuk_sayisi: 2,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-17',
    company_id: 'demo-company-id-9999',
    name: 'Ebru Erdoğan',
    tc_no: '35791357913',
    sicil_no: 'DAT-001',
    department: 'Yazılım',
    position: 'Kıdemli Veri Analisti',
    level: 'Senior',
    salary: 64000,
    status: 'active',
    phone: '0555 789 0123',
    email: 'ebru.erdogan@humanius.net',
    join_date: '2023-02-15',
    address: 'Üsküdar / İstanbul',
    avatar_url: null,
    skills: ['SQL', 'Python', 'Power BI', 'Veri Modelleme'],
    medeni_durum: 'bekar',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-18',
    company_id: 'demo-company-id-9999',
    name: 'Serkan Kurt',
    tc_no: '46802468024',
    sicil_no: 'SEC-001',
    department: 'Yazılım',
    position: 'Siber Güvenlik Uzmanı',
    level: 'Senior',
    salary: 69000,
    status: 'active',
    phone: '0555 890 1234',
    email: 'serkan.kurt@humanius.net',
    join_date: '2022-10-01',
    address: 'Beylikdüzü / İstanbul',
    avatar_url: null,
    skills: ['Ağ Güvenliği', 'KVKK', 'Sızma Testi', 'ISO 27001'],
    medeni_durum: 'evli',
    cocuk_sayisi: 1,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'emp-19',
    company_id: 'demo-company-id-9999',
    name: 'Merve Aslan',
    tc_no: '57913579135',
    sicil_no: 'LEG-001',
    department: 'Hukuk & Uyum',
    position: 'Hukuk ve Uyum Müşaviri',
    level: 'Lead',
    salary: 76000,
    status: 'active',
    phone: '0555 901 2345',
    email: 'merve.aslan@humanius.net',
    join_date: '2021-03-15',
    address: 'Nişantaşı / İstanbul',
    avatar_url: null,
    skills: ['İş Hukuku', 'Sözleşmeler', 'KVKK', 'Arabuluculuk'],
    medeni_durum: 'evli',
    cocuk_sayisi: 0,
    engelli_durumu: 'yok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const MOCK_IZIN_TALEPLERI = (): DemoIzinTalebi[] => {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split('T')[0];
  
  return [
    {
      id: 'izin-1',
      company_id: 'demo-company-id-9999',
      employee_id: 'emp-2',
      izin_turu: 'yillik',
      baslangic_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      bitis_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)),
      gun_sayisi: 3,
      aciklama: 'Yıllık izin dinlenme',
      yol_izni_talep: false,
      yol_izni_gun: 0,
      seyahat_yeri: '',
      il_disi_seyahat: false,
      belge_url: null,
      durum: 'beklemede',
      onaylayan_id: null,
      onay_tarihi: null,
      red_nedeni: null,
      talep_tarihi: format(new Date()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'izin-2',
      company_id: 'demo-company-id-9999',
      employee_id: 'emp-4',
      izin_turu: 'mazeret',
      baslangic_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2)),
      bitis_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate())),
      gun_sayisi: 2,
      aciklama: 'Kişisel ailevi mazeret',
      yol_izni_talep: false,
      yol_izni_gun: 0,
      seyahat_yeri: '',
      il_disi_seyahat: false,
      belge_url: null,
      durum: 'onaylandi',
      onaylayan_id: 'emp-1',
      onay_tarihi: format(new Date()),
      red_nedeni: null,
      talep_tarihi: format(new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'izin-3',
      company_id: 'demo-company-id-9999',
      employee_id: 'emp-7',
      izin_turu: 'yillik',
      baslangic_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)),
      bitis_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 17)),
      gun_sayisi: 5,
      aciklama: 'Yaz tatili yıllık izni',
      yol_izni_talep: true,
      yol_izni_gun: 2,
      seyahat_yeri: 'Bodrum / Muğla',
      il_disi_seyahat: true,
      belge_url: null,
      durum: 'onaylandi',
      onaylayan_id: 'emp-1',
      onay_tarihi: format(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      red_nedeni: null,
      talep_tarihi: format(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'izin-4',
      company_id: 'demo-company-id-9999',
      employee_id: 'emp-11',
      izin_turu: 'hastalik',
      baslangic_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)),
      bitis_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
      gun_sayisi: 2,
      aciklama: 'Doktor raporlu istirahat',
      yol_izni_talep: false,
      yol_izni_gun: 0,
      seyahat_yeri: '',
      il_disi_seyahat: false,
      belge_url: null,
      durum: 'onaylandi',
      onaylayan_id: 'emp-1',
      onay_tarihi: format(new Date()),
      red_nedeni: null,
      talep_tarihi: format(new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000)),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'izin-5',
      company_id: 'demo-company-id-9999',
      employee_id: 'emp-14',
      izin_turu: 'yillik',
      baslangic_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 15)),
      bitis_tarihi: format(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 20)),
      gun_sayisi: 4,
      aciklama: 'Şehir dışı aile ziyareti',
      yol_izni_talep: false,
      yol_izni_gun: 0,
      seyahat_yeri: 'Ankara',
      il_disi_seyahat: true,
      belge_url: null,
      durum: 'beklemede',
      onaylayan_id: null,
      onay_tarihi: null,
      red_nedeni: null,
      talep_tarihi: format(new Date()),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
};

export const demoService = {
  isDemoActive(): boolean {
    return localStorage.getItem('humanius_demo_mode') === 'true';
  },

  seedDatabase(): void {
    const existingEmpsStr = localStorage.getItem('humanius_demo_employees');
    let needsRefresh = false;

    if (!existingEmpsStr) {
      needsRefresh = true;
    } else {
      try {
        const parsed: DemoEmployee[] = JSON.parse(existingEmpsStr);
        // Refresh if missing Beyza Yıldırım or count mismatch
        if (!parsed.some(e => e.name === 'Beyza Yıldırım') || parsed.some(e => e.name === 'Hakan Hizel') || parsed.length < 15) {
          needsRefresh = true;
        }
      } catch {
        needsRefresh = true;
      }
    }

    if (needsRefresh) {
      localStorage.setItem('humanius_demo_employees', JSON.stringify(MOCK_EMPLOYEES));
      localStorage.setItem('humanius_demo_izin_talepleri', JSON.stringify(MOCK_IZIN_TALEPLERI()));
    }

    if (!localStorage.getItem('humanius_demo_bordro_items')) {
      localStorage.setItem('humanius_demo_bordro_items', JSON.stringify([]));
    }
    if (!localStorage.getItem('humanius_demo_pdks')) {
      localStorage.setItem('humanius_demo_pdks', JSON.stringify([]));
    }
  },

  clearDatabase(): void {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('humanius_demo_') || 
          key.startsWith('humanius_demo') ||
          key === 'humanius_demo_mode' ||
          key.startsWith('humanius_signed_docs_demo') ||
          key.startsWith('humanius_kvkk_controls_demo') ||
          key.startsWith('humanius_egitimler_demo') ||
          key.startsWith('humanius_sertifikalar_demo') ||
          key.startsWith('humanius_workflow_tasks_demo') ||
          key.startsWith('humanius_izin_turleri_demo')
        )) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.error('Error clearing demo database:', err);
    }
  },

  // -------------------------------------------------------------
  // CRUD Helpers for Employees
  // -------------------------------------------------------------
  getEmployees(): DemoEmployee[] {
    this.seedDatabase();
    let emps: DemoEmployee[] = JSON.parse(localStorage.getItem('humanius_demo_employees') || '[]');
    
    // Automatically sanitize all @demo.com emails to @humanius.net and purge Hakan Hizel if cached
    let modified = false;
    emps = emps.filter(e => e.name !== 'Hakan Hizel');
    emps = emps.map(emp => {
      if (emp.email && emp.email.includes('@demo.com')) {
        modified = true;
        return { ...emp, email: emp.email.replace(/@demo\.com/g, '@humanius.net') };
      }
      return emp;
    });

    if (modified) {
      this.saveEmployees(emps);
    }

    return emps;
  },

  saveEmployees(list: DemoEmployee[]): void {
    const cleanList = list.map(emp => {
      if (emp.email && emp.email.includes('@demo.com')) {
        return { ...emp, email: emp.email.replace(/@demo\.com/g, '@humanius.net') };
      }
      return emp;
    });
    localStorage.setItem('humanius_demo_employees', JSON.stringify(cleanList));
  },

  createEmployee(data: Partial<DemoEmployee>): DemoEmployee {
    const list = this.getEmployees();
    let rawEmail = data.email || '';
    if (rawEmail.includes('@demo.com')) {
      rawEmail = rawEmail.replace(/@demo\.com/g, '@humanius.net');
    }

    const newEmp: DemoEmployee = {
      id: 'emp-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      name: data.name || 'Yeni Çalışan',
      tc_no: data.tc_no || '',
      sicil_no: data.sicil_no || 'SICIL-' + Math.floor(1000 + Math.random() * 9000),
      department: data.department || 'Genel',
      position: data.position || 'Personel',
      level: data.level || '',
      salary: data.salary || 30000,
      status: data.status || 'active',
      phone: data.phone || '',
      email: rawEmail,
      join_date: data.join_date || new Date().toISOString().split('T')[0],
      address: data.address || '',
      avatar_url: null,
      skills: data.skills || [],
      medeni_durum: data.medeni_durum || 'bekar',
      cocuk_sayisi: data.cocuk_sayisi || 0,
      engelli_durumu: data.engelli_durumu || 'yok',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(newEmp);
    this.saveEmployees(list);
    return newEmp;
  },

  updateEmployee(id: string, updates: Partial<DemoEmployee>): DemoEmployee {
    const list = this.getEmployees();
    if (updates.email && updates.email.includes('@demo.com')) {
      updates.email = updates.email.replace(/@demo\.com/g, '@humanius.net');
    }

    let idx = list.findIndex(e => e.id === id);
    if (idx === -1 && updates.email) {
      idx = list.findIndex(e => e.email?.toLowerCase().trim() === updates.email?.toLowerCase().trim());
    }
    if (idx === -1 && updates.name) {
      idx = list.findIndex(e => e.name?.toLowerCase().trim() === updates.name?.toLowerCase().trim());
    }
    if (idx === -1) {
      const newEmp: DemoEmployee = {
        id: id || 'emp-' + Math.random().toString(36).substr(2, 9),
        company_id: updates.company_id || 'demo-company-id-9999',
        name: updates.name || '',
        tc_no: updates.tc_no || '',
        sicil_no: updates.sicil_no || '',
        department: updates.department || '',
        position: updates.position || '',
        level: (updates.level as any) || '',
        salary: updates.salary || 0,
        status: (updates.status as any) || 'active',
        phone: updates.phone || '',
        email: updates.email || '',
        join_date: updates.join_date || new Date().toISOString().split('T')[0],
        address: updates.address || '',
        avatar_url: null,
        skills: updates.skills || [],
        medeni_durum: updates.medeni_durum || 'bekar',
        cocuk_sayisi: updates.cocuk_sayisi || 0,
        engelli_durumu: updates.engelli_durumu || 'yok',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newEmp);
      this.saveEmployees(list);
      return newEmp;
    }
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    this.saveEmployees(list);
    return list[idx];
  },

  deleteEmployee(id: string): void {
    const list = this.getEmployees();
    this.saveEmployees(list.filter(e => e.id !== id));
  },

  // -------------------------------------------------------------
  // CRUD Helpers for Leave Requests (İzin Talepleri)
  // -------------------------------------------------------------
  getIzinTalepleri(): DemoIzinTalebi[] {
    this.seedDatabase();
    const talepler: DemoIzinTalebi[] = JSON.parse(localStorage.getItem('humanius_demo_izin_talepleri') || '[]');
    const employees = this.getEmployees();
    return talepler.map(t => {
      const emp = employees.find(e => e.id === t.employee_id);
      return {
        ...t,
        durum: (t.durum as any) === 'bekliyor' ? 'beklemede' : t.durum,
        employees: emp ? { name: emp.name, department: emp.department } : undefined
      };
    });
  },

  saveIzinTalepleri(list: DemoIzinTalebi[]): void {
    const cleanList = list.map(({ employees, ...t }) => ({
      ...t,
      durum: (t.durum as any) === 'bekliyor' ? 'beklemede' : t.durum
    }));
    localStorage.setItem('humanius_demo_izin_talepleri', JSON.stringify(cleanList));
  },

  createIzinTalebi(data: Partial<DemoIzinTalebi>): DemoIzinTalebi {
    const list = this.getIzinTalepleri();
    const newTalep: DemoIzinTalebi = {
      id: 'izin-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      employee_id: data.employee_id || '',
      izin_turu: data.izin_turu || 'yillik',
      baslangic_tarihi: data.baslangic_tarihi || '',
      bitis_tarihi: data.bitis_tarihi || '',
      gun_sayisi: data.gun_sayisi || 1,
      aciklama: data.aciklama || '',
      yol_izni_talep: data.yol_izni_talep || false,
      yol_izni_gun: data.yol_izni_gun || 0,
      seyahat_yeri: data.seyahat_yeri || '',
      il_disi_seyahat: data.il_disi_seyahat || false,
      belge_url: null,
      durum: (data.durum as any) === 'bekliyor' ? 'beklemede' : (data.durum || 'beklemede'),
      onaylayan_id: data.onaylayan_id || null,
      onay_tarihi: data.onay_tarihi || null,
      red_nedeni: data.red_nedeni || null,
      talep_tarihi: data.talep_tarihi || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(newTalep);
    this.saveIzinTalepleri(list);
    return newTalep;
  },

  updateIzinTalebi(id: string, updates: Partial<DemoIzinTalebi>): DemoIzinTalebi {
    const list = this.getIzinTalepleri();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) {
      throw new Error('İzin talebi bulunamadı');
    }
    const updated = {
      ...list[idx],
      ...updates,
      durum: (updates.durum as any) === 'bekliyor' ? 'beklemede' : (updates.durum || list[idx].durum),
      updated_at: new Date().toISOString()
    };
    list[idx] = updated;
    this.saveIzinTalepleri(list);
    return updated;
  },

  deleteIzinTalebi(id: string): void {
    const list = this.getIzinTalepleri();
    this.saveIzinTalepleri(list.filter(t => t.id !== id));
  },

  // -------------------------------------------------------------
  // CRUD & Management Helpers for Leave Entitlements (İzin Hakları / Hakediş)
  // -------------------------------------------------------------
  getIzinHaklari(yil?: number): DemoIzinHakki[] {
    this.seedDatabase();
    const currentYear = yil || new Date().getFullYear();
    const employees = this.getEmployees();
    const stored: DemoIzinHakki[] = JSON.parse(localStorage.getItem('humanius_demo_izin_haklari') || '[]');
    const talepler = this.getIzinTalepleri();

    // Map each employee, using stored hak or calculating default based on labor law (4857 s.K.)
    const result: DemoIzinHakki[] = employees.map(emp => {
      const existing = stored.find(s => s.employee_id === emp.id && s.yil === currentYear);

      const joinDate = emp.join_date ? new Date(emp.join_date) : new Date();
      const calismaYili = Math.max(0, currentYear - joinDate.getFullYear());
      let defaultHak = 14;
      if (calismaYili >= 5 && calismaYili < 15) defaultHak = 20;
      else if (calismaYili >= 15) defaultHak = 26;

      const toplamHak = existing ? existing.toplam_hak : defaultHak;
      const mazeretHak = existing ? existing.mazeret_izin : 5;
      const idariHak = existing?.idari_izin || 0;
      const ekstraHak = existing?.ekstra_izin || 0;

      // Used annual leaves for this employee
      const used = talepler
        .filter(t => t.employee_id === emp.id && t.durum === 'onaylandi' && t.izin_turu === 'yillik' && new Date(t.baslangic_tarihi).getFullYear() === currentYear)
        .reduce((sum, t) => sum + (t.gun_sayisi || 0) + (t.yol_izni_talep ? (t.yol_izni_gun || 0) : 0), 0);

      const remaining = Math.max(0, toplamHak - used);

      return {
        id: existing?.id || 'hak-' + emp.id + '-' + currentYear,
        company_id: 'demo-company-id-9999',
        employee_id: emp.id,
        yil: currentYear,
        toplam_hak: toplamHak,
        kullanilan_izin: used,
        kalan_izin: remaining,
        calisma_yili: calismaYili,
        ise_giris_tarihi: emp.join_date,
        hesaplama_tarihi: existing?.hesaplama_tarihi || new Date().toISOString(),
        mazeret_izin: mazeretHak,
        hastalik_izin: existing?.hastalik_izin || 10,
        idari_izin: idariHak,
        ekstra_izin: ekstraHak,
        hakedis_gecmisi: existing?.hakedis_gecmisi || [],
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: existing?.updated_at || new Date().toISOString()
      };
    });

    return result;
  },

  saveIzinHaklari(list: DemoIzinHakki[]): void {
    localStorage.setItem('humanius_demo_izin_haklari', JSON.stringify(list));
  },

  createOrUpdateIzinHakki(data: Partial<DemoIzinHakki>): DemoIzinHakki {
    const yil = data.yil || new Date().getFullYear();
    const list = this.getIzinHaklari(yil);
    const idx = list.findIndex(h => h.employee_id === data.employee_id && h.yil === yil);

    const now = new Date().toISOString();
    let updated: DemoIzinHakki;

    if (idx >= 0) {
      updated = {
        ...list[idx],
        ...data,
        updated_at: now
      };
      list[idx] = updated;
    } else {
      updated = {
        id: data.id || 'hak-' + data.employee_id + '-' + yil,
        company_id: 'demo-company-id-9999',
        employee_id: data.employee_id || '',
        yil,
        toplam_hak: data.toplam_hak || 14,
        kullanilan_izin: data.kullanilan_izin || 0,
        kalan_izin: Math.max(0, (data.toplam_hak || 14) - (data.kullanilan_izin || 0)),
        calisma_yili: data.calisma_yili || 1,
        ise_giris_tarihi: data.ise_giris_tarihi || null,
        hesaplama_tarihi: now,
        mazeret_izin: data.mazeret_izin || 5,
        hastalik_izin: data.hastalik_izin || 10,
        idari_izin: data.idari_izin || 0,
        ekstra_izin: data.ekstra_izin || 0,
        hakedis_gecmisi: data.hakedis_gecmisi || [],
        created_at: now,
        updated_at: now
      };
      list.push(updated);
    }

    this.saveIzinHaklari(list);
    return updated;
  },

  addIzinHakedis(params: {
    employeeId: string;
    izinTuru: string;
    gunSayisi: number;
    islemTipi: 'ekle' | 'belirle';
    yil?: number;
    aciklama?: string;
    ekleyen?: string;
  }): DemoIzinHakki {
    const yil = params.yil || new Date().getFullYear();
    const haklar = this.getIzinHaklari(yil);
    const existing = haklar.find(h => h.employee_id === params.employeeId && h.yil === yil);

    let currentToplam = existing ? existing.toplam_hak : 14;
    let currentMazeret = existing ? existing.mazeret_izin : 5;
    let currentIdari = existing?.idari_izin || 0;
    let currentEkstra = existing?.ekstra_izin || 0;

    const gun = Number(params.gunSayisi) || 0;

    if (params.izinTuru === 'yillik') {
      currentToplam = params.islemTipi === 'ekle' ? currentToplam + gun : gun;
    } else if (params.izinTuru === 'mazeret') {
      currentMazeret = params.islemTipi === 'ekle' ? currentMazeret + gun : gun;
    } else if (params.izinTuru === 'idari') {
      currentIdari = params.islemTipi === 'ekle' ? currentIdari + gun : gun;
    } else {
      currentEkstra = params.islemTipi === 'ekle' ? currentEkstra + gun : gun;
    }

    const gecmisItem = {
      id: 'hkh-' + Math.random().toString(36).substr(2, 9),
      izin_turu: params.izinTuru,
      gun_sayisi: gun,
      islem_tipi: params.islemTipi,
      tarih: new Date().toISOString(),
      aciklama: params.aciklama || 'Yönetici tarafından tanımlandı',
      ekleyen: params.ekleyen || 'Şirket Yöneticisi'
    };

    const gecmis = existing?.hakedis_gecmisi ? [gecmisItem, ...existing.hakedis_gecmisi] : [gecmisItem];

    return this.createOrUpdateIzinHakki({
      employee_id: params.employeeId,
      yil,
      toplam_hak: currentToplam,
      mazeret_izin: currentMazeret,
      idari_izin: currentIdari,
      ekstra_izin: currentEkstra,
      hakedis_gecmisi: gecmis
    });
  },

  // -------------------------------------------------------------
  // CRUD Helpers for Bordro Items
  // -------------------------------------------------------------
  getBordroItems(): DemoBordroItem[] {
    this.seedDatabase();
    const items: DemoBordroItem[] = JSON.parse(localStorage.getItem('humanius_demo_bordro_items') || '[]');
    const employees = this.getEmployees();
    return items.map(b => {
      const emp = employees.find(e => e.id === b.employee_id);
      return {
        ...b,
        employees: emp ? { name: emp.name, department: emp.department, tc_no: emp.tc_no } : undefined
      };
    });
  },

  saveBordroItems(list: DemoBordroItem[]): void {
    const cleanList = list.map(({ employees, ...b }) => b);
    localStorage.setItem('humanius_demo_bordro_items', JSON.stringify(cleanList));
  },

  createBordroItem(data: Partial<DemoBordroItem>): DemoBordroItem {
    const list = this.getBordroItems();
    const newBordro: DemoBordroItem = {
      id: 'bordro-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      employee_id: data.employee_id || '',
      yil: data.yil || new Date().getFullYear(),
      ay: data.ay || new Date().getMonth() + 1,
      brut_maas: data.brut_maas || 0,
      net_maas: data.net_maas || 0,
      sgk_isci_payi: data.sgk_isci_payi || 0,
      issizlik_isci_payi: data.issizlik_isci_payi || 0,
      gelir_vergisi_matrahi: data.gelir_vergisi_matrahi || 0,
      kumulatif_gelir_vergisi_matrahi: data.kumulatif_gelir_vergisi_matrahi || 0,
      gelir_vergisi: data.gelir_vergisi || 0,
      damga_vergisi: data.damga_vergisi || 0,
      sgk_isveren_payi: data.sgk_isveren_payi || 0,
      issizlik_isveren_payi: data.issizlik_isveren_payi || 0,
      toplam_isveren_maliyeti: data.toplam_isveren_maliyeti || 0,
      fazla_mesai_saat: data.fazla_mesai_saat || 0,
      fazla_mesai_ucreti: data.fazla_mesai_ucreti || 0,
      kesintiler: data.kesintiler || 0,
      ek_odemeler: data.ek_odemeler || 0,
      durum: data.durum || 'taslak',
      onay_kodu: data.onay_kodu || null,
      onay_tarihi: data.onay_tarihi || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(newBordro);
    this.saveBordroItems(list);
    return newBordro;
  },

  updateBordroItem(id: string, updates: Partial<DemoBordroItem>): DemoBordroItem {
    const list = this.getBordroItems();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) {
      throw new Error('Bordro kaydı bulunamadı');
    }
    const updated = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    list[idx] = updated;
    this.saveBordroItems(list);
    return updated;
  },

  deleteBordroItem(id: string): void {
    const list = this.getBordroItems();
    this.saveBordroItems(list.filter(b => b.id !== id));
  },

  // -------------------------------------------------------------
  // CRUD Helpers for PDKS Records
  // -------------------------------------------------------------
  getPDKSRecords(): DemoPDKSRecord[] {
    this.seedDatabase();
    return JSON.parse(localStorage.getItem('humanius_demo_pdks') || '[]');
  },

  savePDKSRecords(list: DemoPDKSRecord[]): void {
    localStorage.setItem('humanius_demo_pdks', JSON.stringify(list));
  },

  createPDKSRecord(data: Partial<DemoPDKSRecord>): DemoPDKSRecord {
    const list = this.getPDKSRecords();
    const newRecord: DemoPDKSRecord = {
      id: 'pdks-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      employee_id: data.employee_id || '',
      tarih: data.tarih || new Date().toISOString().split('T')[0],
      giris_saati: data.giris_saati || '09:00',
      cikis_saati: data.cikis_saati || '18:00',
      sure_dakika: data.sure_dakika || 540,
      durum: data.durum || 'Normal',
      giris_koordinat: data.giris_koordinat || null,
      cikis_koordinat: data.cikis_koordinat || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    list.push(newRecord);
    this.savePDKSRecords(list);
    return newRecord;
  }
};
