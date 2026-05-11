# Demo Runtime Handoff (2026-05-11)

## 현재 실제로 되는 것

- 앱 -> 백엔드 -> Cloud SQL -> GCS -> Ollama(Gemma) 경로가 실제로 연결됨
- `POST /api/v1/auth/demo`로 데모 로그인 가능
- `POST /api/v1/ai/demo-bootstrap`로 목요일 데모 가족방, 샘플 기록, 샘플 이미지 파일 생성 가능
- `POST /api/v1/ai/chat-demo`가 업로드 기록을 근거로 Gemma 응답 반환
- 업로드 `tags`가 저장/조회되고 retrieval 근거에도 반영됨
- `POST /api/v1/system/health/gcp/storage-smoke-test`로 GCS 업로드/삭제 검증 가능

## 현재 구조

- 메타데이터 저장: Cloud SQL(PostgreSQL)
- 이미지 파일 저장: GCS 버킷 `ambient-legacy-hanshin-team01`
- 추론 엔진: Ollama + Gemma
- 앱 UI:
  - 모델 선택
  - 페르소나 선택
  - 데모 데이터 준비
  - 태그 입력/표시
  - 현재 데모 파이프라인 표시

## 검증 완료 내용

- Cloud SQL 연결 확인
- GCS client 초기화 확인
- GCS 임시 PNG 업로드 후 삭제 확인
- 데모 이미지 파일이 실제 GCS object로 생성되는 것 확인
- 태그 round-trip 확인
- `demo-bootstrap -> chat-demo` 응답 확인

## 중요한 구현 포인트

- 태그는 별도 migration 없이 `description`에 메타 블록으로 저장
- retrieval 점수 계산 시 태그도 검색 단서로 사용
- 데모 이미지 1장은 `demo-bootstrap` 시 실제 파일로 GCS에 올라감
- 앱 로그인 화면은 스크롤 가능하게 바꾸고 하단 여백을 늘려 작은 화면/하단 바 겹침을 완화함

## 주요 파일

- 앱 UI: `app/App.js`
- 업로드 API: `backend/app/api/routes/uploads.py`
- AI 데모 API: `backend/app/api/routes/ai.py`
- 시스템 헬스체크: `backend/app/api/routes/system.py`
- Retrieval 로직: `backend/app/ai/demo_service.py`
- DB 연결: `backend/app/core/database.py`
- 앱 종료 시 connector 정리: `backend/app/main.py`

## 실행/확인 명령

### Ollama

```bash
env HOME='/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/.ollama-home' \
OLLAMA_MODELS='/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/.ollama-models' \
/opt/homebrew/opt/ollama/bin/ollama serve
```

### Backend

```bash
cd "/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 상태 확인

```bash
curl http://127.0.0.1:8000/api/v1/system/health/db
curl http://127.0.0.1:8000/api/v1/system/health/gcp
curl http://127.0.0.1:8000/api/v1/system/health/ollama
curl -X POST http://127.0.0.1:8000/api/v1/system/health/gcp/storage-smoke-test
```

## 현재 주의사항

- Google 로그인은 Android OAuth 설정과 keystore SHA-1이 맞아야 함
- 실제 OCR 추출은 아직 미구현임
- 현재는 OCR/STT까지 완성된 RAG가 아니라, 업로드 기록/태그/설명 중심 retrieval + persona + Gemma 구조임

## 데모에서 솔직하게 말해야 하는 부분

- 이미지 OCR은 아직 실제 추출 단계까지는 붙지 않았음
- 다만 GCS 업로드, 태그, retrieval grounding, Gemma 응답까지는 실제 동작함
- 따라서 “가족 기록 기반 답변”은 실동작이고, “OCR 자동 추출”은 다음 단계임
