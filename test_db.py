import requests

# 1.  create a fake string that is 600 characters long to test the Pro size limit
giant_string = "x" * 600

url = "http://127.0.0.1:8000/normalize/auto"

# 2.  send the RAW dummy key.
# Our Python backend will hash this into '00445d43a...' and look for it in Neon
headers = {"x-schemasync-license": "sk_test_123"}

payload = {"master_keys": ["test_field"], "messy_data": {"messy_key": giant_string}}

print("Sending request to your local API...")
response = requests.post(url, headers=headers, json=payload)

print(f"Status Code: {response.status_code}")
if response.status_code == 200:
    print(
        "SUCCESS! The database verified the key, upgraded you to Pro, and accepted the 600-character payload."
    )
else:
    print(f"FAILED: {response.json()}")
