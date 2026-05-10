from __future__ import annotations

import os
from dataclasses import dataclass
from typing import BinaryIO
from urllib.parse import urlparse, urlunparse

import boto3

from backend.core.config import get_settings


@dataclass(frozen=True)
class PutResult:
    bucket: str
    key: str
    bytes: int


def _client():
    s = get_settings()
    return boto3.client(
        "s3",
        endpoint_url=s.s3_endpoint_url,
        aws_access_key_id=s.s3_access_key_id,
        aws_secret_access_key=s.s3_secret_access_key,
        region_name=s.s3_region,
    )


def ensure_buckets():
    s = get_settings()
    c = _client()
    existing = {b["Name"] for b in c.list_buckets().get("Buckets", [])}
    for bucket in [s.s3_bucket_media, s.s3_bucket_exports]:
        if bucket not in existing:
            c.create_bucket(Bucket=bucket)


def put_file(bucket: str, key: str, file_path: str) -> PutResult:
    c = _client()
    size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        c.upload_fileobj(f, bucket, key)
    return PutResult(bucket=bucket, key=key, bytes=size)


def get_presigned_get_url(bucket: str, key: str, expires_sec: int = 3600) -> str:
    c = _client()
    s = get_settings()
    signed = c.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires_sec,
    )

    public = (s.s3_public_endpoint_url or "").strip()
    if not public:
        return signed

    internal_p = urlparse(s.s3_endpoint_url)
    public_p = urlparse(public)
    signed_p = urlparse(signed)

    if signed_p.netloc == internal_p.netloc:
        signed_p = signed_p._replace(scheme=public_p.scheme or signed_p.scheme, netloc=public_p.netloc)
    return urlunparse(signed_p)


def download_to_file(bucket: str, key: str, out_path: str) -> None:
    c = _client()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        c.download_fileobj(bucket, key, f)

