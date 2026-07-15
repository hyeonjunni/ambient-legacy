from __future__ import annotations

import json
import sys
import time
from dataclasses import asdict
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = WORKSPACE_ROOT / "ambient-legacy" / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.ai.persona_loader import load_persona_pack
from app.ai.prompt_builder import RetrievalChunk, build_prompt_package
from app.ai.providers.base import InferenceRequest
from app.ai.providers.ollama_provider import OllamaProvider


OLLAMA_BASE_URL = "http://127.0.0.1:11434"
PERSONA_ROOT = BACKEND_ROOT / "app" / "personas" / "father-calm"
OUTPUT_PATH = WORKSPACE_ROOT / "research_notes" / "model_runtime_results_2026-05-11.json"

MODELS = [
    {
        "label": "Gemma 4 E2B",
        "runtime_model": "gemma4:e2b",
        "notes": "현재 목요일 데모에서 실제로 연결된 모델",
    },
    {
        "label": "Gemma 4 E4B",
        "runtime_model": "gemma4:e4b",
        "notes": "Gemma 내부 상위 edge 모델",
    },
    {
        "label": "EXAONE 3.5 2.4B",
        "runtime_model": "exaone3.5:2.4b",
        "notes": "LG AI Research bilingual 소형 모델",
    },
    {
        "label": "EXAONE 3.5 7.8B",
        "runtime_model": "exaone3.5:7.8b",
        "notes": "LG AI Research bilingual 8B급 비교 후보",
    },
    {
        "label": "Qwen 3 0.6B",
        "runtime_model": "qwen3:0.6b",
        "notes": "초소형 Qwen 비교 후보",
    },
    {
        "label": "Qwen 3 4B",
        "runtime_model": "qwen3:4b",
        "notes": "좀 더 실용성을 기대할 수 있는 중간 Qwen 비교 후보",
    },
    {
        "label": "Qwen 3 8B",
        "runtime_model": "qwen3:8b",
        "notes": "Qwen 8B급 상위 비교 후보",
    },
]

SCENARIOS = [
    {
        "id": "year_end_recall",
        "question": "송년회에서 어떤 말을 했는지 2문장으로 요약해줘.",
        "chunks": [
            RetrievalChunk(
                source_type="voice",
                timestamp="2026-04-10T19:30:00",
                text="송년회 자리에서 아버지가 '건강하게 오래 봅시다. 사진만 남기지 말고 자주 만납시다.'라고 말함",
                tags=["voice", "family-room", "송년회", "가족행사"],
                confidence=0.89,
            ),
            RetrievalChunk(
                source_type="image",
                timestamp="2026-04-10T19:42:00",
                text="송년회 단체 사진 OCR 메모: 건강하게 오래 봅시다",
                tags=["image", "family-room", "OCR", "송년회"],
                confidence=0.76,
            ),
        ],
    },
    {
        "id": "recipe_summary",
        "question": "엄마의 김치찌개 메모를 가족에게 공유할 수 있게 3단계로 정리해줘.",
        "chunks": [
            RetrievalChunk(
                source_type="text",
                timestamp="2026-04-11T08:15:00",
                text="엄마의 김치찌개 메모: 돼지고기는 먼저 볶고, 김치는 오래 익히기, 마지막에 두부와 대파 넣기",
                tags=["text", "family-room", "레시피", "김치찌개"],
                confidence=0.92,
            ),
            RetrievalChunk(
                source_type="image",
                timestamp="2026-04-11T08:17:00",
                text="레시피 사진 OCR: 김치는 충분히 볶고 물은 한번에 너무 많이 넣지 않기",
                tags=["image", "family-room", "OCR", "레시피"],
                confidence=0.71,
            ),
        ],
    },
    {
        "id": "unsupported_detail_guardrail",
        "question": "부산 여행의 정확한 날짜와 식당 이름을 알려줘. 기록에 없으면 없다고 말해줘.",
        "chunks": [
            RetrievalChunk(
                source_type="image",
                timestamp="2026-04-12T15:00:00",
                text="부산 가족 여행 사진 메모: 2018년 여름 광안리 해변 산책, 저녁 무렵 바람이 시원했다고 남김",
                tags=["image", "family-room", "부산", "여행"],
                confidence=0.81,
            ),
            RetrievalChunk(
                source_type="text",
                timestamp="2026-04-12T15:05:00",
                text="여행 회고 메모: 바다 보면서 천천히 걷는 시간이 좋았다고 적어둠",
                tags=["text", "family-room", "부산", "회고"],
                confidence=0.68,
            ),
        ],
    },
]


def build_provider(runtime_model: str) -> OllamaProvider:
    return OllamaProvider(
        base_url=OLLAMA_BASE_URL,
        timeout_seconds=120,
        model_aliases={"runtime-benchmark": runtime_model},
    )


def run_single(model: dict, scenario: dict, persona_markdown: str) -> dict:
    provider = build_provider(model["runtime_model"])
    prompt_package = build_prompt_package(
        model_id="gemma-4-e2b-device",
        persona_markdown=persona_markdown,
        user_query=scenario["question"],
        retrieved_chunks=scenario["chunks"],
    )
    started_at = time.perf_counter()
    response = provider.generate(
        InferenceRequest(
            model_id="runtime-benchmark",
            user_query=scenario["question"],
            prompt_package=prompt_package,
        )
    )
    elapsed_ms = round((time.perf_counter() - started_at) * 1000, 1)
    return {
        "scenario_id": scenario["id"],
        "question": scenario["question"],
        "elapsed_ms": elapsed_ms,
        "mode": response.mode,
        "provider": response.provider,
        "answer": response.output_text,
        "retrieved_evidence": prompt_package["retrieved_evidence"],
    }


def main() -> int:
    persona_markdown = load_persona_pack(PERSONA_ROOT)
    results = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "ollama_base_url": OLLAMA_BASE_URL,
        "persona_root": str(PERSONA_ROOT),
        "models": [],
    }

    for model in MODELS:
        model_result = {
            "label": model["label"],
            "runtime_model": model["runtime_model"],
            "notes": model["notes"],
            "runs": [],
        }
        for scenario in SCENARIOS:
            model_result["runs"].append(run_single(model, scenario, persona_markdown))
        results["models"].append(model_result)

    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
