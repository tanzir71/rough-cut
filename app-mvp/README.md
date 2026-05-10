# app-mvp — Local-first Rough Cut Assistant (MVP)

A fully local-first desktop assistant for video editors:
- Upload/import media
- Local transcription (faster-whisper)
- Transcript-based selects + rough cut timeline
- Optional prompt-based selects using Ollama (offline) or OpenRouter (optional)
- Export: EDL + FCP7-style XML + MP4 preview (H.264 1080p) packaged as a ZIP

## Stack
- Client: Electron + React 18 + TypeScript + TailwindCSS + shadcn/ui
- Backend: FastAPI + SQLAlchemy + Alembic
- DB: Postgres (Docker)
- Queue: Redis + Celery (Docker)
- Storage: MinIO (S3-compatible, Docker)
- ASR: faster-whisper (local model)
- LLM: Ollama default, OpenRouter optional
- Media: ffmpeg server-side; Remotion Player for preview

## Quickstart
### 1) Start local services
From `app-mvp/`:

```bash
docker compose up -d
```

Services:
- API: `http://localhost:8000`
- MinIO console: `http://localhost:9001`

### 2) Install frontend deps
From `app-mvp/`:

```bash
pnpm -C frontend install
```

### 3) Run the Electron app
```bash
pnpm -C frontend dev
```

## LLM modes
- Local only: uses Ollama (no internet)
- OpenRouter only: uses OpenRouter (you provide the key in Settings)
- Local first: try Ollama, fall back to OpenRouter

The OpenRouter key is stored locally in the Electron user config file and only sent to the backend when needed.

## Export behavior
- Produces a ZIP containing:
  - `sequence.edl`
  - `sequence.xml`
  - `preview.mp4`
  - `assets/` proxy media used for the preview and XML references

## Samples
See [samples/README.md](samples/README.md) for the included sample video, expected outputs, and smoke-test scripts.

## Development scripts
From `app-mvp/`:
- `pnpm run services:up`
- `pnpm run services:down`
- `pnpm run services:logs`
- `pnpm run frontend:dev`
- `pnpm run backend:test`

## Notes / MVP limitations
- Speaker detection uses simple heuristics (not pyannote).
- Topic tagging uses lightweight local clustering.
- XML export is FCP7-style (XMEML) for MVP.
