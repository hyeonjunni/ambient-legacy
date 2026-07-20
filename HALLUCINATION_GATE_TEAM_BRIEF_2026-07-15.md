# 할루시네이션 게이트 전환 — 팀 공유 문서

작성일: 2026-07-15 · 작성: 현준
대상: 전체 팀 (LLM 쪽 배경 없어도 읽히게 씀)
목적: 7월 실험 이후 백엔드 구조가 왜/어떻게 바뀌었는지 공유하고, 다음 단계 중 **혼자 결정하면 안 되는 것들**을 회의 안건으로 올린다.

---

## 0. 세 줄 요약

- 환각(없는 기록을 지어내서 답하는 문제)을 "더 큰 모델, 파인튜닝"으로 잡으려던 방향을 접었다. 대신 **모델 앞뒤에 규칙 검문소를 세우는 구조**로 바꿨다.
- 결과: 2B짜리 작은 모델 + 검문소 조합이 **0.97**, 우리가 공들여 파인튜닝한 32B 단독이 **0.90** (자체 평가셋 30문항 기준). 작은 모델이 이겼다.
- 코드는 전부 반영·푸시돼 있고 자동 테스트도 통과 상태. 남은 건 **스키마 변경, OCR 연동, 대형모델 역할 정리** 같은 팀 결정 사항 — 6절에 안건으로 정리했다.

---

## 1. 문제가 뭐였나

우리 서비스는 가족 기록(사진 메모, 텍스트, OCR 문자)을 저장해두고, 챗봇한테 물어보면 그 기록을 근거로 답하는 구조다. 이런 방식을 RAG라고 부른다 — **질문이 오면 관련 기록을 먼저 검색해서, 그 검색 결과를 근거 자료로 모델에게 쥐여주고 답하게 하는 방식**이다.

문제는 근거를 쥐여줘도 모델이 지어낸다는 것.

> 실제 사례 유형: 기록에는 "병원 예약, 오전 10시"까지만 있는데
> "예약한 병원 이름이 뭐야?"라고 물으면 → "OO내과입니다"라고 **이름을 만들어서** 답함.

가족 기록 서비스에서 이건 그냥 오답이 아니라 신뢰 붕괴다. 돌아가신 분의 말을 지어내는 상황까지 갈 수 있다.

**지금까지의 접근과 한계**

| 시도 | 결과 | 왜 한계인가 |
|---|---|---|
| 더 큰 모델 (32B급) | 환각 줄어들지만 남음 | 확률을 낮추는 것이지 0으로 만드는 게 아님. 서버 비용·속도 부담 |
| 파인튜닝 (5~6월, LoRA/QLoRA 여러 번) | 마찬가지로 줄지만 남음 | "지어내지 마"를 학습시켜도 보장이 아님. 데이터 만들고 학습 돌리는 비용 큼 |
| 프롬프트에 "지어내지 마" 강화 | 거의 무변화 | 2절에서 설명. 이번에 실험으로 확인함 |

셋 다 공통점: **환각 확률을 낮추는 방법이지, 환각이 불가능한 구조를 만드는 방법이 아니다.** 이번 전환의 핵심이 이 차이다.

---

## 2. SCPC 대회에서 배운 것

7월 초까지 삼성 SCPC(DACON) 대회에 나갔다. 로컬 소형 LLM으로 문제를 풀리는 하네스(모델을 감싸는 실행 구조)를 만드는 대회였고, 규칙 기반 하네스로 0.705에서 0.8636까지 올렸다. 거기서 얻은 교훈 세 개가 이번 전환의 근거다.

### 교훈 1. "지시"는 "장치"가 아니다

쉬운 버전: 모델한테 "문제를 전체 다 읽고, 앞부분에 꽂히지 말고, 규칙대로 해"라고 아무리 정확하게 써줘도, **말을 잘 듣게 될 뿐 말대로 동작하는 기계가 되는 게 아니다.**

실측: 대회에서 지시문을 대충 쓴 버전과 아주 정밀하게 쓴 버전의 점수가 **0.645 → 0.645**. 소수점까지 같았다. 지시문 품질은 병목이 아니었다는 뜻이다.

전문 버전: 프롬프트 인스트럭션은 모델의 어텐션 분포에 영향을 주는 입력일 뿐, 실행을 강제하는 제어 구조(control flow)가 아니다. 결정론이 필요한 로직은 프롬프트가 아니라 코드에 있어야 한다.

### 교훈 2. 규칙을 "학습"으로 흉내 내면 천장이 있다

대회 끝나고 궁금해서 따로 실험했다. 우리가 손으로 짠 규칙(정답률 1.00짜리)을, 그 규칙이 만든 라벨로 머신러닝 모델들에게 흉내 내게 하면 어디까지 따라오나.

| 방식 | 검증 정답률 |
|---|---|
| 손으로 짠 규칙 | **1.00** (당연함, 기준선) |
| GBDT (부스팅 트리) | 0.63 ~ 0.68 |
| MLP (신경망) | 0.71 |
| TabM (테이블 특화 신경망, 신형) | 0.73 |

훈련 데이터 안에서는 규칙을 거의 완벽하게 모사(1.00 근접)하는데, 새 데이터로 가면 0.64~0.90으로 떨어졌다. **선생(규칙)이 있는데 학생(학습기)을 굳이 만들면, 학생은 선생을 넘지 못하고 보통 한참 밑돈다.** 규칙이 이미 있으면 규칙을 그대로 쓰는 게 맞다.

전문 버전: 명시적 결정 규칙이 존재하는 태스크에서 소량 라벨로 학습기를 증류하면 학생 성능 ≤ 교사 성능이며, 분포 이동 시 갭이 커진다. 흥미로운 부수 결과: depth-4 결정트리가 우리 규칙의 분기 골격을 스스로 재발견했다 — 규칙이 자의적인 게 아니라 데이터 구조상 자연스러운 경계라는 방증.

### 교훈 3. 역할 분리 — LLM은 '지각', 규칙은 '제어'

정리하면 이렇게 된다.

- **LLM이 잘하는 것**: 읽기, 요약, 자연스러운 문장 만들기, 오타 섞인 질문의 의도 알아듣기 → 사람의 눈·귀·입에 해당. **지각(perception)**.
- **LLM이 못 하는 것**: "이 조건이면 반드시 이렇게 해라"를 100% 지키기 → 분기, 검증, 거절 결정. **제어(control)**.
- 그러니 제어는 전부 코드로 빼고, LLM은 지각이 필요한 순간에만 부른다.

이걸 우리 서비스에 그대로 적용한 게 이번 작업이다.

---

## 3. 바뀐 구조

각 절 끝에 실제 저장소 코드를 발췌해 붙였다. 발표 때 "코드에서 뭐가 바뀌었나"를 바로 보여줄 수 있게 한 것으로, `# … (중략)`은 지면상 생략 표시이고 나머지는 저장소 그대로다.

### 3-1. 전체 흐름 (Before / After)

**Before — 모델이 전부 담당**

```
질문 → 기록 검색 → [LLM이 알아서 답변] → 사용자
                     ↑ 여기서 지어내면 그대로 나감
```

**After — 규칙이 앞뒤로 검문**

```
질문 → 기록 검색 → [① 입력 래더: 답변 가능한 질문인가?]
                        ├─ 불가 판정 → 정해진 문구로 응답 (LLM 호출 자체를 안 함)
                        └─ 가능 판정 → [LLM 생성] → [② 출력 게이트: 문장마다 근거 대조]
                                                        ├─ 근거 없는 문장 → 삭제
                                                        └─ 통과 문장만 → 사용자
```

핵심: **거절해야 하는 질문에는 LLM이 아예 호출되지 않는다.** 호출이 없으면 환각도 없다. 확률을 낮춘 게 아니라 그 경로에서는 구조적으로 0이다.

이 주장을 코드로 보면 이렇다. 파이프라인 본체에서 래더 판정이 ANSWER가 아니면 **그 자리에서 반환**해버린다 — 아래쪽의 LLM 호출 코드에 도달 자체를 하지 않는다.

```python
# backend/app/ai/demo_service.py — 파이프라인 본체 (발췌)

    # ── 입력 래더: 기록으로 답 못 하는 질문은 LLM을 부르지 않는다 ──
    decision = route_query(effective_query, evidence_texts, entity_index)

    # 방에 기록은 있는데 '검색'만 0건이면 NO_RECORD가 아니라 CLARIFY가 맞는 메시지다.
    if decision.route == "NO_RECORD" and record_texts:
        decision = RouteDecision(route="CLARIFY", answer=CLARIFY_TMPL, detail="retrieval_miss")

    # … (CLARIFY 한정 재작성 — 3-5절 발췌 참고) …

    if decision.route != "ANSWER":
        return {                          # ← 여기서 즉시 반환. LLM 호출 코드는 이 아래에 있다
            "answer": decision.answer,    #    답변은 모델 생성이 아니라 정해진 문구
            "answer_source": "rule_gate",
            "gate_route": decision.route,
            # … (중략)
        }
```

바뀐 지점: 예전에는 검색 결과를 바로 프롬프트에 붙여 LLM을 **항상** 호출했다. 지금은 `route_query` 판정이 호출 여부 자체를 결정한다.

### 3-2. ① 입력 래더 — 질문 문지기

질문을 다섯 갈래로 분류한다. 이름은 대회 때 쓰던 체계를 그대로 가져왔다.

| 경로 | 판정 기준 (쉬운 설명) | LLM 호출 | 앱 화면 |
|---|---|---|---|
| ANSWER | 기록에 답이 있음 → 정상 진행 | O | 일반 말풍선 + "근거 확인" 배지 |
| REFUSE | 묻는 종류의 정보(이름·날짜·시각 등)가 기록에 없음 | **X** | 🛡️ "기록에 없는 내용이에요" 카드 + 남아 있는 기록 인용 |
| CONFLICT | 기록끼리 서로 다름 (예: 예약이 10시 기록 vs 11시 기록) | **X** | ⚖️ "기록이 서로 달라요" 카드, 둘 다 보여줌 |
| CLARIFY | 질문이 모호해서 어느 기록인지 특정 불가 | 재작성 1회만 | 💬 "조금 더 구체적으로" 카드 |
| NO_RECORD | 방에 기록 자체가 없음 | **X** | 📭 "아직 기록이 없어요" 카드 |

판정 방식(전문 버전): 질문에서 묻는 원자 종류를 추출한다 — 시각, 월일, 연도, 수량, 엔티티(이름·장소·인물). 각 종류에 대해 검색된 기록 안에 해당 패턴(정규식 + 사전 대조)이 실존하는지 확인하고, 하나라도 없으면 REFUSE. 날짜는 세분화했다: "몇 월 며칠"을 물었는데 기록에 "2018년"만 있으면 못 답하는 게 맞으므로 연도/월일을 따로 판정한다.

```python
# backend/app/ai/gates/answer_router.py — 질문이 묻는 '원자 종류' 추출 (발췌)

def asked_atom_kinds(query: str) -> set[str]:
    kinds: set[str] = set()
    if has_cue(query, ("몇 시", "시각", "몇 분")):
        kinds.add("time")
    # 날짜는 세분화: 월/일을 물으면 연도만 있는 기록으로는 답할 수 없다
    if has_cue(query, ("며칠", "몇 월")):
        kinds.add("date_md")
    if has_cue(query, ("몇 년", "년도")):
        kinds.add("date_y")
    # … (수량·엔티티 종류 추출 중략)
    return kinds
```

```python
# backend/app/ai/gates/answer_router.py — REFUSE 판정 (발췌)

    if is_fact:
        missing: list[str] = []
        for kind in sorted(kinds):
            if kind == "entity":
                ok, why = _entity_answerable(query, evidence_texts, index)   # 사전 대조 (3-3절)
                if not ok:
                    missing.append(f"entity({why})")
            elif not _evidence_has_kind(kind, query, joined):                # 정규식 실존 확인
                missing.append(kind)
        if missing:                       # 묻는 종류 중 하나라도 기록에 없으면 → 거절 확정
            return RouteDecision(
                route="REFUSE", asked_kinds=sorted(kinds),
                answer=REFUSE_TMPL.format(quotes=_quote_snippets(evidence_texts)),
                detail=f"missing_kinds={','.join(missing)}")
```

바뀐 지점: 이 파일 자체가 신설이다. "답할 수 있는 질문인가"라는 판단이 예전에는 모델 안(블랙박스)에 있었고, 지금은 읽고 고칠 수 있는 40줄짜리 함수다. 거절 사유(`missing_kinds=…`)까지 문자열로 남아서 디버깅이 된다.

### 3-3. 엔티티 사전 — 우리 가족방의 "출석부"

"예약한 병원 **이름**"류 질문이 제일 위험했다. 이름의 존재 여부는 정규식으로 못 잡는다. 그래서 가족방마다 **폐쇄 세계 사전**을 만든다.

- 인물: 가족방 멤버 테이블에서 이름 + 호칭(아버지, 막내 등)을 그대로 가져옴. DB에 이미 있는 데이터다.
- 장소: 기록 텍스트에서 "~식당, ~병원, ~공원, ~카페 …" 접미사로 끝나는 **이름 붙은** 토큰만 추출. "병원"이라는 일반명사 단독은 이름이 아니므로 제외.

그리고 원칙 하나: **규칙은 코드에, 사전은 데이터에.** 특정 가족의 이름이나 장소를 코드에 하드코딩하지 않는다. 코드에는 "멤버 테이블을 읽어라, 접미사로 장소를 뽑아라"라는 규칙만 있고, 내용물은 방마다 DB에서 만들어진다. 새 가족이 가입해도 코드 수정이 없다.

효과: 자체 평가셋의 "답 못 하는 질문" 13개 중 12개를 이 사전 + 래더가 **결정론적으로**(모델 컨디션과 무관하게 항상 같게) 거절한다.

```python
# backend/app/ai/demo_service.py — 사전 재료는 DB에서 (발췌)

def load_room_entity_sources(db: Session, room_id: str) -> tuple[list[str], list[str]]:
    """가족방 엔티티 사전 재료 — 멤버(이름+관계 호칭)는 DB에서, 장소는 방 전체 기록에서."""
    member_rows = db.execute(
        select(User.name, FamilyMember.relation_to_related_user)
        .join(FamilyMember, FamilyMember.user_id == User.id)
        .where(FamilyMember.room_id == room_id)
    ).all()
    # … (이름/호칭 수집, 방 전체 업로드 텍스트 수집 중략)
```

```python
# backend/app/ai/gates/entity_index.py — 장소 추출과 사전 조립 (발췌)

PLACE_SUFFIXES = ("식당", "병원", "공원", "카페", "호텔", "펜션", "가게", "센터", "시장",
                  "해변", "학교", "숙소", "약국", "미용실", "성당", "교회", "절")

def extract_named_places(texts: list[str]) -> set[str]:
    """접미사로 끝나면서 접미사보다 긴 토큰 = '이름 있는' 장소. ('병원' 단독은 이름이 아님)"""
    places: set[str] = set()
    for text in texts:
        for token in content_tokens(text):
            for suffix in PLACE_SUFFIXES:
                if token.endswith(suffix) and len(token) > len(suffix):
                    places.add(token)
    return places

def build_room_entity_index(member_names: list[str], record_texts: list[str]) -> RoomEntityIndex:
    persons = {name.strip() for name in member_names if name and len(name.strip()) >= 2}
    persons |= extract_kinship_terms(record_texts)      # 아버지·막내 같은 호칭도 인물로
    places = extract_named_places(record_texts)
    return RoomEntityIndex(persons=persons, places=places)
```

바뀐 지점: 코드 어디에도 특정 가족의 이름·장소가 없다. "멤버 테이블을 조인해라, 접미사로 뽑아라"라는 **규칙만 코드**이고, 내용물은 방마다 DB에서 매 요청 조립된다. 그래서 새 가족이 가입해도 배포 없이 그대로 동작한다.

### 3-4. ② 출력 게이트 — 문장 단위 팩트체크

ANSWER 경로로 LLM이 답을 만들어도 그대로 내보내지 않는다. 문장마다 검사한다.

1. **누수 제거**: 모델이 흘리는 내부 흔적(`<think>`, tags= 같은 것) 삭제
2. **한국어 검사**: 영어로 폭주하면 기록 인용으로 강등
3. **하드 원자 대조**: 문장 속 숫자·시각·날짜·따옴표 인용이 검색된 기록 안에 실제로 존재하는지 문자열 수준에서 대조. 없으면 그 문장 삭제
4. **엔티티 대조**: 문장 속 장소명·인명이 기록 또는 사전에 있는지. 없으면 삭제 (예: 기록에 없는 "해운대식당"이 답변에 등장 → 그 문장 삭제)
5. **강등 폴백**: 전 문장이 삭제되면 답변을 포기하는 대신 기록 원문 인용으로 대체

사용자에게는 이 과정이 배지로 보인다 — "모든 문장이 기록 근거로 확인됐어요"(전부 통과) 또는 "확인되지 않은 문장 N개를 제외했어요"(일부 삭제).

```python
# backend/app/ai/gates/output_gate.py — 문장 단위 검증 루프 (발췌)

def apply_output_gate(raw_answer, query, evidence_texts, entity_index=None):
    # … (누수 제거 strip_leaks, 한국어 검사 korean_ok — 실패 시 인용 폴백 중략)

    sentences = re.split(r"(?<=[.다요!?])\s+", text)      # 문장 단위로 쪼개서
    kept, dropped, found = [], 0, []
    for sentence in sentences:
        bad = unsupported_atoms(sentence, evidence_joined, query)    # 숫자·시각·인용 대조
        bad |= _unsupported_entities(sentence, allowed_source, index)  # 장소명·인명 사전 대조
        if bad:
            dropped += 1                  # 근거 없는 원자가 하나라도 있으면 그 문장은 버림
            found.extend(sorted(bad))
            continue
        kept.append(sentence)

    if not kept:                          # 전 문장이 잘렸으면 → 답변 포기 대신 기록 원문 인용
        return GateResult(answer=FALLBACK_TMPL.format(quotes=_quote_snippets(evidence_texts)),
                          action="all_dropped_quote", ...)

    return GateResult(answer=" ".join(kept).strip(),
                      action="pass" if dropped == 0 else f"dropped_{dropped}", ...)
```

바뀐 지점: 예전에는 모델 출력이 그대로 사용자에게 갔다. 지금은 모든 출력이 이 루프를 통과하며, 몇 문장이 왜 잘렸는지(`dropped_N`, `unsupported_found`)가 응답 메타데이터로 남는다 — 앱 배지가 이 값을 그대로 읽는다.

### 3-5. 오타·맞춤법 내성 (이번 주 추가)

실사용 질문에는 오타가 섞인다. "막내 생일이 **몇일**이야?" — 표준어는 '며칠'이라 규칙이 날짜 질문인 걸 못 알아보면 엉뚱하게 거절해버린다. 세 겹으로 방어한다.

1. **표기 접기**: 몇일→며칠, 어데→어디 같은 자주 틀리는 표기 10쌍을 판정 전에 정규화. 사용자에게 보여주는 문장은 원문 유지, 판정용 내부 문자열만 접는다.
2. **자판 오타 매칭**: 두벌식 키보드에서 인접한 키끼리의 한 글자 오타를 허용 (건강검**짐**→건강검진). 대회 때 만든 자모 분해 매처를 이식했다. 짧은 단어는 오탐이 나서 4음절 이상에만 적용.
3. **LLM 재작성 (CLARIFY 한정)**: 규칙으로도 못 알아들은 모호 질문만 모델에게 "표준 맞춤법 한 문장으로 고쳐 써라" 1회 시킨다. 중요한 건 **고쳐 쓴 문장을 모델이 바로 답하는 게 아니라, 다시 규칙 래더에 넣어 재판정**한다는 것. 고쳐 쓰기는 지각의 일이라 모델에게 주고, 답할지 말지 결정은 여전히 규칙이 한다.

```python
# backend/app/ai/gates/textrules.py — 1겹: 표기 접기 (발췌)

CANONICAL_FOLDS = (
    # … (해요체 접기 중략)
    # 흔한 맞춤법 오류 → 표준형 (cue 어휘와 직결되는 것만: 몇일은 며칠의 대표적 오기)
    ("몇 일", "며칠"), ("몇일", "며칠"), ("메칠", "며칠"), ("몇 칠", "며칠"),
    ("어데", "어디"), ("오데", "어디"), ("어듸", "어디"),
    ("얼마에요", "얼마"), ("얼마예요", "얼마"), ("멫", "몇"),
)
```

```python
# backend/app/ai/gates/textrules.py — 2겹: 3단계 강등 매칭 (발췌)

def has_cue(text: str, cues) -> bool:
    """공백·오타 강건 cue 매칭 — 표기 접기 + 무공백 + 인접키 자모 오타 1글자(4음절+ cue만)."""
    normalized = normalize_query(text)            # ① 표기 접기 적용
    squashed = normalized.replace(" ", "")        # ② 공백 전부 제거 ("몇 시"↔"몇시" 통일)
    for cue in cues:
        squashed_cue = cue.replace(" ", "")
        if cue in normalized or squashed_cue in squashed:
            return True
        if one_adjacent_jamo_typo(squashed, squashed_cue):   # ③ 자판 오타 1글자 허용
            return True
    return False

def one_adjacent_jamo_typo(text: str, cue: str) -> bool:
    """cue와 정확히 한 글자만 다르고, 그 차이가 인접키 자모 1개인 창이 text에 있으면 True."""
    hangul_count = sum("가" <= ch <= "힣" for ch in cue)
    if hangul_count < 4:          # 짧은 cue는 오탐 위험 → 자모 매칭 제외 (SCPC 검증 임계 그대로)
        return False
    # … (자모 분해 후 인접키 대조 중략)
```

```python
# backend/app/ai/demo_service.py — 3겹: CLARIFY일 때만 재작성 → 재검색 → '재판정' (발췌)

    if decision.route == "CLARIFY":
        rewrite_response = provider.generate(InferenceRequest(
            # 지시: "사용자 질문을 표준 맞춤법의 자연스러운 한국어 한 문장으로 고쳐 쓰라.
            #        의미를 더하거나 빼지 말고, 고친 질문 한 문장만 출력하라."
            # … (요청 조립 중략)
        ))
        rewritten = (rewrite_response.output_text or "").strip().strip('"')
        if (rewrite_response.mode not in {"mock", "unconfigured", "error"}
                and 0 < len(rewritten) <= 200 and rewritten != query):
            # 재작성 질문으로 재검색까지 수행 — 검색 실패형 CLARIFY도 여기서 복구된다
            new_chunks = retrieve_room_chunks(db=db, room_id=room_id, user_id=user_id,
                                              query=rewritten)
            redecision = route_query(rewritten, new_evidence, entity_index)   # ← 다시 규칙이 판정
            if redecision.route != "CLARIFY" and not (
                    redecision.route == "NO_RECORD" and record_texts):
                decision = redecision                 # 규칙이 승인한 경우에만 채택
                redecision.detail = f"{redecision.detail}+llm_rewrite"        # 이력도 남긴다
```

바뀐 지점: 모델 출력(`rewritten`)이 곧바로 답변이 되는 경로가 **없다**. 재작성 결과는 반드시 `route_query`를 다시 통과해야 하고, 실패하면 원래의 CLARIFY 카드(되묻기)로 남는다.

### 3-6. UI — 거절을 실패처럼 안 보이게

거절이 많아지는 구조라, 거절 화면을 대충 두면 "챗봇이 멍청하다"로 읽힌다. 그래서 경로별 카드를 만들었다(3-2 표의 오른쪽 열). 의도는 하나다: **"몰라요"가 아니라 "지어내지 않았어요"로 읽히게.** REFUSE 카드에 남아 있는 기록 인용을 같이 붙이는 이유다 — 없는 건 없다고 하되, 있는 건 보여준다.

```jsx
// app/App.js — 백엔드 gate_route → 카드 매핑 (발췌)

const GATE_CARD_META = {
  REFUSE: {
    icon: "🛡️",
    label: "기록에 없는 내용이에요",
    hint: "추측으로 지어내지 않고, 지금 남아 있는 기록만 보여드립니다.",
    bg: "#FFFBEB", border: "#FDE68A", titleColor: "#B45309",
  },
  CONFLICT: {
    icon: "⚖️",
    label: "기록이 서로 달라요",
    hint: "어느 한쪽으로 단정하지 않고 두 기록을 그대로 보여드립니다.",
    bg: "#EEF2FF", border: "#C7D2FE", titleColor: "#4338CA",
  },
  // … (NO_RECORD·CLARIFY 중략)
};

function describeGateBadge(gateAction) {          // ANSWER 경로의 배지
  const dropped = /^dropped_(\d+)$/.exec(gateAction);   // 출력 게이트가 남긴 dropped_N을 그대로 읽음
  if (dropped) {
    return { text: `기록으로 확인되지 않은 문장 ${dropped[1]}개를 제외했어요`, /* 앰버 */ };
  }
  if (gateAction === "pass") {
    return { text: "모든 문장이 기록 근거로 확인됐어요", /* 초록 */ };
  }
  // … (인용 대체 케이스 중략)
}
```

```jsx
// app/App.js — 응답 렌더 분기 (발췌): 카드 경로면 말풍선 대신 카드를 그린다

{gateCard ? (
  <View style={[styles.gateCard, { backgroundColor: gateCard.bg, borderColor: gateCard.border }]}>
    <Text style={[styles.gateCardTitle, { color: gateCard.titleColor }]}>{gateCard.label}</Text>
    <Text style={styles.chatText}>{responseText}</Text>
    {evidenceLines.length ? (
      <View style={styles.chatEvidenceBox}>
        <Text style={styles.chatEvidenceCaption}>함께 남아 있는 기록</Text>
        {/* … 기록 인용 목록 … */}
      </View>
    ) : null}
  </View>
) : (
  <View style={styles.chatBubbleLeft}>{/* 기존 말풍선 + gateBadge 배지 */}</View>
)}
```

바뀐 지점: 백엔드 게이트가 이미 만들어 놓은 판정값(`gate_route`, `gate_action`)을 앱은 **읽기만** 한다. 앱 쪽에 판단 로직이 없으므로, 게이트 정책이 바뀌어도 앱 수정 없이 카드가 따라온다.

---

## 4. 어떻게 검증했나 (방법론)

### 골든셋 30문항

가상 가족방 데이터 기반으로 4종을 섞었다. 답이 있는 질문 10개 / 기록에 없어서 거절해야 하는 질문 13개 / 기록끼리 모순인 질문 2개 / 조언형 질문 5개. 채점은 사람이 아니라 채점 스크립트가 한다 — 근거 없는 원자 포함률, 거절 정확도, 모순 양립 여부, 내부 흔적 누수율, 빈 응답률 5지표.

### A/B 결과 (핵심 숫자)

| 구성 | 종합 | 비고 |
|---|---|---|
| Gemma E2B (2B) 맨몸 | 낮음 | 소형 모델 단독은 환각 다수 |
| Qwen 32B 파인튜닝 맨몸 | 0.90 | 5~6월 파인튜닝 결과물 |
| **Gemma E2B (2B) + 게이트** | **0.97** | 이번 구조 |

- 거절 정확도 1.00 — 거절해야 할 13개 중 12개는 규칙이 결정론 거절, 나머지 1개도 최종 거절 처리
- 남은 감점은 환각이 아니라 과잉거절 1건 (모델이 빈 응답을 내서 안전하게 강등된 케이스)

**의미**: 온디바이스급 소형 모델로 대형 파인튜닝을 이겼으니, "모델을 키워야 품질이 나온다"는 전제가 우리 서비스에선 깨졌다. 서버 비용과 온디바이스 전환 가능성에 직접 영향.

### 자동 테스트 (한 명령)

```
python3 backend/scripts/check_gates.py
```

- 게이트 단독 자가테스트 22항목 (코어 16 + 강건성 6: 같은 입력 2회 동일 출력, 기록 순서 섞어도 불변, 무관 기록 끼워 넣어도 불변, 오타 변형, 빈 문자열 생존)
- 골든셋 30문항 라우팅 회귀 4항목
- 실서버 E2E — 실제 FastAPI 앱을 띄우고 HTTP로 6개 시나리오(11항목) 검증. LLM 자리에 스텁을 꽂아서 "거절 경로에서 LLM 호출 횟수가 정말 0인지"까지 계수

E2E가 실제 버그도 잡았다: 게이트 정보 필드가 응답 스키마에 없어서 **서버 내부에선 멀쩡한데 HTTP 응답에서 조용히 사라지는** 버그. 내부 함수 테스트만으로는 영원히 못 찾았을 유형이라, 앞으로도 기능 추가 시 E2E까지 붙이는 걸 기본으로 하자.

"거절 경로에서 LLM 호출이 정말 0회인가"를 어떻게 증명하는지도 코드로 보면 이렇다. LLM 자리에 **호출 횟수를 세는 가짜 모델**을 꽂고, 거절 질문 전후로 카운터가 안 움직였는지 확인한다.

```python
# backend/scripts/e2e_gate_demo.py — LLM 자리에 계수기 달린 스텁 (발췌)

class StubProvider:
    def __init__(self):
        self.calls = 0                    # 호출될 때마다 +1
        self.script: list[str] = []       # 시나리오별로 정해둔 출력(환각/근거/빈응답)을 내뱉음

    def generate(self, request):
        self.calls += 1
        text = self.script.pop(0) if self.script else "기록에 있는 내용만 정리해 드렸습니다."
        return InferenceResponse(provider="stub", mode="remote", output_text=text, ...)

# ── 시나리오 ①: 거절 경로는 LLM을 부르지 않는다 ──
before = stub.calls
res = chat("예약한 병원 이름이 뭐였는지 알려줘.")       # 실제 HTTP POST /ai/chat-demo
check("병원 이름 → REFUSE + rule_gate",
      res["answer_source"] == "rule_gate" and res["gate_route"] == "REFUSE")
check("REFUSE 경로 LLM 호출 0회", stub.calls == before)   # ← 카운터가 그대로여야 통과
```

같은 방식으로 환각 차단(스텁이 일부러 "해운대식당" 같은 지어낸 답을 내면 게이트가 그 문장을 자르는지), 오타 라우팅("몇일"), 재작성 후 재판정까지 6개 시나리오를 실서버 HTTP로 돌린다.

---

## 5. 방향성 정리 — 뭐가 달라졌나

| | 기존 방향 | 새 방향 |
|---|---|---|
| 환각 대응 | 모델 키우기·파인튜닝 (확률 낮추기) | 규칙 검문소 (경로별 구조적 차단) |
| 모델 역할 | 판단 + 생성 전부 | 지각·문장 생성만. 판단은 코드 |
| 모델 크기 | 클수록 좋다 | 게이트 위에선 2B로 충분함을 실측. 대형은 별도 역할(6절) |
| 실패 시 UX | 그럴싸한 오답 | 근거 인용 딸린 명시적 거절 |
| 품질 확인 | 눈으로 몇 개 찔러보기 | 골든셋 + 원커맨드 CI + E2E |
| 파인튜닝 | 사실 정확도 목적 | 사실은 게이트 담당. 하더라도 말투·형식 목적으로만 (후순위) |

---

## 6. 회의에서 정해야 하는 것

여기부터는 혼자 진행하지 않고 멈춰둔 항목들. 스키마·UX·인프라가 걸려 있다.

**안건 1. 기록의 "사건 날짜" 필드 추가 (event_date)** — 구조 변경, 최우선
- 문제: 지금 기록에 있는 시간 정보는 "저장한 시각"뿐. "부산 여행 언제 갔어?"의 정답은 여행 간 날이지 업로드한 날이 아니다. 지금은 프롬프트 지시로 "저장 시각을 사건 날짜로 착각하지 마라"라고 방어 중인데, 2절 교훈 1 그대로 — 지시는 보장이 아니다.
- 결정 필요: 업로드 화면에 "언제 있었던 일인가요?" 날짜 입력을 넣을지(선택 입력?), 기존 데이터 마이그레이션은 어떻게 할지.
- 영향: DB 스키마, 업로드 UX, 라우터 날짜 판정 로직.

**안건 2. 모순 검출 범위 확장**
- 지금은 시각(10시 vs 11시)만 잡는다. 날짜·금액까지 넓히는 건 검출기 추가라 저비용. 다만 "어디까지를 모순으로 보고 사용자에게 노출할지" 기준은 같이 정하는 게 좋다 (예: 금액 오차 얼마부터?).

**안건 3. OCR/STT 연동**
- 엔티티 사전의 원료가 지금은 수동 입력 텍스트뿐이다. 사진 속 글자(OCR), 음성 기록(STT)이 들어오면 사전이 자동으로 풍부해진다. 어떤 엔진 쓸지, 어느 시점에 붙일지, 비용.

**안건 4. 검색(retrieval) 강화**
- 지금은 키워드 접점 기반이라 표현이 다르면 못 찾는다 ("생신" vs "생일"). 모호 질문 재작성이 1차 보완 중. 임베딩 검색 도입 여부와 시점 — 서버 자원이 걸려서 회의 필요.

**안건 5. DGX 대형모델 라인업의 역할**
- 레지스트리에 대형 후보 7종이 등록돼 있다 (Gemma3 27B, EXAONE 3.5/Deep/4.0/4.5, 가드레일 튜닝 Qwen 32B, Qwen 72B). 이번 결과를 보면 일상 응답은 소형+게이트로 충분하다. 대형은 "가족 금고 정본 응답"(중요한 질문에 대한 고품질 서면 답변) 전용으로 포지셔닝하는 안을 제안 — 단, 대형+게이트 조합 실측을 먼저 하고 결정하자.

**안건 6. Cloud Run 재배포 일정**
- 게이트 코드가 저장소에는 다 있는데 **운영 백엔드(Cloud Run)에는 아직 배포 전**이다. 배포 전까지 앱에서 카드가 안 보인다(앱이 깨지진 않고 구버전처럼 동작). 데모 일정에 맞춰 배포 타이밍을 정하자.

---

## 7. 지금 해야 하는 테스트 — 안드로이드 실기기

자동 테스트는 전부 통과했지만, 화면 렌더링과 실제 네트워크는 기기에서 봐야 한다.

**준비 (둘 중 하나)**
- A안: Cloud Run에 최신 백엔드 배포 후 그대로 테스트 ← 제대로 된 검증
- B안: 맥북에서 `uvicorn app.main:app --host 0.0.0.0 --port 8000` 실행, 폰과 같은 와이파이에서 앱의 API 주소를 `http://<맥북IP>:8000/api/v1`로 변경 (앱에 주소 변경 기능 이미 있음). 에뮬레이터는 `10.0.2.2:8000`.

빌드: `cd app && npx expo run:android`

**시나리오 체크리스트** — "데모 데이터 준비" 버튼 누른 뒤 순서대로:

| # | 입력 | 기대 결과 | 확인 |
|---|---|---|---|
| 1 | 예약한 병원 이름이 뭐였지? | 🛡️ 앰버 REFUSE 카드 + 기록 인용 | ☐ |
| 2 | 아버지 검진 몇 시야? | ⚖️ CONFLICT 카드, 10시/11시 둘 다 표기 | ☐ |
| 3 | 부산 여행 언제였어? | 일반 말풍선 + 초록 "근거 확인" 배지 | ☐ |
| 4 | 막내 생일이 몇일이야? (오타 그대로) | 정상 답변 "5월 3일" | ☐ |
| 5 | 그때 그거 언제였지? | 재작성 거쳐 답변, 또는 💬 CLARIFY 카드 | ☐ |
| 6 | (기록 없는 새 방에서) 아무 질문 | 📭 NO_RECORD 카드 | ☐ |
| 7 | 부산에서 저녁 뭐 먹었어? | 지어낸 식당명 문장이 잘리고 "N개 제외" 배지 | ☐ |

**기기·UI 관점**

- 좁은 화면에서 카드 줄바꿈, 이모지 렌더, 인용 스니펫 넘침 여부
- 키보드 올라온 상태에서 카드가 가려지지 않는지
- 모델 선택 리스트가 10종으로 늘었다 (DGX 7종 추가) — 스크롤 UX 확인. DGX 모델을 골랐는데 백엔드가 DGX에 못 닿는 상황이면 30초 타임아웃 후 에러 폴백이 곱게 뜨는지
- 비행기모드/백엔드 다운에서 "AI 데모 호출 실패" 팝업 정상 동작
- 용어 주의: 화면에 "온디바이스"로 표시되는 E2B/E4B도 현재 실제 추론은 백엔드 경유다. 진짜 온디바이스 탑재는 별도 과제이니 데모 때 표현 혼동 없게.

---

## 8. 용어 미니 사전

| 용어 | 쉬운 설명 |
|---|---|
| 할루시네이션(환각) | 모델이 근거 없는 내용을 사실처럼 지어내는 것 |
| RAG | 답하기 전에 관련 기록을 검색해 근거로 쥐여주는 방식 |
| 하네스 | 모델을 감싸서 입력·출력을 통제하는 실행 구조. 이번 게이트가 하네스다 |
| 입력 래더 | 질문을 답변가능/거절/모순/모호/기록없음 5갈래로 나누는 문지기 규칙 |
| 엔티티 사전 | 가족방별 인물·장소 명단. 멤버 테이블 + 기록에서 자동 생성 |
| 그라운딩 | 답변 속 정보가 근거 기록에 실제로 있는지 대조하는 일 |
| 하드 원자 | 숫자·시각·날짜·인용처럼 맞다/틀리다가 갈리는 정보 조각 |
| 폴백(강등) | 생성 답변을 포기하고 기록 원문 인용으로 대체하는 안전 동작 |
| 골든셋 | 성능을 항상 같은 기준으로 재기 위한 고정 평가 문항 세트 |
| 결정론적 | 같은 입력이면 언제나 같은 출력. 모델 컨디션에 안 흔들림 |
| 파인튜닝 | 기존 모델을 우리 데이터로 추가 학습시키는 것 |
| 온디바이스 | 서버 없이 폰 안에서 모델이 도는 것 |
| E2B / 32B | 모델 크기(파라미터 수). E2B≈2B는 폰에서 돌 만한 급, 32B는 서버급 |

---

## 9. 참고 (코드 위치·이력)

본문 코드 블록은 발표용 발췌본이다(`# … (중략)` 표시부 생략). 전체 코드는 아래 경로에서 그대로 볼 수 있다.

- 실행: `python3 backend/scripts/check_gates.py` (자가테스트 + 골든셋 + E2E 일괄)
- 게이트 코드: `backend/app/ai/gates/` — `answer_router.py`(래더) / `entity_index.py`(사전) / `output_gate.py`(출력 검증) / `textrules.py`(오타 내성 포함 공용 규칙)
- 파이프라인 본체: `backend/app/ai/demo_service.py` · UI 카드: `app/App.js`
- 평가 원본: `research_notes/gate_ab_report_2026-07-12.md` (A/B 수치), `backend/tests/golden_set.json`
- 계획 문서: `HALLUCINATION_GATE_PLAN.md`
- 주요 커밋: 게이트+CI `db41da1` → 오타내성+UI 카드 `2b32dae` → DGX 모델 등록 `2d37328`
