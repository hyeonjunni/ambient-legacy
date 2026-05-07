from pathlib import Path
from urllib import error, request

from fastapi import APIRouter
from sqlalchemy import text

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
