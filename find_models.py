from google import genai

# Paste your actual Gemini API key here
client = genai.Client(api_key="AIzaSyAqu4CtSzJ6OJ2H5ko3Kdvk-XgCDuWA_nE")

print("Fetching available models...")

# Loop through and print the official API name for every model
for model in client.models.list():
    # We only want to print models that contain 'flash-lite' to keep the list clean
    if "flash-lite" in model.name:
        print(f"API String: {model.name}")
