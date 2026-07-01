-- ==========================================
-- UPDATE COMPANY RLS POLICY FOR HR/MANAGERS
-- ==========================================
DROP POLICY IF EXISTS "Admins can update their company" ON public.companies;

CREATE POLICY "Admins, HR and managers can update their company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT company_id FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin', 'hr', 'manager')
    )
  );

-- ==========================================
-- PDKS VARDIYA KAYITLARI RLS POLICIES FIX
-- ==========================================
DROP POLICY IF EXISTS "Users can view their own vardiya" ON public.pdks_vardiya_kayitlari;
DROP POLICY IF EXISTS "Users can insert their own vardiya" ON public.pdks_vardiya_kayitlari;
DROP POLICY IF EXISTS "Users can update their own vardiya" ON public.pdks_vardiya_kayitlari;

-- SELECT Policy
CREATE POLICY "Users can view their own vardiya"
  ON public.pdks_vardiya_kayitlari FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INSERT Policy
CREATE POLICY "Users can insert their own vardiya"
  ON public.pdks_vardiya_kayitlari FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- UPDATE Policy
CREATE POLICY "Users can update their own vardiya"
  ON public.pdks_vardiya_kayitlari FOR UPDATE
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- ==========================================
-- PDKS FAZLA MESAI RLS POLICIES FIX
-- ==========================================
DROP POLICY IF EXISTS "Users can view and request their own mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can insert their own mesai request" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can update their pending mesai" ON public.pdks_fazla_mesai;
DROP POLICY IF EXISTS "Users can delete their pending mesai" ON public.pdks_fazla_mesai;

-- SELECT Policy
CREATE POLICY "Users can view their own mesai"
  ON public.pdks_fazla_mesai FOR SELECT
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- INSERT Policy
CREATE POLICY "Users can insert their own mesai request"
  ON public.pdks_fazla_mesai FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );

-- UPDATE Policy
CREATE POLICY "Users can update their pending mesai"
  ON public.pdks_fazla_mesai FOR UPDATE
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    ) AND onay_durumu = 'bekliyor'
  );

-- DELETE Policy
CREATE POLICY "Users can delete their pending mesai"
  ON public.pdks_fazla_mesai FOR DELETE
  TO authenticated
  USING (
    employee_id = (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    ) AND onay_durumu = 'bekliyor'
  );
