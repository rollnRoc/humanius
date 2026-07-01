-- Recreate public.employees_public view as security invoker to fix Supabase security warning
DROP VIEW IF EXISTS public.employees_public;

CREATE OR REPLACE VIEW public.employees_public
WITH (security_invoker = true)
AS
SELECT 
  id, 
  company_id, 
  name, 
  tc_no, 
  sicil_no, 
  department, 
  position, 
  level, 
  status, 
  join_date, 
  avatar_url, 
  skills, 
  created_at, 
  updated_at, 
  employee_type
FROM public.employees;
