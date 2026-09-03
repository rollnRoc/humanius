import React, { useState } from 'react';
import { Eye, Pencil, Trash2, Send, Upload, FileText, ChevronDown, ArrowUpDown } from 'lucide-react';
import { BordroItem } from '../types/bordro';

interface BordroListProps {
  isEmployeeView?: boolean;
  bordrolar: BordroItem[];
  employees?: any[];
  onEdit: (bordro: BordroItem) => void;
  onDelete: (id: string) => void;
  onView: (bordro: BordroItem) => void;
  onImport: (bordrolar: Partial<BordroItem>[]) => void;
  onSendForApproval: (bordro: BordroItem) => void;
}

const BordroList: React.FC<BordroListProps> = ({
  bordrolar,
  employees = [],
  onEdit,
  onDelete,
  onView,
  onImport,
  onSendForApproval,
  isEmployeeView = false,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const periods = ['all', ...Array.from(new Set(bordrolar.map((b) => b.period))).sort().reverse()];

  const filtered = (selectedPeriod === 'all'
    ? bordrolar
    : bordrolar.filter((b) => b.period === selectedPeriod)
  ).slice().sort((a, b) => {
    const nameA = (a as any).employeeName ?? (a as any).employees?.name ?? (employees?.find((e: any) => e.id === a.employee_id)?.name) ?? '';
    const nameB = (b as any).employeeName ?? (b as any).employees?.name ?? (employees?.find((e: any) => e.id === b.employee_id)?.name) ?? '';
    const cmp = nameA.localeCompare(nameB, 'tr');
    return sortOrder === 'asc' ? cmp : -cmp;
  });

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

          {/* Alfabetik Sıralama Butonu */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            <span>{sortOrder === 'asc' ? 'A → Z Sırala' : 'Z → A Sırala'}</span>
          </button>

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
                <th
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors select-none font-semibold text-gray-700"
                  title={sortOrder === 'asc' ? 'A → Z Sıralı (Tersine çevirmek için tıklayın: Z → A)' : 'Z → A Sıralı (Düz çevirmek için tıklayın: A → Z)'}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Personel</span>
                    <span className="text-blue-600 font-bold text-xs">
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                    <span className="text-[10px] lowercase font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                    </span>
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Dönem</th>
                <th className="px-4 py-3 text-right">Brüt Ücret</th>
                <th className="px-4 py-3 text-right">Net Ücret</th>
                <th className="px-4 py-3 text-right">Toplam Kesinti</th>
                <th className="px-4 py-3 text-left">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((bordro) => (
                <tr key={bordro.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-800">
                      {(bordro as any).employeeName ?? (bordro as any).employees?.name ?? (employees?.find((e: any) => e.id === bordro.employee_id)?.name) ?? 'Personel'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(bordro as any).employees?.department ?? (employees?.find((e: any) => e.id === bordro.employee_id)?.department) ?? ''}
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
                    <div className="flex items-center gap-1.5">
                      {!isEmployeeView ? (
                        <>
                          <button
                            onClick={() => onEdit(bordro)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                            title="Bordroyu Düzenle"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Düzenle</span>
                          </button>
                          <button
                            onClick={() => onDelete(bordro.id)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                            title="Bordroyu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Sil</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => onView(bordro)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Görüntüle</span>
                        </button>
                      )}
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
