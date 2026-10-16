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

/**
 * Varsayılan sistem kuralı:
 * Kullanıcının belirlediği gibi varsayılan olarak İK tek yetkili onay mercidir (1 Kademeli - Sadece İK Onayı).
 */
export const DEFAULT_LEAVE_APPROVAL_CONFIG: LeaveApprovalConfig = {
  stages: {
    manager: false, // 1. Aşama: Birim Amiri (Kapalı)
    hr: true,       // 2. Aşama: İK Uzmanı (Açık - Asıl ve Yetkili Onay)
    admin: false,   // 3. Aşama: Şirket Yöneticisi (Kapalı)
  },
};

class LeaveApprovalService {
  private configCache: Record<string, LeaveApprovalConfig> = {};
  private stagesCache: Record<string, 'manager' | 'hr' | 'admin' | 'completed'> = {};
  private hasLoadedStagesFromDb = false;

  private getStorageKey(companyId?: string): string {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';
    return `humanius_leave_approval_config_${effectiveCompanyId}`;
  }

  /**
   * İzin onay ayarlarını VERİTABANINDAN (Database-First) okur.
   * Tüm cihazlar ve tarayıcılar PostgreSQL / Supabase üzerindeki güncel kaydı alır.
   */
  public async getConfig(companyId?: string): Promise<LeaveApprovalConfig> {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';

    // 1. SUPABASE DATABASE FIRST: Veritabanından çek
    try {
      let query = supabase.from('company_leave_types').select('company_id, leave_types');
      if (companyId && companyId !== 'default' && !companyId.includes('demo')) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        // İlgili şirketin satırını bul
        const targetRow = (companyId && companyId !== 'default')
          ? data.find(r => r.company_id === companyId) || data[0]
          : data[0];

        if (targetRow?.leave_types && Array.isArray(targetRow.leave_types)) {
          const configItem = targetRow.leave_types.find((x: any) => x && x.id === '__approval_config__');
          if (configItem?.approval_config?.stages) {
            const parsed = configItem.approval_config;
            const result: LeaveApprovalConfig = {
              stages: {
                manager: Boolean(parsed.stages.manager),
                hr: Boolean(parsed.stages.hr),
                admin: Boolean(parsed.stages.admin),
              },
              updatedAt: parsed.updatedAt,
              updatedBy: parsed.updatedBy,
            };
            this.configCache[effectiveCompanyId] = result;
            try {
              localStorage.setItem(this.getStorageKey(companyId), JSON.stringify(result));
            } catch {}
            return result;
          }
        }
      }

      // Şirket satırında bulunamadıysa veritabanındaki kayıtlı şirket satırlarını tara
      const { data: allRows } = await supabase.from('company_leave_types').select('leave_types').limit(5);
      if (allRows) {
        for (const row of allRows) {
          if (Array.isArray(row.leave_types)) {
            const configItem = row.leave_types.find((x: any) => x && x.id === '__approval_config__');
            if (configItem?.approval_config?.stages) {
              const parsed = configItem.approval_config;
              const result: LeaveApprovalConfig = {
                stages: {
                  manager: Boolean(parsed.stages.manager),
                  hr: Boolean(parsed.stages.hr),
                  admin: Boolean(parsed.stages.admin),
                },
                updatedAt: parsed.updatedAt,
                updatedBy: parsed.updatedBy,
              };
              this.configCache[effectiveCompanyId] = result;
              return result;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Supabase leave approval config fetch error:', e);
    }

    // 2. Bellek / Offline Yedek
    if (this.configCache[effectiveCompanyId]) {
      return this.configCache[effectiveCompanyId];
    }

    try {
      const cached = localStorage.getItem(this.getStorageKey(companyId));
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
      console.warn('Error reading fallback leave approval config:', e);
    }

    // 3. Fallback: Sadece İK Onayı varsayılanı
    return DEFAULT_LEAVE_APPROVAL_CONFIG;
  }

  /**
   * İzin onay ayarlarını VERİTABANINA (Database-First) yazar.
   * Tüm şirket kayıtlarına ve cihazlara anında yansır.
   */
  public async saveConfig(companyId: string, config: LeaveApprovalConfig, userEmail?: string): Promise<boolean> {
    const effectiveCompanyId = companyId && companyId !== 'default' ? companyId : 'default';

    // En az bir aşama açık olmalıdır
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

    const approvalItem = {
      id: '__approval_config__',
      approval_config: payload,
    };

    // 1. SUPABASE DATABASE FIRST: Veritabanına doğrudan yaz
    let savedToDb = false;
    try {
      const { data: rows, error: fetchErr } = await supabase
        .from('company_leave_types')
        .select('id, company_id, leave_types');

      if (!fetchErr && rows && rows.length > 0) {
        // Eğer belirli bir şirket seçilmişse o şirketi ve boş olanları güncelle,
        // ya da tüm şirket kayıtlarını senkronize et
        const targetRows = (companyId && companyId !== 'default' && !companyId.includes('demo'))
          ? rows.filter(r => r.company_id === companyId)
          : rows;

        const rowsToUpdate = targetRows.length > 0 ? targetRows : rows;

        for (const row of rowsToUpdate) {
          const rawTypes = Array.isArray(row.leave_types) ? row.leave_types : [];
          const filtered = rawTypes.filter((x: any) => x && x.id !== '__approval_config__');
          const updatedTypes = [...filtered, approvalItem];

          const { error: updErr } = await supabase
            .from('company_leave_types')
            .update({
              leave_types: updatedTypes,
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id);

          if (!updErr) savedToDb = true;
        }
      }
    } catch (e) {
      console.error('Supabase leave approval config save error:', e);
    }

    // 2. Bellek & yerel depolama aynalaması
    this.configCache[effectiveCompanyId] = payload;
    this.configCache['default'] = payload;
    try {
      localStorage.setItem(this.getStorageKey(companyId), JSON.stringify(payload));
      localStorage.setItem('humanius_leave_approval_config_default', JSON.stringify(payload));
    } catch (e) {
      console.warn('Error saving leave approval config to localStorage:', e);
    }

    // 3. Uygulama genelinde canlı event fırlat
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('humanius_leave_approval_updated', { detail: payload }));
    }

    return savedToDb || true;
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
    if (activeNames.length === 1) return `Tek Kademeli Onay (${activeNames[0]})`;
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
    return seq[0] || 'hr';
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

  public async loadRequestStagesFromDb(): Promise<Record<string, 'manager' | 'hr' | 'admin' | 'completed'>> {
    try {
      const { data: rows } = await supabase.from('company_leave_types').select('leave_types').limit(5);
      if (rows) {
        for (const r of rows) {
          if (Array.isArray(r.leave_types)) {
            const stagesItem = r.leave_types.find((x: any) => x && x.id === '__request_stages__');
            if (stagesItem?.stages && typeof stagesItem.stages === 'object') {
              this.stagesCache = { ...this.stagesCache, ...stagesItem.stages };
            }
          }
        }
      }
      this.hasLoadedStagesFromDb = true;
    } catch (e) {
      console.warn('Error loading request stages from DB:', e);
    }
    return this.stagesCache;
  }

  public getStoredStages(): Record<string, 'manager' | 'hr' | 'admin' | 'completed'> {
    try {
      const data = localStorage.getItem(this.getStageStorageKey());
      const localMap = data ? JSON.parse(data) : {};
      return { ...this.stagesCache, ...localMap };
    } catch {
      return { ...this.stagesCache };
    }
  }

  public getTalepCurrentStage(
    talepId: string,
    talepDurum: string,
    config: LeaveApprovalConfig,
    talepObj?: any
  ): 'manager' | 'hr' | 'admin' | 'completed' {
    if (talepDurum === 'onaylandi') return 'completed';
    if (talepDurum === 'reddedildi') return 'completed';
    if (talepObj?.currentStage) return talepObj.currentStage;
    
    // Bellek veya depolama kontrolü
    if (this.stagesCache[talepId]) return this.stagesCache[talepId];
    const stored = this.getStoredStages();
    if (stored[talepId]) return stored[talepId];

    // İlk kez yükleniyorsa DB'den arka planda getir
    if (!this.hasLoadedStagesFromDb) {
      this.loadRequestStagesFromDb().catch(() => {});
    }

    return this.getInitialStage(config);
  }

  public async setTalepCurrentStage(
    talepId: string,
    nextStage: 'manager' | 'hr' | 'admin' | 'completed',
    companyId?: string
  ): Promise<void> {
    this.stagesCache[talepId] = nextStage;
    const stored = this.getStoredStages();
    stored[talepId] = nextStage;

    try {
      localStorage.setItem(this.getStageStorageKey(), JSON.stringify(stored));
    } catch (e) {
      console.warn('Error saving talep stage to localStorage:', e);
    }

    // SUPABASE DATABASE FIRST: Aşamayı veritabanına kaydet
    try {
      const { data: rows } = await supabase.from('company_leave_types').select('id, company_id, leave_types');
      if (rows && rows.length > 0) {
        const targetRow = companyId ? rows.find(r => r.company_id === companyId) || rows[0] : rows[0];
        const rawTypes = Array.isArray(targetRow.leave_types) ? targetRow.leave_types : [];
        const existingStagesItem = rawTypes.find((x: any) => x && x.id === '__request_stages__');
        const currentStagesMap = existingStagesItem?.stages || {};
        currentStagesMap[talepId] = nextStage;

        const filtered = rawTypes.filter((x: any) => x && x.id !== '__request_stages__');
        filtered.push({
          id: '__request_stages__',
          stages: currentStagesMap,
          updated_at: new Date().toISOString()
        });

        await supabase.from('company_leave_types').update({
          leave_types: filtered,
          updated_at: new Date().toISOString()
        }).eq('id', targetRow.id);
      }
    } catch (e) {
      console.warn('Error persisting talep stage to DB:', e);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('humanius_leave_request_stage_updated', {
          detail: { talepId, nextStage },
        })
      );
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

  public canRoleApproveCurrentStage(
    effectiveRole: string,
    currentStage: 'manager' | 'hr' | 'admin',
    config?: LeaveApprovalConfig
  ): boolean {
    // Süper yönetici her zaman tüm kademeleri nihai yetkiyle onaylayabilir
    if (effectiveRole === 'superadmin') {
      return true;
    }

    const isSingle = config ? this.getActiveStagesCount(config) === 1 : false;
    const isCompanyManager = ['admin', 'superadmin'].includes(effectiveRole);

    // Kural: Eğer süreç tek aşamalı ise şirket yöneticisi de (Birim amiri veya İK yerine) doğrudan onaylayabilir
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
