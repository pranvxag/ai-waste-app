"""
FastAPI backend for the AI Waste Identification & Reuse Recommendation app.

Endpoints:
  GET  /health          -> simple check that the server + model are up
  POST /predict          -> accepts an image file, returns class + confidence
                             + disposal guidance + reuse ideas in one response

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
        "reuse_ideas": info["reuse_ideas"],
    }
