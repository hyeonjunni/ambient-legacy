import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "config" / "model_registry.json"
PERSONA_DIR = ROOT / "personas"
MEMORY_PATH = ROOT / "sample_data" / "memory_chunks.json"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize_term(term: str):
    term = term.strip()
    suffixes = ["에서", "으로", "에게", "께서", "과", "와", "은", "는", "이", "가", "을", "를", "도", "만", "의", "에"]
    for suffix in suffixes:
        if term.endswith(suffix) and len(term) > len(suffix) + 1:
            return term[: -len(suffix)]
    return term


def load_persona_markdown():
    sections = []
    for name in ["identity.md", "voice.md", "timeline.md", "memory_policy.md"]:
        path = PERSONA_DIR / name
        sections.append(path.read_text(encoding="utf-8").strip())
    return "\n\n".join(sections)


def select_model(model_id: str):
    registry = load_json(CONFIG_PATH)
    for model in registry["models"]:
        if model["id"] == model_id:
            return model
    raise ValueError(f"unknown model_id: {model_id}")


def retrieve_chunks(query: str, limit: int = 2):
    chunks = load_json(MEMORY_PATH)
    query_terms = {
        normalize_term(term)
        for term in query.replace("?", " ").replace(",", " ").split()
        if normalize_term(term)
    }
    scored = []
    for chunk in chunks:
        haystack = f'{chunk["text"]} {" ".join(chunk["tags"])}'
        score = sum(1 for term in query_terms if term in haystack)
        if score > 0:
            scored.append((score, chunk))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [chunk for _, chunk in scored[:limit]]


def build_prompt_package(query: str, model_id: str):
    model = select_model(model_id)
    persona = load_persona_markdown()
    memories = retrieve_chunks(query=query)
    evidence_lines = []
    for item in memories:
        evidence_lines.append(
            f'- [{item["source_type"]}] {item["timestamp"]}: {item["text"]} '
            f'(tags={", ".join(item["tags"])}, confidence={item["confidence"]})'
        )

    if not evidence_lines:
        evidence_lines.append("- 검색된 개인 기록이 없습니다.")

    system_prompt = (
        "You are a digital-legacy assistant. "
        "Use retrieved memories as primary evidence, and use persona markdown only to shape tone. "
        "Do not invent unsupported memories."
    )

    return {
        "selected_model": model,
        "system_prompt": system_prompt,
        "persona_markdown": persona,
        "retrieved_evidence": evidence_lines,
        "user_query": query
    }


def main():
    package = build_prompt_package(
        query="송년회에서 어떤 말을 했는지 기억나?",
        model_id="gemma-3n-e2b-device",
    )
    print(json.dumps(package, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
