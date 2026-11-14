---
title: ReLeaf Waste Identification API
emoji: ♻️
colorFrom: green
colorTo: blue
sdk: gradio
app_file: app.py
suggested_hardware: cpu-basic
---

# Backend — Waste Identification & Reuse API

## How recognition works

```
image ──> YOLO ──> confidence check ──┬── HIGH (>= threshold, known class) ──> YOLO result
                                      └── LOW / unmapped / no detection ─────> Gemini Vision
                                                                                    │
                                          both paths produce the same result shape ─┘
```

YOLO (`yolo_service.py`) runs on every scan. Its answer is used directly only when it is
both confident enough **and** maps to a waste class the app knows. Everything else escalates
the original image to Gemini Vision (`gemini_service.py`), which identifies the item and
supplies its own disposal guidance. If neither can identify the item, `/predict` returns a
422 and the app tells the user to scan again — it never invents a classification.

**Important about the default model:** `yolov8n.pt` is pretrained on COCO, a general-object
dataset with no notion of waste material. Only its food classes map honestly onto this app's
categories (food → `biological`); COCO's `bottle` could be plastic or glass and it cannot
tell you which. So in practice **most real scans currently take the Gemini path** — that's
by design, not a bug. Swap in a custom waste-trained model (below) to shift that balance.

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Hugging Face Spaces deployment

This directory is a Gradio Space. `app.py` starts the existing FastAPI app and
mounts a small Gradio status page at `/ui`. The same Space URL serves both the
Gradio page and the FastAPI endpoints used by Expo.

Runtime variables:

- `CORS_ORIGINS` — comma-separated Expo web origins; defaults to `*` for the
  existing behavior.
- `MAX_UPLOAD_BYTES` — defaults to `10485760` (10 MiB).
- `YOLO_MODEL_PATH`, `YOLO_CONFIDENCE_THRESHOLD`, and `GEMINI_MODEL`.
- `GEMINI_API_KEY`, `GROQ_API_KEY`, and `YOUTUBE_API_KEY`; keep these in
  Space Settings → Variables and secrets, never in the repository or image.

Uploads are validated in memory and rejected above the configured limit; the
application does not create temporary image files. No Firebase Admin SDK is
required because Firebase operations are performed by the Expo client.

The YOLO weights download automatically to `backend/model/yolov8n.pt` on the first scan
(needs internet that once). No manual model copying is required.

### Create and configure the Space

1. Sign in at [huggingface.co](https://huggingface.co/) and create a new **Space**.
2. Choose **Gradio** as the SDK and **CPU basic** hardware.
3. Put the contents of this `backend/` directory in the Space repository root.
   The Space repository root must contain `app.py`, `requirements.txt`, `main.py`,
   and this `README.md`. The `Dockerfile` is not used by a Gradio Space.
4. Open **Settings → Variables and secrets** and add `GEMINI_API_KEY`,
   `GROQ_API_KEY`, and `YOUTUBE_API_KEY` as secrets. Do not upload `.env`.
5. Wait for the build to finish, then open
   `https://<your-hugging-face-username>-<space-name>.hf.space/health`.
   A healthy response has `"status": "ok"`. `model_ready` may briefly be false
   while the background warm-up is loading YOLO.
6. Open `/ui` in a browser to confirm the Gradio runtime is also available.

If the Space is private, the mobile app cannot call it anonymously. Keep the
Space public for this app unless you add an authenticated proxy; API keys remain
private because only the backend uses them.

### Using a custom waste-trained YOLO model

1. Put your `.pt` file anywhere and set `YOLO_MODEL_PATH=/path/to/your_model.pt` in `.env`.
2. Update `YOLO_CLASS_MAP` in `yolo_service.py` to map your model's class names onto the
   app's waste classes (the keys of `WASTE_INFO` in `waste_data.py`).

Classes you leave out of that map route to Gemini instead of being guessed at. Nothing else
in the codebase needs to change.

## Add API keys

Copy `.env.example` to `.env` and fill in:
```
GEMINI_API_KEY=your_key_here     # fallback recognition
GROQ_API_KEY=your_key_here       # reuse ideas
YOUTUBE_API_KEY=your_key_here    # video links on reuse ideas
```
- Gemini (free tier): aistudio.google.com/apikey
- Groq (free, no card): console.groq.com
- YouTube Data API v3 (free): Google Cloud Console — enable the API, create a key.

What breaks if each is missing:
- **No `GEMINI_API_KEY`** — scans YOLO isn't confident about return "couldn't identify"
  instead of falling back. Given the default model, that's most scans.
- **No `GROQ_API_KEY`** — `/enhance-reuse` returns an empty `ai_ideas` list; the app shows a
  clean empty state. Scanning and disposal guidance are unaffected.
- **No `YOUTUBE_API_KEY`** — reuse ideas still appear, just without video cards.

All three stay server-side. The mobile app never holds an API key.

## Speed, and the Gemini free tier

Both engines are warmed up in the background when the server starts (YOLO weights +
first inference, and the Gemini SDK import). That's deliberate: cold, those cost tens of
seconds, and without the warm-up the first person to scan something pays all of it.
**Give the server ~30 seconds after starting before the first scan** and it'll be quick.
Watch for these two lines in the log:

```
INFO gemini_service: Gemini client ready
INFO yolo_service: YOLO warm-up complete - scans will now be fast
```

After that, YOLO decides in well under a second; the remaining wait is the Gemini call
when a scan falls back to it.

Free-tier quota is **per model, per day**. A day of heavy testing can exhaust one model
while others still work — if scans start returning "Too many scans in a row", either wait
or set a different `GEMINI_MODEL` in `.env` to get a fresh allowance. Rapid back-to-back
scans can also hit a per-minute limit; that one clears in under a minute.

If Gemini itself is slow (Google has bad periods — we measured a trivial text-only call
taking 17s during one), scans fail at `GEMINI_TIMEOUT_SECONDS` (12s) with a clear message
rather than hanging. Raise it in `config.py` if you'd rather wait longer than fail.

## Tuning the confidence threshold

`YOLO_CONFIDENCE_THRESHOLD` (default `0.70`) is defined once, in `config.py`, and is
overridable from `.env`. Raise it to send more scans to Gemini (more accurate, slower, more
API usage); lower it to trust YOLO more often. It is the *detection confidence*, not the
IoU/NMS threshold — changing it doesn't affect how overlapping boxes are merged.

## Run locally

Start the backend from this directory:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Check `http://localhost:8000/health`. For a phone on the same Wi-Fi, save
`http://<your-laptop-ip>:8000` in the app's Settings screen.

## Endpoints

## Logging

Backend events use timestamped structured logs with levels, module names, and a
request correlation ID. The app sends its stable scan ID as `X-Request-ID`, so
the `/predict` and `/enhance-reuse` events for one scan can be traced together.
Credentials, tokens, private URLs, and personal data are excluded.

Example:

```
2026-11-06T12:53:08+00:00 INFO main: scan started correlation_id='scan_...'
2026-11-06T12:53:09+00:00 INFO main: scan completed source='gemini' bucket='recyclable' correlation_id='scan_...'
```

- `GET /health` — status check. `model_ready` is whether YOLO loaded successfully;
  `gemini_configured` is whether the fallback has an API key.
- `POST /predict` — multipart form upload, field name `file`. Runs the YOLO →
  confidence-check → Gemini pipeline and returns the normalized result:
  ```json
  { "predicted_class": "plastic", "confidence": 0.94,
    "category": "recyclable (check resin code)", "disposal": "Rinse and place in...",
    "bucket": "recyclable", "source": "yolo", "material": "plastic", "reusable": false }
  ```
  `source` is `"yolo"` or `"gemini"` — tells you which path answered. `bucket` is always
  one of `recyclable | compostable | hazardous | reuse | general` and drives the app's
  badge colour/icon. Returns **422** with a plain-language message when neither engine
  can identify the item. Reuse ideas are NOT included here — fetch them separately from
  `/enhance-reuse` (see below); there's no static idea list anymore.
- `GET /waste-info/{predicted_class}` — same category/disposal/bucket lookup as the
  high-confidence path, for an already-known class with no image needed. Used by the
  app's "Try scanning these" example objects on the Home screen.
- `POST /enhance-reuse` — the app's only source of reuse ideas. JSON body
  `{"predicted_class": str, "category": str, "exclude": [str, ...]}` (`exclude` is
  optional — ideas already shown, so a repeat call for "more ideas" generates
  genuinely new ones instead of repeating itself). Returns
  `{"ai_ideas": [{"idea": str, "video": {"video_id", "title", "url", "thumbnail_url"} | null}, ...]}`
  — 3 AI-generated ideas per call, each with a real YouTube link where one is found.
  Returns an empty list rather than an error if the AI/YouTube calls fail or keys are
  missing — the app shows a clean empty state in that case, not a crash.

## Test without the app

Use the interactive docs page instead of curl if you hit quoting issues on Windows:
`http://localhost:8000/docs` → expand an endpoint → "Try it out".

Or via curl:
```bash
curl -X POST -F "file=@/path/to/real_test_image.jpg" http://localhost:8000/predict

curl -X POST -H "Content-Type: application/json" \
  -d '{"predicted_class": "plastic", "category": "recyclable"}' \
  http://localhost:8000/enhance-reuse
```

## Connect an Expo/EAS build

After the Space is healthy, set `EXPO_PUBLIC_API_BASE_URL` to its HTTPS URL when
building the app. For local builds, create `ReLeaf/.env` from `.env.example` and add:

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://<your-hugging-face-username>-<space-name>.hf.space
```

For EAS, configure the same variable in the EAS project environment (or selected
build profile) and rebuild. The URL is embedded during the build; changing it in
EAS does not change an already-installed binary. You can also paste the Space URL
into the app's Settings screen without rebuilding.

## What to test first

1. `/health` shows `model_ready: true` and `gemini_configured: true`.
2. `/predict` with a photo of **food** (banana, apple, pizza) returns `"source": "yolo"` —
   that's the only group the default COCO model maps honestly, so it's how you check the
   high-confidence path works at all.
3. `/predict` with anything else (bottle, remote, packaging) returns `"source": "gemini"`
   with a sensible material and disposal text — the fallback path.
4. Watch the server log while doing both. Each scan prints one line ending in
   `decision=HIGH_CONFIDENCE` or `decision=LOW_CONFIDENCE`, which is how you confirm
   Gemini is *not* being called on the high-confidence path.
5. `/enhance-reuse` returns either real AI ideas with video links, or an empty list
   (not an error) if keys aren't set up yet.
6. From your phone's browser (not the app), confirm `/health` loads at whatever address
   you plan to put in the app's Settings screen — catches network issues before they
   look like app bugs.
