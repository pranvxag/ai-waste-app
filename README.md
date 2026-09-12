# AI-Based Waste Identification and Reuse Recommendation System

EVS-I project — Semester 3, B.Tech CSE (Batch C2, Division C).

An app that photographs a waste item, identifies what it's made of using an AI
image-classification model, tells you how to dispose of it correctly, and
recommends reuse/upcycling ideas for it.

## Structure

- **`backend/`** — FastAPI server that runs the trained model and serves disposal +
  reuse data. See `backend/README.md` to set it up.
- **`mobile-app/`** — Expo (React Native) app. See `mobile-app/README.md` to set it up.
- **`docs/`** — Project plan and the Colab training notebook used to produce the model.

## Getting the model file

`backend/model/` is empty in this repo (trained model files are large binaries and
excluded via `.gitignore`). Get `waste_classifier.keras` and `class_names.json` by
running `docs/waste_classifier_training.ipynb` on Google Colab, then place both files
into `backend/model/` before starting the backend.

## Run order

1. Start the backend (`backend/README.md`) and confirm `/health` shows `model_ready: true`.
2. Set `mobile-app/src/api/config.js` to point at the backend's address.
3. Start the Expo app (`mobile-app/README.md`) and test the full scan → identify → result flow.
