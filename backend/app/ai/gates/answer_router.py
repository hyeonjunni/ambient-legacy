"""입력 래더 (Phase 2) — 질문이 기록으로 답변 가능한지 LLM 호출 전에 규칙으로 판정.

SCPC control 래더의 직계: ANSWER=proceed, QUOTE=amend, REFUSE=hold, CLARIFY=ask.
REFUSE/CLARIFY/CONFLICT 경로는 LLM을 호출하지 않으므로 해당 경로 할루시네이션은 구조적으로 0.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.ai.gates.entity_index import (
    RoomEntityIndex,
    has_any_person,
    has_named_place_of,
    question_place_category,
)
from app.ai.gates.textrules import content_tokens, has_cue

FACT_CUES = ("언제", "몇 시", "몇시", "며칠", "몇 월", "몇월", "몇 년", "몇년", "어디", "어느",
             "누구", "누가", "이름", "얼마", "몇 명", "몇명", "날짜", "시각", "장소")

REFUSE_TMPL = ("기록을 확인했지만, 물어보신 내용은 현재 가족 기록에서 확인되지 않습니다. "
               "관련해서 남아 있는 기록은 다음과 같습니다: {quotes}")
CLARIFY_TMPL = "어떤 기록을 말씀하시는지 조금 더 구체적으로 알려주시면 그 기록을 기준으로 답하겠습니다."
NO_RECORD_TMPL = "아직 이 가족방에 관련 기록이 없어, 물어보신 내용을 기록으로 답해 드리기 어렵습니다."
CONFLICT_TMPL = ("기록이 서로 다르게 남아 있어 단정하지 않겠습니다. "
                 "한 기록에는 {a}, 다른 기록에는 {b}로 적혀 있습니다. 확인 후 맞춰두는 것이 좋겠습니다.")


@dataclass
class RouteDecision:
    route: str                    # ANSWER | REFUSE | CLARIFY | CONFLICT | NO_RECORD
    answer: str | None = None     # ANSWER 외 경로의 결정론 응답
    asked_kinds: list[str] = field(default_factory=list)
    detail: str = ""


def asked_atom_kinds(query: str) -> set[str]:
    kinds: set[str] = set()
    if has_cue(query, ("몇 시", "시각", "몇 분")):
        kinds.add("time")
    # 날짜는 세분화: 월/일을 물으면 연도만 있는 기록으로는 답할 수 없다
    if has_cue(query, ("며칠", "몇 월")):
        kinds.add("date_md")
    if has_cue(query, ("몇 년", "년도")):
        kinds.add("date_y")
    if has_cue(query, ("날짜", "언제")) and not (kinds & {"date_md", "date_y"}):
        kinds.add("date_any")
    if has_cue(query, ("얼마", "몇 명", "몇 개", "몇 스푼")):
        kinds.add("number")
    if has_cue(query, ("이름", "어디", "어느", "장소", "누가", "누구")):
        kinds.add("entity")
    return kinds


def _entity_answerable(query: str, evidence_texts: list[str],
                       index: RoomEntityIndex) -> tuple[bool, str]:
    """엔티티 질문의 답변 가능성 — 가족방 사전 기반 (v2: 얕은 접점 판정을 대체).

    - '식당/병원/공원…' 카테고리 이름 질문 → 그 카테고리의 '이름 있는' 장소가 있어야 함
    - '누가/누구' 인물 질문 → 기록/사전에 인물(멤버 이름·호칭)이 등장해야 함
    - 일반 '어디' 질문 → 아무 장소 신호(접미사 토큰)라도 있으면 답변 가능
    """
    category = question_place_category(query)
    if category is not None:
        ok = has_named_place_of(category, index, evidence_texts)
        return ok, f"place_category={category[0]}"
    if any(word in query for word in ("누가", "누구")):
        return has_any_person(index, evidence_texts), "person"
    if any(word in query for word in ("어디", "장소")):
        joined = " ".join(evidence_texts)
        from app.ai.gates.entity_index import PLACE_SUFFIXES
        ok = any(suffix in joined for suffix in PLACE_SUFFIXES)
        return ok, "generic_place"
    # '이름' 단독 등 — 판별 불가면 보수적으로 접점 판정에 위임
    joined = " ".join(evidence_texts)
    return len(content_tokens(query) & content_tokens(joined)) >= 1, "fallback_overlap"


def _evidence_has_kind(kind: str, query: str, evidence_text: str) -> bool:
    if kind == "time":
        return bool(re.search(r"\d{1,2}\s*시|\d{1,2}:\d{2}", evidence_text))
    if kind == "date_md":
        return bool(re.search(r"\d{1,2}\s*월\s*\d{1,2}\s*일", evidence_text))
    if kind == "date_y":
        return bool(re.search(r"\d{4}\s*년", evidence_text))
    if kind == "date_any":
        return bool(re.search(r"\d{4}\s*년|\d{1,2}\s*월\s*\d{1,2}\s*일", evidence_text))
    if kind == "number":
        return bool(re.search(r"\d+\s*(만원|원|명|개|스푼|분)", evidence_text))
    if kind == "entity":
        # 엔티티는 사전 없인 판별이 얕다(v1 한계). 질의 내용어와의 접점만 요구한다.
        return len(content_tokens(query) & content_tokens(evidence_text)) >= 1
    return False


def _detect_time_conflict(evidence_texts: list[str]) -> tuple[str, str] | None:
    """시각 원자를 '모든' chunk에 걸쳐 대조 — 값 집합이 다른 chunk가 있으면 모순.

    Phase 0: 첫 2개 chunk만 비교하던 방식은 10시/10시/11시를 놓쳤다.
    단일 chunk 안의 범위 표현(10시~11시)은 기록 간 모순이 아니므로 제외.
    """
    per_chunk: list[set[str]] = []
    for text in evidence_texts:
        values = {a or b for a, b in re.findall(r"(\d{1,2})\s*시|(\d{1,2}):\d{2}", text) if (a or b)}
        if values:
            per_chunk.append(values)
    if len(per_chunk) < 2 or all(s == per_chunk[0] for s in per_chunk[1:]):
        return None
    ordered: list[str] = []
    for values in per_chunk:
        for v in sorted(values, key=int):
            if v not in ordered:
                ordered.append(v)
    if len(ordered) >= 2:
        return (f"{ordered[0]}시", f"{ordered[1]}시")
    return None


def _quote_snippets(evidence_texts: list[str], limit: int = 2) -> str:
    return " / ".join(f"「{t[:42]}…」" if len(t) > 42 else f"「{t}」"
                      for t in evidence_texts[:limit])


def route_query(query: str, evidence_texts: list[str],
                entity_index: RoomEntityIndex | None = None) -> RouteDecision:
    if not evidence_texts:
        return RouteDecision(route="NO_RECORD", answer=NO_RECORD_TMPL, detail="no_evidence")

    index = entity_index or RoomEntityIndex()
    joined = " ".join(evidence_texts)
    kinds = asked_atom_kinds(query)
    is_fact = bool(kinds) or has_cue(query, FACT_CUES)

    if "time" in kinds:
        conflict = _detect_time_conflict(evidence_texts)
        if conflict:
            return RouteDecision(
                route="CONFLICT", asked_kinds=sorted(kinds),
                answer=CONFLICT_TMPL.format(a=conflict[0], b=conflict[1]),
                detail="time_conflict")

    if is_fact:
        missing: list[str] = []
        detail_parts: list[str] = []
        for kind in sorted(kinds):
            if kind == "entity":
                ok, why = _entity_answerable(query, evidence_texts, index)
                if not ok:
                    missing.append(f"entity({why})")
            elif not _evidence_has_kind(kind, query, joined):
                missing.append(kind)
        if missing:
            return RouteDecision(
                route="REFUSE", asked_kinds=sorted(kinds),
                answer=REFUSE_TMPL.format(quotes=_quote_snippets(evidence_texts)),
                detail=f"missing_kinds={','.join(missing)}")
        if not (content_tokens(query) & content_tokens(joined)):
            return RouteDecision(route="CLARIFY", asked_kinds=sorted(kinds),
                                 answer=CLARIFY_TMPL, detail="low_coverage")

    return RouteDecision(route="ANSWER", asked_kinds=sorted(kinds))
