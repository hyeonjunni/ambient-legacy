"""게이트 층 단독 자가테스트 — fastapi/DB 없이 실행 가능.

    python3 backend/scripts/selftest_gates.py

DGX A/B 실험에서 검증된 케이스를 회귀 테스트로 고정한다. 실패 시 exit 1 (시끄럽게).
"""
from __future__ import annotations

import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.ai.gates.answer_router import route_query  # noqa: E402
from app.ai.gates.entity_index import build_room_entity_index  # noqa: E402
from app.ai.gates.output_gate import apply_output_gate  # noqa: E402

EV_BUSAN = ["부산 가족 여행 사진 메모: 2018년 여름 광안리 해변 산책, 저녁 무렵 바람이 시원했다고 남김",
            "여행 회고 메모: 바다 보면서 천천히 걷는 시간이 좋았다고 적어둠"]
EV_HOSPITAL = ["병원 예약 메모: 아버지 검진은 오전 10시, 접수는 20분 전까지 도착",
               "예약 확인 문자 OCR: 검진 예약 11:00, 10분 전 내원 요청"]
EV_PARTY = ["송년회 자리에서 아버지가 '건강하게 오래 봅시다. 사진만 남기지 말고 자주 만납시다.'라고 말함"]

failures: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    mark = "PASS" if condition else "FAIL"
    print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))
    if not condition:
        failures.append(name)


print("① 입력 래더")
d = route_query("부산 여행의 정확한 날짜(몇 월 며칠)를 알려줘.", EV_BUSAN)
check("날짜 없음 → REFUSE (LLM 미호출)", d.route == "REFUSE", d.detail)

d = route_query("아버지 병원 예약이 몇 시였는지 알려줘.", EV_HOSPITAL)
check("시각 모순 → CONFLICT 양립 제시", d.route == "CONFLICT" and "10시" in d.answer and "11시" in d.answer)

d = route_query("부산 여행이 몇 년도였는지 알려줘.", EV_BUSAN)
check("연도 존재 → ANSWER (LLM 경로)", d.route == "ANSWER")

d = route_query("오늘 날씨 어때?", [])
check("기록 0건 → NO_RECORD", d.route == "NO_RECORD")

print("② 출력 게이트")
g = apply_output_gate("부산 여행은 2018년 7월 15일이었고 저녁은 해수 식당에서 드셨습니다.",
                      "부산 여행 언제였어?", EV_BUSAN)
check("조작 날짜(7/15) → 문장 차단·인용 강등", g.action in {"all_dropped_quote", "dropped_1"}
      and "7" not in g.answer.replace("「", ""), g.action)

g = apply_output_gate("기록에는 2018년 여름 광안리 산책만 남아 있습니다.",
                      "부산 여행 언제였어?", EV_BUSAN)
check("근거 있는 답 → 통과", g.action == "pass")

g = apply_output_gate("<think>추론중</think>아버지는 '건강하게 오래 봅시다'라고 하셨습니다.\ntags=voice",
                      "송년회에서 무슨 말 했어?", EV_PARTY)
check("think/tags 누수 제거 + 부분 인용 통과", g.leak_stripped and g.action == "pass"
      and "건강하게" in g.answer)

g = apply_output_gate("The trip was in summer 2018 at Gwangalli beach.",
                      "부산 여행 언제였어?", EV_BUSAN)
check("비한국어 응답 → 인용 강등", g.action == "fallback_quote")

print("③ 엔티티 사전 (가족방 폐쇄 세계)")
IDX = build_room_entity_index(
    member_names=["김하늘", "아버지"],
    record_texts=EV_BUSAN + EV_HOSPITAL + EV_PARTY + ["광안리해변 나들이 사진"])

d = route_query("부산에서 저녁 먹은 식당 이름이 뭐였지?", EV_BUSAN, IDX)
check("식당 이름 질문 + 이름 있는 식당 없음 → REFUSE", d.route == "REFUSE", d.detail)

d = route_query("벚꽃 구경한 공원 이름 알려줘.", ["벚꽃 아래서 찍은 가족 사진 메모"], IDX)
check("공원 이름 질문 + 공원 없음 → REFUSE", d.route == "REFUSE", d.detail)

d = route_query("예약한 병원 이름이 뭐야?", EV_HOSPITAL, IDX)
check("병원 이름 질문 + '병원' 일반명사만 → REFUSE", d.route == "REFUSE", d.detail)

d = route_query("그 사진은 누가 찍었어?", ["벚꽃 아래서 찍은 가족 사진 메모"], IDX)
check("인물 질문 + 인물 기록 없음 → REFUSE", d.route == "REFUSE", d.detail)

d = route_query("이 검진은 누구 거야?", EV_HOSPITAL, IDX)
check("인물 질문 + 아버지 존재 → ANSWER (오탐 가드)", d.route == "ANSWER")

d = route_query("부산에서 어디를 걸었어?", EV_BUSAN, IDX)
check("일반 '어디' + 해변 존재 → ANSWER (오탐 가드)", d.route == "ANSWER")

g = apply_output_gate("저녁은 광안리 근처 해운대식당에서 드셨습니다.",
                      "부산에서 저녁 뭐 먹었어?", EV_BUSAN, IDX)
check("사전에 없는 '해운대식당' → 문장 차단", g.action in {"all_dropped_quote", "dropped_1"},
      f"{g.action}/{g.unsupported_found}")

g = apply_output_gate("김하늘님이 남긴 기록에는 광안리 산책이 있습니다.",
                      "부산 기록 요약해줘", EV_BUSAN, IDX)
check("멤버 '김하늘님' → 통과 (사전 매치)", g.action == "pass", g.action)

print("④ 메타모픽/강건성 (SCPC 스위트 이식)")
# 결정성: 같은 입력 2회 → 동일 출력
d1 = route_query("막내 생일이 언제야?", EV_BUSAN + EV_HOSPITAL, IDX)
d2 = route_query("막내 생일이 언제야?", EV_BUSAN + EV_HOSPITAL, IDX)
check("결정성 (2회 동일)", (d1.route, d1.answer) == (d2.route, d2.answer))

# evidence 순서 셔플 불변
d_fwd = route_query("아버지 병원 예약이 몇 시였는지 알려줘.", EV_HOSPITAL, IDX)
d_rev = route_query("아버지 병원 예약이 몇 시였는지 알려줘.", list(reversed(EV_HOSPITAL)), IDX)
check("evidence 셔플 → route 불변", d_fwd.route == d_rev.route == "CONFLICT")

# 무관 chunk 주입 불변 (REFUSE가 흔들리지 않아야)
noisy = EV_BUSAN + ["가족방 공지: 이번 주말 대청소 예정"]
d = route_query("부산 여행의 정확한 날짜(몇 월 며칠)를 알려줘.", noisy, IDX)
check("무관 chunk 주입 → REFUSE 유지", d.route == "REFUSE")

# 무공백·메신저 변형 내성 (has_cue 이식 검증)
d = route_query("검진이 몇시였는지 알려주세여?", EV_HOSPITAL, IDX)
check("'몇시'+해요체 변형 → time 판정 유지", d.route == "CONFLICT", d.route)

# 결손 입력 생존성 (SCPC turn_index null 교훈): None 섞인 evidence에도 크래시 없이 동작
try:
    d = route_query("부산 언제 갔어?", [t for t in EV_BUSAN] + [""], IDX)
    check("빈 문자열 chunk 생존", d.route in {"ANSWER", "REFUSE", "CLARIFY"})
except Exception as exc:  # noqa: BLE001
    check("빈 문자열 chunk 생존", False, str(exc))

g1 = apply_output_gate("기록에는 2018년 여름 광안리 산책이 있습니다.", "부산 언제?", EV_BUSAN, IDX)
g2 = apply_output_gate("기록에는 2018년 여름 광안리 산책이 있습니다.", "부산 언제?",
                       list(reversed(EV_BUSAN)), IDX)
check("출력 게이트도 셔플 불변", g1.answer == g2.answer and g1.action == g2.action)

print("⑤ Phase 0 적대 회귀 — 질의값 비신뢰·전청크 모순 (NEXT_AGENT_HANDOFF)")
# (a) 질문이 심은 날짜를 모델이 복창 — 질의는 검증 대상 '주장'이지 근거가 아니다
g = apply_output_gate("부산 여행은 7월 15일이었습니다.", "부산 여행 7월 15일 맞지?", EV_BUSAN, IDX)
check("질의 전용 날짜(7/15) 복창 → 차단", g.action in {"all_dropped_quote", "dropped_1"}, g.action)

# (b) 질문이 심은 장소명 복창
g = apply_output_gate("저녁은 해운대식당에서 드셨습니다.", "해운대식당에서 먹었나?", EV_BUSAN, IDX)
check("질의 전용 장소(해운대식당) 복창 → 차단",
      g.action in {"all_dropped_quote", "dropped_1"}, g.action)

# (c) 하드원자 없는 의미 주장 — Phase 0 한계 고정핀: 게이트는 통과시키되,
#     UI 배지는 '핵심 사실(숫자·시각·인용·이름) 대조'로만 표기한다 (Phase 1 fact-sheet 대상)
g = apply_output_gate("아버지는 막내를 가장 사랑했다고 기록되어 있습니다.",
                      "아버지는 누구를 좋아했어?", EV_PARTY, IDX)
check("의미 주장(하드원자 無) → 현행 통과 고정핀", g.action == "pass", g.action)

# (d) 모순 값이 3번째 청크에만 있는 경우 — 첫 2청크 비교로는 놓친다
d = route_query("아버지 검진이 몇 시였는지 알려줘.",
                ["검진 안내: 아버지 검진 오전 10시", "리마인더: 검진 10시 예정",
                 "예약 변경 문자: 검진 11:00 확정"], IDX)
check("10시/10시/11시 → CONFLICT (전 청크 대조)", d.route == "CONFLICT", d.route)

# 단일 청크 내 범위 표현('10시~11시')은 기록 간 모순이 아니다 — 오탐 가드
d = route_query("아버지 검진이 몇 시였는지 알려줘.",
                ["안내: 검진은 오전 10시에서 11시 사이 도착"], IDX)
check("단일 청크 범위 표현 → CONFLICT 아님", d.route != "CONFLICT", d.route)

print()
if failures:
    print(f"❌ 실패 {len(failures)}건: {failures}")
    raise SystemExit(1)
print("✅ 게이트 자가테스트 전부 통과")
