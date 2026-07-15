# 최종 상위 3개 후보 반복 벤치마크 (2026-05-19)

## 벤치마크 조건

- 대상 모델: `Gemma 4 E2B`, `EXAONE 3.5 7.8B`, `Qwen 3 8B`
- persona: `father-calm`
- 질문군 5개에 대해 원문 1회 + 유사 질문 1회, 총 10회 실행
- 목적: 속도뿐 아니라 근거 보존, 거절 안정성, 모순 처리 일관성, 프롬프트 누수 여부를 함께 확인

## 수치 비교

| 모델 | 크기 | 평균 응답 시간 | 최소 | 최대 | 누수 수 | 영어 기울기 수 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Gemma 4 E2B | 7.2 GB | 10.3초 | 8.1초 | 14.0초 | 0/10 | 0/10 |
| EXAONE 3.5 7.8B | 4.8 GB | 7.5초 | 2.3초 | 12.4초 | 3/10 | 0/10 |
| Qwen 3 8B | 5.2 GB | 23.2초 | 12.5초 | 40.0초 | 0/10 | 0/10 |

## 모델별 판단

### Gemma 4 E2B

- 가장 안정적인 기본값이다.
- 원문과 유사 질문을 섞어도 한국어 응답 형식이 크게 흔들리지 않았다.
- 없는 정보 거절과 모순 병렬 제시에서 가장 무난했다.

### EXAONE 3.5 7.8B

- 상위 후보 중 속도는 가장 좋다.
- 다만 일부 질문에서 prompt discipline이 살짝 무너져 메타 구조가 비칠 때가 있다.
- 연구/데모용 2순위 또는 빠른 대안으로 적합하다.

### Qwen 3 8B

- 품질은 좋지만 여전히 가장 느리다.
- 불확실성 처리는 좋지만 상호작용형 데모 기본값으로 쓰기엔 반응 시간이 길다.
- 품질 우선 실험용 상위 후보로 유지할 만하다.

## 최종 추천

- 기본값 1순위: `Gemma 4 E2B`
- 빠른 상위 대안: `EXAONE 3.5 7.8B`
- 품질 우선 대안: `Qwen 3 8B`

즉, 지금까지 전체 실험을 종합하면 사용자가 말한 세 모델이 최종 3개 후보로 맞다. 다만 실제 기본 모델은 `Gemma 4 E2B`가 가장 적합하고, 나머지 둘은 서로 다른 장점 때문에 후보로 유지하는 구조가 가장 현실적이다.

## 왜 다른 모델이 아닌가

- `Gemma 4 E4B`
  - 응답 태도는 안정적이지만 `Qwen 3 8B`보다 결정적으로 낫다고 보기 어렵고, 속도 부담은 비슷하거나 더 컸다.
- `EXAONE 3.5 2.4B`
  - 빠르지만 기록 밖 세부를 덧붙이는 경향이 남아 있어 상위 3개 최종 후보로 두기엔 보수성이 부족했다.
- `EXAONE Deep 2.4B`
  - reasoning/policy 누수가 심해 현재 프롬프트 구조와 맞지 않았다.
- `Phi-4-mini 3.8B`
  - 속도는 괜찮았지만 `# Identity`, `Retrieved Evidence` 같은 블록을 그대로 노출했다.
- `Mistral 7B`
  - 영어 기울기와 근거 오독이 있어 한국어 가족기록 RAG에는 덜 적합했다.
- `Llama 3.2 3B`, `EXAONE 4 community`
  - 빠르지만 형식 왜곡과 누수 때문에 실서비스형 후보로 보기 어려웠다.

## 원시 응답 파일

- [gemma_4_e2b_full_responses_2026-05-19.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/gemma_4_e2b_full_responses_2026-05-19.md)
- [exaone_35_78b_full_responses_2026-05-19.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/exaone_35_78b_full_responses_2026-05-19.md)
- [qwen_3_8b_full_responses_2026-05-19.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/qwen_3_8b_full_responses_2026-05-19.md)
- [top3_candidate_benchmark_results_2026-05-19.json](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/top3_candidate_benchmark_results_2026-05-19.json)
