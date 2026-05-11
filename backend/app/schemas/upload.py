from pydantic import BaseModel, Field


class UploadCreateRequest(BaseModel):
    room_id: str
    uploader_user_id: str
    type: str
    title: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class UploadFileRequest(BaseModel):
    storage_bucket: str
    storage_path: str
    mime_type: str
    file_size: int | None = None
    encrypted: bool = True


class UploadResponse(BaseModel):
    upload_id: str
    room_id: str
    uploader_user_id: str
    type: str
    title: str
    description: str | None = None
    tags: list[str] = Field(default_factory=list)
    status: str
    created_at: str | None = None
    has_file: bool = False
    file_url: str | None = None
    mime_type: str | None = None
    file_size: int | None = None
