import { 
  EmployeeDetails, 
  SeveranceCalculation, 
  NoticeCalculation, 
  OvertimeCalculation, 
  AnnualLeaveCalculation, 
  ReinstatementCalculation, 
  DeductionMatrix,
  DeductionRow
} from '../types/tazminatTypes';
import { 
  CONSTANTS, 
  getNoticeWeeks, 
  getStatutoryAnnualLeaveDays, 
  HISTORICAL_SEVERANCE_CEILINGS 
} from '../data/statutoryData';

/**
 * Format currency to Turkish Lira string (e.g. 45.120,50 TL)
 */
export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "0,00 TL";
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Convert Net wage to approximate Gross wage
 */
export function netToGrossWage(netWage: number): number {
  if (netWage <= 0) return 0;
  // Net = Gross * (1 - 0.14 - 0.01 - 0.15 - 0.00759) = Gross * 0.69241
  const netRatio = 1 - (CONSTANTS.SGK_WORKER_RATE + CONSTANTS.UNEMPLOYMENT_WORKER_RATE + CONSTANTS.DEFAULT_INCOME_TAX_RATE + CONSTANTS.STAMP_TAX_RATE);
  return netWage / netRatio;
}

/**
 * Convert Gross wage to Net wage
 */
export function grossToNetWage(grossWage: number): number {
  if (grossWage <= 0) return 0;
  const sgk = grossWage * CONSTANTS.SGK_WORKER_RATE;
  const unemp = grossWage * CONSTANTS.UNEMPLOYMENT_WORKER_RATE;
  const taxableBase = grossWage - sgk - unemp;
  const incomeTax = taxableBase * CONSTANTS.DEFAULT_INCOME_TAX_RATE;
  const stampTax = grossWage * CONSTANTS.STAMP_TAX_RATE;
  return grossWage - sgk - unemp - incomeTax - stampTax;
}

/**
 * Calculate exact work duration between start and end dates in years, months, days
 */
export function calculateWorkPeriod(startDateStr: string, endDateStr: string) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return { workedYears: 0, workedMonths: 0, workedDays: 0, totalDaysWorked: 0 };
  }

  // Include end day (+1 day)
  const totalDaysWorked = Math.floor((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1;

  let startYear = start.getFullYear();
  let startMonth = start.getMonth();
  let startDay = start.getDate();

  let endYear = end.getFullYear();
  let endMonth = end.getMonth();
  let endDay = end.getDate() + 1; // inclusive

  let years = endYear - startYear;
  let months = endMonth - startMonth;
  let days = endDay - startDay;

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(endYear, endMonth, 0).getDate();
    days += prevMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return {
    workedYears: Math.max(0, years),
    workedMonths: Math.max(0, months),
    workedDays: Math.max(0, days),
    totalDaysWorked: Math.max(0, totalDaysWorked)
  };
}

/**
 * Calculate Clothed Wage (Giydirilmiş Brüt Ücret)
 */
export function calculateClothedWage(emp: EmployeeDetails): { nakedGross: number; clothedGross: number } {
  let nakedGross = emp.nakedWage || 0;
  if (emp.nakedWageType === 'net') {
    nakedGross = netToGrossWage(emp.nakedWage || 0);
  }

  const foodMonthly = (emp.dailyFood || 0) * 30;
  const roadMonthly = emp.monthlyRoad || 0;
  const bonusMonthly = (emp.annualBonus || 0) / 12;
  const otherMonthly = emp.otherBenefitsMonthly || 0;

  const clothedGross = nakedGross + foodMonthly + roadMonthly + bonusMonthly + otherMonthly;
  return { nakedGross, clothedGross };
}

/**
 * Get Kıdem Tazminatı Tavanı for a given date or default to latest
 */
export function getSeveranceCeilingForDate(endDateStr: string): number {
  if (!endDateStr) return HISTORICAL_SEVERANCE_CEILINGS[0].ceiling;
  const year = new Date(endDateStr).getFullYear();
  const found = HISTORICAL_SEVERANCE_CEILINGS.find(c => c.year === year);
  return found ? found.ceiling : HISTORICAL_SEVERANCE_CEILINGS[0].ceiling;
}

/**
 * Calculate Kıdem Tazminatı
 */
export function calculateSeverancePay(emp: EmployeeDetails, customCeiling?: number): SeveranceCalculation {
  const { nakedGross, clothedGross } = calculateClothedWage(emp);
  const period = calculateWorkPeriod(emp.startDate, emp.endDate);
  
  const applicableCeiling = customCeiling ?? getSeveranceCeilingForDate(emp.endDate);
  const effectiveMonthlyWage = Math.min(clothedGross, applicableCeiling);
  const ceilingApplied = clothedGross > applicableCeiling;

  // Pro-rata severance calculation: Years + (Months / 12) + (Days / 365)
  const yearsFactor = period.workedYears + (period.workedMonths / 12) + (period.workedDays / 365.25);
  const grossSeverance = effectiveMonthlyWage * yearsFactor;
  
  // Severance pay is exempt from Income Tax, only Stamp Tax (%0.00759) is deducted
  const stampTax = grossSeverance * CONSTANTS.STAMP_TAX_RATE;
  const netSeverance = grossSeverance - stampTax;

  return {
    workedYears: period.workedYears,
    workedMonths: period.workedMonths,
    workedDays: period.workedDays,
    totalDaysWorked: period.totalDaysWorked,
    nakedGrossWage: nakedGross,
    clothedGrossWage: clothedGross,
    applicableCeiling,
    ceilingApplied,
    grossSeverance,
    stampTax,
    netSeverance
  };
}

/**
 * Calculate İhbar Tazminatı
 */
export function calculateNoticePay(emp: EmployeeDetails): NoticeCalculation {
  const { clothedGross } = calculateClothedWage(emp);
  const period = calculateWorkPeriod(emp.startDate, emp.endDate);
  const totalMonths = (period.workedYears * 12) + period.workedMonths;
  
  const noticeWeeks = getNoticeWeeks(totalMonths);
  const weeklyWage = clothedGross / 4.3333; // 30 / 7
  const grossNotice = weeklyWage * noticeWeeks;

  // Notice pay is subject to Income Tax (%15) & Stamp Tax (%0.00759)
  const incomeTax = grossNotice * CONSTANTS.DEFAULT_INCOME_TAX_RATE;
  const stampTax = grossNotice * CONSTANTS.STAMP_TAX_RATE;
  const totalTax = incomeTax + stampTax;
  const netNotice = grossNotice - totalTax;

  return {
    noticeWeeks,
    grossNotice,
    incomeTax,
    stampTax,
    totalTax,
    netNotice
  };
}

/**
 * Calculate Fazla Mesai (Overtime Pay)
 */
export function calculateOvertimePay(
  emp: EmployeeDetails, 
  weeklyHours: number = 10, 
  weeksWorked: number = 52, 
  equityDiscountPercent: number = 30
): OvertimeCalculation {
  const { clothedGross } = calculateClothedWage(emp);
  // Standard monthly working hours = 225
  const hourlyRate = clothedGross / 225;
  const overtimeHourlyRate = hourlyRate * 1.5; // %50 zamlı

  const totalOvertimeHours = weeklyHours * weeksWorked;
  const totalBaseOvertime = totalOvertimeHours * overtimeHourlyRate;

  // Yargıtay hakkaniyet indirimi (genelde %30)
  const equityDiscountAmount = totalBaseOvertime * (equityDiscountPercent / 100);
  const grossOvertimeAfterEquity = totalBaseOvertime - equityDiscountAmount;

  // Overtime is subject to SGK (%14), Unemployment (%1), Income Tax (%15), Stamp Tax (%0.00759)
  const sgkWorkerTax = grossOvertimeAfterEquity * CONSTANTS.SGK_WORKER_RATE;
  const unemploymentTax = grossOvertimeAfterEquity * CONSTANTS.UNEMPLOYMENT_WORKER_RATE;
  const incomeTaxBase = grossOvertimeAfterEquity - sgkWorkerTax - unemploymentTax;
  const incomeTax = incomeTaxBase * CONSTANTS.DEFAULT_INCOME_TAX_RATE;
  const stampTax = grossOvertimeAfterEquity * CONSTANTS.STAMP_TAX_RATE;
  const totalDeductions = sgkWorkerTax + unemploymentTax + incomeTax + stampTax;
  const netOvertime = grossOvertimeAfterEquity - totalDeductions;

  return {
    weeklyOvertimeHours: weeklyHours,
    weeksWorked,
    hourlyRate,
    totalBaseOvertime,
    equityDiscountPercent,
    equityDiscountAmount,
    grossOvertimeAfterEquity,
    sgkWorkerTax,
    unemploymentTax,
    incomeTaxBase,
    incomeTax,
    stampTax,
    totalDeductions,
    netOvertime
  };
}

/**
 * Calculate Yıllık İzin Ücreti
 */
export function calculateAnnualLeavePay(emp: EmployeeDetails, usedDays: number = 0): AnnualLeaveCalculation {
  const { nakedGross } = calculateClothedWage(emp); // Leave pay is based on last Naked Gross wage
  const period = calculateWorkPeriod(emp.startDate, emp.endDate);
  
  const earnedDays = getStatutoryAnnualLeaveDays(period.workedYears, emp.isOver50OrUnder18);
  const remainingDays = Math.max(0, earnedDays - usedDays);
  
  const dailyGrossWage = nakedGross / 30;
  const grossLeavePay = remainingDays * dailyGrossWage;

  // Annual leave pay is subject to SGK (%14), Unemployment (%1), Income Tax (%15), Stamp Tax (%0.00759)
  const sgkWorkerTax = grossLeavePay * CONSTANTS.SGK_WORKER_RATE;
  const unemploymentTax = grossLeavePay * CONSTANTS.UNEMPLOYMENT_WORKER_RATE;
  const incomeTaxBase = grossLeavePay - sgkWorkerTax - unemploymentTax;
  const incomeTax = incomeTaxBase * CONSTANTS.DEFAULT_INCOME_TAX_RATE;
  const stampTax = grossLeavePay * CONSTANTS.STAMP_TAX_RATE;
  const totalDeductions = sgkWorkerTax + unemploymentTax + incomeTax + stampTax;
  const netLeavePay = grossLeavePay - totalDeductions;

  return {
    earnedDays,
    usedDays,
    remainingDays,
    dailyGrossWage,
    grossLeavePay,
    sgkWorkerTax,
    unemploymentTax,
    incomeTaxBase,
    incomeTax,
    stampTax,
    totalDeductions,
    netLeavePay
  };
}

/**
 * Calculate İşe İade Tazminatları
 */
export function calculateReinstatementPay(
  emp: EmployeeDetails, 
  idleMonths: number = 4, 
  nonStartMonths: number = 5
): ReinstatementCalculation {
  const { clothedGross, nakedGross } = calculateClothedWage(emp);
  
  // Boşta geçen süre ücreti (Max 4 ay, giydirilmiş brüt üzerinden)
  const idleGrossPay = clothedGross * idleMonths;
  const idleNetPay = grossToNetWage(idleGrossPay);

  // İşe başlatmama tazminatı (4-8 ay brüt, çıplak brüt üzerinden, SGK'sız sadece damga/gelir vergili)
  const nonStartGrossPay = nakedGross * nonStartMonths;
  const nonStartStampTax = nonStartGrossPay * CONSTANTS.STAMP_TAX_RATE;
  const nonStartNetPay = nonStartGrossPay - nonStartStampTax; // İşe başlatmama tazminatından SGK ve Gelir Vergisi kesilmez (Sadece Damga)

  return {
    idleMonths,
    idleGrossPay,
    idleNetPay,
    nonStartMonths,
    nonStartGrossPay,
    nonStartNetPay,
    totalNetReinstatement: idleNetPay + nonStartNetPay
  };
}

/**
 * Master Deduction Matrix
 */
export function buildDeductionMatrix(
  severance: SeveranceCalculation,
  notice: NoticeCalculation,
  overtime: OvertimeCalculation,
  annualLeave: AnnualLeaveCalculation
): DeductionMatrix {
  const rows: DeductionRow[] = [
    {
      title: 'Kıdem Tazminatı',
      grossAmount: severance.grossSeverance,
      sgkWorker: 0,
      unemployment: 0,
      incomeTaxBase: 0,
      incomeTax: 0,
      stampTax: severance.stampTax,
      totalDeduction: severance.stampTax,
      netAmount: severance.netSeverance
    },
    {
      title: 'İhbar Tazminatı',
      grossAmount: notice.grossNotice,
      sgkWorker: 0,
      unemployment: 0,
      incomeTaxBase: notice.grossNotice,
      incomeTax: notice.incomeTax,
      stampTax: notice.stampTax,
      totalDeduction: notice.totalTax,
      netAmount: notice.netNotice
    },
    {
      title: 'Fazla Mesai Alacağı',
      grossAmount: overtime.grossOvertimeAfterEquity,
      sgkWorker: overtime.sgkWorkerTax,
      unemployment: overtime.unemploymentTax,
      incomeTaxBase: overtime.incomeTaxBase,
      incomeTax: overtime.incomeTax,
      stampTax: overtime.stampTax,
      totalDeduction: overtime.totalDeductions,
      netAmount: overtime.netOvertime
    },
    {
      title: 'Kullanılmayan Yıllık İzin Ücreti',
      grossAmount: annualLeave.grossLeavePay,
      sgkWorker: annualLeave.sgkWorkerTax,
      unemployment: annualLeave.unemploymentTax,
      incomeTaxBase: annualLeave.incomeTaxBase,
      incomeTax: annualLeave.incomeTax,
      stampTax: annualLeave.stampTax,
      totalDeduction: annualLeave.totalDeductions,
      netAmount: annualLeave.netLeavePay
    }
  ];

  const totalGross = rows.reduce((acc, r) => acc + r.grossAmount, 0);
  const totalSgkWorker = rows.reduce((acc, r) => acc + r.sgkWorker, 0);
  const totalUnemployment = rows.reduce((acc, r) => acc + r.unemployment, 0);
  const totalIncomeTax = rows.reduce((acc, r) => acc + r.incomeTax, 0);
  const totalStampTax = rows.reduce((acc, r) => acc + r.stampTax, 0);
  const totalDeduction = rows.reduce((acc, r) => acc + r.totalDeduction, 0);
  const totalNet = rows.reduce((acc, r) => acc + r.netAmount, 0);

  return {
    rows,
    totalGross,
    totalSgkWorker,
    totalUnemployment,
    totalIncomeTax,
    totalStampTax,
    totalDeduction,
    totalNet
  };
}
