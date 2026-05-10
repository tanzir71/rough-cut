# RoughCut

Local-first AI assistant for video editors (MVP).

RoughCut is a desktop app that helps you ingest footage, transcribe locally, build a transcript-based rough cut, optionally generate selects with an LLM, and export cleanly to NLEs (Premiere/Resolve/FCP) via XML/EDL plus an MP4 preview package.

This repository contains:
- `app-mvp/`: the desktop app (Electron + React) + local backend services (FastAPI + Postgres/Redis/MinIO via Docker)
- `landing-page/`: the static landing page (React + Vite) deployed to GitHub Pages

## If you just want to run it (beginner-friendly)

### What you need installed

1. Git (to download the code)
2. Docker Desktop (to run Postgres/Redis/MinIO + the API/worker containers)
3. Node.js 20+
4. pnpm

On Windows, make sure Docker Desktop is running before you start.

### Step-by-step: run the MVP app

From the repo root:

```bash
cd app-mvp
```

1) Start the local services (database, queue, storage, API, worker):

```bash
docker compose up -d
```

2) Install frontend dependencies:

```bash
pnpm -C frontend install
```

3) Start the desktop app (Vite dev server + Electron):

```bash
pnpm -C frontend dev
```

What you should see:
- A desktop window opens (Electron).
- Backend API is available at `http://localhost:8000` (from Docker).
- MinIO console is available at `http://localhost:9001` (login: `minio` / `minio12345`).

### Basic workflow inside the app

1. Create a project.
2. Upload a video file.
3. Wait for ingest to finish (upload → transcribe → proxy generation).
4. Browse/search the transcript and add segments to the timeline.
5. Export XML/EDL/MP4 and download the package.

### Optional: run fully offline LLM suggestions (Ollama)

RoughCut can suggest transcript selects using a local Ollama model (offline) or OpenRouter (optional).

1) Install Ollama: https://ollama.com

2) Pull a model (example):

```bash
ollama pull qwen2.5:7b-instruct
```

3) Make sure Ollama is running locally on port `11434`.

The Dockerized backend is configured to reach Ollama via `http://host.docker.internal:11434` (see `app-mvp/docker-compose.yml`).

If you don’t want LLM features, you can ignore this.

### Export note (important for beginners)

The Export UI asks for an “Output folder path”. In Docker-based dev, the backend runs inside a container, so Windows/macOS host paths are not automatically writable from inside the container.

What works reliably in Docker dev:
- Use the “Download export package” link after the export finishes (it serves a pre-signed download from MinIO).
- If you must type a folder path, use a container path like `/tmp/app-mvp` instead of a host path like `C:\...`.

## Troubleshooting

### “Docker is not running” / services won’t start

- Start Docker Desktop.
- Re-run:

```bash
cd app-mvp
docker compose up -d
```

### Port already in use (8000 / 5432 / 6379 / 9000 / 9001)

Stop the conflicting service, or change ports in `app-mvp/docker-compose.yml`.

### The app opens but uploads/transcription don’t progress

- Check the worker container logs:

```bash
cd app-mvp
docker compose logs -f --tail=200 worker
```

- Check the API container logs:

```bash
cd app-mvp
docker compose logs -f --tail=200 api
```

### Transcription is slow

- The default Whisper model is small/tiny and runs on CPU by default.
- You can adjust `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` in `app-mvp/docker-compose.yml` or via `.env`.

## Repo map (for developers)

### app-mvp/

High level:
- `frontend/`: Electron + React UI (renderer + Electron main/preload)
- `backend/`: FastAPI API + Celery worker + SQLAlchemy models + exporters
- `docker-compose.yml`: runs Postgres, Redis, MinIO, API, worker
- `samples/`: sample media + smoke test scripts

#### Backend: request/worker flow

The API is FastAPI and exposes `/api/*` routes. The worker is Celery and executes long-running jobs (ingest/transcribe/proxy/export).

Key entrypoints:
- `backend/api/main.py`: FastAPI app and router registration
- `backend/workers/celery_app.py`: Celery app configuration
- `backend/workers/tasks.py`: background pipelines (ingest + export)

Data model:
- `backend/models/`: SQLAlchemy models for Projects, Videos, TranscriptSegments, Timeline, Jobs, ExportJob, etc.
- `backend/api/schemas.py`: Pydantic request/response schemas

Storage:
- Uses MinIO (S3-compatible) as object storage.
- Buckets are created at API startup.
- Media keys are stored under `projects/<project_id>/...`

Exports:
- `backend/core/exporters/edl.py`: CMX3600 EDL writer
- `backend/core/exporters/fcp7xml.py`: FCP7-style XML (XMEML) writer
- `backend/core/exporters/package.py`: builds ZIP (XML/EDL/preview/assets), uploads it to MinIO, and returns a pre-signed download URL via the API

Media pipeline:
- `backend/core/ffmpeg.py`: ffmpeg helpers (audio extraction, proxy generation, crossfade render)
- Ingest pipeline runs:
  1. assemble upload parts → store original
  2. transcribe via faster-whisper → store transcript segments
  3. generate proxy MP4 → mark video READY

LLM integration:
- `backend/core/llm.py`: LLM adapter logic
- `backend/api/routers/llm.py`: API endpoints for suggestions
- Defaults: Ollama local; OpenRouter is optional and can be enabled via env vars

#### Frontend: UI ↔ API flow

The Electron renderer talks to the backend API via fetch:
- `frontend/src/utils/api.ts`: typed API client used by UI components

Upload flow (simplified):
1. `initUpload()` creates an upload session
2. `uploadChunk()` streams chunks
3. `completeUpload()` starts the ingest job
4. UI polls `getJob()` for status

Export flow (simplified):
1. `startExport()` queues an export job
2. UI polls `getJob()` and `getExport()`
3. `getExport()` returns `download_url` (pre-signed) once ready

Electron bridge:
- `frontend/electron/main.ts` and `frontend/electron/preload.ts` expose limited desktop helpers (like directory picker) to the renderer via `window.desktop`.

### landing-page/

Static marketing site:
- `landing-page/src/pages/Home.tsx`: main content
- Built with Vite; deploys to GitHub Pages via GitHub Actions workflow at `.github/workflows/landing-page-deploy.yml`.

Local dev:

```bash
cd landing-page
pnpm install
pnpm run dev
```

## Development commands

From `app-mvp/`:
- Start/stop services:

```bash
docker compose up -d
docker compose down
```

- Run backend tests (inside Docker):

```bash
pnpm run backend:test
```

- Run TypeScript checks / lint:

```bash
pnpm -C frontend check
pnpm -C frontend lint
```

## Environment variables (backend)

The backend reads environment variables via `backend/core/config.py`. The Docker compose file provides defaults.

Example values are in:
- `app-mvp/.env.example`

The most relevant knobs:
- `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`
- `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
- `OPENROUTER_ENABLED`, `OPENROUTER_API_KEY`

## Notes for LLM coders (how to extend the project safely)

When making changes, start by locating the flow you want to modify:

- New API endpoint:
  - Add a router function under `backend/api/routers/`
  - Add request/response models in `backend/api/schemas.py` if needed
  - Wire it into `backend/api/main.py` (router include)

- New background job:
  - Add a Celery task in `backend/workers/tasks.py`
  - Track progress via `_job_update()` so the UI can show status/progress

- New export format:
  - Implement under `backend/core/exporters/`
  - Add it to the packaging step in `backend/core/exporters/package.py`

- Frontend features:
  - Add API calls in `frontend/src/utils/api.ts`
  - Use components under `frontend/src/components/` and pages under `frontend/src/pages/`

Where bugs usually live:
- Path handling between Electron (host paths) and Docker (container paths)
- ffmpeg compatibility (codecs, missing binaries)
- Large uploads (chunking/reassembly, temp storage)
- Race conditions between API status and worker progress updates
