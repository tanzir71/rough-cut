from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "dev"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str

    redis_url: str

    s3_endpoint_url: str
    s3_public_endpoint_url: str = "http://localhost:9000"
    s3_access_key_id: str
    s3_secret_access_key: str
    s3_region: str = "us-east-1"
    s3_bucket_media: str = "media"
    s3_bucket_exports: str = "exports"

    server_base_url: str = "http://localhost:8000"

    storage_tmp_dir: str = "/tmp/app-mvp"

    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"
    whisper_cache_dir: str = "/models"

    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "qwen2.5:7b-instruct"

    openrouter_enabled: bool = False
    openrouter_api_key: str | None = None
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    openrouter_models_csv: str = "qwen/qwen-2.5-72b-instruct"


def get_settings() -> Settings:
    return Settings()

