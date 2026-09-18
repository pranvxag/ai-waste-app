# Contributing

Welcome — this doc is for teammates picking this project up for the first time.
Read this, then `README.md`, then whichever of `backend/README.md` or
`ReLeaf/README.md` matches what you're working on.

## What this project is

An EVS-I app: photograph a waste item → YOLO identifies it, with Gemini Vision taking
over when YOLO isn't confident → app shows disposal instructions + reuse/upcycling ideas
(AI-generated per scan, each optionally paired with a real YouTube tutorial link). Full background and
the original scope decision is in `docs/Project_Plan.docx` — worth reading once for context on *why*
things are built this way, not just *how*.

## Project layout

```
ai-waste-app/
  backend/            Python, FastAPI. Runs the recognition pipeline, serves all API endpoints.
    main.py           API routes (/health, /predict, /waste-info, /enhance-reuse) +
                       the YOLO/Gemini orchestration in /predict
    config.py         Thresholds, model path, API key loading. One place for all of it.
    yolo_service.py   YOLO detection (primary) + the class map onto waste categories
    gemini_service.py Gemini Vision (fallback for low-confidence detections)
    waste_data.py     Static category + disposal data per material class (no reuse
                       ideas - those are always AI-generated, see llm_service.py)
    llm_service.py    Groq (AI reuse ideas) + YouTube Data API integration
    model/            Model weights live here (not in git — see backend/README.md)
    .env              API keys (not in git)

  ReLeaf/             Expo (React Native) app
    App.js            Navigation root (tab navigator + Scan/Result stack on top)
    src/
      theme/          Design tokens — colors, type, spacing. Change the look here, not per-screen.
      context/        ScanHistoryContext — all persisted app state (scans, counts)
      api/            Backend calls (predict.js) + backend URL config
      utils/          formatting.js — material class -> disposal bucket/color/icon mapping
      components/     Reusable UI pieces (buttons, cards)
      screens/        HomeScreen, ScanScreen, ResultScreen, HistoryScreen, ImpactScreen, SettingsScreen

  docs/               Project plan doc, training notebook
```

## Setup

Follow `backend/README.md` and `ReLeaf/README.md` fully before touching code — both
have a "what to test first" checklist at the end. Confirm your local setup passes
those checklists before starting on a new task; it isolates "my environment is broken"
from "my code change is broken."

## Conventions

**Design tokens, not hardcoded values.** Colors, fonts, spacing, and border radii all
live in `ReLeaf/src/theme/theme.js`. If you're writing a new screen or component and
reaching for a hex code or a raw pixel number, stop — either it already exists in
`theme.js`, or it should be added there so the rest of the app can reuse it.

**Category colors are semantic, not decorative.** The five disposal buckets
(recyclable/compostable/hazardous/reuse/general) each have one fixed color and icon,
defined once in `src/utils/formatting.js`. Never introduce a different color for the
same bucket in a new screen — pull from `getBucketMeta()` instead.

**Reuse ideas are AI-only, by design — there is no static fallback list.** `/enhance-reuse`
is called automatically once per scan (for the initial "Reuse ideas" batch) and again
on each "More ideas" tap. It's allowed to fail silently (empty result, no error to the
user) — but that empty state is the correct behavior, not a bug to "fix" by adding a
hardcoded list back in. Never make disposal info or the classification itself depend
on the AI endpoint, though: those two must keep working even if Groq/YouTube are down
or unconfigured.

**YOLO is primary, Gemini is the fallback — and neither may guess.** `/predict` trusts
YOLO only when it clears `YOLO_CONFIDENCE_THRESHOLD` *and* its label maps to a known waste
class in `yolo_service.YOLO_CLASS_MAP`. Everything else escalates the original image to
Gemini. That map is deliberately small: the default COCO model can't tell a plastic bottle
from a glass one, so adding `"bottle": "plastic"` would produce confident wrong answers for
half of all bottles. **Leaving a class out of the map is a feature** — it routes to a model
that can actually look at the material. If neither engine is sure, `/predict` returns 422
and the app says so; never add a "best guess" default. Change the threshold in `config.py`
only — it must not be duplicated anywhere else.

**Reuse ideas come back video-first.** `/enhance-reuse` sorts ideas so the ones with a
YouTube tutorial come before the text-only ones, and the app renders them in the order it
receives them. Keep the sort on the backend (one place, both sections) rather than sorting
in the screen, and keep it stable so the model's own ordering survives within each group.
Each "More ideas" batch is sorted on its own and appended — don't re-sort the whole list
when new ideas arrive, or cards the user is already reading will jump around.

**Scan history is the single source of truth for app state.** Total counts, the Impact
screen, and the Home screen's "recently scanned" strip all derive from
`ScanHistoryContext`'s `scans` array — don't create a second, separate counter or
duplicate storage for something derivable from `scans`.

**Backend changes:** add new category/disposal data to `waste_data.py`'s `WASTE_INFO`
dict — reuse ideas don't belong here, they're always generated live via `llm_service.py`.
When you add a class there, add its bucket to `BUCKET_BY_CLASS` in the same file and to
`CATEGORY_BY_CLASS` in `ReLeaf/src/utils/formatting.js` — those three must stay in sync,
or the new class renders with the wrong badge colour.

## Workflow

- Branch per task: `yourname/short-description` (e.g. `priya/history-screen-empty-state`).
- Commit messages: plain description of what changed, no strict format required for a
  project this size — just make it clear enough that "what did this commit do" is
  answerable without opening the diff.
- Before merging into `main`: run through the relevant checklist (backend or app) from
  its README, and briefly note in the PR/message what you tested.
- If you're touching both backend and app in one task (e.g., a new field in the
  `/predict` response that the app needs to display), get the backend part working
  and tested via `/docs` *before* wiring up the app side — same principle as isolating
  errors during initial setup.

## Where decisions are recorded

Bigger architecture calls (why FastAPI, why Expo + EAS over a web app, why Groq +
YouTube Data API instead of asking an LLM to generate video links directly) are
recorded as they were made — check with whoever's been driving development if you're
about to propose changing one of these and want the reasoning first. `docs/Project_Plan.docx`
has the original version of this reasoning from before the app existed.

## Getting unstuck

Most setup problems so far have been one of: wrong working directory when running a
command, a package that needed `npx expo install` instead of `npm install`, Metro's
cache serving a stale error after a fix, or the phone and laptop not actually being on
the same network. Check those four before assuming something's fundamentally broken.
