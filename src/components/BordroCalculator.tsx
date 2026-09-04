import React, { useState, useEffect } from 'react';
import {
  Calculator, Save, FileText, Download, User, DollarSign, CheckCircle,
  ArrowRightLeft, TrendingUp, Briefcase, Building2, Percent, ShieldCheck,
  Sparkles, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { BordroItem } from '../types/bordro';
import {
  calculateBordro, formatCurrency, formatNumber, nettenBruteHesapla,
  saatlikBrutUcret, gunlukBrutUcret, saatlikNetUcret, gunlukNetUcret
} from '../utils/bordroCalculations';
import { Employee } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { bordroService } from '../services/bordroService';
import { escapeHtml } from '../utils/sanitize';

interface BordroCalculatorProps {
  employees: Employee[];
  onSaveBordro: (bordro: BordroItem) => void;
  onSendForApproval?: (bordro: BordroItem) => void;
  selectedEmployee: Employee;
  period: string;
  isEmekli?: boolean;
}

const DEMO_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

const BordroCalculator: React.FC<BordroCalculatorProps> = ({ employees, onSaveBordro, onSendForApproval, selectedEmployee, period, isEmekli = false }) => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const effectiveCompanyId = profile?.company_id ?? DEMO_COMPANY_ID;

  const [formData, setFormData] = useState<any>({
    temelKazanc: 0,
    medeniDurum: 'bekar' as 'bekar' | 'evli',
    cocukSayisi: 0,
    sgkIsverenIndirimOrani: 5,
    yolParasi: 0,
    gidaYardimi: 0,
    cocukYardimi: 0,
    digerKazanclar: 0,
    fazlaMesai: 0,
    fazlaMesaiSaat50: 0,
    fazlaMesaiSaat100: 0,
    haftalikTatil: 0,
    genelTatil: 0,
    yillikIzinUcreti: 0,
    ikramiye: 0,
    prim: 0,
    servisUcreti: 0,
    temsilEtiket: 0,
    kidemTazminati: 0,
    ihbarTazminati: 0,
    avans: 0,
    sendikaidat: 0,
    besKesintisi: 0,
    icraKesintisi: 0,
    digerKesintiler: 0,
    engelliIndirimi: 0
  });

  const [maasBelirlemeYontemi, setMaasBelirlemeYontemi] = useState<'brut' | 'net'>('brut');
  const [netHedefInput, setNetHedefInput] = useState<string | number>('');
  const [besActive, setBesActive] = useState<boolean>(false);

  const [calculatedBordro, setCalculatedBordro] = useState<BordroItem | null>(null);
  const [savedBordro, setSavedBordro] = useState<BordroItem | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [oncekiAylarGVMatrahi, setOncekiAylarGVMatrahi] = useState(0);

  useEffect(() => {
    if (selectedEmployee) {
      const initialSalary = selectedEmployee.salary || 0;
      setFormData((prev: any) => ({
        ...prev,
        temelKazanc: initialSalary
      }));
      setSavedBordro(null);
      setMaasBelirlemeYontemi('brut');
    }
  }, [selectedEmployee, period]);

  // Brüt modundayken calculatedBordro.netMaas hesaplandığında netHedefInput'u otomatik senkronize et
  useEffect(() => {
    if (calculatedBordro && maasBelirlemeYontemi === 'brut') {
      const nm = calculatedBordro.netMaas;
      setNetHedefInput(nm > 0 ? nm.toFixed(2) : '');
    }
  }, [calculatedBordro?.netMaas, maasBelirlemeYontemi]);

  // Önceki ayların kümülatif GV matrahını DB'den yükle
  useEffect(() => {
    if (!selectedEmployee?.id || !period) return;
    const [year, month] = period.split('-').map(Number);
    if (!year || !month) return;

    bordroService.getByEmployee(selectedEmployee.id).then((rows) => {
      if (!rows) return;
      // Aynı yıldaki, bu aydan önceki tüm bordrolar
      const oncekiAylar = rows.filter((r: any) => {
        const [rYear, rMonth] = (r.period ?? '').split('-').map(Number);
        return rYear === year && rMonth < month;
      });
      // En güncel ayın kümülatif matrahi = o aya kadar toplam
      if (oncekiAylar.length === 0) {
        setOncekiAylarGVMatrahi(0);
        return;
      }
      // En son önceki ayı bul
      const enSonAy = oncekiAylar.sort((a: any, b: any) => {
        const [, am] = (a.period ?? '').split('-').map(Number);
        const [, bm] = (b.period ?? '').split('-').map(Number);
        return bm - am;
      })[0];
      setOncekiAylarGVMatrahi(Number(enSonAy.kumulatif_vergi_matrahi) || 0);
    }).catch(() => setOncekiAylarGVMatrahi(0));
  }, [selectedEmployee?.id, period]);

  useEffect(() => {
    if (selectedEmployee) {
      const [, month] = period.split('-').map(Number);
      const ayNo = month || 1;

      const bordroData = calculateBordro({
        id: `${selectedEmployee.id}-${period}`,
        employeeId: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        period,
        sicilNo: selectedEmployee.id,
        tcNo: '***********',
        isEmekli: isEmekli || selectedEmployee.employeeType === 'emekli' || (selectedEmployee as any).employee_type === 'emekli',
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, undefined, ayNo, oncekiAylarGVMatrahi);
      setCalculatedBordro(bordroData);
    }
  }, [selectedEmployee, period, formData, oncekiAylarGVMatrahi, isEmekli]);

  const toggleBes = (active: boolean) => {
    setBesActive(active);
    if (active) {
      const besVal = Math.round((formData.temelKazanc || 0) * 0.03 * 100) / 100;
      handleInputChange('besKesintisi', String(besVal));
    } else {
      handleInputChange('besKesintisi', '0');
    }
  };

  const handleBrutChange = (valStr: string) => {
    setMaasBelirlemeYontemi('brut');
    const val = valStr === '' ? 0 : parseFloat(valStr) || 0;
    setFormData((prev: any) => {
      const nextBes = besActive ? Math.round(val * 0.03 * 100) / 100 : prev.besKesintisi;
      return {
        ...prev,
        temelKazanc: val,
        besKesintisi: nextBes
      };
    });
  };

  const handleNetChange = (valStr: string) => {
    setMaasBelirlemeYontemi('net');
    setNetHedefInput(valStr);
    const targetNet = valStr === '' ? 0 : parseFloat(valStr) || 0;
    if (targetNet <= 0) {
      setFormData((prev: any) => ({ ...prev, temelKazanc: 0, ...(besActive ? { besKesintisi: 0 } : {}) }));
      return;
    }

    const [, month] = period.split('-').map(Number);
    const ayNo = month || 1;
    const requiredGross = nettenBruteHesapla(targetNet, {
      ...formData,
      ayNo,
      oncekiAylarGVMatrahi,
      isEmekli: isEmekli || selectedEmployee?.employeeType === 'emekli' || (selectedEmployee as any)?.employee_type === 'emekli',
    });

    const nextBes = besActive ? Math.round(requiredGross * 0.03 * 100) / 100 : formData.besKesintisi;

    setFormData((prev: any) => ({
      ...prev,
      temelKazanc: requiredGross,
      besKesintisi: nextBes
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev: any) => {
      const updated = {
        ...prev,
        [field]: value === '' ? 0 : (parseFloat(value) || 0)
      };

      // Eğer Net modundaysak ve ek kazanç/kesinti değiştiyse, net maaşı korumak için brütü yeniden hesapla
      if (maasBelirlemeYontemi === 'net' && netHedefInput && field !== 'temelKazanc') {
        const [, month] = period.split('-').map(Number);
        const ayNo = month || 1;
        const targetNet = parseFloat(String(netHedefInput)) || 0;
        if (targetNet > 0) {
          const reqGross = nettenBruteHesapla(targetNet, {
            ...updated,
            ayNo,
            oncekiAylarGVMatrahi,
            isEmekli: isEmekli || selectedEmployee?.employeeType === 'emekli' || (selectedEmployee as any)?.employee_type === 'emekli',
          });
          updated.temelKazanc = reqGross;
        }
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!calculatedBordro) return;
    setSaveMessage(null);
    setSaveError(null);

    try {
      const bordroInsertPayload = {
        company_id: effectiveCompanyId,
        employee_id: selectedEmployee.id,
        period: calculatedBordro.period,
        sicil_no: selectedEmployee.sicil_no || calculatedBordro.sicilNo || selectedEmployee.id,
        tc_no: selectedEmployee.tc_no || calculatedBordro.tcNo || '',
        brut_maas: calculatedBordro.temelKazanc,
        medeni_durum: calculatedBordro.medeniDurum || 'bekar',
        cocuk_sayisi: calculatedBordro.cocukSayisi || 0,
        engelli_durumu: selectedEmployee.engelli_durumu || 'yok',
        temel_kazanc: calculatedBordro.temelKazanc || 0,
        yol_parasi: calculatedBordro.yolParasi || 0,
        gida_yardimi: calculatedBordro.gidaYardimi || 0,
        cocuk_yardimi: calculatedBordro.cocukYardimi || 0,
        diger_kazanclar: calculatedBordro.digerKazanclar || 0,
        fazla_mesai: calculatedBordro.fazlaMesai || 0,
        fazla_mesai_saat_50: calculatedBordro.fazlaMesaiSaat50 || 0,
        fazla_mesai_saat_100: calculatedBordro.fazlaMesaiSaat100 || 0,
        fazla_mesai_tutar: calculatedBordro.fazlaMesaiTutar || 0,
        haftalik_tatil: calculatedBordro.haftalikTatil || 0,
        genel_tatil: calculatedBordro.genelTatil || 0,
        yillik_izin_ucreti: calculatedBordro.yillikIzinUcreti || 0,
        ikramiye: calculatedBordro.ikramiye || 0,
        prim: calculatedBordro.prim || 0,
        servis_ucreti: calculatedBordro.servisUcreti || 0,
        temsil_etiket: calculatedBordro.temsilEtiket || 0,
        gelir_vergisi: calculatedBordro.gelirVergisi || 0,
        damga_vergisi: calculatedBordro.damgaVergisi || 0,
        sgk_isci_payi: calculatedBordro.sgkIsciPayi || 0,
        issizlik_sigortasi: calculatedBordro.issizlikSigortasi || 0,
        sendika_aidat: calculatedBordro.sendikaidat || 0,
        avans: calculatedBordro.avans || 0,
        bes_kesintisi: calculatedBordro.besKesintisi || 0,
        icra_kesintisi: calculatedBordro.icraKesintisi || 0,
        maas_tipi: maasBelirlemeYontemi,
        hesaplama_yontemi: maasBelirlemeYontemi === 'net' ? 'netten_brute' : 'brutten_nete',
        diger_kesintiler: calculatedBordro.digerKesintiler || 0,
        engelli_indirimi: calculatedBordro.engelliIndirimi || 0,
        kidem_tazminati: calculatedBordro.kidemTazminati || 0,
        ihbar_tazminati: calculatedBordro.ihbarTazminati || 0,
        toplam_kazanc: calculatedBordro.toplamKazanc || 0,
        toplam_kesinti: calculatedBordro.toplamKesinti || 0,
        net_maas: calculatedBordro.netMaas || 0,
        kumulatif_vergi_matrahi: calculatedBordro.kumulatifVergiMatrahi || 0,
        asgari_ucret_gelir_vergisi_istisnasi: calculatedBordro.asgariUcretGelirVergisiIstisnasi || 0,
        asgari_ucret_damga_vergisi_istisnasi: calculatedBordro.asgariUcretDamgaVergisiIstisnasi || 0,
        sgk_isveren_payi: calculatedBordro.sgkIsverenPayi || 0,
        issizlik_isveren_payi: calculatedBordro.issizlikIsverenPayi || 0,
        sgk_isveren_indirimi: calculatedBordro.sgkIsverenIndirimi || 0,
        sgk_isveren_indirim_orani: calculatedBordro.sgkIsverenIndirimOrani || 0,
        yillik_toplam_kazanc: calculatedBordro.toplamKazanc || 0,
        yillik_toplam_kesinti: calculatedBordro.toplamKesinti || 0,
        yillik_toplam_net: calculatedBordro.netMaas || 0,
        aciklama: '',
        approval_status: 'onaylandi',
        approval_date: new Date().toISOString(),
      };

      const saved = await bordroService.create(bordroInsertPayload);

      // UI tarafi camelCase alanlar kullandigi icin, DB'den donen snake_case
      // kaydi dogrudan state'e yazmak render hatasina neden oluyor.
      const uiBordro = {
        ...calculatedBordro,
        id: saved.id,
        company_id: effectiveCompanyId,
        employee_id: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        employees: {
          name: selectedEmployee.name,
          department: selectedEmployee.department,
        },
      } as BordroItem;

      setSavedBordro(uiBordro);
      setSaveMessage('Bordro başarıyla kaydedildi.');
      onSaveBordro(uiBordro);
    } catch (error: any) {
      console.error('Bordro kaydetme hatası:', error);

      // Veritabanı hatası olsa bile kullanıcı akışını kesmeyelim; yerelde devam et.
      const localBordro = {
        ...calculatedBordro,
        id: calculatedBordro.id || crypto.randomUUID(),
        company_id: effectiveCompanyId,
        employee_id: selectedEmployee.id,
        employeeName: selectedEmployee.name,
        employees: {
          name: selectedEmployee.name,
          department: selectedEmployee.department,
        },
      } as BordroItem;

      setSavedBordro(localBordro);
      onSaveBordro(localBordro);

      const rawMessage = String(error?.message ?? '').toLowerCase();
      const isPermissionLikeError =
        rawMessage.includes('row-level security') ||
        rawMessage.includes('security policy') ||
        rawMessage.includes('permission denied') ||
        rawMessage.includes('not authorized') ||
        rawMessage.includes('rls');

      setSaveError(null);
      setSaveMessage(
        isPermissionLikeError
          ? 'Bordro veritabanına kaydedilemedi (yetki kısıtı). Kayıt yerel olarak tamamlandı.'
          : 'Bordro veritabanına kaydedilemedi. Kayıt yerel olarak tamamlandı.'
      );
    }
  };



  const exportToPDF = async () => {
    if (!calculatedBordro) return;

    const bordroId = savedBordro?.id || calculatedBordro.id;
    const approvalData = await bordroService.getApprovals(bordroId);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bordro - ${calculatedBordro.employeeName} - ${calculatedBordro.period}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          @page { size: landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; background: white; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          .header h1 { color: #1e40af; font-size: 24px; margin-bottom: 5px; }
          
          .top-info { display: flex; justify-content: space-between; margin-bottom: 20px; background: #eff6ff; padding: 10px; border-radius: 8px; border: 1px solid #bfdbfe; }
          .top-info div { font-size: 14px; }
          
          .main-columns { display: flex; gap: 20px; margin-bottom: 20px; }
          .column { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .section-title { background: #eff6ff; padding: 8px 12px; font-weight: bold; color: #1e40af; border-bottom: 1px solid #bfdbfe; font-size: 14px; }
          
          .info-row { display: flex; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid #f3f4f6; }
          .info-row:last-child { border-bottom: none; }
          .total-row { display: flex; justify-content: space-between; padding: 10px 12px; background: #f8fafc; font-weight: bold; font-size: 14px; border-top: 2px solid #e5e7eb; }
          
          .bottom-info { display: flex; gap: 20px; margin-bottom: 30px; }
          .bottom-box { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; text-align: center; }
          .bottom-box-title { font-size: 12px; color: #6b7280; font-weight: bold; margin-bottom: 5px; }
          .bottom-box-value { font-size: 24px; font-weight: bold; color: #1e40af; }
          
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
          .sig-box { text-align: center; width: 40%; }
          .sig-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; color: #374151; }
          .sig-name { margin-bottom: 40px; font-size: 14px; color: #4b5563; }
          .sig-line { border-bottom: 1px solid #9ca3af; width: 100%; height: 1px; margin: 0 auto; }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BORDRO HESAP PUSULASI</h1>
          <p>${escapeHtml(calculatedBordro.period)}</p>
        </div>

        <div class="top-info">
          <div><strong>Personel Adı Soyadı:</strong> ${escapeHtml(calculatedBordro.employeeName)}</div>
          <div><strong>Sicil No:</strong> ${escapeHtml(calculatedBordro.sicilNo || '-')}</div>
          <div><strong>Dönem:</strong> ${escapeHtml(calculatedBordro.period)}</div>
        </div>

        <div class="main-columns">
          <div class="column">
            <h2 class="section-title">KAZANÇLAR</h2>
            <div class="info-row"><span>Temel Kazanç:</span> <span>${formatNumber(calculatedBordro.temelKazanc)} ₺</span></div>
            ${calculatedBordro.yolParasi > 0 ? `<div class="info-row"><span>Yol Parası:</span> <span>${formatNumber(calculatedBordro.yolParasi)} ₺</span></div>` : ''}
            ${calculatedBordro.gidaYardimi > 0 ? `<div class="info-row"><span>Gıda Yardımı:</span> <span>${formatNumber(calculatedBordro.gidaYardimi)} ₺</span></div>` : ''}
            ${calculatedBordro.cocukYardimi > 0 ? `<div class="info-row"><span>Çocuk Yardımı:</span> <span>${formatNumber(calculatedBordro.cocukYardimi)} ₺</span></div>` : ''}
            ${calculatedBordro.digerKazanclar > 0 ? `<div class="info-row"><span>Diğer Kazançlar:</span> <span>${formatNumber(calculatedBordro.digerKazanclar)} ₺</span></div>` : ''}
            ${(calculatedBordro.fazlaMesaiTutar || 0) > 0 ? `<div class="info-row"><span>Fazla Mesai:</span> <span>${formatNumber(calculatedBordro.fazlaMesaiTutar || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.ikramiye || 0) > 0 ? `<div class="info-row"><span>İkramiye:</span> <span>${formatNumber(calculatedBordro.ikramiye || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.prim || 0) > 0 ? `<div class="info-row"><span>Prim:</span> <span>${formatNumber(calculatedBordro.prim || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.yillikIzinUcreti || 0) > 0 ? `<div class="info-row"><span>Yıllık İzin Ücreti:</span> <span>${formatNumber(calculatedBordro.yillikIzinUcreti || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.haftalikTatil || 0) > 0 ? `<div class="info-row"><span>Haftalık Tatil:</span> <span>${formatNumber(calculatedBordro.haftalikTatil || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.genelTatil || 0) > 0 ? `<div class="info-row"><span>Genel Tatil:</span> <span>${formatNumber(calculatedBordro.genelTatil || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.servisUcreti || 0) > 0 ? `<div class="info-row"><span>Servis Ücreti:</span> <span>${formatNumber(calculatedBordro.servisUcreti || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.temsilEtiket || 0) > 0 ? `<div class="info-row"><span>Temsil/Etiket:</span> <span>${formatNumber(calculatedBordro.temsilEtiket || 0)} ₺</span></div>` : ''}
            
            <div class="total-row">
              <span style="color: #059669;">TOPLAM KAZANÇ</span>
              <span style="color: #059669;">${formatNumber(calculatedBordro.toplamKazanc)} ₺</span>
            </div>
          </div>
          
          <div class="column">
            <h2 class="section-title">KESİNTİLER</h2>
            <div class="info-row"><span>Gelir Vergisi:</span> <span>${formatNumber(calculatedBordro.gelirVergisi)} ₺</span></div>
            <div class="info-row"><span>Damga Vergisi:</span> <span>${formatNumber(calculatedBordro.damgaVergisi)} ₺</span></div>
            <div class="info-row"><span>SGK İşçi Payı:</span> <span>${formatNumber(calculatedBordro.sgkIsciPayi)} ₺</span></div>
            <div class="info-row"><span>İşsizlik Sigortası:</span> <span>${formatNumber(calculatedBordro.issizlikSigortasi)} ₺</span></div>
            ${(calculatedBordro.besKesintisi || 0) > 0 ? `<div class="info-row"><span>BES Kesintisi (%3 OKS):</span> <span>${formatNumber(calculatedBordro.besKesintisi || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.icraKesintisi || 0) > 0 ? `<div class="info-row"><span>İcra / Nafaka Kesintisi:</span> <span>${formatNumber(calculatedBordro.icraKesintisi || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.avans || 0) > 0 ? `<div class="info-row"><span>Avans:</span> <span>${formatNumber(calculatedBordro.avans || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.sendikaidat || 0) > 0 ? `<div class="info-row"><span>Sendika Aidatı:</span> <span>${formatNumber(calculatedBordro.sendikaidat || 0)} ₺</span></div>` : ''}
            ${(calculatedBordro.digerKesintiler || 0) > 0 ? `<div class="info-row"><span>Diğer Kesintiler:</span> <span>${formatNumber(calculatedBordro.digerKesintiler || 0)} ₺</span></div>` : ''}
            
            <div class="total-row">
              <span style="color: #dc2626;">TOPLAM KESİNTİ</span>
              <span style="color: #dc2626;">${formatNumber(calculatedBordro.toplamKesinti)} ₺</span>
            </div>
          </div>
        </div>

        <div class="bottom-info">
          <div class="bottom-box" style="background: #f8fafc;">
            <div class="bottom-box-title">TOPLAM İŞVEREN MALİYETİ</div>
            <div class="bottom-box-value" style="font-size: 20px; color: #4338ca;">
              ${formatNumber(calculatedBordro.toplamIsverenMaliyeti || (calculatedBordro.toplamKazanc + calculatedBordro.sgkIsverenPayi + calculatedBordro.issizlikIsverenPayi - (calculatedBordro.sgkIsverenIndirimi || 0)))} ₺
            </div>
            <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">
              SGK İşveren: ${formatNumber(calculatedBordro.sgkIsverenPayi)} ₺ | İşsizlik: ${formatNumber(calculatedBordro.issizlikIsverenPayi)} ₺
            </div>
          </div>
          <div class="bottom-box" style="background: #dbeafe; border-color: #93c5fd;">
            <div class="bottom-box-title">NET MAAŞ (ELE GEÇEN)</div>
            <div class="bottom-box-value">${formatNumber(calculatedBordro.netMaas)} ₺</div>
            <div style="font-size: 10px; color: #2563eb; margin-top: 4px;">
              Saatlik Net: ${formatNumber(saatlikNetUcret(calculatedBordro.netMaas))} ₺ | Günlük Net: ${formatNumber(gunlukNetUcret(calculatedBordro.netMaas))} ₺
            </div>
          </div>
        </div>

        ${(approvalData && approvalData.length > 0) ? `
        <div style="margin-top: 20px;">
          <h2 class="section-title" style="border-radius: 8px;">ONAY BİLGİLERİ</h2>
          ${approvalData.map((approval: any) => `
            <div style="padding: 10px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 10px; display: flex; gap: 20px;">
              <div><strong>Durum:</strong> ${approval.approval_status === 'onaylandi' ? 'Onaylandı' : 'Reddedildi'}</div>
              <div><strong>Tarih:</strong> ${new Date(approval.timestamp).toLocaleString('tr-TR')}</div>
              <div><strong>Yöntem:</strong> ${approval.verification_method}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-title">Hazırlayan / İşveren Vekili</div>
            <div class="sig-name">&nbsp;</div>
            <div class="sig-line"></div>
          </div>
          <div class="sig-box">
            <div class="sig-title">Personel</div>
            <div class="sig-name">${calculatedBordro.employeeName}</div>
            <div class="sig-line"></div>
          </div>
        </div>

        <div style="margin-top: 20px; text-align: center; color: #9ca3af; font-size: 10px;">
          <p>Bu bordro ${new Date().toLocaleDateString('tr-TR')} tarihinde elektronik ortamda oluşturulmuştur.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">{t('bordro.calculator')}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!calculatedBordro}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {t('common.save')}
          </button>
          <button
            onClick={exportToPDF}
            disabled={!calculatedBordro}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {(saveMessage || saveError) && (
        <div className="px-6 pt-4">
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {saveMessage ?? 'İşlem tamamlandı. Yerel kayıt modu devrede olabilir.'}
          </div>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Top 4 KPI Cards */}
        {calculatedBordro && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Ele Geçen */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Net Ele Geçen</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 tracking-tight">
                {formatNumber(calculatedBordro.netMaas)} ₺
              </div>
              <div className="mt-2 pt-2 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-900/80">
                <span>Saatlik: {formatNumber(saatlikNetUcret(calculatedBordro.netMaas))} ₺</span>
                <span className="font-semibold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded-md">
                  Günlük: {formatNumber(gunlukNetUcret(calculatedBordro.netMaas))} ₺
                </span>
              </div>
            </div>

            {/* Toplam Brüt Kazanç */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Toplam Brüt Kazanç</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Briefcase className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-blue-700 tracking-tight">
                {formatNumber(calculatedBordro.toplamKazanc)} ₺
              </div>
              <div className="mt-2 pt-2 border-t border-blue-100 flex items-center justify-between text-xs text-blue-900/80">
                <span>Temel: {formatNumber(calculatedBordro.temelKazanc)} ₺</span>
                <span className="font-semibold bg-blue-100/70 text-blue-800 px-2 py-0.5 rounded-md">
                  Ek: {formatNumber(Math.max(0, calculatedBordro.toplamKazanc - calculatedBordro.temelKazanc))} ₺
                </span>
              </div>
            </div>

            {/* Toplam Kesintiler */}
            <div className="bg-gradient-to-br from-rose-50 to-red-50/50 border border-rose-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-800">Toplam Kesintiler</span>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-700 tracking-tight">
                {formatNumber(calculatedBordro.toplamKesinti)} ₺
              </div>
              <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-xs text-rose-900/80">
                <span>SGK + Vergi + BES</span>
                <span className="font-semibold bg-rose-100/70 text-rose-800 px-2 py-0.5 rounded-md">
                  {calculatedBordro.toplamKazanc > 0 ? `%${((calculatedBordro.toplamKesinti / calculatedBordro.toplamKazanc) * 100).toFixed(1)}` : '%0'}
                </span>
              </div>
            </div>

            {/* Toplam İşveren Maliyeti */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50/50 border border-indigo-200/80 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">İşveren Maliyeti</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-700 tracking-tight">
                {formatNumber(calculatedBordro.toplamIsverenMaliyeti || (calculatedBordro.toplamKazanc + calculatedBordro.sgkIsverenPayi + calculatedBordro.issizlikIsverenPayi - (calculatedBordro.sgkIsverenIndirimi || 0)))} ₺
              </div>
              <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-900/80">
                <span>SGK İşveren: {formatNumber(calculatedBordro.sgkIsverenPayi)} ₺</span>
                <span className="font-semibold bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded-md">
                  {calculatedBordro.temelKazanc > 0 ? `${((calculatedBordro.toplamIsverenMaliyeti || calculatedBordro.toplamKazanc) / calculatedBordro.temelKazanc).toFixed(2)}x` : '1x'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Panel - Giriş Formu */}
          <div className="space-y-6">
            {/* Maaş Belirleme Yöntemi (Brüt & Net Ayrı Ayrı) */}
            <div className="bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 border-2 border-blue-200/80 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowRightLeft className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-base">Maaş Belirleme (Brüt & Net)</h4>
                    <p className="text-xs text-gray-500">Maaşı ister Net ister Brüt olarak belirleyin, diğeri mevzuata göre otomatik hesaplanır</p>
                  </div>
                </div>

                {/* Yöntem Toggle */}
                <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-xs shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMaasBelirlemeYontemi('brut')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      maasBelirlemeYontemi === 'brut'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <span>Brütten Nete</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaasBelirlemeYontemi('net')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      maasBelirlemeYontemi === 'net'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Netten Brüte</span>
                  </button>
                </div>
              </div>

              {/* İki Ayrı Kart: Brüt Maaş ve Net Maaş */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BRÜT MAAŞ KARTI */}
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  maasBelirlemeYontemi === 'brut'
                    ? 'bg-white border-blue-500 shadow-sm ring-2 ring-blue-100'
                    : 'bg-white/80 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Brüt Temel Maaş (₺)
                    </label>
                    {maasBelirlemeYontemi === 'brut' ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                        Aktif Girdi
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                        Hesaplanan
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.temelKazanc === 0 ? '' : formData.temelKazanc}
                      onChange={(e) => handleBrutChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-base font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-gray-400">₺/Ay</span>
                  </div>

                  {/* Birim Ücretler (Brüt) */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                      <span className="text-gray-500 block text-[10px]">Saatlik Brüt</span>
                      <span className="font-bold text-gray-800">
                        {formatNumber(saatlikBrutUcret(formData.temelKazanc))} ₺
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-1.5 text-center">
                      <span className="text-gray-500 block text-[10px]">Günlük Brüt</span>
                      <span className="font-bold text-gray-800">
                        {formatNumber(gunlukBrutUcret(formData.temelKazanc))} ₺
                      </span>
                    </div>
                  </div>
                </div>

                {/* NET ELE GEÇEN KARTI */}
                <div className={`p-4 rounded-xl border-2 transition-all ${
                  maasBelirlemeYontemi === 'net'
                    ? 'bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-100'
                    : 'bg-white/80 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      Net Ele Geçen (₺)
                    </label>
                    {maasBelirlemeYontemi === 'net' ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                        Aktif Girdi
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                        Hesaplanan
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={netHedefInput}
                      onChange={(e) => handleNetChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-base font-bold text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="absolute right-3 top-3 text-xs font-bold text-gray-400">₺/Ay</span>
                  </div>

                  {/* Birim Ücretler (Net) */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-emerald-50/60 rounded-lg p-1.5 text-center">
                      <span className="text-gray-500 block text-[10px]">Saatlik Net</span>
                      <span className="font-bold text-emerald-700">
                        {formatNumber(saatlikNetUcret(calculatedBordro?.netMaas || 0))} ₺
                      </span>
                    </div>
                    <div className="bg-emerald-50/60 rounded-lg p-1.5 text-center">
                      <span className="text-gray-500 block text-[10px]">Günlük Net</span>
                      <span className="font-bold text-emerald-700">
                        {formatNumber(gunlukNetUcret(calculatedBordro?.netMaas || 0))} ₺
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bilgi Metni */}
              <div className="flex items-start gap-2 text-xs text-slate-600 bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                {maasBelirlemeYontemi === 'brut' ? (
                  <span>
                    <strong>Brütten Nete:</strong> Brüt ücretten yasal SGK işçi primi, İşsizlik, 2026 Gelir Vergisi (kümülatif dilim) ve Damga Vergisi istisnaları düşülerek net maaş bulunur.
                  </span>
                ) : (
                  <span>
                    <strong>Netten Brüte:</strong> Hedef net ücret girildiğinde 2026 Gelir Vergisi dilimleri (158K/330K/1.2M/4.3M), asgari ücret muafiyetleri ve kesintiler çözümlenerek gereken brüt maaş otomatik bulunur.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Bordro Parametreleri
              </h3>

              {selectedEmployee && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-blue-700">Kümülatif Vergi Matrahı Devri:</span>
                    <span className="font-mono font-bold text-blue-950">
                      {formatCurrency(oncekiAylarGVMatrahi)}
                    </span>
                    <span className="text-[11px] text-blue-600">({period.split('-')[1]}. aydan önceki birikmiş matrah)</span>
                  </div>
                  <div className="bg-blue-600 text-white font-semibold px-2.5 py-1 rounded-lg text-[11px] shrink-0">
                    Aktif Vergi Dilimi: %{calculatedBordro ? (
                      (calculatedBordro.kumulatifVergiMatrahi > 1200000 ? 35 :
                       calculatedBordro.kumulatifVergiMatrahi > 330000 ? 27 :
                       calculatedBordro.kumulatifVergiMatrahi > 158000 ? 20 : 15)
                    ) : 15}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.maritalStatus')}</label>
                    <select
                      value={formData.medeniDurum}
                      onChange={(e) => setFormData(prev => ({ ...prev, medeniDurum: e.target.value as 'bekar' | 'evli' }))}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="bekar">{t('bordro.single')}</option>
                      <option value="evli">{t('bordro.married')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.childrenCount')}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.cocukSayisi}
                      onChange={(e) => setFormData(prev => ({ ...prev, cocukSayisi: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.employerSGKDiscount')}</label>
                  <select
                    value={formData.sgkIsverenIndirimOrani}
                    onChange={(e) => setFormData(prev => ({ ...prev, sgkIsverenIndirimOrani: parseInt(e.target.value) }))}
                    className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="0">{t('bordro.noDiscount')}</option>
                    <option value="5">5 {t('bordro.pointDiscount')}</option>
                    <option value="4">4 {t('bordro.pointDiscount')}</option>
                    <option value="2">2 {t('bordro.pointDiscount')}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mt-6">
                <DollarSign className="w-5 h-5" />
                {t('bordro.totalEarnings')}
              </h3>

              <div className="grid grid-cols-1 gap-3">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.transportAllowance')}</label>
                    <input
                      type="number"
                      value={formData.yolParasi}
                      onChange={(e) => handleInputChange('yolParasi', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.foodAllowance')}</label>
                    <input
                      type="number"
                      value={formData.gidaYardimi}
                      onChange={(e) => handleInputChange('gidaYardimi', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.childAllowance')}</label>
                    <input
                      type="number"
                      value={formData.cocukYardimi}
                      onChange={(e) => handleInputChange('cocukYardimi', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.otherEarnings')}</label>
                    <input
                      type="number"
                      value={formData.digerKazanclar}
                      onChange={(e) => handleInputChange('digerKazanclar', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mt-6">{t('bordro.additionalPayments')}</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3">{t('bordro.overtimeCalculation')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('bordro.overtime50')} (%50)</label>
                      <input
                        type="number"
                        value={formData.fazlaMesaiSaat50}
                        onChange={(e) => handleInputChange('fazlaMesaiSaat50', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        step="0.5"
                        placeholder="Saat"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{t('bordro.overtime100')} (%100)</label>
                      <input
                        type="number"
                        value={formData.fazlaMesaiSaat100}
                        onChange={(e) => handleInputChange('fazlaMesaiSaat100', e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        step="0.5"
                        placeholder="Saat"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {t('bordro.overtimeInfo')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.overtimeManual')}</label>
                    <input
                      type="number"
                      value={formData.fazlaMesai}
                      onChange={(e) => handleInputChange('fazlaMesai', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                      placeholder="Manuel tutar"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.bonus')}</label>
                    <input
                      type="number"
                      value={formData.ikramiye}
                      onChange={(e) => handleInputChange('ikramiye', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.premium')}</label>
                    <input
                      type="number"
                      value={formData.prim}
                      onChange={(e) => handleInputChange('prim', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.annualLeaveWage')}</label>
                    <input
                      type="number"
                      value={formData.yillikIzinUcreti}
                      onChange={(e) => handleInputChange('yillikIzinUcreti', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.weeklyHoliday')}</label>
                    <input
                      type="number"
                      value={formData.haftalikTatil}
                      onChange={(e) => handleInputChange('haftalikTatil', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.publicHoliday')}</label>
                    <input
                      type="number"
                      value={formData.genelTatil}
                      onChange={(e) => handleInputChange('genelTatil', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mt-6">{t('bordro.taxDeductions')}</h3>

                <div className="grid grid-1 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.disabilityReduction')}</label>
                    <input
                      type="number"
                      value={formData.engelliIndirimi}
                      onChange={(e) => handleInputChange('engelliIndirimi', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mt-6">{t('bordro.otherDeductions')}</h3>

                <div className="grid grid-cols-1 gap-3">
                  {/* BES (%3 OKS) Kartı */}
                  <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm font-semibold text-indigo-950 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={besActive || formData.besKesintisi > 0}
                          onChange={(e) => toggleBes(e.target.checked)}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <span>BES (%3 Otomatik Katılım OKS)</span>
                      </label>
                      <span className="text-xs text-indigo-600 font-medium">
                        Brütün %3'ü
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={formData.besKesintisi === 0 ? '' : formData.besKesintisi}
                          onChange={(e) => handleInputChange('besKesintisi', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white border border-indigo-200 text-gray-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          step="0.01"
                        />
                        <span className="absolute right-3 top-2 text-xs font-bold text-gray-400">₺</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const autoVal = Math.round((formData.temelKazanc || 0) * 0.03 * 100) / 100;
                          setBesActive(true);
                          handleInputChange('besKesintisi', String(autoVal));
                        }}
                        className="px-2.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shrink-0 transition-colors"
                      >
                        %3 Hesapla
                      </button>
                    </div>
                  </div>

                  {/* İcra / Nafaka Kesintisi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İcra / Nafaka Kesintisi (₺)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData.icraKesintisi === 0 ? '' : formData.icraKesintisi}
                        onChange={(e) => handleInputChange('icraKesintisi', e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        step="0.01"
                      />
                      <span className="absolute right-3 top-3 text-xs font-bold text-gray-400">₺</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.advance')}</label>
                    <input
                      type="number"
                      value={formData.avans}
                      onChange={(e) => handleInputChange('avans', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.unionDues')}</label>
                    <input
                      type="number"
                      value={formData.sendikaidat}
                      onChange={(e) => handleInputChange('sendikaidat', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('bordro.otherDeduction')}</label>
                    <input
                      type="number"
                      value={formData.digerKesintiler}
                      onChange={(e) => handleInputChange('digerKesintiler', e.target.value)}
                      className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            </div>

          {/* Sağ Panel - Bordro Önizleme */}
          <div className="space-y-6">
            {(savedBordro || calculatedBordro) && (() => {
              const displayBordro = savedBordro || calculatedBordro!;
              return (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-800">{t('bordro.preview')}</h3>
                </div>

                <div className="space-y-6">
                  {/* Personel Bilgileri */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">{t('bordro.employeeInfo')}</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">{t('bordro.fullName')}:</span>
                        <span className="text-gray-800 ml-2">{displayBordro.employeeName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('bordro.period')}:</span>
                        <span className="text-gray-800 ml-2">{displayBordro.period}</span>
                      </div>
                    </div>
                  </div>

                  {/* Kazançlar */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">{t('bordro.earnings')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.baseSalary')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.temelKazanc)} ₺</span>
                      </div>
                      {displayBordro.yolParasi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.transportAllowance')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.yolParasi)} ₺</span>
                        </div>
                      )}
                      {displayBordro.gidaYardimi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.foodAllowance')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.gidaYardimi)} ₺</span>
                        </div>
                      )}
                      {displayBordro.cocukYardimi > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.childAllowance')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.cocukYardimi)} ₺</span>
                        </div>
                      )}
                      {displayBordro.digerKazanclar > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.otherEarnings')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.digerKazanclar)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.fazlaMesaiTutar || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.overtime')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.fazlaMesaiTutar || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.fazlaMesaiSaat50 || 0) > 0 && (
                        <div className="flex justify-between text-xs text-gray-400 pl-4">
                          <span>  • %50 Zam ({displayBordro.fazlaMesaiSaat50} saat)</span>
                          <span>{formatNumber((displayBordro.temelKazanc / 225) * 1.5 * (displayBordro.fazlaMesaiSaat50 || 0))} ₺</span>
                        </div>
                      )}
                      {(displayBordro.fazlaMesaiSaat100 || 0) > 0 && (
                        <div className="flex justify-between text-xs text-gray-400 pl-4">
                          <span>  • %100 Zam ({displayBordro.fazlaMesaiSaat100} saat)</span>
                          <span>{formatNumber((displayBordro.temelKazanc / 225) * 2 * (displayBordro.fazlaMesaiSaat100 || 0))} ₺</span>
                        </div>
                      )}
                      {(displayBordro.ikramiye || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.bonus')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.ikramiye || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.prim || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.premium')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.prim || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.yillikIzinUcreti || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.annualLeaveWage')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.yillikIzinUcreti || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.haftalikTatil || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.weeklyHoliday')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.haftalikTatil || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.genelTatil || 0) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.publicHoliday')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.genelTatil || 0)} ₺</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                        <span className="text-green-600">{t('bordro.totalEarnings')}</span>
                        <span className="text-green-600">{formatNumber(displayBordro.toplamKazanc)} ₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Kesintiler */}
                  <div className="border-b border-gray-200 pb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">{t('bordro.deductions')}</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.incomeTax')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.gelirVergisi)} ₺</span>
                      </div>
                      {(displayBordro.engelliIndirimi || 0) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>{t('bordro.disabilityReduction')}</span>
                          <span>-{formatNumber(displayBordro.engelliIndirimi || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.asgariUcretGelirVergisiIstisnasi || 0) > 0 && (
                        <div className="flex justify-between text-green-600 border-t border-green-200 pt-1 mt-1">
                          <span className="text-xs">{t('bordro.minWageIncomeTaxExemption')}</span>
                          <span className="text-xs">-{formatNumber(displayBordro.asgariUcretGelirVergisiIstisnasi || 0)} ₺</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.stampTax')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.damgaVergisi)} ₺</span>
                      </div>
                      {(displayBordro.asgariUcretDamgaVergisiIstisnasi || 0) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span className="text-xs">{t('bordro.minWageStampTaxExemption')}</span>
                          <span className="text-xs">-{formatNumber(displayBordro.asgariUcretDamgaVergisiIstisnasi || 0)} ₺</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.sgkEmployee')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.sgkIsciPayi)} ₺</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.unemploymentInsurance')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.issizlikSigortasi)} ₺</span>
                      </div>
                      {(displayBordro.besKesintisi || 0) > 0 && (
                        <div className="flex justify-between text-indigo-700 font-medium">
                          <span>BES (%3 OKS) Kesintisi</span>
                          <span>-{formatNumber(displayBordro.besKesintisi || 0)} ₺</span>
                        </div>
                      )}
                      {(displayBordro.icraKesintisi || 0) > 0 && (
                        <div className="flex justify-between text-rose-700 font-medium">
                          <span>İcra / Nafaka Kesintisi</span>
                          <span>-{formatNumber(displayBordro.icraKesintisi || 0)} ₺</span>
                        </div>
                      )}
                      {displayBordro.avans > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.advance')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.avans)} ₺</span>
                        </div>
                      )}
                      {displayBordro.sendikaidat > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.unionDues')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.sendikaidat)} ₺</span>
                        </div>
                      )}
                      {displayBordro.digerKesintiler > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">{t('bordro.otherDeduction')}</span>
                          <span className="text-gray-800">{formatNumber(displayBordro.digerKesintiler)} ₺</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold border-t border-gray-200 pt-2">
                        <span className="text-red-600">{t('bordro.totalDeduction')}</span>
                        <span className="text-red-600">{formatNumber(displayBordro.toplamKesinti)} ₺</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Maaş */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">ÖDENECEK NET MAAŞ</span>
                        <div className="text-xs text-emerald-700/80 mt-0.5">
                          Saatlik: {formatNumber(saatlikNetUcret(displayBordro.netMaas))} ₺ • Günlük: {formatNumber(gunlukNetUcret(displayBordro.netMaas))} ₺
                        </div>
                      </div>
                      <span className="text-2xl font-black text-emerald-700">
                        {formatNumber(displayBordro.netMaas)} ₺
                      </span>
                    </div>
                  </div>

                  {/* İşveren Payları */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-gray-500">{t('bordro.employerShares')}</h4>
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                        Maliyet: {formatNumber(displayBordro.toplamIsverenMaliyeti || (displayBordro.toplamKazanc + displayBordro.sgkIsverenPayi + displayBordro.issizlikIsverenPayi - (displayBordro.sgkIsverenIndirimi || 0)))} ₺
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.sgkEmployer')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.sgkIsverenPayi)} ₺</span>
                      </div>
                      {(displayBordro.sgkIsverenIndirimi || 0) > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span className="text-xs">{t('bordro.sgkEmployerDiscount')} ({displayBordro.sgkIsverenIndirimOrani}%)</span>
                          <span className="text-xs">-{formatNumber(displayBordro.sgkIsverenIndirimi || 0)} ₺</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">{t('bordro.unemploymentEmployer')}</span>
                        <span className="text-gray-800">{formatNumber(displayBordro.issizlikIsverenPayi)} ₺</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-indigo-100 pt-2 text-indigo-950">
                        <span>Toplam İşveren Maliyeti</span>
                        <span className="text-indigo-700">{formatNumber(displayBordro.toplamIsverenMaliyeti || (displayBordro.toplamKazanc + displayBordro.sgkIsverenPayi + displayBordro.issizlikIsverenPayi - (displayBordro.sgkIsverenIndirimi || 0)))} ₺</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BordroCalculator;