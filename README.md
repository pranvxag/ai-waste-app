# AI-Based Waste Identification and Reuse Recommendation System

EVS-I project — Semester 3, B.Tech CSE (Batch C2, Division C).

An app that photographs a waste item, identifies what it's made of using YOLO
object detection (falling back to Gemini Vision when YOLO isn't confident),
tells you how to dispose of it correctly, and recommends reuse/upcycling ideas
generated live by an LLM — each optionally paired with a real YouTube tutorial
link — with more available on demand.

## Structure

```
ai-waste-app/
  backend/       FastAPI server — recognition pipeline, disposal data, AI-enhanced ideas
  ReLeaf/        Expo (React Native) mobile app
  docs/          Project plan, training notebook
```

- **`backend/`** — see `backend/README.md`. Serves `/predict` (YOLO → confidence check →
  Gemini Vision fallback, plus disposal guidance) and `/enhance-reuse` (AI-generated reuse
  ideas + YouTube links via Groq + YouTube Data API — the app's only source of reuse ideas,
  called automatically per scan and again on each "More ideas" tap).
- **`ReLeaf/`** — see `ReLeaf/README.md`. Bottom-tab app: Home, History, Impact, Settings,
  plus a center camera button that opens the Scan → Result flow.
- **`docs/`** — `Project_Plan.docx` (original scope/architecture doc),
  `waste_classifier_training.ipynb` (Colab notebook that trains the model).

## App architecture at a glance

```
[ReLeaf app] --photo--> [FastAPI /predict] --> [YOLO] --> confidence check
                                                            /          \
                                                        HIGH           LOW
                                                          |              |
                                                   YOLO result    [Gemini Vision]
                                                          \              /
                                                           v            v
                                                      final classification
                                                               |
                                                               v
                                                   disposal guidance + bucket

[ReLeaf Result screen] --auto, then "More ideas"--> [FastAPI /enhance-reuse]
                                                             |
                                          Groq (reuse ideas) + YouTube Data API (real video links)
```

YOLO runs on every scan; its answer is used directly only when it's confident **and** maps
to a waste class the app knows. Anything else sends the original image to Gemini Vision,
which identifies the item and supplies its own disposal guidance. Both paths return the
same result shape, so the Result screen never needs to know which one answered — the
`source` field says so anyway. If neither can identify the item, the app says exactly that
rather than guessing.

`/enhance-reuse` is called automatically once per scan to populate "Reuse ideas," and
again (excluding what's already shown) every time "More ideas" is tapped — there's no
static reuse-idea list anywhere in the app.

Scan history, impact stats, and the backend URL setting are all stored on-device
(AsyncStorage) — no user accounts, no backend database.

## Getting the model file

Nothing to do — the YOLO weights download automatically to `backend/model/` on the first
scan. `backend/model/` stays empty in git (model files are large binaries, excluded via
`.gitignore`).

`docs/waste_classifier_training.ipynb` trains a custom waste classifier and is kept for
reference; the app no longer loads its output. See `backend/README.md` for how to plug a
custom waste-trained YOLO model into the pipeline.

## Getting API keys

Put these in `backend/.env` (see `backend/.env.example`) — all three are free and all stay
server-side; the mobile app never holds a key.
- **Gemini**: aistudio.google.com/apikey — the recognition fallback. Without it, any scan
  YOLO isn't confident about returns "couldn't identify" instead. With the default COCO
  model that's most scans, so this is the one worth setting up first.
- **Groq**: console.groq.com — free tier, no card required. Required for any reuse ideas;
  without it those sections show a clean empty state.
- **YouTube Data API v3**: Google Cloud Console — enable the API, create a key. Optional —
  without it, reuse ideas still show up, just without a video link.

## Run order

1. Deploy the backend to Hugging Face Spaces using [`backend/README.md`](./backend/README.md)
   and confirm its `/health` endpoint responds.
2. Set `EXPO_PUBLIC_API_BASE_URL` to the Space URL in `ReLeaf/.env` before an Expo/EAS
   build, or paste the URL into the app's Settings screen.
3. Start the Expo app (`ReLeaf/README.md`) and run through the full scan → identify →
   result flow.

## New to this project?

Read `CONTRIBUTING.md` next — it covers project conventions, how to pick up a task,
and where things live in more detail than this file.
