import urllib.request
import json

SUPABASE_URL = "https://gfbtjdedaoleqhrlebof.supabase.co"
ANON_KEY = "sb_publishable_wxlAHN7E63-NbwFiVhJBeA_F3PYc3w-"

def supabase_get(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers={
        "apikey": ANON_KEY,
        "Authorization": f"Bearer {ANON_KEY}"
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"GET {endpoint} error: {e}")
        return []

def main():
    print("--- 1. Checking Profiles ---")
    profiles = supabase_get("profiles?select=id,email,full_name")
    print(f"Total profiles fetched: {len(profiles)}")
    for p in profiles:
        print(p)

    print("\n--- 2. Checking Employees ---")
    employees = supabase_get("employees?select=id,email,name")
    print(f"Total employees fetched: {len(employees)}")
    for e in employees:
        print(e)

if __name__ == "__main__":
    main()
