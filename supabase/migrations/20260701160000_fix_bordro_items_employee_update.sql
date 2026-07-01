-- Allow employees to update their own payroll status (approve/reject)
DROP POLICY IF EXISTS "Employees can update their own bordro status" ON public.bordro_items;

CREATE POLICY "Employees can update their own bordro status"
  ON public.bordro_items FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees 
      WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );
