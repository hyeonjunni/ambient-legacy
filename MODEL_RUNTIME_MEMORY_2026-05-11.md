# MODEL RUNTIME MEMORY (2026-05-11)

## 현재 목표

- 가족 기록 기반 RAG형 질의응답에서 로컬 Ollama 모델 비교
- 기준 축:
  - 근거 보존
  - 없는 정보 거절
  - 한국어 문장 안정성
  - 응답 시간

## 현재 환경

- 맥북: Apple Silicon / 메모리 18GB
- Ollama 경로:
  - `.ollama-home`
  - `.ollama-models`
- 비교 스크립트:
  - [compare_local_models_2026-05-11.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/compare_local_models_2026-05-11.py)
- 결과 JSON:
  - [model_runtime_results_2026-05-11.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_results_2026-05-11.json)
- 비교 메모:
  - [model_runtime_comparison_2026-05-11.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_comparison_2026-05-11.md)

## 현재까지 설치/실행 상태

### 설치 완료

- `gemma4:e2b`
- `gemma4:e4b`
- `exaone3.5:2.4b`
- `exaone3.5:7.8b`
- `qwen3:0.6b`
- `qwen3:4b`
- `qwen3:8b`

## 실측 결과 핵심

### Gemma 4 E2B

- 강점:
  - 전체적으로 가장 균형이 좋음
  - 송년회 요약과 레시피 정리가 안정적
- 약점:
  - 여행 질문에서 timestamp를 실제 여행 날짜처럼 읽는 오류가 남음
- 현재 기본값으로 가장 적절

### Gemma 4 E4B

- 강점:
  - 같은 Gemma 계열 안에서 거절 응답이 더 보수적임
  - 여행 질문에서 `2018년 여름`과 `식당 이름 없음`을 또렷하게 분리함
- 약점:
  - E2B보다 응답 시간이 크게 길어짐
  - 설명 문장이 늘어나면서 상호작용 속도는 무거워짐
- 판단:
  - `같은 Gemma 계열의 상위 비교 후보`로는 의미가 있지만, 데모 기본값으로 바로 바꾸기엔 속도 비용이 큼

### EXAONE 3.5 2.4B

- 강점:
  - 한국어 문장 흐름은 자연스러움
  - 거절 질문에서는 비교적 보수적
- 약점:
  - 근거 바깥 설명을 덧붙이는 경향이 강함
  - 레시피 설명이 불어나기 쉬움

### EXAONE 3.5 7.8B

- 강점:
  - 2.4B보다 문장 안정성이 일부 개선됨
  - 8B급 후보 중 실제로 가장 먼저 볼 만한 모델
  - 송년회 요약 속도도 아주 망가지지 않음
- 약점:
  - 여전히 `tags=...` 같은 내부 흔적을 끌고 나옴
  - 거절 질문에서 persona/prompt 구조 일부가 섞여 나올 수 있음
- 판단:
  - `18GB 맥북에서 8B급으로 올려볼 1순위`

### Qwen 3 0.6B

- 강점:
  - 매우 빠름
- 약점:
  - 근거 해석 오류가 큼
  - 잘못된 날짜/식당 이름을 생성할 위험이 있음
  - 프롬프트 누수도 나타남
- 판단:
  - 실험용 비교군이지 기본값 후보는 아님

### Qwen 3 4B

- 강점:
  - 작은 Qwen보다 품질과 거절 안정성이 좋아짐
- 약점:
  - 너무 느림
  - 현재 Mac 로컬 기본값으로는 비현실적
- 판단:
  - “품질은 좋아지지만 속도 비용이 크다”는 확인용 모델

### Qwen 3 8B

- 강점:
  - Qwen 계열 중 가장 정돈된 결과
  - 없는 정보 거절이 비교적 안정적
  - prompt leakage가 거의 없음
- 약점:
  - 20~30초대로 여전히 느림
  - 레시피 질문에서 기록 바깥 조리 해석이 일부 추가됨
- 판단:
  - `품질 우선이면 8B급에서 가장 유력한 Qwen 후보`

## 현재 판단

- 데모 기본값:
  - `Gemma 4 E2B`
- 8B급 속도-품질 균형 후보:
  - `EXAONE 3.5 7.8B`
- 8B급 품질 우선 후보:
  - `Qwen 3 8B`
- 같은 계열 상위 비교 후보:
  - `Gemma 4 E4B`
- 나중에 꼭 봐야 할 것:
  - `Qwen 3 14B`

## 중요한 해석

- 작은 모델은 빠르지만 근거 해석 오류와 prompt leakage가 커지기 쉽다.
- 중간급 이상 모델은 품질이 좋아지지만 속도 비용이 급격히 커질 수 있다.
- 현재 구조에서는 “모델이 크다”보다 “retrieval evidence를 얼마나 절제해서 쓰는가”가 더 중요하다.

## 지금 남은 작업

1. 현재 비교표를 개인 연구 서술형 문장으로 다듬기
2. 필요하면 `Qwen 3 14B`까지 확장 실험
3. 모델별 `prompt leakage`와 `tag 노출`을 더 세밀하게 분류하기

## 사용자 의도 요약

- 18GB 맥북이면 8B 이상도 가능한지 확인하고 싶어함
- 단순 속도보다 실제 가족 기록 RAG 응답에 어떤 모델이 맞는지 보려는 목적
- 개인 연구에는 너무 직접적인 우열 표현보다 중립적 서술을 선호함
