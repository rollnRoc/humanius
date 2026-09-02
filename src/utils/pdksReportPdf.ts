export interface PdksReportRecord {
  employeeName: string;
  tcNo?: string;
  department: string;
  position?: string;
  shiftName: string;
  shiftHours: string;
  checkIn: string;
  checkOut: string;
  officeName: string;
  durum: string;
  mesaiSaat: number;
  gecikmeDk?: number;
  notlar?: string;
}

export interface PdksReportStats {
  toplam: number;
  gelen: number;
  gecKalan: number;
  izinli: number;
  devamsiz: number;
  toplamMesai: number;
}

export const printPdksDevamRaporuPdf = (params: {
  companyName: string;
  reportTitle?: string;
  dateStr: string;
  records: PdksReportRecord[];
  stats?: PdksReportStats;
  preparedBy?: string;
}) => {
  const {
    companyName = 'Şirket Adı',
    reportTitle = 'GÜNLÜK PERSONEL PDKS DEVAM VE VARDİYA ÇİZELGESİ',
    dateStr = new Date().toLocaleDateString('tr-TR'),
    records = [],
    stats,
    preparedBy = 'İnsan Kaynakları & PDKS Birimi',
  } = params;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Rapor penceresi açılamadı. Lütfen tarayıcınızın açılır pencere engelleyicisini (pop-up blocker) devre dışı bırakın.');
    return;
  }

  // Calculate statistics if not explicitly provided
  const computedStats: PdksReportStats = stats || {
    toplam: records.length,
    gelen: records.filter((r) => r.durum === 'Zamanında' || r.durum === 'Geç Kaldı' || r.durum === 'Mesai Devam Ediyor').length,
    gecKalan: records.filter((r) => r.durum === 'Geç Kaldı').length,
    izinli: records.filter((r) => r.durum === 'İzinli').length,
    devamsiz: records.filter((r) => r.durum === 'Giriş Yapılmadı' || r.durum === 'Devamsız').length,
    toplamMesai: records.reduce((acc, r) => acc + (Number(r.mesaiSaat) || 0), 0),
  };

  const rowsHtml = records
    .map((r, index) => {
      let badgeStyle = 'background:#f1f5f9; color:#475569;';
      if (r.durum === 'Zamanında') badgeStyle = 'background:#dcfce7; color:#166534; font-weight:bold;';
      else if (r.durum === 'Geç Kaldı') badgeStyle = 'background:#fef9c3; color:#854d0e; font-weight:bold;';
      else if (r.durum === 'Mesai Devam Ediyor') badgeStyle = 'background:#e0e7ff; color:#3730a3; font-weight:bold;';
      else if (r.durum === 'İzinli') badgeStyle = 'background:#e0f2fe; color:#0369a1; font-weight:bold;';
      else if (r.durum === 'Giriş Yapılmadı' || r.durum === 'Devamsız') badgeStyle = 'background:#fee2e2; color:#991b1b; font-weight:bold;';

      return `
        <tr>
          <td style="text-align:center; color:#64748b; font-size:10px;">${index + 1}</td>
          <td>
            <strong>${r.employeeName}</strong>
            ${r.tcNo ? `<div style="font-size:9px; color:#64748b;">TC: ${r.tcNo}</div>` : ''}
          </td>
          <td>
            <div>${r.department || 'Genel'}</div>
            ${r.position ? `<div style="font-size:9px; color:#64748b;">${r.position}</div>` : ''}
          </td>
          <td>
            <span style="font-size:10px; font-weight:600; color:#1e293b;">${r.shiftName || 'Standart'}</span>
            <div style="font-size:9px; color:#64748b; font-family:monospace;">${r.shiftHours || '-'}</div>
          </td>
          <td style="text-align:center; font-family:monospace; font-weight:bold; color:#0f172a;">${r.checkIn || '-'}</td>
          <td style="text-align:center; font-family:monospace; font-weight:bold; color:#0f172a;">${r.checkOut || '-'}</td>
          <td style="text-align:center; font-size:10px;">${r.officeName && r.officeName !== '-' ? r.officeName : 'Merkez'}</td>
          <td style="text-align:center; font-family:monospace; font-weight:bold; color:#2563eb;">${r.mesaiSaat > 0 ? `${r.mesaiSaat}s` : '-'}</td>
          <td style="text-align:center;">
            <span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:9.5px; ${badgeStyle}">
              ${r.durum}
            </span>
          </td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${reportTitle} - ${companyName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm 12mm 12mm 12mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
      background-color: #fff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .report-subtitle {
      font-size: 12px;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .stats-bar {
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
    }
    .stat-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 6px 10px;
      text-align: center;
    }
    .stat-card .num {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
    }
    .stat-card .label {
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 1px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      font-size: 10.5px;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 28%;
      text-align: center;
      border-top: 1px dashed #94a3b8;
      padding-top: 6px;
      font-size: 10px;
      color: #475569;
    }
    .sig-box strong {
      display: block;
      color: #0f172a;
      margin-bottom: 30px;
    }
    .footer {
      margin-top: 15px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-title">${companyName}</div>
      <div class="report-subtitle">${reportTitle}</div>
    </div>
    <div class="meta-box">
      <div>Rapor Tarihi: <strong>${dateStr}</strong></div>
      <div>Hazırlayan: <strong>${preparedBy}</strong></div>
      <div>Oluşturulma Zamanı: <strong>${new Date().toLocaleTimeString('tr-TR')}</strong></div>
    </div>
  </div>

  <div class="stats-bar">
    <div class="stat-card">
      <div class="num">${computedStats.toplam}</div>
      <div class="label">Toplam Personel</div>
    </div>
    <div class="stat-card" style="border-left: 3px solid #22c55e;">
      <div class="num" style="color:#16a34a;">${computedStats.gelen}</div>
      <div class="label">Giriş Yapan</div>
    </div>
    <div class="stat-card" style="border-left: 3px solid #eab308;">
      <div class="num" style="color:#ca8a04;">${computedStats.gecKalan}</div>
      <div class="label">Geç Kalan</div>
    </div>
    <div class="stat-card" style="border-left: 3px solid #0284c7;">
      <div class="num" style="color:#0284c7;">${computedStats.izinli}</div>
      <div class="label">İzinli</div>
    </div>
    <div class="stat-card" style="border-left: 3px solid #ef4444;">
      <div class="num" style="color:#dc2626;">${computedStats.devamsiz}</div>
      <div class="label">Giriş Yapmayan</div>
    </div>
    <div class="stat-card" style="border-left: 3px solid #8b5cf6;">
      <div class="num" style="color:#7c3aed;">${computedStats.toplamMesai.toFixed(1)}s</div>
      <div class="label">Toplam Çalışma</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:25px; text-align:center;">#</th>
        <th style="width:160px;">Personel Adı Soyadı</th>
        <th style="width:120px;">Departman & Görev</th>
        <th style="width:140px;">Atanmış Vardiya</th>
        <th style="width:65px; text-align:center;">Giriş</th>
        <th style="width:65px; text-align:center;">Çıkış</th>
        <th style="width:85px; text-align:center;">Ofis / Şube</th>
        <th style="width:65px; text-align:center;">Süre</th>
        <th style="width:95px; text-align:center;">Durum</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding:15px; color:#64748b;">Kayıt bulunamadı.</td></tr>'}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-box">
      <strong>PDKS & Devam Kontrol Görevlisi</strong>
      İmza
    </div>
    <div class="sig-box">
      <strong>İnsan Kaynakları Müdürü</strong>
      İmza & Kaşe
    </div>
    <div class="sig-box">
      <strong>Genel Müdür / Şirket Yetkilisi</strong>
      Onay İmza
    </div>
  </div>

  <div class="footer">
    Humanius HRMS • Bu belge elektronik PDKS sistemi tarafından üretilmiştir. Resmi denetim ve bordro kayıtlarına uygundur.
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 350);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

/**
 * Helper to export PDKS table as Excel-compatible CSV file
 */
export const exportPdksToCsv = (
  companyName: string,
  dateStr: string,
  records: PdksReportRecord[]
) => {
  const headers = [
    'Sıra',
    'Personel Adı Soyadı',
    'TC Kimlik No',
    'Departman',
    'Pozisyon',
    'Atanmış Vardiya',
    'Vardiya Saatleri',
    'Giriş Saati',
    'Çıkış Saati',
    'Çalışılan Ofis',
    'Çalışma Süresi (Saat)',
    'Durum',
  ];

  const rows = records.map((r, i) => [
    i + 1,
    `"${r.employeeName || ''}"`,
    `"${r.tcNo || ''}"`,
    `"${r.department || ''}"`,
    `"${r.position || ''}"`,
    `"${r.shiftName || ''}"`,
    `"${r.shiftHours || ''}"`,
    `"${r.checkIn || ''}"`,
    `"${r.checkOut || ''}"`,
    `"${r.officeName || ''}"`,
    r.mesaiSaat || 0,
    `"${r.durum || ''}"`,
  ]);

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel Turkish character support
    headers.join(';') +
    '\n' +
    rows.map((row) => row.join(';')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `PDKS_Devam_Raporu_${companyName.replace(/\s+/g, '_')}_${dateStr.replace(/\./g, '-')}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
