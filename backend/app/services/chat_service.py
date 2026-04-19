import json
import re

import google.generativeai as genai
import spacy

from app.core.config import settings

nlp = spacy.blank("en")


def local_parse(message: str) -> dict:
    lower = message.lower()
    preference = "best"
    if "cheap" in lower:
        preference = "cheapest"
    elif "fast" in lower:
        preference = "fastest"
    avoid_modes = [mode for mode in ["metro", "auto", "bike", "car", "bus"] if f"avoid {mode}" in lower]
    match = re.search(r"from (.+?) to (.+?)(?:$| avoiding| with| prefer)", lower)
    source, destination = (None, None)
    if match:
        source, destination = match.group(1).strip(), match.group(2).strip()
    return {
        "source": source,
        "destination": destination,
        "preference": preference,
        "avoid_modes": avoid_modes,
    }


async def parse_chat(message: str) -> dict:
    if not settings.gemini_api_key:
        return local_parse(message)
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = (
            "Extract commute intent in JSON with keys source,destination,preference,avoid_modes.\n"
            f"Text: {message}"
        )
        response = model.generate_content(prompt)
        parsed = json.loads(response.text)
        return {
            "source": parsed.get("source"),
            "destination": parsed.get("destination"),
            "preference": parsed.get("preference", "best"),
            "avoid_modes": parsed.get("avoid_modes", []),
        }
    except Exception:
        return local_parse(message)
