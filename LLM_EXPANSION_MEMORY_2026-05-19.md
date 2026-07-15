# LLM EXPANSION MEMORY (2026-05-19)

## 이번 요청

- EXAONE Deep와 그 외 로컬 LLM 후보를 추가로 검토하고 실제 적용해보기
- 모델별 수치 비교를 더 넓은 질문 세트로 다시 수행하기
- 페르소나 Markdown을 여러 개 더 만들고, 실제로 응답에 반영되는지 확인하기
- 테스트를 시작하기 전에 현재 대화 내용과 맥락을 별도 파일로 저장/압축하기

## 직전까지 완료된 상태

- 로컬 Ollama 비교는 이미 다음 모델까지 실측 완료:
  - `gemma4:e2b`
  - `gemma4:e4b`
  - `exaone3.5:2.4b`
  - `exaone3.5:7.8b`
  - `qwen3:0.6b`
  - `qwen3:4b`
  - `qwen3:8b`
  - `ingu627/exaone4.0:1.2b`
- 비교 기준 질문 3개:
  - 송년회 발화 요약
  - 김치찌개 메모 3단계 정리
  - 기록에 없는 부산 여행 날짜/식당 이름 거절
- 기존 페르소나:
  - `father-calm`
  - `grandfather-mentor`
  - `mother-warm`

## 직전까지의 관찰 요약

- `Gemma 4 E2B`는 시간과 근거 보존 균형이 좋아 데모 기본값으로 가장 무난했다.
- `Gemma 4 E4B`는 같은 Gemma 계열 안에서 더 보수적인 거절을 보였지만, 응답 시간이 크게 늘었다.
- `EXAONE 3.5 7.8B`는 8B급 후보 중 속도 쪽에서 비교적 현실적이었다.
- `Qwen 3 8B`는 더 정돈된 거절을 보였지만, 상호작용 시간은 더 길었다.
- `EXAONE 4.0 1.2B` 커뮤니티 Ollama 모델은 `</think>`와 policy 문장 노출이 커서 실서비스형 답변 후보로 보기 어려웠다.

## 이번 확장 테스트에서 꼭 볼 것

1. EXAONE Deep 계열이 현재 로컬 환경/Ollama 또는 대체 로컬 경로에서 실제로 적용 가능한가
2. 추가 후보 모델:
   - EXAONE Deep
   - Mistral 계열
   - Llama 계열
   - Phi 계열
   - 필요하면 Gemma/Qwen의 다른 경량 변형
3. 질문 세트 확장:
   - 감정 회고형
   - 관계 조언형
   - 모순/불충분 근거 거절형
   - 이미지/OCR 기록 활용형
4. 페르소나 반영 확인:
   - 같은 질문에 대해 말투/구조/거리감이 실제로 달라지는지
   - persona leakage가 생기는지

## 관련 파일

- 비교 스크립트:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/compare_local_models_2026-05-11.py`
- 기존 비교 메모:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_comparison_2026-05-11.md`
- 기존 결과 JSON:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_results_2026-05-11.json`
- 주차 연구록:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/personal_research_weekly_log_2026-05-12.md`

## 현재 작업 순서

1. 이 메모 저장 및 zip 생성
2. EXAONE Deep와 추가 로컬 LLM 후보 조사
3. 질문 세트 확장
4. 페르소나 md 추가
5. 모델별/페르소나별 실측
6. 최종 비교 문서와 연구 노트 갱신

## 2026-05-19 실측 완료 상태

- 추가 설치/확인 완료:
  - `exaone-deep:2.4b`
  - `llama3.2:3b`
- `phi4-mini:3.8b`
- `mistral:7b`
- 이미 설치돼 있던 모델과 합쳐 아래 10개를 확장 실측에 사용:
  - `gemma4:e2b`
  - `gemma4:e4b`
  - `exaone3.5:2.4b`
  - `exaone-deep:2.4b`
  - `exaone3.5:7.8b`
  - `ingu627/exaone4.0:1.2b`
  - `llama3.2:3b`
  - `phi4-mini:3.8b`
  - `mistral:7b`
  - `qwen3:8b`
- 질문 세트는 기존 3개에서 5개로 확장:
  - 송년회 요약
  - 레시피 3단계 정리
  - 기록에 없는 정보 거절
  - 일정 모순 처리
  - 감정 절제 회고 문구
- 새 페르소나 3개 추가:
  - `daughter-analytical`
  - `grandmother-storyteller`
  - `older-brother-direct`

## 현재 핵심 관찰

- `Gemma 4 E2B`는 확장 세트까지 포함해도 가장 균형적인 기본값이었다.
- `Gemma 4 E4B`는 더 보수적이지만 느렸다.
- `EXAONE Deep 2.4B`는 reasoning 누수가 매우 심했다.
- `EXAONE 3.5 7.8B`는 속도 쪽 8B급 후보로 여전히 의미가 있다.
- `Qwen 3 8B`는 품질 쪽 8B급 후보로 유지된다.
- `Llama 3.2 3B`는 빠르지만 한국어/형식 혼합 오류가 있었다.
- `Phi-4-mini 3.8B`는 속도는 괜찮았지만 `# Identity`, `Retrieved Evidence` 같은 프롬프트 블록 누수가 심했다.
- `Mistral 7B`는 누수는 적었지만 영어 답변 전환과 근거 오독이 있어 한국어 가족기록 RAG에는 덜 맞았다.
- 새 페르소나들은 `Gemma 4 E2B` 기준으로 실제 말투 차이를 분명하게 만들었다.

## 결과 파일

- 확장 실측 JSON:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_expanded_results_2026-05-19.json`
- 확장 비교 메모:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/model_runtime_expanded_comparison_2026-05-19.md`
- Phi-4-mini 단독 결과:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/phi4_mini_runtime_results_2026-05-19.json`
- Mistral 7B 단독 결과:
  - `/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/mistral_7b_runtime_results_2026-05-19.json`
