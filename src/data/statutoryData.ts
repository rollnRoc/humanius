export const CONSTANTS = {
  SGK_WORKER_RATE: 0.14,           // %14 SGK İşçi Payı
  UNEMPLOYMENT_WORKER_RATE: 0.01,  // %1 İşsizlik Sigortası İşçi Payı
  DEFAULT_INCOME_TAX_RATE: 0.15,   // %15 1. Dilim Gelir Vergisi Oranı
  STAMP_TAX_RATE: 0.00759,          // %0,759 Damga Vergisi Oranı
};

// Historical Severance Ceilings (Kıdem Tazminatı Tavanı Geçmişi - T.C. Hazine ve Maliye Bakanlığı)
export const HISTORICAL_SEVERANCE_CEILINGS = [
  { year: 2026, period: '1. Dönem', ceiling: 58500.00 },
  { year: 2025, period: '2. Dönem', ceiling: 46154.60 },
  { year: 2025, period: '1. Dönem', ceiling: 41828.40 },
  { year: 2024, period: '2. Dönem', ceiling: 41828.40 },
  { year: 2024, period: '1. Dönem', ceiling: 35058.58 },
  { year: 2023, period: '2. Dönem', ceiling: 23489.83 },
  { year: 2023, period: '1. Dönem', ceiling: 19982.83 },
  { year: 2022, period: '2. Dönem', ceiling: 15371.40 },
  { year: 2022, period: '1. Dönem', ceiling: 10848.59 },
  { year: 2021, period: '2. Dönem', ceiling: 8284.51 },
  { year: 2020, period: '2. Dönem', ceiling: 7117.17 },
];

// Historical Minimum Wages (Brüt Asgari Ücret Geçmişi)
export const HISTORICAL_MIN_WAGES = [
  { year: 2026, gross: 30000.00, net: 25500.00 },
  { year: 2025, gross: 26005.50, net: 22104.00 },
  { year: 2024, gross: 20002.50, net: 17002.12 },
  { year: 2023, gross: 13414.50, net: 11402.32 },
  { year: 2022, gross: 6471.00,  net: 5500.35 },
];

/**
 * Get Notice Period Weeks based on worked months (4857 Sayılı İş Kanunu Madde 17)
 * - 0 - 6 ay arası: 2 hafta
 * - 6 ay - 1.5 yıl arası: 4 hafta
 * - 1.5 yıl - 3 yıl arası: 6 hafta
 * - 3 yıldan fazla: 8 hafta
 */
export function getNoticeWeeks(workedTotalMonths: number): number {
  if (workedTotalMonths < 6) return 2;
  if (workedTotalMonths < 18) return 4;
  if (workedTotalMonths < 36) return 6;
  return 8;
}

/**
 * Get Statutory Annual Leave Days based on service years (4857 Sayılı İş Kanunu Madde 53)
 * - 1 - 5 yıl arası (5 dahil): 14 gün
 * - 5 yıldan fazla - 15 yıldan az: 20 gün
 * - 15 yıl (dahil) ve daha fazla: 26 gün
 * * 18 yaş ve altı veya 50 yaş ve üzeri çalışanlara en az 20 gün verilir.
 */
export function getStatutoryAnnualLeaveDays(workedYears: number, isSpecialAge: boolean = false): number {
  if (workedYears < 1) return 0;
  
  let days = 14;
  if (workedYears > 5 && workedYears < 15) {
    days = 20;
  } else if (workedYears >= 15) {
    days = 26;
  }

  if (isSpecialAge && days < 20) {
    days = 20;
  }

  return days;
}
