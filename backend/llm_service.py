"""
Optional AI-enhancement layer: creative reuse ideas from an LLM (Groq) plus a
matching real YouTube tutorial link for each idea.

Both functions are defensive by design - if an API key is missing, the
network is down, or a response is malformed, they return an empty/None
result instead of raising, so this layer can never take down the core
predict flow in main.py.

Requires GROQ_API_KEY and YOUTUBE_API_KEY in the environment (see .env.example).
"""

import json
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY")

# OpenAI-compatible endpoint - https://console.groq.com/docs/openai
GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"
# llama-3.3-70b-versatile was retired from Groq's lineup (404s as of testing
# on 2026-09-13) - swap to whatever's current at https://console.groq.com/docs/models
# if this one gets deprecated/renamed too. "openai/gpt-oss-120b" is a larger/
# slower alternative if you want higher-quality ideas at the cost of latency.
GROQ_MODEL = "openai/gpt-oss-20b"

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

REQUEST_TIMEOUT = 10  # seconds


def get_ai_reuse_ideas(predicted_class: str, category: str) -> list[str]:
    """Ask Groq for 3 creative, specific, practical reuse/upcycling ideas for
    a used item of the given material class. Returns [] on any failure
    (missing key, network error, bad/unparseable response) - never raises."""
    if not GROQ_API_KEY:
        return []

    prompt = (
        f"A user has a used item made of '{predicted_class}' "
        f"(waste category: '{category}'). Suggest exactly 3 creative, specific, "
        "practical reuse or upcycling ideas for this item before it becomes waste. "
        "Each idea should be a single concrete sentence a person could actually do at home.\n\n"
        "Respond with ONLY a JSON array of 3 strings, and nothing else - no markdown, "
        "no explanation, no code fences. Example format: "
        '["idea one", "idea two", "idea three"]'
    )

    try:
        response = requests.post(
            GROQ_CHAT_COMPLETIONS_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.8,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()

        ideas = _parse_json_array(content)
        if not isinstance(ideas, list):
            return []

        # Keep only well-formed string ideas, capped at 3.
        return [idea.strip() for idea in ideas if isinstance(idea, str) and idea.strip()][:3]
    except Exception:
        return []


def _parse_json_array(content: str):
    """Try to parse `content` as a JSON array, falling back to extracting the
    first [...] substring in case the model added stray text around it."""
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        pass

    match = re.search(r"\[.*\]", content, re.DOTALL)
    if not match:
        raise ValueError("No JSON array found in model response")
    return json.loads(match.group(0))


def get_youtube_link(query: str) -> dict | None:
    """Search YouTube for `query` and return the top video result as
    {"title", "url", "thumbnail"}, or None if there are no results or the
    request fails for any reason - never raises."""
    if not YOUTUBE_API_KEY:
        return None

    try:
        response = requests.get(
            YOUTUBE_SEARCH_URL,
            params={
                "part": "snippet",
                "type": "video",
                "maxResults": 1,
                "q": query,
                "key": YOUTUBE_API_KEY,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        items = response.json().get("items", [])
        if not items:
            return None

        top = items[0]
        video_id = top["id"]["videoId"]
        snippet = top["snippet"]

        return {
            "title": snippet["title"],
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": snippet["thumbnails"]["default"]["url"],
        }
    except Exception:
        return None
