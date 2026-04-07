from fastapi import FastAPI, Request, HTTPException, Header
from typing import Optional
from fastapi.security import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
import json
from google import genai
from google.genai import types
from openai import OpenAI
from anthropic import Anthropic
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


def steamroller(nested_dict, parent_key="", sep="_"):
    flat_dict = {}

    for key, value in nested_dict.items():
        # create the new glued key (eg cust + _ + name)
        new_key = f"{parent_key}{sep}{key}" if parent_key else key

        if isinstance(value, dict):
            # if its a dict (folder), call the steamroller on it (recursion)
            flat_dict.update(steamroller(value, new_key, sep=sep))

        elif isinstance(value, list):
            # if its a list (array), loop thru the items and number them
            for index, item in enumerate(value):
                list_key = f"{new_key}{sep}{index}"

                if isinstance(item, dict):
                    # if the list contains folders, steamroll it
                    flat_dict.update(steamroller(item, list_key, sep=sep))
                else:
                    # if its a regular item, save it
                    flat_dict[list_key] = item
        else:
            # if its a normal value, savit it to the dict
            flat_dict[new_key] = value
    return flat_dict


# keeps track of how many times an IP has used the free tier
ip_tracker = {}

VALID_LICENSES = ["sync-pro-launch-2026", "dev-test-key"]


def call_claude(prompt, custom_key):
    # Setup the Anthropic connection
    client = Anthropic(api_key=custom_key)

    # Call the model
    response = client.messages.create(
        model="claude-haiku-4.5",
        max_tokens=1000,
        system="You are an experienced and logical data assistant. Output strictly valid JSON.",
        messages=[{"role": "user", "content": prompt}],
    )
    # Extract the string and convert to Python dictionary
    return json.loads(response.content[0].text)


def call_openai(prompt, custom_key):
    # Setup the OpenAI connection
    client = OpenAI(api_key=custom_key)

    # Call the model and force JSON output
    response = client.chat.completions.create(
        model="gpt-5.4-nano",
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": "You are an experienced and logical data assistant. Output strictly valid JSON.",
            },
            {"role": "user", "content": prompt},
        ],
    )
    # Extract the string and convert to Python dictionary
    return json.loads(response.choices[0].message.content)


def call_gemini(prompt, custom_key):
    client = genai.Client(api_key=custom_key)

    # Call the AI and force to return JSON
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
        ),
    )

    # Covert AI text back into python dict
    return json.loads(response.text)


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

    if custom_key and custom_key.startswith("sk-ant-"):
        return call_claude(prompt=prompt, custom_key=custom_key)
    elif custom_key and custom_key.startswith("sk-"):
        return call_openai(prompt=prompt, custom_key=custom_key)
    else:
        return call_gemini(prompt=prompt, custom_key=custom_key)


# Creates the receptionist that listens for package
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Crreates blueprint for the lock
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


# Defines the desk location (endpoint) and the method GET
@app.get("/health")
def generic_func():
    # The package receptionist hands back
    return {"status": "The Normalizer is awake"}


@app.get("/templates")
def list_templates():
    # open the file and read json
    with open("templates.json", "r") as file:
        all_templates = json.load(file)

    # create a clean summary for the user
    menu = {}
    for name, details in all_templates.items():
        # tell version and how many fields are in it
        menu[name] = {
            "version": details["version"],
            "field_count": len(details["fields"]),
        }

    return {"available_templates": menu}


@app.post("/normalize/auto")
# Defines the desk location (endpoint) and the method POST
def clean_my_data(
    payload: dict,
    request: Request,
    x_schemasync_license: Optional[str] = Header(None),
    x_llm_key: Optional[str] = Header(None),
):
    # Expect a JSON package and call it 'payload', 'request' here hands raw data, look for x_schemasync_license and x_llm_key. they are Optional, and if the user doesn't provide them, just default to None instead of crashing
    # security: check if they are paying users
    is_pro = x_schemasync_license in VALID_LICENSES

    # Check if this is coming from the website demo
    is_playground = payload.get("is_playground", False)

    # 1. SECURITY: Prevent massive payload attacks (The 3 Tiers)
    messy_data = payload.get("messy_data", {})
    payload_str = str(messy_data)

    if is_playground:
        size_limit = 300  # Super strict for the landing page demo
    elif is_pro:
        size_limit = 5000
    else:
        size_limit = 500  # Free API Tier

    if len(payload_str) > size_limit:
        raise HTTPException(
            status_code=413,
            detail=f"Payload too large. Max {size_limit} characters.",
        )

    # 2. QUOTA: Track IP limits for free/playground users
    user_ip = request.client.host
    if not is_pro:
        if user_ip not in ip_tracker:
            ip_tracker[user_ip] = 0  # add user start at 0

        # Playground and Free API gets 20 calls
        max_calls = 20

        # If they hit the limit, reject them.
        if ip_tracker[user_ip] >= max_calls:
            raise HTTPException(
                status_code=429,
                detail=f"Limit of {max_calls} calls reached. Purchase a license or provide an LLM key.",
            )
        else:
            ip_tracker[user_ip] += 1

    # extract whatever sent
    template_name = payload.get("template_name")
    master_keys = payload.get("master_keys")

    # Check if they forgot the messy_data entirely
    if not messy_data:
        raise HTTPException(status_code=400, detail="Missing 'messy_data' in payload.")

    # Template Logic
    if template_name:
        # They want a template open our menu the json.
        with open("templates.json", "r") as file:
            all_templates = json.load(file)

        # Does the template they asked for actually exist in menu?
        if template_name in all_templates:
            # Yes,  Go into that specific template, and grab the "fields" list
            master_keys = all_templates[template_name]["fields"]
        else:
            # No, user asked for something we don't have. Reject it.
            raise HTTPException(
                status_code=400, detail=f"Template '{template_name}' not found."
            )

    # If they didn't send a template, check if they sent custom master keys
    elif not master_keys:
        # They didn't send a template AND they didn't send master keys bruhh
        raise HTTPException(
            status_code=400,
            detail="You must provide either a 'template_name' or a list of 'master_keys'.",
        )

    # Pass the data through the Steamroller to handle nested industry standards
    messy_data = steamroller(messy_data)

    audit_trail = []

    # mnaual clean up for exact key matches to reduce rate limiting by sending only complex keys
    free_map, leftover_keys = exact_match_filter(
        master_keys=master_keys, messy_data=messy_data
    )

    # Strict AI Gate: Must have complex keys AND be a Pro User AND have an LLM key
    schema_map = {}
    if len(leftover_keys) > 0 and is_pro and x_llm_key:
        schema_map = ai_mapper(
            master_keys=leftover_keys, messy_data=messy_data, custom_key=x_llm_key
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
