from fastapi import APIRouter

from app.schemas.upload import UploadCreateRequest, UploadFileRequest, UploadResponse


router = APIRouter()


@router.post("", response_model=UploadResponse)
def create_upload(payload: UploadCreateRequest):
    return UploadResponse(
        upload_id="temp-upload-id",
        room_id=payload.room_id,
        uploader_user_id=payload.uploader_user_id,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        status="uploaded",
    )


@router.post("/{upload_id}/file", response_model=dict)
def attach_upload_file(upload_id: str, payload: UploadFileRequest):
    return {
        "upload_id": upload_id,
        "storage_path": payload.storage_path,
        "encrypted": payload.encrypted,
    }


@router.get("/{room_id}", response_model=list[UploadResponse])
def list_uploads(room_id: str):
    return [
        UploadResponse(
            upload_id="temp-upload-id",
            room_id=room_id,
            uploader_user_id="temp-user-id",
            type="image",
            title="sample upload",
            description="sample description",
            status="uploaded",
        )
    ]

