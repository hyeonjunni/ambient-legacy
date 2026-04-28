from app.ai.model_registry import get_model_profile
from app.ai.providers.base import InferenceProvider
from app.ai.providers.exaone_provider import ExaoneProvider
from app.ai.providers.gemma_provider import GemmaProvider
from app.ai.providers.mock_provider import MockProvider
from app.core.config import settings


def get_provider_for_model(model_id: str) -> InferenceProvider:
    profile = get_model_profile(model_id)

    if profile.provider == "gemma":
        return GemmaProvider(endpoint_url=settings.gemma_endpoint_url, timeout_seconds=settings.ai_provider_timeout_seconds)

    if profile.provider == "exaone":
        return ExaoneProvider(endpoint_url=settings.exaone_endpoint_url, timeout_seconds=settings.ai_provider_timeout_seconds)

    return MockProvider()
