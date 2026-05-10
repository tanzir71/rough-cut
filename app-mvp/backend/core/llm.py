from __future__ import annotations

import json
from dataclasses import dataclass

import httpx

from backend.core.config import get_settings


@dataclass(frozen=True)
class LlmMessage:
    role: str
    content: str


class LlmProvider:
    async def complete(self, messages: list[LlmMessage]) -> str:
        raise NotImplementedError


class OllamaProvider(LlmProvider):
    async def complete(self, messages: list[LlmMessage]) -> str:
        s = get_settings()
        async with httpx.AsyncClient(timeout=120) as client:
            r = await client.post(
                f"{s.ollama_base_url.rstrip('/')}/api/chat",
                json={
                    "model": s.ollama_model,
                    "messages": [{"role": m.role, "content": m.content} for m in messages],
                    "stream": False,
                },
            )
            r.raise_for_status()
            data = r.json()
            msg = data.get("message") or {}
            return str(msg.get("content") or "")


class OpenRouterProvider(LlmProvider):
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key

    async def complete(self, messages: list[LlmMessage]) -> str:
        s = get_settings()
        api_key = self._api_key or s.openrouter_api_key
        if not api_key:
            raise RuntimeError("OpenRouter API key not configured")
        models = [m.strip() for m in s.openrouter_models_csv.split(",") if m.strip()]
        if not models:
            raise RuntimeError("OpenRouter model list is empty")
        async with httpx.AsyncClient(timeout=120) as client:
            last_err: Exception | None = None
            for model in models:
                try:
                    r = await client.post(
                        f"{s.openrouter_base_url.rstrip('/')}/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": model,
                            "messages": [{"role": m.role, "content": m.content} for m in messages],
                            "temperature": 0.2,
                        },
                    )
                    r.raise_for_status()
                    data = r.json()
                    choice = (data.get("choices") or [{}])[0]
                    msg = choice.get("message") or {}
                    return str(msg.get("content") or "")
                except Exception as e:
                    last_err = e
            raise RuntimeError(f"OpenRouter completion failed: {last_err}")


def get_provider(mode: str, openrouter_api_key: str | None = None) -> LlmProvider:
    s = get_settings()
    m = mode.upper().strip()
    if m == "LOCAL_ONLY":
        return OllamaProvider()
    if m == "OPENROUTER_ONLY":
        return OpenRouterProvider(api_key=openrouter_api_key)
    if m == "LOCAL_FIRST":
        if s.openrouter_enabled and (openrouter_api_key or s.openrouter_api_key):
            return _LocalFirst(OllamaProvider(), OpenRouterProvider(api_key=openrouter_api_key))
        return OllamaProvider()
    return OllamaProvider()


class _LocalFirst(LlmProvider):
    def __init__(self, local: LlmProvider, fallback: LlmProvider):
        self._local = local
        self._fallback = fallback

    async def complete(self, messages: list[LlmMessage]) -> str:
        try:
            return await self._local.complete(messages)
        except Exception:
            return await self._fallback.complete(messages)


def build_select_segments_prompt(topic: str, segments: list[dict]) -> list[LlmMessage]:
    prompt = {
        "goal": "Select transcript segments to build a ~30s social clip.",
        "constraints": ["Return JSON only", "Prefer coherent topic continuity", "Target total duration 25-35s"],
        "topic": topic,
        "segments": segments,
        "output_schema": {"selected_ids": ["uuid"], "reason": "string"},
    }
    return [
        LlmMessage(role="system", content="You are a helpful video editor assistant."),
        LlmMessage(role="user", content=json.dumps(prompt)),
    ]

