import React from 'react';
import { DeductionMatrix } from '../../types/tazminatTypes';
import { formatCurrency } from '../../utils/tazminatCalculators';
import { FileSpreadsheet, Download } from 'lucide-react';

interface Props {
  matrix: DeductionMatrix;
}

export const DeductionMatrixSummary: React.FC<Props> = ({ matrix }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Tüm Hakediş ve Kesinti Matrisi Tablosu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tüm hakediş kalemleri, SGK kesintileri, Gelir Vergisi ve Damga Vergisi detayı.
          </p>
        </div>
      </div>

      {/* Table Display */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3 px-3">HAKEDİŞ KALEMİ</th>
              <th className="py-3 px-3 text-right">BRÜT TUTAR</th>
              <th className="py-3 px-3 text-right">SGK İŞÇİ (%14)</th>
              <th className="py-3 px-3 text-right">İŞSİZLİK (%1)</th>
              <th className="py-3 px-3 text-right">G.V. MATRAHI</th>
              <th className="py-3 px-3 text-right">GELİR VERGİSİ</th>
              <th className="py-3 px-3 text-right">DAMGA V. (%0,759)</th>
              <th className="py-3 px-3 text-right text-red-600">TOPLAM KESİNTİ</th>
              <th className="py-3 px-3 text-right text-green-700 font-extrabold">NET ELE GEÇEN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {matrix.rows.map((row, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                <td className="py-2.5 px-3 font-semibold text-slate-900">{row.title}</td>
                <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(row.grossAmount)}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{row.sgkWorker > 0 ? formatCurrency(row.sgkWorker) : '-'}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{row.unemployment > 0 ? formatCurrency(row.unemployment) : '-'}</td>
                <td className="py-2.5 px-3 text-right text-slate-600">{row.incomeTaxBase > 0 ? formatCurrency(row.incomeTaxBase) : '-'}</td>
                <td className="py-2.5 px-3 text-right text-red-600">{row.incomeTax > 0 ? formatCurrency(row.incomeTax) : '-'}</td>
                <td className="py-2.5 px-3 text-right text-red-600">{row.stampTax > 0 ? formatCurrency(row.stampTax) : '-'}</td>
                <td className="py-2.5 px-3 text-right text-red-600 font-bold">{formatCurrency(row.totalDeduction)}</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-green-700 bg-green-50/30">{formatCurrency(row.netAmount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-900 text-white font-bold text-xs border-t-2 border-slate-800">
            <tr>
              <td className="py-3 px-3 text-blue-300">GENEL TOPLAM:</td>
              <td className="py-3 px-3 text-right text-amber-300 font-black">{formatCurrency(matrix.totalGross)}</td>
              <td className="py-3 px-3 text-right">{formatCurrency(matrix.totalSgkWorker)}</td>
              <td className="py-3 px-3 text-right">{formatCurrency(matrix.totalUnemployment)}</td>
              <td className="py-3 px-3 text-right">-</td>
              <td className="py-3 px-3 text-right text-red-300">{formatCurrency(matrix.totalIncomeTax)}</td>
              <td className="py-3 px-3 text-right text-red-300">{formatCurrency(matrix.totalStampTax)}</td>
              <td className="py-3 px-3 text-right text-red-400 font-black">{formatCurrency(matrix.totalDeduction)}</td>
              <td className="py-3 px-3 text-right text-green-400 text-sm font-black">{formatCurrency(matrix.totalNet)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
