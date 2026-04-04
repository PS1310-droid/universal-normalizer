from fastapi import FastAPI, Request, HTTPException
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

# keeps track of how many times an IP has used the free tier
ip_tracker = {}

# Load the API key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))


def ai_mapper(master_keys, messy_data):
    # Select the model
    model = genai.GenerativeModel("gemini-2.5-flash")

    # prompt to send to the ai model
    prompt = f"""You are a senior database engineer building a schema translation map. 
    Your Task: You will be provided with a list of master keys and a JSON object of messy data. 
    You must analyse the semantic meaning of each master key and find the exact corresponding key name within the messy data.
    
    Rules:
    1. Do NOT extract the data values. You must map the Key Names only.
    2. If a master key has no logical match, map it to null.
    3. Output strictly valid JSON. No markdown block formatting, no explanations.
    
    MASTER KEYS: {master_keys}
    MESSY DATA: {messy_data}
    """

    # Call the AI and force to return JSON
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json"),
    )

    # Covert AI text back into python dict
    return json.loads(response.text)


# Creates the receptionist that listens for package
app = FastAPI()


# Defines the desk location (endpoint) and the method GET
@app.get("/health")
def generic_func():
    # The package receptionist hands back
    return {"status": "The Normalizer is awake"}


@app.post("/normalize/auto")
# Defines the desk location (endpoint) and the method POST
def clean_my_data(
    payload: dict, request: Request
):  # Expect a JSON package and call it 'payload', 'request' here hands raw data
    # Get users ip
    user_ip = request.client.host
    # Check if they brought their own key in the headers
    user_custom_key = request.headers.get("X-API-Key")

    # If key present skip the tracker
    if user_custom_key is None:
        # no key, check if user data exist in tracker
        if user_ip not in ip_tracker:
            ip_tracker[user_ip] = 0  # add user and start at 0

        # have they used up trail?
        if ip_tracker[user_ip] >= 3:
            raise HTTPException(
                status_code=429,
                detail="Trial without an API key exceeded. Please pass your own API key in the 'X-API-Key' header to continue.",
            )
        else:
            # let them thru but add 1 to their tab
            ip_tracker[user_ip] += 1

    # Extract the 2 pieces
    master_keys = payload.get("master_keys")
    messy_data = payload.get("messy_data")

    # Call AI and pass it master keys and messy data
    schema_map = ai_mapper(master_keys=master_keys, messy_data=messy_data)
    # Create empty dict to store clean data
    clean_data = {}

    for target_key, messy_key in schema_map.items():
        # Look inside messy data and grab actual value
        actual_value = messy_data.get(messy_key)
        # Assign the value to new target key in clean dict
        clean_data[target_key] = actual_value

    return {"message": "Data normalized using auto mapper.", "clean_data": clean_data}


@app.post("/normalize/manual")
# Defines the desk location (endpoint) and the method POST
def clean_my_data_manually(
    payload: dict,
):  # Expect a JSON package and call it 'payload'
    # Extract the 2 pieces
    schema_map = payload.get("schema_map")
    messy_data = payload.get("messy_data")

    # Create empty dict to store clean data
    clean_data = {}

    for target_key, messy_key in schema_map.items():
        # Look inside messy data and grab actual value
        actual_value = messy_data.get(messy_key)
        # Assign the value to new target key in clean dict
        clean_data[target_key] = actual_value

    return {"message": "Data dynamically normalized.", "clean_data": clean_data}
