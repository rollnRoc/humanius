import os
import sys
import time
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

session = requests.Session()

# 1. Login as testkullanici to get auth token
auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
r = session.post(auth_url, json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]

edge_url = f"{supabase_url}/functions/v1/user-management"
edge_headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Fetch all profiles
profiles_r = session.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name,role,company_id", headers={"apikey": supabase_key, "Authorization": f"Bearer {access_token}"})
profiles = profiles_r.json()

print(f"Registering / Updating Auth Users for {len(profiles)} accounts...")
toyota_company_id = "d4be3c56-bc23-4ecd-91e3-78f9625a5cb9"

success_count = 0
for p in profiles:
    name = p.get('full_name') or 'Personel'
    email = p.get('email') or ''
    role = p.get('role') or 'employee'
    comp_id = p.get('company_id') or toyota_company_id

    if 'humanius.com' in email or 'humanius.com.tr' in email:
        email = email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net')

    payload = {
        "operation": "create_company_user",
        "companyId": comp_id,
        "fullName": name,
        "email": email,
        "password": "987654",
        "role": role
    }

    for attempt in range(3):
        try:
            res = session.post(edge_url, json=payload, headers=edge_headers, timeout=10)
            if res.status_code == 200:
                success_count += 1
                print(f"Registered/Synced in Auth: {name} -> {email}")
                break
            else:
                print(f"Failed {name} ({email}): {res.text}")
                break
        except Exception as ex:
            print(f"Retry {attempt+1} for {name}: {ex}")
            time.sleep(1)

print(f"\nSuccessfully registered/synced {success_count} accounts in Supabase Auth!")

# Test Dilek Yilmaz login
print("\n--- Testing Dilek Yılmaz login (dilekyilmaz@humanius.net & 987654) ---")
test_r = session.post(auth_url, json={"email": "dilekyilmaz@humanius.net", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
if test_r.status_code == 200:
    print("SUCCESS! Dilek Yılmaz login verified working on @humanius.net with password 987654!")
else:
    print(f"Login failed: {test_r.text}")
