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

  public getActiveStageSequence(config: LeaveApprovalConfig): ('manager' | 'hr' | 'admin')[] {
    const list: ('manager' | 'hr' | 'admin')[] = [];
    if (config.stages.manager) list.push('manager');
    if (config.stages.hr) list.push('hr');
    if (config.stages.admin) list.push('admin');
    return list;
  }

  public getInitialStage(config: LeaveApprovalConfig): 'manager' | 'hr' | 'admin' {
    const seq = this.getActiveStageSequence(config);
    return seq[0] || 'manager';
  }

  public getNextStage(config: LeaveApprovalConfig, currentStage: 'manager' | 'hr' | 'admin'): ('manager' | 'hr' | 'admin') | null {
    const seq = this.getActiveStageSequence(config);
    const currentIndex = seq.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < seq.length - 1) {
      return seq[currentIndex + 1];
    }
    return null; // Son onay kademesi tamamlandı
  }

  public getStageStorageKey(): string {
    return 'humanius_leave_request_stages';
  }

  public getStoredStages(): Record<string, 'manager' | 'hr' | 'admin' | 'completed'> {
    try {
      const data = localStorage.getItem(this.getStageStorageKey());
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  public getTalepCurrentStage(talepId: string, talepDurum: string, config: LeaveApprovalConfig, talepObj?: any): 'manager' | 'hr' | 'admin' | 'completed' {
    if (talepDurum === 'onaylandi') return 'completed';
    if (talepObj?.currentStage) return talepObj.currentStage;
    const stored = this.getStoredStages();
    if (stored[talepId]) return stored[talepId];
    return this.getInitialStage(config);
  }

  public setTalepCurrentStage(talepId: string, nextStage: 'manager' | 'hr' | 'admin' | 'completed'): void {
    const stored = this.getStoredStages();
    stored[talepId] = nextStage;
    try {
      localStorage.setItem(this.getStageStorageKey(), JSON.stringify(stored));
    } catch (e) {
      console.warn('Error saving talep stage:', e);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('humanius_leave_request_stage_updated', { detail: { talepId, nextStage } }));
    }
  }

  public getStageLabel(stage: 'manager' | 'hr' | 'admin' | 'completed'): string {
    switch (stage) {
      case 'manager': return '1. Aşama: Birim Amiri';
      case 'hr': return '2. Aşama: İK Uzmanı';
      case 'admin': return '3. Aşama: Şirket Yöneticisi';
      case 'completed': return 'Tamamlandı';
      default: return stage;
    }
  }

  public getRequiredRoleLabel(stage: 'manager' | 'hr' | 'admin', config?: LeaveApprovalConfig): string {
    const isSingle = config ? this.getActiveStagesCount(config) === 1 : false;
    switch (stage) {
      case 'manager': return isSingle ? 'Birim Amiri veya Şirket Yöneticisi' : 'Birim Amiri';
      case 'hr': return isSingle ? 'İK Uzmanı veya Şirket Yöneticisi' : 'İK Uzmanı';
      case 'admin': return 'Şirket Yöneticisi';
      default: return '';
    }
  }

  public canRoleApproveCurrentStage(effectiveRole: string, currentStage: 'manager' | 'hr' | 'admin', config?: LeaveApprovalConfig): boolean {
    const isSingle = config ? this.getActiveStagesCount(config) === 1 : false;
    const isCompanyManager = ['admin', 'superadmin'].includes(effectiveRole);

    // Kural: Eğer süreç tek aşamalı ise şirket yöneticisi de (Birim amiri veya İK yerine) onaylayabilir
    if (isSingle && isCompanyManager) {
      return true;
    }

    if (currentStage === 'manager') {
      return effectiveRole === 'manager';
    }
    if (currentStage === 'hr') {
      return effectiveRole === 'hr';
    }
    if (currentStage === 'admin') {
      return isCompanyManager;
    }
    return false;
  }
}

export const leaveApprovalService = new LeaveApprovalService();
