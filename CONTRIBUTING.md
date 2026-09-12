# Contributing

Welcome — this doc is for teammates picking this project up for the first time.
Read this, then `README.md`, then whichever of `backend/README.md` or
`ReLeaf/README.md` matches what you're working on.

## What this project is

An EVS-I app: photograph a waste item → AI identifies the material → app shows
disposal instructions + reuse/upcycling ideas (a curated list always, plus optional
AI-generated ones with real YouTube links). Full background and the original scope
decision is in `docs/Project_Plan.docx` — worth reading once for context on *why*
things are built this way, not just *how*.

## Project layout

```
ai-waste-app/
  backend/            Python, FastAPI. Runs the trained model, serves all API endpoints.
    main.py           API routes (/health, /predict, /enhance-reuse)
    waste_data.py     Static disposal + reuse-idea data per material class
    llm_service.py    Groq (AI reuse ideas) + YouTube Data API integration
    model/            Trained model files go here (not in git — see backend/README.md)
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

**The static reuse-idea list is the reliability floor.** `/enhance-reuse` (AI-generated
ideas) is additive and allowed to fail silently (empty result, no error to the user).
Never make any core flow — scanning, seeing disposal info, seeing the built-in reuse
ideas — depend on the AI endpoint succeeding.

**Scan history is the single source of truth for app state.** Total counts, the Impact
screen, and the Home screen's "recently scanned" strip all derive from
`ScanHistoryContext`'s `scans` array — don't create a second, separate counter or
duplicate storage for something derivable from `scans`.

**Backend changes:** add new disposal/reuse data to `waste_data.py`'s `WASTE_INFO`
dict, keyed exactly matching `class_names.json` (check casing/hyphenation). Never edit
the classification logic in `main.py` without also checking `class_names.json` order
still matches the trained model — they must stay in sync.

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
