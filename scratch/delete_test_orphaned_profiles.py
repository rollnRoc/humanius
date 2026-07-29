import os
import json
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

r = requests.post(f"{supabase_url}/auth/v1/token?grant_type=password", json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]
headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

# Delete temporary test profiles created during manual testing
test_emails_to_delete = [
    "eee@gmail.com",
    "asdad@test.com",
    "testcan.portal@sirket.com.tr",
    "supabase.test@portal.com",
    "testkullanici3@gmail.com"
]

print("Deleting temporary test profiles...")
for email in test_emails_to_delete:
    del_r = requests.delete(f"{supabase_url}/rest/v1/profiles?email=eq.{email}", headers=headers)
    print(f"Deleted {email}: status {del_r.status_code}")

# Get final counts
profiles = requests.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name,role", headers=headers).json()
toyota_profiles = [p for p in profiles if 'humanius.net' in (p.get('email') or '') or 'humanius.com' in (p.get('email') or '')]

print(f"\nTotal Toyota Personnel Profiles in Database: {len(toyota_profiles)}")
