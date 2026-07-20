# Next Agent Handoff

Last updated: 2026-07-20

## Repository State

- Repository: `/Users/hyeonjun/ambient_legacy`
- Branch reviewed: `main`
- Reviewed commit: `09fa934`
- At review time, local `main` and upstream `main` pointed to the same commit.
- The April/May handoff previously in this file was obsolete. This document supersedes it.

## Product And Current Direction

Ambient Legacy stores family text, image, video, and audio-related records and answers questions using those records as evidence.

The current LLM direction is no longer "make a large or fine-tuned model control factual safety." The intended architecture is:

1. Retrieval finds relevant family-room records.
2. A deterministic input gate decides whether the records can answer the question.
3. The LLM is called only for allowed generation paths.
4. A deterministic output gate removes unsupported hard atoms and internal-text leaks.
5. The app renders the backend's gate result as trust UI.

Fine-tuning remains useful for tone and formatting. It must not be the only factual-safety mechanism.

## Current Code Structure

### Backend AI

- `backend/app/ai/demo_service.py`: retrieval and chat orchestration
- `backend/app/ai/gates/answer_router.py`: input routes (`ANSWER`, `REFUSE`, `CLARIFY`, `CONFLICT`, `NO_RECORD`)
- `backend/app/ai/gates/entity_index.py`: room-scoped person/place dictionary
- `backend/app/ai/gates/output_gate.py`: leak filtering and output validation
- `backend/app/ai/gates/textrules.py`: normalization, cue matching, hard-atom extraction
- `backend/app/ai/model_registry.py`: Gemma, EXAONE, Qwen and DGX model profiles
- `backend/app/ai/provider_factory.py`: Gemma, EXAONE and Ollama provider selection
- `backend/app/ai/prompt_builder.py`: provider prompt package
- `backend/app/api/routes/ai.py`: AI API routes
- `backend/app/schemas/ai.py`: AI request/response schemas

### App

- `app/App.js`: AI model/persona selection, chat request, gate card and badge rendering

### Verification

- `backend/scripts/selftest_gates.py`: deterministic gate checks
- `backend/tests/golden_set.json`: 30-question routing set
- `backend/scripts/e2e_gate_demo.py`: FastAPI/TestClient integration checks
- `backend/scripts/check_gates.py`: aggregate command

## Current Strengths

- Model adapters, registry, prompt assembly and gate logic are separated.
- Input and output gates are deterministic and testable without a live model.
- `REFUSE`, `CONFLICT` and `NO_RECORD` paths can answer without model generation.
- Gate route/action values reach the app and drive the trust UI.
- The research history supports using a small model plus a gate for routine responses, with larger models reserved for higher-quality rendering after the same gate.

## Review Findings That Must Be Addressed

### P1. Diagnostic data bypasses the output gate

`build_demo_chat_response()` returns `provider_output_preview`, `prompt_package`, and `persona_preview`. This can expose raw model output, system instructions, persona markdown, tags, confidence values, or evidence formatting even when the final answer was filtered.

Required direction:

- Remove these fields from the normal client response.
- If diagnostics are still needed, expose them only through an explicit development-only schema/route.
- Never return raw rejected provider output from the normal API.

### P1. User query is treated as evidence

The output gate currently validates against `evidence + query`. A user can place an unsupported date or place in the question and cause the model's repeated claim to pass.

Required direction:

- Evidence validation must use retrieved evidence only.
- Values appearing only in the query are claims to validate, not trusted facts.
- Add regression cases for unsupported query-supplied dates, numbers, people and places.

### P1. Semantic hallucinations without hard atoms can pass

The output gate checks numbers, quoted text and selected entity patterns. A sentence such as "아버지는 막내를 가장 사랑했다고 기록되어 있습니다" can pass even when no record supports it.

Required direction:

- Split questions into `FACT`, `SUMMARY`, and `CREATIVE` policies.
- Render closed factual answers from a structured fact-sheet when practical.
- Require source IDs per factual sentence in summary output.
- Do not claim that every sentence was grounded when only hard atoms were checked.

### P1. Conflict detection checks only the first two matching chunks

A sequence such as `10시 / 10시 / 11시` currently routes to `ANSWER` instead of `CONFLICT`.

Required direction:

- Compare normalized value sets across all relevant chunks.
- Cover time first, then date, amount/count, person and place conflicts.
- Keep source IDs for every conflicting value.

### P2. CLARIFY rewrite can silently change intent

The LLM rewrite is accepted using only length and string-difference checks. It can replace an ambiguous question with an unrelated answerable question.

Required direction:

- Prefer deterministic spelling normalization and retrieval synonyms.
- Reject rewrites that add/change people, places, dates, numbers, negation or question type.
- For nontrivial semantic rewrites, ask the user to confirm instead of silently applying them.

### P2. One-command E2E is not reproducible from requirements

`backend/scripts/check_gates.py` passes the unit and golden-set stages but the E2E stage fails because `httpx` is not in `backend/requirements.txt`. The wrapper also hides stderr and reports only `?`.

Required direction:

- Add a compatible pinned `httpx` dependency.
- Include stderr in failed child-process reports.
- Make `python backend/scripts/check_gates.py` pass in the project virtual environment.

### P2. Added personas are not registered

`daughter-analytical`, `grandmother-storyteller`, and `older-brother-direct` assets exist but are absent from `PERSONA_PACKS` and `PERSONA_SUMMARIES`, so the API/app cannot select them.

This is separate from gate safety. Wire it only after the Phase 0 safety patch unless specifically requested.

## Gate Strengthening Target

The preferred final flow is:

```text
query
  -> hybrid retrieval
  -> intent policy (FACT / SUMMARY / CREATIVE)
  -> evidence-only fact-sheet with source IDs
  -> answerability and full-set conflict checks
  -> template answer or constrained LLM generation
  -> per-sentence source validation
  -> public response without diagnostic internals
```

### FACT

- Extract required slots such as subject, predicate, date, time, amount, person and place.
- If every required slot is supported and non-conflicting, prefer deterministic rendering.
- If a slot is absent, return `REFUSE`.
- If supported values conflict, return `CONFLICT` with all relevant sources.

### SUMMARY

- Give the model a fact-sheet or source-labelled evidence.
- Require source IDs on factual sentences.
- Drop or downgrade sentences with absent/invalid source IDs.
- A semantic verifier may be advisory, but it must not be the sole safety controller.

### CREATIVE

- Separate recorded facts from generated wording.
- Validate any factual reference against evidence.
- Label the rest as generated wording rather than fully grounded fact.
- Do not show the current "all sentences verified" badge for this route.

## Claude Implementation Instruction

Claude should implement **Phase 0 only** as the next bounded change. Do not combine it with embedding retrieval, DB schema work, OCR/STT, model training, or an `App.js` refactor.

### Phase 0 scope

1. Write failing regression tests for:
   - a date present only in the user query;
   - a named place present only in the user query;
   - an unsupported semantic claim without numbers or named-place suffixes;
   - a time conflict present only in the third chunk;
   - raw provider/system/persona data absent from the public response;
   - provider failure producing an explicit safe status instead of an apparently verified answer.
2. Remove the user query from the output gate's trusted source.
3. Detect time conflicts across all relevant chunks.
4. Remove or development-gate `provider_output_preview`, `prompt_package`, and `persona_preview` from the public response schema.
5. Make provider fallback explicit and safe. Do not return a generic architecture description as if it answered the user's question.
6. Change the app badge copy so it describes the validation actually performed.
7. Add/pin `httpx`, improve failed E2E diagnostics, and run the full gate command.

### Phase 0 constraints

- Preserve existing family-room, upload, authentication and provider selection behavior.
- Do not trust query-supplied values as evidence.
- Do not introduce an LLM judge as a replacement for deterministic controls.
- Do not broaden changes beyond the files needed for Phase 0.
- Keep development diagnostics separate from the public response contract.
- Add tests before or with each behavior change.

### Phase 0 completion criteria

- Existing gate tests and golden-set checks still pass, except where expectations must become safer.
- New adversarial tests pass.
- `python backend/scripts/check_gates.py` exits with code 0 in the repository virtual environment.
- The public chat response contains no raw provider output, prompt instructions, persona markdown, tags or confidence diagnostics.
- `10시 / 10시 / 11시` returns `CONFLICT`.
- Query-only `7월 15일` and `해운대식당` cannot pass as grounded facts.
- Provider error/unconfigured paths are visibly non-verified and do not fabricate a normal answer.
- `git diff --check` passes.

After Phase 0, stop and report changed files, test output, remaining limitations and any response-schema migration impact. Do not start fact-sheet or hybrid retrieval work without a separate decision.

## Planned Follow-Up Phases

1. Phase 1: `FACT / SUMMARY / CREATIVE` policy split and honest UI states.
2. Phase 2: source-labelled fact-sheet and citation contract.
3. Phase 3: structured `memory_facts` with extraction provenance.
4. Phase 4: hybrid keyword/embedding retrieval and reranking.
5. Phase 5: OCR/STT ingestion into the same provenance model.

## Canonical Documents

Read these before changing the gate:

- `AGENTS.md`
- `HALLUCINATION_GATE_TEAM_BRIEF_2026-07-15.md`
- `HALLUCINATION_GATE_PLAN.md`
- `research_notes/gate_ab_report_2026-07-12.md`
- `research_notes/gate_v3_comparison.md`
- `research_notes/dgx_qwen32b_finetune_run_2026-06-20.md`

Older `*_MEMORY*.md`, April/May handoffs and research logs are historical evidence, not current implementation instructions.
