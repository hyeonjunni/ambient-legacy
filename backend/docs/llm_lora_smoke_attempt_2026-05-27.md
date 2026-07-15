# LLM LoRA Smoke Attempt 2026-05-27

## What Was Tried

- Installed `mlx-lm==0.31.3`.
- Prepared a tiny SFT smoke dataset from `research_notes/llm_weekly_sft_seed_2026-05-27.jsonl`.
- Split data into:
  - `backend/finetune/weekly_sft_smoke/train.jsonl` (`4` rows)
  - `backend/finetune/weekly_sft_smoke/valid.jsonl` (`1` row)
  - `backend/finetune/weekly_sft_smoke/test.jsonl` (`1` row)
- Queried Hugging Face model candidates:
  - Gemma: `mlx-community/gemma-3-1b-it-4bit`
  - Gemma E2B candidate: `mlx-community/gemma-4-e2b-it-OptiQ-4bit`
  - EXAONE small candidate: `mlx-community/EXAONE-3.5-2.4B-Instruct-4bit`
  - EXAONE 7.8B candidate: `mlx-community/EXAONE-3.5-7.8B-Instruct-4bit`
- Started a real MLX LoRA command against `mlx-community/gemma-3-1b-it-4bit`.

## Command

```bash
python3 -m mlx_lm.lora \
  --model mlx-community/gemma-3-1b-it-4bit \
  --train \
  --data backend/finetune/weekly_sft_smoke \
  --mask-prompt \
  --iters 3 \
  --batch-size 1 \
  --num-layers 4 \
  --learning-rate 1e-5 \
  --steps-per-report 1 \
  --steps-per-eval 1 \
  --val-batches 1 \
  --adapter-path backend/finetune/adapters/gemma3_1b_smoke
```

## First Result

- Model download completed into Hugging Face cache.
- Adapter config was initialized at:
  - `backend/finetune/adapters/gemma3_1b_smoke/adapter_config.json`
- Initial training did not start because MLX detected Anaconda `MPICH` instead of `Open MPI`.

Observed blocker:

```text
[mpi] MPI found but it does not appear to be Open MPI.
MLX requires Open MPI but this is MPICH Version: 4.3.2
```

## Interpretation

This was an environment issue, not a dataset or model-format issue.

The current `python3` points to Anaconda:

```text
/opt/anaconda3/bin/python3
```

That environment exposes MPICH, and MLX refuses it. MLX documentation says its MPI path is tested with Open MPI, so the next attempt should use either:

- a clean Python/venv without Anaconda MPICH on the path, or
- an Anaconda environment using `openmpi` instead of `mpich`.

## Next Command To Try

The issue was fixed by creating a Homebrew Python venv:

```bash
/opt/homebrew/bin/python3 -m venv .venv-mlx
.venv-mlx/bin/python -m pip install mlx-lm
```

Then rerun the same Gemma smoke command above using `.venv-mlx/bin/python`.

## Successful Smoke Runs

### Gemma 3 1B

Command:

```bash
.venv-mlx/bin/python -m mlx_lm.lora \
  --model mlx-community/gemma-3-1b-it-4bit \
  --train \
  --data backend/finetune/weekly_sft_smoke \
  --mask-prompt \
  --iters 3 \
  --batch-size 1 \
  --num-layers 4 \
  --learning-rate 1e-5 \
  --steps-per-report 1 \
  --steps-per-eval 1 \
  --val-batches 1 \
  --adapter-path backend/finetune/adapters/gemma3_1b_smoke
```

Result:

```text
Trainable parameters: 0.077% (1.004M/1301.876M)
Iter 3: Val loss 3.361
Iter 3: Train loss 2.091
Peak mem 2.247 GB
Saved final weights to backend/finetune/adapters/gemma3_1b_smoke/adapters.safetensors.
```

Adapter output:

- `backend/finetune/adapters/gemma3_1b_smoke/adapters.safetensors`
- `backend/finetune/adapters/gemma3_1b_smoke/adapter_config.json`

### EXAONE 3.5 2.4B

Command:

```bash
.venv-mlx/bin/python -m mlx_lm.lora \
  --model mlx-community/EXAONE-3.5-2.4B-Instruct-4bit \
  --train \
  --data backend/finetune/weekly_sft_smoke \
  --mask-prompt \
  --iters 3 \
  --batch-size 1 \
  --num-layers 4 \
  --learning-rate 1e-5 \
  --steps-per-report 1 \
  --steps-per-eval 1 \
  --val-batches 1 \
  --adapter-path backend/finetune/adapters/exaone_35_24b_smoke
```

Result:

```text
Trainable parameters: 0.061% (1.466M/2405.327M)
Iter 3: Val loss 2.549
Iter 3: Train loss 1.396
Peak mem 2.572 GB
Saved final weights to backend/finetune/adapters/exaone_35_24b_smoke/adapters.safetensors.
```

Adapter output:

- `backend/finetune/adapters/exaone_35_24b_smoke/adapters.safetensors`
- `backend/finetune/adapters/exaone_35_24b_smoke/adapter_config.json`

## Adapter Inference Check

Gemma adapter loading and generation ran, but the 3-step tiny dataset is too small to improve answer quality.

EXAONE adapter training succeeded. A generation smoke check requires `--trust-remote-code` for the EXAONE tokenizer/config path; this was not run because it executes third-party repository code locally and needs explicit approval for that risk.

## Direction

Keep Gemma as the primary target. Use EXAONE as the speed-oriented comparison after explicitly approving the custom-code tokenizer/config path or choosing an EXAONE MLX package that does not require remote code.
