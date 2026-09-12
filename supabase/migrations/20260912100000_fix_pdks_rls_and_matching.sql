-- =========================================================================
-- Fix PDKS RLS Policies for Robust Employee & Manager Access
-- Ensures employees can always see their check-out times and shifts,
-- and handles email casing, user_id linkage, and superadmin company bypass.
-- =========================================================================

-- 1. Drop existing policies on pdks_vardiya_kayitlari
DROP POLICY IF EXISTS "Admin, HR and Manager can manage vardiya" ON public.pdks_vardiya_kayitlari;
DROP POLICY IF EXISTS "Users can view their own vardiya" ON public.pdks_vardiya_kayitlari;
DROP POLICY IF EXISTS "Users can insert their own vardiya" ON public.pdks_vardiya_kayitlari;
DROP POLICY IF EXISTS "Users can update their own vardiya" ON public.pdks_vardiya_kayitlari;

-- 2. Admin/HR/Manager/Superadmin full management policy
CREATE POLICY "Admin, HR and Manager can manage vardiya"
  ON public.pdks_vardiya_kayitlari
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'superadmin'
        OR (
          p.role IN ('admin', 'hr', 'manager')
          AND (pdks_vardiya_kayitlari.company_id = p.company_id OR pdks_vardiya_kayitlari.company_id IS NULL)
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'superadmin'
        OR (
          p.role IN ('admin', 'hr', 'manager')
          AND (pdks_vardiya_kayitlari.company_id = p.company_id OR pdks_vardiya_kayitlari.company_id IS NULL)
        )
      )
    )
  );

-- 3. Employee SELECT policy (direct id, user_id linkage, or case-insensitive trimmed email)
CREATE POLICY "Users can view their own vardiya"
  ON public.pdks_vardiya_kayitlari
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
    )
    OR employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = (
        SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
      )
    )
  );

-- 4. Employee INSERT policy
CREATE POLICY "Users can insert their own vardiya"
  ON public.pdks_vardiya_kayitlari
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
    )
    OR employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = (
        SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
      )
    )
  );

-- 5. Employee UPDATE policy
CREATE POLICY "Users can update their own vardiya"
  ON public.pdks_vardiya_kayitlari
  FOR UPDATE
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
    )
    OR employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = (
        SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
      )
    )
  );

-- =========================================================================
-- Fix PDKS FAZLA MESAI RLS POLICIES
-- =========================================================================
DROP POLICY IF EXISTS "Admin, HR and Manager can manage mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can view and request their own mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can view their own mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can insert their own mesai request" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can update their pending mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can delete their pending mesai" ON public.pdks_fazla_mesai;

CREATE POLICY "Admin, HR and Manager can manage mesai"
  ON public.pdks_fazla_mesai
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND (
        p.role = 'superadmin'
        OR (
          p.role IN ('admin', 'hr', 'manager')
          AND (pdks_fazla_mesai.company_id = p.company_id OR pdks_fazla_mesai.company_id IS NULL)
        )
      )
    )
  );

CREATE POLICY "Users can view their own mesai"
  ON public.pdks_fazla_mesai
  FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
    )
    OR employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = (
        SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can insert their own mesai request"
  ON public.pdks_fazla_mesai
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    OR employee_id IN (
      SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
    )
    OR employee_id IN (
      SELECT e.id FROM public.employees e 
      WHERE LOWER(TRIM(e.email)) = (
        SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
      )
    )
  );

CREATE POLICY "Users can update their pending mesai"
  ON public.pdks_fazla_mesai
  FOR UPDATE
  TO authenticated
  USING (
    (
      employee_id = auth.uid()
      OR employee_id IN (
        SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
      )
      OR employee_id IN (
        SELECT e.id FROM public.employees e 
        WHERE LOWER(TRIM(e.email)) = (
          SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
        )
      )
    )
    AND onay_durumu = 'bekliyor'
  );

CREATE POLICY "Users can delete their pending mesai"
  ON public.pdks_fazla_mesai
  FOR DELETE
  TO authenticated
  USING (
    (
      employee_id = auth.uid()
      OR employee_id IN (
        SELECT e.id FROM public.employees e WHERE e.user_id = auth.uid()
      )
      OR employee_id IN (
        SELECT e.id FROM public.employees e 
        WHERE LOWER(TRIM(e.email)) = (
          SELECT LOWER(TRIM(p.email)) FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1
        )
      )
    )
    AND onay_durumu = 'bekliyor'
  );
