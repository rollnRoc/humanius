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

r = requests.post(f"{supabase_url}/auth/v1/token?grant_type=password", json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]
headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

# Delete test record Ahmet Mehmet
print("Deleting test record Ahmet Mehmet...")
requests.delete(f"{supabase_url}/rest/v1/profiles?id=eq.355cadd0-03fe-4525-bd37-6b055e334809", headers=headers)
requests.delete(f"{supabase_url}/rest/v1/employees?id=eq.33316ebb-b9cc-4c6a-92d7-280cd8e2bb17", headers=headers)

# Verify final counts
profiles = requests.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name", headers=headers).json()
toyota_profiles = [p for p in profiles if 'humanius' in (p.get('email') or '')]

print(f"\nFINAL VERIFIED TOYOTA PERSONNEL PROFILES COUNT IN DATABASE: {len(toyota_profiles)}")
