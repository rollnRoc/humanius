import React, { useState, useMemo } from 'react';
import { Download, Search, Filter } from 'lucide-react';
import type { BordroItem } from '../types/bordro';

interface BordroIcmalProps {
  bordrolar: BordroItem[];
}

const parseSafeNumber = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) || !isFinite(val) ? 0 : val;
  const parsed = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) || !isFinite(parsed) ? 0 : parsed;
};

const getSgkIsci = (b: any) => parseSafeNumber(b.sgk_isci_payi ?? b.sgk_isci ?? b.sgk_isci_tutar ?? b.sgk_kesintisi);
const getSgkIsveren = (b: any) => parseSafeNumber(b.sgk_isveren_payi ?? b.sgk_isveren ?? b.sgk_isveren_tutar);
const getGelirVergisi = (b: any) => parseSafeNumber(b.gelir_vergisi ?? b.gelir_vergisi_tutar ?? b.vergi);
const getBrutMaas = (b: any) => parseSafeNumber(b.brut_maas ?? b.brut);
const getNetMaas = (b: any) => parseSafeNumber(b.net_maas ?? b.net);
const getToplamKesinti = (b: any) => parseSafeNumber(b.toplam_kesinti ?? b.kesinti);
const getDamgaVergisi = (b: any) => parseSafeNumber(b.damga_vergisi ?? b.damga);

const BordroIcmal: React.FC<BordroIcmalProps> = ({ bordrolar }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Benzersiz donemleri al
  const periods = useMemo(() => {
    return Array.from(new Set(bordrolar.map(b => b.period))).sort().reverse();
  }, [bordrolar]);

  const filteredBordrolar = useMemo(() => {
    return bordrolar.filter(b => {
      const matchPeriod = selectedPeriod === 'all' || b.period === selectedPeriod;
      const matchSearch = !searchTerm || 
        (b.employees?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (b.employees?.department?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      return matchPeriod && matchSearch;
    });
  }, [bordrolar, selectedPeriod, searchTerm]);

  // Icmal Toplamlari
  const totals = useMemo(() => {
    return filteredBordrolar.reduce((acc, curr) => ({
      brut_maas: acc.brut_maas + getBrutMaas(curr),
      net_maas: acc.net_maas + getNetMaas(curr),
      toplam_kesinti: acc.toplam_kesinti + getToplamKesinti(curr),
      sgk_isci_payi: acc.sgk_isci_payi + getSgkIsci(curr),
      sgk_isveren_payi: acc.sgk_isveren_payi + getSgkIsveren(curr),
      gelir_vergisi: acc.gelir_vergisi + getGelirVergisi(curr),
      damga_vergisi: acc.damga_vergisi + getDamgaVergisi(curr)
    }), {
      brut_maas: 0,
      net_maas: 0,
      toplam_kesinti: 0,
      sgk_isci_payi: 0,
      sgk_isveren_payi: 0,
      gelir_vergisi: 0,
      damga_vergisi: 0
    });
  }, [filteredBordrolar]);

  const handleExportExcel = () => {
    const headers = [
      'Dönem', 'Personel', 'Departman', 'TC No', 'Brüt Maaş', 
      'Net Maaş', 'SGK İşçi', 'SGK İşveren', 'Gelir Vergisi', 
      'Damga Vergisi', 'Toplam Kesinti'
    ];
    
    const rows = filteredBordrolar.map(b => [
      b.period,
      b.employees?.name || '-',
      b.employees?.department || '-',
      b.tc_no || b.employees?.tc_no || '-',
      getBrutMaas(b),
      getNetMaas(b),
      getSgkIsci(b),
      getSgkIsveren(b),
      getGelirVergisi(b),
      getDamgaVergisi(b),
      getToplamKesinti(b)
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bordro_icmal_${selectedPeriod === 'all' ? 'tum_donemler' : selectedPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (val: any) => {
    const num = parseSafeNumber(val);
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Bordro İcmal Raporu</h2>
          <p className="text-sm text-gray-500 mt-1">
            Tüm personellerin bordro özetlerini tablo halinde inceleyin ve dışa aktarın.
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-green-700 transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Excel Olarak İndir
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[250px] relative">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Personel veya departman ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          >
            <option value="all">Tüm Dönemler</option>
            {periods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Dönem</th>
                <th className="px-4 py-3">Personel</th>
                <th className="px-4 py-3 text-right">Brüt Maaş</th>
                <th className="px-4 py-3 text-right">SGK İşçi</th>
                <th className="px-4 py-3 text-right">SGK İşveren</th>
                <th className="px-4 py-3 text-right">Gelir Vergisi</th>
                <th className="px-4 py-3 text-right">Toplam Kesinti</th>
                <th className="px-4 py-3 text-right font-bold text-blue-600">Net Maaş</th>
              </tr>
            </thead>
            <tbody>
              {filteredBordrolar.length > 0 ? (
                filteredBordrolar.map((bordro, idx) => (
                  <tr key={bordro.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{bordro.period}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-800">{bordro.employees?.name}</p>
                        <p className="text-xs text-gray-500">{bordro.employees?.department}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatMoney(getBrutMaas(bordro))}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatMoney(getSgkIsci(bordro))}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatMoney(getSgkIsveren(bordro))}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{formatMoney(getGelirVergisi(bordro))}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatMoney(getToplamKesinti(bordro))}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">{formatMoney(getNetMaas(bordro))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Görüntülenecek bordro kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredBordrolar.length > 0 && (
              <tfoot className="bg-blue-50 border-t-2 border-blue-100 font-bold text-gray-900">
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-right">GENEL TOPLAM:</td>
                  <td className="px-4 py-4 text-right">{formatMoney(totals.brut_maas)}</td>
                  <td className="px-4 py-4 text-right">{formatMoney(totals.sgk_isci_payi)}</td>
                  <td className="px-4 py-4 text-right">{formatMoney(totals.sgk_isveren_payi)}</td>
                  <td className="px-4 py-4 text-right">{formatMoney(totals.gelir_vergisi)}</td>
                  <td className="px-4 py-4 text-right text-red-600">{formatMoney(totals.toplam_kesinti)}</td>
                  <td className="px-4 py-4 text-right text-blue-600 text-lg">{formatMoney(totals.net_maas)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default BordroIcmal;
