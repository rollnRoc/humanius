// Resmi Aylık Puantaj Cetveli PDF & Excel / CSV Dökümü

import { PersonelAylikPuantaj, PuantajKodu } from './puantajHesaplama';

const AY_ADLARI = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const printPuantajCetveliPdf = (params: {
  companyName: string;
  year: number;
  monthIndex: number;
  records: PersonelAylikPuantaj[];
  departmentFilter?: string;
  preparedBy?: string;
  saturdayConfig?: { isSaturdayWork: boolean; startTime?: string; endTime?: string; };
}) => {
  const {
    companyName = 'Humanius HRMS',
    year,
    monthIndex,
    records = [],
    departmentFilter = 'Tümü',
    preparedBy = 'İnsan Kaynakları & PDKS Birimi',
    saturdayConfig,
  } = params;

  const monthName = AY_ADLARI[monthIndex];
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Rapor penceresi açılamadı. Lütfen tarayıcınızın açılır pencere engelleyicisini (pop-up blocker) devre dışı bırakın.');
    return;
  }

  // Ayın gün sayısı
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();
  const dayNumbers = Array.from({ length: daysCount }, (_, i) => i + 1);

  // Gün başlıkları HTML
  const isSatWork = Boolean(saturdayConfig?.isSaturdayWork);
  const dayHeadersHtml = dayNumbers
    .map((d) => {
      const dt = new Date(year, monthIndex, d);
      const isSunday = dt.getDay() === 0;
      const isSaturday = dt.getDay() === 6;
      const bg = isSunday ? '#fee2e2' : isSaturday ? (isSatWork ? '#fef3c7' : '#f1f5f9') : '#ffffff';
      const color = isSunday ? '#b91c1c' : isSaturday ? (isSatWork ? '#92400e' : '#334155') : '#334155';
      return `<th style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; background:${bg}; color:${color}; width: 22px;">${d}</th>`;
    })
    .join('');

  // Personel satırları HTML
  const rowsHtml = records
    .map((rec, index) => {
      const emp = rec.employee;
      const ozet = rec.ozet;

      const dayCellsHtml = rec.gunler
        .map((g) => {
          let badgeBg = '#f8fafc';
          let badgeColor = '#475569';
          let text = g.kod;

          if (g.kod === 'Ç') {
            badgeBg = '#dcfce7';
            badgeColor = '#15803d';
            text = g.netSureSaat > 0 ? `${g.netSureSaat}s` : 'Ç';
          } else if (g.kod === 'HT') {
            badgeBg = '#dbeafe';
            badgeColor = '#1d4ed8';
          } else if (g.kod === 'AT') {
            badgeBg = '#f1f5f9';
            badgeColor = '#475569';
          } else if (g.kod === 'UBGT') {
            badgeBg = '#f3e8ff';
            badgeColor = '#7e22ce';
          } else if (g.kod === 'R' || g.kod === 'RP') {
            badgeBg = '#fef3c7';
            badgeColor = '#b45309';
          } else if (g.kod === 'Üİ' || g.kod === 'UC') {
            badgeBg = '#ffedd5';
            badgeColor = '#c2410c';
          } else if (g.kod === 'D') {
            badgeBg = '#fee2e2';
            badgeColor = '#b91c1c';
          } else if (g.kod === '-') {
            badgeBg = '#ffffff';
            badgeColor = '#cbd5e1';
            text = '-';
          } else {
            // Yİ, Mİ, PZ, EV, BA, DO, OL ve diğer tüm şirket izinleri
            badgeBg = '#ccfbf1';
            badgeColor = '#0f766e';
            text = g.kod;
          }

          return `<td style="padding: 2px 1px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #e2e8f0; background: ${badgeBg}; color: ${badgeColor};" title="${g.tarih} - ${g.kodAciklama}">${text}</td>`;
        })
        .join('');

      return `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 4px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${index + 1}</td>
          <td style="padding: 4px 6px; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; white-space: nowrap;">
            ${emp.name}
            <div style="font-size: 7px; color: #64748b; font-weight: normal;">TC: ${emp.tcNo || '-'}</div>
          </td>
          <td style="padding: 4px 6px; font-size: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">${emp.department || 'Genel'}</td>
          ${dayCellsHtml}
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #cbd5e1; background: #ecfdf5; color: #047857;">${ozet.fiiliCalismaGun}g / ${ozet.fiiliCalismaSaat}s</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${ozet.haftaTatiliGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${ozet.ucretliIzinGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; color: ${ozet.raporluGun > 0 ? '#b45309' : '#64748b'};">${ozet.raporluGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; color: ${ozet.devamsizGun > 0 ? '#b91c1c' : '#64748b'};">${ozet.devamsizGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; background: #eff6ff; color: #1d4ed8;">${ozet.bordroGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #cbd5e1; color: ${ozet.toplamFazlaMesaiSaat > 0 ? '#ea580c' : '#64748b'};">${ozet.toplamFazlaMesaiSaat > 0 ? `+${ozet.toplamFazlaMesaiSaat}s` : '-'}</td>
        </tr>
      `;
    })
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
      <meta charset="UTF-8">
      <title>${monthName} ${year} - Aylık Puantaj Cetveli - ${companyName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 8mm 8mm 8mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 9px;
          color: #475569;
          margin-top: 3px;
        }
        .legend {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
          font-size: 8px;
          padding: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .legend-box {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 2px;
          text-align: center;
          line-height: 12px;
          font-size: 7px;
          font-weight: bold;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .signature-block {
          width: 28%;
          text-align: center;
          border-top: 1px solid #94a3b8;
          padding-top: 5px;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size: 13px; font-weight: bold; color: #1e3a8a;">${companyName}</div>
          <h1 class="title">AYLIK PERSONEL PUANTAJ VE ÇALIŞMA CETVELİ</h1>
          <div class="subtitle">4857 Sayılı İş Kanunu ve İlgili Mevzuat Hükümlerine Uygundur • Birim: <strong>${departmentFilter}</strong> • Düzen: <strong>${saturdayConfig?.isSaturdayWork ? `6 Günlük (Cumartesi ${saturdayConfig.startTime || '08:30'} - ${saturdayConfig.endTime || '13:00'})` : '5 Günlük (Cumartesi Tatil)'}</strong></div>
        </div>
        <div style="text-align: right; font-size: 10px;">
          <div>Dönem: <strong style="font-size: 13px; color: #2563eb;">${monthName} ${year}</strong></div>
          <div style="color: #64748b; font-size: 8px; margin-top: 2px;">Döküm Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="color: #64748b; font-size: 8px;">Kapsam: ${records.length} Personel</div>
        </div>
      </div>

      <table>
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 20px;">#</th>
            <th style="padding: 5px 6px; font-size: 9px; border: 1px solid #cbd5e1; text-align: left; min-width: 130px;">Personel Adı Soyadı</th>
            <th style="padding: 5px 6px; font-size: 8px; border: 1px solid #cbd5e1; text-align: left; min-width: 80px;">Departman</th>
            ${dayHeadersHtml}
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 48px;">Fiili Çal.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 24px;">HT</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 24px;">İzin</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 24px;">Rap.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 24px;">Dev.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 34px; background: #dbeafe;">Bordro (30G)</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 36px;">FM Saat</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Lejant (Kod Açıklamaları) -->
      <div class="legend">
        <strong style="margin-right: 4px;">Puantaj Kodları:</strong>
        <div class="legend-item"><span class="legend-box" style="background: #dcfce7; color: #15803d;">Ç</span> Fiili Çalışma</div>
        <div class="legend-item"><span class="legend-box" style="background: #dbeafe; color: #1d4ed8;">HT</span> Hafta Tatili (Md. 46)</div>
        <div class="legend-item"><span class="legend-box" style="background: #f1f5f9; color: #475569;">AT</span> Akdi Tatil (Cmt)</div>
        <div class="legend-item"><span class="legend-box" style="background: #f3e8ff; color: #7e22ce;">UBGT</span> Resmi Tatil</div>
        <div class="legend-item"><span class="legend-box" style="background: #ccfbf1; color: #0f766e;">Yİ</span> Yıllık İzin</div>
        <div class="legend-item"><span class="legend-box" style="background: #ccfbf1; color: #0f766e;">Mİ</span> Mazeret İzni</div>
        <div class="legend-item"><span class="legend-box" style="background: #fef3c7; color: #b45309;">RP</span> Raporlu İzin</div>
        <div class="legend-item"><span class="legend-box" style="background: #ccfbf1; color: #0f766e;">PZ</span> Pazar İzni</div>
        <div class="legend-item"><span class="legend-box" style="background: #ffedd5; color: #c2410c;">Üİ</span> Ücretsiz İzin</div>
        <div class="legend-item"><span class="legend-box" style="background: #fee2e2; color: #b91c1c;">D</span> Devamsız</div>
      </div>

      <!-- İmzalar -->
      <div class="signatures">
        <div class="signature-block">
          <strong>Düzenleyen</strong><br>
          <span style="color: #64748b;">${preparedBy}</span><br>
          İmza:
        </div>
        <div class="signature-block">
          <strong>Kontrol Eden</strong><br>
          <span style="color: #64748b;">İnsan Kaynakları Müdürü</span><br>
          İmza:
        </div>
        <div class="signature-block">
          <strong>Onaylayan</strong><br>
          <span style="color: #64748b;">İşveren / Şirket Yetkilisi</span><br>
          İmza / Kaşe:
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
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
 * Excel / CSV Formatında Puantaj Verisi İndirme
 */
export const exportPuantajCsv = (
  companyName: string,
  year: number,
  monthIndex: number,
  records: PersonelAylikPuantaj[]
) => {
  const monthName = AY_ADLARI[monthIndex];
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();

  // CSV Başlıkları
  const headerDays = Array.from({ length: daysCount }, (_, i) => `Gün ${i + 1}`).join(';');
  const csvHeaders = `No;Personel Adı;TC Kimlik;Departman;${headerDays};Fiili Gün;Fiili Saat;Hafta Tatili;İzinli Gün;Raporlu Gün;Devamsız Gün;Bordro Günü (30G);Fazla Mesai Saati\n`;

  const csvRows = records
    .map((rec, i) => {
      const emp = rec.employee;
      const ozet = rec.ozet;
      const dayValues = rec.gunler.map((g) => g.kod).join(';');
      return `${i + 1};"${emp.name}";"${emp.tcNo || ''}";"${emp.department || ''}";${dayValues};${ozet.fiiliCalismaGun};${ozet.fiiliCalismaSaat};${ozet.haftaTatiliGun};${ozet.ucretliIzinGun};${ozet.raporluGun};${ozet.devamsizGun};${ozet.bordroGun};${ozet.toplamFazlaMesaiSaat}`;
    })
    .join('\n');

  const csvContent = '\uFEFF' + csvHeaders + csvRows; // UTF-8 BOM
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${companyName}_Puantaj_${monthName}_${year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export interface GunlukDetayliRaporItem {
  employeeName: string;
  tcNo?: string;
  department: string;
  tarih: string;
  gunAdi: string;
  shiftHours: string;
  girisSaati: string | null;
  cikisSaati: string | null;
  molaDk: number;
  netSureSaat: number;
  fazlaMesaiSaat: number;
  gecikmeDk: number;
  kod: string;
  kodAciklama: string;
}

export const printGunlukDetayliRaporPdf = (params: {
  companyName: string;
  periodStr: string;
  departmentFilter?: string;
  items: GunlukDetayliRaporItem[];
  preparedBy?: string;
}) => {
  const {
    companyName = 'Humanius HRMS',
    periodStr,
    departmentFilter = 'Tümü',
    items = [],
    preparedBy = 'İnsan Kaynakları & PDKS Sorumlusu',
  } = params;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Rapor penceresi açılamadı. Lütfen tarayıcınızın açılır pencere engelleyicisini (pop-up blocker) devre dışı bırakın.');
    return;
  }

  const rowsHtml = items
    .map((item, index) => {
      let badgeStyle = 'background:#f1f5f9; color:#475569;';
      if (item.kod === 'Ç') badgeStyle = 'background:#dcfce7; color:#15803d; font-weight:bold;';
      else if (item.kod === 'HT') badgeStyle = 'background:#dbeafe; color:#1d4ed8; font-weight:bold;';
      else if (item.kod === 'UBGT') badgeStyle = 'background:#f3e8ff; color:#7e22ce; font-weight:bold;';
      else if (item.kod === 'R' || item.kod === 'RP') badgeStyle = 'background:#fef3c7; color:#b45309; font-weight:bold;';
      else if (item.kod === 'Üİ' || item.kod === 'UC') badgeStyle = 'background:#ffedd5; color:#c2410c; font-weight:bold;';
      else if (item.kod === 'D') badgeStyle = 'background:#fee2e2; color:#b91c1c; font-weight:bold;';
      else badgeStyle = 'background:#ccfbf1; color:#0f766e; font-weight:bold;';

      return `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 4px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${index + 1}</td>
          <td style="padding: 4px 6px; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; white-space: nowrap;">
            ${item.employeeName}
            <div style="font-size: 7px; color: #64748b; font-weight: normal;">TC: ${item.tcNo || '-'}</div>
          </td>
          <td style="padding: 4px 6px; font-size: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">${item.department || 'Genel'}</td>
          <td style="padding: 4px 4px; font-size: 8px; font-family: monospace; border: 1px solid #cbd5e1; white-space: nowrap;">${item.tarih} (${item.gunAdi})</td>
          <td style="padding: 4px 4px; font-size: 8px; font-family: monospace; text-align: center; border: 1px solid #cbd5e1;">${item.shiftHours}</td>
          <td style="padding: 4px 4px; font-size: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; color: #1e40af;">${item.girisSaati || '-'}</td>
          <td style="padding: 4px 4px; font-size: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; color: #1e40af;">${item.cikisSaati || '-'}</td>
          <td style="padding: 4px 4px; font-size: 8px; text-align: center; border: 1px solid #cbd5e1; color: #64748b;">${item.molaDk} dk</td>
          <td style="padding: 4px 4px; font-size: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; background: #ecfdf5; color: #047857;">${item.netSureSaat > 0 ? `${item.netSureSaat}s` : '-'}</td>
          <td style="padding: 4px 4px; font-size: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; color: #c2410c;">${item.fazlaMesaiSaat > 0 ? `+${item.fazlaMesaiSaat}s` : '-'}</td>
          <td style="padding: 4px 4px; font-size: 8px; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; color: #b91c1c;">${item.gecikmeDk > 0 ? `${item.gecikmeDk} dk` : '-'}</td>
          <td style="padding: 4px 4px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">
            <span style="display:inline-block; padding: 2px 6px; border-radius: 4px; ${badgeStyle}">${item.kod} - ${item.kodAciklama}</span>
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
      <title>${periodStr} - Günlük Detaylı PDKS ve Mesai Raporu - ${companyName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 8mm 8mm 8mm 8mm;
        }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 8px;
          margin-bottom: 8px;
        }
        .title {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 9px;
          color: #475569;
          margin-top: 3px;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          margin-top: 25px;
          page-break-inside: avoid;
        }
        .signature-block {
          width: 28%;
          text-align: center;
          border-top: 1px solid #94a3b8;
          padding-top: 5px;
          font-size: 9px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div style="font-size: 13px; font-weight: bold; color: #1e3a8a;">${companyName}</div>
          <h1 class="title">GÜNLÜK DETAYLI PERSONEL MESAİ VE ÇALIŞMA RAPORU</h1>
          <div class="subtitle">4857 Sayılı İş Kanunu Hükümlerine Uygun Günlük Saatlik Takip Çizelgesi • Birim: <strong>${departmentFilter}</strong></div>
        </div>
        <div style="text-align: right; font-size: 10px;">
          <div>Dönem / Gün: <strong style="font-size: 13px; color: #2563eb;">${periodStr}</strong></div>
          <div style="color: #64748b; font-size: 8px; margin-top: 2px;">Döküm Tarihi: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div style="color: #64748b; font-size: 8px;">Kayıt Sayısı: ${items.length} Hareket</div>
        </div>
      </div>

      <table>
        <thead>
          <tr style="background: #f8fafc;">
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 20px;">#</th>
            <th style="padding: 5px 6px; font-size: 9px; border: 1px solid #cbd5e1; text-align: left; min-width: 140px;">Personel Adı Soyadı</th>
            <th style="padding: 5px 6px; font-size: 8px; border: 1px solid #cbd5e1; text-align: left; min-width: 80px;">Departman</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: left; min-width: 80px;">Tarih</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 70px;">Vardiya</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 55px;">İlk Giriş</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 55px;">Son Çıkış</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 45px;">Mola</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 55px; background: #ecfdf5;">Net Süre</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 50px;">FM Saat</th>
            <th style="padding: 5px 4px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; width: 50px;">Geç Dk</th>
            <th style="padding: 5px 6px; font-size: 8px; border: 1px solid #cbd5e1; text-align: center; min-width: 110px;">Durum</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- İmzalar -->
      <div class="signatures">
        <div class="signature-block">
          <strong>Düzenleyen</strong><br>
          <span style="color: #64748b;">${preparedBy}</span><br>
          İmza:
        </div>
        <div class="signature-block">
          <strong>Kontrol Eden</strong><br>
          <span style="color: #64748b;">İnsan Kaynakları Müdürü</span><br>
          İmza:
        </div>
        <div class="signature-block">
          <strong>Onaylayan</strong><br>
          <span style="color: #64748b;">İşveren / Şirket Yetkilisi</span><br>
          İmza / Kaşe:
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

export const exportGunlukDetayliCsv = (
  companyName: string,
  periodStr: string,
  items: GunlukDetayliRaporItem[]
) => {
  const csvHeaders = `No;Personel Adı;TC Kimlik;Departman;Tarih;Gün;Vardiya;İlk Giriş;Son Çıkış;Mola (Dk);Net Çalışma (Saat);Fazla Mesai (Saat);Geç Kalma (Dk);Kod;Durum\n`;

  const csvRows = items
    .map((item, i) => {
      return `${i + 1};"${item.employeeName}";"${item.tcNo || ''}";"${item.department || ''}";"${item.tarih}";"${item.gunAdi}";"${item.shiftHours}";"${item.girisSaati || '-'}";"${item.cikisSaati || '-'}";${item.molaDk};${item.netSureSaat};${item.fazlaMesaiSaat};${item.gecikmeDk};"${item.kod}";"${item.kodAciklama}"`;
    })
    .join('\n');

  const csvContent = '\uFEFF' + csvHeaders + csvRows;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${companyName}_Gunluk_Mesai_${periodStr.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
