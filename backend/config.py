"""
Central configuration for the recognition pipeline.

Everything tunable about *how an item gets identified* lives here and nowhere
else - in particular YOLO_CONFIDENCE_THRESHOLD, which must have exactly one
definition so it can be changed in one place (or via the environment) without
hunting through the code for copies of the number.

Secrets (API keys) are read from the environment / backend/.env only - they are
never hardcoded here, never returned in an API response, and never logged.
See .env.example for the variable names.
"""

import os

from dotenv import load_dotenv

load_dotenv()

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

# Keep the current permissive behavior by default for Expo web and native
# clients, while allowing a deployed web origin list to be configured.
CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]

# --- YOLO (primary detector) ------------------------------------------------

# Path to the YOLO weights. Defaults to the lightweight COCO-pretrained yolov8n,
# which must be present at this path in the container image.
#
# TO PLUG IN A CUSTOM WASTE-TRAINED MODEL LATER: point this at your own .pt file
# (e.g. YOLO_MODEL_PATH=/path/to/waste_yolo_best.pt in backend/.env) and update
# YOLO_CLASS_MAP in yolo_service.py to map that model's class names onto the
# app's waste classes. Nothing else in the codebase needs to change.
YOLO_MODEL_PATH = os.environ.get("YOLO_MODEL_PATH") or os.path.join(MODEL_DIR, "yolov8n.pt")

# Minimum DETECTION CONFIDENCE (the model's per-object class score, 0.0-1.0) for
# a YOLO result to be trusted on its own. At or above this, the YOLO answer is
# used as-is; below it, the image is escalated to Gemini Vision.
#
# NOTE: this is deliberately NOT the IoU / NMS threshold, which is a different
# knob controlling how overlapping boxes get merged. That one is left at
# ultralytics' default - changing this value does not affect it.
YOLO_CONFIDENCE_THRESHOLD = float(os.environ.get("YOLO_CONFIDENCE_THRESHOLD", "0.70"))

# Raw floor for what YOLO even bothers reporting back. Kept well below the
# decision threshold on purpose: weak detections are still worth returning so
# they can be logged ("saw a bottle at 0.42, escalating") before being sent to
# Gemini. Raising this to YOLO_CONFIDENCE_THRESHOLD would make every
# low-confidence scan look like "nothing detected" in the logs.
YOLO_MIN_DETECTION_CONF = 0.10

# --- Gemini Vision (low-confidence fallback) --------------------------------

# Stays server-side. The mobile app never sees or sends this key: the image goes
# Expo -> FastAPI -> Gemini, and only the finished classification comes back.
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Same convention as GROQ_MODEL in llm_service.py: one named constant, easy to
# bump when Google retires a model. Needs to be a vision-capable model.
#
# Verified working against the live API on 2026-09-15. Measured ~1.7s per scan
# vs ~2.6s for the full gemini-3.5-flash, and it identified every test image
# correctly - so "lite" is the better default for a scanner someone is standing
# there waiting on. Swap to "gemini-3.5-flash" (set GEMINI_MODEL in .env) if you
# hit items it gets wrong; it's the more capable model.
#
# Free-tier quota is counted PER MODEL PER DAY, so switching models also gets
# you a fresh daily allowance - useful if you exhaust one before a demo.
#
# Note gemini-2.5-flash still appears in models.list() but 404s on real requests
# - it's retired. If this one starts 404ing too, list what's current with:
#   python -c "from google import genai; from config import GEMINI_API_KEY; \
#              print([m.name for m in genai.Client(api_key=GEMINI_API_KEY).models.list()])"
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")

# Someone is standing there holding a phone waiting for this, so the budget is
# set by their patience rather than by how long Gemini might eventually take.
# A scan that hasn't answered in this long has effectively failed already -
# better to say so and let them retake it than to keep them staring at a spinner.
GEMINI_TIMEOUT_SECONDS = 12

# Photos larger than this on their longest edge are shrunk before being sent to
# Gemini. A phone camera photo can be several megabytes, and uploading that is a
# real part of the wait; Gemini downsamples large images internally anyway, so
# this trims the round trip without costing identification quality.
GEMINI_MAX_IMAGE_EDGE = 1024
