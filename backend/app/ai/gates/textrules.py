"""게이트 공용 텍스트 규칙 — 조사 제거, 내용어, hard-atom 추출, 한국어 판정, 누수 패턴.

전부 결정론·stdlib. DGX A/B 실험(research_notes/gate_ab_eval_2026-07-12.py)에서 검증된
로직을 그대로 옮겼다. hard atom = 숫자(시각/금액/날짜 성분)와 따옴표 인용구 —
한국어 NER 없이도 오탐이 낮은, 객관 대조 가능한 집합.
"""
from __future__ import annotations

import re
import unicodedata

# SCPC 이식: 안전한 단방향 표기 접기 (메신저 종결 변이·맞춤법 혼동 — 검증된 목록만)
CANONICAL_FOLDS = (
    ("해주세여", "해줘"), ("해주세용", "해줘"), ("해주세요", "해줘"), ("해줘요", "해줘"),
    ("알려주세여", "알려줘"), ("알려주세요", "알려줘"), ("알려줘요", "알려줘"),
    ("됬", "됐"), ("안됨", "안된다"), ("안돼", "안된다"),
    # 흔한 맞춤법 오류 → 표준형 (cue 어휘와 직결되는 것만: 몇일은 며칠의 대표적 오기)
    ("몇 일", "며칠"), ("몇일", "며칠"), ("메칠", "며칠"), ("몇 칠", "며칠"),
    ("어데", "어디"), ("오데", "어디"), ("어듸", "어디"),
    ("얼마에요", "얼마"), ("얼마예요", "얼마"), ("멫", "몇"),
)

# ── SCPC 이식: 두벌식 인접키 자모 오타 1글자 허용 매칭 ─────────────────────────
# 한글 4음절 이상 cue에만 적용 (짧은 cue는 오탐 위험 — SCPC 검증 임계 그대로)
_HANGUL_LEADS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
_HANGUL_VOWELS = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
_HANGUL_TAILS = "\0ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"
_DUBEOLSIK_ROWS = ("ㅂㅈㄷㄱㅅ", "ㅁㄴㅇㄹㅎ", "ㅋㅌㅊㅍ", "ㅛㅕㅑㅐㅔ", "ㅗㅓㅏㅣ", "ㅠㅜㅡ")
_DUBEOLSIK_POSITION = {
    jamo: (row_index, column_index)
    for row_index, row in enumerate(_DUBEOLSIK_ROWS)
    for column_index, jamo in enumerate(row)
}


def _hangul_parts(char: str):
    offset = ord(char) - 0xAC00
    if not 0 <= offset < 11172:
        return None
    lead, rest = divmod(offset, 588)
    vowel, tail = divmod(rest, 28)
    return _HANGUL_LEADS[lead], _HANGUL_VOWELS[vowel], _HANGUL_TAILS[tail]


def _adjacent_jamo(left: str, right: str) -> bool:
    lp = _DUBEOLSIK_POSITION.get(left)
    rp = _DUBEOLSIK_POSITION.get(right)
    return lp is not None and rp is not None and lp[0] == rp[0] and abs(lp[1] - rp[1]) == 1


def one_adjacent_jamo_typo(text: str, cue: str) -> bool:
    """cue와 정확히 한 글자만 다르고, 그 차이가 인접키 자모 1개인 창이 text에 있으면 True."""
    hangul_count = sum("가" <= ch <= "힣" for ch in cue)
    if hangul_count < 4:
        return False
    for start in range(len(text) - len(cue) + 1):
        window = text[start:start + len(cue)]
        diffs = [(a, b) for a, b in zip(window, cue) if a != b]
        if len(diffs) != 1:
            continue
        left_parts = _hangul_parts(diffs[0][0])
        right_parts = _hangul_parts(diffs[0][1])
        if left_parts is None or right_parts is None:
            continue
        comp = [(a, b) for a, b in zip(left_parts, right_parts) if a != b]
        if len(comp) == 1 and _adjacent_jamo(*comp[0]):
            return True
    return False


def normalize_query(text: str) -> str:
    out = unicodedata.normalize("NFC", text or "")
    for variant, canonical in CANONICAL_FOLDS:
        out = out.replace(variant, canonical)
    return out


def has_cue(text: str, cues) -> bool:
    """공백·오타 강건 cue 매칭 — 표기 접기 + 무공백 + 인접키 자모 오타 1글자(4음절+ cue만)."""
    normalized = normalize_query(text)
    squashed = normalized.replace(" ", "")
    for cue in cues:
        squashed_cue = cue.replace(" ", "")
        if cue in normalized or squashed_cue in squashed:
            return True
        if one_adjacent_jamo_typo(squashed, squashed_cue):
            return True
    return False

JOSA = ["에서", "으로", "에게", "께서", "이었는지", "였는지", "인지", "과", "와", "은", "는",
        "이", "가", "을", "를", "도", "만", "의", "에", "로", "야"]

STOP = {"기록", "기록에", "알려줘", "말해줘", "써줘", "정리해줘", "요약해줘", "있으면", "없으면",
        "정확한", "정확히", "가족", "가족방", "문장", "문장으로", "문단으로", "바탕으로", "몇",
        "언제", "어디", "누구", "누가", "무엇", "뭐였는지", "이름", "우리", "그날", "기준"}

LEAK_PATTERNS = [r"</?think>", r"^#+\s", r"Retrieved Evidence", r"retrieved_evidence",
                 r"tags\s*=", r"confidence\s*=", r"persona", r"instructions?\s*:",
                 r"system prompt", r"\bsaved_at\b"]

REFUSAL_CUES = ("확인되지 않", "기록에 없", "기록에는 없", "남아 있지 않", "알 수 없",
                "확인할 수 없", "나와 있지 않", "적혀 있지 않")


def strip_josa(token: str) -> str:
    for josa in sorted(JOSA, key=len, reverse=True):
        if token.endswith(josa) and len(token) > len(josa) + 1:
            return token[: -len(josa)]
    return token


def content_tokens(text: str) -> set[str]:
    text = re.sub(r"[^\w가-힣\s]", " ", text or "")
    out: set[str] = set()
    for raw in text.split():
        token = strip_josa(raw)
        if len(token) >= 2 and token not in STOP:
            out.add(token)
    return out


def num_atoms(text: str) -> set[str]:
    atoms: set[str] = set()
    for m in re.finditer(r"\d+(?::\d+)?", text or ""):
        atoms.add(m.group().split(":")[0].lstrip("0") or "0")
        if ":" in m.group():
            atoms.add(m.group())
    return atoms


def quote_atoms(text: str) -> set[str]:
    return {m.group(1).strip()
            for m in re.finditer(r"[‘'\"“]([^’'\"”]{2,40})[’'\"”]", text or "")}


def unsupported_atoms(text: str, evidence_text: str, query: str) -> set[str]:
    """숫자는 원자 일치, 인용구는 substring 대조(부분 인용 허용). {1,2,3}은 서수 허용."""
    allowed_source = f"{evidence_text} {query}"
    allowed_nums = num_atoms(allowed_source) | {"1", "2", "3"}
    unsupported = {n for n in num_atoms(text) if n not in allowed_nums}
    unsupported |= {q for q in quote_atoms(text) if q not in allowed_source}
    return unsupported


def strip_leaks(text: str) -> tuple[str, bool]:
    leaked = False
    text = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S)
    kept_lines = []
    for line in text.splitlines():
        if any(re.search(p, line, flags=re.I) for p in LEAK_PATTERNS):
            leaked = True
            continue
        kept_lines.append(line)
    return "\n".join(kept_lines).strip(), leaked


def korean_ok(text: str) -> bool:
    letters = re.findall(r"[A-Za-z가-힣]", text or "")
    if not letters:
        return False
    hangul = re.findall(r"[가-힣]", text)
    return len(hangul) / len(letters) >= 0.5


def looks_refusal(text: str) -> bool:
    return any(cue in (text or "") for cue in REFUSAL_CUES)
