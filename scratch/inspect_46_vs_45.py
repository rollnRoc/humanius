import os
import json
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
auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"

access_token = None
for _ in range(3):
    try:
        r = session.post(auth_url, json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"}, timeout=10)
        if r.status_code == 200:
            access_token = r.json()["access_token"]
            break
    except Exception as ex:
        print(f"Auth attempt error: {ex}")
        time.sleep(1)

if not access_token:
    print("Could not obtain access token")
    sys.exit(1)

headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}"}

profiles_r = session.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name,role,created_at", headers=headers).json()
employees_r = session.get(f"{supabase_url}/rest/v1/employees?select=id,email,name,position", headers=headers).json()

print(f"Profiles count: {len(profiles_r)}")
print(f"Employees count: {len(employees_r)}")

emp_emails = set((e.get('email') or '').lower().strip() for e in employees_r)
prof_emails = set((p.get('email') or '').lower().strip() for p in profiles_r)

print("\n--- PROFILES NOT IN EMPLOYEES ---")
for p in profiles_r:
    pe = (p.get('email') or '').lower().strip()
    if pe not in emp_emails:
        print(f"Profile: ID={p['id']}, Name={p.get('full_name')}, Email={p.get('email')}, Role={p.get('role')}")

print("\n--- EMPLOYEES NOT IN PROFILES ---")
for e in employees_r:
    ee = (e.get('email') or '').lower().strip()
    if ee not in prof_emails:
        print(f"Employee: ID={e['id']}, Name={e.get('name')}, Email={e.get('email')}, Position={e.get('position')}")
