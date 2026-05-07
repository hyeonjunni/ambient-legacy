from dataclasses import dataclass
from typing import Protocol


@dataclass
class InferenceRequest:
    model_id: str
    user_query: str
    prompt_package: dict


@dataclass
class InferenceResponse:
    provider: str
    model_id: str
    output_text: str
    mode: str


class InferenceProvider(Protocol):
    provider_name: str

    def generate(self, request: InferenceRequest) -> InferenceResponse:
        ...
