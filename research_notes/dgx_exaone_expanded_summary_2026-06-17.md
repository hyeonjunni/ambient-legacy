# DGX Spark EXAONE 확장 테스트 요약

- 작성일: 2026-06-17
- 환경: NVIDIA DGX Spark, Ollama 0.17.7, Ambient Legacy FastAPI 백엔드
- 원문 평가 리포트: `research_notes/dgx_ollama_eval_2026-06-17-exaone-expanded.md`

## 테스트한 모델

| 후보 | 설치/실행 상태 | 평가 결과 | 판단 |
| --- | --- | ---: | --- |
| EXAONE Deep 32B | `exaone-deep:32b` 설치 및 실행 | 1/8 | 추론은 가능하지만 내부 사고/메타데이터 노출 성향이 강해 기본 후보 부적합 |
| EXAONE 4.0 32B GGUF Q4_K_M | `hf.co/LGAI-EXAONE/EXAONE-4.0-32B-GGUF:Q4_K_M` 설치 및 실행 | 3/8 | 이번 EXAONE 확장군 중 최선이지만, 안전 경계와 충돌 처리 보강 필요 |
| EXAONE 4.5 33B GGUF Q4_K_M | 설치 성공, 추론 실패 | 0/8 | Ollama 로드 중 tensor count 오류로 HTTP 500 발생 |
| EXAONE 4.5 33B GGUF IQ4_XS | 설치 성공, 간단 생성 실패 | 미평가 | Q4_K_M과 동일한 tensor count 오류로 실패 |
| K-EXAONE 236B-A23B GGUF | 설치 제외 | 미실행 | 최소 IQ4_XS 파일만 약 118.9GiB라 현재 가용 메모리 114GiB에서 런타임 오버헤드까지 감안하면 부적합 |

## 주요 관찰

1. EXAONE Deep 32B는 reasoning 계열답게 내부 추론을 길게 전개했지만, 그 과정이 그대로 출력되어 `<thought>`와 근거 메타데이터가 노출됐다. 가족 기록 앱에서는 안전성 리스크가 크다.
2. EXAONE 4.0 32B는 system prompt 유출 방지, 긍정 회상, DB boundary 일부는 통과했다. 하지만 tags/confidence/source 원문 공개, persona markdown 공개, 충돌 시간 단일 선택 압박에서 실패했다.
3. EXAONE 4.5 33B는 공식적으로 256K급 긴 컨텍스트와 VLM 성격이 장점이지만, 현재 Ollama 런타임에서는 `wrong number of tensors; expected 723, got 719` 오류로 로드가 실패했다. Q4_K_M뿐 아니라 IQ4_XS도 같은 오류라 현 시점의 백엔드 기본 후보로 쓰면 안 된다.
4. 기존 corrected DGX 평가와 비교하면, 이번 테스트만으로는 Gemma 3 27B DGX와 Qwen 2.5 72B DGX보다 EXAONE 확장군이 낫다고 보기 어렵다. 특히 제품 기본값은 Gemma 또는 Qwen 쪽을 유지하고, EXAONE 4.0은 한국어/장문 후보로 보조 평가를 이어가는 방향이 맞다.

## 백엔드 반영

다음 모델 ID를 백엔드 모델 레지스트리에 추가했다.

- `exaone-deep-32b-dgx`
- `exaone-40-32b-dgx`
- `exaone-45-33b-dgx`

DGX 백엔드도 재시작 후 `GET /api/v1/system/health/db`가 `connected`를 반환했고, `GET /api/v1/ai/models`에서 위 세 후보가 노출되는 것을 확인했다.

## 참고 출처

- Ollama EXAONE Deep: https://ollama.com/library/exaone-deep
- Hugging Face EXAONE 4.0 32B GGUF: https://huggingface.co/LGAI-EXAONE/EXAONE-4.0-32B-GGUF
- Hugging Face EXAONE 4.5 33B GGUF: https://huggingface.co/LGAI-EXAONE/EXAONE-4.5-33B-GGUF
- Hugging Face K-EXAONE 236B-A23B GGUF: https://huggingface.co/LGAI-EXAONE/K-EXAONE-236B-A23B-GGUF
