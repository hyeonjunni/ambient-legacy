"""입력 래더 (Phase 2) — 질문이 기록으로 답변 가능한지 LLM 호출 전에 규칙으로 판정.

SCPC control 래더의 직계: ANSWER=proceed, QUOTE=amend, REFUSE=hold, CLARIFY=ask.
REFUSE/CLARIFY/CONFLICT 경로는 LLM을 호출하지 않으므로 해당 경로 할루시네이션은 구조적으로 0.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.ai.gates.textrules import content_tokens

FACT_CUES = ("언제", "몇 시", "몇시", "며칠", "몇 월", "몇월", "몇 년", "몇년", "어디", "누구",
             "누가", "이름", "얼마", "몇 명", "몇명", "날짜", "시각", "장소")

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
    if any(c in query for c in ("몇 시", "몇시", "시각", "몇 분", "몇분")):
        kinds.add("time")
    # 날짜는 세분화: 월/일을 물으면 연도만 있는 기록으로는 답할 수 없다
    if any(c in query for c in ("며칠", "몇 월", "몇월")):
        kinds.add("date_md")
    if any(c in query for c in ("몇 년", "몇년", "년도")):
        kinds.add("date_y")
    if any(c in query for c in ("날짜", "언제")) and not (kinds & {"date_md", "date_y"}):
        kinds.add("date_any")
    if any(c in query for c in ("얼마", "몇 명", "몇명", "몇 개", "몇개", "몇 스푼")):
        kinds.add("number")
    if any(c in query for c in ("이름", "어디", "장소", "누가", "누구")):
        kinds.add("entity")
    return kinds


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
    """chunk별 시각 원자가 서로 다르면 모순으로 판정 (v1 범위: 시간)."""
    per_chunk: list[set[str]] = []
    for text in evidence_texts:
        values = {a or b for a, b in re.findall(r"(\d{1,2})\s*시|(\d{1,2}):\d{2}", text) if (a or b)}
        if values:
            per_chunk.append(values)
    if len(per_chunk) >= 2:
        first, second = sorted(per_chunk[0])[0], sorted(per_chunk[1])[0]
        if first != second:
            return (f"{first}시", f"{second}시")
    return None


def _quote_snippets(evidence_texts: list[str], limit: int = 2) -> str:
    return " / ".join(f"「{t[:42]}…」" if len(t) > 42 else f"「{t}」"
                      for t in evidence_texts[:limit])


def route_query(query: str, evidence_texts: list[str]) -> RouteDecision:
    if not evidence_texts:
        return RouteDecision(route="NO_RECORD", answer=NO_RECORD_TMPL, detail="no_evidence")

    joined = " ".join(evidence_texts)
    kinds = asked_atom_kinds(query)
    is_fact = bool(kinds) or any(c in query for c in FACT_CUES)

    if "time" in kinds:
        conflict = _detect_time_conflict(evidence_texts)
        if conflict:
            return RouteDecision(
                route="CONFLICT", asked_kinds=sorted(kinds),
                answer=CONFLICT_TMPL.format(a=conflict[0], b=conflict[1]),
                detail="time_conflict")

    if is_fact:
        missing = [k for k in sorted(kinds) if not _evidence_has_kind(k, query, joined)]
        if missing:
            return RouteDecision(
                route="REFUSE", asked_kinds=sorted(kinds),
                answer=REFUSE_TMPL.format(quotes=_quote_snippets(evidence_texts)),
                detail=f"missing_kinds={','.join(missing)}")
        if not (content_tokens(query) & content_tokens(joined)):
            return RouteDecision(route="CLARIFY", asked_kinds=sorted(kinds),
                                 answer=CLARIFY_TMPL, detail="low_coverage")

    return RouteDecision(route="ANSWER", asked_kinds=sorted(kinds))
