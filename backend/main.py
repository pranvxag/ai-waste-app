"""
FastAPI backend for the AI Waste Identification & Reuse Recommendation app.

Endpoints:
  GET  /health              -> simple check that the server + model are up
  POST /predict              -> accepts an image file, returns class + confidence
                                 + disposal guidance (category is fixed; reuse ideas
                                 are generated separately, see /enhance-reuse)
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
import json
import os

import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

from llm_service import get_ai_reuse_ideas, get_youtube_link
from waste_data import get_waste_info

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model", "waste_classifier.keras")
CLASS_NAMES_PATH = os.path.join(os.path.dirname(__file__), "model", "class_names.json")
IMG_SIZE = (224, 224)

app = FastAPI(title="Waste Identification & Reuse API")

# Allow the Expo app (and browser testing) to call this API from any origin.
# Fine for a student project demo; tighten this if you ever deploy publicly long-term.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_class_names = None


def _load_model_if_needed():
    """Lazy-load the model on first request so the server can still start
    (and /health can report the missing-model state clearly) even before
    the trained model files have been copied into backend/model/."""
    global _model, _class_names

    if _model is not None:
        return

    if not os.path.exists(MODEL_PATH) or not os.path.exists(CLASS_NAMES_PATH):
        raise HTTPException(
            status_code=503,
            detail=(
                "Model not found. Copy waste_classifier.keras and class_names.json "
                "(from the training notebook) into backend/model/ and restart the server."
            ),
        )

    import tensorflow as tf  # imported here so the server can boot even without TF installed yet

    _model = tf.keras.models.load_model(MODEL_PATH)
    with open(CLASS_NAMES_PATH) as f:
        _class_names = json.load(f)


@app.get("/health")
def health():
    model_ready = os.path.exists(MODEL_PATH) and os.path.exists(CLASS_NAMES_PATH)
    return {"status": "ok", "model_ready": model_ready}


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    _load_model_if_needed()

    if file.content_type not in ("image/jpeg", "image/png", "image/jpg"):
        raise HTTPException(status_code=400, detail="Please upload a JPEG or PNG image.")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read the uploaded image.")

    image = image.resize(IMG_SIZE)
    arr = np.array(image, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)  # batch dimension
    # NOTE: preprocessing (mobilenet_v2.preprocess_input) is baked into the model's
    # own input pipeline from training, so raw resized pixels go in here.

    predictions = _model.predict(arr, verbose=0)[0]
    top_idx = int(np.argmax(predictions))
    predicted_class = _class_names[top_idx]
    confidence = float(predictions[top_idx])

    info = get_waste_info(predicted_class)

    return {
        "predicted_class": predicted_class,
        "confidence": round(confidence, 4),
        "category": info["category"],
        "disposal": info["disposal"],
    }


@app.get("/waste-info/{predicted_class}")
def waste_info(predicted_class: str):
    """Category + disposal info for an already-known material class, without
    running the model on an image. Used by the app's "Try scanning these"
    example objects: since the class is already known (that's the point of
    an example), this calls the exact same get_waste_info() lookup /predict
    uses, so clicking "Glass bottle" returns identical disposal guidance to
    what a real scan of a glass bottle would produce - just without a
    confidence score, since nothing was actually classified. The app fetches
    reuse ideas for this separately via /enhance-reuse, same as any real scan."""
    info = get_waste_info(predicted_class)
    return {
        "predicted_class": predicted_class,
        "category": info["category"],
        "disposal": info["disposal"],
    }


class EnhanceReuseRequest(BaseModel):
    predicted_class: str
    category: str
    exclude: list[str] = []  # ideas already shown - ask the model to avoid repeating these


@app.post("/enhance-reuse")
def enhance_reuse(payload: EnhanceReuseRequest):
    """The app's only source of reuse ideas: 3 LLM-generated ideas per call,
    each paired with a real YouTube tutorial link where one is found. Called
    once for the initial "Reuse ideas" batch, and again (with `exclude` set
    to everything already shown) each time the user taps "More ideas" -
    there's no separate static list this falls back to.

    Allowed to fail quietly - if the AI/YouTube services are down or the API
    keys aren't configured, this returns an empty list with a 200 rather than
    a 500; the app shows a clean empty/error state instead of a crash."""
    try:
        ideas = get_ai_reuse_ideas(payload.predicted_class, payload.category, exclude=payload.exclude)

        # Exact-match safety net on top of the prompt's own exclude instruction -
        # an LLM can still occasionally echo one back despite being asked not to.
        already_shown = {idea.strip().lower() for idea in payload.exclude}
        ideas = [idea for idea in ideas if idea.strip().lower() not in already_shown]

        ai_ideas = []
        for idea in ideas:
            video = get_youtube_link(f"{idea} DIY tutorial")
            ai_ideas.append({"idea": idea, "video": video})

        return {"ai_ideas": ai_ideas}
    except Exception:
        return {"ai_ideas": []}
