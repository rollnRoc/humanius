import os
from supabase import create_client

SUPABASE_URL = "https://xwoapmsyphqfgvwvsscq.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3b2FwbXN5cGhxZmd2d3Zzc2NxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDIwNTc0MSwiZXhwIjoyMDU1NzzgMTQxfQ.03q2X6e1w0H6cZ4c5Q0z_x5u-Q5w5Z0z_x5u-Q5w5Z0")

def main():
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    print("Checking profiles table...")
    profiles_res = supabase.from_('profiles').select('id, email, full_name').execute()
    profiles = profiles_res.data or []
    
    updated_profiles_count = 0
    for p in profiles:
        email = p.get('email') or ''
        if 'humanius.com' in email or 'humanius.com.tr' in email:
            new_email = email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net')
            print(f"Updating profile {p['full_name']} ({p['id']}): {email} -> {new_email}")
            supabase.from_('profiles').update({'email': new_email}).eq('id', p['id']).execute()
            
            # Also update auth.users via admin API if user exists
            try:
                supabase.auth.admin.update_user_by_id(p['id'], {'email': new_email, 'email_confirm': True})
                print(f"  Auth user updated successfully for {p['id']}")
            except Exception as e:
                print(f"  Auth update error for {p['id']}: {e}")
            updated_profiles_count += 1

    print(f"\nProfiles updated: {updated_profiles_count}")

    print("\nChecking employees table...")
    emp_res = supabase.from_('employees').select('id, email, name').execute()
    employees = emp_res.data or []
    
    updated_emp_count = 0
    for e in employees:
        email = e.get('email') or ''
        if 'humanius.com' in email or 'humanius.com.tr' in email:
            new_email = email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net')
            print(f"Updating employee {e['name']} ({e['id']}): {email} -> {new_email}")
            supabase.from_('employees').update({'email': new_email}).eq('id', e['id']).execute()
            updated_emp_count += 1

    print(f"\nEmployees updated: {updated_emp_count}")
    print("\nMigration completed successfully!")

if __name__ == '__main__':
    main()
