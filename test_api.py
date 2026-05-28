import json
import requests

# =====================================================================
# 1. MOCK DEVELOPER DATA (THE DATA PROBLEM)
# =====================================================================
# This simulates a deeply nested, messy JSON payload that a developer
# needs to normalize into a standardized structure.
complex_messy_json = {
    "customer_info": {
        "f_name": "Bruce",
        "l_name": "Wayne",
        "contact_details": {
            "email_addresses": ["bruce@waynetech.com", "batman@gotham.gov"],
            "primary_phone": "555-0199",
        },
    },
    "order_history": [
        {
            "order_id": "ORD-001",
            "total_amount": 1500.50,
            "shipping_addr": {"city_name": "Gotham", "zip": "10001"},
        },
        {
            "order_id": "ORD-002",
            "total_amount": 45.00,
            "shipping_addr": {"city_name": "Metropolis", "zip": "90001"},
        },
    ],
    "account_status": "VIP",
}

# =====================================================================
# 2. API CONFIGURATION & CREDENTIALS
# =====================================================================
# Live Google Cloud Run Serverless Backend URL
BASE_URL = "https://schemasync-api-192386894570.us-central1.run.app"

# Authenticated Pro headers containing the Lemon Squeezy verified License Key
pro_headers = {
    "Content-Type": "application/json",
    "x-schemasync-license": "8F3AF9A4-9A57-4978-8030-06D8424A3A26",
    "x-llm-key": "AIzaSyAqu4CtSzJ6OJ2H5ko3Kdvk-XgCDuWA_nE",
}


# =====================================================================
# FEATURE TEST 1: Custom Master Key Mapping
# =====================================================================
print("\n" + "=" * 60)
print(" RUNNING TEST 1: CUSTOM MASTER KEY MAPPING")
print("=" * 60)
print("Sending messy payload and asking API to extract specific fields...")

custom_payload = {
    "master_keys": [
        "FirstName",
        "PrimaryEmail",
        "FirstOrderCity",
        "SecondOrderTotal",
        "Status",
    ],
    "messy_data": complex_messy_json,
}

# Execute the programmatic POST request
response_one = requests.post(
    f"{BASE_URL}/normalize/auto", headers=pro_headers, json=custom_payload
)

print(f"Server Status Code: {response_one.status_code}")
print("Normalized API Output:")
# json.dumps with indent=4 makes the terminal output look beautiful and readable
print(json.dumps(response_one.json(), indent=4))


# =====================================================================
# FEATURE TEST 2: Pre-Built Engine Mapping (With Shopify Template)
# =====================================================================
print("\n" + "=" * 60)
print(" RUNNING TEST 2: TEMPLATE ENGINE MAPPING (SHOPIFY)")
print("=" * 60)
print("Sending messy payload and forcing alignment to standard Shopify schemas...")

template_payload = {
    "template_name": "shopify_customer",
    "messy_data": complex_messy_json,
}

response_two = requests.post(
    f"{BASE_URL}/normalize/auto", headers=pro_headers, json=template_payload
)

print(f"Server Status Code: {response_two.status_code}")
print("Aligned Template Output:")
print(json.dumps(response_two.json(), indent=4))
print("\n" + "=" * 60)
print(" END OF DEMONSTRATION")
print("=" * 60 + "\n")
