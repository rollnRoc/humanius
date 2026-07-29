import os
import sys
import requests

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

auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"

test_accounts = [
    ("dilekyilmaz@humanius.net", "987654"),
    ("dilekyilmaz@humanius.com", "987654"),
    ("metinturgut@humanius.net", "987654"),
    ("testkullanici@gmail.com", "123456"),
    ("superadmin@humanius.local", "123456")
]

for em, pw in test_accounts:
    r = requests.post(auth_url, json={"email": em, "password": pw}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
    print(f"Account {em}: status={r.status_code}, body={r.text[:100]}")
    if r.status_code == 200:
        access_token = r.json()["access_token"]
        headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}
        emp_res = requests.get(f"{supabase_url}/rest/v1/employees?select=id,name,email,department,position", headers=headers)
        print(f" -> Employees count visible to {em}: {len(emp_res.json())}")
        break

