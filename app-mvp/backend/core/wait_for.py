from __future__ import annotations

import time
from typing import Final

import httpx
from redis import Redis
from sqlalchemy import create_engine

from backend.core.config import get_settings


def wait_for_postgres(database_url: str, timeout_sec: int) -> None:
    deadline = time.time() + timeout_sec
    engine = create_engine(database_url, pool_pre_ping=True)
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            with engine.connect() as conn:
                conn.exec_driver_sql("SELECT 1")
            return
        except Exception as exc:
            last_error = exc
            time.sleep(0.5)
    raise RuntimeError(f"Postgres not ready after {timeout_sec}s: {last_error}")


def wait_for_redis(redis_url: str, timeout_sec: int) -> None:
    deadline = time.time() + timeout_sec
    client = Redis.from_url(redis_url)
    last_error: Exception | None = None
    while time.time() < deadline:
        try:
            client.ping()
            return
        except Exception as exc:
            last_error = exc
            time.sleep(0.5)
    raise RuntimeError(f"Redis not ready after {timeout_sec}s: {last_error}")


def wait_for_http_ready(url: str, timeout_sec: int) -> None:
    deadline = time.time() + timeout_sec
    last_error: Exception | None = None
    with httpx.Client(timeout=5.0) as client:
        while time.time() < deadline:
            try:
                resp = client.get(url)
                if resp.status_code == 200:
                    return
                last_error = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as exc:
                last_error = exc
            time.sleep(0.5)
    raise RuntimeError(f"HTTP endpoint not ready after {timeout_sec}s: {url}. Last error: {last_error}")


def main() -> None:
    s = get_settings()
    timeout_sec: Final[int] = 60
    wait_for_postgres(s.database_url, timeout_sec=timeout_sec)
    wait_for_redis(s.redis_url, timeout_sec=timeout_sec)
    base = s.s3_endpoint_url.rstrip("/")
    wait_for_http_ready(f"{base}/minio/health/ready", timeout_sec=timeout_sec)


if __name__ == "__main__":
    main()

