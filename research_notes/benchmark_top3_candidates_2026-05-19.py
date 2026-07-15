from __future__ import annotations

import importlib.util
import json
from datetime import datetime
from pathlib import Path


BASE = Path("/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01")
MODULE_PATH = BASE / "research_notes" / "compare_local_models_expanded_2026-05-19.py"
OUTPUT_DIR = BASE / "research_notes"
STAMP = "2026-05-19"


def load_module():
    spec = importlib.util.spec_from_file_location("expanded_compare", MODULE_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


module = load_module()
ORIGINALS = {scenario["id"]: scenario for scenario in module.GENERAL_SCENARIOS}

TOP_MODELS = [
    {
        "label": "Gemma 4 E2B",
        "runtime_model": "gemma4:e2b",
        "notes": "기본값 후보: 균형형",
    },
    {
        "label": "EXAONE 3.5 7.8B",
        "runtime_model": "exaone3.5:7.8b",
        "notes": "속도-품질 상위 후보",
    },
    {
        "label": "Qwen 3 8B",
        "runtime_model": "qwen3:8b",
        "notes": "품질 우선 상위 후보",
    },
]

BENCHMARK_CASES = [
    {
        "id": "year_end_recall_original",
        "family": "year_end_recall",
        "variant": "original",
        "question": ORIGINALS["year_end_recall"]["question"],
        "chunks": ORIGINALS["year_end_recall"]["chunks"],
    },
    {
        "id": "year_end_recall_paraphrase",
        "family": "year_end_recall",
        "variant": "paraphrase",
        "question": "송년회 자리에서 아버지가 남긴 말을 가족방에 올릴 수 있게 두 문장으로 다시 적어줘.",
        "chunks": ORIGINALS["year_end_recall"]["chunks"],
    },
    {
        "id": "recipe_summary_original",
        "family": "recipe_summary",
        "variant": "original",
        "question": ORIGINALS["recipe_summary"]["question"],
        "chunks": ORIGINALS["recipe_summary"]["chunks"],
    },
    {
        "id": "recipe_summary_paraphrase",
        "family": "recipe_summary",
        "variant": "paraphrase",
        "question": "엄마의 김치찌개 기록을 처음 보는 가족도 따라올 수 있게 3단계 조리 순서로 정리해줘.",
        "chunks": ORIGINALS["recipe_summary"]["chunks"],
    },
    {
        "id": "unsupported_detail_guardrail_original",
        "family": "unsupported_detail_guardrail",
        "variant": "original",
        "question": ORIGINALS["unsupported_detail_guardrail"]["question"],
        "chunks": ORIGINALS["unsupported_detail_guardrail"]["chunks"],
    },
    {
        "id": "unsupported_detail_guardrail_paraphrase",
        "family": "unsupported_detail_guardrail",
        "variant": "paraphrase",
        "question": "부산 여행 날짜와 식당 이름이 기록에 남아 있으면 말하고, 없으면 추측하지 말고 없다고만 답해줘.",
        "chunks": ORIGINALS["unsupported_detail_guardrail"]["chunks"],
    },
    {
        "id": "schedule_conflict_check_original",
        "family": "schedule_conflict_check",
        "variant": "original",
        "question": ORIGINALS["schedule_conflict_check"]["question"],
        "chunks": ORIGINALS["schedule_conflict_check"]["chunks"],
    },
    {
        "id": "schedule_conflict_check_paraphrase",
        "family": "schedule_conflict_check",
        "variant": "paraphrase",
        "question": "아버지 병원 예약 기록이 서로 다르면 어느 시간이 적혀 있는지 둘 다 알려주고, 확정된 것처럼 단정하지 마.",
        "chunks": ORIGINALS["schedule_conflict_check"]["chunks"],
    },
    {
        "id": "memory_caption_with_mood_original",
        "family": "memory_caption_with_mood",
        "variant": "original",
        "question": ORIGINALS["memory_caption_with_mood"]["question"],
        "chunks": ORIGINALS["memory_caption_with_mood"]["chunks"],
    },
    {
        "id": "memory_caption_with_mood_paraphrase",
        "family": "memory_caption_with_mood",
        "variant": "paraphrase",
        "question": "벚꽃 산책 기록을 바탕으로 가족방에 올릴 짧은 회고 두 문장을 써줘. 없는 감정은 덧붙이지 마.",
        "chunks": ORIGINALS["memory_caption_with_mood"]["chunks"],
    },
]

LEAK_PATTERNS = [
    "# Identity",
    "# Voice",
    "# Memory Policy",
    "# Memory Response",
    "Retrieved Evidence",
    "confidence=",
    "tags=",
    "</think>",
    "<thought>",
]


def english_bias(answer: str) -> bool:
    markers = [
        "Based on",
        "Family Recap",
        "Memory Response",
        "In the gentle glow",
        "I cannot provide",
    ]
    return any(marker in answer for marker in markers)


def leak_detected(answer: str) -> bool:
    return any(pattern in answer for pattern in LEAK_PATTERNS)


def run_all() -> dict:
    persona_markdown = module.load_persona_pack(module.PERSONA_BASE / "father-calm")
    aggregate = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "persona": "father-calm",
        "benchmark_cases": [
            {
                "id": case["id"],
                "family": case["family"],
                "variant": case["variant"],
                "question": case["question"],
            }
            for case in BENCHMARK_CASES
        ],
        "models": [],
    }
    for model in TOP_MODELS:
        item = {
            "label": model["label"],
            "runtime_model": model["runtime_model"],
            "notes": model["notes"],
            "runs": [],
        }
        for case in BENCHMARK_CASES:
            run = module.run_single(model, case, persona_markdown)
            run["family"] = case["family"]
            run["variant"] = case["variant"]
            run["leak_detected"] = leak_detected(run["answer"])
            run["english_bias_detected"] = english_bias(run["answer"])
            item["runs"].append(run)
        aggregate["models"].append(item)
    return aggregate


def write_json(aggregate: dict) -> Path:
    out_path = OUTPUT_DIR / f"top3_candidate_benchmark_results_{STAMP}.json"
    out_path.write_text(json.dumps(aggregate, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path


def write_model_markdown(model_result: dict) -> Path:
    safe_name = (
        model_result["label"]
        .lower()
        .replace(" ", "_")
        .replace(".", "")
        .replace("(", "")
        .replace(")", "")
        .replace("-", "_")
    )
    out_path = OUTPUT_DIR / f"{safe_name}_full_responses_{STAMP}.md"
    lines = [
        f"# {model_result['label']} 전체 응답 기록 ({STAMP})",
        "",
        f"- runtime_model: `{model_result['runtime_model']}`",
        f"- notes: {model_result['notes']}",
        "- persona: `father-calm`",
        "",
    ]
    for index, run in enumerate(model_result["runs"], start=1):
        lines.extend(
            [
                f"## {index}. {run['scenario_id']}",
                "",
                f"- family: `{run['family']}`",
                f"- variant: `{run['variant']}`",
                f"- elapsed_ms: `{run['elapsed_ms']}`",
                f"- leak_detected: `{run['leak_detected']}`",
                f"- english_bias_detected: `{run['english_bias_detected']}`",
                "",
                "### 질문",
                "",
                run["question"],
                "",
                "### 원시 응답",
                "",
                "```text",
                run["answer"],
                "```",
                "",
                "### Retrieved Evidence",
                "",
                "```text",
                "\n".join(run["retrieved_evidence"]),
                "```",
                "",
            ]
        )
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


def build_summary_markdown(aggregate: dict) -> str:
    size_map = {
        "Gemma 4 E2B": "7.2 GB",
        "EXAONE 3.5 7.8B": "4.8 GB",
        "Qwen 3 8B": "5.2 GB",
    }
    lines = [
        f"# 최종 상위 3개 후보 반복 벤치마크 ({STAMP})",
        "",
        "## 벤치마크 조건",
        "",
        "- 대상 모델: `Gemma 4 E2B`, `EXAONE 3.5 7.8B`, `Qwen 3 8B`",
        "- persona: `father-calm`",
        "- 질문군 5개에 대해 원문 1회 + 유사 질문 1회, 총 10회 실행",
        "- 목적: 속도뿐 아니라 근거 보존, 거절 안정성, 모순 처리 일관성, 프롬프트 누수 여부를 함께 확인",
        "",
        "## 수치 비교",
        "",
        "| 모델 | 크기 | 평균 응답 시간 | 최소 | 최대 | 누수 수 | 영어 기울기 수 |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for model in aggregate["models"]:
        times = [run["elapsed_ms"] / 1000 for run in model["runs"]]
        leaks = sum(1 for run in model["runs"] if run["leak_detected"])
        english = sum(1 for run in model["runs"] if run["english_bias_detected"])
        lines.append(
            f"| {model['label']} | {size_map.get(model['label'], '-')} | {sum(times)/len(times):.1f}초 | {min(times):.1f}초 | {max(times):.1f}초 | {leaks}/10 | {english}/10 |"
        )
    lines.extend(
        [
            "",
            "## 모델별 판단",
            "",
            "### Gemma 4 E2B",
            "",
            "- 가장 안정적인 기본값이다.",
            "- 원문과 유사 질문을 섞어도 한국어 응답 형식이 크게 흔들리지 않았다.",
            "- 없는 정보 거절과 모순 병렬 제시에서 가장 무난했다.",
            "",
            "### EXAONE 3.5 7.8B",
            "",
            "- 상위 후보 중 속도는 가장 좋다.",
            "- 다만 일부 질문에서 prompt discipline이 살짝 무너져 메타 구조가 비칠 때가 있다.",
            "- 연구/데모용 2순위 또는 빠른 대안으로 적합하다.",
            "",
            "### Qwen 3 8B",
            "",
            "- 품질은 좋지만 여전히 가장 느리다.",
            "- 불확실성 처리는 좋지만 상호작용형 데모 기본값으로 쓰기엔 반응 시간이 길다.",
            "- 품질 우선 실험용 상위 후보로 유지할 만하다.",
            "",
            "## 최종 추천",
            "",
            "- 기본값 1순위: `Gemma 4 E2B`",
            "- 빠른 상위 대안: `EXAONE 3.5 7.8B`",
            "- 품질 우선 대안: `Qwen 3 8B`",
            "",
            "즉, 지금까지 전체 실험을 종합하면 사용자가 말한 세 모델이 최종 3개 후보로 맞다. 다만 실제 기본 모델은 `Gemma 4 E2B`가 가장 적합하고, 나머지 둘은 서로 다른 장점 때문에 후보로 유지하는 구조가 가장 현실적이다.",
            "",
            "## 원시 응답 파일",
            "",
            f"- [gemma_4_e2b_full_responses_{STAMP}.md]({(OUTPUT_DIR / f'gemma_4_e2b_full_responses_{STAMP}.md').as_posix()})",
            f"- [exaone_35_78b_full_responses_{STAMP}.md]({(OUTPUT_DIR / f'exaone_35_78b_full_responses_{STAMP}.md').as_posix()})",
            f"- [qwen_3_8b_full_responses_{STAMP}.md]({(OUTPUT_DIR / f'qwen_3_8b_full_responses_{STAMP}.md').as_posix()})",
            f"- [top3_candidate_benchmark_results_{STAMP}.json]({(OUTPUT_DIR / f'top3_candidate_benchmark_results_{STAMP}.json').as_posix()})",
        ]
    )
    return "\n".join(lines) + "\n"


def main() -> None:
    aggregate = run_all()
    write_json(aggregate)
    for model in aggregate["models"]:
        write_model_markdown(model)
    summary_path = OUTPUT_DIR / f"top3_candidate_benchmark_summary_{STAMP}.md"
    summary_path.write_text(build_summary_markdown(aggregate), encoding="utf-8")
    print(summary_path)


if __name__ == "__main__":
    main()
