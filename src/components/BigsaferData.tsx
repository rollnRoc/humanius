import React, { useEffect, useState } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle, Search, Building2, Users } from 'lucide-react';

interface CompanyData {
  id: number;
  formcount?: number;
  araccount?: number;
  cid?: number;
  name?: string;
  copmanytype?: string;
  sektor?: string;
  verigdairesi?: string;
  vergino?: string;
  mersis?: string;
  tcn?: string;
  gsm?: string;
  fax?: string;
  email?: string;
  web?: string;
  il?: string;
  ilce?: string;
  adres?: string;
  bitestype?: string;
}

interface UserData {
  id: number;
  companiyid: number;
  name: string;
  lastname?: string;
  departman?: string;
  role?: string;
  email?: string;
  tel?: string;
  username?: string;
  yetki?: number;
  branchid?: number;
  bitesyetki?: number;
}

const BigsaferData: React.FC = () => {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'companies' | 'users'>('companies');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/bigsafer-data');
      const data = await response.json();
      if (data.success) {
        setCompanies(data.companies || []);
        setUsers(data.users || []);
      } else {
        setError(data.error || 'Veritabanı bağlantısı sırasında bilinmeyen bir hata oluştu.');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.message || 
        'İstek gönderilirken bir ağ hatası oluştu. Lütfen yerel sunucunun (Vite) açık olduğundan emin olun.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCompanies = companies.filter((c) =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.sektor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.il || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter((u) =>
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.lastname || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.departman || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="w-7 h-7 text-blue-600 animate-pulse" />
            Bigsafer Portal Verileri
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            213.142.131.5 IP adresindeki SQL Server veritabanından çekilen canlı test verileri.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-md"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Yenile
        </button>
      </div>

      {/* Connection Status & Errors */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 flex gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-md font-bold text-red-800">Bağlantı Hatası</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <div className="mt-3 text-xs text-red-600 bg-white p-3 rounded-lg border border-red-100 font-mono">
              <strong>Olası Nedenler:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>Veritabanı sunucusu IP adresi veya portu (1433) dışarıya kapalı olabilir (Firewall engeli).</li>
                <li>Veritabanı kullanıcı adı veya şifresi hatalı olabilir.</li>
                <li>Yerel ağınızda dış SQL Server bağlantılarına izin verilmiyor olabilir.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="text-sm font-semibold text-green-800">
            SQL Server bağlantısı başarılı! Toplam {companies.length} Şirket ve {users.length} Kullanıcı başarıyla yüklendi.
          </span>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('companies'); setSearchTerm(''); }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'companies'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Şirketler ({companies.length})
          </button>
          <button
            onClick={() => { setActiveTab('users'); setSearchTerm(''); }}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Kullanıcılar ({users.length})
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'companies' ? 'Şirket adı, sektör veya il ara...' : 'Ad, soyad, e-posta veya departman ara...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 text-gray-800 rounded-xl py-2.5 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
          />
        </div>
      </div>

      {/* Tables Grid */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 space-y-4">
            <div className="h-6 bg-gray-100 rounded-md w-1/4 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-10 bg-gray-50 rounded-md animate-pulse"></div>
              <div className="h-10 bg-gray-50 rounded-md animate-pulse"></div>
              <div className="h-10 bg-gray-50 rounded-md animate-pulse"></div>
              <div className="h-10 bg-gray-50 rounded-md animate-pulse"></div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'companies' ? (
              filteredCompanies.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Hiç şirket kaydı bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Şirket Adı</th>
                      <th className="p-4">Sektör</th>
                      <th className="p-4">Şirket Türü</th>
                      <th className="p-4">Vergi No / Daire</th>
                      <th className="p-4">GSM / Fax</th>
                      <th className="p-4">İl / İlçe</th>
                      <th className="p-4 pr-6">Adres</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredCompanies.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 pl-6 font-mono text-xs text-gray-400">{c.id}</td>
                        <td className="p-4 font-semibold text-gray-900">{c.name || '-'}</td>
                        <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">{c.sektor || '-'}</span></td>
                        <td className="p-4">{c.copmanytype || '-'}</td>
                        <td className="p-4">
                          <div className="font-semibold text-xs">{c.vergino || '-'}</div>
                          <div className="text-xs text-gray-400">{c.verigdairesi || '-'}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-xs">{c.gsm || '-'}</div>
                          {c.fax && <div className="text-[10px] text-gray-400">Fax: {c.fax}</div>}
                        </td>
                        <td className="p-4">{c.il ? `${c.il} / ${c.ilce || ''}` : '-'}</td>
                        <td className="p-4 pr-6 max-w-xs truncate text-xs" title={c.adres}>{c.adres || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : (
              filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Hiç kullanıcı kaydı bulunamadı.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-150 text-xs font-bold text-gray-500 uppercase">
                      <th className="p-4 pl-6">ID</th>
                      <th className="p-4">Ad Soyad</th>
                      <th className="p-4">Kullanıcı Adı</th>
                      <th className="p-4">E-posta</th>
                      <th className="p-4">Telefon</th>
                      <th className="p-4">Departman / Rol</th>
                      <th className="p-4">Şirket ID</th>
                      <th className="p-4 pr-6">Yetki Kodu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 pl-6 font-mono text-xs text-gray-400">{u.id}</td>
                        <td className="p-4 font-semibold text-gray-900">{u.name} {u.lastname || ''}</td>
                        <td className="p-4 font-mono text-xs">{u.username || '-'}</td>
                        <td className="p-4">{u.email || '-'}</td>
                        <td className="p-4 text-xs">{u.tel || '-'}</td>
                        <td className="p-4">
                          <div className="font-semibold text-xs text-gray-800">{u.departman || '-'}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wide">{u.role || '-'}</div>
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-500">{u.companiyid}</td>
                        <td className="p-4 pr-6">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-mono">
                            Y:{u.yetki ?? 0} | B:{u.bitesyetki ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BigsaferData;
