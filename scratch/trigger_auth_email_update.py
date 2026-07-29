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

# 1. Login as testkullanici to get auth token
auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
r = requests.post(auth_url, json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]

# 2. Trigger operation update_all_auth_emails_to_net via Edge Function
edge_url = f"{supabase_url}/functions/v1/user-management"
edge_headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

print("Triggering update_all_auth_emails_to_net on Edge Function with Auth token...")
edge_r = requests.post(edge_url, json={"operation": "update_all_auth_emails_to_net"}, headers=edge_headers)
print(f"Edge Function Response ({edge_r.status_code}): {edge_r.text}")

# 3. Test Dilek Yilmaz login with dilekyilmaz@humanius.net
print("\nTesting Dilek Yılmaz login with dilekyilmaz@humanius.net & 987654...")
test_r = requests.post(auth_url, json={"email": "dilekyilmaz@humanius.net", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
print(f"Login Response ({test_r.status_code}): {test_r.text}")
if test_r.status_code == 200:
    print("\nSUCCESS! Dilek Yılmaz can now log in with dilekyilmaz@humanius.net & 987654!")
