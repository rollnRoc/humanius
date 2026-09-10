import { PersonelAylikPuantaj, PuantajKodu, getCalismaSaati } from './puantajHesaplama';
import XLSX from 'xlsx-js-style';

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
            const hours = getCalismaSaati(g, rec.shift);
            text = `${hours}s`;
          } else if (g.kod === 'HT') {
            badgeBg = '#dbeafe';
            badgeColor = '#1d4ed8';
          } else if (g.kod === 'AT') {
            badgeBg = '#f1f5f9';
            badgeColor = '#475569';
          } else if (g.kod === 'UBGT') {
            badgeBg = '#f3e8ff';
            badgeColor = '#7e22ce';
          } else if (g.kod === 'Yİ' || g.kod === 'YI') {
            badgeBg = '#ccfbf1';
            badgeColor = '#0f766e';
          } else if (g.kod === 'Mİ' || g.kod === 'MZ') {
            badgeBg = '#d1fae5';
            badgeColor = '#047857';
          } else if (g.kod === 'EG') {
            badgeBg = '#e0f2fe';
            badgeColor = '#0369a1';
          } else if (g.kod === 'R' || g.kod === 'HA' || g.kod === 'RP') {
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
            // Dinamik / özel izin kodu (Örn: EG, BA, EV, OL vb.)
            badgeBg = '#e0f2fe';
            badgeColor = '#0369a1';
          }

          return `<td style="padding: 2px 1px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #e2e8f0; background: ${badgeBg}; color: ${badgeColor};" title="${g.tarih} - ${g.kodAciklama}">${text}</td>`;
        })
        .join('');

      return `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 4px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${index + 1}</td>
          <td style="padding: 4px 6px; font-size: 9px; font-weight: bold; border: 1px solid #cbd5e1; white-space: nowrap;">
            ${emp?.name || 'İsimsiz'}
            <div style="font-size: 7px; color: #64748b; font-weight: normal;">TC: ${emp?.tc_no || (emp as any)?.tcNo || '-'}</div>
          </td>
          <td style="padding: 4px 6px; font-size: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">${emp?.department || 'Genel'}</td>
          ${dayCellsHtml}
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #cbd5e1; background: #ecfdf5; color: #047857;">${ozet.fiiliCalismaGun}g / ${ozet.fiiliCalismaSaat}s</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1;">${ozet.haftaTatiliGun}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; font-weight: bold; border: 1px solid #cbd5e1; color: #0f766e;">${ozet.yillikIzinGun > 0 ? ozet.yillikIzinGun : '-'}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; color: #c2410c;">${ozet.ucretsizIzinGun > 0 ? ozet.ucretsizIzinGun : '-'}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; color: ${ozet.raporluGun > 0 ? '#b45309' : '#64748b'};">${ozet.raporluGun > 0 ? ozet.raporluGun : '-'}</td>
          <td style="padding: 4px 2px; text-align: center; font-size: 8px; border: 1px solid #cbd5e1; color: ${ozet.devamsizGun > 0 ? '#b91c1c' : '#64748b'};">${ozet.devamsizGun > 0 ? ozet.devamsizGun : '-'}</td>
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
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 44px;">Fiili Çal.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 20px;">HT</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 26px;">Yıllık İzin</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 24px;">Ücr. İzin</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 20px;">Rap.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 20px;">Dev.</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 32px; background: #dbeafe;">Bordro (30G)</th>
            <th style="padding: 5px 3px; font-size: 8px; border: 1px solid #cbd5e1; width: 34px;">FM Saat</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- Lejant (Kod Açıklamaları) -->
      ${(() => {
        const customCodesMap = new Map<string, string>();
        records.forEach((r) => {
          r.gunler.forEach((g) => {
            if (
              g.kod &&
              !['Ç', 'HT', 'AT', 'UBGT', 'Yİ', 'YI', 'Mİ', 'MZ', 'EG', 'R', 'HA', 'Üİ', 'UC', 'D', '-'].includes(g.kod)
            ) {
              if (!customCodesMap.has(g.kod)) {
                customCodesMap.set(g.kod, g.kodAciklama || 'Özel İzin');
              }
            }
          });
        });
        const customLegendHtml = Array.from(customCodesMap.entries())
          .map(([c, desc]) => `<div class="legend-item"><span class="legend-box" style="background: #e0f2fe; color: #0369a1;">${c}</span> ${desc}</div>`)
          .join('');

        return `
      <div class="legend">
        <strong style="margin-right: 4px;">Puantaj Kodları:</strong>
        <div class="legend-item"><span class="legend-box" style="background: #dcfce7; color: #15803d;">8.5s</span> Fiili Çalışma Saati</div>
        <div class="legend-item"><span class="legend-box" style="background: #dbeafe; color: #1d4ed8;">HT</span> Hafta Tatili (Md. 46)</div>
        <div class="legend-item"><span class="legend-box" style="background: #f1f5f9; color: #475569;">AT</span> Akdi Tatil (Cmt)</div>
        <div class="legend-item"><span class="legend-box" style="background: #f3e8ff; color: #7e22ce;">UBGT</span> Resmi Tatil</div>
        <div class="legend-item"><span class="legend-box" style="background: #ccfbf1; color: #0f766e;">Yİ</span> Yıllık İzin</div>
        <div class="legend-item"><span class="legend-box" style="background: #e0f2fe; color: #0369a1;">EG</span> Eğitim İzni</div>
        <div class="legend-item"><span class="legend-box" style="background: #d1fae5; color: #047857;">Mİ</span> Mazeret İzni</div>
        <div class="legend-item"><span class="legend-box" style="background: #fef3c7; color: #b45309;">RP</span> SGK Raporu</div>
        <div class="legend-item"><span class="legend-box" style="background: #ffedd5; color: #c2410c;">Üİ</span> Ücretsiz İzin</div>
        <div class="legend-item"><span class="legend-box" style="background: #fee2e2; color: #b91c1c;">D</span> Devamsız</div>
        ${customLegendHtml}
      </div>`;
      })()}

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
 * Excel (.xlsx) Formatında Resmi Puantaj Cetveli İndirme (Stilli ve Ortalı)
 */
export const exportPuantajExcel = (
  companyName: string,
  year: number,
  monthIndex: number,
  records: PersonelAylikPuantaj[]
) => {
  const monthName = AY_ADLARI[monthIndex];
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();

  // Excel Başlıkları
  const headers = [
    'No',
    'Personel Adı Soyadı',
    'TC Kimlik No',
    'Departman',
    ...Array.from({ length: daysCount }, (_, i) => `Gün ${i + 1}`),
    'Fiili Gün',
    'Fiili Saat',
    'Hafta Tatili',
    'Yıllık İzin',
    'Ücretsiz İzin',
    'Raporlu Gün',
    'Devamsız Gün',
    'Bordro Günü (30G)',
    'Fazla Mesai Saati',
  ];

  const dataRows = records.map((rec, i) => {
    const emp = rec.employee;
    const ozet = rec.ozet;
    const dayCells = rec.gunler.map((g) => {
      if (g.kod === 'Ç') {
        return getCalismaSaati(g, rec.shift);
      }
      return g.kod;
    });

    return [
      i + 1,
      emp?.name || '-',
      emp?.tc_no || (emp as any)?.tcNo || '',
      emp?.department || 'Genel',
      ...dayCells,
      ozet.fiiliCalismaGun,
      ozet.fiiliCalismaSaat,
      ozet.haftaTatiliGun,
      ozet.yillikIzinGun,
      ozet.ucretsizIzinGun,
      ozet.raporluGun,
      ozet.devamsizGun,
      ozet.bordroGun,
      ozet.toplamFazlaMesaiSaat,
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Hücre Kenarlığı
  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  // Başlık Stili
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { fgColor: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  // İsim ve Departman Stili (Sola Yaslı)
  const textLeftStyle = {
    font: { sz: 9 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  // Standart Ortalı Stil
  const centerDefaultStyle = {
    font: { sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  // Gün Hücreleri Özel Stilleri (Hepsi Kesinlikle Ortalanmış)
  const calismaStyle = {
    font: { bold: true, color: { rgb: '15803D' }, sz: 9 },
    fill: { fgColor: { rgb: 'DCFCE7' } }, // Açık yeşil
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const haftaTatiliStyle = {
    font: { bold: true, color: { rgb: '1D4ED8' }, sz: 9 },
    fill: { fgColor: { rgb: 'DBEAFE' } }, // Açık mavi
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const akdiTatilStyle = {
    font: { bold: true, color: { rgb: '475569' }, sz: 9 },
    fill: { fgColor: { rgb: 'F1F5F9' } }, // Açık gri
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const ubgtStyle = {
    font: { bold: true, color: { rgb: '7E22CE' }, sz: 9 },
    fill: { fgColor: { rgb: 'F3E8FF' } }, // Açık mor
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const izinStyle = {
    font: { bold: true, color: { rgb: '0F766E' }, sz: 9 },
    fill: { fgColor: { rgb: 'CCFBF1' } }, // Açık turkuaz
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const raporStyle = {
    font: { bold: true, color: { rgb: 'B45309' }, sz: 9 },
    fill: { fgColor: { rgb: 'FEF3C7' } }, // Açık amber
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const ucretsizIzinStyle = {
    font: { bold: true, color: { rgb: 'C2410C' }, sz: 9 },
    fill: { fgColor: { rgb: 'FFEDD5' } }, // Açık turuncu
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const devamsizStyle = {
    font: { bold: true, color: { rgb: 'B91C1C' }, sz: 9 },
    fill: { fgColor: { rgb: 'FEE2E2' } }, // Açık kırmızı
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const bosStyle = {
    font: { color: { rgb: '94A3B8' }, sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const ozetSayiStyle = {
    font: { bold: true, color: { rgb: '0F172A' }, sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  // Tüm çalışma sayfası hücrelerini stillendir (Harfler ve rakamlar tamamen ortalı)
  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[cellAddress];
        if (!cell) continue;

        if (R === 0) {
          // Başlık satırı
          cell.s = headerStyle;
        } else {
          // Veri satırları
          if (C === 1 || C === 3) {
            // Personel Adı veya Departman (Sola yaslı okunabilirlik için)
            cell.s = textLeftStyle;
          } else if (C >= 4 && C < 4 + daysCount) {
            // Gün hücreleri: Harf veya rakam fark etmeksizin hepsi ortalı!
            const val = cell.v;
            if (typeof val === 'number' || (!isNaN(Number(val)) && val !== '-' && val !== '')) {
              cell.s = calismaStyle;
            } else if (val === 'HT') {
              cell.s = haftaTatiliStyle;
            } else if (val === 'AT') {
              cell.s = akdiTatilStyle;
            } else if (val === 'UBGT') {
              cell.s = ubgtStyle;
            } else if (val === 'Yİ' || val === 'Mİ' || val === 'YI' || val === 'MZ') {
              cell.s = izinStyle;
            } else if (val === 'R' || val === 'HA' || val === 'RP') {
              cell.s = raporStyle;
            } else if (val === 'Üİ' || val === 'UC') {
              cell.s = ucretsizIzinStyle;
            } else if (val === 'D') {
              cell.s = devamsizStyle;
            } else if (val === '-') {
              cell.s = bosStyle;
            } else {
              cell.s = izinStyle;
            }
          } else if (C >= 4 + daysCount) {
            // Özet toplam sütunları (Ortalı ve belirgin)
            cell.s = ozetSayiStyle;
          } else {
            // No ve TC Kimlik sütunları (Ortalı)
            cell.s = centerDefaultStyle;
          }
        }
      }
    }
  }

  // Sütun Genişlikleri
  ws['!cols'] = [
    { wch: 6 },   // No
    { wch: 25 },  // Personel Adı
    { wch: 14 },  // TC
    { wch: 18 },  // Departman
    ...Array.from({ length: daysCount }, () => ({ wch: 8 })), // Günler
    { wch: 10 },  // Fiili Gün
    { wch: 10 },  // Fiili Saat
    { wch: 12 },  // Hafta Tatili
    { wch: 11 },  // İzinli Gün
    { wch: 12 },  // Raporlu Gün
    { wch: 14 },  // Devamsız Gün
    { wch: 16 },  // Bordro Günü
    { wch: 16 },  // Fazla Mesai
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Puantaj ${monthName} ${year}`);

  // Kod Açıklamaları Sayfası (Lejant)
  const dynamicCustomCodes: [string, string][] = [];
  records.forEach((r) => {
    r.gunler.forEach((g) => {
      if (
        g.kod &&
        !['Ç', 'HT', 'AT', 'UBGT', 'Yİ', 'YI', 'Mİ', 'MZ', 'R', 'HA', 'Üİ', 'UC', 'D', '-'].includes(g.kod)
      ) {
        if (!dynamicCustomCodes.some(([k]) => k === g.kod)) {
          dynamicCustomCodes.push([g.kod, g.kodAciklama || 'Özel İzin']);
        }
      }
    });
  });

  const legendData = [
    ['Puantaj Kodu / Değeri', 'Açıklama'],
    ['Sayısal Değer (örn: 8, 8.5)', 'Fiili Çalışma Süresi (Saat)'],
    ['HT', 'Hafta Tatili (İş Kanunu Madde 46)'],
    ['AT', 'Akdi Tatil (Cumartesi)'],
    ['UBGT', 'Ulusal Bayram ve Genel Tatil'],
    ['Yİ', 'Yıllık Ücretli İzin'],
    ['Mİ', 'Mazeret İzni (Evlilik, Vefat, Babalık vb.)'],
    ['RP / R', 'SGK İstirahat Raporu'],
    ['Üİ', 'Ücretsiz İzin'],
    ['D', 'Devamsız (Mazeretsiz İşe Gelmeme)'],
    ...dynamicCustomCodes,
    ['-', 'Henüz Gerçekleşmedi / Kayıt Yok'],
  ];
  const legendWs = XLSX.utils.aoa_to_sheet(legendData);
  legendWs['!cols'] = [{ wch: 28 }, { wch: 42 }];

  // Lejant stillendirme
  if (legendWs['!ref']) {
    const lRange = XLSX.utils.decode_range(legendWs['!ref']);
    for (let R = lRange.s.r; R <= lRange.e.r; ++R) {
      for (let C = lRange.s.c; C <= lRange.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = legendWs[addr];
        if (!cell) continue;
        if (R === 0) {
          cell.s = headerStyle;
        } else {
          cell.s = C === 0 ? centerDefaultStyle : textLeftStyle;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, legendWs, 'Kod Açıklamaları');

  XLSX.writeFile(wb, `${companyName}_Puantaj_${monthName}_${year}.xlsx`);
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
  const csvHeaders = `No;Personel Adı;TC Kimlik;Departman;${headerDays};Fiili Gün;Fiili Saat;Hafta Tatili;Yıllık İzin;Ücretsiz İzin;Raporlu Gün;Devamsız Gün;Bordro Günü (30G);Fazla Mesai Saati\n`;

  const csvRows = records
    .map((rec, i) => {
      const emp = rec.employee;
      const ozet = rec.ozet;
      // Çalışmış ise 'Ç' yerine çalışma saati yazılır
      const dayValues = rec.gunler
        .map((g) => {
          if (g.kod === 'Ç') {
            return getCalismaSaati(g, rec.shift);
          }
          return g.kod;
        })
        .join(';');
      return `${i + 1};"${emp?.name || ''}";"${emp?.tc_no || (emp as any)?.tcNo || ''}";"${emp?.department || ''}";${dayValues};${ozet?.fiiliCalismaGun || 0};${ozet?.fiiliCalismaSaat || 0};${ozet?.haftaTatiliGun || 0};${ozet?.yillikIzinGun || 0};${ozet?.ucretsizIzinGun || 0};${ozet?.raporluGun || 0};${ozet?.devamsizGun || 0};${ozet?.bordroGun || 0};${ozet?.toplamFazlaMesaiSaat || 0}`;
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
      else if (item.kod === 'Yİ' || item.kod === 'Mİ') badgeStyle = 'background:#ccfbf1; color:#0f766e; font-weight:bold;';
      else if (item.kod === 'R') badgeStyle = 'background:#fef3c7; color:#b45309; font-weight:bold;';
      else if (item.kod === 'D') badgeStyle = 'background:#fee2e2; color:#b91c1c; font-weight:bold;';

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

/**
 * Günlük Detaylı Rapor Excel (.xlsx) İndirme
 */
export const exportGunlukDetayliExcel = (
  companyName: string,
  periodStr: string,
  items: GunlukDetayliRaporItem[]
) => {
  const headers = [
    'No',
    'Personel Adı',
    'TC Kimlik',
    'Departman',
    'Tarih',
    'Gün',
    'Vardiya',
    'İlk Giriş',
    'Son Çıkış',
    'Mola (Dk)',
    'Net Çalışma (Saat)',
    'Fazla Mesai (Saat)',
    'Geç Kalma (Dk)',
    'Kod',
    'Durum'
  ];

  const rows = items.map((item, i) => [
    i + 1,
    item.employeeName,
    item.tcNo || '',
    item.department || '',
    item.tarih,
    item.gunAdi,
    item.shiftHours,
    item.girisSaati || '-',
    item.cikisSaati || '-',
    item.molaDk,
    item.netSureSaat,
    item.fazlaMesaiSaat,
    item.gecikmeDk,
    item.kod,
    item.kodAciklama
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 5 },
    { wch: 24 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 8 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 8 },
    { wch: 24 }
  ];

  const thinBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
    fill: { fgColor: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: thinBorder,
  };

  const textLeftStyle = {
    font: { sz: 9 },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: thinBorder,
  };

  const centerDefaultStyle = {
    font: { sz: 9 },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  const netSureStyle = {
    font: { bold: true, color: { rgb: '15803D' }, sz: 9 },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: thinBorder,
  };

  if (ws['!ref']) {
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = ws[addr];
        if (!cell) continue;
        if (R === 0) {
          cell.s = headerStyle;
        } else {
          if (C === 1 || C === 3 || C === 14) {
            cell.s = textLeftStyle;
          } else if (C === 10) {
            cell.s = netSureStyle;
          } else {
            cell.s = centerDefaultStyle;
          }
        }
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Günlük Mesai Detayı');
  XLSX.writeFile(wb, `${companyName}_Gunluk_Mesai_${periodStr.replace(/\s+/g, '_')}.xlsx`);
};

