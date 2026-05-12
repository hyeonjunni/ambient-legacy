import json
import uuid
from pathlib import Path
from urllib import error, request

from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.api.routes.uploads import ONE_PIXEL_PNG, delete_gcs_blob, gcs_blob_exists, upload_bytes_to_gcs
from app.core.config import settings
from app.core.database import SessionLocal


router = APIRouter()


@router.get("/health/db")
def database_healthcheck():
    session = SessionLocal()
    try:
        session.execute(text("SELECT 1"))
        return {
            "database": "connected",
        }
    finally:
        session.close()


@router.get("/health/ollama")
def ollama_healthcheck():
    try:
        req = request.Request(f"{settings.ollama_base_url.rstrip('/')}/api/version", method="GET")
        with request.urlopen(req, timeout=5) as response:
            payload = response.read().decode("utf-8")
    except error.URLError as exc:
        return {
            "ollama": "disconnected",
            "base_url": settings.ollama_base_url,
            "prefer_ollama_for_gemma": settings.prefer_ollama_for_gemma,
            "error": str(exc),
        }

    return {
        "ollama": "connected",
        "base_url": settings.ollama_base_url,
        "prefer_ollama_for_gemma": settings.prefer_ollama_for_gemma,
        "version_response": payload,
    }


@router.get("/health/gcp")
def gcp_healthcheck():
    credentials_path = Path(settings.gcp_credentials_path).expanduser() if settings.gcp_credentials_path else None
    return {
        "cloud_sql_connector_enabled": settings.use_cloud_sql_connector,
        "gcs_media_storage_enabled": settings.use_gcs_media_storage,
        "gcp_project_id": settings.gcp_project_id,
        "instance_connection_name": settings.instance_connection_name,
        "gcs_bucket_name": settings.gcs_bucket_name,
        "gcp_credentials_path": str(credentials_path) if credentials_path else "",
        "gcp_credentials_path_exists": credentials_path.exists() if credentials_path else False,
    }


@router.post("/health/gcp/storage-smoke-test")
def gcp_storage_smoke_test():
    if not settings.use_gcs_media_storage:
        raise HTTPException(status_code=409, detail="GCS media storage is disabled in current settings")

    stored_filename = f"smoke-test-{uuid.uuid4()}.png"
    metadata = {
        "upload_type": "image",
        "upload_tags": json.dumps(["smoke-test", "temp-image", "gcp-verified"], ensure_ascii=False),
        "purpose": "temporary verification",
    }

    bucket_name = None
    storage_path = None
    existed_after_upload = False
    deleted = False

    try:
        bucket_name, storage_path = upload_bytes_to_gcs(
            file_bytes=ONE_PIXEL_PNG,
            stored_filename=stored_filename,
            content_type="image/png",
            metadata=metadata,
        )
        existed_after_upload = gcs_blob_exists(bucket_name, storage_path)
    finally:
        if bucket_name and storage_path:
            deleted = delete_gcs_blob(bucket_name, storage_path)

    return {
        "bucket_name": bucket_name,
        "storage_path": storage_path,
        "uploaded": existed_after_upload,
        "deleted": deleted,
        "tags": ["smoke-test", "temp-image", "gcp-verified"],
    }
