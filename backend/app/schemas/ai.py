from pydantic import BaseModel


class AIDemoChatRequest(BaseModel):
    room_id: str
    user_id: str
    model_id: str
    persona_id: str
    query: str


class AIDemoChatResponse(BaseModel):
    answer: str
    answer_source: str
    inference_source: str
    provider_name: str
    provider_mode: str
    provider_output_preview: str | None = None
    selected_model: dict
    retrieved_evidence: list[str]
    persona_preview: str
    prompt_package: dict


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


class AIDemoBootstrapRequest(BaseModel):
    user_id: str


class AIDemoBootstrapResponse(BaseModel):
    room_id: str
    room_name: str
    seeded_uploads: int


class AIRuntimeStatusResponse(BaseModel):
    configured_models: list[str]
    gemma_endpoint_configured: bool
    exaone_endpoint_configured: bool
    provider_timeout_seconds: int
    persona_count: int
