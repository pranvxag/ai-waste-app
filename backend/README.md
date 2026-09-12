# Backend — Waste Identification & Reuse API

## Setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Add the trained model

After running the training notebook on Colab, you'll have two files:
- `waste_classifier.keras`
- `class_names.json`

Copy both into `backend/model/` (same folder names as above — the code expects them there).

## Run

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Check it's alive: open `http://localhost:8000/health` — should show `"model_ready": true`
once the model files are in place.

## Test predictions without the Expo app yet

```bash
curl -X POST -F "file=@/path/to/some_test_image.jpg" http://localhost:8000/predict
```

Should return something like:

```json
{
  "predicted_class": "plastic",
  "confidence": 0.94,
  "category": "recyclable (check resin code)",
  "disposal": "Rinse and place in plastic recycling...",
  "reuse_ideas": ["...", "...", "..."]
}
```

## Expose it to your phone / Expo app during development

Your phone and laptop need to reach this server. Two options:
- **Same WiFi network**: use your laptop's local IP (e.g. `http://192.168.1.5:8000`) directly in the Expo app — works as long as both devices are on the same network.
- **ngrok** (works from anywhere, useful once you leave the same network): 
  ```bash
  ngrok http 8000
  ```
  Use the `https://...ngrok-free.app` URL it gives you as the API base URL in the Expo app.

## Before the final demo / EAS build

Whichever URL you use here needs to be reachable at demo time. Options:
- Deploy this backend properly to a free host (Render, Railway, Hugging Face Spaces) so it has a stable public URL — recommended once the app is working, so you're not dependent on ngrok/laptop being on.
- Or keep using ngrok, but start it fresh right before presenting (free ngrok URLs change each time you restart it — remember to update the URL in the app if so).
