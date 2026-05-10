from __future__ import annotations

from celery import Celery

from backend.core.config import get_settings


def make_celery() -> Celery:
    s = get_settings()
    c = Celery(
        "app_mvp",
        broker=s.redis_url,
        backend=s.redis_url,
        include=["backend.workers.tasks"],
    )
    c.conf.task_track_started = True
    c.conf.worker_prefetch_multiplier = 1
    c.conf.task_acks_late = True
    return c


celery_app = make_celery()

