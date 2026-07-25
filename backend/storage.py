"""Object storage helpers.

Uses Cloudflare R2 (S3-compatible API via boto3) when R2_ACCOUNT_ID/
R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET are configured (production).
Falls back to local disk storage under LOCAL_STORAGE_DIR for local
development, where R2 credentials aren't set.
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

APP_NAME = os.environ.get("APP_NAME", "sonically")
LOCAL_STORAGE_DIR = Path(os.environ.get("LOCAL_STORAGE_DIR", Path(__file__).parent / "local_storage"))

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET = os.environ.get("R2_BUCKET")

_r2_client = None


def _use_r2() -> bool:
    return bool(R2_ACCOUNT_ID and R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY and R2_BUCKET)


def _r2():
    global _r2_client
    if _r2_client:
        return _r2_client
    import boto3
    _r2_client = boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY_ID,
        aws_secret_access_key=R2_SECRET_ACCESS_KEY,
        region_name="auto",
    )
    return _r2_client


def init_storage():
    """No-op warmup hook kept for server.py's startup event."""
    if _use_r2():
        _r2()
        logger.info("R2 object storage initialized")


def put_object(path: str, data: bytes, content_type: str) -> dict:
    if _use_r2():
        _r2().put_object(Bucket=R2_BUCKET, Key=path, Body=data, ContentType=content_type)
        return {"path": path}
    dest = LOCAL_STORAGE_DIR / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    dest.with_suffix(dest.suffix + ".contenttype").write_text(content_type)
    return {"path": path}


def get_object(path: str):
    if _use_r2():
        obj = _r2().get_object(Bucket=R2_BUCKET, Key=path)
        return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")
    src = LOCAL_STORAGE_DIR / path
    content_type_file = src.with_suffix(src.suffix + ".contenttype")
    content_type = content_type_file.read_text() if content_type_file.exists() else "application/octet-stream"
    return src.read_bytes(), content_type


def build_path(subdir: str, user_id: str, filename: str) -> str:
    return f"{APP_NAME}/{subdir}/{user_id}/{filename}"
