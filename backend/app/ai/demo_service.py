from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ai.provider_factory import get_provider_for_model
from app.ai.providers.base import InferenceRequest
from app.ai.persona_loader import load_persona_pack
from app.ai.prompt_builder import RetrievalChunk, build_prompt_package
from app.ai.gates.answer_router import CLARIFY_TMPL, RouteDecision, route_query
from app.ai.gates.entity_index import build_room_entity_index
from app.ai.gates.output_gate import apply_output_gate
from app.api.routes.uploads import ensure_room_member, unpack_description_and_tags
from app.models.family import FamilyMember
from app.models.upload import Upload
from app.models.user import User


PERSONA_ROOT = Path(__file__).resolve().parents[1] / "personas"


PERSONA_PACKS = {
    "father-calm": PERSONA_ROOT / "father-calm",
    "mother-warm": PERSONA_ROOT / "mother-warm",
    "grandfather-mentor": PERSONA_ROOT / "grandfather-mentor",
}

PERSONA_SUMMARIES = {
    "father-calm": {
        "label": "아버지 페르소나",
        "tone": "차분하고 핵심만 짚는 조언형",
    },
    "mother-warm": {
        "label": "어머니 페르소나",
        "tone": "정서적 공감과 생활 맥락을 살리는 대화형",
    },
    "grandfather-mentor": {
        "label": "할아버지 페르소나",
        "tone": "회고와 조언이 섞인 회상형",
    },
}

QUERY_STOP_TERMS = {
    "db",
    "가족방",
    "기록",
    "관련",
    "내용",
    "찾아",
    "요약",
    "요약해줘",
    "알려줘",
    "답해줘",
    "있으면",
    "없으면",
    "정확한",
    "이름",
    "2문장",
    "2문장으로",
}


def normalize_term(term: str) -> str:
    term = term.strip()
    suffixes = ["에서", "으로", "에게", "께서", "과", "와", "은", "는", "이", "가", "을", "를", "도", "만", "의", "에"]
    for suffix in suffixes:
        if term.endswith(suffix) and len(term) > len(suffix) + 1:
            return term[: -len(suffix)]
    return term


def extract_search_terms(query: str) -> set[str]:
    query_terms: set[str] = set()
    normalized_query = query
    for punctuation in ["?", ",", ".", "!", ":", ";", "/", "\\", "(", ")", "[", "]"]:
        normalized_query = normalized_query.replace(punctuation, " ")

    for raw_term in normalized_query.split():
        term = normalize_term(raw_term)
        if len(term) < 2 or term.casefold() in QUERY_STOP_TERMS:
            continue
        query_terms.add(term)
    return query_terms


def load_selected_persona_markdown(persona_id: str) -> str:
    persona_root = PERSONA_PACKS.get(persona_id)
    if persona_root is None:
        raise KeyError(f"Unknown persona id: {persona_id}")
    return load_persona_pack(persona_root)


def list_persona_options() -> list[dict]:
    return [
        {
            "id": persona_id,
            "label": PERSONA_SUMMARIES[persona_id]["label"],
            "tone": PERSONA_SUMMARIES[persona_id]["tone"],
        }
        for persona_id in PERSONA_PACKS.keys()
    ]


def retrieve_room_chunks(db: Session, room_id: str, user_id: str, query: str, limit: int = 3) -> list[RetrievalChunk]:
    ensure_room_member(db, room_id, user_id)

    uploads = db.scalars(
        select(Upload)
        .where(Upload.room_id == room_id)
        .order_by(Upload.created_at.desc(), Upload.id.desc())
    ).all()

    query_terms = extract_search_terms(query)

    scored: list[tuple[int, Upload]] = []
    for upload in uploads:
        clean_description, upload_tags = unpack_description_and_tags(upload.description)
        haystack = " ".join(
            [
                upload.title or "",
                clean_description or "",
                upload.type or "",
                " ".join(upload_tags),
            ]
        )
        score = sum(1 for term in query_terms if term and term in haystack)
        if score > 0:
            scored.append((score, upload))

    scored.sort(key=lambda item: item[0], reverse=True)
    selected = scored[:limit]

    # confidence = 실제 커버리지(질의 내용어 중 매치 비율). 하드코드 0.75는 허구였다.
    denom = max(len(query_terms), 1)
    return [
        RetrievalChunk(
            source_type=upload.type,
            timestamp=upload.created_at.isoformat() if upload.created_at else "",
            text=f"{upload.title} {(unpack_description_and_tags(upload.description)[0] or '')}".strip(),
            tags=[upload.type, "family-room", *unpack_description_and_tags(upload.description)[1]],
            confidence=round(score / denom, 2),
        )
        for score, upload in selected
    ]


def load_room_entity_sources(db: Session, room_id: str) -> tuple[list[str], list[str]]:
    """가족방 엔티티 사전 재료 — 멤버(이름+관계 호칭)는 DB에서, 장소는 방 전체 기록에서."""
    member_rows = db.execute(
        select(User.name, FamilyMember.relation_to_related_user)
        .join(FamilyMember, FamilyMember.user_id == User.id)
        .where(FamilyMember.room_id == room_id)
    ).all()
    member_names: list[str] = []
    for name, relation in member_rows:
        if name:
            member_names.append(str(name))
        if relation:
            member_names.append(str(relation))

    uploads = db.scalars(select(Upload).where(Upload.room_id == room_id)).all()
    record_texts = []
    for upload in uploads:
        clean_description, upload_tags = unpack_description_and_tags(upload.description)
        record_texts.append(" ".join(
            [upload.title or "", clean_description or "", " ".join(upload_tags)]).strip())
    return member_names, record_texts


# Phase 0: 프로바이더 실패는 '답변인 척'하지 않는다 — 실패를 밝히고 기록 원문만 보여준다.
PROVIDER_DOWN_TMPL = ("죄송합니다. 지금 모델 응답을 받지 못해 새 답변을 만들 수 없습니다. "
                      "지어내는 대신 남아 있는 기록 원문을 그대로 보여드립니다: {quotes}")


def _quote_snippets(evidence_texts: list[str], limit: int = 2) -> str:
    return " / ".join(f"「{t[:42]}…」" if len(t) > 42 else f"「{t}」"
                      for t in evidence_texts[:limit]) or "「저장된 기록 없음」"


def build_demo_chat_response(
    *,
    db: Session,
    room_id: str,
    user_id: str,
    model_id: str,
    persona_id: str,
    query: str,
):
    persona_markdown = load_selected_persona_markdown(persona_id)
    chunks = retrieve_room_chunks(db=db, room_id=room_id, user_id=user_id, query=query)
    prompt_package = build_prompt_package(
        model_id=model_id,
        persona_markdown=persona_markdown,
        user_query=query,
        retrieved_chunks=chunks,
    )
    evidence_texts = [chunk.text for chunk in chunks]
    member_names, record_texts = load_room_entity_sources(db, room_id)
    entity_index = build_room_entity_index(member_names, record_texts)
    provider = get_provider_for_model(model_id)

    # ── 입력 래더 (Phase 2): 기록으로 답 못 하는 질문은 LLM을 부르지 않는다 ──
    effective_query = query
    decision = route_query(effective_query, evidence_texts, entity_index)

    # 방에 기록은 있는데 '검색'만 0건이면 NO_RECORD가 아니라 CLARIFY가 맞는 메시지다.
    if decision.route == "NO_RECORD" and record_texts:
        decision = RouteDecision(route="CLARIFY", answer=CLARIFY_TMPL, detail="retrieval_miss")

    # CLARIFY일 때만 LLM에게 질문 재작성(오타/맞춤법/축약 복원)을 1회 맡긴다 —
    # 재작성은 '지각' 작업이고, 재작성 결과도 다시 규칙 래더가 판정한다 (제어권은 규칙에).
    if decision.route == "CLARIFY":
        rewrite_response = provider.generate(InferenceRequest(
            model_id=model_id,
            user_query=query,
            prompt_package={
                "model_profile": prompt_package["model_profile"],
                "instructions": (
                    "사용자 질문을 표준 맞춤법의 자연스러운 한국어 한 문장으로 고쳐 쓰라. "
                    "의미를 더하거나 빼지 말고, 고친 질문 한 문장만 출력하라."),
                "persona_markdown": "",
                "retrieved_evidence": [],
                "user_query": query,
            },
        ))
        rewritten = (rewrite_response.output_text or "").strip().strip('"')
        if (rewrite_response.mode not in {"mock", "unconfigured", "error"}
                and 0 < len(rewritten) <= 200 and rewritten != query):
            # 재작성 질문으로 재검색까지 수행 — 검색 실패형 CLARIFY도 여기서 복구된다
            new_chunks = retrieve_room_chunks(db=db, room_id=room_id, user_id=user_id,
                                              query=rewritten)
            new_evidence = [chunk.text for chunk in new_chunks]
            redecision = route_query(rewritten, new_evidence, entity_index)
            if redecision.route != "CLARIFY" and not (
                    redecision.route == "NO_RECORD" and record_texts):
                effective_query = rewritten
                chunks = new_chunks
                evidence_texts = new_evidence
                redecision.detail = f"{redecision.detail}+llm_rewrite"
                decision = redecision
                prompt_package = build_prompt_package(
                    model_id=model_id,
                    persona_markdown=persona_markdown,
                    user_query=effective_query,
                    retrieved_chunks=chunks,
                )
    if decision.route != "ANSWER":
        return {
            "answer": decision.answer,
            "answer_source": "rule_gate",
            "gate_route": decision.route,
            "gate_detail": decision.detail,
            "gate_action": "llm_not_called",
            "inference_source": "rule_gate",
            "provider_name": "rule_gate",
            "provider_mode": "rule_gate",
            "selected_model": prompt_package["model_profile"],
            "retrieved_evidence": prompt_package["retrieved_evidence"],
        }

    request = InferenceRequest(
        model_id=model_id,
        user_query=effective_query,
        prompt_package=prompt_package,
    )
    provider_response = provider.generate(request)
    # 소형 모델 빈응답 완화: 정상 모드인데 출력이 비면 1회 재생성 (v3 실측: e4b 빈응답 0.37→0)
    if provider_response.mode not in {"mock", "unconfigured", "error"} and \
            len((provider_response.output_text or "").strip()) < 5:
        provider_response = provider.generate(request)
    if provider_response.mode in {"mock", "unconfigured", "error"}:
        # Phase 0: 실패를 밝힌다 — 데모 설명문을 답변인 척 내보내지 않는다
        answer = PROVIDER_DOWN_TMPL.format(quotes=_quote_snippets(evidence_texts))
        answer_source = "fallback"
        gate_action = "provider_unavailable"
    else:
        # ── 출력 게이트 (Phase 1): 누수 제거 + 문장 단위 근거·엔티티 대조 ──
        gate = apply_output_gate(provider_response.output_text or "", effective_query,
                                 evidence_texts, entity_index)
        answer = gate.answer
        answer_source = "provider+gate"
        gate_action = gate.action
    return {
        "answer": answer,
        "answer_source": answer_source,
        "gate_route": decision.route,
        "gate_detail": decision.detail,
        "gate_action": gate_action,
        "inference_source": prompt_package["model_profile"]["placement"],
        "provider_name": provider_response.provider,
        "provider_mode": provider_response.mode,
        "selected_model": prompt_package["model_profile"],
        "retrieved_evidence": prompt_package["retrieved_evidence"],
    }
