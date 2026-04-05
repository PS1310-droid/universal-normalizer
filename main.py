from fastapi import FastAPI, Request, HTTPException, Security
from fastapi.security import APIKeyHeader
import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
import re


def exact_match_filter(master_keys, messy_data):
    free_map = {}
    leftover_keys = []

    # Create a dict that maps cleaned keys to original keyss eg {fname: f%*&name}
    cleaned_messy_keys = {}
    for original_key in messy_data.keys():
        # remove everything except letters/numbers and lowercase it
        clean_key = re.sub(r"[^a-zA-Z0-9]", "", original_key).lower()
        cleaned_messy_keys[clean_key] = original_key

    # check each master key against cleaned messy keys
    for m_key in master_keys:
        clean_m_key = re.sub(r"[^a-zA-Z0-9]", "", m_key).lower()

        if clean_m_key in cleaned_messy_keys:
            # match, save the original messy key in the value section
            free_map[m_key] = cleaned_messy_keys[clean_m_key]
        else:
            # no match, add to leftover and will send to AI
            leftover_keys.append(m_key)

    return free_map, leftover_keys


# keeps track of how many times an IP has used the free tier
ip_tracker = {}

# Load the API key
load_dotenv()


def ai_mapper(master_keys, messy_data, custom_key=None):
    # prompt to send to the ai model
    prompt = f"""You are a senior database engineer building a schema translation map. 
    Your Task: You will be provided with a list of master keys and a JSON object of messy data. 
    You must analyse the semantic meaning of each master key and find the exact corresponding key name within the messy data.
    
    Rules:
    1. Do NOT extract the data values. You must map the Key Names only.
    2. If a master key has no logical match, map the match to null and confidence to 0.
    3. Assign a confidence score from 0 to 100 based on how sure you are that the semantic meanings are identical. This will be an integer value
    4. Output strictly valid JSON. No markdown block formatting, no explanations.
    
    EXPECTED OUTPUT FORMAT:
    {{
      "Master_Key_Example": {{
        "match": "messy_key_name",
        "confidence": 95
      }}
    }}
    
    MASTER KEYS: {master_keys}
    MESSY DATA: {messy_data}
    """
    if custom_key:
        genai.configure(api_key=custom_key)
    else:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

    # Select the model
    model = genai.GenerativeModel("gemini-2.5-flash")

    # Call the AI and force to return JSON
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json"),
    )

    # Covert AI text back into python dict
    return json.loads(response.text)


# Creates the receptionist that listens for package
app = FastAPI()
# Crreates blueprint for the lock
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# Defines the desk location (endpoint) and the method GET
@app.get("/health")
def generic_func():
    # The package receptionist hands back
    return {"status": "The Normalizer is awake"}


@app.post("/normalize/auto")
# Defines the desk location (endpoint) and the method POST
def clean_my_data(
    payload: dict, request: Request, user_custom_key: str = Security(api_key_header)
):  # Expect a JSON package and call it 'payload', 'request' here hands raw data
    # Get users ip
    user_ip = request.client.host

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

    audit_trail = []

    # mnaual clean up for exact key matches to reduce rate limiting by sending only complex keys
    free_map, leftover_keys = exact_match_filter(
        master_keys=master_keys, messy_data=messy_data
    )

    # Only Call AI and pass it master keys and messy data if there are complex keys left
    schema_map = {}
    if len(leftover_keys) > 0:
        schema_map = ai_mapper(
            master_keys=leftover_keys, messy_data=messy_data, custom_key=user_custom_key
        )

    # Create TWO buckets to return instead of one
    auto_mapped = {}
    needs_review = {}

    if free_map is not None:
        # process free matches
        for m_key, messy_key in free_map.items():
            # go get actual data from payload
            actual_value = messy_data.get(messy_key)
            # add to auto map buket
            auto_mapped[m_key] = actual_value
            # Log the free match
            audit_trail.append(
                f"Exact Match: Mapped '{m_key}' deterministically to '{messy_key}'."
            )

    for target_key, mapping_details in schema_map.items():
        # Look inside mapping details and grab confidence and match key values
        confidence = mapping_details.get("confidence")
        match = mapping_details.get("match")

        # Go to the actual data from the messy payload
        if match is not None:
            actual_value = messy_data.get(match)
        else:
            actual_value = None

        # If confidence is > 85 and match is not null
        if confidence >= 85 and match is not None:
            # passed, put it in clean bucket
            auto_mapped[target_key] = actual_value
            message = f"Auto Mapper matched the data {target_key}  to {match} at {confidence}% confidence"
            audit_trail.append(message)
        else:
            # failed, put in review bucket with meta data for preview
            needs_review[target_key] = {
                "suggested_match": match,
                "suggested_value": actual_value,
                "confidence_score": confidence,
            }

            message = f"Auto Mapper flagged the data {target_key} for review due to low confidence of {confidence}%"
            audit_trail.append(message)

    return {
        "message": "Data normalized using auto mapper.",
        "ready_to_use": auto_mapped,
        "flagged_for_review": needs_review,
        "audit_log": audit_trail,
    }


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

    return {"message": "Data mapped.", "clean_data": clean_data}
