# Backend — Waste Identification & Reuse API

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Add the trained model

After running `docs/waste_classifier_training.ipynb` on Colab, copy both files into
`backend/model/`:
- `waste_classifier.keras`
- `class_names.json`

## Add API keys (optional — only needed for AI-enhanced reuse ideas)

Copy `.env.example` to `.env` and fill in:
```
GROQ_API_KEY=your_key_here
YOUTUBE_API_KEY=your_key_here
```
- Groq (free, no card): console.groq.com
- YouTube Data API v3 (free): Google Cloud Console — enable the API, create a key.

If these are left blank, `/enhance-reuse` will still respond successfully but with an
empty `ai_ideas` list — the rest of the app is unaffected.

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Check `http://localhost:8000/health` — should show `"model_ready": true` once the
model files are in place.

## Endpoints

- `GET /health` — status check, tells you if the model is loaded.
- `POST /predict` — multipart form upload, field name `file`. Returns predicted class,
  confidence, disposal category/instructions, and the static reuse-idea list.
- `POST /enhance-reuse` — JSON body `{"predicted_class": str, "category": str}`.
  Returns `{"ai_ideas": [{"idea": str, "video": {...} | null}, ...]}` — AI-generated
  reuse ideas with real YouTube links where found. Returns an empty list rather than
  an error if the AI/YouTube calls fail or keys are missing.

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

## Expose it to your phone / Expo app during development

- **Same WiFi**: use your laptop's local IP (e.g. `http://192.168.1.5:8000`) — set this
  in the app's Settings screen.
- **ngrok**: `ngrok http 8000`, use the `https://...ngrok-free.app` URL it gives you.

## Before the final demo

Whichever URL you're using needs to be reachable at demo time. Either deploy this
backend to a free host (Render, Railway, Hugging Face Spaces) for a stable public URL,
or restart ngrok fresh right before presenting and update the URL in the app's Settings
screen (free ngrok URLs change every restart).

## What to test first

1. `/health` shows `model_ready: true`.
2. `/predict` with a real photo returns a sensible class + confidence.
3. `/enhance-reuse` returns either real AI ideas with video links, or an empty list
   (not an error) if keys aren't set up yet.
4. From your phone's browser (not the app), confirm `/health` loads at whatever address
   you plan to put in the app's Settings screen — catches network issues before they
   look like app bugs.
