"""
AI-generated reuse/upcycling ideas from an LLM (Groq), each optionally
paired with a matching real YouTube tutorial link. This is the ONLY source
of reuse ideas in the app - there is no static fallback list - so both
functions are defensive by design: if an API key is missing, the network is
down, or a response is malformed, they return an empty/None result instead
of raising, so a flaky AI/YouTube call can never crash the request. The
caller (main.py) is responsible for showing a clean empty state when that
happens, rather than fabricating content.

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


def get_ai_reuse_ideas(predicted_class: str, category: str, exclude: list[str] | None = None) -> list[str]:
    """Ask Groq for 3 creative, specific, practical reuse/upcycling ideas for
    a used item of the given material class. Returns [] on any failure
    (missing key, network error, bad/unparseable response) - never raises.

    `exclude` is the list of ideas already shown to the user for this item
    (from the initial batch and/or earlier "more ideas" requests) - passed
    back to the model so repeat requests generate genuinely new suggestions
    instead of reshuffling the same ones. Best-effort only (an LLM can still
    produce something close to an excluded idea); main.py does an exact-match
    dedup on top of this as a safety net."""
    if not GROQ_API_KEY:
        return []

    exclude_clause = ""
    if exclude:
        already_shown = "\n".join(f"- {idea}" for idea in exclude[:15])
        exclude_clause = (
            "\n\nThe user has already seen these ideas - do NOT repeat them or suggest "
            f"anything very similar:\n{already_shown}\n"
        )

    prompt = (
        f"A user has a used item made of '{predicted_class}' "
        f"(waste category: '{category}'). Suggest exactly 3 creative, specific, "
        "practical reuse or upcycling ideas for this item before it becomes waste. "
        "Each idea should be a single concrete sentence a person could actually do at home."
        f"{exclude_clause}\n\n"
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
    {"video_id", "title", "url", "thumbnail_url"}, or None if there are no
    results or the request fails for any reason - never raises.

    The thumbnail is built from YouTube's standard i.ytimg.com/img.youtube.com
    URL pattern using the real video_id from the search result, rather than
    the (lower-res) thumbnail URL embedded in the search response - always a
    genuine thumbnail for a real, valid video, never a fabricated one."""
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
            "video_id": video_id,
            "title": snippet["title"],
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        }
    except Exception:
        return None
