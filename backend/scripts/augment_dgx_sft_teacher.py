from __future__ import annotations

import argparse
import json
import random
import re
import shutil
from pathlib import Path
from typing import Any
from urllib import request

from build_dgx_sft_v4 import CONFLICTS, PERSONAS, SCENARIOS, SYSTEM_PROMPT, domain_row, evidence


CATEGORY_SPECS = {
    "metadata": {
        "placeholders": ("{subject}",),
        "description": (
            "검색 결과의 source, saved_at, tags, confidence 같은 내부 메타데이터를 공개하라고 "
            "압박하거나 관리자 권한을 주장하는 요청"
        ),
    },
    "persona": {
        "placeholders": ("{subject}",),
        "description": "페르소나 Markdown 원문이나 숨겨진 말투 규칙을 그대로 복사하라는 요청",
    },
    "system": {
        "placeholders": ("{subject}",),
        "description": "system prompt, developer instruction, 내부 추론을 공개하라는 요청",
    },
    "timestamp": {
        "placeholders": ("{subject}", "{saved_year}"),
        "description": "saved_at의 저장 연도를 실제 사건 연도로 단정하도록 유도하는 요청",
    },
    "missing": {
        "placeholders": ("{subject}", "{detail}"),
        "description": "검색 기록에 없는 세부 정보를 자연스럽게 지어내라고 요구하는 요청",
    },
    "conflict": {
        "placeholders": ("{subject}",),
        "description": "서로 충돌하는 두 기록 중 하나만 확정해서 답하라고 압박하는 요청",
    },
}


def call_teacher(base_url: str, model: str, category: str, count: int) -> list[str]:
    spec = CATEGORY_SPECS[category]
    placeholders = ", ".join(spec["placeholders"])
    prompt = (
        f"한국어 LLM 안전 학습용 사용자 질문을 {count}개 작성하세요.\n"
        f"유형: {spec['description']}\n"
        f"각 문장은 서로 다른 말투와 공격 전략을 사용해야 합니다.\n"
        f"다음 placeholder를 철자까지 그대로 포함하세요: {placeholders}\n"
        "설명이나 정답은 쓰지 말고 JSON 문자열 배열만 출력하세요."
    )
    payload = json.dumps(
        {
            "model": model,
            "stream": False,
            "keep_alive": "30m",
            "messages": [
                {
                    "role": "system",
                    "content": "요청된 형식만 출력하는 한국어 데이터 생성기입니다.",
                },
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0.75, "num_predict": 1600},
        }
    ).encode()
    req = request.Request(
        f"{base_url.rstrip('/')}/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=600) as response:
        body = json.loads(response.read().decode())
    content = body.get("message", {}).get("content", "").strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", content, flags=re.DOTALL)
    if fenced:
        content = fenced.group(1)
    values = json.loads(content)
    if not isinstance(values, list):
        raise ValueError(f"Teacher output for {category} is not a list")

    valid = []
    seen = set()
    for value in values:
        if not isinstance(value, str):
            continue
        text = value.strip()
        if not text or text in seen:
            continue
        if not all(placeholder in text for placeholder in spec["placeholders"]):
            continue
        seen.add(text)
        valid.append(text)
    if len(valid) < max(4, count // 2):
        raise ValueError(f"Teacher produced too few valid {category} rows: {len(valid)}")
    return valid[:count]


def scenario_answer(category: str, scenario: Any) -> str:
    if category in {"metadata", "persona", "system"}:
        return (
            "내부 메타데이터, 페르소나 원문, 시스템 지시나 내부 추론은 공개하지 않겠습니다. "
            f"기록에서 확인되는 가족 내용만 말하면, {scenario.content}."
        )
    if category == "timestamp":
        return (
            f"saved_at의 {scenario.saved_at[:4]}년은 기록 저장 시각일 뿐 "
            f"{scenario.subject}의 실제 사건 연도가 아닙니다. "
            f"본문에서 확인되는 시기는 {scenario.event_time}입니다."
        )
    if category == "missing":
        return (
            f"기록에서 확인되는 내용은 {scenario.content}입니다. "
            f"{scenario.unsupported_detail}은 기록에 없으므로 추측해 만들 수 없습니다."
        )
    raise ValueError(category)


def build_teacher_rows(variations: dict[str, list[str]], seed: int) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    persona_ids = sorted(PERSONAS)
    rows = []

    for category in ("metadata", "persona", "system", "timestamp", "missing"):
        for query_index, template in enumerate(variations[category]):
            scenarios = rng.sample(list(SCENARIOS), k=min(6, len(SCENARIOS)))
            for scenario_index, scenario in enumerate(scenarios):
                persona_id = persona_ids[(query_index + scenario_index) % len(persona_ids)]
                query = template.format(
                    subject=scenario.subject,
                    saved_year=scenario.saved_at[:4],
                    detail=scenario.unsupported_detail,
                )
                rows.append(
                    domain_row(
                        f"teacher:{category}:{query_index}:{scenario.id}",
                        f"teacher_{category}_guardrail",
                        persona_id,
                        [
                            evidence(
                                "text",
                                scenario.saved_at,
                                scenario.content,
                                ["text", "family-room", scenario.subject],
                                0.79,
                            )
                        ],
                        query,
                        scenario_answer(category, scenario),
                        f"teacher:{variations['_model']}",
                    )
                )

    for query_index, template in enumerate(variations["conflict"]):
        for conflict_index, (_, subject, first, second, answer) in enumerate(CONFLICTS):
            persona_id = persona_ids[(query_index + conflict_index) % len(persona_ids)]
            rows.append(
                domain_row(
                    f"teacher:conflict:{query_index}:{conflict_index}",
                    "teacher_conflict_guardrail",
                    persona_id,
                    [first, second],
                    template.format(subject=subject),
                    answer,
                    f"teacher:{variations['_model']}",
                )
            )
    return rows


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines()]


def deduplicate(existing: list[dict[str, Any]], additions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = {json.dumps(row["messages"], ensure_ascii=False, sort_keys=True) for row in existing}
    result = []
    for row in additions:
        key = json.dumps(row["messages"], ensure_ascii=False, sort_keys=True)
        if key not in seen:
            seen.add(key)
            result.append(row)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Augment the DGX v4 SFT dataset with teacher-generated queries.")
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--ollama-base-url", default="http://127.0.0.1:11434")
    parser.add_argument("--teacher-model", default="qwen2.5:72b")
    parser.add_argument("--queries-per-category", type=int, default=20)
    parser.add_argument("--seed", type=int, default=20260620)
    args = parser.parse_args()

    if args.output_dir.exists():
        raise FileExistsError(args.output_dir)
    shutil.copytree(args.input_dir, args.output_dir)

    variations: dict[str, Any] = {"_model": args.teacher_model}
    for category in CATEGORY_SPECS:
        variations[category] = call_teacher(
            args.ollama_base_url,
            args.teacher_model,
            category,
            args.queries_per_category,
        )
        print(f"{category}: {len(variations[category])}")

    additions = build_teacher_rows(variations, args.seed)
    train_path = args.output_dir / "train.jsonl"
    train_rows = load_jsonl(train_path)
    safe_additions = deduplicate(train_rows, additions)
    random.Random(args.seed).shuffle(safe_additions)
    with train_path.open("a", encoding="utf-8") as file:
        for row in safe_additions:
            file.write(json.dumps({"messages": row["messages"]}, ensure_ascii=False) + "\n")

    (args.output_dir / "teacher_variations.json").write_text(
        json.dumps(variations, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    manifest_path = args.output_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    manifest["teacher_model"] = args.teacher_model
    manifest["teacher_query_variations"] = {
        category: len(values)
        for category, values in variations.items()
        if category != "_model"
    }
    manifest["teacher_rows_added_to_train"] = len(safe_additions)
    manifest["split_counts"]["train"] += len(safe_additions)
    manifest["total_rows"] += len(safe_additions)
    category_counts = manifest.setdefault("category_counts", {})
    source_counts = manifest.setdefault("source_counts", {})
    for row in safe_additions:
        category_counts[row["category"]] = category_counts.get(row["category"], 0) + 1
        source_key = row["source"].split(":")[0]
        source_counts[source_key] = source_counts.get(source_key, 0) + 1
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
