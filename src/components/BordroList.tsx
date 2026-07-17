import React, { useState } from 'react';
import { Eye, Pencil, Trash2, Send, Upload, FileText, ChevronDown } from 'lucide-react';
import { BordroItem } from '../types/bordro';

interface BordroListProps {
  isEmployeeView?: boolean;
  bordrolar: BordroItem[];
  onEdit: (bordro: BordroItem) => void;
  onDelete: (id: string) => void;
  onView: (bordro: BordroItem) => void;
  onImport: (bordrolar: Partial<BordroItem>[]) => void;
  onSendForApproval: (bordro: BordroItem) => void;
}

const BordroList: React.FC<BordroListProps> = ({
  bordrolar,
  onEdit,
  onDelete,
  onView,
  onImport,
  onSendForApproval,
  isEmployeeView = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const periods = ['all', ...Array.from(new Set(bordrolar.map((b) => b.period))).sort().reverse()];

  const filtered = selectedPeriod === 'all'
    ? bordrolar
    : bordrolar.filter((b) => b.period === selectedPeriod);

  const fmt = (v: number) =>
    v?.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-800">Bordro Kayıtları</h3>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {filtered.length} kayıt
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Dönem filtre */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-white border border-gray-200 text-gray-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-blue-500"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p === 'all' ? 'Tüm Dönemler' : p}
              </option>
            ))}
          </select>

          {/* CSV import */}
          {!isEmployeeView && (
          <label className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-sm font-medium hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            İçe Aktar
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport([]);
              }}
            />
          </label>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Bu dönem için henüz bordro kaydı bulunmuyor.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Personel</th>
                <th className="px-4 py-3 text-left">Dönem</th>
                <th className="px-4 py-3 text-right">Brüt Ücret</th>
                <th className="px-4 py-3 text-right">Net Ücret</th>
                <th className="px-4 py-3 text-right">Toplam Kesinti</th>
                {!isEmployeeView && <th className="px-4 py-3 text-left">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((bordro) => (
                <tr key={bordro.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {(bordro as any).employees?.name ?? bordro.employee_id}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(bordro as any).employees?.department ?? ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{bordro.period}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-gray-800">
                    {fmt(bordro.brut_maas)} ₺
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-700">
                    {fmt(bordro.net_maas)} ₺
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-red-600">
                    {fmt(bordro.toplam_kesinti)} ₺
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onView(bordro)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Görüntüle"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Toplam satırı */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                <td className="px-4 py-3 text-gray-700" colSpan={2}>
                  Toplam ({filtered.length} bordro)
                </td>
                <td className="px-4 py-3 text-right text-gray-800">
                  {fmt(filtered.reduce((s, b) => s + (b.brut_maas ?? 0), 0))} ₺
                </td>
                <td className="px-4 py-3 text-right text-green-700">
                  {fmt(filtered.reduce((s, b) => s + (b.net_maas ?? 0), 0))} ₺
                </td>
                <td className="px-4 py-3 text-right text-red-600">
                  {fmt(filtered.reduce((s, b) => s + (b.toplam_kesinti ?? 0), 0))} ₺
                </td>
                {!isEmployeeView && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};

export default BordroList;
