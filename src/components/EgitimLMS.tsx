import React, { useState, useMemo, useEffect } from 'react';
import { BookOpen, Award, CheckCircle, Users, Plus, Search, ChevronRight, X, Trash2, Edit2, Sparkles, UserCheck, Check, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Employee } from '../types';
import { lmsService } from '../services/lmsService';

export interface Egitim {
  id: string;
  baslik: string;
  kategori: string;
  seviye: 'baslangic' | 'orta' | 'ileri';
  aciklama: string;
  egitmen: string;
  tur: 'video' | 'sunum' | 'canli' | 'sinav';
  zorunlu: boolean;
  tamamlayanSayisi: number;
  toplam?: number;
}

export interface SertifikaKaydi {
  id: string;
  egitimId: string;
  egitimAdi: string;
  employeeId: string;
  employeeName: string;
  durum?: 'tamamlandi' | 'devam_ediyor';
  tamamlanmaTarihi?: string;
  hedefTarih?: string;
  gecerlilikSuresi?: number | null; // ay
  puan?: number | null;
}

interface PersonelEgitimDurumu {
  employeeId: string;
  employeeName: string;
  department: string;
  tamamlanan: number;
  toplam: number;
  zorunluTamamlanan: number;
  zorunluToplam: number;
  sertifikaAdedi: number;
  sonAktivite: string;
}

interface EgitimOnerisi {
  id: string;
  baslik: string;
  kategori: string;
  seviye: 'baslangic' | 'orta' | 'ileri';
  aciklama: string;
  egitmen: string;
  tur: 'video' | 'sunum' | 'canli' | 'sinav';
  oneriNedeni: string;
  zorunlu: boolean;
}

const seviyeRenk: Record<Egitim['seviye'], string> = {
  baslangic: 'bg-green-100 text-green-700',
  orta: 'bg-yellow-100 text-yellow-700',
  ileri: 'bg-red-100 text-red-700',
};

const turIkon: Record<Egitim['tur'], string> = {
  video: '🎬',
  sunum: '📊',
  canli: '🎥',
  sinav: '📝',
};

interface EgitimLMSProps {
  employees: Employee[];
  companyId?: string;
}

export default function EgitimLMS({ employees, companyId = 'default' }: EgitimLMSProps) {
  const { profile, appRole } = useAuth();

  const currentEmployee = useMemo(() => {
    return employees.find(
      (emp) =>
        emp.email?.toLowerCase() === profile?.email?.toLowerCase() ||
        emp.name?.toLowerCase() === profile?.full_name?.toLowerCase()
    ) || employees[0];
  }, [employees, profile]);

  const isManagement = useMemo(() => {
    if (['superadmin', 'admin', 'hr', 'manager'].includes(appRole)) return true;
    if (profile?.role && ['superadmin', 'admin', 'hr', 'manager'].includes(profile.role)) return true;
    if (currentEmployee?.position && /müdür|yönetici|amir|lider|lead|head|director|supervisor|koordinatör/i.test(currentEmployee.position)) return true;
    return false;
  }, [appRole, profile, currentEmployee]);

  const [aktifSekme, setAktifSekme] = useState<'katalog' | 'durumlar' | 'sertifikalar' | 'oneriler'>(() => {
    return isManagement ? 'katalog' : 'sertifikalar';
  });
  const [aramaMetni, setAramaMetni] = useState('');
  const [secilenKategori, setSecilenKategori] = useState('all');
  
  // Personel seçimi (Eğitim Önerileri sekmesi için)
  const [seciliOneriEmpId, setSeciliOneriEmpId] = useState<string>(() => employees[0]?.id || '');
  const [assignedMessage, setAssignedMessage] = useState<string | null>(null);

  // Modals
  const [showNewEgitim, setShowNewEgitim] = useState(false);
  const [showNewSertifika, setShowNewSertifika] = useState(false);

  // States loaded dynamically from lmsService and cached
  const [egitimler, setEgitimler] = useState<Egitim[]>(() => {
    const saved = localStorage.getItem(`humanius_egitimler_${companyId}`);
    return saved ? JSON.parse(saved) : [];
  });

  const [sertifikalar, setSertifikalar] = useState<SertifikaKaydi[]>(() => {
    const saved = localStorage.getItem(`humanius_sertifikalar_${companyId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch egitimler from database
  useEffect(() => {
    let isMounted = true;
    lmsService.getCourses(companyId).then((data) => {
      if (isMounted) setEgitimler(data);
    });

    const handleCoursesUpdated = () => {
      lmsService.getCourses(companyId).then((data) => {
        if (isMounted) setEgitimler(data);
      });
    };
    window.addEventListener('humanius_courses_updated', handleCoursesUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('humanius_courses_updated', handleCoursesUpdated);
    };
  }, [companyId]);

  // Fetch sertifikalar from database
  useEffect(() => {
    let isMounted = true;
    lmsService.getAssignments(companyId).then((data) => {
      if (isMounted) setSertifikalar(data);
    });

    const handleAssignmentsUpdated = () => {
      lmsService.getAssignments(companyId).then((data) => {
        if (isMounted) setSertifikalar(data);
      });
    };
    window.addEventListener('humanius_assignments_updated', handleAssignmentsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('humanius_assignments_updated', handleAssignmentsUpdated);
    };
  }, [companyId]);

  const [editingEgitim, setEditingEgitim] = useState<Egitim | null>(null);
  const [editEgitimForm, setEditEgitimForm] = useState({
    baslik: '',
    kategori: '',
    tur: 'video' as Egitim['tur'],
    seviye: 'baslangic' as Egitim['seviye'],
    egitmen: '',
    zorunlu: false,
    aciklama: ''
  });

  const [editingSertifika, setEditingSertifika] = useState<SertifikaKaydi | null>(null);
  const [editSertifikaForm, setEditSertifikaForm] = useState({
    egitimId: '',
    employeeId: '',
    durum: 'tamamlandi' as 'tamamlandi' | 'devam_ediyor',
    tamamlanmaTarihi: '',
    hedefTarih: '',
    gecerlilikSuresi: '',
    puan: 85,
    puanEkle: false
  });

  const goruntulenenSertifikalar = useMemo(() => {
    if (isManagement) return sertifikalar;
    if (!currentEmployee) return [];
    return sertifikalar.filter(
      (sc) =>
        sc.employeeId === currentEmployee.id ||
        sc.employeeName?.toLowerCase() === currentEmployee.name?.toLowerCase()
    );
  }, [sertifikalar, isManagement, currentEmployee]);

  const goruntulenenEgitimler = useMemo(() => {
    if (isManagement) return egitimler;
    if (!currentEmployee) return [];
    const assignedEgitimIds = new Set(
      sertifikalar
        .filter((s) => s.employeeId === currentEmployee.id || s.employeeName?.toLowerCase() === currentEmployee.name?.toLowerCase())
        .map((s) => s.egitimId)
    );
    return egitimler.filter((eg) => eg.zorunlu || assignedEgitimIds.has(eg.id));
  }, [egitimler, sertifikalar, isManagement, currentEmployee]);

  // Form states (Süre kaldırıldı)
  const [newEgitimForm, setNewEgitimForm] = useState({
    baslik: '',
    kategori: '',
    tur: 'video' as Egitim['tur'],
    seviye: 'baslangic' as Egitim['seviye'],
    egitmen: '',
    zorunlu: false,
    aciklama: ''
  });

  const [newSertifikaForm, setNewSertifikaForm] = useState({
    egitimId: '',
    atamaHedefi: 'tek' as 'tek' | 'departman' | 'tum',
    departman: '',
    employeeId: '',
    durum: 'tamamlandi' as 'tamamlandi' | 'devam_ediyor',
    tamamlanmaTarihi: new Date().toISOString().split('T')[0],
    hedefTarih: '',
    gecerlilikSuresi: '',
    puanEkle: false,
    puan: 85
  });

  // Open Edit Egitim Modal
  const openEditEgitim = (eg: Egitim) => {
    setEditingEgitim(eg);
    setEditEgitimForm({
      baslik: eg.baslik,
      kategori: eg.kategori,
      tur: eg.tur,
      seviye: eg.seviye,
      egitmen: eg.egitmen,
      zorunlu: eg.zorunlu,
      aciklama: eg.aciklama
    });
  };

  // Save Edited Egitim
  const handleSaveEditedEgitim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEgitim || !editEgitimForm.baslik.trim()) return;

    const updatedCourse: Egitim = {
      ...editingEgitim,
      baslik: editEgitimForm.baslik.trim(),
      kategori: editEgitimForm.kategori.trim() || 'Genel',
      tur: editEgitimForm.tur,
      seviye: editEgitimForm.seviye,
      egitmen: editEgitimForm.egitmen.trim() || 'Şirket İçi',
      zorunlu: editEgitimForm.zorunlu,
      aciklama: editEgitimForm.aciklama.trim()
    };

    const updatedEgitimler = egitimler.map((eg) => eg.id === updatedCourse.id ? updatedCourse : eg);
    setEgitimler(updatedEgitimler);
    await lmsService.saveCourse(companyId, updatedCourse);
    setEditingEgitim(null);
  };

  // Open Edit Sertifika / Atama Modal
  const openEditSertifika = (sc: SertifikaKaydi) => {
    setEditingSertifika(sc);
    setEditSertifikaForm({
      egitimId: sc.egitimId,
      employeeId: sc.employeeId,
      durum: sc.durum || 'tamamlandi',
      tamamlanmaTarihi: sc.tamamlanmaTarihi || new Date().toISOString().split('T')[0],
      hedefTarih: sc.hedefTarih || '',
      gecerlilikSuresi: sc.gecerlilikSuresi ? String(sc.gecerlilikSuresi) : '',
      puan: sc.puan != null ? sc.puan : 85,
      puanEkle: sc.puan != null
    });
  };

  // Save Edited Sertifika
  const handleSaveEditedSertifika = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSertifika) return;

    const isTamamlandi = editSertifikaForm.durum === 'tamamlandi';
    const updatedCert: SertifikaKaydi = {
      ...editingSertifika,
      durum: editSertifikaForm.durum,
      tamamlanmaTarihi: isTamamlandi ? editSertifikaForm.tamamlanmaTarihi : '',
      hedefTarih: !isTamamlandi ? editSertifikaForm.hedefTarih : undefined,
      gecerlilikSuresi: editSertifikaForm.gecerlilikSuresi ? Number(editSertifikaForm.gecerlilikSuresi) : null,
      puan: (isTamamlandi && editSertifikaForm.puanEkle) ? Number(editSertifikaForm.puan) : null
    };

    const updatedSertifikalar = sertifikalar.map((s) => s.id === updatedCert.id ? updatedCert : s);
    setSertifikalar(updatedSertifikalar);
    await lmsService.saveAssignment(companyId, updatedCert);
    setEditingSertifika(null);
  };

  // Quick complete for employee
  const handleQuickComplete = async (sc: SertifikaKaydi) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedCert: SertifikaKaydi = {
      ...sc,
      durum: 'tamamlandi' as const,
      tamamlanmaTarihi: today
    };

    const updatedSertifikalar = sertifikalar.map((s) => s.id === sc.id ? updatedCert : s);
    setSertifikalar(updatedSertifikalar);
    await lmsService.saveAssignment(companyId, updatedCert);
    alert(`Tebrikler! "${sc.egitimAdi}" eğitimi başarıyla tamamlandı olarak kaydedildi.`);
  };

  // Add course handler
  const handleAddEgitim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEgitimForm.baslik.trim()) return;

    const newCourse: Egitim = {
      id: `eg-${Date.now()}`,
      baslik: newEgitimForm.baslik.trim(),
      kategori: newEgitimForm.kategori.trim() || 'Genel',
      seviye: newEgitimForm.seviye,
      aciklama: newEgitimForm.aciklama.trim(),
      egitmen: newEgitimForm.egitmen.trim() || 'Şirket İçi',
      tur: newEgitimForm.tur,
      zorunlu: newEgitimForm.zorunlu,
      tamamlayanSayisi: 0,
      toplam: employees.length
    };

    setEgitimler([newCourse, ...egitimler]);
    await lmsService.saveCourse(companyId, newCourse);
    setShowNewEgitim(false);
    setNewEgitimForm({
      baslik: '',
      kategori: '',
      tur: 'video',
      seviye: 'baslangic',
      egitmen: '',
      zorunlu: false,
      aciklama: ''
    });
  };

  // Add certificate completion / assignment handler
  const handleAddSertifika = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSertifikaForm.egitimId) return;

    const selectedCourse = egitimler.find((eg) => eg.id === newSertifikaForm.egitimId);
    if (!selectedCourse) return;

    let targetEmps: Employee[] = [];
    if (newSertifikaForm.atamaHedefi === 'tum') {
      targetEmps = employees;
    } else if (newSertifikaForm.atamaHedefi === 'departman') {
      targetEmps = employees.filter(emp => emp.department === newSertifikaForm.departman);
    } else {
      const singleEmp = employees.find(emp => emp.id === newSertifikaForm.employeeId);
      if (singleEmp) targetEmps = [singleEmp];
    }

    if (targetEmps.length === 0) {
      alert('Lütfen geçerli en az bir personel veya departman seçiniz.');
      return;
    }

    const isTamamlandi = newSertifikaForm.durum === 'tamamlandi';
    const newCerts: SertifikaKaydi[] = targetEmps.map(emp => ({
      id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      egitimId: newSertifikaForm.egitimId,
      egitimAdi: selectedCourse.baslik,
      employeeId: emp.id,
      employeeName: emp.name,
      durum: newSertifikaForm.durum,
      tamamlanmaTarihi: isTamamlandi ? newSertifikaForm.tamamlanmaTarihi : '',
      hedefTarih: !isTamamlandi ? (newSertifikaForm.hedefTarih || newSertifikaForm.tamamlanmaTarihi) : undefined,
      gecerlilikSuresi: newSertifikaForm.gecerlilikSuresi ? Number(newSertifikaForm.gecerlilikSuresi) : null,
      puan: (isTamamlandi && newSertifikaForm.puanEkle) ? Number(newSertifikaForm.puan) : null
    }));

    setSertifikalar([...sertifikalar, ...newCerts]);
    await lmsService.bulkSaveAssignments(companyId, newCerts);

    setShowNewSertifika(false);
    setNewSertifikaForm({
      egitimId: '',
      atamaHedefi: 'tek',
      departman: '',
      employeeId: '',
      durum: 'tamamlandi',
      tamamlanmaTarihi: new Date().toISOString().split('T')[0],
      hedefTarih: '',
      gecerlilikSuresi: '',
      puanEkle: false,
      puan: 85
    });
    alert(`İşlem Başarılı: Eğitim ${targetEmps.length} personele başarıyla ${isTamamlandi ? 'kaydedildi' : 'atandı'}.`);
  };

  const deleteEgitim = async (id: string) => {
    if (window.confirm('Bu eğitimi silmek istediğinize emin misiniz?')) {
      setEgitimler(egitimler.filter((e) => e.id !== id));
      await lmsService.deleteCourse(companyId, id);
    }
  };

  const deleteSertifika = async (id: string) => {
    if (window.confirm('Bu sertifika kaydını silmek istediğinize emin misiniz?')) {
      setSertifikalar(sertifikalar.filter((c) => c.id !== id));
      await lmsService.deleteAssignment(companyId, id);
    }
  };

  // Personel eğitim durumları özeti
  const personelDurumlari: PersonelEgitimDurumu[] = useMemo(() => {
    return employees.map((emp) => {
      const empSertifikalar = sertifikalar.filter(
        (s) => s.employeeId === emp.id || s.employeeName?.toLowerCase() === emp.name?.toLowerCase()
      );
      const tamamlanan = empSertifikalar.filter((s) => s.durum === 'tamamlandi' || !s.durum).length;
      const toplam = empSertifikalar.length;
      
      const empEgitimIds = new Set(empSertifikalar.map((s) => s.egitimId));
      const zorunluEgitimler = egitimler.filter((e) => e.zorunlu && empEgitimIds.has(e.id));
      const zorunluTamamlanan = zorunluEgitimler.filter((e) =>
        empSertifikalar.some((s) => s.egitimId === e.id && (s.durum === 'tamamlandi' || !s.durum))
      ).length;

      const sonSertifika = [...empSertifikalar].sort((a, b) => (b.tamamlanmaTarihi || '').localeCompare(a.tamamlanmaTarihi || ''))[0];

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department || 'Genel',
        tamamlanan,
        toplam,
        zorunluTamamlanan,
        zorunluToplam: zorunluEgitimler.length,
        sertifikaAdedi: tamamlanan,
        sonAktivite: sonSertifika?.tamamlanmaTarihi || 'Henüz Yok',
      };
    });
  }, [employees, egitimler, sertifikalar]);

  // Akıllı Rol Bazlı Eğitim Öneri Motoru
  const seciliEmp = useMemo(() => {
    return employees.find(e => e.id === seciliOneriEmpId) || employees[0];
  }, [employees, seciliOneriEmpId]);

  const rolBazliOneriler: EgitimOnerisi[] = useMemo(() => {
    if (!seciliEmp) return [];

    const pos = (seciliEmp.position || '').toLowerCase();
    const dept = (seciliEmp.department || '').toLowerCase();
    const level = (seciliEmp.level || '').toLowerCase();

    // 1. Yazılım / DevOps / Siber / QA / Tasarım
    if (dept.includes('yazılım') || dept.includes('bilişim') || pos.includes('yazılım') || pos.includes('devops') || pos.includes('qa') || pos.includes('veri')) {
      if (pos.includes('ui/ux') || pos.includes('tasarım')) {
        return [
          {
            id: 'onr-ux-1',
            baslik: 'Gelişmiş Figma, Design System & Token Yönetimi',
            kategori: 'Ürün Tasarımı',
            seviye: 'ileri',
            aciklama: 'Kurumsal tasarım kütüphaneleri, auto-layout 5.0, design tokenlar ve yazılım ekibi ile bileşen senkronizasyonu.',
            egitmen: 'Tasarım Akademisi',
            tur: 'video',
            zorunlu: false,
            oneriNedeni: 'Kıdemli UI/UX Tasarımcı rolünde kurumsal arayüz standartlarını sağlamak amacıyla önerilmektedir.'
          },
          {
            id: 'onr-ux-2',
            baslik: 'UX Araştırma, Kullanılabilirlik Testleri & Isı Haritaları',
            kategori: 'Kullanıcı Deneyimi',
            seviye: 'orta',
            aciklama: 'Kullanıcı mülakat teknikleri, A/B test senaryoları, Hotjar/Fullstory veri okuma ve UX hipotez doğrulama.',
            egitmen: 'UX Research Institute',
            tur: 'canli',
            zorunlu: false,
            oneriNedeni: 'Kullanıcı odaklı ürün kararlarını veri ile desteklemek için önerilmektedir.'
          },
          {
            id: 'onr-ux-3',
            baslik: 'Dijital Ürünlerde Erişilebilirlik (WCAG 2.1) Standartları',
            kategori: 'Hukuk & Uyum',
            seviye: 'baslangic',
            aciklama: 'Görme ve işitme engelli kullanıcılar için renk kontrastı, ekran okuyucu uyumu ve font erişilebilirliği.',
            egitmen: 'Erişilebilir Web Derneği',
            tur: 'sunum',
            zorunlu: true,
            oneriNedeni: 'Şirketin dijital ürünlerinin erişilebilirlik mevzuatlarına uyumunu sağlamak için önerilmektedir.'
          }
        ];
      }

      if (pos.includes('devops') || pos.includes('sistem')) {
        return [
          {
            id: 'onr-devops-1',
            baslik: 'Kubernetes Cluster Yönetimi, Helm & Cloud Native Security',
            kategori: 'DevOps & Bulut',
            seviye: 'ileri',
            aciklama: 'Mikroservis orkestrasyonu, pod güvenliği, auto-scaling ve zero-downtime deployment stratejileri.',
            egitmen: 'Cloud Native Labs',
            tur: 'video',
            zorunlu: true,
            oneriNedeni: 'DevOps & Sistem Yöneticisi pozisyonunda bulut altyapısının kesintisizliğini sağlamak için önerilmektedir.'
          },
          {
            id: 'onr-devops-2',
            baslik: 'Infrastructure as Code (Terraform & Ansible)',
            kategori: 'Altyapı',
            seviye: 'orta',
            aciklama: 'Kod olarak altyapı yönetimi, konfigürasyon otomasyonu ve multi-cloud mimarileri.',
            egitmen: 'DevOps Academy',
            tur: 'canli',
            zorunlu: false,
            oneriNedeni: 'Altyapı kurulumlarını otomatikleştirip sürüm kontrolüne almak için önerilmektedir.'
          }
        ];
      }

      return [
        {
          id: 'onr-dev-1',
          baslik: 'Clean Code, Refactoring & Microservices Architecture',
          kategori: 'Yazılım Mimarisi',
          seviye: 'ileri',
          aciklama: 'SOLID prensipleri, domain driven design (DDD), dağıtık sistem tasarımı ve kod kalitesi standartları.',
          egitmen: 'Burak Aydın',
          tur: 'canli',
          zorunlu: false,
          oneriNedeni: `${seciliEmp.position} rolünde teknik borcu azaltmak ve yüksek ölçeklenebilir kod yazmak amacıyla önerilmektedir.`
        },
        {
          id: 'onr-dev-2',
          baslik: 'Yazılım Güvenliği & OWASP Top 10 Zafiyet Önleme',
          kategori: 'Siber Güvenlik',
          seviye: 'orta',
          aciklama: 'Güvenli kod geliştirme (SecOps), SQL Injection, XSS ve API yetkilendirme zafiyetlerini engelleme.',
          egitmen: 'Serkan Kurt',
          tur: 'video',
          zorunlu: true,
          oneriNedeni: 'Yazılım geliştirme süreçlerinde siber güvenlik açıklarının oluşmasını önlemek amacıyla zorunlu tutulmuştur.'
        }
      ];
    }

    // 2. İnsan Kaynakları / Hukuk & Uyum
    if (dept.includes('insan kaynakları') || dept.includes('hukuk') || pos.includes('ik') || pos.includes('personel') || pos.includes('hukuk')) {
      return [
        {
          id: 'onr-hr-1',
          baslik: '4857 Sayılı İş Kanunu, Yargıtay İçtihatları ve İş Hukuku Uzmanlığı',
          kategori: 'İş Hukuku',
          seviye: 'ileri',
          aciklama: 'İş akdi fesih usulleri, kıdem ve ihbar tazminatı hesapları, arabuluculuk ve Yargıtay emsal kararları.',
          egitmen: 'Av. Merve Aslan',
          tur: 'sunum',
          zorunlu: true,
          oneriNedeni: 'İnsan Kaynakları ve Hukuk birimlerinde mevzuata %100 uyumu sağlamak ve yasal riskleri engellemek için önerilmektedir.'
        },
        {
          id: 'onr-hr-2',
          baslik: 'Yetkinlik Bazlı İşe Alım, Mülakat Teknikleri & STAR Metodu',
          kategori: 'Yetenek Yönetimi',
          seviye: 'orta',
          aciklama: 'Davranışsal mülakat soruları, aday değerlendirme matrisleri ve doğru yeteneği şirkete kazandırma.',
          egitmen: 'Selin Aksoy',
          tur: 'canli',
          zorunlu: false,
          oneriNedeni: 'Şirket genelinde hatalı işe alımları azaltıp doğru adayı kuruma çekmek amacıyla önerilmektedir.'
        },
        {
          id: 'onr-hr-3',
          baslik: 'Performans Yönetimi, 360° Geri Bildirim ve Koçluk',
          kategori: 'Performans',
          seviye: 'orta',
          aciklama: 'Hedef bazlı performans değerlendirme (OKR/KPI), gelişimsel geri bildirim kültürü ve yapıcı koçluk.',
          egitmen: 'İK Danışmanlık Grubu',
          tur: 'video',
          zorunlu: false,
          oneriNedeni: 'Çalışan bağlılığını ve performans değerlendirme kalitesini artırmak için önerilmektedir.'
        }
      ];
    }

    // 3. Satış / Pazarlama
    if (dept.includes('satış') || dept.includes('pazarlama') || pos.includes('satış') || pos.includes('pazarlama')) {
      return [
        {
          id: 'onr-sls-1',
          baslik: 'B2B İkna, Büyük Müşteri Yönetimi (Key Account) & Müzakere',
          kategori: 'Satış Yönetimi',
          seviye: 'ileri',
          aciklama: 'Kurumsal satış teknikleri, itiraz karşılama, fiyat müzakeresi ve uzun vadeli müşteri ilişkileri.',
          egitmen: 'Hakan Koç',
          tur: 'canli',
          zorunlu: false,
          oneriNedeni: 'Satış direktörlüğü ve uzmanlık hedeflerinde ciro artışı ve kurumsal müşteri sadakati için önerilmektedir.'
        },
        {
          id: 'onr-sls-2',
          baslik: 'Dijital Pazarlama Stratejileri, SEO & Performance Marketing',
          kategori: 'Pazarlama',
          seviye: 'orta',
          aciklama: 'Google Ads, Meta reklam yönetimi, veri analitiği ile müşteri edinme maliyeti (CAC) düşürme.',
          egitmen: 'Elif Şahin',
          tur: 'video',
          zorunlu: false,
          oneriNedeni: 'Dijital pazarlama kanallarında ROI değerlerini yükseltmek için önerilmektedir.'
        }
      ];
    }

    // 4. Finans & Muhasebe
    if (dept.includes('finans') || dept.includes('muhasebe') || pos.includes('finans') || pos.includes('muhasebe')) {
      return [
        {
          id: 'onr-fin-1',
          baslik: 'İleri Seviye Excel, Finansal Modelleme ve Mali Tablo Analizi',
          kategori: 'Finans',
          seviye: 'ileri',
          aciklama: 'Bütçe senaryoları, nakit akış tahmini, pivot tablolar ve finansal rasyo analitiği.',
          egitmen: 'Zeynep Kaya',
          tur: 'sunum',
          zorunlu: true,
          oneriNedeni: 'Finans ve genel muhasebe süreçlerinde veriye dayalı karar mekanizmasını güçlendirmek amacıyla zorunlu tutulmuştur.'
        },
        {
          id: 'onr-fin-2',
          baslik: 'E-Fatura, E-Defter ve Güncel Vergi Mevzuatı Güncellemeleri',
          kategori: 'Mevzuat & Vergi',
          seviye: 'orta',
          aciklama: 'Vergi Usul Kanunu değişiklikleri, e-dönüşüm süreçleri ve beyanname denetimleri.',
          egitmen: 'Mali Müşavirlik Grubu',
          tur: 'canli',
          zorunlu: true,
          oneriNedeni: 'GİB ve vergi mevzuatı güncellemelerine eksiksiz uyum sağlamak için önerilmektedir.'
        }
      ];
    }

    // 5. Genel Liderlik & Standart Öneriler
    return [
      {
        id: 'onr-gen-1',
        baslik: 'Kurumsal Liderlik, Takım Yönetimi ve Stratejik Karar Alma',
        kategori: 'Yönetim Becerileri',
        seviye: level === 'manager' || level === 'lead' ? 'ileri' : 'orta',
        aciklama: 'Çatışma yönetimi, yetki devri, takım motivasyonu ve kriz anlarında stratejik karar alma.',
        egitmen: 'Beyza Yıldırım',
        tur: 'canli',
        zorunlu: false,
        oneriNedeni: `${seciliEmp.position || 'Personel'} pozisyonunda yönetsel ve liderlik becerilerini geliştirmek amacıyla önerilmektedir.`
      },
      {
        id: 'onr-gen-2',
        baslik: 'Kurumsal İletişim, Zaman Yönetimi ve Problem Çözme Becerileri',
        kategori: 'Kişisel Gelişim',
        seviye: 'baslangic',
        aciklama: 'Eisenhower matrisi, verimli toplantı kültürü, yazılı ve sözlü iş iletişimi.',
        egitmen: 'Kişisel Gelişim Akademisi',
        tur: 'video',
        zorunlu: false,
        oneriNedeni: 'İş verimliliğini artırmak ve birimler arası iletişimi güçlendirmek amacıyla önerilmektedir.'
      }
    ];
  }, [seciliEmp]);

  // Önerilen Eğitimi Personele Atama İşlemi
  const handleAssignRecommendation = async (oneri: EgitimOnerisi) => {
    if (!seciliEmp) return;

    // 1. Eğitimi katalogda yoksa kataloğa da ekleyelim
    let targetEgitim = egitimler.find(e => e.baslik.toLowerCase().trim() === oneri.baslik.toLowerCase().trim());
    if (!targetEgitim) {
      targetEgitim = {
        id: `eg-${Date.now()}`,
        baslik: oneri.baslik,
        kategori: oneri.kategori,
        seviye: oneri.seviye,
        aciklama: oneri.aciklama,
        egitmen: oneri.egitmen,
        tur: oneri.tur,
        zorunlu: oneri.zorunlu,
        tamamlayanSayisi: 0,
        toplam: employees.length
      };
      setEgitimler((prev) => [targetEgitim, ...prev]);
      await lmsService.saveCourse(companyId, targetEgitim);
    }

    // 2. Personel için atama sertifika kaydı oluşturalım
    const existingCert = sertifikalar.find(s => s.employeeId === seciliEmp.id && s.egitimId === targetEgitim?.id);
    if (existingCert) {
      alert(`${seciliEmp.name} personeline bu eğitim zaten atandır veya tamamlandı olarak kayıtlı.`);
      return;
    }

    const newCert: SertifikaKaydi = {
      id: `sc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      egitimId: targetEgitim.id,
      egitimAdi: targetEgitim.baslik,
      employeeId: seciliEmp.id,
      employeeName: seciliEmp.name,
      durum: 'devam_ediyor',
      tamamlanmaTarihi: '',
      hedefTarih: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      gecerlilikSuresi: 12,
      puan: null
    };

    setSertifikalar((prev) => [newCert, ...prev]);
    await lmsService.saveAssignment(companyId, newCert);
    setAssignedMessage(`"${oneri.baslik}" eğitimi ${seciliEmp.name} personeline başarıyla atandı!`);
    setTimeout(() => setAssignedMessage(null), 4000);
  };

  const kategoriler = useMemo(() => {
    const cats = Array.from(new Set(goruntulenenEgitimler.map((e) => e.kategori))).filter(
      (c) => c && c.trim().toLowerCase() !== 'bilgi'
    );
    return ['all', ...cats];
  }, [goruntulenenEgitimler]);

  const filtreliEgitimler = useMemo(() => {
    return goruntulenenEgitimler.filter((eg) => {
      const aramaEslestir = !aramaMetni || eg.baslik.toLowerCase().includes(aramaMetni.toLowerCase()) || eg.kategori.toLowerCase().includes(aramaMetni.toLowerCase());
      const kategoriEslestir = secilenKategori === 'all' || eg.kategori === secilenKategori;
      return aramaEslestir && kategoriEslestir;
    });
  }, [goruntulenenEgitimler, aramaMetni, secilenKategori]);

  const toplamTamamlama = sertifikalar.length;

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Eğitim ve Gelişim (LMS)</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isManagement
              ? 'Online eğitimler, şirket içi atamalar, sertifika yönetimi ve rol bazlı gelişim önerileri'
              : 'Size atanan online eğitimler, tamamlama durumları ve başarı sertifikalarınız'}
          </p>
        </div>
        {isManagement && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowNewEgitim(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Yeni Eğitim Ekle
            </button>
          </div>
        )}
      </div>

      {/* Özet Kartlar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{isManagement ? 'Toplam Tanımlı Eğitim' : 'Atanan Toplam Eğitim'}</p>
              <p className="text-xl font-bold text-gray-800">
                {isManagement ? egitimler.length : goruntulenenSertifikalar.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{isManagement ? 'Toplam Tamamlanan' : 'Tamamlanan Eğitimlerim'}</p>
              <p className="text-xl font-bold text-gray-800">
                {isManagement
                  ? sertifikalar.filter((s) => s.durum === 'tamamlandi' || !s.durum).length
                  : goruntulenenSertifikalar.filter((s) => s.durum === 'tamamlandi' || !s.durum).length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{isManagement ? 'Kayıtlı Atamalar' : 'Devam Eden Eğitimlerim'}</p>
              <p className="text-xl font-bold text-gray-800">
                {isManagement
                  ? sertifikalar.length
                  : goruntulenenSertifikalar.filter((s) => s.durum === 'devam_ediyor').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      {isManagement ? (
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          {(['katalog', 'durumlar', 'sertifikalar', 'oneriler'] as const).map((sekme) => (
            <button
              key={sekme}
              onClick={() => setAktifSekme(sekme)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                aktifSekme === sekme ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {sekme === 'katalog' ? 'Eğitim Kataloğu' :
               sekme === 'durumlar' ? 'Personel Durumları' :
               sekme === 'sertifikalar' ? 'Sertifikalar / Atamalar' :
               '🤖 Role Özel Eğitim Önerileri'}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
          <div className="px-4 py-2.5 text-sm font-bold border-b-2 border-blue-600 text-blue-600 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Bana Atanan Eğitimler & Sertifikalarım ({goruntulenenSertifikalar.length})
          </div>
        </div>
      )}

      {/* 1. EĞİTİM KATALOĞU */}
      {aktifSekme === 'katalog' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 flex-1 min-w-[200px] bg-white">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={aramaMetni}
                onChange={(e) => setAramaMetni(e.target.value)}
                placeholder="Eğitim ara..."
                className="flex-1 text-sm focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {kategoriler.map((k) => (
                <button
                  key={k}
                  onClick={() => setSecilenKategori(k)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    secilenKategori === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {k === 'all' ? 'Tümü' : k}
                </button>
              ))}
            </div>
          </div>

          {filtreliEgitimler.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">Kayıtlı Eğitim Bulunmamaktadır</p>
              {isManagement && <p className="text-xs text-gray-400 mt-1">Sağ üstteki "Yeni Eğitim Ekle" butonuna tıklayarak ilk eğitimi tanımlayabilirsiniz.</p>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtreliEgitimler.map((eg) => {
                return (
                  <div key={eg.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-blue-300 transition-colors relative group shadow-xs">
                    {isManagement && (
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditEgitim(eg)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Eğitimi Düzenle"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteEgitim(eg.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Eğitimi Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{turIkon[eg.tur]}</span>
                          <h3 className="font-semibold text-gray-800 text-sm">{eg.baslik}</h3>
                          {eg.zorunlu && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">Zorunlu</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{eg.egitmen}{eg.kategori && eg.kategori.toLowerCase() !== 'bilgi' ? ` • ${eg.kategori}` : ''}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 line-clamp-2">{eg.aciklama}</p>
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-100">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${seviyeRenk[eg.seviye]}`}>
                        {eg.seviye === 'baslangic' ? 'Başlangıç' : eg.seviye === 'orta' ? 'Orta' : 'İleri'}
                      </span>
                      <span className="text-gray-400 font-medium">{eg.tamamlayanSayisi} Çalışan Tamamladı</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. PERSONEL EĞİTİM DURUMLARI */}
      {aktifSekme === 'durumlar' && isManagement && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3 text-left">Çalışan</th>
                  <th className="px-4 py-3 text-left">Departman</th>
                  <th className="px-4 py-3 text-center">Tamamlanan / Toplam</th>
                  <th className="px-4 py-3 text-center">Zorunlu Eğitimler</th>
                  <th className="px-4 py-3 text-center">Sertifikalar</th>
                  <th className="px-4 py-3 text-right">Son Aktivite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {personelDurumlari.map((pd) => (
                  <tr key={pd.employeeId} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-800">{pd.employeeName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{pd.department}</td>
                    <td className="px-4 py-3 text-center font-semibold text-blue-600">{pd.tamamlanan} / {pd.toplam}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        pd.zorunluToplam === 0 ? 'bg-gray-100 text-gray-600' :
                        pd.zorunluTamamlanan >= pd.zorunluToplam ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {pd.zorunluTamamlanan} / {pd.zorunluToplam} Tamamlandı
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-purple-600">{pd.sertifikaAdedi}</td>
                    <td className="px-4 py-3 text-right text-xs text-gray-400">{pd.sonAktivite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SERTİFİKALAR / TAMAMLANANLAR */}
      {aktifSekme === 'sertifikalar' && (
        <div className="space-y-4">
          {isManagement && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowNewSertifika(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors shadow-sm cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Sertifika / Eğitim Ataması Kaydet
              </button>
            </div>
          )}

          {goruntulenenSertifikalar.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
              <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="font-semibold">
                {isManagement
                  ? 'Sertifika veya Tamamlanan Eğitim Kaydı Bulunmuyor'
                  : 'Henüz adınıza atanmış bir eğitim veya sertifika bulunmuyor.'}
              </p>
              {isManagement && (
                <p className="text-xs text-gray-400 mt-1">
                  Sağ üstteki "Sertifika / Eğitim Ataması Kaydet" butonu ile personellere eğitim atayabilirsiniz.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {goruntulenenSertifikalar.map((sc) => (
                <div key={sc.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs hover:border-green-300 transition-colors relative group flex flex-col justify-between">
                  <div>
                    {isManagement && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditSertifika(sc)}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Atamayı / Sertifikayı Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSertifika(sc.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Kaydı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 pr-12">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{sc.egitimAdi}</h4>
                        <p className="text-xs text-gray-500">{sc.employeeName}</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5 pt-2 border-t border-gray-100">
                      <div className="flex justify-between">
                        <span>Durum:</span>
                        <span className={`font-semibold ${sc.durum === 'devam_ediyor' ? 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full' : 'text-green-600 bg-green-50 px-2 py-0.5 rounded-full'}`}>
                          {sc.durum === 'devam_ediyor' ? '⏳ Devam Ediyor' : '✓ Tamamlandı'}
                        </span>
                      </div>
                      {sc.durum === 'devam_ediyor' && sc.hedefTarih && (
                        <div className="flex justify-between">
                          <span>Hedef Bitiş:</span>
                          <span className="font-medium text-amber-700">{sc.hedefTarih}</span>
                        </div>
                      )}
                      {sc.tamamlanmaTarihi && (
                        <div className="flex justify-between">
                          <span>Tamamlanma Tarihi:</span>
                          <span className="font-medium text-gray-700">{sc.tamamlanmaTarihi}</span>
                        </div>
                      )}
                      {sc.puan && (
                        <div className="flex justify-between">
                          <span>Başarı Puanı:</span>
                          <span className="font-bold text-blue-600">{sc.puan} / 100</span>
                        </div>
                      )}
                      {sc.gecerlilikSuresi && (
                        <div className="flex justify-between">
                          <span>Geçerlilik:</span>
                          <span className="font-medium text-gray-600">{sc.gecerlilikSuresi} Ay</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Action for Employee on ongoing training */}
                  {!isManagement && sc.durum === 'devam_ediyor' && (
                    <button
                      onClick={() => handleQuickComplete(sc)}
                      className="mt-3 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-1.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-emerald-200 transition-colors shadow-xs cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Eğitimi Tamamladım Olarak İşaretle
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. ROLE ÖZEL EĞİTİM ÖNERİLERİ (Sadece Yönetici & İK) */}
      {isManagement && aktifSekme === 'oneriler' && (
        <div className="space-y-6">
          {/* Bildirim Mesajı */}
          {assignedMessage && (
            <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl text-sm font-semibold flex items-center gap-2 animate-bounce">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {assignedMessage}
            </div>
          )}

          {/* Personel Seçim Kartı */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Role Özel Akıllı Eğitim Öneri Motoru</h3>
                <p className="text-xs text-purple-200">Personelin unvanı, departmanı ve yetkinlik ihtiyaçlarına göre otomatik eğitim önerileri üretilir.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
              <div>
                <label className="block text-xs font-semibold text-purple-200 mb-1.5">Personel Seçiniz:</label>
                <select
                  value={seciliOneriEmpId}
                  onChange={(e) => setSeciliOneriEmpId(e.target.value)}
                  className="w-full bg-slate-900 border border-purple-400/40 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-purple-400"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.position || emp.department} ({emp.department})
                    </option>
                  ))}
                </select>
              </div>

              {seciliEmp && (
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                    {seciliEmp.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{seciliEmp.name}</p>
                    <p className="text-xs text-purple-200">{seciliEmp.position || 'Personel'} • {seciliEmp.department}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/30 text-purple-200 mt-1">
                      {seciliEmp.level || 'Mid'} Seviye
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Öneriler Listesi */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-800">
                {seciliEmp?.name} İçin Önerilen Eğitim Programları
              </h3>
              <span className="text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {rolBazliOneriler.length} Özel Öneri
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rolBazliOneriler.map((oneri) => (
                <div key={oneri.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:border-purple-300 transition-all shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                        {oneri.kategori}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${seviyeRenk[oneri.seviye]}`}>
                        {oneri.seviye === 'baslangic' ? 'Başlangıç' : oneri.seviye === 'orta' ? 'Orta' : 'İleri Seviye'}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-gray-900 mb-1 leading-snug">{oneri.baslik}</h4>
                    <p className="text-xs text-gray-500 mb-3">{oneri.aciklama}</p>

                    <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl mb-4 text-xs text-purple-900">
                      <span className="font-bold text-purple-950">💡 Neden Önerildi? </span>
                      {oneri.oneriNedeni}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400 font-medium">Eğitmen: {oneri.egitmen}</span>
                    <button
                      onClick={() => handleAssignRecommendation(oneri)}
                      className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Eğitimi Personel İçin Ata
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* YENİ EĞİTİM EKLE MODAL (Süre Kaldırıldı) */}
      {showNewEgitim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Yeni Eğitim Ekle</h3>
              <button onClick={() => setShowNewEgitim(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEgitim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Başlığı</label>
                <input
                  type="text"
                  required
                  value={newEgitimForm.baslik}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, baslik: e.target.value })}
                  placeholder="Örn: KVKK ve Veri Güvenliği"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={newEgitimForm.kategori}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, kategori: e.target.value })}
                    placeholder="Örn: Yazılım, İK"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Türü</label>
                  <select
                    value={newEgitimForm.tur}
                    onChange={(e) => setNewEgitimForm({ ...newEgitimForm, tur: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="video">Video</option>
                    <option value="sunum">Sunum</option>
                    <option value="canli">Canlı</option>
                    <option value="sinav">Sınav</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Seviye</label>
                <select
                  value={newEgitimForm.seviye}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, seviye: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baslangic">Başlangıç</option>
                  <option value="orta">Orta</option>
                  <option value="ileri">İleri</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitmen / Kurum</label>
                <input
                  type="text"
                  required
                  value={newEgitimForm.egitmen}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, egitmen: e.target.value })}
                  placeholder="Örn: Dr. Ahmet Yılmaz"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={newEgitimForm.aciklama}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, aciklama: e.target.value })}
                  placeholder="Eğitim içeriği ve öğrenim hedefleri..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="zorunlu"
                  checked={newEgitimForm.zorunlu}
                  onChange={(e) => setNewEgitimForm({ ...newEgitimForm, zorunlu: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="zorunlu" className="text-xs font-medium text-gray-700">Tüm personel için zorunlu eğitim</label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewEgitim(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                >
                  Eğitimi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YENİ SERTİFİKA / ATAMA MODAL */}
      {showNewSertifika && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Eğitim Ataması / Sertifika Kaydı</h3>
              <button onClick={() => setShowNewSertifika(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSertifika} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Seçin</label>
                <select
                  required
                  value={newSertifikaForm.egitimId}
                  onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, egitimId: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seçiniz...</option>
                  {egitimler.map((eg) => (
                    <option key={eg.id} value={eg.id}>{eg.baslik}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Kayıt Türü</label>
                <select
                  value={newSertifikaForm.durum}
                  onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, durum: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tamamlandi">Sertifika Ver (Tamamlandı)</option>
                  <option value="devam_ediyor">Eğitim Ata (Devam Ediyor)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Atama Hedefi</label>
                <select
                  value={newSertifikaForm.atamaHedefi}
                  onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, atamaHedefi: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tek">Tek Personel</option>
                  <option value="departman">Tüm Departman</option>
                  <option value="tum">Tüm Şirket Personelleri</option>
                </select>
              </div>

              {newSertifikaForm.atamaHedefi === 'tek' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Personel</label>
                  <select
                    required
                    value={newSertifikaForm.employeeId}
                    onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, employeeId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Personel Seçin...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                </div>
              )}

              {newSertifikaForm.atamaHedefi === 'departman' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Departman</label>
                  <select
                    required
                    value={newSertifikaForm.departman}
                    onChange={(e) => setNewSertifikaForm({ ...newSertifikaForm, departman: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Departman Seçin...</option>
                    {Array.from(new Set(employees.map(e => e.department))).map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSertifika(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EĞİTİM DÜZENLE MODAL */}
      {editingEgitim && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">Eğitimi Düzenle</h3>
              </div>
              <button onClick={() => setEditingEgitim(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedEgitim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Başlığı</label>
                <input
                  type="text"
                  required
                  value={editEgitimForm.baslik}
                  onChange={(e) => setEditEgitimForm({ ...editEgitimForm, baslik: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editEgitimForm.kategori}
                    onChange={(e) => setEditEgitimForm({ ...editEgitimForm, kategori: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Türü</label>
                  <select
                    value={editEgitimForm.tur}
                    onChange={(e) => setEditEgitimForm({ ...editEgitimForm, tur: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="video">Video</option>
                    <option value="sunum">Sunum</option>
                    <option value="canli">Canlı</option>
                    <option value="sinav">Sınav</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Seviye</label>
                <select
                  value={editEgitimForm.seviye}
                  onChange={(e) => setEditEgitimForm({ ...editEgitimForm, seviye: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="baslangic">Başlangıç</option>
                  <option value="orta">Orta</option>
                  <option value="ileri">İleri</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitmen / Kurum</label>
                <input
                  type="text"
                  required
                  value={editEgitimForm.egitmen}
                  onChange={(e) => setEditEgitimForm({ ...editEgitimForm, egitmen: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Açıklama</label>
                <textarea
                  rows={2}
                  value={editEgitimForm.aciklama}
                  onChange={(e) => setEditEgitimForm({ ...editEgitimForm, aciklama: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit_zorunlu"
                  checked={editEgitimForm.zorunlu}
                  onChange={(e) => setEditEgitimForm({ ...editEgitimForm, zorunlu: e.target.checked })}
                  className="rounded text-blue-600"
                />
                <label htmlFor="edit_zorunlu" className="text-xs font-medium text-gray-700">Tüm personel için zorunlu eğitim</label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingEgitim(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                >
                  Değişiklikleri Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERTİFİKA / ATAMA DÜZENLE MODAL */}
      {editingSertifika && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Eğitim Atamasını Düzenle</h3>
                  <p className="text-xs text-gray-500">{editingSertifika.employeeName} • {editingSertifika.egitimAdi}</p>
                </div>
              </div>
              <button onClick={() => setEditingSertifika(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedSertifika} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eğitim Durumu</label>
                <select
                  value={editSertifikaForm.durum}
                  onChange={(e) => setEditSertifikaForm({ ...editSertifikaForm, durum: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="devam_ediyor">⏳ Devam Ediyor (Atandı / Henüz Tamamlanmadı)</option>
                  <option value="tamamlandi">✓ Tamamlandı (Sertifika Verildi)</option>
                </select>
              </div>

              {editSertifikaForm.durum === 'devam_ediyor' ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Hedef Tamamlama Tarihi</label>
                  <input
                    type="date"
                    value={editSertifikaForm.hedefTarih}
                    onChange={(e) => setEditSertifikaForm({ ...editSertifikaForm, hedefTarih: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tamamlanma Tarihi</label>
                  <input
                    type="date"
                    required
                    value={editSertifikaForm.tamamlanmaTarihi}
                    onChange={(e) => setEditSertifikaForm({ ...editSertifikaForm, tamamlanmaTarihi: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Geçerlilik (Ay)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={editSertifikaForm.gecerlilikSuresi}
                    onChange={(e) => setEditSertifikaForm({ ...editSertifikaForm, gecerlilikSuresi: e.target.value })}
                    placeholder="Örn: 12"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Başarı Puanı (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editSertifikaForm.puan}
                    onChange={(e) => setEditSertifikaForm({ ...editSertifikaForm, puan: Number(e.target.value), puanEkle: true })}
                    placeholder="Örn: 90"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSertifika(null)}
                  className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-green-600 text-white text-xs font-semibold hover:bg-green-700 cursor-pointer"
                >
                  Kaydı Güncelle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
