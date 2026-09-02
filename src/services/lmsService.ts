import { supabase } from '../lib/supabase';
import { Egitim, SertifikaKaydi } from '../components/EgitimLMS';

class LMSService {
  /**
   * Get all courses for a company from database / local cache
   */
  public async getCourses(companyId?: string): Promise<Egitim[]> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_egitimler_${effectiveCompanyId}`;

    // 1. Read local cache first
    let localData: Egitim[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        localData = JSON.parse(saved);
      }
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      return localData;
    }

    // 2. Fetch from Supabase database
    try {
      const { data, error } = await supabase
        .from('company_courses')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data && Array.isArray(data)) {
        const formatted: Egitim[] = data.map((c: any) => ({
          id: c.id,
          baslik: c.baslik,
          kategori: c.kategori || 'Genel',
          tur: c.tur || 'video',
          seviye: c.seviye || 'baslangic',
          egitmen: c.egitmen || '',
          aciklama: c.aciklama || '',
          zorunlu: Boolean(c.zorunlu),
          tamamlayanSayisi: 0,
        }));
        localStorage.setItem(storageKey, JSON.stringify(formatted));
        return formatted;
      }
    } catch {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'list_company_courses', companyId },
        });
        if (res?.courses && Array.isArray(res.courses)) {
          const formatted: Egitim[] = res.courses.map((c: any) => ({
            id: c.id,
            baslik: c.baslik,
            kategori: c.kategori || 'Genel',
            tur: c.tur || 'video',
            seviye: c.seviye || 'baslangic',
            egitmen: c.egitmen || '',
            aciklama: c.aciklama || '',
            zorunlu: Boolean(c.zorunlu),
            tamamlayanSayisi: 0,
          }));
          localStorage.setItem(storageKey, JSON.stringify(formatted));
          return formatted;
        }
      } catch (e) {
        console.warn('LMS courses fetch error:', e);
      }
    }

    return localData;
  }

  /**
   * Save or update a course
   */
  public async saveCourse(companyId: string, course: Egitim): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_egitimler_${effectiveCompanyId}`;

    // 1. Immediately update localStorage
    try {
      let local: Egitim[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) local = JSON.parse(saved);
      const existsIndex = local.findIndex((c) => c.id === course.id);
      let updated: Egitim[];
      if (existsIndex >= 0) {
        updated = [...local];
        updated[existsIndex] = course;
      } else {
        updated = [course, ...local];
      }
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      window.dispatchEvent(new CustomEvent('humanius_courses_updated', { detail: { companyId: effectiveCompanyId } }));
      return true;
    }

    // 2. Persist to Supabase and wait for completion
    let success = false;
    try {
      const { error } = await supabase.from('company_courses').upsert({
        id: course.id,
        company_id: companyId,
        baslik: course.baslik,
        kategori: course.kategori || 'Genel',
        tur: course.tur,
        seviye: course.seviye,
        egitmen: course.egitmen,
        aciklama: course.aciklama || '',
        zorunlu: Boolean(course.zorunlu),
        updated_at: new Date().toISOString(),
      });
      if (!error) success = true;
    } catch {}

    if (!success) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'save_company_course',
            companyId,
            ...course,
          },
        });
        success = !!res?.success;
      } catch (e) {
        console.error('LMS course save error:', e);
      }
    }

    // 3. Dispatch update event after DB write
    window.dispatchEvent(new CustomEvent('humanius_courses_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Delete a course
   */
  public async deleteCourse(companyId: string, courseId: string): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_egitimler_${effectiveCompanyId}`;

    try {
      let local: Egitim[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) local = JSON.parse(saved);
      const updated = local.filter((c) => c.id !== courseId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      window.dispatchEvent(new CustomEvent('humanius_courses_updated', { detail: { companyId: effectiveCompanyId } }));
      return true;
    }

    let success = false;
    try {
      const { error } = await supabase.from('company_courses').delete().eq('id', courseId);
      if (!error) success = true;
    } catch {}

    if (!success) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'delete_company_course', id: courseId },
        });
        success = !!res?.success;
      } catch (e) {
        console.error('LMS delete course error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('humanius_courses_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Get all assignments / certificates for a company
   */
  public async getAssignments(companyId?: string, employeeId?: string): Promise<SertifikaKaydi[]> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_sertifikalar_${effectiveCompanyId}`;

    let localData: SertifikaKaydi[] = [];
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        localData = JSON.parse(saved);
      }
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      return localData;
    }

    try {
      let query = supabase
        .from('company_course_assignments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (employeeId) {
        query = query.eq('employee_id', employeeId);
      }

      const { data, error } = await query;
      if (!error && data && Array.isArray(data)) {
        const formatted: SertifikaKaydi[] = data.map((s: any) => ({
          id: s.id,
          employeeId: s.employee_id,
          employeeName: s.employee_name,
          egitimId: s.egitim_id,
          egitimAdi: s.egitim_adi,
          durum: s.durum || 'devam_ediyor',
          tamamlanmaTarihi: s.tamamlanma_tarihi || undefined,
          hedefTarih: s.hedef_tarih || undefined,
          puan: s.puan != null ? Number(s.puan) : undefined,
          gecerlilikSuresi: s.gecerlilik_suresi || undefined,
        }));
        if (!employeeId) {
          localStorage.setItem(storageKey, JSON.stringify(formatted));
        }
        return formatted;
      }
    } catch {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'list_company_course_assignments', companyId, employeeId },
        });
        if (res?.assignments && Array.isArray(res.assignments)) {
          const formatted: SertifikaKaydi[] = res.assignments.map((s: any) => ({
            id: s.id,
            employeeId: s.employee_id,
            employeeName: s.employee_name,
            egitimId: s.egitim_id,
            egitimAdi: s.egitim_adi,
            durum: s.durum || 'devam_ediyor',
            tamamlanmaTarihi: s.tamamlanma_tarihi || undefined,
            hedefTarih: s.hedef_tarih || undefined,
            puan: s.puan != null ? Number(s.puan) : undefined,
            gecerlilikSuresi: s.gecerlilik_suresi || undefined,
          }));
          if (!employeeId) {
            localStorage.setItem(storageKey, JSON.stringify(formatted));
          }
          return formatted;
        }
      } catch (e) {
        console.warn('LMS assignments fetch error:', e);
      }
    }

    return localData;
  }

  /**
   * Save or update an assignment / certificate
   */
  public async saveAssignment(companyId: string, item: SertifikaKaydi): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_sertifikalar_${effectiveCompanyId}`;

    // 1. Immediately update localStorage
    try {
      let local: SertifikaKaydi[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) local = JSON.parse(saved);
      const existsIndex = local.findIndex((s) => s.id === item.id);
      let updated: SertifikaKaydi[];
      if (existsIndex >= 0) {
        updated = [...local];
        updated[existsIndex] = item;
      } else {
        updated = [item, ...local];
      }
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
      return true;
    }

    // 2. Persist to Supabase and wait for completion
    let success = false;
    try {
      const { error } = await supabase.from('company_course_assignments').upsert({
        id: item.id,
        company_id: companyId,
        employee_id: item.employeeId,
        employee_name: item.employeeName,
        egitim_id: item.egitimId,
        egitim_adi: item.egitimAdi,
        durum: item.durum || 'devam_ediyor',
        tamamlanma_tarihi: item.tamamlanmaTarihi || null,
        hedef_tarih: item.hedefTarih || null,
        puan: item.puan != null ? item.puan : null,
        gecerlilik_suresi: item.gecerlilikSuresi || null,
        updated_at: new Date().toISOString(),
      });
      if (!error) success = true;
    } catch {}

    if (!success) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'save_company_course_assignment',
            companyId,
            ...item,
            employee_id: item.employeeId,
            employee_name: item.employeeName,
            egitim_id: item.egitimId,
            egitim_adi: item.egitimAdi,
            tamamlanma_tarihi: item.tamamlanmaTarihi,
            hedef_tarih: item.hedefTarih,
            gecerlilik_suresi: item.gecerlilikSuresi,
          },
        });
        success = !!res?.success;
      } catch (e) {
        console.error('LMS save assignment error:', e);
      }
    }

    // 3. Dispatch update event after DB write
    window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Bulk save assignments (e.g. for department or company-wide)
   */
  public async bulkSaveAssignments(companyId: string, items: SertifikaKaydi[]): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_sertifikalar_${effectiveCompanyId}`;

    // 1. Immediately update localStorage
    try {
      let local: SertifikaKaydi[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) local = JSON.parse(saved);
      const updated = [...items, ...local.filter((l) => !items.some((i) => i.id === l.id))];
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
      return true;
    }

    // 2. Persist to Supabase and wait for completion
    let success = false;
    try {
      const rows = items.map((item) => ({
        id: item.id,
        company_id: companyId,
        employee_id: item.employeeId,
        employee_name: item.employeeName,
        egitim_id: item.egitimId,
        egitim_adi: item.egitimAdi,
        durum: item.durum || 'devam_ediyor',
        tamamlanma_tarihi: item.tamamlanmaTarihi || null,
        hedef_tarih: item.hedefTarih || null,
        puan: item.puan != null ? item.puan : null,
        gecerlilik_suresi: item.gecerlilikSuresi || null,
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('company_course_assignments').upsert(rows);
      if (!error) success = true;
    } catch {}

    if (!success) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: {
            operation: 'bulk_save_company_course_assignments',
            companyId,
            assignments: items,
          },
        });
        success = !!res?.success;
      } catch (e) {
        console.error('LMS bulk save error:', e);
      }
    }

    // 3. Dispatch update event after DB write
    window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }

  /**
   * Delete an assignment
   */
  public async deleteAssignment(companyId: string, id: string): Promise<boolean> {
    const effectiveCompanyId = companyId || 'default';
    const storageKey = `humanius_sertifikalar_${effectiveCompanyId}`;

    try {
      let local: SertifikaKaydi[] = [];
      const saved = localStorage.getItem(storageKey);
      if (saved) local = JSON.parse(saved);
      const updated = local.filter((s) => s.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch {}

    if (!companyId || companyId === 'default' || companyId.includes('demo')) {
      window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
      return true;
    }

    let success = false;
    try {
      const { error } = await supabase.from('company_course_assignments').delete().eq('id', id);
      if (!error) success = true;
    } catch {}

    if (!success) {
      try {
        const { data: res } = await supabase.functions.invoke('user-management', {
          body: { operation: 'delete_company_course_assignment', id },
        });
        success = !!res?.success;
      } catch (e) {
        console.error('LMS delete assignment error:', e);
      }
    }

    window.dispatchEvent(new CustomEvent('humanius_assignments_updated', { detail: { companyId: effectiveCompanyId } }));
    return success;
  }
}

export const lmsService = new LMSService();
