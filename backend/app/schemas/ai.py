from pydantic import BaseModel, ConfigDict


class AIDemoChatRequest(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    room_id: str
    model_id: str
    persona_id: str
    query: str


class AIDemoChatResponse(BaseModel):
    """공개 채팅 응답 — 진단성 내부 데이터(원시 모델 출력·프롬프트·페르소나 원문)는
    Phase 0에서 제거됨. 필요 시 개발 전용 라우트로만 노출할 것 (NEXT_AGENT_HANDOFF P1)."""
    answer: str
    answer_source: str
    # 규칙 게이트 메타 (rule_gate 경로: REFUSE/CLARIFY/CONFLICT/NO_RECORD, 게이트 조치)
    gate_route: str | None = None
    gate_detail: str | None = None
    gate_action: str | None = None
    inference_source: str
    provider_name: str
    provider_mode: str
    selected_model: dict
    retrieved_evidence: list[str]


class AIModelOption(BaseModel):
    id: str
    display_name: str
    provider: str
    placement: str
    supports_image: bool
    supports_audio: bool
    max_context_tokens: int
    notes: str


class AIPersonaOption(BaseModel):
    id: str
    label: str
    tone: str


class AIDemoBootstrapResponse(BaseModel):
    room_id: str
    room_name: str
    seeded_uploads: int
    seeded_files: int


class AIRuntimeStatusResponse(BaseModel):
    configured_models: list[str]
    gemma_endpoint_configured: bool
    exaone_endpoint_configured: bool
    prefer_ollama_for_gemma: bool
    prefer_ollama_for_exaone: bool
    ollama_base_url: str
    cloud_sql_connector_enabled: bool
    gcs_media_storage_enabled: bool
    gcp_credentials_path_configured: bool
    provider_timeout_seconds: int
    persona_count: int
