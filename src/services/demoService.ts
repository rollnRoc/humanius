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
  durum: 'bekliyor' | 'onaylandi' | 'reddedildi';
  onaylayan_id: string | null;
  onay_tarihi: string | null;
  red_nedeni: string | null;
  talep_tarihi: string;
  created_at: string;
  updated_at: string;
  employees?: { name: string; department: string };
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
  durum: string; // 'Normal', 'Geç Kaldı', 'İzinli', vb.
  giris_koordinat: string | null;
  cikis_koordinat: string | null;
  created_at: string;
  updated_at: string;
}

// Hazır Mock Veriler (Seed Data)
const MOCK_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'emp-1',
    company_id: 'demo-company-id-9999',
    name: 'Selin Aksoy',
    tc_no: '11223344556',
    sicil_no: 'HR-001',
    department: 'İnsan Kaynakları',
    position: 'İK Müdürü',
    level: 'Manager',
    salary: 75000,
    status: 'active',
    phone: '0555 111 2233',
    email: 'selin.aksoy@demo.com',
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
    email: 'ahmet.yilmaz@demo.com',
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
    id: 'emp-3',
    company_id: 'demo-company-id-9999',
    name: 'Buse Yıldız',
    tc_no: '55667788990',
    sicil_no: 'SLS-001',
    department: 'Satış',
    position: 'Satış Uzmanı',
    level: 'Mid',
    salary: 45000,
    status: 'active',
    phone: '0555 333 4455',
    email: 'buse.yildiz@demo.com',
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
    id: 'emp-4',
    company_id: 'demo-company-id-9999',
    name: 'Can Demir',
    tc_no: '44556677889',
    sicil_no: 'SUP-001',
    department: 'Müşteri İlişkileri',
    position: 'Müşteri Temsilcisi',
    level: 'Junior',
    salary: 35000,
    status: 'onLeave',
    phone: '0555 444 5566',
    email: 'can.demir@demo.com',
    join_date: '2025-05-15',
    address: 'Kartal / İstanbul',
    avatar_url: null,
    skills: ['Destek', 'Problem Çözme', 'CRM'],
    medeni_durum: 'bekar',
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
      durum: 'bekliyor',
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
      aciklama: 'Kişisel işler',
      yol_izni_talep: false,
      yol_izni_gun: 0,
      seyahat_yeri: '',
      il_disi_seyahat: false,
      belge_url: null,
      durum: 'onaylandi',
      onaylayan_id: 'demo-user-id-9999',
      onay_tarihi: format(new Date()),
      red_nedeni: null,
      talep_tarihi: format(new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)),
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
    if (!localStorage.getItem('humanius_demo_employees')) {
      localStorage.setItem('humanius_demo_employees', JSON.stringify(MOCK_EMPLOYEES));
    }
    if (!localStorage.getItem('humanius_demo_izin_talepleri')) {
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
    localStorage.removeItem('humanius_demo_mode');
    localStorage.removeItem('humanius_demo_start_time');
    localStorage.removeItem('humanius_demo_employees');
    localStorage.removeItem('humanius_demo_izin_talepleri');
    localStorage.removeItem('humanius_demo_bordro_items');
    localStorage.removeItem('humanius_demo_pdks');
  },

  // -------------------------------------------------------------
  // CRUD Helpers for Employees
  // -------------------------------------------------------------
  getEmployees(): DemoEmployee[] {
    this.seedDatabase();
    return JSON.parse(localStorage.getItem('humanius_demo_employees') || '[]');
  },

  saveEmployees(list: DemoEmployee[]): void {
    localStorage.setItem('humanius_demo_employees', JSON.stringify(list));
  },

  createEmployee(data: Partial<DemoEmployee>): DemoEmployee {
    const list = this.getEmployees();
    const newEmp: DemoEmployee = {
      id: 'emp-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      name: data.name || 'Yeni Çalışan',
      tc_no: data.tc_no || '',
      sicil_no: data.sicil_no || 'SICIL-' + Math.floor(1000 + Math.random() * 9000),
      department: data.department || 'Genel',
      position: data.position || 'Personel',
      level: data.level || 'Junior',
      salary: data.salary || 30000,
      status: data.status || 'active',
      phone: data.phone || '',
      email: data.email || '',
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
    const idx = list.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Çalışan bulunamadı');
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
        employees: emp ? { name: emp.name, department: emp.department } : undefined
      };
    });
  },

  saveIzinTalepleri(list: DemoIzinTalebi[]): void {
    // Relationships shouldn't be saved
    const cleanList = list.map(({ employees, ...t }) => t);
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
      durum: 'bekliyor',
      onaylayan_id: null,
      onay_tarihi: null,
      red_nedeni: null,
      talep_tarihi: new Date().toISOString().split('T')[0],
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
    if (idx === -1) throw new Error('İzin talebi bulunamadı');
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    this.saveIzinTalepleri(list);
    return list[idx];
  },

  // -------------------------------------------------------------
  // CRUD Helpers for Payroll (Bordro)
  // -------------------------------------------------------------
  getBordrolar(): DemoBordroItem[] {
    this.seedDatabase();
    const list: DemoBordroItem[] = JSON.parse(localStorage.getItem('humanius_demo_bordro_items') || '[]');
    const employees = this.getEmployees();
    return list.map(b => {
      const emp = employees.find(e => e.id === b.employee_id);
      return {
        ...b,
        employees: emp ? { name: emp.name, department: emp.department, tc_no: emp.tc_no } : undefined
      };
    });
  },

  saveBordrolar(list: DemoBordroItem[]): void {
    const cleanList = list.map(({ employees, ...b }) => b);
    localStorage.setItem('humanius_demo_bordro_items', JSON.stringify(cleanList));
  },

  createBordro(data: Partial<DemoBordroItem>): DemoBordroItem {
    const list = this.getBordrolar();
    const newBordro: DemoBordroItem = {
      id: 'bordro-' + Math.random().toString(36).substr(2, 9),
      company_id: 'demo-company-id-9999',
      employee_id: data.employee_id || '',
      yil: data.yil || new Date().getFullYear(),
      ay: data.ay || (new Date().getMonth() + 1),
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
    this.saveBordrolar(list);
    return newBordro;
  },

  updateBordro(id: string, updates: Partial<DemoBordroItem>): DemoBordroItem {
    const list = this.getBordrolar();
    const idx = list.findIndex(b => b.id === id);
    if (idx === -1) throw new Error('Bordro bulunamadı');
    list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
    this.saveBordrolar(list);
    return list[idx];
  },

  // -------------------------------------------------------------
  // CRUD Helpers for PDKS
  // -------------------------------------------------------------
  getPDKSRecords(): DemoPDKSRecord[] {
    this.seedDatabase();
    return JSON.parse(localStorage.getItem('humanius_demo_pdks') || '[]');
  },

  savePDKSRecords(list: DemoPDKSRecord[]): void {
    localStorage.setItem('humanius_demo_pdks', JSON.stringify(list));
  },

  upsertPDKSRecord(data: Partial<DemoPDKSRecord>): DemoPDKSRecord {
    const list = this.getPDKSRecords();
    const today = new Date().toISOString().split('T')[0];
    const empId = data.employee_id || '';
    
    const idx = list.findIndex(r => r.employee_id === empId && r.tarih === today);
    
    if (idx !== -1) {
      // Update existing today record
      list[idx] = { ...list[idx], ...data, updated_at: new Date().toISOString() };
      this.savePDKSRecords(list);
      return list[idx];
    } else {
      // Insert new today record
      const newRec: DemoPDKSRecord = {
        id: 'pdks-' + Math.random().toString(36).substr(2, 9),
        company_id: 'demo-company-id-9999',
        employee_id: empId,
        tarih: today,
        giris_saati: data.giris_saati || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        cikis_saati: data.cikis_saati || null,
        sure_dakika: data.sure_dakika || null,
        durum: data.durum || 'Normal',
        giris_koordinat: data.giris_koordinat || '41.0082, 28.9784',
        cikis_koordinat: data.cikis_koordinat || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      list.push(newRec);
      this.savePDKSRecords(list);
      return newRec;
    }
  }
};
