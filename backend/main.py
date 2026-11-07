"""
FastAPI backend for the AI Waste Identification & Reuse Recommendation app.

Recognition pipeline (see yolo_service.py and gemini_service.py):

    image -> YOLO -> confidence check -> HIGH: YOLO result
                                      -> LOW:  Gemini Vision (original image)
                                            -> normalized result -> waste info

Endpoints:
  GET  /health              -> server status + whether YOLO/Gemini are usable
  POST /predict              -> accepts an image file, runs the pipeline above,
                                 returns the normalized classification + disposal
                                 guidance (reuse ideas come from /enhance-reuse)
  GET  /waste-info/{class}   -> disposal guidance for an already-known class, no
                                 image needed (used by the app's "Try scanning
                                 these" example objects)
  POST /enhance-reuse        -> AI-generated reuse ideas + YouTube links - the ONLY
                                 source of reuse ideas in the app (no static list).
                                 Called once per scan for the initial "Reuse ideas"
                                 batch, and again (with `exclude`) each time the
                                 user taps "More ideas".

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Then expose it to your phone/Expo app during development with, e.g., ngrok:
    ngrok http 8000
and point the Expo app at the https URL ngrok gives you.
"""

import io
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

import gemini_service
import yolo_service
from config import (
    CORS_ORIGINS,
    GEMINI_API_KEY,
    GEMINI_MAX_IMAGE_EDGE,
    MAX_UPLOAD_BYTES,
    YOLO_CONFIDENCE_THRESHOLD,
)
from llm_service import get_ai_reuse_ideas, get_youtube_link
from waste_data import get_bucket, get_waste_info
from logging_utils import log_event, normalize_correlation_id

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Warm both recognition engines up in the background as the server starts.

    Between them, loading the YOLO weights, running its first inference, and
    importing the Gemini SDK take far longer than any later scan - measured at
    tens of seconds, all of which the first person to scan something would
    otherwise sit through. Doing it here lands that cost while the server is
    booting instead.

    Runs on daemon threads so the server starts serving immediately; a scan
    arriving mid-warm-up simply waits on the same load rather than racing it."""
    for name, warm in (("YOLO", yolo_service.warm_up), ("Gemini", gemini_service.warm_up)):
        threading.Thread(target=_warm_component, args=(name, warm), daemon=True).start()
    yield


def _warm_component(name, warm):
    try:
        log_event(logger, logging.INFO, "startup warm-up started", component=name)
        warm()
        log_event(logger, logging.INFO, "startup warm-up finished", component=name)
    except Exception as err:
        log_event(logger, logging.ERROR, "startup warm-up failed",
                  component=name, error_type=type(err).__name__)


app = FastAPI(title="Waste Identification & Reuse API", lifespan=lifespan)

# Allow the Expo app (and browser testing) to call this API from any origin.
# Fine for a student project demo; tighten this if you ever deploy publicly long-term.
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    """`model_ready` reports the primary detector (YOLO). Gemini is reported
    separately because the app still works without it - it just loses the
    fallback for items YOLO can't identify."""
    result = {
        "status": "ok",
        "model_ready": yolo_service.is_available(),
        "gemini_configured": bool(GEMINI_API_KEY),
    }
    log_event(logger, logging.INFO, "health check completed",
              model_ready=result["model_ready"], gemini_configured=result["gemini_configured"])
    return result


@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    x_request_id: str | None = Header(default=None),
):
    """Identify the item in an uploaded photo.

    YOLO runs first. Its result is used directly when it is both confident
    (>= YOLO_CONFIDENCE_THRESHOLD) and mapped to a waste class we actually know.
    Anything else - a weak detection, a label whose material is ambiguous, no
    detection at all, or YOLO being unavailable - escalates the ORIGINAL image
    to Gemini Vision.

    Both paths return the same shape, so the app's Result screen doesn't need to
    know or care which one answered:

        {predicted_class, confidence, category, disposal,
         bucket, source, material, reusable}
    """
    correlation_id = normalize_correlation_id(x_request_id)
    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        log_event(logger, logging.WARNING, "scan rejected: unsupported content type",
                  correlation_id, content_type=file.content_type)
        raise HTTPException(status_code=400, detail="Please upload a JPEG or PNG image.")

    contents = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(contents) > MAX_UPLOAD_BYTES:
        log_event(logger, logging.WARNING, "scan rejected: image too large",
                  correlation_id, image_bytes=len(contents), max_bytes=MAX_UPLOAD_BYTES)
        raise HTTPException(
            status_code=413,
            detail=f"Images must be {MAX_UPLOAD_BYTES // (1024 * 1024)} MB or smaller.",
        )
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        log_event(logger, logging.WARNING, "scan rejected: unreadable image", correlation_id)
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.")

    log_event(logger, logging.INFO, "scan started", correlation_id,
              content_type=file.content_type, image_bytes=len(contents))
    detection = yolo_service.detect(image)

    # --- Confidence check: the one decision point in the whole pipeline ---
    if detection is None:
        yolo_label, mapped_class, confidence = None, None, 0.0
        reason = "no_detection"
    else:
        yolo_label = detection["yolo_label"]
        mapped_class = detection["predicted_class"]
        confidence = detection["confidence"]
        reason = "unmapped_label" if mapped_class is None else "low_confidence"

    high_confidence = mapped_class is not None and confidence >= YOLO_CONFIDENCE_THRESHOLD

    if high_confidence:
        log_event(logger, logging.INFO, "scan completed", correlation_id,
                  source="yolo", decision="high_confidence", confidence=round(confidence, 2))
        return _result_from_yolo(mapped_class, confidence)

    log_event(logger, logging.INFO, "scan escalating to Gemini", correlation_id,
              decision="low_confidence", reason=reason, confidence=round(confidence, 2))

    gemini_bytes, mime_type = _prepare_for_gemini(image, contents, file.content_type)
    try:
        gemini_result = gemini_service.identify_waste_from_image(gemini_bytes, mime_type)
    except gemini_service.RateLimited:
        # Don't blame the photo for a quota problem - retaking it won't help.
        log_event(logger, logging.WARNING, "scan rate limited by Gemini", correlation_id)
        raise HTTPException(
            status_code=429,
            detail="Too many scans in a row - wait a few seconds and try again.",
        )

    if gemini_result is None:
        # Neither engine could identify the item. Say so plainly - the app shows
        # this message and the user can simply scan again. Never invent a class.
        log_event(logger, logging.INFO, "scan unidentified", correlation_id)
        raise HTTPException(
            status_code=422,
            detail=(
                "Couldn't confidently identify this item. Try again with better "
                "lighting, or move closer so the object fills more of the frame."
            ),
        )

    log_event(logger, logging.INFO, "scan completed", correlation_id,
              source="gemini", bucket=gemini_result["bucket"],
              confidence=round(gemini_result["confidence"], 2))
    return _result_from_gemini(gemini_result)


def _prepare_for_gemini(image: Image.Image, original: bytes, content_type: str) -> tuple[bytes, str]:
    """Return the image bytes to send to Gemini, shrinking oversized photos.

    Phone cameras produce multi-megabyte photos, and uploading those to Google
    is a real part of the wait - especially over a tunnelled connection. Gemini
    downsamples large images internally anyway, so sending a smaller one costs
    nothing in identification quality while noticeably cutting the round trip.

    This still sends the actual photograph, not YOLO's guess - Gemini analyses
    the object itself, which is the point of the fallback. Small images are
    passed through untouched rather than needlessly re-encoded.
    """
    # "image/jpg" is accepted from clients above but isn't a real MIME type,
    # and Gemini rejects it.
    mime_type = "image/jpeg" if content_type == "image/jpg" else content_type

    if max(image.size) <= GEMINI_MAX_IMAGE_EDGE:
        return original, mime_type

    resized = image.copy()
    resized.thumbnail((GEMINI_MAX_IMAGE_EDGE, GEMINI_MAX_IMAGE_EDGE), Image.LANCZOS)
    buffer = io.BytesIO()
    resized.save(buffer, format="JPEG", quality=85)
    shrunk = buffer.getvalue()

    # Re-encoding can actually produce a BIGGER file than the original - an
    # image only slightly over the limit barely shrinks, while our quality-85
    # JPEG may be less compressed than whatever the camera produced. Sending
    # that would be strictly worse, so keep whichever is genuinely smaller.
    if len(shrunk) >= len(original):
        return original, mime_type

    logger.info(
        "resized image for Gemini: %s -> %s (%.0fKB -> %.0fKB)",
        image.size, resized.size, len(original) / 1024, len(shrunk) / 1024,
    )
    return shrunk, "image/jpeg"


def _result_from_yolo(predicted_class: str, confidence: float) -> dict:
    """Normalized result for the high-confidence YOLO path. Disposal guidance
    comes from the app's own reference data, since the class is one we know."""
    info = get_waste_info(predicted_class)
    bucket = get_bucket(predicted_class)

    return {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "category": info["category"],
        "disposal": info["disposal"],
        "bucket": bucket,
        "source": "yolo",
        # For the app's own waste classes the class name *is* the material.
        "material": predicted_class,
        "reusable": bucket == "reuse",
    }


def _result_from_gemini(gemini_result: dict) -> dict:
    """Normalized result for the Gemini fallback path. Gemini supplies the
    disposal guidance itself, because this path exists precisely for items that
    aren't in waste_data.WASTE_INFO and so have nothing to look up."""
    return {
        "predicted_class": gemini_result["object"],
        "confidence": round(gemini_result["confidence"], 4),
        "category": gemini_result["category"],
        "disposal": gemini_result["disposal"],
        "bucket": gemini_result["bucket"],
        "source": "gemini",
        "material": gemini_result["material"],
        "reusable": gemini_result["reusable"],
    }


@app.get("/waste-info/{predicted_class}")
def waste_info(predicted_class: str):
    """Category + disposal info for an already-known material class, without
    running recognition on an image. Used by the app's "Try scanning these"
    example objects: since the class is already known (that's the point of
    an example), this calls the exact same get_waste_info() lookup the
    high-confidence path uses, so clicking "Glass bottle" returns identical
    disposal guidance to what a real scan of a glass bottle would produce -
    just without a confidence score, since nothing was actually classified. The
    app fetches reuse ideas for this separately via /enhance-reuse, same as any
    real scan."""
    info = get_waste_info(predicted_class)
    return {
        "predicted_class": predicted_class,
        "category": info["category"],
        "disposal": info["disposal"],
        "bucket": get_bucket(predicted_class),
    }


class EnhanceReuseRequest(BaseModel):
    predicted_class: str
    category: str
    exclude: list[str] = []  # ideas already shown - ask the model to avoid repeating these


@app.post("/enhance-reuse")
def enhance_reuse(
    payload: EnhanceReuseRequest,
    x_request_id: str | None = Header(default=None),
):
    """The app's only source of reuse ideas: 3 LLM-generated ideas per call,
    each paired with a real YouTube tutorial link where one is found. Called
    once for the initial "Reuse ideas" batch, and again (with `exclude` set
    to everything already shown) each time the user taps "More ideas" -
    there's no separate static list this falls back to.

    Works for any label, including free-text ones Gemini produced for items
    outside the app's fixed class list - the class and category are only ever
    used as prompt text.

    Ideas that found a matching video are returned first, so the user sees the
    ones they can actually watch a tutorial for before the text-only ones.

    Allowed to fail quietly - if the AI/YouTube services are down or the API
    keys aren't configured, this returns an empty list with a 200 rather than
    a 500; the app shows a clean empty/error state instead of a crash."""
    correlation_id = normalize_correlation_id(x_request_id)
    log_event(logger, logging.INFO, "reuse ideas requested", correlation_id,
              excluded_count=len(payload.exclude))
    try:
        ideas = get_ai_reuse_ideas(payload.predicted_class, payload.category, exclude=payload.exclude)

        # Exact-match safety net on top of the prompt's own exclude instruction -
        # an LLM can still occasionally echo one back despite being asked not to.
        already_shown = {idea.strip().lower() for idea in payload.exclude}
        ideas = [idea for idea in ideas if idea.strip().lower() not in already_shown]
        if not ideas:
            log_event(logger, logging.INFO, "reuse ideas unavailable", correlation_id)
            return {"ai_ideas": []}

        # One YouTube search per idea, run together rather than one after
        # another - they're independent network calls, so doing them in
        # sequence made this endpoint roughly 3x slower than it needed to be.
        with ThreadPoolExecutor(max_workers=len(ideas)) as pool:
            videos = list(pool.map(lambda idea: get_youtube_link(f"{idea} DIY tutorial"), ideas))

        ai_ideas = [{"idea": idea, "video": video} for idea, video in zip(ideas, videos)]

        # Ideas with a video first, keeping the model's original order within
        # each group (sorted() is stable, so this only moves the video-less
        # ones to the back).
        ai_ideas.sort(key=lambda item: item["video"] is None)

        log_event(logger, logging.INFO, "reuse ideas completed", correlation_id,
                  idea_count=len(ai_ideas))
        return {"ai_ideas": ai_ideas}
    except Exception as err:
        log_event(logger, logging.ERROR, "reuse ideas failed", correlation_id,
                  error_type=type(err).__name__)
        return {"ai_ideas": []}
