import React from 'react';
import { EmployeeDetails, SeveranceCalculation, NoticeCalculation, OvertimeCalculation, AnnualLeaveCalculation, ReinstatementCalculation, DeductionMatrix } from '../../types/tazminatTypes';
import { formatCurrency } from '../../utils/tazminatCalculators';
import { X, Printer, FileText, CheckCircle2, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeDetails;
  severance: SeveranceCalculation;
  notice: NoticeCalculation;
  overtime: OvertimeCalculation;
  annualLeave: AnnualLeaveCalculation;
  reinstatement: ReinstatementCalculation;
  matrix: DeductionMatrix;
}

export const ExpertReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  severance,
  notice,
  overtime,
  annualLeave,
  reinstatement,
  matrix
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('expert-report-print-area');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bilirkişi Hesabı ve Tazminat Raporu - ${employee.fullName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11px; color: #1e293b; padding: 20px; line-height: 1.4; }
            h1 { font-size: 16px; text-align: center; color: #0f172a; margin-bottom: 2px; text-transform: uppercase; }
            h2 { font-size: 12px; text-align: center; color: #475569; margin-top: 0; margin-bottom: 15px; }
            .section-title { font-size: 12px; font-weight: bold; background: #f1f5f9; padding: 6px 10px; border-left: 4px solid #2563eb; margin-top: 15px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
            th, td { border: 1px solid #cbd5e1; padding: 5px 8px; text-align: left; }
            th { background-color: #f8fafc; font-weight: bold; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .total-row { background-color: #eff6ff; font-weight: bold; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; padding: 0 40px; }
            .sig-box { text-align: center; border-top: 1px dashed #94a3b8; width: 180px; pt-2; }
            @media print {
              body { padding: 0; }
              button { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const todayStr = new Date().toLocaleDateString('tr-TR');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Hukuki İK & Bilirkişi Raporu Önizleme</h2>
              <p className="text-xs text-slate-300">Resmi mahkeme ve arabuluculuk formatında hazırlanmıştır.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Printer className="w-4 h-4" />
              Yazdır / PDF Olarak Kaydet
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto bg-slate-100/60 flex-1">
          <div id="expert-report-print-area" className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 space-y-6 max-w-3xl mx-auto">
            {/* Header Document Table */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">T.C. İŞ HUKUKU İŞÇİLİK ALACAKLARI BİLİRKİŞİ RAPORU</h1>
              <h2 className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Humanius İK Yönetim Sistemleri Otomatik Hesaplama Çıktısı</h2>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-3 px-2">
                <span>Rapor Tarihi: <strong>{todayStr}</strong></span>
                <span>Doküman koda esas: <strong>HR-REP-TAZ-001</strong></span>
              </div>
            </div>

            {/* Section 1: Employee & Company Metadata */}
            <div>
              <div className="section-title text-xs font-bold bg-slate-100 p-2 rounded border-l-4 border-blue-600 text-slate-800 mb-2">
                1. TARAFLAR VE KİMLİK / ÇALIŞMA BİLGİLERİ
              </div>
              <table className="w-full text-xs border border-slate-200">
                <tbody>
                  <tr>
                    <td className="w-1/4 font-bold bg-slate-50">Çalışan Adı Soyadı:</td>
                    <td className="w-1/4">{employee.fullName}</td>
                    <td className="w-1/4 font-bold bg-slate-50">T.C. Kimlik No:</td>
                    <td className="w-1/4">{employee.tcNo || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-bold bg-slate-50">Departman / Görev:</td>
                    <td>{employee.department} / {employee.position}</td>
                    <td className="font-bold bg-slate-50">Fesih / Çıkış Kodu:</td>
                    <td>{employee.exitReason}</td>
                  </tr>
                  <tr>
                    <td className="font-bold bg-slate-50">İşe Giriş Tarihi:</td>
                    <td>{employee.startDate}</td>
                    <td className="font-bold bg-slate-50">İşten Çıkış Tarihi:</td>
                    <td>{employee.endDate}</td>
                  </tr>
                  <tr>
                    <td className="font-bold bg-slate-50">Hizmet Süresi (Kıdem):</td>
                    <td colSpan={3} className="font-bold text-blue-900">
                      {severance.workedYears} Yıl {severance.workedMonths} Ay {severance.workedDays} Gün (Toplam {severance.totalDaysWorked} Gün)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 2: Wage Breakdown */}
            <div>
              <div className="section-title text-xs font-bold bg-slate-100 p-2 rounded border-l-4 border-blue-600 text-slate-800 mb-2">
                2. HESABA ESAS ÜCRET VE GİYDİRİLMİŞ MAAŞ KALEMLERİ
              </div>
              <table className="w-full text-xs border border-slate-200">
                <tbody>
                  <tr>
                    <td className="font-bold bg-slate-50">Son Çıplak Brüt Ücret:</td>
                    <td className="text-right font-bold">{formatCurrency(severance.nakedGrossWage)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50">Aylık Yemek Yardımı (30 Günlük):</td>
                    <td className="text-right">{formatCurrency((employee.dailyFood || 0) * 30)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50">Aylık Yol Desteği:</td>
                    <td className="text-right">{formatCurrency(employee.monthlyRoad || 0)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50">Aylık İkramiye / Prim Payı (Yıllık / 12):</td>
                    <td className="text-right">{formatCurrency((employee.annualBonus || 0) / 12)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-50">Diğer Sosyal Yardımlar Aylık Ort.:</td>
                    <td className="text-right">{formatCurrency(employee.otherBenefitsMonthly || 0)}</td>
                  </tr>
                  <tr className="bg-blue-50 font-bold text-blue-950">
                    <td>TOPLAM GİYDİRİLMİŞ BRÜT MAAŞ:</td>
                    <td className="text-right text-sm">{formatCurrency(severance.clothedGrossWage)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Hakediş ve Kesinti Matrisi */}
            <div>
              <div className="section-title text-xs font-bold bg-slate-100 p-2 rounded border-l-4 border-blue-600 text-slate-800 mb-2">
                3. HAKEDİŞ HESAPLAMALARI VE YASAL KESİNTİ MATRİSİ
              </div>
              <table className="w-full text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-800 text-white font-bold text-[10px]">
                    <th>ALACAK KALEMİ</th>
                    <th className="text-right">BRÜT TUTAR</th>
                    <th className="text-right">SGK KESİNTİSİ</th>
                    <th className="text-right">GELİR VERGİSİ</th>
                    <th className="text-right">DAMGA VERGİSİ</th>
                    <th className="text-right">NET TUTAR</th>
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="font-semibold">{r.title}</td>
                      <td className="text-right font-bold">{formatCurrency(r.grossAmount)}</td>
                      <td className="text-right">{r.sgkWorker + r.unemployment > 0 ? formatCurrency(r.sgkWorker + r.unemployment) : '-'}</td>
                      <td className="text-right">{r.incomeTax > 0 ? formatCurrency(r.incomeTax) : '-'}</td>
                      <td className="text-right">{r.stampTax > 0 ? formatCurrency(r.stampTax) : '-'}</td>
                      <td className="text-right font-bold text-green-700">{formatCurrency(r.netAmount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-100 font-extrabold text-slate-900 border-t-2 border-slate-400">
                    <td>GENEL TOPLAM:</td>
                    <td className="text-right text-blue-900">{formatCurrency(matrix.totalGross)}</td>
                    <td className="text-right">{formatCurrency(matrix.totalSgkWorker + matrix.totalUnemployment)}</td>
                    <td className="text-right">{formatCurrency(matrix.totalIncomeTax)}</td>
                    <td className="text-right">{formatCurrency(matrix.totalStampTax)}</td>
                    <td className="text-right text-green-800 text-sm">{formatCurrency(matrix.totalNet)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Signatures Footer */}
            <div className="pt-8 flex justify-between px-12 text-center text-xs">
              <div className="border-t border-dashed border-slate-400 pt-2 w-44">
                <p className="font-bold text-slate-800">Hesaplayan / İK Uzmanı</p>
                <p className="text-[10px] text-slate-500">İmza / Mühür</p>
              </div>
              <div className="border-t border-dashed border-slate-400 pt-2 w-44">
                <p className="font-bold text-slate-800">Onaylayan / Bilirkişi</p>
                <p className="text-[10px] text-slate-500">İmza / Mühür</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
