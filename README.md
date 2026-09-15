# AI-Based Waste Identification and Reuse Recommendation System

EVS-I project — Semester 3, B.Tech CSE (Batch C2, Division C).

An app that photographs a waste item, identifies what it's made of using an AI
image-classification model, tells you how to dispose of it correctly, and
recommends reuse/upcycling ideas generated live by an LLM — each optionally
paired with a real YouTube tutorial link — with more available on demand.

## Structure

```
ai-waste-app/
  backend/       FastAPI server — model inference, disposal data, AI-enhanced ideas
  ReLeaf/        Expo (React Native) mobile app
  docs/          Project plan, training notebook
```

- **`backend/`** — see `backend/README.md`. Serves `/predict` (classification + fixed
  disposal guidance) and `/enhance-reuse` (AI-generated reuse ideas + YouTube links via
  Groq + YouTube Data API — the app's only source of reuse ideas, called automatically
  per scan and again on each "More ideas" tap).
- **`ReLeaf/`** — see `ReLeaf/README.md`. Bottom-tab app: Home, History, Impact, Settings,
  plus a center camera button that opens the Scan → Result flow.
- **`docs/`** — `Project_Plan.docx` (original scope/architecture doc),
  `waste_classifier_training.ipynb` (Colab notebook that trains the model).

## App architecture at a glance

```
[ReLeaf app] --photo--> [FastAPI /predict] --runs--> [MobileNetV2 model]
                              |
                              v
                   fixed disposal guidance
                  (category + instructions)

[ReLeaf Result screen] --auto, then "More ideas"--> [FastAPI /enhance-reuse]
                                                             |
                                          Groq (reuse ideas) + YouTube Data API (real video links)
```

`/enhance-reuse` is called automatically once per scan to populate "Reuse ideas," and
again (excluding what's already shown) every time "More ideas" is tapped — there's no
static reuse-idea list anywhere in the app.

Scan history, impact stats, and the backend URL setting are all stored on-device
(AsyncStorage) — no user accounts, no backend database.

## Getting the model file

`backend/model/` is empty in git (trained models are large binaries, excluded via
`.gitignore`). Run `docs/waste_classifier_training.ipynb` on Google Colab, then place
`waste_classifier.keras` and `class_names.json` into `backend/model/`.

## Getting API keys (for reuse ideas)

The rest of the app (classification, disposal guidance, scan history) works without
these — but reuse ideas are entirely AI-generated, so without a `GROQ_API_KEY` the
"Reuse ideas" / "More ideas" sections will just show a clean empty state instead of
suggestions. Get two free keys and put them in `backend/.env` (see `backend/.env.example`):
- **Groq**: console.groq.com — free tier, no card required. Required for any reuse ideas.
- **YouTube Data API v3**: Google Cloud Console — enable the API, create a key. Optional
  on top of that — without it, ideas still show up, just without a video link.

## Run order

1. Start the backend (`backend/README.md`), confirm `/health` shows `model_ready: true`.
2. Set the backend URL in the app's Settings screen (or `ReLeaf/src/api/config.js` as
   the fallback default).
3. Start the Expo app (`ReLeaf/README.md`) and run through the full scan → identify →
   result flow.

## New to this project?

Read `CONTRIBUTING.md` next — it covers project conventions, how to pick up a task,
and where things live in more detail than this file.
