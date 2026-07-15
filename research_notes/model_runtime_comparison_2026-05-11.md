# 로컬 Ollama 모델 비교 정리 (2026-05-11)

## 목적

- 가족 기록 기반 RAG형 질의응답에서 `Gemma 4`, `EXAONE 3.5`, `Qwen 3` 계열의 응답 경향을 비교한다.
- 단순 응답 생성 여부보다 다음 항목을 함께 본다.
  - 기록 근거 보존
  - 없는 정보에 대한 거절 안정성
  - 한국어 문장 흐름
  - 로컬 상호작용 시간

## 실험 조건

- 실행 환경: Apple Silicon 맥북, 메모리 18GB
- 런타임: Ollama 로컬 실행
- 페르소나: `father-calm` Markdown 페르소나
- retrieval 입력: 가족 기록 더미데이터 2건씩
- 비교 질문:
  - 송년회 발화 2문장 요약
  - 김치찌개 메모 3단계 정리
  - 기록에 없는 부산 여행 정확한 날짜/식당 이름 거절

## 최종 비교표

| 모델 | 로컬 크기 | 송년회 요약 | 레시피 정리 | 없는 정보 거절 | 관찰된 경향 |
| --- | ---: | ---: | ---: | ---: | --- |
| Gemma 4 E2B | 7.2 GB | 13.1초 | 13.9초 | 10.4초 | 세 질문 모두 답변 가능. 요약과 레시피 정리는 안정적이었고, 여행 질문에서는 기록 timestamp를 실제 사건 날짜처럼 읽는 경향이 1회 관찰됨. |
| Gemma 4 E4B | 9.6 GB | 30.7초 | 27.7초 | 29.2초 | 같은 Gemma 계열 안에서 더 보수적이고 설명적인 답변을 보였고, 여행 질문에서는 `2018년 여름`과 `식당 이름 없음`을 분리해 답했다. 다만 응답 시간이 E2B보다 크게 늘었다. |
| EXAONE 3.5 2.4B | 1.6 GB | 3.0초 | 8.7초 | 3.3초 | 한국어 표현은 자연스러웠지만, 송년회와 레시피 설명에서 기록 바깥 의미를 덧붙이는 경향이 관찰됨. |
| EXAONE 3.5 7.8B | 4.8 GB | 7.5초 | 14.3초 | 11.8초 | 2.4B보다 구조는 다소 안정됐지만 `tags=...`나 persona 흔적이 일부 노출되고, 추가 해석 문장이 남음. |
| EXAONE 4.0 1.2B (community Ollama) | 812 MB | 46.5초 | 2.1초 | 2.8초 | 커뮤니티 Ollama 업로드본 기준. 세 질문 모두 `</think>`나 policy 문장 누수가 있었고, 레시피 응답은 사실상 질문을 제대로 수행하지 못했다. |
| Qwen 3 0.6B | 522 MB | 3.4초 | 5.7초 | 4.2초 | 응답은 빠르지만 프롬프트 누수와 사실 왜곡 가능성이 컸고, 여행 질문에서는 날짜/장소 해석 오류가 관찰됨. |
| Qwen 3 4B | 2.5 GB | 72.6초 | 84.7초 | 21.9초 | 거절 응답은 비교적 보수적이었으나 상호작용 시간이 길어 실시간 데모 기준으로는 부담이 큼. |
| Qwen 3 8B | 5.2 GB | 29.1초 | 31.2초 | 22.5초 | Qwen 계열 중에서는 가장 정돈된 축이었고 거절 응답도 안정적이었으나, 레시피 설명에서 약간의 해석 추가와 시간 부담이 남음. |

## 질문별 메모

### 1. 송년회 발화 요약

- `Gemma 4 E2B`는 원문 발화를 짧게 보존하는 경향이 강했다.
- `Gemma 4 E4B`는 발화 인용 뒤에 해석 문장을 덧붙였지만, 답변 구조는 비교적 안정적이었다.
- `EXAONE 3.5 2.4B`와 `7.8B`는 문장을 부드럽게 확장하지만, 발화에 대한 해석을 덧붙이는 경향이 있었다.
- `EXAONE 4.0 1.2B`는 오히려 `Reasoning:`과 `</think>`를 그대로 노출해, 현재 프롬프트 구조와의 궁합이 좋지 않았다.
- `Qwen 3 0.6B`는 작은 모델 특성상 표현 일관성이 흔들렸고, `Qwen 3 8B`는 비교적 정돈된 답변을 보였다.

### 2. 김치찌개 메모 3단계 정리

- `Gemma 4 E2B`와 `Qwen 3 4B`는 단계 정리가 비교적 명확했다.
- `Gemma 4 E4B`도 단계 정리는 안정적이었지만, 서두와 마무리 설명이 길어져 실제 상호작용 시간은 더 길었다.
- `EXAONE 3.5 2.4B`, `EXAONE 3.5 7.8B`, `Qwen 3 8B`는 단계화 자체는 가능했지만 기록에 없는 조리 팁이나 확장 해석이 섞이는 경우가 있었다.
- `EXAONE 4.0 1.2B`는 레시피 질문에서 단계 정리 대신 메타 지시문과 추측성 설명을 먼저 내보내, 실사용형 답변으로 보기 어려웠다.
- `Qwen 3 0.6B`는 속도는 빨랐지만 prompt package 흔적과 부정확한 정리가 나타났다.

### 3. 기록에 없는 부산 여행 세부정보 거절

- `Qwen 3 4B`, `Qwen 3 8B`는 `2018년 여름`만 확인 가능하고 정확한 날짜/식당 이름은 없다고 비교적 선명하게 구분했다.
- `Gemma 4 E4B`도 같은 질문에서 `2018년 여름`과 `식당 이름 없음`을 분리해 답했으며, E2B보다 사건 시점 해석은 안정적이었다.
- `EXAONE 3.5 2.4B`도 거절 방향은 유지했지만 일부 문장에서 해석적 표현이 남았다.
- `EXAONE 4.0 1.2B`는 거절 자체보다 persona/policy 블록을 거의 그대로 노출하는 경향이 커서, 답변 절제가 가장 약했다.
- `Gemma 4 E2B`는 기록의 사건 시점과 기록 생성 시점을 혼동하는 사례가 있었다.
- `Qwen 3 0.6B`는 가장 불안정했고, 내부 프롬프트 구조를 노출하기도 했다.

## 18GB 맥북 기준 관찰 포인트

- 8B급도 로컬 실행 자체는 가능했다.
- 다만 8B급 안에서도 차이가 있었다.
  - `EXAONE 3.5 7.8B`는 속도 측면에서 상대적으로 덜 무거웠다.
  - `Qwen 3 8B`는 응답 통제가 더 정돈된 편이었지만 대기 시간이 더 길었다.
- 따라서 같은 8B급이라도 `속도`, `거절 안정성`, `prompt leakage 억제`를 별도로 봐야 한다.

## 현재까지의 중간 해석

- `Gemma 4 E2B`는 응답 시간과 근거 보존 사이에서 비교적 균형적인 모습을 보였다.
- `Gemma 4 E4B`는 같은 계열 안에서 더 보수적인 거절과 설명 구조를 보였지만, 로컬 상호작용 시간은 한 단계 더 무거워졌다.
- `EXAONE 3.5 7.8B`는 8B급 확장 후보로서 속도 측면의 가능성을 보여주었다.
- `EXAONE 4.0 1.2B`는 모델 크기는 매우 작지만, 현재 커뮤니티 Ollama 빌드 기준으로는 prompt leakage와 지시문 노출이 커서 실서비스형 비교 후보로 보기 어렵다.
- `Qwen 3 8B`는 8B급 비교군 중 거절 안정성과 구조 정돈 측면에서 참고할 만한 결과를 보였다.
- 따라서 같은 계열 내부 비교에서는 `Gemma 4 E2B -> Gemma 4 E4B` 확장선 자체도 별도의 의미가 있다.

## 재현 파일

- 비교 스크립트:
  - [compare_local_models_2026-05-11.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/compare_local_models_2026-05-11.py)
- 메인 결과 JSON:
  - [model_runtime_results_2026-05-11.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_results_2026-05-11.json)
- Gemma 4 E4B 단독 결과:
  - [gemma4_e4b_runtime_results_2026-05-11.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/gemma4_e4b_runtime_results_2026-05-11.json)
- Qwen 8B 단독 결과:
  - [qwen3_8b_runtime_results_2026-05-11.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/qwen3_8b_runtime_results_2026-05-11.json)
- EXAONE 4.0 1.2B 단독 결과:
  - [exaone4_1p2b_runtime_results_2026-05-14.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/exaone4_1p2b_runtime_results_2026-05-14.json)

## 출처

- [Ollama Gemma 4 Library](https://www.ollama.com/library/gemma4)
- [Ollama EXAONE 3.5 Library](https://ollama.com/library/exaone3.5)
- [Ollama Qwen 3 Library](https://ollama.com/library/qwen3)
