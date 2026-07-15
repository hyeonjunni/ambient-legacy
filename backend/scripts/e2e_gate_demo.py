"""E2E 실기동 검증 — 실제 FastAPI 앱을 TestClient로 띄워 /api/v1/ai/chat-demo 전 경로 검증.

    python3 backend/scripts/e2e_gate_demo.py

- DB: in-memory SQLite (실 모델로 create_all + 데모 가족 시드 — 클라우드 불필요)
- 인증: dependency_overrides로 데모 유저 주입
- LLM: 스텁 provider (시나리오별 환각/근거/빈응답 출력, 호출 횟수 계수)
검증 항목: rule_gate 경로가 LLM을 안 부르는지, 출력 게이트가 환각을 막는지,
gate_* 필드가 HTTP 응답 JSON까지 살아서 나오는지(스키마 탈락 회귀 방지), 빈응답 재시도.
"""
from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path

# app 모듈 import 전에 주입 — 로컬 E2E는 sqlite로 (config가 env DATABASE_URL을 읽음)
os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("USE_CLOUD_SQL_CONNECTOR", "false")
os.environ.setdefault("USE_GCS_MEDIA_STORAGE", "false")

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

# 로컬엔 Cloud SQL 커넥터가 없어도 E2E는 sqlite로 돈다 — import 시점 의존성만 스텁.
# (get_db는 아래에서 오버라이드하므로 커넥터는 실제로 호출되지 않는다)
import types  # noqa: E402

if "google.cloud.sql.connector" not in sys.modules:
    _stub = types.ModuleType("google.cloud.sql.connector")

    class _Connector:  # pragma: no cover - 호출되지 않음
        def __init__(self, *a, **k):
            pass

        def connect(self, *a, **k):
            raise RuntimeError("E2E stub — 실 DB 연결은 비활성")

    _stub.Connector = _Connector
    _stub.IPTypes = types.SimpleNamespace(PUBLIC="PUBLIC", PRIVATE="PRIVATE")
    google_mod = sys.modules.setdefault("google", types.ModuleType("google"))
    cloud_mod = sys.modules.setdefault("google.cloud", types.ModuleType("google.cloud"))
    sql_mod = sys.modules.setdefault("google.cloud.sql", types.ModuleType("google.cloud.sql"))
    google_mod.cloud = cloud_mod
    cloud_mod.sql = sql_mod
    sql_mod.connector = _stub
    sys.modules["google.cloud.sql.connector"] = _stub

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session, sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api import deps  # noqa: E402
from app.core import database  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models.family import FamilyMember, FamilyRoom  # noqa: E402
from app.models.upload import Upload  # noqa: E402
from app.models.user import User  # noqa: E402
from app.ai.providers.base import InferenceResponse  # noqa: E402
from app.ai import demo_service  # noqa: E402

# ---------- in-memory DB + 시드 ----------
engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                       poolclass=StaticPool)
Base.metadata.create_all(engine)
TestSession = sessionmaker(bind=engine)

ROOM_ID = "room-e2e"
USER_ID = "user-e2e"

with TestSession() as db:
    user = User(id=USER_ID, google_sub="e2e-google-sub", username="e2e",
                email="e2e@example.com", name="김하늘")
    db.add(user)
    db.add(FamilyRoom(id=ROOM_ID, name="E2E 가족방", invite_code="E2E123",
                      owner_user_id=USER_ID))
    db.add(FamilyMember(id="fm-1", room_id=ROOM_ID, user_id=USER_ID, role="owner",
                        relation_to_related_user="아버지"))
    seeds = [
        ("text", "병원 예약 메모", "아버지 검진은 오전 10시, 접수는 20분 전까지 도착"),
        ("image", "예약 확인 문자 OCR", "검진 예약 11:00, 10분 전 내원 요청"),
        ("image", "부산 가족 여행 사진", "2018년 여름 광안리 해변 산책, 바람이 시원했다고 남김"),
        ("text", "막내 생일 메모", "막내 생일은 5월 3일, 케이크는 초코로 준비"),
    ]
    for i, (utype, title, desc) in enumerate(seeds):
        db.add(Upload(id=f"up-{i}", room_id=ROOM_ID, uploader_user_id=USER_ID,
                      type=utype, title=title, description=desc))
    db.commit()


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


def override_current_user():
    with TestSession() as db:
        return db.get(User, USER_ID)


app.dependency_overrides[database.get_db] = override_get_db
app.dependency_overrides[deps.get_current_user] = override_current_user

# ---------- 스텁 provider ----------
class StubProvider:
    def __init__(self):
        self.calls = 0
        self.script: list[str] = []

    def generate(self, request):
        self.calls += 1
        text = self.script.pop(0) if self.script else "기록에 있는 내용만 정리해 드렸습니다."
        return InferenceResponse(provider="stub", mode="remote", output_text=text,
                                 model_id=request.model_id)


stub = StubProvider()
demo_service.get_provider_for_model = lambda model_id: stub  # 서비스 계층 주입

client = TestClient(app)
failures: list[str] = []


def check(name: str, cond: bool, detail: str = ""):
    print(f"  [{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail else ""))
    if not cond:
        failures.append(name)


def chat(query: str) -> dict:
    r = client.post("/api/v1/ai/chat-demo", json={
        "room_id": ROOM_ID, "model_id": "gemma-4-e2b-device",
        "persona_id": "father-calm", "query": query})
    assert r.status_code == 200, r.text
    return r.json()


print("① rule_gate 경로 (LLM 미호출)")
before = stub.calls
res = chat("예약한 병원 이름이 뭐였는지 알려줘.")
check("병원 이름 → REFUSE + rule_gate", res["answer_source"] == "rule_gate"
      and res["gate_route"] == "REFUSE", f"{res['answer_source']}/{res.get('gate_route')}")
check("REFUSE 경로 LLM 호출 0회", stub.calls == before)
check("gate_route가 HTTP JSON에 실림 (스키마 회귀 방지)", "gate_route" in res)

res = chat("아버지 검진이 몇 시였는지 알려줘.")
check("시각 모순 → CONFLICT 양립", res.get("gate_route") == "CONFLICT"
      and "10시" in res["answer"] and "11시" in res["answer"])

print("② 출력 게이트 (환각 차단)")
stub.script = ["부산 여행은 2018년 7월 15일이었고 해운대식당에서 저녁을 드셨습니다."]
res = chat("부산 여행 기록 요약해줘.")
check("환각(7/15·해운대식당) 문장 차단", "15" not in res["answer"].split("「")[0]
      and "해운대식당" not in res["answer"], res.get("gate_action", ""))

stub.script = ["기록에는 2018년 여름 광안리 해변 산책이 남아 있습니다."]
res = chat("부산 여행 기록 요약해줘.")
check("근거 있는 응답 → 통과", res["gate_action"] == "pass" and "2018" in res["answer"])

print("③ 빈응답 재시도 (B1 완화)")
stub.script = ["", "막내 생일은 5월 3일로 기록되어 있습니다."]
before = stub.calls
res = chat("막내 생일 기록 요약해줘.")
check("빈응답 → 1회 재시도 후 정상 응답", stub.calls == before + 2
      and "5월 3일" in res["answer"], f"calls+{stub.calls - before}")

print("⑤ 오타/맞춤법 내성")
stub.script = ["막내 생일은 5월 3일로 기록되어 있습니다."]
res = chat("막내 생일이 몇일이야?")  # 몇일(오기) → 며칠 접기 → date_md 판정
check("'몇일' 오기 → 날짜 질문으로 정상 라우팅·응답", res.get("gate_route") == "ANSWER"
      and "5월 3일" in res["answer"], res.get("gate_route", ""))

before = stub.calls
res = chat("검진 예약이 몇일이었지?")  # 병원 기록엔 월/일 없음 → 규칙 거절
check("'몇일' 오기 + 기록에 월일 없음 → REFUSE (LLM 0회)",
      res.get("gate_route") == "REFUSE" and stub.calls == before)

print("⑥ CLARIFY → LLM 재작성 1회 → 재라우팅")
stub.script = ["막내 생일이 언제였지?",              # 재작성 출력
               "막내 생일은 5월 3일로 기록되어 있습니다."]  # 재라우팅 후 생성
before = stub.calls
res = chat("그때 그거 언제였지?")  # 접점 0 → CLARIFY → 재작성 → ANSWER
check("모호 질문 → 재작성 후 정상 응답", "5월 3일" in res["answer"]
      and "llm_rewrite" in (res.get("gate_detail") or ""),
      f"calls+{stub.calls - before}, detail={res.get('gate_detail')}")

print("④ 기록 없는 방 → NO_RECORD")
with TestSession() as db:
    db.add(FamilyRoom(id="room-empty", name="빈 방", invite_code="EMPTY1",
                      owner_user_id=USER_ID))
    db.add(FamilyMember(id="fm-2", room_id="room-empty", user_id=USER_ID, role="owner"))
    db.commit()
r = client.post("/api/v1/ai/chat-demo", json={
    "room_id": "room-empty", "model_id": "gemma-4-e2b-device",
    "persona_id": "father-calm", "query": "우리 가족 여행 기록 알려줘."})
res = r.json()
check("기록 0건 → NO_RECORD rule_gate", res.get("gate_route") == "NO_RECORD"
      and res["answer_source"] == "rule_gate")

print()
if failures:
    print(f"❌ E2E 실패 {len(failures)}건: {failures}")
    raise SystemExit(1)
print("✅ E2E 전 경로 통과 — 게이트가 서버 API까지 살아서 도달")
