import React, { useState } from 'react';
import { X, FileText, Trash2, Save, User, Calendar, DollarSign, AlertCircle, ShieldAlert, ArrowRightLeft, Sparkles, Calculator, Percent, HelpCircle } from 'lucide-react';
import { BordroItem } from '../types/bordro';
import { useScrollLock } from '../hooks/useScrollLock';
import { useAuth } from '../contexts/AuthContext';
import { calculateBordro, nettenBruteHesapla } from '../utils/bordroCalculations';

interface BordroDuzenlemeModalProps {
  bordro: BordroItem;
  employeeName?: string;
  employeeDepartment?: string;
  onClose: () => void;
  onSave: (updatedBordro: Partial<BordroItem>) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

const formatMoney = (val: number | undefined | null) =>
  Number(val || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const parseNumber = (val: any): number => {
  if (val === '' || val === null || val === undefined) return 0;
  const parsed = parseFloat(String(val).replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
};

export const BordroDuzenlemeModal: React.FC<BordroDuzenlemeModalProps> = ({
  bordro,
  employeeName,
  employeeDepartment,
  onClose,
  onSave,
  onDelete,
}) => {
  useScrollLock(true);
  const { profile, appRole } = useAuth();
  const isManager = ['superadmin', 'admin', 'hr', 'manager'].includes(profile?.role || '') || ['superadmin', 'admin', 'hr', 'manager'].includes(appRole || '');

  // Form State
  const [period, setPeriod] = useState(bordro.period || '');
  const [maasTipi, setMaasTipi] = useState<'brut' | 'net'>(
    bordro.maas_tipi || 'brut'
  );
  const [netHedefInput, setNetHedefInput] = useState<string | number>(
    bordro.net_maas ?? (bordro as any).netMaas ?? ''
  );
  const [temelKazanc, setTemelKazanc] = useState<number>(
    bordro.temel_kazanc ?? (bordro as any).temelKazanc ?? bordro.brut_maas ?? 0
  );
  const [yolParasi, setYolParasi] = useState<number>(bordro.yol_parasi ?? (bordro as any).yolParasi ?? 0);
  const [gidaYardimi, setGidaYardimi] = useState<number>(bordro.gida_yardimi ?? (bordro as any).gidaYardimi ?? 0);
  const [prim, setPrim] = useState<number>(bordro.prim ?? 0);
  const [ikramiye, setIkramiye] = useState<number>(bordro.ikramiye ?? 0);
  const [digerKazanclar, setDigerKazanclar] = useState<number>(
    bordro.diger_kazanclar ?? (bordro as any).digerKazanclar ?? 0
  );

  // Kesintiler
  const [sgkIsciPayi, setSgkIsciPayi] = useState<number>(
    bordro.sgk_isci_payi ?? (bordro as any).sgkIsciPayi ?? 0
  );
  const [issizlikSigortasi, setIssizlikSigortasi] = useState<number>(
    bordro.issizlik_sigortasi ?? (bordro as any).issizlikSigortasi ?? (bordro as any).issizlik_isci_payi ?? 0
  );
  const [gelirVergisi, setGelirVergisi] = useState<number>(
    bordro.gelir_vergisi ?? (bordro as any).gelirVergisi ?? 0
  );
  const [damgaVergisi, setDamgaVergisi] = useState<number>(
    bordro.damga_vergisi ?? (bordro as any).damgaVergisi ?? 0
  );
  const [besKesintisi, setBesKesintisi] = useState<number>(
    bordro.bes_kesintisi ?? (bordro as any).besKesintisi ?? 0
  );
  const [icraKesintisi, setIcraKesintisi] = useState<number>(
    bordro.icra_kesintisi ?? (bordro as any).icraKesintisi ?? 0
  );
  const [avans, setAvans] = useState<number>(bordro.avans ?? 0);
  const [digerKesintiler, setDigerKesintiler] = useState<number>(
    bordro.diger_kesintiler ?? (bordro as any).digerKesintiler ?? 0
  );

  const [approvalStatus, setApprovalStatus] = useState<string>(
    bordro.approval_status || (bordro as any).durum || 'onaylandi'
  );
  const [aciklama, setAciklama] = useState<string>(bordro.aciklama || '');

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hesaplanan Toplamlar
  const calculatedToplamKazanc = temelKazanc + yolParasi + gidaYardimi + prim + ikramiye + digerKazanclar;
  const calculatedToplamKesinti = sgkIsciPayi + issizlikSigortasi + gelirVergisi + damgaVergisi + avans + besKesintisi + icraKesintisi + digerKesintiler;
  const calculatedNetMaas = Math.max(0, calculatedToplamKazanc - calculatedToplamKesinti);

  const autoCalculateTaxAndSGK = (customTemel?: number) => {
    const currentTemel = customTemel !== undefined ? customTemel : temelKazanc;
    const isEmekli = (bordro as any).isEmekli || (bordro as any).employeeType === 'emekli';
    const [, month] = period.split('-').map(Number);
    const ayNo = month || 1;
    const res = calculateBordro({
      id: bordro.id,
      period,
      employeeId: bordro.employeeId || bordro.employee_id || '',
      employeeName: resolvedName,
      temelKazanc: currentTemel,
      yolParasi,
      gidaYardimi,
      prim,
      ikramiye,
      digerKazanclar,
      isEmekli,
      avans,
      besKesintisi,
      icraKesintisi,
      digerKesintiler,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, undefined, ayNo, Number(bordro.kumulatif_vergi_matrahi || 0));

    setSgkIsciPayi(res.sgkIsciPayi);
    setIssizlikSigortasi(res.issizlikSigortasi);
    setGelirVergisi(res.gelirVergisi);
    setDamgaVergisi(res.damgaVergisi);
  };

  const handleBrutInput = (valStr: string) => {
    setMaasTipi('brut');
    const val = parseNumber(valStr);
    setTemelKazanc(val);
  };

  const handleNetInput = (valStr: string) => {
    setMaasTipi('net');
    setNetHedefInput(valStr);
    const targetNet = parseNumber(valStr);
    if (targetNet <= 0) {
      setTemelKazanc(0);
      return;
    }
    const isEmekli = (bordro as any).isEmekli || (bordro as any).employeeType === 'emekli';
    const [, month] = period.split('-').map(Number);
    const ayNo = month || 1;
    const reqGross = nettenBruteHesapla(targetNet, {
      yolParasi,
      gidaYardimi,
      prim,
      ikramiye,
      digerKazanclar,
      avans,
      besKesintisi,
      icraKesintisi,
      digerKesintiler,
      isEmekli,
      ayNo,
      oncekiAylarGVMatrahi: Number(bordro.kumulatif_vergi_matrahi || 0)
    });
    setTemelKazanc(reqGross);
    autoCalculateTaxAndSGK(reqGross);
  };

  const resolvedName = employeeName || bordro.employeeName || (bordro as any).employees?.name || 'Personel';
  const resolvedDept = employeeDepartment || (bordro as any).employees?.department || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const payload: Partial<BordroItem> = {
        ...bordro,
        period,
        temel_kazanc: temelKazanc,
        brut_maas: calculatedToplamKazanc,
        toplam_kazanc: calculatedToplamKazanc,
        yol_parasi: yolParasi,
        gida_yardimi: gidaYardimi,
        prim,
        ikramiye,
        diger_kazanclar: digerKazanclar,
        sgk_isci_payi: sgkIsciPayi,
        issizlik_sigortasi: issizlikSigortasi,
        gelir_vergisi: gelirVergisi,
        damga_vergisi: damgaVergisi,
        bes_kesintisi: besKesintisi,
        icra_kesintisi: icraKesintisi,
        maas_tipi: maasTipi,
        hesaplama_yontemi: maasTipi === 'net' ? 'netten_brute' : 'brutten_nete',
        avans,
        diger_kesintiler: digerKesintiler,
        toplam_kesinti: calculatedToplamKesinti,
        net_maas: calculatedNetMaas,
        approval_status: approvalStatus as any,
        aciklama,
        employeeName: resolvedName,
        employees: {
          name: resolvedName,
          department: resolvedDept,
        } as any,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Bordro güncelleme hatası:', err);
      setErrorMsg(err?.message || 'Bordro güncellenirken bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    const confirmDelete = window.confirm(
      `${resolvedName} personeline ait ${period} dönemi bordro kaydını kalıcı olarak silmek istediğinize emin misiniz?`
    );
    if (!confirmDelete) return;

    setDeleting(true);
    setErrorMsg(null);
    try {
      await onDelete(bordro.id);
      onClose();
    } catch (err: any) {
      console.error('Bordro silme hatası:', err);
      setErrorMsg(err?.message || 'Bordro silinirken bir hata oluştu.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-5 flex items-center justify-between text-white shadow-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Bordro Düzenle</h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {resolvedName} • {resolvedDept ? `${resolvedDept} • ` : ''}{period} Dönemi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-center gap-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dönem ve Durum Seçimi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/70 border border-gray-100 p-4 rounded-2xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Bordro Dönemi
              </label>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                Onay Durumu
              </label>
              <select
                value={approvalStatus}
                onChange={(e) => setApprovalStatus(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="onaylandi">✅ Onaylandı</option>
                <option value="beklemede">⏳ Onay Bekliyor</option>
                <option value="taslak">📝 Taslak</option>
                <option value="reddedildi">❌ Reddedildi</option>
              </select>
            </div>
          </div>

          {/* Maaş Belirleme (Brüt & Net Ayrı Ayrı) */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/50 border-2 border-blue-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-gray-900">Maaş Belirleme (Brüt & Net)</span>
              </div>
              <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setMaasTipi('brut')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    maasTipi === 'brut'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Brütten Nete
                </button>
                <button
                  type="button"
                  onClick={() => setMaasTipi('net')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    maasTipi === 'net'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Netten Brüte
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Brüt Girdisi */}
              <div className={`p-3 rounded-xl border transition-all ${
                maasTipi === 'brut' ? 'bg-white border-blue-400 ring-2 ring-blue-100' : 'bg-gray-50/80 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Brüt Maaş (₺)</label>
                  {maasTipi === 'brut' ? (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Girdi</span>
                  ) : (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Hesaplanan</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={temelKazanc === 0 ? '' : temelKazanc}
                  onChange={(e) => handleBrutInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Net Girdisi */}
              <div className={`p-3 rounded-xl border transition-all ${
                maasTipi === 'net' ? 'bg-white border-emerald-400 ring-2 ring-emerald-100' : 'bg-gray-50/80 border-gray-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700">Net Ele Geçen (₺)</label>
                  {maasTipi === 'net' ? (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Hedef Net</span>
                  ) : (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">Hesaplanan</span>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={netHedefInput}
                  onChange={(e) => handleNetInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-gray-500 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-blue-500" />
                {maasTipi === 'net' ? 'Net tutara göre 2026 Gelir Vergisi & SGK ile brüt bulunur' : 'Brüt tutardan yasal kesintiler hesaplanır'}
              </span>
              <button
                type="button"
                onClick={() => autoCalculateTaxAndSGK()}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-100/70 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
              >
                <Calculator className="w-3 h-3" />
                Mevzuatı Yeniden Hesapla
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kazançlar Sütunu */}
            <div className="space-y-4 bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <h3 className="text-sm font-bold text-emerald-900 uppercase tracking-wider">Kazançlar & Haklar</h3>
                <span className="text-xs font-bold text-emerald-700">Toplam: {formatMoney(calculatedToplamKazanc)} ₺</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Temel Ücret / Maaş (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={temelKazanc}
                  onChange={(e) => setTemelKazanc(parseNumber(e.target.value))}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Yol Parası (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={yolParasi}
                    onChange={(e) => setYolParasi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gıda Yardımı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gidaYardimi}
                    onChange={(e) => setGidaYardimi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prim (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={prim}
                    onChange={(e) => setPrim(parseNumber(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">İkramiye (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ikramiye}
                    onChange={(e) => setIkramiye(parseNumber(e.target.value))}
                    className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Diğer Ek Kazançlar (₺)</label>
                <input
                  type="number"
                  step="0.01"
                  value={digerKazanclar}
                  onChange={(e) => setDigerKazanclar(parseNumber(e.target.value))}
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            {/* Kesintiler Sütunu */}
            <div className="space-y-4 bg-red-50/40 border border-red-100 p-5 rounded-2xl">
              <div className="flex items-center justify-between border-b border-red-200/60 pb-2">
                <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider">Yasal & Diğer Kesintiler</h3>
                <span className="text-xs font-bold text-red-700">Toplam: -{formatMoney(calculatedToplamKesinti)} ₺</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Gelir Vergisi (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gelirVergisi}
                    onChange={(e) => setGelirVergisi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Damga Vergisi (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={damgaVergisi}
                    onChange={(e) => setDamgaVergisi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SGK İşçi Payı (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sgkIsciPayi}
                    onChange={(e) => setSgkIsciPayi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">İşsizlik Sigortası (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={issizlikSigortasi}
                    onChange={(e) => setIssizlikSigortasi(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {/* BES ve İcra Kesintileri */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-700">BES (%3 OKS) (₺)</label>
                    <button
                      type="button"
                      onClick={() => setBesKesintisi(Math.round(temelKazanc * 0.03 * 100) / 100)}
                      className="text-[10px] text-indigo-600 hover:underline font-semibold"
                    >
                      %3 Al
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={besKesintisi === 0 ? '' : besKesintisi}
                    onChange={(e) => setBesKesintisi(parseNumber(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-white border border-indigo-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">İcra / Nafaka (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={icraKesintisi === 0 ? '' : icraKesintisi}
                    onChange={(e) => setIcraKesintisi(parseNumber(e.target.value))}
                    placeholder="0.00"
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Avans Kesintisi (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={avans}
                    onChange={(e) => setAvans(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Diğer Kesintiler (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={digerKesintiler}
                    onChange={(e) => setDigerKesintiler(parseNumber(e.target.value))}
                    className="w-full bg-white border border-red-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Net Ücret Özet Bannerı */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Ödenecek Net Ücret</span>
              <p className="text-xs text-blue-600/80 mt-0.5">Toplam Kazanç ({formatMoney(calculatedToplamKazanc)} ₺) - Toplam Kesinti ({formatMoney(calculatedToplamKesinti)} ₺)</p>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-blue-700">
                {formatMoney(calculatedNetMaas)} ₺
              </span>
            </div>
          </div>

          {/* Not / Açıklama */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Yönetici Açıklaması / Bordro Notu
            </label>
            <textarea
              rows={2}
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Bordroya eklemek istediğiniz not veya açıklama..."
              className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3 shrink-0">
          <div>
            {isManager && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-sm font-semibold transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{deleting ? 'Siliniyor...' : 'Bordroyu Sil'}</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-semibold transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || deleting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
