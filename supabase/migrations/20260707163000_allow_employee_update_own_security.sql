-- ==========================================
-- ALLOW EMPLOYEES TO UPDATE THEIR OWN SECURITY SETTINGS
-- ==========================================
DROP POLICY IF EXISTS "Employees can update their own passcode and signature" ON public.employees;

CREATE POLICY "Employees can update their own passcode and signature"
  ON public.employees FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
