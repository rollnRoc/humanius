import { PresetScenario } from '../types/tazminatTypes';

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'senior-dev',
    name: 'Örnek 1: Kıdemli Yazılım Mühendisi (5 Yıl Kıdem)',
    description: '5 yıllık hizmet süresi olan, brüt maaşı ve sosyal yardımları bulunan kıdemli çalışan senaryosu.',
    employee: {
      fullName: 'Ahmet Yılmaz',
      tcNo: '12345678901',
      department: 'Yazılım ve Bilgi Teknolojileri',
      position: 'Senior Full Stack Developer',
      startDate: '2021-01-15',
      endDate: '2026-02-01',
      nakedWage: 75000,
      nakedWageType: 'gross',
      dailyFood: 250,
      monthlyRoad: 3000,
      annualBonus: 90000,
      otherBenefitsMonthly: 2500,
      exitReason: 'İşveren Tarafından Haklı Neden Olmaksızın Fesih (Kod 04)'
    },
    annualLeaveUsed: 50,
    overtimeHours: 12,
    overtimeWeeks: 50,
    overtimeEquity: 30
  },
  {
    id: 'sales-rep',
    name: 'Örnek 2: Satış Danışmanı (3 Yıl Kıdem)',
    description: '3 yıllık hizmet süresi, net maaş ve aylık prim desteği olan satış temsilcisi senaryosu.',
    employee: {
      fullName: 'Ayşe Kaya',
      tcNo: '98765432109',
      department: 'Satış ve Pazarlama',
      position: 'Kurumsal Satış Danışmanı',
      startDate: '2023-03-01',
      endDate: '2026-03-01',
      nakedWage: 35000,
      nakedWageType: 'net',
      dailyFood: 200,
      monthlyRoad: 2000,
      annualBonus: 48000,
      otherBenefitsMonthly: 1500,
      exitReason: 'İşveren Tarafından Geçerli Nedenle Fesih (Kod 04)'
    },
    annualLeaveUsed: 28,
    overtimeHours: 10,
    overtimeWeeks: 40,
    overtimeEquity: 30
  },
  {
    id: 'production-staff',
    name: 'Örnek 3: Üretim Teknisyeni (8 Yıl Kıdem - Asgari Ücret)',
    description: '8 yıldır görev yapan, asgari ücret üzerinden çalışan mavi yaka personel senaryosu.',
    employee: {
      fullName: 'Mehmet Demir',
      tcNo: '45678901234',
      department: 'Üretim ve İmalat',
      position: 'Mekanik Montaj Teknisyeni',
      startDate: '2018-05-10',
      endDate: '2026-05-10',
      nakedWage: 30000,
      nakedWageType: 'gross',
      dailyFood: 180,
      monthlyRoad: 1500,
      annualBonus: 0,
      otherBenefitsMonthly: 1000,
      exitReason: 'Emeklilik (Kod 08)'
    },
    annualLeaveUsed: 100,
    overtimeHours: 15,
    overtimeWeeks: 100,
    overtimeEquity: 30
  }
];
