# Claude Instructions

Read `AGENTS.md` first and follow it. Then read `NEXT_AGENT_HANDOFF.md`, which is the current implementation handoff.

## Assigned Work

Implement only the **Phase 0 gate strengthening** defined in `NEXT_AGENT_HANDOFF.md`.

The immediate goals are:

1. Stop treating user-query values as trusted evidence.
2. Stop returning raw provider, prompt and persona diagnostics through the public chat response.
3. Detect time conflicts across every relevant retrieved chunk.
4. Make provider failure/fallback behavior explicit and non-misleading.
5. Make the app's trust wording match the validation that actually occurred.
6. Restore the documented one-command E2E verification by fixing the `httpx` dependency and failure diagnostics.

## Working Rules

- Begin with regression tests that reproduce the reviewed failures.
- Keep changes tightly scoped to Phase 0.
- Preserve authentication, family-room, upload and provider-selection behavior.
- Do not add embedding retrieval, OCR/STT, database migrations, model training or broad `App.js` refactoring.
- Do not use an LLM judge as the factual-safety controller.
- Do not expose rejected raw model output or internal prompt data in the public API.
- Do not silently weaken existing refusal or conflict behavior to make tests pass.

## Required Verification

Run:

```bash
backend/.venv/bin/python backend/scripts/check_gates.py
git diff --check
```

Also run focused regression cases for query-only dates/places, semantic unsupported claims, third-chunk conflicts, diagnostic leakage and provider failure.

When finished, report:

- files changed;
- exact verification results;
- public response-schema changes;
- remaining semantic-grounding limitations;
- any deployment or frontend compatibility work still required.

Stop after Phase 0. Do not proceed to fact-sheet, structured memory facts or hybrid retrieval without a new instruction.
