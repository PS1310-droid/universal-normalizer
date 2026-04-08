import requests

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


BASE_URL = "http://127.0.0.1:8000"

free_headers = {"Content-Type": "application/json", "x-client-id": "my_test_script"}
pro_headers = {
    "Content-Type": "application/json",
    "x-schemasync-license": "sk_test_123",
    "x-llm-key": "AIzaSyAqu4CtSzJ6OJ2H5ko3Kdvk-XgCDuWA_nE",
}


payload = {
    "master_keys": [
        "FirstName",
        "PrimaryEmail",
        "FirstOrderCity",
        "SecondOrderTotal",
        "Status",
    ],
    "messy_data": complex_messy_json,
}


# ... (Keep your complex_messy_json and pro_headers exactly the same) ...

print("--- TEST 3: The Template Engine (Shopify) ---")
print(
    "Sending the complex payload and asking the API to map it to Shopify's standard..."
)

#  sending 'template_name' INSTEAD of 'master_keys'
template_payload = {
    "template_name": "shopify_customer",
    "messy_data": complex_messy_json,
}

response = requests.post(
    f"{BASE_URL}/normalize/auto", headers=pro_headers, json=template_payload
)

print(f"Status Code: {response.status_code}")
data = response.json()

#  cleanly print what it mapped and what it flagged
print("\n✅ MAPPED TO SHOPIFY:")
for key, value in data.get("ready_to_use", {}).items():
    print(f"  {key}: {value}")

print(
    "\n FLAGGED FOR REVIEW (Shopify has 24 keys, so many will be flagged as missing!):"
)
for key in data.get("flagged_for_review", {}).keys():
    print(f"  {key} (Missing from messy data)")


# response = requests.post(
#     f"{BASE_URL}/normalize/auto", headers=pro_headers, json=payload
# )

# print("Status Code:", response.status_code)
# print("API Response:", response.json())
