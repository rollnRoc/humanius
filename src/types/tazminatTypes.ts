export type CalculationMode = 
  | 'severance_notice' 
  | 'overtime' 
  | 'annual_leave' 
  | 'reinstatement' 
  | 'deduction_matrix' 
  | 'full_report';

export interface EmployeeDetails {
  fullName: string;
  tcNo?: string;
  department: string;
  position: string;
  startDate: string;
  endDate: string;
  nakedWage: number;
  nakedWageType: 'gross' | 'net';
  dailyFood: number; // Daily food assistance
  monthlyRoad: number; // Monthly transportation assistance
  annualBonus: number; // Yearly bonuses / premiums (annual total)
  otherBenefitsMonthly: number; // Other monthly side benefits
  exitReason: string;
  isOver50OrUnder18?: boolean;
}

export interface SeveranceCalculation {
  workedYears: number;
  workedMonths: number;
  workedDays: number;
  totalDaysWorked: number;
  nakedGrossWage: number;
  clothedGrossWage: number;
  applicableCeiling: number;
  ceilingApplied: boolean;
  grossSeverance: number;
  stampTax: number; // %0.00759
  netSeverance: number;
}

export interface NoticeCalculation {
  noticeWeeks: number;
  grossNotice: number;
  incomeTax: number; // %15
  stampTax: number; // %0.00759
  totalTax: number;
  netNotice: number;
}

export interface OvertimeCalculation {
  weeklyOvertimeHours: number;
  weeksWorked: number;
  hourlyRate: number; // Clothed or naked gross hourly rate
  totalBaseOvertime: number;
  equityDiscountPercent: number; // Yargıtay hakkaniyet indirimi (%30)
  equityDiscountAmount: number;
  grossOvertimeAfterEquity: number;
  sgkWorkerTax: number; // %14
  unemploymentTax: number; // %1
  incomeTaxBase: number;
  incomeTax: number; // %15
  stampTax: number; // %0.00759
  totalDeductions: number;
  netOvertime: number;
}

export interface AnnualLeaveCalculation {
  earnedDays: number;
  usedDays: number;
  remainingDays: number;
  dailyGrossWage: number;
  grossLeavePay: number;
  sgkWorkerTax: number;
  unemploymentTax: number;
  incomeTaxBase: number;
  incomeTax: number;
  stampTax: number;
  totalDeductions: number;
  netLeavePay: number;
}

export interface ReinstatementCalculation {
  idleMonths: number; // Boşta geçen süre (Max 4 ay)
  idleGrossPay: number;
  idleNetPay: number;
  nonStartMonths: number; // İşe başlatmama tazminatı (4-8 ay)
  nonStartGrossPay: number;
  nonStartNetPay: number;
  totalNetReinstatement: number;
}

export interface DeductionRow {
  title: string;
  grossAmount: number;
  sgkWorker: number;
  unemployment: number;
  incomeTaxBase: number;
  incomeTax: number;
  stampTax: number;
  totalDeduction: number;
  netAmount: number;
}

export interface DeductionMatrix {
  rows: DeductionRow[];
  totalGross: number;
  totalSgkWorker: number;
  totalUnemployment: number;
  totalIncomeTax: number;
  totalStampTax: number;
  totalDeduction: number;
  totalNet: number;
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  employee: EmployeeDetails;
  annualLeaveUsed?: number;
  overtimeHours?: number;
  overtimeWeeks?: number;
  overtimeEquity?: number;
}
