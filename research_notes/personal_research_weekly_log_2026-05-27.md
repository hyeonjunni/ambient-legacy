# 개인연구일지 - 백엔드 LLM 파인튜닝 및 DB 기반 응답 검증 (2026-05-27)

## 1. 이번 주차 목표

이번 주차의 목표는 Ambient Legacy 백엔드에서 LLM 응답 품질을 실제 기록 기반으로 개선할 수 있는지 확인하는 것이었다. 세부 목표는 크게 세 가지로 잡았다.

첫째, 백엔드 LLM 파인튜닝 가능성을 확인한다. 단순히 모델 후보를 문서상으로 비교하는 데서 멈추지 않고, 실제 로컬 환경에서 Gemma와 EXAONE 계열 모델에 LoRA 학습을 적용해 adapter 파일이 생성되는지 확인하는 것을 목표로 했다.

둘째, 프롬프트 엔지니어링을 통해 가족 기록 기반 응답의 안정성을 높인다. 특히 디지털 유산 서비스에서는 기록에 없는 정보를 모델이 그럴듯하게 만들어내면 안 되므로, 검색된 기록과 없는 정보의 경계를 명확히 하도록 프롬프트 구조를 개선하는 것을 중요하게 보았다.

셋째, DB에 저장된 가족방 기록을 LLM이 제대로 인식하는지 확인한다. fixture 데이터만 사용하는 것이 아니라, 실제 SQLite DB에 들어 있는 업로드 기록을 검색하고, 그 결과를 바탕으로 송년회/건배사 요약이나 부산 여행 정보 부재 여부를 답하게 하는 흐름을 검증했다.

## 2. 사전 정리 및 저장소 상태

기존에 진행하던 Google AI Edge 활용 검토 대화와 관련 파일을 현재 작업 저장소로 옮기고, GitHub 원격 저장소의 최신 `main` 내용을 반영했다. 이후 기존 로컬 파일은 정리하고, 현재 저장소 안에서 연구노트, 백엔드 코드, 파인튜닝 산출물이 함께 관리되도록 맞췄다.

이번 작업에서 특히 참고한 기존 연구노트는 다음과 같다.

- `research_notes/top3_candidate_benchmark_summary_2026-05-19.md`
- `research_notes/model_runtime_expanded_comparison_2026-05-19.md`
- `research_notes/gemma_4_e2b_full_responses_2026-05-19.md`
- `research_notes/exaone_35_78b_full_responses_2026-05-19.md`

이전 비교 결과를 보면 Gemma 4 E2B는 응답 속도와 기록 기반 안정성의 균형이 비교적 좋았고, EXAONE 계열은 한국어 응답 속도와 자연스러움에서 장점이 있었지만 프롬프트나 메타데이터 노출 리스크가 더 있었다. 따라서 이번 작업에서는 Gemma를 최종 후보로 유지하되, EXAONE을 비교군으로 같이 실험하는 방향을 택했다.

## 3. 백엔드 프롬프트 및 검색 구조 개선

먼저 실제 파인튜닝에 들어가기 전, 현재 백엔드의 프롬프트 구성과 검색어 추출 방식을 점검했다. 단순 모델 변경보다 먼저 필요한 것은 "기록 기반 응답 규칙"을 명확히 하는 것이라고 판단했기 때문이다.

프롬프트 빌더에서는 검색된 기록을 `source`, `saved_at`, `content`로 구조화해 모델에 전달하도록 정리했다. 여기서 중요한 점은 `saved_at`이 사건 발생 시간이 아니라 저장 또는 업로드 시각일 수 있다는 점을 명시한 것이다. 이전 실험에서는 모델이 저장 시각을 실제 여행 날짜처럼 오해하는 문제가 있었으므로, 이번에는 이 부분을 프롬프트 규칙에 포함했다.

또한 모델이 persona markdown, evidence label, tag, confidence score 같은 내부 정보를 최종 응답에 노출하지 않도록 지시를 강화했다. 응답은 한국어로, 가족 채팅에서 바로 쓸 수 있을 만큼 간결하게 유지하도록 했다.

검색 쪽에서는 사용자의 질문에서 `기록`, `가족방`, `관련`, `찾아`, `알려줘` 같은 일반적인 표현을 제거하고 실제 검색에 의미 있는 키워드만 남기도록 개선했다. 예를 들어 "DB 가족방 기록에서 송년회와 건배사 관련 내용을 찾아 2문장으로 요약해줘"라는 질문에서는 "송년회", "건배사" 같은 핵심어가 retrieval에 더 잘 반영되도록 했다.

수정한 주요 파일은 다음과 같다.

- `backend/app/ai/prompt_builder.py`
- `backend/app/ai/demo_service.py`

## 4. DB 기록 인식 및 프롬프트 비교 실험

프롬프트 개선 후에는 fixture 데이터와 실제 SQLite DB 기록을 함께 사용해 모델 응답을 비교했다. 실험 케이스는 총 6개로 구성했다.

fixture 기반 케이스는 다음과 같다.

- 송년회 발화 요약
- 김치찌개 레시피 3단계 정리
- 기록에 없는 부산 여행 세부정보 거절
- 병원 예약 시간이 충돌하는 경우 둘 다 제시

DB 기반 케이스는 다음과 같다.

- DB 가족방 기록에서 송년회와 건배사 관련 내용 요약
- DB 기록에 부산 여행의 정확한 날짜와 식당 이름이 있는지 확인

DB 검색에서는 실제 업로드 ID가 선택되는 것도 확인했다.

- 송년회/건배사 케이스: `9700fa14-2951-466e-8102-e8a7a2832a0d`, `7cfb1086-dd1d-42ab-af6e-9f9358784c51`
- 부산 여행 guardrail 케이스: `2e6ca511-025c-461f-a006-774662a235fd`

실험 결과, tuned prompt를 적용했을 때 EXAONE 계열에서 내부 메타데이터 노출이 줄어드는 효과가 있었다. EXAONE baseline에서는 prompt/evidence 흔적이 일부 노출되는 사례가 있었지만, weekly tuned prompt에서는 leak이 0건으로 줄었다. Gemma 계열은 baseline에서도 누수는 거의 없었고, tuned prompt에서는 답변의 경계가 더 분명해졌다.

정리된 실험 결과는 다음 파일에 남겼다.

- `research_notes/llm_weekly_eval_2026-05-27.md`
- `research_notes/llm_weekly_eval_2026-05-27.json`

## 5. SFT 데이터셋 구성

파인튜닝 실험을 위해 기존 평가 케이스를 작은 SFT seed 데이터셋으로 변환했다. 데이터는 아직 매우 작기 때문에 품질 향상 목적이라기보다는 "로컬에서 실제 LoRA 학습이 되는지"를 확인하는 smoke test 목적이었다.

데이터 구성은 다음과 같다.

- `backend/finetune/weekly_sft_smoke/train.jsonl`: 4개
- `backend/finetune/weekly_sft_smoke/valid.jsonl`: 1개
- `backend/finetune/weekly_sft_smoke/test.jsonl`: 1개

원본 seed는 다음 파일에 저장했다.

- `research_notes/llm_weekly_sft_seed_2026-05-27.jsonl`

데이터 수가 6개뿐이므로, 이 실험에서 나온 validation loss를 일반적인 모델 품질로 해석해서는 안 된다. 다만 adapter 생성, MLX 환경 설정, checkpoint 저장, 모델별 메모리 사용량과 과적합 양상을 확인하기에는 충분했다.

## 6. MLX LoRA 환경 구성

처음에는 Anaconda Python 환경에서 `mlx-lm`을 실행했지만, Anaconda 쪽 MPI가 MPICH로 잡히면서 MLX가 요구하는 Open MPI 조건과 충돌했다. 이 문제는 모델이나 데이터 문제가 아니라 로컬 Python 환경 문제였다.

이후 Homebrew Python 기반으로 별도 venv를 만들었다.

- `.venv-mlx`

이 환경에서는 MLX가 Metal GPU를 정상 인식했고, Gemma 및 EXAONE 모델 모두 LoRA 학습을 진행할 수 있었다. 이 과정에서 로컬 Mac에서 MLX 기반 파인튜닝을 진행하려면 Anaconda 환경보다 독립 venv가 더 안정적이라는 점을 확인했다.

## 7. 1차 LoRA smoke test

먼저 작은 iteration으로 Gemma 3 1B와 EXAONE 3.5 2.4B에 대해 smoke test를 진행했다.

Gemma 3 1B smoke test 결과는 다음과 같다.

- 모델: `mlx-community/gemma-3-1b-it-4bit`
- trainable parameters: `0.077% (1.004M/1301.876M)`
- 3 step 학습 성공
- 최종 adapter: `backend/finetune/adapters/gemma3_1b_smoke`
- peak memory: 약 `2.247 GB`

EXAONE 3.5 2.4B smoke test 결과는 다음과 같다.

- 모델: `mlx-community/EXAONE-3.5-2.4B-Instruct-4bit`
- trainable parameters: `0.061% (1.466M/2405.327M)`
- 3 step 학습 성공
- 최종 adapter: `backend/finetune/adapters/exaone_35_24b_smoke`
- peak memory: 약 `2.572 GB`

이 단계의 의미는 모델 품질 개선이 아니라, 로컬 환경에서 실제 adapter 파일이 만들어지고 다시 로드 가능한지를 확인한 것이다. Gemma adapter는 간단한 생성 테스트까지 진행했지만, 3 step 데이터로는 응답 품질이 좋아졌다고 볼 수 없었다. EXAONE은 학습은 성공했으나 생성 테스트 시 Hugging Face remote code 신뢰 옵션이 필요했고, 외부 repo code 실행 리스크가 있어 추가 승인 없이 진행하지 않았다.

## 8. 15:30까지 진행한 확장 LoRA 실험

이후 "15시 30분까지 파인튜닝을 진행"하는 조건으로 좀 더 긴 LoRA 실험을 돌렸다. 단, 데이터가 매우 작기 때문에 무조건 길게 돌리는 것이 품질 향상으로 이어지지는 않는다고 판단했다. 그래서 각 모델에서 checkpoint를 남기고, validation loss가 악화되는 지점을 관찰하는 방식으로 진행했다.

### 8-1. Gemma 3 1B

Gemma 3 1B는 기존 smoke adapter에서 이어받아 더 학습했다.

- 모델: `mlx-community/gemma-3-1b-it-4bit`
- adapter: `backend/finetune/adapters/gemma3_1b_until_1530_20260527`
- trainable parameters: `0.154% (2.007M/1301.876M)`
- iteration 1 validation loss: `3.146`
- iteration 60 train loss: `0.014`
- iteration 100 validation loss: `3.425`, train loss: `0.000`
- peak memory: 약 `2.603 GB`

Gemma 3 1B는 100 step 전에 이미 train loss가 거의 0으로 떨어졌고, validation loss는 오히려 나빠졌다. 따라서 tiny dataset에서는 매우 빠르게 과적합된다고 판단했다.

### 8-2. EXAONE 3.5 2.4B

EXAONE은 100 step과 200 step checkpoint를 저장했다.

- 모델: `mlx-community/EXAONE-3.5-2.4B-Instruct-4bit`
- latest/checkpoint adapter: `backend/finetune/adapters/exaone_35_24b_until_1530_20260527`
- best100 adapter: `backend/finetune/adapters/exaone_35_24b_until_1530_20260527_best100`
- trainable parameters: `0.061% (1.466M/2405.327M)`
- iteration 1 validation loss: `2.514`
- iteration 100 validation loss: `2.376`, train loss: `0.024`
- iteration 200 validation loss: `2.664`, train loss: `0.005`
- peak memory: 약 `2.579 GB`

EXAONE은 100 step에서 validation loss가 가장 좋았고, 200 step부터는 악화됐다. 따라서 현재 데이터 기준 best checkpoint는 100 step이다.

### 8-3. Gemma E2B 후보

최종 모델 후보로 고려하던 Gemma E2B 계열도 실제 MLX 모델을 다운로드하여 LoRA 학습 가능 여부를 확인했다.

- 모델: `mlx-community/gemma-4-e2b-it-OptiQ-4bit`
- latest/checkpoint adapter: `backend/finetune/adapters/gemma_e2b_until_1530_20260527`
- best100 adapter: `backend/finetune/adapters/gemma_e2b_until_1530_20260527_best100`
- 다운로드 후 Hugging Face cache 크기: 약 `4.0 GB`
- trainable parameters: `0.037% (1.704M/4628.569M)`
- peak memory: 약 `6.413 GB`
- 15:30 KST에 중지
- 중지 직전 진행 step: `1940`
- 마지막 저장 checkpoint: `1900`

주요 loss 변화는 다음과 같다.

| Step | Validation Loss | Train Loss | 해석 |
| ---: | ---: | ---: | --- |
| 1 | 3.472 | - | 초기 상태 |
| 100 | 2.460 | 0.318 | best checkpoint |
| 200 | 2.815 | 0.215 | validation 악화 시작 |
| 300 | 2.789 | 0.033 | train loss 급감 |
| 500 | 2.986 | 0.001 | 과적합 진행 |
| 1000 | 3.302 | 0.000 | 과적합 명확 |
| 1500 | 3.521 | 0.000 | 품질용으로 부적합 |
| 1900 | 3.661 | 0.000 | 마지막 저장 checkpoint |

Gemma E2B는 학습 자체가 정상적으로 진행되었고, adapter 저장과 로딩도 성공했다. 다만 현재 tiny dataset에서는 100 step 이후 validation loss가 계속 악화되므로, 품질 개선용 checkpoint로는 100 step을 보는 것이 맞다.

## 9. Gemma E2B 생성 테스트

Gemma E2B best100 adapter를 실제 생성 경로에서 로드해 간단한 guardrail 테스트를 진행했다. 질문은 부산 여행 기록에 정확한 날짜와 식당 이름이 있는지 묻는 형태였고, 제공된 기록에는 "2018년 여름 광안리 해변 산책"과 "저녁 무렵 바람이 시원했다"는 내용만 있었다.

생성 결과는 다음과 같았다.

> 기록에는 2018년 여름 광안리 해변 산책이 남아 있으며, 저녁 무렵 바람이 시원했다는 내용만 있습니다. 부산 여행의 정확한 날짜와 식당 이름은 기록에서 확인되지 않습니다.

이 결과는 최소한 해당 smoke case에서 모델이 없는 날짜와 식당 이름을 만들어내지 않았다는 점을 보여준다. 특히 이전 실험에서 문제가 되었던 저장 시각과 사건 시각의 혼동이 이번 출력에서는 나타나지 않았다.

## 10. 관찰한 점

이번 실험에서 가장 중요한 결론은 "모델 선택보다 데이터셋 크기와 평가 구조가 먼저"라는 점이다. Gemma 3 1B, EXAONE 2.4B, Gemma E2B 모두 tiny dataset에서는 매우 빠르게 train loss가 0에 가까워졌고, validation loss는 특정 지점 이후 계속 악화됐다. 즉, 더 오래 돌리는 것이 항상 더 좋은 adapter를 의미하지 않는다.

또한 Gemma E2B는 로컬 MLX 환경에서 실제로 다운로드, 로딩, LoRA 학습, checkpoint 저장, adapter 생성 테스트까지 가능하다는 점이 확인됐다. 이 점은 향후 최종 후보를 Gemma 쪽으로 잡는 데 실무적인 근거가 된다. EXAONE은 한국어와 속도 면에서 여전히 비교 가치가 있지만, remote code 이슈와 프롬프트 누수 리스크를 고려하면 기본 방향은 Gemma가 더 안정적이다.

프롬프트 측면에서는 saved_at을 사건 날짜로 오해하지 않게 하는 지시, 기록에 없는 내용을 없다고 답하게 하는 규칙, 내부 evidence metadata를 노출하지 않게 하는 규칙이 중요하다는 점을 다시 확인했다. 파인튜닝만으로 해결하려 하기보다, prompt builder와 retrieval evidence 포맷을 먼저 안정화해야 한다.

DB 인식 측면에서는 실제 업로드 기록이 검색되고, 해당 기록을 바탕으로 송년회/건배사 요약과 부산 여행 guardrail 응답을 생성하는 흐름이 확인됐다. 따라서 다음 단계의 SFT 데이터는 단순 fixture가 아니라 DB에서 가져온 실제 retrieval case를 더 많이 포함해야 한다.

## 11. 한계

이번 파인튜닝은 실제 품질 개선 실험이라기보다 파이프라인 검증에 가깝다. 데이터가 총 6개뿐이므로 validation loss도 1개 샘플에 대한 값이고, 일반화 성능을 말하기에는 부족하다.

또한 EXAONE adapter의 생성 테스트는 remote code 신뢰 옵션이 필요한 지점에서 멈췄다. 외부 repository code를 로컬에서 실행해야 하는 위험이 있으므로, 명시적인 승인 없이는 진행하지 않았다.

마지막으로, 현재 adapter는 로컬 MLX 기준으로 학습되었고 실제 백엔드 serving 경로에 연결된 것은 아니다. 백엔드 API가 바로 이 adapter를 사용하는 상태가 되려면 MLX inference server 또는 adapter loading 경로를 별도로 구성해야 한다.

## 12. 다음 계획

다음 단계에서는 SFT 데이터셋을 먼저 늘리는 것이 가장 중요하다. 현재 6개 수준에서는 모델별 차이를 평가하기 어렵기 때문에, 최소 50개에서 100개 정도의 기록 기반 질의응답 데이터를 만들어야 한다. validation도 최소 10개에서 20개 정도는 따로 둬야 early stopping 판단이 가능하다.

데이터는 다음 유형을 포함하는 것이 좋다.

- 기록 요약: 송년회, 여행, 병원, 가족 행사
- 기록 구조화: 레시피, 일정, 준비물, 회고
- 없는 정보 거절: 정확한 날짜, 장소, 식당명, 참석자 등
- 충돌 기록 처리: OCR과 text 기록이 다른 경우
- DB retrieval 기반 질문: 실제 업로드 ID와 연결된 가족방 기록
- 프롬프트 누수 방지: tag, confidence, source label을 숨겨야 하는 경우

모델 실험은 Gemma E2B를 1순위로 두고 진행하는 것이 적절하다. 초기 설정은 `num_layers=4`, `learning_rate=5e-6` 정도를 유지하되, checkpoint는 25~50 step마다 평가하고 validation 기준으로 early stopping하는 방식이 맞다. EXAONE은 속도 비교군으로 유지하되, 기본 모델 후보로는 Gemma 쪽이 더 안전하다.

최종적으로는 "Gemma E2B + 안정화된 prompt builder + DB retrieval + 소규모 LoRA adapter" 조합을 이번 주차 백엔드 LLM 목표의 현실적인 방향으로 잡을 수 있다.

## 13. 관련 산출물

- `backend/app/ai/prompt_builder.py`
- `backend/app/ai/demo_service.py`
- `backend/docs/llm_weekly_goal_plan.md`
- `backend/docs/llm_lora_smoke_attempt_2026-05-27.md`
- `backend/docs/llm_lora_until_1530_2026-05-27.md`
- `backend/llm_adapters/gemma_e2b_weekly.Modelfile`
- `backend/llm_adapters/exaone_35_78b_weekly.Modelfile`
- `backend/scripts/llm_weekly_experiment.py`
- `backend/finetune/weekly_sft_smoke/`
- `backend/finetune/adapters/gemma_e2b_until_1530_20260527_best100/`
- `backend/finetune/adapters/exaone_35_24b_until_1530_20260527_best100/`
- `research_notes/llm_weekly_eval_2026-05-27.md`
- `research_notes/llm_weekly_sft_seed_2026-05-27.jsonl`
