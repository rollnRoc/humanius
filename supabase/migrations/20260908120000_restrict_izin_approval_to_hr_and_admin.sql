/*
  # İzin Talepleri - Onay ve Güncelleme Yetkisinin İK ve Şirket Yöneticisi ile Sınırlandırılması

  Problem:
  - Mevcut RLS politikasında ('HR and managers can update izin talepleri') 'manager' rolündeki kullanıcılar da izin taleplerini doğrudan güncelleyebilmekte/onaylayabilmekteydi.
  - Şirket politikası gereğince müdürlerin (birim amirlerinin) izin onaylama ve reddetme yetkisi kaldırılmıştır.
  - İzin onaylama ve durum güncelleme yetkisi yalnızca 'admin' (Şirket Yöneticisi), 'hr' (İK Uzmanı) ve 'superadmin' rollerine aittir.

  Çözüm:
  - "HR and managers can update izin talepleri" politikası kaldırılır.
  - Yalnızca 'admin', 'hr' ve 'superadmin' rollerine UPDATE izni tanıyan "HR and admins can update izin talepleri" politikası tanımlanır.
*/

DROP POLICY IF EXISTS "HR and managers can update izin talepleri" ON public.izin_talepleri;
DROP POLICY IF EXISTS "HR and admins can update izin talepleri" ON public.izin_talepleri;

CREATE POLICY "HR and admins can update izin talepleri"
  ON public.izin_talepleri FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr')
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
