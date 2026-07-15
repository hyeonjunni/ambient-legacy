from __future__ import annotations

import json
import sys
import time
from pathlib import Path


WORKSPACE_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = WORKSPACE_ROOT / "ambient-legacy" / "backend"
PERSONA_BASE = BACKEND_ROOT / "app" / "personas"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.ai.persona_loader import load_persona_pack
from app.ai.prompt_builder import RetrievalChunk, build_prompt_package
from app.ai.providers.base import InferenceRequest
from app.ai.providers.ollama_provider import OllamaProvider


OLLAMA_BASE_URL = "http://127.0.0.1:11434"
OUTPUT_PATH = WORKSPACE_ROOT / "research_notes" / "model_runtime_expanded_results_2026-05-19.json"

MODELS = [
    {
        "label": "Gemma 4 E2B",
        "runtime_model": "gemma4:e2b",
        "notes": "현재 데모 기본값으로 쓰기 가장 무난한 비교 기준",
    },
    {
        "label": "Gemma 4 E4B",
        "runtime_model": "gemma4:e4b",
        "notes": "같은 Gemma 계열의 상위 edge 모델",
    },
    {
        "label": "EXAONE 3.5 2.4B",
        "runtime_model": "exaone3.5:2.4b",
        "notes": "EXAONE 계열의 소형 instruct 비교군",
    },
    {
        "label": "EXAONE Deep 2.4B",
        "runtime_model": "exaone-deep:2.4b",
        "notes": "EXAONE reasoning 계열의 소형 비교군",
    },
    {
        "label": "EXAONE 3.5 7.8B",
        "runtime_model": "exaone3.5:7.8b",
        "notes": "8B급 EXAONE 비교군",
    },
    {
        "label": "Llama 3.2 3B",
        "runtime_model": "llama3.2:3b",
        "notes": "경량 다목적 비교군",
    },
    {
        "label": "Phi-4-mini 3.8B",
        "runtime_model": "phi4-mini:3.8b",
        "notes": "소형 reasoning 지향 general model",
    },
    {
        "label": "Mistral 7B",
        "runtime_model": "mistral:7b",
        "notes": "7B 범용 instruct 비교군",
    },
    {
        "label": "Qwen 3 8B",
        "runtime_model": "qwen3:8b",
        "notes": "정돈된 응답과 거절 안정성 비교군",
    },
]

PERSONAS = [
    "father-calm",
    "mother-warm",
    "grandfather-mentor",
    "daughter-analytical",
    "grandmother-storyteller",
    "older-brother-direct",
]

GENERAL_SCENARIOS = [
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
    {
        "id": "schedule_conflict_check",
        "question": "아버지 병원 예약 시간이 정확히 몇 시였는지 알려줘. 기록이 엇갈리면 둘 다 말해줘.",
        "chunks": [
            RetrievalChunk(
                source_type="text",
                timestamp="2026-04-08T09:00:00",
                text="병원 예약 메모: 아버지 검진은 오전 10시, 접수는 20분 전까지 도착",
                tags=["text", "family-room", "병원", "일정"],
                confidence=0.86,
            ),
            RetrievalChunk(
                source_type="image",
                timestamp="2026-04-08T09:03:00",
                text="예약 확인 문자 OCR: 검진 예약 11:00, 10분 전 내원 요청",
                tags=["image", "family-room", "OCR", "병원", "일정"],
                confidence=0.74,
            ),
        ],
    },
    {
        "id": "memory_caption_with_mood",
        "question": "가족방에 올릴 짧은 회고 문구를 2문장으로 써줘. 기록에 없는 감정은 과장하지 마.",
        "chunks": [
            RetrievalChunk(
                source_type="image",
                timestamp="2026-04-15T17:40:00",
                text="벚꽃 아래서 찍은 가족 사진 메모: 오랜만에 다 같이 천천히 걸었다",
                tags=["image", "family-room", "산책", "벚꽃"],
                confidence=0.83,
            ),
            RetrievalChunk(
                source_type="text",
                timestamp="2026-04-15T18:05:00",
                text="산책 끝나고 다들 말수는 줄었지만 편안했다고 적어둠",
                tags=["text", "family-room", "산책", "회고"],
                confidence=0.72,
            ),
        ],
    },
]

PERSONA_SCENARIOS = [
    GENERAL_SCENARIOS[0],
    GENERAL_SCENARIOS[4],
]


def build_provider(runtime_model: str) -> OllamaProvider:
    return OllamaProvider(
        base_url=OLLAMA_BASE_URL,
        timeout_seconds=180,
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


def run_general_results() -> list[dict]:
    persona_markdown = load_persona_pack(PERSONA_BASE / "father-calm")
    results = []
    for model in MODELS:
        model_result = {
            "label": model["label"],
            "runtime_model": model["runtime_model"],
            "notes": model["notes"],
            "persona": "father-calm",
            "runs": [],
        }
        for scenario in GENERAL_SCENARIOS:
            model_result["runs"].append(run_single(model, scenario, persona_markdown))
        results.append(model_result)
    return results


def run_persona_results() -> list[dict]:
    persona_model = {
        "label": "Gemma 4 E2B",
        "runtime_model": "gemma4:e2b",
        "notes": "페르소나 반영 확인용 기준 모델",
    }
    results = []
    for persona_name in PERSONAS:
        persona_markdown = load_persona_pack(PERSONA_BASE / persona_name)
        persona_result = {
            "persona": persona_name,
            "runtime_model": persona_model["runtime_model"],
            "runs": [],
        }
        for scenario in PERSONA_SCENARIOS:
            persona_result["runs"].append(run_single(persona_model, scenario, persona_markdown))
        results.append(persona_result)
    return results


def main() -> int:
    results = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "ollama_base_url": OLLAMA_BASE_URL,
        "general_persona_root": str(PERSONA_BASE / "father-calm"),
        "persona_test_roots": [str(PERSONA_BASE / name) for name in PERSONAS],
        "general_scenarios": [scenario["id"] for scenario in GENERAL_SCENARIOS],
        "persona_scenarios": [scenario["id"] for scenario in PERSONA_SCENARIOS],
        "general_results": run_general_results(),
        "persona_results": run_persona_results(),
    }
    OUTPUT_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(results, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
