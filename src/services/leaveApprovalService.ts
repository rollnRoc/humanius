import { supabase } from '../lib/supabase';

export interface LeaveApprovalStages {
  manager: boolean; // 1. Aşama: Birim / Departman Amiri
  hr: boolean;      // 2. Aşama: İnsan Kaynakları (İK)
  admin: boolean;   // 3. Aşama: Şirket Yöneticisi
}

export interface LeaveApprovalConfig {
  stages: LeaveApprovalStages;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_LEAVE_APPROVAL_CONFIG: LeaveApprovalConfig = {
  stages: {
    manager: true, // 1. Aşama: Birim Amiri
    hr: true,      // 2. Aşama: İK
    admin: false,  // 3. Aşama: Şirket Yöneticisi
  },
};

class LeaveApprovalService {
  private getStorageKey(companyId?: string): string {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';
    return `humanius_leave_approval_config_${effectiveCompanyId}`;
  }

  public async getConfig(companyId?: string): Promise<LeaveApprovalConfig> {
    const key = this.getStorageKey(companyId);

    // 1. Try local storage cache first
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.stages) {
          return {
            stages: {
              manager: Boolean(parsed.stages.manager),
              hr: Boolean(parsed.stages.hr),
              admin: Boolean(parsed.stages.admin),
            },
            updatedAt: parsed.updatedAt,
            updatedBy: parsed.updatedBy,
          };
        }
      }
    } catch (e) {
      console.warn('Error reading leave approval config from localStorage:', e);
    }

    // 2. Fallback to default
    return DEFAULT_LEAVE_APPROVAL_CONFIG;
  }

  public async saveConfig(companyId: string, config: LeaveApprovalConfig, userEmail?: string): Promise<boolean> {
    const key = this.getStorageKey(companyId);

    // Ensure at least one stage is active
    const hasAtLeastOne = config.stages.manager || config.stages.hr || config.stages.admin;
    if (!hasAtLeastOne) {
      throw new Error('En az bir onay aşaması açık olmalıdır.');
    }

    const payload: LeaveApprovalConfig = {
      stages: {
        manager: Boolean(config.stages.manager),
        hr: Boolean(config.stages.hr),
        admin: Boolean(config.stages.admin),
      },
      updatedAt: new Date().toISOString(),
      updatedBy: userEmail || 'Yönetici',
    };

    // Save to local storage
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      localStorage.setItem('humanius_leave_approval_config_default', JSON.stringify(payload));
    } catch (e) {
      console.warn('Error saving leave approval config to localStorage:', e);
    }

    // Broadcast update event across application
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('humanius_leave_approval_updated', { detail: payload }));
    }

    return true;
  }

  public getActiveStagesCount(config: LeaveApprovalConfig): number {
    return [config.stages.manager, config.stages.hr, config.stages.admin].filter(Boolean).length;
  }

  public getActiveStagesSummary(config: LeaveApprovalConfig): string {
    const activeNames: string[] = [];
    if (config.stages.manager) activeNames.push('1. Birim Amiri');
    if (config.stages.hr) activeNames.push('2. İK Uzmanı');
    if (config.stages.admin) activeNames.push('3. Şirket Yöneticisi');

    if (activeNames.length === 0) return 'Tanımsız';
    if (activeNames.length === 3) return '3 Aşamalı Onay (Tam Akış: Birim Amiri ➔ İK ➔ Şirket Yöneticisi)';
    return `${activeNames.length} Aşamalı Onay (${activeNames.join(' ➔ ')})`;
  }
}

export const leaveApprovalService = new LeaveApprovalService();
