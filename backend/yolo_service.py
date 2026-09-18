"""
YOLO object detection - the PRIMARY recognition step.

Runs on every scan. Returns the single highest-confidence detection, mapped onto
the app's waste classes where an honest mapping exists. main.py decides what to
do with it (trust it, or escalate the image to Gemini Vision).

Nothing here raises: a missing/corrupt model or a failed inference returns None
so the caller can fall back to Gemini instead of failing the request.

--- ABOUT THE DEFAULT MODEL - PLEASE READ BEFORE TRUSTING ITS OUTPUT ----------

The default weights (yolov8n.pt) are pretrained on COCO, which is a *general
object* dataset - it has no concept of waste material. Of its 80 classes, none
correspond to cardboard, paper, metal, batteries, glass, clothes or shoes, and
the ones that look relevant are materially ambiguous: COCO's "bottle" may be
plastic OR glass, and it cannot tell you which.

So YOLO_CLASS_MAP below deliberately only maps COCO labels whose material is
genuinely unambiguous - food, which is always organic/compostable waste.
Everything else YOLO detects is reported with predicted_class=None, which routes
the image to Gemini Vision (see main.py). That is intentional: it is better to
escalate to a model that can actually judge the material than to return a
confident-looking guess that is wrong half the time.

In practice this means MOST real scans take the Gemini path until a custom
waste-trained YOLO model is plugged in. See config.YOLO_MODEL_PATH for how.
"""

import logging
import threading

from config import YOLO_MIN_DETECTION_CONF, YOLO_MODEL_PATH

logger = logging.getLogger(__name__)

# Maps a model's own class names -> this app's waste classes (the keys of
# waste_data.WASTE_INFO). Labels not listed here are treated as "YOLO saw
# something, but it can't tell us the material" and get escalated to Gemini.
#
# WHEN SWAPPING IN A CUSTOM WASTE-TRAINED MODEL: replace this dict with that
# model's class names. Where its names already match the app's waste classes
# exactly, map them to themselves ("plastic_bottle": "plastic", etc.). Classes
# your model isn't reliable on are best left out - leaving them out routes those
# images to Gemini rather than guessing.
YOLO_CLASS_MAP = {
    # COCO's food classes -> organic/compostable waste. The only group whose
    # material is unambiguous from the label alone: food is food.
    "banana": "biological",
    "apple": "biological",
    "sandwich": "biological",
    "orange": "biological",
    "broccoli": "biological",
    "carrot": "biological",
    "hot dog": "biological",
    "pizza": "biological",
    "donut": "biological",
    "cake": "biological",
    # Deliberately NOT mapped (COCO cannot determine the material):
    #   "bottle"     - plastic or glass?
    #   "cup"        - paper, plastic or ceramic?
    #   "wine glass" - glass, but usually a reusable object rather than waste
    #   "book"       - paper pages, but often a cardboard/cloth cover
    # These reach Gemini instead, which can look at the actual image and tell.
}

_model = None
_load_failed = False
# Guards the load: the startup warm-up runs on a background thread, so without
# this a scan arriving during warm-up would start a second, concurrent load.
_load_lock = threading.Lock()


def _load_model_if_needed():
    """Lazy-load the YOLO weights on first use, so the server still boots (and
    /health still answers) when the model is missing or broken.

    On failure this records the problem and sets a flag instead of raising -
    every subsequent scan then skips straight to the Gemini fallback rather than
    retrying a load that is not going to start working."""
    global _model, _load_failed

    if _model is not None or _load_failed:
        return

    with _load_lock:
        if _model is not None or _load_failed:  # another thread won the race
            return
        try:
            from ultralytics import YOLO  # imported here to keep server startup fast

            _model = YOLO(YOLO_MODEL_PATH)
            logger.info("YOLO model loaded from %s", YOLO_MODEL_PATH)
        except Exception as err:
            _load_failed = True
            logger.warning("YOLO model unavailable (%s) - scans will fall back to Gemini", err)


def warm_up():
    """Load the model AND run one throwaway inference.

    Both are slow the first time (loading the weights, then ultralytics doing
    its one-off setup on the first predict call) - together far slower than any
    later scan. Doing it at startup instead of on the first real scan moves that
    cost off the user's first scan, which is exactly the one they're watching.

    Called on a background thread at startup, so the server starts answering
    immediately and a scan arriving mid-warm-up simply waits on the same lock
    rather than duplicating the work."""
    from PIL import Image

    _load_model_if_needed()
    if _model is None:
        return

    try:
        _model.predict(Image.new("RGB", (640, 640)), conf=YOLO_MIN_DETECTION_CONF, verbose=False)
        logger.info("YOLO warm-up complete - scans will now be fast")
    except Exception as err:
        logger.warning("YOLO warm-up inference failed (%s)", err)


def is_available() -> bool:
    """Whether the YOLO model is loaded and usable. Used by /health; attempts
    the (one-time) load so a fresh server reports the true state."""
    _load_model_if_needed()
    return _model is not None


def detect(image) -> dict | None:
    """Run detection on a PIL image and return the single highest-confidence
    object found:

        {"yolo_label": "banana",    # the model's own label, for logging
         "predicted_class": "biological" | None,   # None = no honest mapping
         "confidence": 0.88}

    Returns None if the model is unavailable, inference fails, or nothing was
    detected at all - all of which the caller treats as "escalate to Gemini".

    Only the top detection is used. That matches the app's existing behaviour:
    a scan has always produced exactly one result for the user, so a photo
    containing several objects still identifies the most prominent one rather
    than silently changing into a multi-item experience.
    """
    _load_model_if_needed()
    if _model is None:
        return None

    try:
        # conf= here is the raw reporting floor, NOT the high/low decision
        # threshold - it is deliberately low so that weak detections are still
        # returned and can be logged before being escalated to Gemini.
        results = _model.predict(image, conf=YOLO_MIN_DETECTION_CONF, verbose=False)
    except Exception as err:
        logger.warning("YOLO inference failed (%s) - falling back to Gemini", err)
        return None

    if not results:
        return None

    result = results[0]
    boxes = getattr(result, "boxes", None)
    if boxes is None or len(boxes) == 0:
        return None  # nothing detected in the image

    confidences = [float(c) for c in boxes.conf]
    best = max(range(len(confidences)), key=lambda i: confidences[i])
    label = result.names[int(boxes.cls[best])]

    return {
        "yolo_label": label,
        "predicted_class": YOLO_CLASS_MAP.get(label),
        "confidence": confidences[best],
    }
