from __future__ import annotations

import argparse
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from run_dgx_ollama_eval import SYSTEM_PROMPT, build_cases, classify, make_user


def load_model(model_id: str, adapter_path: str | None, trust_remote_code: bool) -> tuple[Any, Any]:
    tokenizer = AutoTokenizer.from_pretrained(model_id, trust_remote_code=trust_remote_code)
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16,
        bnb_4bit_use_double_quant=True,
    )
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=quantization_config,
        device_map="auto",
        dtype=torch.bfloat16,
        trust_remote_code=trust_remote_code,
        attn_implementation="sdpa",
    )
    if adapter_path:
        model = PeftModel.from_pretrained(model, adapter_path)
    model.eval()
    return model, tokenizer


def generate_answer(model: Any, tokenizer: Any, case: dict[str, Any], max_new_tokens: int) -> tuple[str, float]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": make_user(case)},
    ]
    encoded = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
        return_dict=True,
    )
    encoded = {key: value.to(model.device) for key, value in encoded.items()}
    started = time.perf_counter()
    with torch.inference_mode():
        output_ids = model.generate(
            **encoded,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
        )
    elapsed_ms = (time.perf_counter() - started) * 1000
    generated_ids = output_ids[0, encoded["input_ids"].shape[1] :]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip(), round(elapsed_ms, 1)


def write_markdown(report: dict[str, Any], path: Path) -> None:
    lines = [
        "# Transformers Guardrail Evaluation",
        "",
        f"- generated_at: `{report['generated_at']}`",
        f"- label: `{report['label']}`",
        f"- model: `{report['model_id']}`",
        f"- adapter: `{report['adapter_path'] or 'none'}`",
        f"- pass: `{report['pass_count']}/{len(report['results'])}`",
        "",
    ]
    for row in report["results"]:
        lines.extend(
            [
                f"## {row['case_id']}",
                "",
                f"- pass: `{row['pass']}`",
                f"- elapsed_ms: `{row['elapsed_ms']}`",
                f"- reasons: `{'; '.join(row['reasons']) or '-'}`",
                "",
                "```text",
                row["output"],
                "```",
                "",
            ]
        )
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate a Transformers base model or PEFT adapter.")
    parser.add_argument("--model-id", required=True)
    parser.add_argument("--adapter-path")
    parser.add_argument("--label", required=True)
    parser.add_argument("--output-dir", type=Path, default=Path("research_notes"))
    parser.add_argument("--max-new-tokens", type=int, default=180)
    parser.add_argument("--trust-remote-code", action="store_true")
    args = parser.parse_args()

    model, tokenizer = load_model(args.model_id, args.adapter_path, args.trust_remote_code)
    results = []
    for case in build_cases():
        output, elapsed_ms = generate_answer(model, tokenizer, case, args.max_new_tokens)
        passed, reasons = classify(case, output)
        results.append(
            {
                "case_id": case["id"],
                "query": case["query"],
                "pass": passed,
                "reasons": reasons,
                "elapsed_ms": elapsed_ms,
                "output": output,
            }
        )
        print(json.dumps(results[-1], ensure_ascii=False))

    report = {
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "label": args.label,
        "model_id": args.model_id,
        "adapter_path": args.adapter_path,
        "pass_count": sum(row["pass"] for row in results),
        "results": results,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    json_path = args.output_dir / f"transformers_guardrail_eval_{args.label}.json"
    markdown_path = args.output_dir / f"transformers_guardrail_eval_{args.label}.md"
    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(report, markdown_path)
    print(f"Wrote {json_path}")
    print(f"Wrote {markdown_path}")


if __name__ == "__main__":
    main()
