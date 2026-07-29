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

# Test dilekyilmaz@humanius.com with 987654 and 123456
for p in ["987654", "123456", "Marjeka51."]:
    r = requests.post(auth_url, json={"email": "dilekyilmaz@humanius.com", "password": p}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
    print(f"Email: dilekyilmaz@humanius.com | Pass: {p} | Status: {r.status_code}")
    if r.status_code == 200:
        print(f"SUCCESS LOGGED IN: dilekyilmaz@humanius.com / {p}")

