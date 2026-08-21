import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  tr: {
    // Sidebar
    'sidebar.allPersonnel': 'Şirket ve Personel',
    'sidebar.leaveManagement': 'İzin Yönetimi',
    'sidebar.reports': 'Raporlar',
    'sidebar.payroll': 'Bordro Düzenleme',
    'sidebar.alertsCalendar': 'Uyarılar Takvimi',
    'sidebar.systemSettings': 'Sistem Ayarları',
    'sidebar.searchPlaceholder': 'Personel, departman, pozisyon...',
    
    // Employee Table
    'table.name': 'Ad Soyad',
    'table.company': 'Şirket',
    'table.department': 'Departman',
    'table.position': 'Pozisyon',
    'table.level': 'Seviye',
    'table.salary': 'Ücret',
    'table.status': 'Durum',
    'table.mobile': 'Mobil',
    'table.actions': 'İşlemler',
    'table.view': 'Görüntüle',
    'table.edit': 'Düzenle',
    'table.download': 'İndir',
    'table.delete': 'Sil',
    
    // Status
    'status.active': 'Aktif',
    'status.onLeave': 'İzinde',
    'status.inactive': 'Pasif',
    
    // Stats
    'stats.employeeList': 'Personel Listesi',
    'stats.active': 'Aktif',
    'stats.onLeave': 'İzinde',
    'stats.inactive': 'Pasif',
    
    // Toolbar
    'toolbar.all': 'Tümü',
    'toolbar.company': 'Şirket:',
    'toolbar.newEmployee': 'Yeni Personel',
    'toolbar.exportCSV': 'Excel İndir',
    'toolbar.logout': 'Çıkış',
    
    // Quick Actions
    'quickActions.title': 'Hızlı Aksiyonlar',
    'quickActions.bulkLeave': 'Toplu İzin Tanımla',
    'quickActions.bulkAlert': 'Toplu Uyarı Gönder',
    'quickActions.uploadPayroll': 'Bordro Yükle',
    'quickActions.assignCertificate': 'Sertifika Ata',
    
    // Upcoming Events
    'upcomingEvents.title': 'Yaklaşan Olaylar',
    'upcomingEvents.add': 'Ekle',
    
    // Leave Management
    'leave.totalRequests': 'Toplam Talep',
    'leave.pending': 'Bekleyen',
    'leave.approved': 'Onaylanan',
    'leave.rejected': 'Reddedilen',
    'leave.newRequest': 'Yeni İzin Talebi',
    'leave.requests': 'İzin Talepleri',
    'leave.calendar': 'İzin Takvimi',
    'leave.reports': 'Raporlar',
    
    // Months
    'month.january': 'Ocak',
    'month.february': 'Şubat',
    'month.march': 'Mart',
    'month.april': 'Nisan',
    'month.may': 'Mayıs',
    'month.june': 'Haziran',
    'month.july': 'Temmuz',
    'month.august': 'Ağustos',
    'month.september': 'Eylül',
    'month.october': 'Ekim',
    'month.november': 'Kasım',
    'month.december': 'Aralık',

    // Bordro (Payroll)
    'bordro.calculator': 'Bordro Hesaplayıcı',
    'bordro.list': 'Bordro Listesi',
    'bordro.template': 'Şablon',
    'bordro.import': 'İçe Aktar',
    'bordro.export': 'Dışa Aktar',
    'bordro.allPeriods': 'Tüm Dönemler',
    'bordro.allPersonnel': 'Tüm Personel',
    'bordro.personnel': 'Personel',
    'bordro.selectEmployee': 'Personel Seçin',
    'bordro.period': 'Dönem',
    'bordro.grossSalary': 'Brüt Maaş',
    'bordro.totalDeduction': 'Toplam Kesinti',
    'bordro.netSalary': 'Net Maaş',
    'bordro.status': 'Durum',
    'bordro.actions': 'İşlemler',
    'bordro.high': 'Yüksek',
    'bordro.medium': 'Orta',
    'bordro.low': 'Düşük',
    'bordro.noRecords': 'Henüz bordro kaydı bulunmuyor',
    'bordro.idNumber': 'Sicil',
    'bordro.downloadPDF': 'PDF İndir',
    'bordro.templateTooltip': 'Şablon İndir',
    'bordro.importTooltip': "CSV'den İçe Aktar",
    'bordro.exportTooltip': 'CSV Olarak Dışa Aktar',
    'bordro.importSuccess': 'bordro kaydı başarıyla içe aktarıldı.',
    'bordro.importError': 'İçe aktarılacak geçerli bordro kaydı bulunamadı.',
    'bordro.importFileError': 'Dosya içe aktarılırken bir hata oluştu. Lütfen dosya formatını kontrol edin.',
    'bordro.baseSalary': 'Temel Kazanç',
    'bordro.transportAllowance': 'Yol Parası',
    'bordro.foodAllowance': 'Gıda Yardımı',
    'bordro.childAllowance': 'Çocuk Yardımı',
    'bordro.otherEarnings': 'Diğer Kazançlar',
    'bordro.additionalPayments': 'Ek Ödemeler',
    'bordro.overtime': 'Fazla Mesai',
    'bordro.weeklyHoliday': 'Haftalık Tatil',
    'bordro.publicHoliday': 'Genel Tatil',
    'bordro.annualLeaveWage': 'Yıllık İzin Ücreti',
    'bordro.bonus': 'İkramiye',
    'bordro.premium': 'Prim',
    'bordro.serviceFee': 'Servis Ücreti',
    'bordro.representationLabel': 'Temsil & Etiket',
    'bordro.severancePay': 'Kıdem Tazminatı',
    'bordro.noticePay': 'İhbar Tazminatı',
    'bordro.taxDeductions': 'Vergi İndirimleri',
    'bordro.mgiReduction': 'AGİ İndirimi',
    'bordro.disabilityReduction': 'Engelli İndirimi',
    'bordro.otherDeductions': 'Diğer Kesintiler',
    'bordro.advance': 'Avans',
    'bordro.unionDues': 'Sendika Aidatı',
    'bordro.otherDeduction': 'Diğer Kesinti',
    'bordro.summary': 'Özet',
    'bordro.totalEarnings': 'Toplam Kazanç',
    'bordro.sgkEmployee': 'SGK (Çalışan)',
    'bordro.unemploymentInsurance': 'İşsizlik Sigortası',
    'bordro.incomeTax': 'Gelir Vergisi',
    'bordro.stampTax': 'Damga Vergisi',
    'bordro.preview': 'Bordro Önizleme',
    'bordro.employeeInfo': 'PERSONEL BİLGİLERİ',
    'bordro.fullName': 'Ad Soyad',
    'bordro.earnings': 'KAZANÇLAR',
    'bordro.deductions': 'KESİNTİLER',
    'bordro.employerShares': 'İŞVEREN PAYLARI',
    'bordro.sgkEmployer': 'SGK İşveren Payı',
    'bordro.unemploymentEmployer': 'İşsizlik İşveren Payı',
    'bordro.maritalStatus': 'Medeni Durum',
    'bordro.single': 'Bekar',
    'bordro.married': 'Evli',
    'bordro.childrenCount': 'Çocuk Sayısı',
    'bordro.overtimeCalculation': 'Fazla Mesai Hesaplama',
    'bordro.overtime50': 'Fazla Mesai Saat',
    'bordro.overtime100': 'Fazla Mesai Saat',
    'bordro.overtimeInfo': 'Saatlik ücret temel kazançtan hesaplanır (225 saat)',
    'bordro.overtimeManual': 'Manuel Fazla Mesai',
    'bordro.converter': 'Brüt ⇄ Net Dönüştürücü',
    'bordro.switchToNetToBrut': 'Net→Brüt',
    'bordro.switchToBrutToNet': 'Brüt→Net',
    'bordro.calculationDetails': 'Hesaplama Detayları',
    'bordro.employerSGKDiscount': 'İşveren SGK İndirimi',
    'bordro.noDiscount': 'İndirim Yok',
    'bordro.pointDiscount': 'Puan İndirim',
    'bordro.minWageIncomeTaxExemption': 'Asg. Ücret Gelir Vergisi İstisnası',
    'bordro.minWageStampTaxExemption': 'Asg. Ücret Damga Vergisi İstisnası',
    'bordro.sgkEmployerDiscount': 'SGK İşveren İndirimi',

    // Common
    'common.save': 'Kaydet',
    'common.cancel': 'İptal',
    'common.close': 'Kapat',
    'common.submit': 'Gönder',
    'common.update': 'Güncelle',
    'common.delete': 'Sil',
    'common.edit': 'Düzenle',
    'common.view': 'Görüntüle',
    'common.add': 'Ekle',
    'common.search': 'Ara',
    'common.filter': 'Filtrele',
    'common.export': 'Dışa Aktar',
    'common.import': 'İçe Aktar',
    'common.print': 'Yazdır',
    'common.download': 'İndir',
    'common.upload': 'Yükle',
    'common.loading': 'Yükleniyor...',
    'common.noData': 'Veri bulunamadı',
    'common.error': 'Hata',
    'common.success': 'Başarılı',
    'common.warning': 'Uyarı',
    'common.info': 'Bilgi'
  },
  en: {
    // Sidebar
    'sidebar.allPersonnel': 'Companies & Personnel',
    'sidebar.leaveManagement': 'Leave Management',
    'sidebar.reports': 'Reports',
    'sidebar.payroll': 'Payroll Editing',
    'sidebar.alertsCalendar': 'Alerts & Calendar',
    'sidebar.systemSettings': 'System Settings',
    'sidebar.searchPlaceholder': 'Employee, department, position...',
    
    // Employee Table
    'table.name': 'Full Name',
    'table.company': 'Company',
    'table.department': 'Department',
    'table.position': 'Position',
    'table.level': 'Level',
    'table.salary': 'Salary',
    'table.status': 'Status',
    'table.mobile': 'Mobile',
    'table.actions': 'Actions',
    'table.view': 'View',
    'table.edit': 'Edit',
    'table.download': 'Download',
    'table.delete': 'Delete',
    
    // Status
    'status.active': 'Active',
    'status.onLeave': 'On Leave',
    'status.inactive': 'Inactive',
    
    // Stats
    'stats.employeeList': 'Employee List',
    'stats.active': 'Active',
    'stats.onLeave': 'On Leave',
    'stats.inactive': 'Inactive',
    
    // Toolbar
    'toolbar.all': 'All',
    'toolbar.company': 'Company:',
    'toolbar.newEmployee': 'New Employee',
    'toolbar.exportCSV': 'Export Excel',
    'toolbar.logout': 'Logout',
    
    // Quick Actions
    'quickActions.title': 'Quick Actions',
    'quickActions.bulkLeave': 'Bulk Leave Setup',
    'quickActions.bulkAlert': 'Send Bulk Alert',
    'quickActions.uploadPayroll': 'Upload Payroll',
    'quickActions.assignCertificate': 'Assign Certificate',
    
    // Upcoming Events
    'upcomingEvents.title': 'Upcoming Events',
    'upcomingEvents.add': 'Add',
    
    // Leave Management
    'leave.totalRequests': 'Total Requests',
    'leave.pending': 'Pending',
    'leave.approved': 'Approved',
    'leave.rejected': 'Rejected',
    'leave.newRequest': 'New Leave Request',
    'leave.requests': 'Leave Requests',
    'leave.calendar': 'Leave Calendar',
    'leave.reports': 'Reports',

    // Months
    'month.january': 'January',
    'month.february': 'February',
    'month.march': 'March',
    'month.april': 'April',
    'month.may': 'May',
    'month.june': 'June',
    'month.july': 'July',
    'month.august': 'August',
    'month.september': 'September',
    'month.october': 'October',
    'month.november': 'November',
    'month.december': 'December',

    // Bordro (Payroll)
    'bordro.calculator': 'Payroll Calculator',
    'bordro.list': 'Payroll List',
    'bordro.template': 'Template',
    'bordro.import': 'Import',
    'bordro.export': 'Export',
    'bordro.allPeriods': 'All Periods',
    'bordro.allPersonnel': 'All Personnel',
    'bordro.personnel': 'Personnel',
    'bordro.selectEmployee': 'Select Employee',
    'bordro.period': 'Period',
    'bordro.grossSalary': 'Gross Salary',
    'bordro.totalDeduction': 'Total Deduction',
    'bordro.netSalary': 'Net Salary',
    'bordro.status': 'Status',
    'bordro.actions': 'Actions',
    'bordro.high': 'High',
    'bordro.medium': 'Medium',
    'bordro.low': 'Low',
    'bordro.noRecords': 'No payroll records yet',
    'bordro.idNumber': 'ID',
    'bordro.downloadPDF': 'Download PDF',
    'bordro.templateTooltip': 'Download Template',
    'bordro.importTooltip': 'Import from CSV',
    'bordro.exportTooltip': 'Export as CSV',
    'bordro.importSuccess': 'payroll records successfully imported.',
    'bordro.importError': 'No valid payroll records found to import.',
    'bordro.importFileError': 'An error occurred while importing the file. Please check the file format.',
    'bordro.baseSalary': 'Base Salary',
    'bordro.transportAllowance': 'Transport Allowance',
    'bordro.foodAllowance': 'Food Allowance',
    'bordro.childAllowance': 'Child Allowance',
    'bordro.otherEarnings': 'Other Earnings',
    'bordro.additionalPayments': 'Additional Payments',
    'bordro.overtime': 'Overtime',
    'bordro.weeklyHoliday': 'Weekly Holiday',
    'bordro.publicHoliday': 'Public Holiday',
    'bordro.annualLeaveWage': 'Annual Leave Wage',
    'bordro.bonus': 'Bonus',
    'bordro.premium': 'Premium',
    'bordro.serviceFee': 'Service Fee',
    'bordro.representationLabel': 'Representation & Label',
    'bordro.severancePay': 'Severance Pay',
    'bordro.noticePay': 'Notice Pay',
    'bordro.taxDeductions': 'Tax Deductions',
    'bordro.mgiReduction': 'MGI Reduction',
    'bordro.disabilityReduction': 'Disability Reduction',
    'bordro.otherDeductions': 'Other Deductions',
    'bordro.advance': 'Advance',
    'bordro.unionDues': 'Union Dues',
    'bordro.otherDeduction': 'Other Deduction',
    'bordro.summary': 'Summary',
    'bordro.totalEarnings': 'Total Earnings',
    'bordro.sgkEmployee': 'SSI (Employee)',
    'bordro.unemploymentInsurance': 'Unemployment Insurance',
    'bordro.incomeTax': 'Income Tax',
    'bordro.stampTax': 'Stamp Tax',
    'bordro.preview': 'Payroll Preview',
    'bordro.employeeInfo': 'EMPLOYEE INFORMATION',
    'bordro.fullName': 'Full Name',
    'bordro.earnings': 'EARNINGS',
    'bordro.deductions': 'DEDUCTIONS',
    'bordro.employerShares': 'EMPLOYER SHARES',
    'bordro.sgkEmployer': 'SSI Employer Share',
    'bordro.unemploymentEmployer': 'Unemployment Employer Share',
    'bordro.maritalStatus': 'Marital Status',
    'bordro.single': 'Single',
    'bordro.married': 'Married',
    'bordro.childrenCount': 'Number of Children',
    'bordro.overtimeCalculation': 'Overtime Calculation',
    'bordro.overtime50': 'Overtime Hours',
    'bordro.overtime100': 'Overtime Hours',
    'bordro.overtimeInfo': 'Hourly rate is calculated from base salary (225 hours)',
    'bordro.overtimeManual': 'Manual Overtime',
    'bordro.converter': 'Gross ⇄ Net Converter',
    'bordro.switchToNetToBrut': 'Net→Gross',
    'bordro.switchToBrutToNet': 'Gross→Net',
    'bordro.calculationDetails': 'Calculation Details',
    'bordro.employerSGKDiscount': 'Employer SSI Discount',
    'bordro.noDiscount': 'No Discount',
    'bordro.pointDiscount': 'Point Discount',
    'bordro.minWageIncomeTaxExemption': 'Min. Wage Income Tax Exemption',
    'bordro.minWageStampTaxExemption': 'Min. Wage Stamp Tax Exemption',
    'bordro.sgkEmployerDiscount': 'SSI Employer Discount',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.submit': 'Submit',
    'common.update': 'Update',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.print': 'Print',
    'common.download': 'Download',
    'common.upload': 'Upload',
    'common.loading': 'Loading...',
    'common.noData': 'No data found',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info'
  }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('tr');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};