from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routers.exports import router as exports_router
from backend.api.routers.health import router as health_router
from backend.api.routers.jobs import router as jobs_router
from backend.api.routers.llm import router as llm_router
from backend.api.routers.projects import router as projects_router
from backend.api.routers.timeline import router as timeline_router
from backend.api.routers.uploads import router as uploads_router
from backend.api.routers.videos import router as videos_router
from backend.core.storage import ensure_buckets


def create_app() -> FastAPI:
    app = FastAPI(title="app-mvp-api", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(projects_router, prefix="/api")
    app.include_router(uploads_router, prefix="/api")
    app.include_router(videos_router, prefix="/api")
    app.include_router(timeline_router, prefix="/api")
    app.include_router(exports_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(llm_router, prefix="/api")

    @app.on_event("startup")
    def _startup():
        ensure_buckets()

    return app


app = create_app()

