import React, { useState } from 'react';
import { FileText, Download, BarChart3, PieChart, TrendingUp } from 'lucide-react';
import { Employee } from '../types';
import { IzinTalebi, IzinHakki } from '../types/izin';
import { izinTuruLabels, izinDurumLabels, formatDate, getMaxIzinSureleri } from '../utils/izinCalculations';

interface IzinRaporlariProps {
  employees: Employee[];
  izinTalepleri: IzinTalebi[];
  izinHaklari: IzinHakki[];
}

const IzinRaporlari: React.FC<IzinRaporlariProps> = ({
  employees,
  izinTalepleri,
  izinHaklari
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState<'ozet' | 'detay' | 'haklar'>('ozet');
  const [activeTab, setActiveTab] = useState('ozet');

  // Departmanlar
  const departments = [...new Set(employees.map(e => e.department))];

  // Filtrelenmiş veriler
  const filteredEmployees = selectedDepartment === 'all' 
    ? employees 
    : employees.filter(e => e.department === selectedDepartment);

  const filteredTalepler = izinTalepleri.filter(talep => {
    const talepYili = new Date(talep.talepTarihi).getFullYear();
    const departmentMatch = selectedDepartment === 'all' || talep.department === selectedDepartment;
    return talepYili === selectedYear && departmentMatch;
  });

  // İstatistikler
  const getStatistics = () => {
    const stats = {
      toplamPersonel: filteredEmployees.length,
      toplamTalep: filteredTalepler.length,
      onaylananTalep: filteredTalepler.filter(t => t.durum === 'onaylandi').length,
      bekleyenTalep: filteredTalepler.filter(t => t.durum === 'beklemede').length,
      rededilenTalep: filteredTalepler.filter(t => t.durum === 'reddedildi').length,
      
      // İzin türü bazında
      izinTurleri: Object.keys(izinTuruLabels).map(turu => ({
        turu,
        label: izinTuruLabels[turu],
        sayi: filteredTalepler.filter(t => t.izinTuru === turu && t.durum === 'onaylandi').length,
        gunSayisi: filteredTalepler
          .filter(t => t.izinTuru === turu && t.durum === 'onaylandi')
          .reduce((total, t) => total + t.gunSayisi, 0)
      })),
      
      // Departman bazında
      departmanlar: departments.map(dept => ({
        departman: dept,
        personelSayisi: employees.filter(e => e.department === dept).length,
        talepSayisi: izinTalepleri.filter(t => t.department === dept).length,
        onaylananGun: izinTalepleri
          .filter(t => t.department === dept && t.durum === 'onaylandi')
          .reduce((total, t) => total + t.gunSayisi, 0)
      }))
    };
    
    return stats;
  };

  const statistics = getStatistics();

  const exportReport = () => {
    const csvContent = [
      ['Personel Adı', 'Departman', 'İzin Türü', 'Başlangıç', 'Bitiş', 'Gün Sayısı', 'Durum', 'Talep Tarihi'].join(','),
      ...filteredTalepler.map(talep => [
        talep.employeeName,
        talep.department,
        izinTuruLabels[talep.izinTuru],
        formatDate(talep.baslangicTarihi),
        formatDate(talep.bitisTarihi),
        talep.gunSayisi,
        izinDurumLabels[talep.durum],
        formatDate(talep.talepTarihi)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `izin_raporu_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Yıl:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Departman:</label>
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">Tümü</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Rapor Türü:</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ozet">Özet Rapor</option>
            <option value="detay">Detaylı Rapor</option>
            <option value="haklar">İzin Hakları</option>
          </select>
        </div>

        <button
          onClick={exportReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors ml-auto"
        >
          <Download className="w-4 h-4" />
          CSV İndir
        </button>
      </div>

      {/* Rapor İçeriği */}
      {reportType === 'ozet' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Genel İstatistikler */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-800">Genel İstatistikler</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-600">Toplam Personel</p>
                  <p className="text-xl font-bold text-blue-800">{statistics.toplamPersonel}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-600">Toplam Talep</p>
                  <p className="text-xl font-bold text-green-800">{statistics.toplamTalep}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-yellow-600">Bekleyen</p>
                  <p className="text-lg font-bold text-yellow-800">{statistics.bekleyenTalep}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600">Onaylanan</p>
                  <p className="text-lg font-bold text-green-800">{statistics.onaylananTalep}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-600">Reddedilen</p>
                  <p className="text-lg font-bold text-red-800">{statistics.rededilenTalep}</p>
                </div>
              </div>
            </div>
          </div>

          {/* İzin Türü Dağılımı */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-800">İzin Türü Dağılımı</h3>
            </div>
            
            <div className="space-y-3">
              {statistics.izinTurleri
                .filter(item => item.sayi > 0)
                .map(item => (
                  <div key={item.turu} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-blue-500`} />
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-800">{item.sayi} talep</div>
                      <div className="text-xs text-gray-500">{item.gunSayisi} gün</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {reportType === 'detay' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Detaylı İzin Raporu</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İzin Türü</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih Aralığı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yol İzni</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylayan</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredTalepler.map((talep) => (
                  <tr key={talep.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{talep.employeeName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{talep.department}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs">
                        {izinTuruLabels[talep.izinTuru]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {formatDate(talep.baslangicTarihi)} - {formatDate(talep.bitisTarihi)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{talep.gunSayisi} gün</span>
                        <span className="text-xs text-gray-400">
                          / {getMaxIzinSureleri(talep.izinTuru).maxGun}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {talep.yolIzniTalep ? (
                        <div className="space-y-1">
                          <span className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-1 rounded-full">
                            {talep.yolIzniGun} gün
                          </span>
                          {talep.seyahatYeri && (
                            <div className="text-xs text-gray-500">{talep.seyahatYeri}</div>
                          )}
                          {talep.ilDisiSeyahat && (
                            <div className="text-xs text-yellow-600">İl dışı</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${
                        talep.durum === 'onaylandi' ? 'bg-green-50 border-green-200 text-green-700' :
                        talep.durum === 'beklemede' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
                        talep.durum === 'reddedildi' ? 'bg-red-50 border-red-200 text-red-700' :
                        'bg-gray-50 border-gray-200 text-gray-700'
                      }`}>
                        {izinDurumLabels[talep.durum]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {talep.onaylayanAdi || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportType === 'haklar' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">İzin Hakları Raporu</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Çalışma Yılı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Hak</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanılan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kalan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanım %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mazeret</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {izinHaklari
                  .filter(hak => selectedDepartment === 'all' || 
                    employees.find(e => e.id === hak.employeeId)?.department === selectedDepartment)
                  .map((hak) => {
                    const kullanilanYillik = filteredTalepler
                      .filter(t => t.employeeId === hak.employeeId && t.izinTuru === 'yillik' && t.durum === 'onaylandi')
                      .reduce((total, t) => total + t.gunSayisi, 0);
                    
                    const kalanYillik = hak.toplamHak - kullanilanYillik;
                    const kullanimOrani = hak.toplamHak > 0 ? (kullanilanYillik / hak.toplamHak) * 100 : 0;
                    
                    return (
                      <tr key={hak.employeeId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{hak.employeeName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{hak.calismaYili} yıl</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{hak.toplamHak} gün</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{kullanilanYillik} gün</td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-medium ${
                            kalanYillik > 5 ? 'text-green-600' : 
                            kalanYillik > 0 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {kalanYillik} gün
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  kullanimOrani > 80 ? 'bg-red-500' :
                                  kullanimOrani > 60 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(kullanimOrani, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{kullanimOrani.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{hak.mazeret} gün</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Departman Bazında Özet */}
      {reportType === 'ozet' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Departman Bazında Özet</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departman</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personel Sayısı</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam Talep</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Onaylanan Gün</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ortalama</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {statistics.departmanlar.map((dept) => (
                  <tr key={dept.departman} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{dept.departman}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dept.personelSayisi}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dept.talepSayisi}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{dept.onaylananGun} gün</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {dept.personelSayisi > 0 ? (dept.onaylananGun / dept.personelSayisi).toFixed(1) : '0'} gün/kişi
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IzinRaporlari;