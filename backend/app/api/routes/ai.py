import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.demo_service import build_demo_chat_response, list_persona_options
from app.ai.model_registry import MODEL_REGISTRY
from app.core.config import settings
from app.core.database import get_db
from app.models.family import FamilyMember, FamilyRoom
from app.models.upload import Upload
from app.models.user import User
from app.schemas.ai import (
    AIDemoBootstrapRequest,
    AIDemoBootstrapResponse,
    AIDemoChatRequest,
    AIDemoChatResponse,
    AIModelOption,
    AIPersonaOption,
    AIRuntimeStatusResponse,
)


router = APIRouter()
DEMO_ROOM_NAME = "목요일 데모 가족방"
DEMO_UPLOADS = [
    {
        "type": "text",
        "title": "아버지 인터뷰 메모",
        "description": "준비를 꼼꼼히 하고 사람과의 약속을 지키는 태도가 중요하다고 말했다.",
    },
    {
        "type": "image",
        "title": "2024 가족 송년회 사진",
        "description": "현수막 OCR: 2024 가족 송년회 / 가족이 함께 모여 건배하는 장면",
    },
    {
        "type": "video",
        "title": "송년회 건배사 영상",
        "description": "영상 OCR/STT: 건강하게 오래 봅시다 / 연말 가족 모임 건배사",
    },
    {
        "type": "text",
        "title": "부산 여행 회상 메모",
        "description": "광안리 바다 앞에서 가족사진을 찍고 바람이 시원하다고 말했다.",
    },
]


@router.get("/models", response_model=list[AIModelOption])
def list_models():
    return [
        AIModelOption(
            id=model.id,
            display_name=model.display_name,
            provider=model.provider,
            placement=model.placement,
            supports_image=model.supports_image,
            supports_audio=model.supports_audio,
            max_context_tokens=model.max_context_tokens,
            notes=model.notes,
        )
        for model in MODEL_REGISTRY
    ]


@router.get("/personas", response_model=list[AIPersonaOption])
def list_personas():
    return [AIPersonaOption(**item) for item in list_persona_options()]


@router.get("/runtime-status", response_model=AIRuntimeStatusResponse)
def get_runtime_status():
    return AIRuntimeStatusResponse(
        configured_models=[model.id for model in MODEL_REGISTRY],
        gemma_endpoint_configured=bool(settings.gemma_endpoint_url),
        exaone_endpoint_configured=bool(settings.exaone_endpoint_url),
        prefer_ollama_for_gemma=settings.prefer_ollama_for_gemma,
        ollama_base_url=settings.ollama_base_url,
        cloud_sql_connector_enabled=settings.use_cloud_sql_connector,
        gcs_media_storage_enabled=settings.use_gcs_media_storage,
        gcp_credentials_path_configured=bool(settings.gcp_credentials_path),
        provider_timeout_seconds=settings.ai_provider_timeout_seconds,
        persona_count=len(list_persona_options()),
    )


@router.post("/demo-bootstrap", response_model=AIDemoBootstrapResponse)
def bootstrap_demo(payload: AIDemoBootstrapRequest, db: Session = Depends(get_db)):
    user = db.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    room = db.scalar(
        select(FamilyRoom).where(
            FamilyRoom.owner_user_id == payload.user_id,
            FamilyRoom.name == DEMO_ROOM_NAME,
        )
    )

    if room is None:
        room = FamilyRoom(
            id=str(uuid.uuid4()),
            name=DEMO_ROOM_NAME,
            invite_code=f"DEMO{str(uuid.uuid4())[:2].upper()}",
            owner_user_id=payload.user_id,
        )
        db.add(room)
        db.flush()
        db.add(
            FamilyMember(
                id=str(uuid.uuid4()),
                room_id=room.id,
                user_id=payload.user_id,
                role="owner",
            )
        )

    existing_titles = {
        title
        for title, in db.execute(
            select(Upload.title).where(
                Upload.room_id == room.id,
            )
        ).all()
    }

    seeded_count = 0
    for item in DEMO_UPLOADS:
        if item["title"] in existing_titles:
            continue
        db.add(
            Upload(
                id=str(uuid.uuid4()),
                room_id=room.id,
                uploader_user_id=payload.user_id,
                type=item["type"],
                title=item["title"],
                description=item["description"],
                status="uploaded",
            )
        )
        seeded_count += 1

    db.commit()

    return AIDemoBootstrapResponse(
        room_id=room.id,
        room_name=room.name,
        seeded_uploads=seeded_count,
    )


@router.post("/chat-demo", response_model=AIDemoChatResponse)
def chat_demo(payload: AIDemoChatRequest, db: Session = Depends(get_db)):
    result = build_demo_chat_response(
        db=db,
        room_id=payload.room_id,
        user_id=payload.user_id,
        model_id=payload.model_id,
        persona_id=payload.persona_id,
        query=payload.query,
    )
    return AIDemoChatResponse(**result)
