"""
Gemini Vision - the FALLBACK recognition step.

Called only when YOLO can't confidently identify an item (low confidence, a
label it can't map to a material, or no detection at all). It receives the
ORIGINAL captured image, not YOLO's guess, so it analyses the object itself
rather than inheriting a bad label.

Unlike YOLO, this path also produces the waste information directly - material,
category, disposal instructions - because the whole point of the fallback is
handling items that aren't in the app's fixed class list, which by definition
have no entry in waste_data.WASTE_INFO to look up.

Defensive in the same way as llm_service.py: a missing key, timeout, rate limit
or malformed response returns None instead of raising, so a flaky API call can
never crash a scan. The caller turns None into a clean "couldn't identify this"
response - never a fabricated classification.

The API key stays here on the backend. The mobile app never holds it: the image
goes Expo -> FastAPI -> Gemini and only the finished result comes back.

Requires GEMINI_API_KEY in the environment (see .env.example).
"""

import json
import logging
import re
import threading
import time

from config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)

# The SDK logs a long "don't use automatic function calling this way" notice on
# every generate_content call. We don't use function calling at all, so it's
# noise that would bury the per-scan decision lines in the server log.
logging.getLogger("google_genai.models").setLevel(logging.ERROR)

# The five buckets the app's UI knows how to render (colour + icon per bucket).
# Gemini is constrained to these so an item it has never seen still lands in a
# bucket the Result screen can display correctly.
VALID_BUCKETS = ("recyclable", "compostable", "hazardous", "reuse", "general")


class RateLimited(Exception):
    """Gemini refused because the API quota/rate limit is exhausted.

    Kept distinct from "couldn't identify this" because it needs a different
    message: nothing is wrong with the photo, and retaking it won't help -
    the user just has to wait a moment. Gemini's free tier allows only a few
    requests per minute, which a burst of scans hits easily."""

PROMPT = f"""You are helping a waste-sorting app identify a single item from a photo.

Look at the image and identify the main object in it. Then respond with ONLY a
JSON object (no markdown, no code fences, no explanation) with exactly these keys:

{{
  "identified": true or false,
  "object": "short name of the item, e.g. 'TV remote control'",
  "material": "main material, e.g. 'mixed plastic and electronics'",
  "category": "short waste category description, e.g. 'e-waste' or 'recyclable (check resin code)'",
  "bucket": one of {list(VALID_BUCKETS)},
  "disposal": "1-3 sentences on how to dispose of this correctly and safely",
  "reusable": true or false,
  "confidence": a number between 0 and 1 for how sure you are of the identification
}}

Rules:
- If the image is blank, too blurry, or you genuinely cannot tell what the object
  is, set "identified" to false. Do NOT guess - a wrong answer sends someone's
  waste to the wrong place.
- "bucket" MUST be exactly one of the listed values. Use "hazardous" for
  batteries, chemicals and e-waste; "compostable" for food and garden waste;
  "reuse" for clothes, shoes and items better donated than discarded;
  "general" only when it truly cannot be recycled, composted or reused.
- If several objects are visible, describe the single most prominent one.
- Keep "disposal" practical and specific to the material."""


def identify_waste_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict | None:
    """Ask Gemini Vision to identify the item in `image_bytes` and describe how
    to dispose of it. Returns:

        {"object", "material", "category", "bucket", "disposal",
         "reusable": bool, "confidence": float}

    or None if the key is missing, the call fails, the response can't be parsed,
    or Gemini itself says it could not identify the object. None always means
    "we don't know" - the caller must show that honestly rather than inventing
    a classification.
    """
    if not GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set - cannot run the Gemini fallback")
        return None

    if not image_bytes:
        return None

    try:
        from google.genai import types  # imported here to keep server startup fast

        client = _get_client()
        request = {
            "model": GEMINI_MODEL,
            "contents": [
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                PROMPT,
            ],
            "config": types.GenerateContentConfig(
                http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_SECONDS * 1000),
            ),
        }
        response = _call_with_retry(client, request)
        data = _parse_json_object(response.text)
    except Exception as err:
        # Timeout, network error, blocked response, bad JSON - no answer either
        # way. Rate limiting is flagged separately so the app can explain what
        # actually happened instead of blaming the photo.
        if _is_rate_limit(err):
            logger.warning("Gemini Vision call failed: rate limit / quota exhausted")
            raise RateLimited() from err
        logger.warning("Gemini Vision call failed: %s", type(err).__name__)
        return None

    if not isinstance(data, dict) or not data.get("identified"):
        logger.info("Gemini could not identify the object in the image")
        return None

    return _normalize(data)


_client = None
_client_lock = threading.Lock()


def warm_up():
    """Import the SDK and build the client ahead of the first scan.

    Measured at ~4s combined on a cold process (the google.genai import alone is
    most of it), which the first person to scan something would otherwise wait
    through. Deliberately makes no API call - it costs no quota, it just moves
    the import and setup off the critical path."""
    try:
        _get_client()
        logger.info("Gemini client ready")
    except Exception as err:
        logger.warning("Gemini client could not be prepared: %s", type(err).__name__)


def _get_client():
    """One shared client for the process, instead of a new one per scan.

    Building a client sets up a fresh HTTP connection pool and pays a TLS
    handshake to Google on the next call; reusing it lets scans share a warm,
    already-authenticated connection. Thread-safe because FastAPI runs sync
    endpoints on a thread pool, so two scans can land here at once."""
    global _client
    if _client is None:
        with _client_lock:
            if _client is None:
                from google import genai

                _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


def _is_rate_limit(err: Exception) -> bool:
    """Whether an SDK error is a quota/rate-limit rejection (HTTP 429)."""
    text = str(err)
    return "429" in text or "RESOURCE_EXHAUSTED" in text


def _call_with_retry(client, request: dict, attempts: int = 2):
    """Call Gemini, retrying once on a transient failure.

    Google's flash models genuinely do return 503 "model is currently
    overloaded" under load, and a rate limit (429) behaves the same way: both
    usually succeed a moment later. One quick retry turns most of those into a
    successful scan instead of a "couldn't identify" the user has to redo.
    Anything non-transient (bad key, retired model, blocked content) raises
    immediately - retrying those would just add latency to a certain failure."""
    for attempt in range(attempts):
        try:
            return client.models.generate_content(**request)
        except Exception as err:
            # Retry only failures that come back FAST - a server rejection
            # (429/503/504) costs us almost nothing and often succeeds a moment
            # later. A timeout is different: we already waited the full budget,
            # so retrying would make the person holding the phone wait twice as
            # long for what is usually the same outcome. Fail fast instead.
            if "Timeout" in type(err).__name__ or "DEADLINE_EXCEEDED" in str(err):
                raise
            transient = _is_rate_limit(err) or any(c in str(err) for c in ("503", "504", "UNAVAILABLE"))
            if not transient or attempt == attempts - 1:
                raise
            logger.info("Gemini call was rate-limited/overloaded, retrying once")
            time.sleep(1.5)


def _normalize(data: dict) -> dict | None:
    """Coerce Gemini's JSON into the exact shape/types the rest of the backend
    expects, rejecting anything essential that came back empty."""
    obj = str(data.get("object", "")).strip()
    disposal = str(data.get("disposal", "")).strip()
    if not obj or not disposal:
        return None  # an item with no name or no guidance is not a usable result

    bucket = str(data.get("bucket", "")).strip().lower()
    if bucket not in VALID_BUCKETS:
        bucket = "general"  # model ignored the constraint; fall back to the safe bucket

    try:
        confidence = float(data.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0

    return {
        "object": obj,
        "material": str(data.get("material", "")).strip() or obj,
        "category": str(data.get("category", "")).strip() or bucket,
        "bucket": bucket,
        "disposal": disposal,
        "reusable": bool(data.get("reusable", False)),
        "confidence": max(0.0, min(1.0, confidence)),
    }


def _parse_json_object(content: str):
    """Parse `content` as a JSON object, falling back to extracting the first
    {...} block in case the model wrapped it in prose or code fences.
    (Object-shaped sibling of _parse_json_array in llm_service.py.)"""
    if not content:
        raise ValueError("Empty response from Gemini")

    content = content.strip()
    try:
        return json.loads(content)
    except (json.JSONDecodeError, TypeError):
        pass

    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in Gemini response")
    return json.loads(match.group(0))
