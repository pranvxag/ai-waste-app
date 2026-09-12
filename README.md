# AI-Based Waste Identification and Reuse Recommendation System

EVS-I project — Semester 3, B.Tech CSE (Batch C2, Division C).

An app that photographs a waste item, identifies what it's made of using an AI
image-classification model, tells you how to dispose of it correctly, and
recommends reuse/upcycling ideas — including AI-generated suggestions with
real YouTube links, on top of a reliable built-in idea list.

## Structure

```
ai-waste-app/
  backend/       FastAPI server — model inference, disposal data, AI-enhanced ideas
  ReLeaf/        Expo (React Native) mobile app
  docs/          Project plan, training notebook
```

- **`backend/`** — see `backend/README.md`. Serves `/predict` (classification + disposal
  + static reuse ideas) and `/enhance-reuse` (optional AI-generated ideas + YouTube links
  via Groq + YouTube Data API).
- **`ReLeaf/`** — see `ReLeaf/README.md`. Bottom-tab app: Home, History, Impact, Settings,
  plus a center camera button that opens the Scan → Result flow.
- **`docs/`** — `Project_Plan.docx` (original scope/architecture doc),
  `waste_classifier_training.ipynb` (Colab notebook that trains the model).

## App architecture at a glance

```
[ReLeaf app] --photo--> [FastAPI /predict] --runs--> [MobileNetV2 model]
                              |
                              v
                disposal guidance + static reuse ideas
                (all in one response)

[ReLeaf Result screen] --"Get more ideas"--> [FastAPI /enhance-reuse]
                                                    |
                                          Groq (reuse ideas) + YouTube Data API (real video links)
```

Scan history, impact stats, and the backend URL setting are all stored on-device
(AsyncStorage) — no user accounts, no backend database.

## Getting the model file

`backend/model/` is empty in git (trained models are large binaries, excluded via
`.gitignore`). Run `docs/waste_classifier_training.ipynb` on Google Colab, then place
`waste_classifier.keras` and `class_names.json` into `backend/model/`.

## Getting API keys (for AI-enhanced reuse ideas)

`/enhance-reuse` is optional — the app works fully without it, just without the extra
AI-generated ideas. To enable it, get two free keys and put them in `backend/.env`
(see `backend/.env.example`):
- **Groq**: console.groq.com — free tier, no card required.
- **YouTube Data API v3**: Google Cloud Console — enable the API, create a key.

## Run order

1. Start the backend (`backend/README.md`), confirm `/health` shows `model_ready: true`.
2. Set the backend URL in the app's Settings screen (or `ReLeaf/src/api/config.js` as
   the fallback default).
3. Start the Expo app (`ReLeaf/README.md`) and run through the full scan → identify →
   result flow.

## New to this project?

Read `CONTRIBUTING.md` next — it covers project conventions, how to pick up a task,
and where things live in more detail than this file.
