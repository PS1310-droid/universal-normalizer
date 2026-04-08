import hashlib

my_raw_key = "sk_test_123"
real_hash = hashlib.sha256(my_raw_key.encode()).hexdigest()

print(f"Your Raw Key to give the user: {my_raw_key}")
print(f"The REAL Hash to put in Neon: {real_hash}")
