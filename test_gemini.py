Иimport os
import requests
import base64
import json
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_key = os.environ.get("GEMINI_API_KEY")

prompt = """Analyze this shipping label and extract the following in JSON format:
{
    "client_code": "Client code if visible (e.g. C47, ZOIREHOH, etc)",
    "track_code": "Tracking number (e.g. JT..., YT..., or 12-20 digits)",
    "description": "Product description and quantity if visible",
    "full_text": "All raw text found on the label"
}
Return ONLY valid JSON without Markdown formatting."""

# We don't have an image, let's just make sure the API call format works
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"

payload = {
    "contents": [{
        "parts": [
            {"text": prompt}
        ]
    }],
    "generationConfig": {
        "response_mime_type": "application/json",
    }
}

try:
    resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
    print(resp.status_code)
    print(resp.text)
except Exception as e:
    print(e)
