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

def safe_req(method, url, **kwargs):
    for attempt in range(5):
        try:
            r = session.request(method, url, **kwargs)
            return r
        except Exception as e:
            time.sleep(1)
    raise Exception(f"Failed request to {url}")

auth_url = f"{supabase_url}/auth/v1/token?grant_type=password"
r = safe_req('POST', auth_url, json={"email": "dilekyilmaz@humanius.com", "password": "987654"}, headers={"apikey": supabase_key, "Content-Type": "application/json"})
access_token = r.json()["access_token"]
headers = {"apikey": supabase_key, "Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

# Fetch all Toyota employees
emp_res = safe_req('GET', f"{supabase_url}/rest/v1/employees?select=id,name,email,department,position,created_at", headers=headers)
employees = emp_res.json()

print(f"Total employees currently in table: {len(employees)}")

from collections import defaultdict
grouped = defaultdict(list)
for e in employees:
    grouped[(e.get('name') or '').strip()].append(e)

print(f"Unique employee names count: {len(grouped)}")

to_delete = []

for name, rows in grouped.items():
    if len(rows) > 1:
        print(f"\nDuplicate found for '{name}' ({len(rows)} records):")
        for r_item in rows:
            print(f"  ID: {r_item['id']} | Email: {r_item['email']} | Pos: {r_item['position']} | Dept: {r_item['department']} | Created: {r_item['created_at']}")

        generic_rows = [r_item for r_item in rows if r_item.get('position') == 'Personel' and r_item.get('department') == 'Genel']
        detailed_rows = [r_item for r_item in rows if r_item not in generic_rows]

        if not detailed_rows:
            rows_by_date = sorted(rows, key=lambda x: x.get('created_at') or '')
            detailed_rows = [rows_by_date[0]]
            generic_rows = rows_by_date[1:]

        for g in generic_rows:
            to_delete.append(g['id'])
            print(f"   => MARKED FOR DELETION: {g['id']} ({g['name']})")

        for d in detailed_rows:
            d_email = d.get('email') or ''
            if 'humanius.com' in d_email or 'humanius.com.tr' in d_email:
                new_e = d_email.replace('humanius.com.tr', 'humanius.net').replace('humanius.com', 'humanius.net')
                safe_req('PATCH', f"{supabase_url}/rest/v1/employees?id=eq.{d['id']}", headers=headers, json={"email": new_e})
                print(f"   => UPDATED EMAIL for original detailed row: {d['id']} -> {new_e}")

print(f"\nTotal duplicate employee records marked for deletion: {len(to_delete)}")

# Delete duplicates
for del_id in to_delete:
    del_r = safe_req('DELETE', f"{supabase_url}/rest/v1/employees?id=eq.{del_id}", headers=headers)
    print(f"Deleted duplicate employee ID {del_id}: Status {del_r.status_code}")

# Final check
final_res = safe_req('GET', f"{supabase_url}/rest/v1/employees?select=id,name,email,department,position", headers=headers)
final_employees = final_res.json()
print(f"\nFINAL CLEAN EMPLOYEE COUNT: {len(final_employees)}")
