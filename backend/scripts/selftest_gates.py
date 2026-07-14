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

print()
if failures:
    print(f"❌ 실패 {len(failures)}건: {failures}")
    raise SystemExit(1)
print("✅ 게이트 자가테스트 전부 통과")
