"""가족방 엔티티 사전 (Phase 1 확장) — 닫힌 세계의 고유명사 근거.

이 서비스의 구조적 이점: 정답(가족 기록·멤버)이 전부 우리 DB에 있다.
- 인물: FamilyMember⋈User 의 이름 + 관계 호칭 (DB에서 주입)
- 장소: 업로드 제목/태그/본문에서 접미사 규칙으로 추출 (X식당, X병원 …)
특정 가족의 데이터는 코드에 박지 않는다 — 규칙은 코드, 사전은 데이터.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.ai.gates.textrules import content_tokens

# 도메인 정적 어휘 (가족 유산 서비스라 안 낡는 하드코딩 — SCPC cue 리스트와 같은 부류)
PLACE_SUFFIXES = ("식당", "병원", "공원", "카페", "호텔", "펜션", "가게", "센터", "시장",
                  "해변", "학교", "숙소", "약국", "미용실", "성당", "교회", "절")
KINSHIP = ("아버지", "아빠", "엄마", "어머니", "할아버지", "할머니", "외할아버지", "외할머니",
           "막내", "첫째", "둘째", "셋째", "형", "누나", "오빠", "언니", "동생", "이모",
           "삼촌", "고모", "외삼촌", "사촌", "아들", "딸", "손자", "손녀")

# 질문에서 장소 카테고리를 특정하는 명사 → 해당 카테고리(동의어 포함)의 '이름 있는' 장소가
# 기록/사전에 있어야 답변 가능으로 본다.
PLACE_CATEGORY_SYNONYMS = {
    "식당": ("식당", "맛집", "음식점"),
    "가게": ("가게", "상점", "매장"),
    "병원": ("병원", "의원", "클리닉"),
    "공원": ("공원",),
    "숙소": ("숙소", "호텔", "펜션", "리조트"),
    "카페": ("카페",),
    "학교": ("학교",),
    "시장": ("시장",),
}


@dataclass
class RoomEntityIndex:
    persons: set[str] = field(default_factory=set)   # 멤버 이름 + 관계 호칭
    places: set[str] = field(default_factory=set)    # 이름 있는 장소 토큰 (예: 광안리해변 X — 접미사형)


def extract_named_places(texts: list[str]) -> set[str]:
    """접미사로 끝나면서 접미사보다 긴 토큰 = '이름 있는' 장소. ('병원' 단독은 이름이 아님)"""
    places: set[str] = set()
    for text in texts:
        for token in content_tokens(text):
            for suffix in PLACE_SUFFIXES:
                if token.endswith(suffix) and len(token) > len(suffix):
                    places.add(token)
    return places


def extract_kinship_terms(texts: list[str]) -> set[str]:
    found: set[str] = set()
    joined = " ".join(texts)
    for term in KINSHIP:
        if term in joined:
            found.add(term)
    return found


def build_room_entity_index(member_names: list[str], record_texts: list[str]) -> RoomEntityIndex:
    persons = {name.strip() for name in member_names if name and len(name.strip()) >= 2}
    persons |= extract_kinship_terms(record_texts)
    places = extract_named_places(record_texts)
    return RoomEntityIndex(persons=persons, places=places)


def question_place_category(query: str) -> tuple[str, ...] | None:
    """질문이 특정 장소 카테고리의 '이름'을 묻는가 → 동의어 묶음 반환."""
    for synonyms in PLACE_CATEGORY_SYNONYMS.values():
        if any(word in query for word in synonyms):
            return synonyms
    return None


def has_named_place_of(category_synonyms: tuple[str, ...], index: RoomEntityIndex,
                       evidence_texts: list[str]) -> bool:
    candidates = index.places | extract_named_places(evidence_texts)
    return any(place.endswith(suffix) for place in candidates for suffix in category_synonyms)


def has_any_person(index: RoomEntityIndex, evidence_texts: list[str]) -> bool:
    joined = " ".join(evidence_texts)
    if any(term in joined for term in KINSHIP):
        return True
    return any(name in joined for name in index.persons)
