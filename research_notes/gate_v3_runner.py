# -*- coding: utf-8 -*-
"""v3 평가 러너 — 백엔드 게이트 코드를 그대로 사용 (드리프트 0).

배치: 이 파일 옆에 app/ai/gates/*.py (백엔드에서 복사)와 gate_ab_eval_2026-07-12.py 필요.
    python3 gate_v3_runner.py --models gemma4:e2b gemma4:e4b

v2 대비 변경:
  - 게이트 = 백엔드 실물 (엔티티 사전: 멤버 + 장소 접미사)
  - 과잉거절 완화: ANSWER 경로에서 LLM 응답이 비었으면 1회 재생성
  - 비교표 = 기존 / v2게이트(참조) / v3게이트 3열
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))  # app.ai.gates 패키지 (백엔드 복사본)

from app.ai.gates.answer_router import route_query  # noqa: E402
from app.ai.gates.entity_index import build_room_entity_index  # noqa: E402
from app.ai.gates.output_gate import apply_output_gate  # noqa: E402

# v2 스크립트에서 골든셋·채점기·Ollama 호출 재사용
spec = importlib.util.spec_from_file_location("v2", HERE / "gate_ab_eval_2026-07-12.py")
v2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2)

MEMBER_NAMES = ["아버지", "엄마", "막내"]  # 데모 가족방 멤버 호칭 (실서비스: FamilyMember⋈User)


def room_index(room: str):
    texts = [c["text"] for c in v2.ROOMS[room]]
    return build_room_entity_index(MEMBER_NAMES, texts)


def run(models: list[str]) -> None:
    progress = HERE / "gate_v3_progress.jsonl"
    results = {"generated_at": time.strftime("%Y-%m-%d %H:%M:%S"), "models": {}}

    for model in models:
        print(f"\n===== {model} (v3) =====", flush=True)
        rows = []
        for item in v2.GOLDEN:
            t0 = time.perf_counter()
            texts = [c["text"] for c in v2.ROOMS[item["room"]]]
            index = room_index(item["room"])

            system, user = v2.build_messages(item)
            raw = v2.ollama_chat(model, system, user)
            base_score = v2.score_answer((raw or "").strip(), item)

            decision = route_query(item["q"], texts, index)
            if decision.route != "ANSWER":
                new_final = decision.answer
                gate_info = {"gate_action": decision.route, "detail": decision.detail}
            else:
                use_raw = raw
                if len((use_raw or "").strip()) < 5:  # 빈 응답 → 1회 재생성 (과잉거절 완화)
                    use_raw = v2.ollama_chat(model, system, user)
                    gate_retry = True
                else:
                    gate_retry = False
                gate = apply_output_gate(use_raw, item["q"], texts, index)
                new_final = gate.answer
                gate_info = {"gate_action": gate.action, "retry": gate_retry,
                             "unsupported": gate.unsupported_found}
            new_score = v2.score_answer(new_final, item)
            row = {"model": model, "id": item["id"], "label": item["label"],
                   "route": decision.route, "elapsed_s": round(time.perf_counter() - t0, 1),
                   "baseline": {"answer": (raw or "").strip(), "score": base_score},
                   "gated": {"answer": new_final, "score": new_score, "gate": gate_info}}
            rows.append(row)
            with progress.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
            print(f"  {item['id']} [{item['label'][:6]:6s}] route={decision.route:8s} "
                  f"base(ok={int(base_score['correct'])}) v3(ok={int(new_score['correct'])}) "
                  f"{row['elapsed_s']}s", flush=True)
        results["models"][model] = rows

    (HERE / "gate_v3_results.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    write_comparison(results)
    print("\n완료. gate_v3_results.json / gate_v3_comparison.md 저장.", flush=True)


def load_v2_reference() -> dict:
    path = HERE.parent / "v2" / "gate_ab_results.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {model: v2.agg(rows, "gated") for model, rows in data.get("models", {}).items()}


def write_comparison(results: dict) -> None:
    v2ref = load_v2_reference()
    lines = ["# v3 (엔티티 사전 + 빈응답 재시도) 비교 — " + results["generated_at"], ""]
    for model, rows in results["models"].items():
        base = v2.agg(rows, "baseline")
        v3g = v2.agg(rows, "gated")
        ref = v2ref.get(model, {})
        lines.append(f"## {model}")
        lines.append("")
        lines.append("| 지표 | 기존 | v2게이트 | v3게이트 | v3-기존 |")
        lines.append("|---|---|---|---|---|")
        for k in base:
            r = f"{ref[k]:.2f}" if k in ref else "—"
            lines.append(f"| {k} | {base[k]:.2f} | {r} | {v3g[k]:.2f} | {v3g[k]-base[k]:+.2f} |")
        lines.append("")
        routes = {}
        for row in rows:
            routes[row["route"]] = routes.get(row["route"], 0) + 1
        lines.append(f"라우팅: {routes}")
        lines.append("")
    (HERE / "gate_v3_comparison.md").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", nargs="+", required=True)
    args = ap.parse_args()
    run(args.models)
