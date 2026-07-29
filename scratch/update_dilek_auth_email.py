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
auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
r = requests.post(auth_url, json={"email": "testkullanici@gmail.com", "password": "123456"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]

edge_url = f"{supabase_url}/functions/v1/user-management"
edge_headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Update Dilek Yilmaz auth user email to dilekyilmaz@humanius.net using Edge Function user-management
payload = {
    "action": "update_user_password",
    "targetUserId": "2262aa26-c8a9-45a5-a73e-7d866a070260", # Dilek Yilmaz ID
    "newEmail": "dilekyilmaz@humanius.net",
    "newPassword": "987654"
}

print("Calling user-management edge function to update Dilek auth email to dilekyilmaz@humanius.net...")
edge_r = requests.post(edge_url, json=payload, headers=edge_headers)
print(f"Edge Response: status={edge_r.status_code}, body={edge_r.text}")

# Verify login with dilekyilmaz@humanius.net
print("\nTesting login with dilekyilmaz@humanius.net & 987654...")
test_r = requests.post(auth_url, json={"email": "dilekyilmaz@humanius.net", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
if test_r.status_code == 200:
    print("SUCCESS! Dilek Yılmaz can now log in with dilekyilmaz@humanius.net!")
else:
    print(f"Login failed: {test_r.text}")
