import io
import logging
import uuid
from pathlib import Path
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile as FastAPIUploadFile
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.family import FamilyMember, FamilyRoom
from app.models.upload import Upload, UploadFile
from app.models.user import User
from app.schemas.upload import UploadCreateRequest, UploadFileRequest, UploadResponse


router = APIRouter()
logger = logging.getLogger(__name__)
LOCAL_MEDIA_ROOT = Path(__file__).resolve().parents[2] / 'storage' / 'uploads'
LOCAL_MEDIA_ROOT.mkdir(parents=True, exist_ok=True)


def build_file_url(request: Request | None, upload: Upload, viewer_user_id: str | None) -> str | None:
    if request is None or not viewer_user_id:
        return None
    query = urlencode({'user_id': viewer_user_id})
    return f"{str(request.base_url).rstrip('/')}/api/v1/uploads/{upload.id}/content?{query}"


def resolve_gcp_project_id() -> str | None:
    if settings.gcp_project_id:
        return settings.gcp_project_id

    if settings.instance_connection_name and ':' in settings.instance_connection_name:
        return settings.instance_connection_name.split(':', 1)[0]

    return None


def get_gcs_client():
    if not settings.use_gcs_media_storage or not settings.gcs_bucket_name:
        return None

    try:
        from google.cloud import storage
        from google.oauth2 import service_account
    except ImportError:
        return None

    project_id = resolve_gcp_project_id()
    if not project_id:
        return None

    if settings.gcp_credentials_path:
        credentials_path = Path(settings.gcp_credentials_path).expanduser()
        if credentials_path.exists():
            credentials = service_account.Credentials.from_service_account_file(str(credentials_path))
            return storage.Client(project=project_id, credentials=credentials)

    return storage.Client(project=project_id)


def store_media_file_locally(file_bytes: bytes, stored_filename: str) -> tuple[str, str]:
    stored_path = LOCAL_MEDIA_ROOT / stored_filename
    stored_path.write_bytes(file_bytes)
    return 'local-media', stored_filename


def store_media_file(file_bytes: bytes, stored_filename: str, content_type: str) -> tuple[str, str]:
    client = get_gcs_client()
    if client is None:
        return store_media_file_locally(file_bytes, stored_filename)

    try:
        bucket = client.bucket(settings.gcs_bucket_name)
        blob_name = f'uploads/{stored_filename}'
        blob = bucket.blob(blob_name)
        blob.upload_from_string(file_bytes, content_type=content_type)
        return settings.gcs_bucket_name, blob_name
    except Exception as error:
        logger.warning('GCS upload failed for %s: %s. Falling back to local storage.', stored_filename, error)
        return store_media_file_locally(file_bytes, stored_filename)


def load_gcs_file(bucket_name: str, storage_path: str) -> bytes:
    client = get_gcs_client()
    if client is None:
        raise HTTPException(status_code=500, detail='Google Cloud Storage client is not available')

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(storage_path)
    if not blob.exists():
        raise HTTPException(status_code=404, detail='Stored file not found in Google Cloud Storage')

    return blob.download_as_bytes()


def serialize_upload(
    upload: Upload,
    request: Request | None = None,
    upload_file: UploadFile | None = None,
    viewer_user_id: str | None = None,
) -> UploadResponse:
    return UploadResponse(
        upload_id=upload.id,
        room_id=upload.room_id,
        uploader_user_id=upload.uploader_user_id,
        type=upload.type,
        title=upload.title,
        description=upload.description,
        status=upload.status,
        created_at=upload.created_at.isoformat() if upload.created_at else None,
        has_file=upload_file is not None,
        file_url=build_file_url(request, upload, viewer_user_id) if upload_file else None,
        mime_type=upload_file.mime_type if upload_file else None,
        file_size=upload_file.file_size if upload_file else None,
    )


def ensure_room_member(db: Session, room_id: str, user_id: str) -> FamilyMember:
    membership = db.scalar(
        select(FamilyMember).where(
            FamilyMember.room_id == room_id,
            FamilyMember.user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=403, detail='User is not a member of this family room')
    return membership


def get_latest_upload_file(db: Session, upload_id: str) -> UploadFile | None:
    return db.scalar(
        select(UploadFile)
        .where(UploadFile.upload_id == upload_id)
        .order_by(UploadFile.created_at.desc(), UploadFile.id.desc())
    )


@router.post('', response_model=UploadResponse)
def create_upload(payload: UploadCreateRequest, db: Session = Depends(get_db)):
    user = db.get(User, payload.uploader_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail='Uploader user not found')

    room = db.get(FamilyRoom, payload.room_id)
    if room is None:
        raise HTTPException(status_code=404, detail='Family room not found')

    ensure_room_member(db, payload.room_id, payload.uploader_user_id)

    upload = Upload(
        id=str(uuid.uuid4()),
        room_id=payload.room_id,
        uploader_user_id=payload.uploader_user_id,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        status='uploaded',
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)

    return serialize_upload(upload)


@router.post('/{upload_id}/file', response_model=dict)
def attach_upload_file(upload_id: str, payload: UploadFileRequest, db: Session = Depends(get_db)):
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail='Upload not found')

    upload_file = UploadFile(
        id=str(uuid.uuid4()),
        upload_id=upload_id,
        storage_bucket=payload.storage_bucket,
        storage_path=payload.storage_path,
        mime_type=payload.mime_type,
        file_size=payload.file_size,
        encrypted=payload.encrypted,
    )
    db.add(upload_file)
    db.commit()

    return {
        'upload_id': upload_id,
        'storage_path': payload.storage_path,
        'encrypted': payload.encrypted,
    }


@router.post('/{upload_id}/binary', response_model=UploadResponse)
async def upload_binary_file(
    upload_id: str,
    request: Request,
    user_id: str = Query(...),
    file: FastAPIUploadFile = File(...),
    db: Session = Depends(get_db),
):
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail='Upload not found')

    ensure_room_member(db, upload.room_id, user_id)

    suffix = Path(file.filename or '').suffix or '.bin'
    stored_filename = f"{upload_id}{suffix}"
    file_bytes = await file.read()
    storage_bucket, storage_path = store_media_file(
        file_bytes,
        stored_filename,
        file.content_type or 'application/octet-stream',
    )

    upload_file = UploadFile(
        id=str(uuid.uuid4()),
        upload_id=upload_id,
        storage_bucket=storage_bucket,
        storage_path=storage_path,
        mime_type=file.content_type or 'application/octet-stream',
        file_size=len(file_bytes),
        encrypted=False,
    )
    db.add(upload_file)
    db.commit()
    db.refresh(upload)

    return serialize_upload(upload, request=request, upload_file=upload_file, viewer_user_id=user_id)


@router.get('/{room_id}', response_model=list[UploadResponse])
def list_uploads(room_id: str, request: Request, user_id: str = Query(...), db: Session = Depends(get_db)):
    room = db.get(FamilyRoom, room_id)
    if room is None:
        raise HTTPException(status_code=404, detail='Family room not found')

    ensure_room_member(db, room_id, user_id)

    uploads = db.scalars(
        select(Upload)
        .where(Upload.room_id == room_id)
        .order_by(Upload.created_at.desc(), Upload.id.desc())
    ).all()

    serialized_uploads: list[UploadResponse] = []
    for upload in uploads:
        upload_file = get_latest_upload_file(db, upload.id)
        serialized_uploads.append(
            serialize_upload(upload, request=request, upload_file=upload_file, viewer_user_id=user_id)
        )

    return serialized_uploads


@router.get('/{upload_id}/content')
def get_upload_content(upload_id: str, user_id: str = Query(...), db: Session = Depends(get_db)):
    upload = db.get(Upload, upload_id)
    if upload is None:
        raise HTTPException(status_code=404, detail='Upload not found')

    ensure_room_member(db, upload.room_id, user_id)

    upload_file = get_latest_upload_file(db, upload_id)
    if upload_file is None:
        raise HTTPException(status_code=404, detail='Upload file not found')

    if upload_file.storage_bucket == 'local-media':
        local_path = LOCAL_MEDIA_ROOT / upload_file.storage_path
        if not local_path.exists():
            raise HTTPException(status_code=404, detail='Stored local file not found')
        return FileResponse(
            path=str(local_path),
            media_type=upload_file.mime_type or 'application/octet-stream',
            filename=upload.title,
        )

    file_bytes = load_gcs_file(upload_file.storage_bucket, upload_file.storage_path)
    headers = {'Content-Disposition': f'inline; filename="{upload.title}"'}
    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=upload_file.mime_type or 'application/octet-stream',
        headers=headers,
    )
