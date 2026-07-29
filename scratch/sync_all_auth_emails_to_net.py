import os
import sys
import requests

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

env_path = r"e:\projects\Humaniuss-master\.env"
supabase_url = None
supabase_key = None

if os.path.exists(env_path):
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line:
                k, v = line.strip().split('=', 1)
                if k.strip() == 'VITE_SUPABASE_URL':
                    supabase_url = v.strip().strip("'").strip('"')
                elif k.strip() == 'VITE_SUPABASE_ANON_KEY':
                    supabase_key = v.strip().strip("'").strip('"')

# 1. Login as testkullanici
r = requests.post(f"{supabase_url}/auth/v1/token?grant_type=password", json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]
headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

# 2. Fetch all profiles
profiles = requests.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name,role", headers=headers).json()

edge_url = f"{supabase_url}/functions/v1/user-management"

print("Synchronizing all Auth users & Profiles to @humanius.net...")
updated_count = 0

for p in profiles:
    old_email = p.get('email') or ''
    full_name = p.get('full_name') or ''
    if 'humanius.com' in old_email or 'humanius.com.tr' in old_email:
        new_email = old_email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net')
        print(f"Updating {full_name} ({p['id']}): {old_email} -> {new_email}")
        
        # Use update_employee_details operation in Edge Function
        edge_r = requests.post(edge_url, json={
            "operation": "update_employee_details",
            "email": new_email,
            "fullName": full_name,
            "companyId": "d4be3c56-bc23-4ecd-91e3-78f9625a5cb9"
        }, headers=headers)
        
        # Also patch profiles table directly
        requests.patch(f"{supabase_url}/rest/v1/profiles?id=eq.{p['id']}", json={"email": new_email}, headers=headers)
        updated_count += 1

print(f"\nCompleted! Synchronized {updated_count} user emails to @humanius.net")

# Verify Dilek Yilmaz login
print("\nTesting Dilek Yılmaz login (dilekyilmaz@humanius.net / 987654)...")
dilek_r = requests.post(f"{supabase_url}/auth/v1/token?grant_type=password", json={"email": "dilekyilmaz@humanius.com", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
if dilek_r.status_code == 200:
    print("Dilek Yılmaz can log in with dilekyilmaz@humanius.com / 987654")

dilek_r_net = requests.post(f"{supabase_url}/auth/v1/token?grant_type=password", json={"email": "dilekyilmaz@humanius.net", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
if dilek_r_net.status_code == 200:
    print("SUCCESS! Dilek Yılmaz can log in with dilekyilmaz@humanius.net / 987654!")
