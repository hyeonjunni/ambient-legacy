from dataclasses import asdict, dataclass
from typing import Iterable, List

from app.ai.model_registry import ModelProfile, get_model_profile


@dataclass
class RetrievalChunk:
    source_type: str
    timestamp: str
    text: str
    tags: List[str]
    confidence: float


def build_prompt_package(
    *,
    model_id: str,
    persona_markdown: str,
    user_query: str,
    retrieved_chunks: Iterable[RetrievalChunk],
):
    model: ModelProfile = get_model_profile(model_id)
    evidence_lines = []

    for chunk in retrieved_chunks:
        evidence_lines.append(
            f"- [{chunk.source_type}] {chunk.timestamp}: {chunk.text} "
            f"(tags={', '.join(chunk.tags)}, confidence={chunk.confidence})"
        )

    if not evidence_lines:
        evidence_lines.append("- 검색된 개인 또는 가족 기록이 없습니다.")

    prompt_instructions = (
        "Use retrieved memories as primary evidence. "
        "Use persona markdown only to shape tone and boundaries. "
        "Do not invent unsupported memories."
    )

    return {
        "model_profile": asdict(model),
        "instructions": prompt_instructions,
        "persona_markdown": persona_markdown,
        "retrieved_evidence": evidence_lines,
        "user_query": user_query,
    }
