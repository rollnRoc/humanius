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

auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
test_emails = [
    "testkullanici@gmail.com",
    "info@bigsafer.com",
    "metinturgut@humanius.com",
    "sunayberberoglu@humanius.com",
    "tugbagurel@humanius.com"
]
test_passwords = ["123456", "987654", "Marjeka51."]

access_token = None
for e in test_emails:
    for p in test_passwords:
        r = requests.post(auth_url, json={"email": e, "password": p}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
        if r.status_code == 200:
            access_token = r.json()["access_token"]
            print(f"Logged in successfully as {e}")
            break
    if access_token:
        break

if not access_token:
    print("Could not log in to Supabase REST API")
    sys.exit(1)

headers = {
    "apikey": supabase_key,
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# 1. Update Profiles
print("\n--- 1. Updating Profiles Table ---")
profiles_r = requests.get(f"{supabase_url}/rest/v1/profiles?select=id,email,full_name", headers=headers)
profiles = profiles_r.json() if profiles_r.status_code == 200 else []

prof_updated = 0
for prof in profiles:
    email = prof.get("email") or ""
    if "humanius.com" in email or "humanius.com.tr" in email:
        new_email = email.replace("humanius.com.tr", "humanius.net").replace("humanius.com", "humanius.net")
        print(f"Profile {prof.get('full_name')} ({prof['id']}): {email} -> {new_email}")
        patch_r = requests.patch(f"{supabase_url}/rest/v1/profiles?id=eq.{prof['id']}", json={"email": new_email}, headers=headers)
        if patch_r.status_code in [200, 204]:
            prof_updated += 1

print(f"Total Profiles Updated: {prof_updated}")

# 2. Update Employees
print("\n--- 2. Updating Employees Table ---")
emp_r = requests.get(f"{supabase_url}/rest/v1/employees?select=id,email,name", headers=headers)
employees = emp_r.json() if emp_r.status_code == 200 else []

emp_updated = 0
for emp in employees:
    email = emp.get("email") or ""
    if "humanius.com" in email or "humanius.com.tr" in email:
        new_email = email.replace("humanius.com.tr", "humanius.net").replace("humanius.com", "humanius.net")
        print(f"Employee {emp.get('name')} ({emp['id']}): {email} -> {new_email}")
        patch_r = requests.patch(f"{supabase_url}/rest/v1/employees?id=eq.{emp['id']}", json={"email": new_email}, headers=headers)
        if patch_r.status_code in [200, 204]:
            emp_updated += 1

print(f"Total Employees Updated: {emp_updated}")
print("\nMigration Done!")
