from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class ModelProfile:
    id: str
    display_name: str
    provider: str
    placement: str
    supports_image: bool
    supports_audio: bool
    max_context_tokens: int
    notes: str


MODEL_REGISTRY: List[ModelProfile] = [
    ModelProfile(
        id="gemma-4-e2b-device",
        display_name="Gemma 4 E2B",
        provider="gemma",
        placement="device",
        supports_image=True,
        supports_audio=True,
        max_context_tokens=32000,
        notes="Recommended default on-device model for Android-class hardware.",
    ),
    ModelProfile(
        id="gemma-4-e4b-device",
        display_name="Gemma 4 E4B",
        provider="gemma",
        placement="device",
        supports_image=True,
        supports_audio=True,
        max_context_tokens=32000,
        notes="Higher quality on-device option for high-memory devices.",
    ),
    ModelProfile(
        id="exaone-family-vault",
        display_name="EXAONE Family Vault",
        provider="exaone",
        placement="family_vault",
        supports_image=False,
        supports_audio=False,
        max_context_tokens=32768,
        notes="Authoritative family-vault model for canonical archive answers.",
    ),
]


def get_model_profile(model_id: str) -> ModelProfile:
    for profile in MODEL_REGISTRY:
        if profile.id == model_id:
            return profile
    raise KeyError(f"Unknown model id: {model_id}")

