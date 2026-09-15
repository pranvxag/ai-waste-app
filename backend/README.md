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

## Run (two terminals, every time)

The app talks to the backend over a permanent ngrok tunnel, so two things need to be
running together whenever you want the app to actually reach the backend — locally,
on your phone, or anywhere else:

**Terminal 1 — the backend itself:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Check `http://localhost:8000/health` — should show `"model_ready": true` once the
model files are in place.

**Terminal 2 — the tunnel** (ngrok is installed at `C:\Users\Dell\bin\ngrok.exe`,
already authenticated and on PATH — just run):
```bash
ngrok http --url=constant-attribute-showplace.ngrok-free.dev 8000
```

Then confirm the whole chain works from anywhere (not just localhost):
```bash
curl https://constant-attribute-showplace.ngrok-free.dev/health
```
should return `{"status":"ok","model_ready":true}`. This is the URL the app is
already configured to use by default (`API_BASE_URL` in `ReLeaf/src/api/config.js`)
— no Settings-screen changes needed unless that domain ever changes.

Leave both terminals open for as long as you want the backend reachable; closing
either one breaks the connection (ngrok only relays to a backend that's actually
running — it can't serve anything on its own). See "Before the final demo" below for
what that means at demo time, and the root `README.md` for why a tunnel is used
instead of a real deployment.

### Setting this up on a different machine

The above only works as-is on the machine that already has the ngrok authtoken
configured. On a fresh machine:
```bash
ngrok config add-authtoken <your-authtoken>   # once per machine, from dashboard.ngrok.com
```
then the same `ngrok http --url=...` command works. The static domain itself belongs
to the ngrok account, not the machine, so it stays the same everywhere.

## Endpoints

- `GET /health` — status check, tells you if the model is loaded.
- `POST /predict` — multipart form upload, field name `file`. Returns predicted class,
  confidence, and disposal category/instructions. Reuse ideas are NOT included here —
  fetch them separately from `/enhance-reuse` (see below); there's no static idea list
  anymore.
- `GET /waste-info/{predicted_class}` — same category/disposal lookup as `/predict`,
  for an already-known class with no image needed. Used by the app's "Try scanning
  these" example objects on the Home screen.
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

## Alternative: same WiFi, no tunnel

If ngrok is unavailable for some reason, use your laptop's local IP instead (find it
with `ipconfig`, under your Wi-Fi adapter's "IPv4 Address") and set it in the app's
Settings screen. Only works when your phone/laptop are on the same WiFi, and changes
whenever you switch networks — the ngrok tunnel above doesn't have either limitation.

## Before the final demo

Start both terminals (`uvicorn` and `ngrok`) a few minutes before presenting, not live
— confirm `curl https://constant-attribute-showplace.ngrok-free.dev/health` works first.
This still depends on your laptop being on and connected; for something that doesn't,
deploy this backend to a free host (Render, Railway, Hugging Face Spaces) instead.

## What to test first

1. `/health` shows `model_ready: true`.
2. `/predict` with a real photo returns a sensible class + confidence.
3. `/enhance-reuse` returns either real AI ideas with video links, or an empty list
   (not an error) if keys aren't set up yet.
4. From your phone's browser (not the app), confirm `/health` loads at whatever address
   you plan to put in the app's Settings screen — catches network issues before they
   look like app bugs.
