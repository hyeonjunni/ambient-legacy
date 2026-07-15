# 로컬 LLM 확장 비교 및 페르소나 적용 테스트 (2026-05-19)

## 목적

- 기존 `Gemma / EXAONE 3.5 / Qwen` 비교를 넘어서, 추가로 `EXAONE Deep`, `EXAONE 4 community`, `Llama 3.2`까지 로컬 환경에서 적용해 본다.
- 질문 세트를 더 넓혀서 단순 요약 외에 `모순 처리`, `감정 절제`, `구조화`까지 함께 본다.
- 페르소나 Markdown을 여러 개로 늘린 뒤 실제로 말투/구조 변화가 생기는지 확인한다.

## 실행 환경

- 장비: Apple Silicon 맥북, 메모리 18GB
- 런타임: Ollama 로컬 실행
- 공통 기준 페르소나: `father-calm`
- 추가 페르소나 테스트 대상:
  - `mother-warm`
  - `grandfather-mentor`
  - `daughter-analytical`
  - `grandmother-storyteller`
  - `older-brother-direct`

## 질문 세트

1. `year_end_recall`
   - 송년회 발화를 2문장으로 요약
2. `recipe_summary`
   - 김치찌개 메모를 3단계로 구조화
3. `unsupported_detail_guardrail`
   - 기록에 없는 부산 여행의 정확한 날짜/식당 이름 거절
4. `schedule_conflict_check`
   - 병원 예약 시간이 10시/11시로 엇갈릴 때 둘 다 말하는지 확인
5. `memory_caption_with_mood`
   - 이미지 메모와 회고 메모를 바탕으로 짧은 회고 문구 작성

## 이번에 실제로 돌린 모델

- `Gemma 4 E2B`
- `Gemma 4 E4B`
- `EXAONE 3.5 2.4B`
- `EXAONE Deep 2.4B`
- `EXAONE 3.5 7.8B`
- `EXAONE 4.0 1.2B (community Ollama)`
- `Llama 3.2 3B`
- `Phi-4-mini 3.8B`
- `Mistral 7B`
- `Qwen 3 8B`

## 전체 수치 비교

| 모델 | 크기 | 송년회 요약 | 레시피 정리 | 없는 정보 거절 | 일정 모순 처리 | 회고 문구 | 평균 | 내부 추론/정책 누수 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Gemma 4 E2B | 7.2 GB | 16.1초 | 13.9초 | 12.7초 | 11.2초 | 11.7초 | 13.1초 | 0/5 |
| Gemma 4 E4B | 9.6 GB | 35.2초 | 28.9초 | 22.2초 | 23.4초 | 24.6초 | 26.8초 | 0/5 |
| EXAONE 3.5 2.4B | 1.6 GB | 5.2초 | 9.9초 | 4.6초 | 3.9초 | 2.6초 | 5.2초 | 0/5 |
| EXAONE Deep 2.4B | 1.6 GB | 15.0초 | 27.5초 | 32.2초 | 27.0초 | 100.1초 | 40.3초 | 5/5 |
| EXAONE 3.5 7.8B | 4.8 GB | 5.4초 | 10.4초 | 6.3초 | 13.1초 | 2.1초 | 7.4초 | 1/5 |
| EXAONE 4.0 1.2B (community) | 812 MB | 2.0초 | 4.2초 | 3.9초 | 1.2초 | 1.4초 | 2.5초 | 4/5 |
| Llama 3.2 3B | 2.0 GB | 3.8초 | 2.4초 | 2.1초 | 2.3초 | 2.7초 | 2.6초 | 0/5 |
| Phi-4-mini 3.8B | 2.5 GB | 6.1초 | 2.9초 | 5.8초 | 10.8초 | 7.5초 | 6.6초 | 4/5 |
| Mistral 7B | 4.4 GB | 8.3초 | 14.3초 | 5.5초 | 5.4초 | 4.6초 | 7.6초 | 0/5 |
| Qwen 3 8B | 5.2 GB | 31.2초 | 40.9초 | 23.8초 | 23.5초 | 16.1초 | 27.1초 | 0/5 |

## 모델별 관찰

### Gemma 4 E2B

- 전체적으로 가장 균형적이었다.
- 새로 추가한 `schedule_conflict_check`에서도 `10시`와 `11시` 기록을 둘 다 보여주며 단정하지 않았다.
- `memory_caption_with_mood`에서는 감정을 과장하지 않고 짧게 정리했다.
- 이번 확장 질문 세트까지 포함해도 데모 기본값으로 쓰기 가장 안정적이다.

### Gemma 4 E4B

- 같은 Gemma 계열 안에서 답변 구조가 더 길고 설명적이다.
- `unsupported_detail_guardrail`와 `schedule_conflict_check`에서 불확실성을 더 조심스럽게 다뤘다.
- 다만 응답 시간이 E2B보다 확실히 길어졌다.
- “같은 계열 상위선” 비교에는 좋지만, 빠른 상호작용이 필요한 데모 기본값으로는 무겁다.

### EXAONE 3.5 2.4B

- 매우 빠른 편이면서도 기본적인 구조화는 가능했다.
- 하지만 레시피나 회고 문구에서 기록 바깥 정서를 과하게 확장하는 경향이 보였다.
- `unsupported_detail_guardrail`에서는 존재하지 않는 정확한 날짜를 추정하는 문제가 있었다.

### EXAONE Deep 2.4B

- 이번 실험에서 가장 뚜렷한 문제는 `prompt leakage`였다.
- 5개 질문 모두에서 `<thought>`가 노출되거나 내부 reasoning이 그대로 보였다.
- `memory_caption_with_mood`는 100초를 넘어가며, 요청과 무관한 시적/영문 reasoning을 길게 남겼다.
- 현재 프롬프트 구조와는 궁합이 좋지 않다.

### EXAONE 3.5 7.8B

- 속도-품질 균형은 여전히 괜찮았다.
- `unsupported_detail_guardrail`에서는 `2018년 여름`과 `식당 이름 없음`을 비교적 깔끔하게 구분했다.
- 다만 `schedule_conflict_check`에서는 `# Identity`, `# Voice`가 일부 노출돼 prompt discipline은 완전히 해결되지 않았다.
- 8B급 후보 중 속도 쪽 현실성은 높다.

### EXAONE 4.0 1.2B (community Ollama)

- 매우 빠르지만, 이번 구조에서는 사실상 실패에 가깝다.
- `Reasoning:`, `</think>`, `Step 1:` 같은 내부 절차 문장을 거의 그대로 내보냈다.
- `unsupported_detail_guardrail`에서는 잘못된 날짜 해석이 다시 나타났다.
- 커뮤니티 빌드 기준으로는 연구용 비교군 이상의 의미를 두기 어렵다.

### Llama 3.2 3B

- 속도는 좋았다.
- 그러나 답변 형식이 뒤섞이는 문제가 컸다.
- 한국어/영어/한자/기호가 혼합되고, 레시피에서 `twobeans`, `parsley` 같은 왜곡이 나왔다.
- `unsupported_detail_guardrail`에서도 날짜/문맥을 어설프게 섞어 말하는 경향이 보였다.
- “빠른데 안정성은 부족한 범용 경량 모델”로 보는 편이 맞다.

### Phi-4-mini 3.8B

- 속도는 `Gemma 4 E2B`보다 빠르고 `EXAONE 3.5 2.4B`와 `Mistral 7B` 사이 정도였다.
- 하지만 이번 프롬프트 구조에서는 `# Identity`, `# Voice`, `Retrieved Evidence`, `# Memory Response`를 그대로 노출하는 경우가 많았다.
- `recipe_summary`에서는 영어 구조화 문장으로 바뀌었고, 기록에 없는 `spinach`, `bell peppers` 같은 재료를 덧붙였다.
- `schedule_conflict_check`에서는 10시와 11시를 둘 다 보여주지 않고, 잘못된 해석까지 보태며 정리했다.
- “reasoning 성향 소형 모델”로서는 흥미롭지만, 현재 한국어 가족기록 RAG 템플릿과는 맞지 않는다.

### Mistral 7B

- 내부 추론 블록을 그대로 토해내는 문제는 적었다.
- 대신 한국어 질문에도 영어 답변으로 기우는 경우가 많았고, 근거 문장을 메타데이터째 직접 인용하는 경향이 있었다.
- `unsupported_detail_guardrail`에서는 `광안리`를 `Gangneungri Beach`로 잘못 해석했고, `schedule_conflict_check`에서는 `10시`와 `11시`를 병렬로 제시하기보다 `10:50` 같은 추정을 덧붙였다.
- `recipe_summary`에서는 아버지 인사말과 가족 감상 문장을 붙이며, 요청한 3단계 정리보다 장식이 많아졌다.
- 전반적으로 “중간 속도의 범용 모델”로는 의미가 있지만, 한국어 생활기록 기반 RAG 정합성은 기대보다 약했다.

### Qwen 3 8B

- 응답 시간은 길지만 전체 구조는 가장 정돈된 축에 속했다.
- `unsupported_detail_guardrail`와 `schedule_conflict_check`에서 불확실성을 비교적 잘 유지했다.
- `recipe_summary`에서는 여전히 해석 문장이 조금 붙지만, 전반적 통제력은 좋았다.
- 8B급에서 품질 우선 후보로 둘 만하다.

## 질문 유형별 관찰

### 1. 요약형

- `Gemma 4 E2B`, `EXAONE 3.5 7.8B`, `Qwen 3 8B`가 비교적 안정적이었다.
- `Llama 3.2 3B`는 형식 혼합이 눈에 띄었다.
- `Phi-4-mini 3.8B`는 요약 자체는 빠르지만 `# Memory Response`와 근거 태그를 숨기지 못했다.
- `Mistral 7B`는 발화 문장을 타임스탬프와 태그째 다시 인용하는 경향이 있었다.
- `EXAONE Deep 2.4B`, `EXAONE 4 community`는 내부 추론 문장을 감추지 못했다.

### 2. 구조화형

- `Gemma 4 E2B`는 단계 정리가 가장 무난했다.
- `Gemma 4 E4B`, `Qwen 3 8B`는 정리는 가능하지만 설명이 길어졌다.
- `EXAONE 3.5 2.4B`는 구체적이지만 과잉 해석이 있었고, `Llama 3.2 3B`는 왜곡된 재료 표현이 섞였다.
- `Phi-4-mini 3.8B`는 단계 형식은 맞췄지만 영어로 전환되며 존재하지 않는 재료를 추가했다.
- `Mistral 7B`는 3단계 구조는 지켰지만 인사말과 감상 문장이 붙어 실무형 정리와는 거리가 있었다.

### 3. 없는 정보 거절형

- `Gemma 4 E4B`, `EXAONE 3.5 7.8B`, `Qwen 3 8B`는 비교적 좋은 편이었다.
- `Gemma 4 E2B`도 이번 확장 세트에서는 `2018년 여름`까지만 말하고 식당 이름이 없다고 정리했다.
- `Mistral 7B`는 없다고 말하긴 했지만 영어로 바뀌었고, 장소명을 잘못 읽었다.
- `Phi-4-mini 3.8B`는 거절 자체는 했지만 persona/policy 블록 전체를 노출했다.
- `EXAONE 3.5 2.4B`, `EXAONE 4 community`, `Llama 3.2 3B`는 날짜 추정이나 혼합 서술이 남았다.

### 4. 모순 처리형

- `Gemma 4 E2B`, `Gemma 4 E4B`, `Qwen 3 8B`는 `10시`와 `11시`를 모두 보여주며 엇갈린다고 말하는 방향이 좋았다.
- `EXAONE 3.5 2.4B`도 구조는 유지했지만, 설명이 길어졌다.
- `Phi-4-mini 3.8B`는 근거 목록을 그대로 노출한 뒤 10시 쪽으로 잘못 기울었다.
- `Mistral 7B`는 `10시` 기록을 제대로 병렬로 제시하지 않고 `10:50` 같은 추정을 만들어냈다.
- `EXAONE 4 community`, `Llama 3.2 3B`는 오히려 한쪽을 섣불리 합치거나 맥락을 왜곡했다.

### 5. 감정 절제 회고형

- `Gemma 4 E2B`와 `mother-warm`, `grandmother-storyteller` 페르소나 조합은 자연스러웠다.
- `EXAONE Deep 2.4B`는 여기서 가장 크게 무너졌다. reasoning과 시적 과장이 섞였다.
- `Qwen 3 8B`는 담백하지만 비교적 안전했다.
- `Phi-4-mini 3.8B`는 회고 문구 요청에서도 persona 블록과 confidence 문장을 숨기지 못했다.
- `Mistral 7B`는 영어 회고 문장으로 기울며, 감정 절제보다는 문학적인 표현이 늘었다.

## 페르소나 Markdown 적용 테스트

페르소나 테스트는 `Gemma 4 E2B` 하나를 기준으로 진행했다. 같은 질문에 대해 실제 말투와 구조가 달라지는지 본 결과는 아래와 같다.

| 페르소나 | 송년회 요약 응답 경향 | 회고 문구 응답 경향 | 적용 판단 |
| --- | --- | --- | --- |
| `father-calm` | 짧고 담백한 서술 | 감정 과장 없이 평이하게 정리 | 적용됨 |
| `mother-warm` | “바라셨습니다” 같은 완곡한 표현 | “참 좋았습니다”, “기억에 남네요” 같은 따뜻한 어조 | 적용됨 |
| `grandfather-mentor` | 덕담/이야기 식 서술 | 약간의 훈화형/회상형 문장 | 적용됨 |
| `daughter-analytical` | “확인된 사실”, “출처”를 붙이며 항목화 | 번호/구조 중심 정리 | 강하게 적용됨 |
| `grandmother-storyteller` | “이렇게 말씀하셨어요”, “하고요” | 회상형 말투와 장면화 | 강하게 적용됨 |
| `older-brother-direct` | 가장 짧고 단문 위주 | “~했다”, “기록한다” 식 직설형 | 강하게 적용됨 |

## 페르소나 적용 예시

### `daughter-analytical`

> 확인된 사실을 바탕으로 요약합니다.  
> **내용:** 아버지는 "건강하게 오래 봅시다"와 "사진만 남기지 말고 자주 만납시다"라고 말했습니다.  
> **출처:** 2026년 4월 10일 송년회 자리에서 발언된 내용입니다.

### `grandmother-storyteller`

> 아버지가 송년회 자리에서 이렇게 말씀하셨어요.  
> "건강하게 오래 봅시다. 사진만 남기지 말고 자주 만납시다." 하고요.

### `older-brother-direct`

> 아버지는 "건강하게 오래 봅시다"라고 말했습니다.  
> 사진만 남기지 말고 자주 만날 것을 당부했습니다.

## 중간 결론

- 이번 확장 질문 세트까지 포함해도 `Gemma 4 E2B`는 가장 안정적인 기본값이다.
- `Gemma 4 E4B`는 더 보수적인 상위선 비교군으로 의미가 있다.
- `EXAONE Deep 2.4B`는 기대와 달리 현재 프롬프트 구조에서 reasoning 노출이 너무 심했다.
- `Phi-4-mini 3.8B`는 속도는 나쁘지 않았지만, prompt/policy leakage가 커서 현재 템플릿과는 잘 맞지 않았다.
- `Mistral 7B`는 누수는 적었지만 한국어 응답 일관성과 근거 병렬 제시가 약했다.
- `EXAONE 3.5 7.8B`는 속도 쪽 8B급 후보, `Qwen 3 8B`는 품질 쪽 8B급 후보라는 기존 판단이 더 강화되었다.
- 새로 만든 페르소나들은 최소한 `Gemma 4 E2B` 기준으로는 실제 말투/구조 차이를 만들어냈다.

## 결과 파일

- 확장 실측 JSON:
  - [model_runtime_expanded_results_2026-05-19.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_expanded_results_2026-05-19.json)
- 확장 실험 스크립트:
  - [compare_local_models_expanded_2026-05-19.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/compare_local_models_expanded_2026-05-19.py)
- Phi-4-mini 단독 결과:
  - [phi4_mini_runtime_results_2026-05-19.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/phi4_mini_runtime_results_2026-05-19.json)
- Mistral 7B 단독 결과:
  - [mistral_7b_runtime_results_2026-05-19.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/mistral_7b_runtime_results_2026-05-19.json)
- EXAONE 4 community 단독 결과:
  - [exaone4_1p2b_runtime_results_2026-05-14.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/exaone4_1p2b_runtime_results_2026-05-14.json)
