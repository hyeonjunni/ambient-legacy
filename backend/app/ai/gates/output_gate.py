"""출력 게이트 (Phase 1) — LLM 응답을 사용자에게 보내기 전 결정론 검증.

누수 제거 → 한국어 판정 → 문장 단위 hard-atom 근거 대조 → 실패 시 인용 강등.
환각 원자(기록에 없는 숫자·시각·인용구)를 담은 문장은 구조적으로 통과하지 못한다.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from app.ai.gates.entity_index import PLACE_SUFFIXES, RoomEntityIndex
from app.ai.gates.textrules import content_tokens, korean_ok, strip_leaks, unsupported_atoms


def _unsupported_entities(sentence: str, allowed_source: str,
                          index: RoomEntityIndex) -> set[str]:
    """이름 있는 장소 토큰·X씨/X님 인물 호칭이 (기록∪질문∪가족방 사전)에 없으면 미지원."""
    bad: set[str] = set()
    for token in content_tokens(sentence):
        for suffix in PLACE_SUFFIXES:
            if token.endswith(suffix) and len(token) > len(suffix):
                if token not in allowed_source and token not in index.places:
                    bad.add(token)
    for m in re.finditer(r"([가-힣]{2,4})(씨|님)", sentence):
        name = m.group(1)
        if name not in allowed_source and name not in index.persons:
            bad.add(m.group())
    return bad

FALLBACK_TMPL = ("생성된 답변에서 기록으로 확인되지 않는 내용을 제외했습니다. "
                 "현재 남아 있는 기록은 다음과 같습니다: {quotes}")


@dataclass
class GateResult:
    answer: str
    action: str            # pass | dropped_N | fallback_quote | all_dropped_quote
    leak_stripped: bool
    dropped_sentences: int
    unsupported_found: list[str]


def _quote_snippets(evidence_texts: list[str], limit: int = 2) -> str:
    return " / ".join(f"「{t[:42]}…」" if len(t) > 42 else f"「{t}」"
                      for t in evidence_texts[:limit])


def apply_output_gate(raw_answer: str, query: str, evidence_texts: list[str],
                      entity_index: RoomEntityIndex | None = None) -> GateResult:
    index = entity_index or RoomEntityIndex()
    evidence_joined = " ".join(evidence_texts)
    allowed_source = f"{evidence_joined} {query}"
    text, leaked = strip_leaks(raw_answer or "")

    if not text or not korean_ok(text):
        return GateResult(
            answer=FALLBACK_TMPL.format(quotes=_quote_snippets(evidence_texts)),
            action="fallback_quote", leak_stripped=leaked,
            dropped_sentences=0, unsupported_found=[])

    sentences = re.split(r"(?<=[.다요!?])\s+", text)
    kept: list[str] = []
    dropped = 0
    found: list[str] = []
    for sentence in sentences:
        bad = unsupported_atoms(sentence, evidence_joined, query)
        bad |= _unsupported_entities(sentence, allowed_source, index)
        if bad:
            dropped += 1
            found.extend(sorted(bad))
            continue
        kept.append(sentence)

    if not kept:
        return GateResult(
            answer=FALLBACK_TMPL.format(quotes=_quote_snippets(evidence_texts)),
            action="all_dropped_quote", leak_stripped=leaked,
            dropped_sentences=dropped, unsupported_found=found)

    return GateResult(
        answer=" ".join(kept).strip(),
        action="pass" if dropped == 0 else f"dropped_{dropped}",
        leak_stripped=leaked, dropped_sentences=dropped, unsupported_found=found)
