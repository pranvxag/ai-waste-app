# ReLeaf / AI Waste Identification and Reuse Recommendation System

## 1. Project Summary

**ReLeaf** is an EVS-I prototype that helps a user make better waste-management
decisions from a photograph. The user captures or selects an image of an item,
the backend identifies the most likely object/material, and the app presents:

- a waste category and disposal instructions;
- a canonical disposal bucket and visual status;
- AI-generated reuse or upcycling ideas;
- optional real YouTube tutorial links for those ideas;
- scan history, impact statistics, and points/scan metadata.

The project combines a mobile user interface, a computer-vision recognition
pipeline, rule-based disposal guidance, generative-AI assistance, and cloud
storage for authenticated scan history.

The project was created as an **EVS-I, Semester 3, B.Tech CSE, Batch C2,
Division C, 2-credit project**. Its core differentiator is that it combines
identification and disposal guidance with item-specific reuse/upcycling
recommendations instead of stopping at “which bin should this go into?”

## 2. Problem Statement

People frequently cannot determine whether an item is recyclable, compostable,
hazardous, reusable, or general waste. Existing waste applications often focus
on either identification/disposal or manual reuse/donation listings. ReLeaf
attempts to connect these steps:

1. identify the object from a photograph;
2. explain how it should be handled;
3. suggest practical ways to reuse it before disposal.

The system is designed to avoid confident-looking guesses. When the primary
detector cannot provide a reliable, known material mapping, the original image
is sent to a vision-language fallback. If neither engine can identify the item,
the user receives an explicit “could not identify” response.

## 3. Objectives

### Primary objectives

- Provide a simple mobile workflow for photographing or selecting waste.
- Identify common waste items/materials using AI.
- Provide understandable, practical disposal guidance.
- Classify results into consistent UI buckets:
  `recyclable`, `compostable`, `hazardous`, `reuse`, or `general`.
- Generate item-specific reuse/upcycling ideas dynamically.
- Attach real YouTube tutorial links when a suitable video is found.
- Maintain user-specific scan history and impact statistics.

### Secondary objectives

- Keep API credentials on the backend.
- Support both native mobile and Expo web upload behavior.
- Make the backend deployable to Google Cloud Run.
- Keep the model pipeline replaceable so a custom waste-trained YOLO model can
  be introduced later.
- Provide safe failure behavior for missing keys, bad images, model failures,
  rate limits, and malformed AI output.

## 4. High-Level Architecture

```text
                         +-----------------------------+
                         |  ReLeaf Expo mobile client  |
                         |  React Native / React       |
                         +--------------+--------------+
                                        |
                  photo upload         | JSON API requests
                                        v
                         +-----------------------------+
                         | FastAPI backend               |
                         | /health /predict              |
                         | /waste-info /enhance-reuse   |
                         +--------------+--------------+
                                        |
                         +--------------+--------------+
                         |                             |
                         v                             v
                 +---------------+             +----------------+
                 | YOLO detector |             | Gemini Vision  |
                 | primary path  |             | fallback path  |
                 +-------+-------+             +--------+-------+
                         |                              |
                         +--------------+---------------+
                                        v
                         normalized classification result
                                        |
                                        v
                         disposal guidance + bucket

       reuse request -> Groq LLM -> ideas -> YouTube Data API -> video metadata

       authenticated client -> Firebase Auth
                             -> Firestore scan metadata
                             -> Firebase Storage scan images
                             -> AsyncStorage local cache/settings
```

### Architectural style

- **Client/server architecture:** the Expo application is the client and the
  Python FastAPI service is the recognition/API server.
- **Stateless recognition API:** uploaded images are processed in memory; the
  backend does not use a project database for prediction requests.
- **Client-managed persistence:** authenticated user profiles, scan metadata,
  and scan images are written from the mobile app to Firebase.
- **AI pipeline with escalation:** YOLO is attempted first; Gemini is used only
  when YOLO is unavailable, unmapped, or below the confidence threshold.
- **Separation of concerns:** fixed disposal facts are stored in
  `waste_data.py`; reuse suggestions are generated by `llm_service.py` and are
  not hard-coded.

## 5. Technology Stack

### Frontend/mobile

- **JavaScript**
- **React 19.2.3**
- **React Native 0.86.3**
- **Expo SDK 57**
- **React Navigation 7**
  - native stack navigation;
  - bottom tab navigation.
- **Expo Image Picker** for camera and gallery access.
- **Expo File System** for native multipart uploads.
- **AsyncStorage 2.2.0** for local settings and cache.
- **Expo Google Fonts**
  - Space Grotesk for headings;
  - Inter for body text.
- **Expo Vector Icons / MaterialCommunityIcons**.
- **Firebase JavaScript SDK 13.2.0**
  - Firebase Authentication;
  - Cloud Firestore;
  - Firebase Storage.
- **Expo Web Browser** and **Expo Auth Session** for authentication support.

### Backend/API

- **Python 3.11** runtime in the Docker image.
- **FastAPI** for HTTP API routes.
- **Uvicorn** as the ASGI server.
- **Pydantic** request validation through FastAPI models.
- **python-multipart** for image upload handling.
- **Pillow** for image decoding, RGB conversion, resizing, and validation.
- **python-dotenv** for environment configuration.
- **Ultralytics YOLO** for object detection.
- **PyTorch/Torchvision** for the YOLO runtime.
- **Google GenAI SDK** for Gemini Vision fallback recognition.
- **Requests** for Groq and YouTube Data API calls.
- **ThreadPoolExecutor** for concurrent YouTube searches.

### AI and external services

- **YOLOv8n COCO model** as the current primary detector.
- **Gemini Vision** for low-confidence/unmapped/no-detection fallback.
- **Groq OpenAI-compatible chat-completions API** for reuse ideas.
- **YouTube Data API v3** for real tutorial links.
- **Firebase Authentication, Firestore, and Storage** for user data.
- **Google Cloud Run** as the intended backend deployment target.
- **EAS Build** configuration is included for Expo builds.

### Development and deployment

- npm and Expo CLI for the mobile app.
- Python virtual environment and pip for the backend.
- Docker for backend packaging.
- Google Colab/Kaggle workflow documented in the training notebook.
- Git/GitHub repository: `pranvxag/ai-waste-app`.

## 6. Repository Structure

```text
ai-waste-app/
├── README.md
├── CONTRIBUTING.md
├── project info.md                 # this project report
├── skills-lock.json
├── .gitignore
│
├── ReLeaf/                         # Expo React Native application
│   ├── App.js                      # navigation and provider root
│   ├── index.js                    # Expo entry point
│   ├── package.json                # npm dependencies and scripts
│   ├── package-lock.json
│   ├── app.json                    # Expo app metadata and native settings
│   ├── eas.json                    # EAS build profiles
│   ├── tsconfig.json               # Expo TypeScript base configuration
│   ├── firebase.json               # Firebase service configuration
│   ├── firestore.rules             # Firestore security rules
│   ├── storage.rules               # Storage security rules
│   ├── .firebaserc
│   ├── assets/                     # icons, splash assets, favicon
│   ├── android/                    # generated/native Android project
│   └── src/
│       ├── firebase.js             # Firebase initialization
│       ├── api/
│       │   ├── config.js           # backend URL and AsyncStorage setting
│       │   └── predict.js          # prediction, reuse, and waste-info calls
│       ├── components/
│       │   ├── CloseButton.js
│       │   ├── MaterialIdCard.js
│       │   ├── PrimaryButton.js
│       │   ├── SecondaryButton.js
│       │   └── StepItem.js
│       ├── context/
│       │   ├── AuthContext.js      # Firebase auth/profile state
│       │   └── ScanHistoryContext.js
│       ├── screens/
│       │   ├── LoginScreen.js
│       │   ├── HomeScreen.js
│       │   ├── ScanScreen.js
│       │   ├── ResultScreen.js
│       │   ├── HistoryScreen.js
│       │   ├── ImpactScreen.js
│       │   └── SettingsScreen.js
│       ├── services/
│       │   ├── firestore.js        # user profiles and scan documents
│       │   └── scanStorage.js      # image upload/delete
│       ├── theme/
│       │   ├── theme.js             # colors, typography, spacing, radii
│       │   └── useAppFonts.js
│       └── utils/
│           ├── exampleObjects.js
│           ├── formatting.js        # buckets, labels, relative times
│           └── logging.js           # redacted client logger and IDs
│
├── backend/                         # FastAPI recognition and AI services
│   ├── main.py                      # API app and pipeline orchestration
│   ├── config.py                    # environment-driven configuration
│   ├── yolo_service.py              # YOLO loading, detection, class mapping
│   ├── gemini_service.py            # Gemini Vision fallback
│   ├── llm_service.py               # Groq ideas and YouTube search
│   ├── waste_data.py                # fixed classes and disposal guidance
│   ├── logging_utils.py             # structured/redacted request logs
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── README.md
│   └── model/                       # model artifacts; large files are ignored
│       ├── yolov8n.pt               # current runtime detector
│       ├── class_names.json         # training/reference class order
│       └── waste_classifier.keras   # training/reference artifact if present
│
└── docs/
    ├── Project_Plan.docx            # original scope and architecture plan
    └── waste_classifier_training.ipynb
                                      # MobileNetV2 training/reference notebook
```

## 7. Frontend Application Structure

### App root and navigation

`App.js` composes the application in this order:

1. `SafeAreaProvider`;
2. `AuthProvider`;
3. authentication/loading gate;
4. `ScanHistoryProvider` for authenticated users;
5. native stack containing:
   - `MainTabs`;
   - `Scan`;
   - `Result`.

The bottom tab bar contains Home, History, a floating camera action, Impact,
and Settings. The camera tab is a placeholder route whose press event is
intercepted to navigate directly to the scan screen.

### Screens

- **Login:** email sign-in, email registration, and Google-token sign-in.
- **Home:** project introduction, current scan statistics, recent scans, and
  example objects that use `/waste-info`.
- **Scan:** camera capture or gallery selection, permissions, preview, and
  “Identify this item”.
- **Result:** predicted item, confidence/source, category, disposal guidance,
  reuse ideas, video links, and more-ideas actions.
- **History:** authenticated user's saved scans and removal actions.
- **Impact:** counts by disposal bucket and total points.
- **Settings:** backend URL configuration, account/settings actions.

### Frontend state

`AuthContext` manages the Firebase user and profile. `ScanHistoryContext` is
the single source of truth for:

- scan records;
- total scan count;
- total points;
- counts by disposal bucket;
- local cache and Firestore synchronization;
- image upload and deletion coordination.

Duplicate saves are prevented with pending-save and completed-scan tracking.
Failed Firestore saves clean up an already-uploaded Storage image where
possible.

## 8. Backend Modules

### `main.py`

Creates the FastAPI application, configures CORS, performs startup warm-up, and
implements:

- `/health`;
- `/predict`;
- `/waste-info/{predicted_class}`;
- `/enhance-reuse`.

It also validates upload type/size, converts images to RGB, normalizes YOLO and
Gemini outputs into one response shape, and attaches correlation IDs to logs.

### `config.py`

Centralizes:

- `PORT`;
- `MAX_UPLOAD_BYTES` (default 10 MiB);
- `CORS_ORIGINS`;
- `YOLO_MODEL_PATH`;
- `YOLO_CONFIDENCE_THRESHOLD` (default `0.70`);
- Gemini model and timeout settings;
- server-side Gemini credentials.

### `yolo_service.py`

Loads YOLO lazily and safely, performs CPU inference, selects the highest
confidence detection, and maps model labels to application waste classes.

The current map intentionally only maps unambiguous COCO food labels to
`biological`. Labels such as `bottle`, `cup`, and `book` are not mapped because
the COCO model cannot reliably infer their material. Those results are routed
to Gemini instead of being guessed.

### `gemini_service.py`

Sends the original image to Gemini Vision when the YOLO result is not trusted.
The prompt requires a strict JSON result with:

- object;
- material;
- category;
- bucket;
- disposal;
- reusable;
- confidence;
- identified flag.

Responses are parsed, normalized, constrained to valid buckets, and rejected
when essential information is absent.

### `waste_data.py`

Contains fixed guidance for the 12 built-in classes:

`battery`, `biological`, `brown-glass`, `green-glass`, `white-glass`,
`cardboard`, `clothes`, `metal`, `paper`, `plastic`, `shoes`, and `trash`.

It defines both human-readable category/disposal data and the canonical
five-bucket mapping.

### `llm_service.py`

Requests exactly three practical reuse ideas from Groq. It supports an
exclusion list so “More ideas” requests avoid previously displayed ideas.
Each idea is then searched independently through YouTube Data API. Ideas with a
video are ordered before text-only ideas while preserving order within each
group.

## 9. Complete Functional Workflows

### Workflow A: first launch and authentication

1. Expo launches `App.js`.
2. Firebase configuration is read from `EXPO_PUBLIC_FIREBASE_*` variables.
3. If Firebase is not configured, the login screen explains the setup need.
4. If configured, Firebase Auth restores an existing session.
5. New users can register with email/password or sign in with email/password.
6. Google sign-in can exchange a Google ID token for a Firebase credential.
7. The user profile is created or refreshed in `users/{uid}`.
8. Authenticated users enter the main tab/scan application.

### Workflow B: taking or selecting a photo

1. User taps the floating camera button.
2. `ScanScreen` requests camera or media-library permission.
3. The user takes a photo or selects one from the gallery.
4. The app displays a preview.
5. The user confirms identification.
6. A scan correlation ID is generated for client/backend tracing.

### Workflow C: prediction request

1. The client resolves the backend URL from AsyncStorage, falling back to
   `https://releaf.cloud.run`.
2. On native platforms, `expo-file-system` uploads the file as multipart data.
3. On web, a browser `Blob` is appended to `FormData`.
4. The request is sent to `POST /predict` with `X-Request-ID`.
5. The backend accepts only JPEG/PNG/JPG and limits the request to 10 MiB.
6. Pillow decodes the image and converts it to RGB.
7. YOLO runs with a low reporting floor of `0.10`.
8. The highest-confidence detection is selected.
9. The detection is trusted only if:
   - its label maps to a known waste class; and
   - its confidence is at least `0.70`.
10. Otherwise, the original image is resized when necessary and passed to
    Gemini Vision.
11. The result is normalized into a common response shape.
12. If neither engine can identify the item, the backend returns HTTP `422`
    with a plain-language retry message.

### Workflow D: reuse recommendations

1. After a successful prediction, the Result screen calls
   `POST /enhance-reuse`.
2. The backend asks Groq for three concrete reuse/upcycling ideas.
3. It searches YouTube once per idea in parallel.
4. Results include idea text plus either video metadata or `null`.
5. The Result screen displays video-backed ideas first.
6. When the user taps “More ideas”, the app sends all visible idea strings in
   `exclude`.
7. The backend asks the LLM not to repeat them and applies an exact-match
   duplicate filter.
8. New ideas are appended to the existing list.
9. Missing Groq/YouTube keys or service failures produce a clean empty result
   rather than breaking classification or disposal guidance.

### Workflow E: saving scan history

1. The result is assigned a scan ID.
2. The client uploads the image to:
   `users/{uid}/scans/{scanId}.{extension}` in Firebase Storage.
3. The client writes scan metadata to:
   `users/{uid}/scans/{scanId}` in Firestore.
4. The metadata includes the class, confidence, material, disposal guidance,
   category, bucket, detection source, image URL, Storage path, AI ideas, and
   points.
5. The context updates the in-memory list and local AsyncStorage cache.
6. Firestore listeners keep history synchronized for the authenticated user.
7. Removing a scan deletes its Firestore document and Storage image.

### Workflow F: example object from Home

1. The user taps an example object.
2. The app calls `GET /waste-info/{predicted_class}`.
3. The backend returns fixed category, disposal, and bucket data without image
   recognition.
4. Reuse ideas are still requested separately through `/enhance-reuse`.

### Workflow G: backend startup and warm-up

1. Uvicorn starts FastAPI.
2. Lifespan startup creates daemon warm-up threads.
3. YOLO is loaded and performs a throwaway inference.
4. Gemini's SDK/client is initialized without spending API quota.
5. The server can answer `/health` while warm-up proceeds.
6. A scan arriving during warm-up waits on the relevant shared loading logic.

## 10. API Reference

### `GET /health`

Example response:

```json
{
  "status": "ok",
  "model_ready": true,
  "gemini_configured": true
}
```

`model_ready` reports YOLO availability. `gemini_configured` reports whether a
Gemini key is present; the service can still respond without Gemini, but loses
its fallback path.

### `POST /predict`

- Content type: `multipart/form-data`
- File field: `file`
- Optional header: `X-Request-ID`

Successful normalized response:

```json
{
  "predicted_class": "plastic",
  "confidence": 0.94,
  "category": "recyclable (check resin code)",
  "disposal": "Rinse and place in plastic recycling...",
  "bucket": "recyclable",
  "source": "yolo",
  "material": "plastic",
  "reusable": false
}
```

`source` is `yolo` or `gemini`. The endpoint returns:

- `400` for unsupported or unreadable images;
- `413` for images over the configured size;
- `422` when neither recognition engine can identify the item;
- `429` when Gemini quota/rate limits are reached.

### `GET /waste-info/{predicted_class}`

Returns fixed category, disposal guidance, and bucket for a known class. It is
used by the Home screen's examples.

### `POST /enhance-reuse`

Request:

```json
{
  "predicted_class": "cardboard",
  "category": "recyclable",
  "exclude": ["Make a desk organizer from the cardboard"]
}
```

Response:

```json
{
  "ai_ideas": [
    {
      "idea": "Create a drawer organizer from the cardboard.",
      "video": {
        "video_id": "example-id",
        "title": "Cardboard drawer organizer tutorial",
        "url": "https://www.youtube.com/watch?v=example-id",
        "thumbnail_url": "https://img.youtube.com/vi/example-id/hqdefault.jpg"
      }
    }
  ]
}
```

The endpoint normally returns up to three ideas. Service/key failures return
`{"ai_ideas": []}` so the core scan result remains usable.

## 11. Waste Classification and Data Model

### Built-in classes

| Class | Human category | Bucket |
|---|---|---|
| battery | hazardous | hazardous |
| biological | compostable | compostable |
| brown-glass | recyclable | recyclable |
| green-glass | recyclable | recyclable |
| white-glass | recyclable | recyclable |
| cardboard | recyclable | recyclable |
| clothes | reusable / textile recycling | reuse |
| metal | recyclable | recyclable |
| paper | recyclable | recyclable |
| plastic | recyclable, check resin code | recyclable |
| shoes | reusable / textile recycling | reuse |
| trash | general waste | general |

### Response fields

- `predicted_class`: fixed class or Gemini's free-text object name;
- `confidence`: normalized value from 0 to 1;
- `category`: human-readable classification;
- `disposal`: practical disposal instructions;
- `bucket`: one of the five UI-supported bucket keys;
- `source`: recognition engine that produced the result;
- `material`: material description;
- `reusable`: whether reuse is recommended.

## 12. Model and Training Information

### Current runtime model

The current backend loads **YOLOv8n pretrained on COCO**. COCO is a general
object dataset, not a waste-material dataset. Therefore, the application
deliberately maps only food labels such as banana, apple, pizza, and carrot to
the `biological` class. Ambiguous labels are escalated to Gemini.

This design is safer than mapping COCO's `bottle` directly to plastic or glass:
the model does not have enough information in that label to make that material
decision.

### Training/reference notebook

`docs/waste_classifier_training.ipynb` documents a separate training path:

- Kaggle `mostafaabla/garbage-classification` dataset;
- 12 waste classes;
- 224 x 224 image input;
- 80/20 training-validation split;
- MobileNetV2 transfer learning;
- data augmentation with flip, rotation, and zoom;
- frozen-base training followed by optional fine-tuning;
- early stopping;
- Keras model and `class_names.json` export.

This notebook is a **reference/training artifact**. Its MobileNetV2/Keras
output is not currently loaded by the FastAPI runtime, which uses Ultralytics
YOLO. To use a custom waste-trained YOLO model, set `YOLO_MODEL_PATH` and
update `YOLO_CLASS_MAP` so model labels map to the application's waste
classes.

## 13. Data Storage and Security

### Firebase Authentication

- Email/password registration and sign-in are implemented.
- Google credentials can be exchanged for Firebase credentials.
- Auth persistence uses AsyncStorage on native platforms.
- The main application is gated behind authentication when Firebase is
  configured.

### Firestore

Data is stored under:

```text
users/{uid}
users/{uid}/scans/{scanId}
```

Firestore rules allow a user to read/write only their own profile and scans.
The client also checks that the requested UID matches the currently
authenticated Firebase UID before making operations.

### Firebase Storage

Scan images are stored below:

```text
users/{uid}/scans/{scanId}.{extension}
```

Storage rules restrict read/write/delete access to the matching authenticated
user and enforce a 10 MiB image limit with JPEG, PNG, or WebP content types.

### Backend secrets

The backend expects these environment variables:

- `GEMINI_API_KEY`;
- `GROQ_API_KEY`;
- `YOUTUBE_API_KEY`.

They must remain in backend environment configuration or a secret manager.
They are never sent to the mobile application or returned by API responses.

### Logging privacy

Both client and backend logging use correlation IDs and redact sensitive fields
such as API keys, tokens, authorization values, email addresses, image URLs,
and Storage paths. The backend logs event type, source, bucket, timing-related
diagnostics, and error types without logging credentials.

## 14. Configuration

### Backend variables

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | HTTP port | `8080` |
| `MAX_UPLOAD_BYTES` | upload limit | `10485760` |
| `CORS_ORIGINS` | comma-separated allowed origins | `*` |
| `YOLO_MODEL_PATH` | YOLO weights path | `backend/model/yolov8n.pt` |
| `YOLO_CONFIDENCE_THRESHOLD` | trust threshold | `0.70` |
| `GEMINI_MODEL` | Gemini model name | configured in `config.py` |
| `GEMINI_API_KEY` | Gemini credential | none |
| `GROQ_API_KEY` | Groq credential | none |
| `YOUTUBE_API_KEY` | YouTube credential | none |

### Frontend variables

Firebase values are read from:

- `EXPO_PUBLIC_FIREBASE_API_KEY`;
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`;
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`;
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`;
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`;
- `EXPO_PUBLIC_FIREBASE_APP_ID`.

The backend URL defaults to `https://releaf.cloud.run` and can be overridden
from the Settings screen. The selected URL is stored in AsyncStorage, so a
network or local development endpoint can be changed without rebuilding.

## 15. Local Setup and Runbook

### Backend

From `backend/`:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create a backend `.env` with the required server-side keys, then run:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Check:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

Allow the server time to warm up before the first scan. For a phone on the same
network, configure the machine's reachable backend address in the app Settings
screen rather than using `localhost`.

### Frontend

From `ReLeaf/`:

```bash
npm install
npx expo start
```

Use Expo Go, an Android emulator, an iOS simulator, or Expo web. Configure
Firebase variables before testing authentication and cloud history.

### Recommended smoke-test order

1. `/health` reports the expected model/key status.
2. Test `/predict` with a food image to exercise the mapped YOLO path.
3. Test an ambiguous object to exercise Gemini fallback.
4. Test `/enhance-reuse` with and without optional keys.
5. Test camera and gallery permissions in the app.
6. Confirm the result page displays bucket, disposal, and reuse sections.
7. Confirm a scan appears in History and Impact.
8. Confirm sign-out/sign-in restores only the authenticated user's history.
9. Confirm deletion removes both Firestore metadata and the Storage image.

## 16. Deployment

### Backend Docker deployment

The Dockerfile:

1. uses `python:3.11-slim`;
2. installs native libraries required by image/YOLO dependencies;
3. installs `requirements.txt`;
4. copies the backend source and model;
5. verifies `model/yolov8n.pt` exists;
6. starts Uvicorn on `0.0.0.0` and Cloud Run's `PORT`.

Cloud Run deployment must provide model artifacts and secrets through the
deployment environment or a secret manager. The current documented service URL
is `https://releaf.cloud.run`.

### Mobile builds

`ReLeaf/eas.json` contains development, preview, and production profiles.
`app.json` identifies the Android package as `com.releaf.app`, configures
portrait orientation, icons, plugins, and the EAS project ID.

## 17. Error Handling and Reliability

- Invalid file types are rejected with a clear HTTP 400 response.
- Oversized images are rejected with HTTP 413.
- Unreadable images are rejected before model inference.
- Missing/broken YOLO weights cause fallback behavior rather than a server
  crash.
- YOLO inference failures route to Gemini.
- Gemini timeout, malformed output, or inability to identify returns a clean
  “could not identify” state.
- Gemini rate limits are reported separately with HTTP 429.
- Reuse service failures return an empty idea list without invalidating the
  classification result.
- Client save failures clean up partially uploaded images when possible.
- Correlation IDs connect client, `/predict`, and `/enhance-reuse` events.

## 18. Current Limitations and Risks

1. **The default YOLO model is not waste-specific.** Most non-food scans
   depend on Gemini until a waste-trained detector is integrated.
2. **Gemini and Groq require external network access and API keys.**
3. **Free-tier quotas can limit repeated demonstrations.**
4. **CORS defaults to `*` for demo convenience.** A public production service
   should restrict allowed origins.
5. **Disposal rules vary by municipality.** The app provides practical general
   guidance, but users should check local regulations.
6. **Single-object assumption.** The detector returns the most prominent object,
   not a complete multi-object waste audit.
7. **AI recommendations are best-effort.** Generated suggestions should be
   checked for safety and suitability before use.
8. **The backend stores no prediction history itself.** History depends on the
   authenticated client's Firebase configuration and permissions.
9. **The training notebook and runtime model are different approaches.** The
   MobileNetV2 notebook must not be described as the current production
   inference model.
10. **Image URLs and cloud records require correct Firebase rules and
    configuration.** A misconfigured Firebase project disables cloud history
    even if local prediction works.

## 19. Future Improvements

- Train and deploy a custom YOLO model on the 12 waste classes.
- Add municipality-specific disposal rules and location-aware guidance.
- Add confidence visualization and user feedback/correction.
- Support multi-object detection and item-by-item sorting.
- Add automated backend and frontend tests for API contracts and persistence.
- Add rate limiting, authentication, and tighter CORS for public deployment.
- Add analytics that do not expose personal data.
- Add offline example guidance and a clearly labeled offline mode.
- Improve accessibility, localization, and support for more languages.
- Add an admin/model evaluation workflow with confusion matrices and test sets.

## 20. Source-of-Truth Files

For future maintenance, the main source files are:

- [README.md](README.md): project overview and quick architecture;
- [CONTRIBUTING.md](CONTRIBUTING.md): conventions and development workflow;
- [backend/README.md](backend/README.md): backend setup/API/testing guidance;
- [ReLeaf/README.md](ReLeaf/README.md): mobile setup and testing guidance;
- [backend/main.py](backend/main.py): API orchestration;
- [backend/yolo_service.py](backend/yolo_service.py): detector and class map;
- [backend/gemini_service.py](backend/gemini_service.py): vision fallback;
- [backend/llm_service.py](backend/llm_service.py): reuse/video integrations;
- [backend/waste_data.py](backend/waste_data.py): fixed disposal information;
- [ReLeaf/App.js](ReLeaf/App.js): navigation and app providers;
- [ReLeaf/src/context/ScanHistoryContext.js](ReLeaf/src/context/ScanHistoryContext.js):
  persisted scan state;
- [ReLeaf/src/api/predict.js](ReLeaf/src/api/predict.js): client API calls;
- [ReLeaf/firestore.rules](ReLeaf/firestore.rules) and
  [ReLeaf/storage.rules](ReLeaf/storage.rules): Firebase access controls;
- [docs/waste_classifier_training.ipynb](docs/waste_classifier_training.ipynb):
  model-training reference.

## 21. Conclusion

ReLeaf is a full-stack environmental-education prototype with a mobile-first
user experience and an AI-assisted waste workflow. Its strongest architectural
decision is the separation between reliable disposal information and
best-effort generative recommendations: classification and disposal remain
usable even when the optional reuse services are unavailable. The project is
ready for demonstration with the existing YOLO/Gemini pipeline, while the
training notebook and class-mapping design provide a clear path toward a
custom waste-specific detector.
