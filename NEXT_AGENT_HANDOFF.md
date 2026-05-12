# Next Agent Handoff

## 프로젝트 목적

Ambient Legacy는 가족의 음성, 텍스트, 이미지, 영상을 디지털 유산으로 저장하고,  
향후 검색/RAG/페르소나 기반 질의응답으로 확장하려는 모바일 앱 + FastAPI 백엔드 프로젝트다.

현재는 `목요일 데모 시현`을 우선 목표로 하여,  
`모델 선택 + 페르소나 선택 + 가족 기록 기반 AI 데모 응답` 흐름을 끊기지 않게 만드는 방향으로 구현이 진행되었다.

## 현재 구현 상태

### 앱

파일:

- [app/App.js](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/app/App.js)

완료:

- 로그인 / 데모 로그인
- 가족방 생성 및 입장
- 텍스트/이미지/영상 업로드 메타데이터 저장
- 저장소 탭에서 업로드 목록 조회
- `Chat` 탭에서 모델 선택 UI
- `Chat` 탭에서 페르소나 선택 UI
- `Chat` 탭에서 추천 질문 선택
- `Chat` 탭에서 `데모 데이터 준비` 버튼
- `Chat` 탭에서 `/api/v1/ai/chat-demo` 호출
- 백엔드에서 내려온 provider 상태 / evidence 표시
- `/api/v1/ai/models`, `/api/v1/ai/personas` 기반 동적 옵션 로딩

### 백엔드

중요 파일:

- [backend/app/api/routes/ai.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/api/routes/ai.py)
- [backend/app/ai/demo_service.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/demo_service.py)
- [backend/app/ai/model_registry.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/model_registry.py)
- [backend/app/ai/provider_factory.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/provider_factory.py)
- [backend/app/ai/providers](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/providers)

완료:

- `GET /api/v1/ai/models`
- `GET /api/v1/ai/personas`
- `GET /api/v1/ai/runtime-status`
- `POST /api/v1/ai/demo-bootstrap`
- `POST /api/v1/ai/chat-demo`
- persona markdown pack 로드
- room upload 기반 단순 retrieval
- prompt package 조립
- model_id 기준 provider adapter 선택
- Gemma / EXAONE / mock provider scaffold
- mock inference server 스크립트 제공

### 문서

- [backend/docs/thursday_demo_scope.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/thursday_demo_scope.md)
- [backend/docs/demo_runbook.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/demo_runbook.md)
- [backend/docs/provider_contracts.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/provider_contracts.md)
- [backend/docs/ondevice_hybrid_architecture.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/ondevice_hybrid_architecture.md)

## 데모 시연에 필요한 핵심 흐름

1. 로그인 또는 데모 로그인
2. `Chat` 탭 이동
3. `데모 데이터 준비` 클릭
4. 모델 선택
5. 페르소나 선택
6. 추천 질문 클릭
7. `전송`
8. 응답 / provider 상태 / evidence 확인
9. 필요 시 `Storage` 탭에서 샘플 기록 확인

## 가장 먼저 확인할 것

### 1. backend 실행

필요 문서:

- [backend/docs/demo_runbook.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/demo_runbook.md)

### 2. mock server 실행

파일:

- [backend/scripts/mock_model_server.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/scripts/mock_model_server.py)

### 3. `.env` 확인

파일:

- [backend/.env.example](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/.env.example)

확인할 값:

- `GEMMA_ENDPOINT_URL`
- `EXAONE_ENDPOINT_URL`
- `AI_PROVIDER_TIMEOUT_SECONDS`

## 아직 미완료인 부분

### 1. 실제 모델 런타임 연결

현재 provider adapter는 endpoint 계약만 정리된 상태다.  
실제 Gemma 또는 EXAONE 런타임과의 payload 세부 형식은 환경에 맞게 맞춰야 한다.

우선순위:

- `GemmaProvider.build_payload()`
- `ExaoneProvider.build_payload()`

### 2. OCR/STT 실데이터 연동

지금 retrieval evidence는 업로드 `title + description` 기반이다.  
향후에는 OCR/STT 결과를 별도 메타데이터로 저장하고, retrieval에 포함시켜야 한다.

### 3. 앱 분리 리팩터링

현재 `App.js` 단일 파일이 매우 크다.  
데모 직후에는 아래로 분리하는 것이 좋다.

- `screens/ChatScreen.js`
- `screens/HomeScreen.js`
- `hooks/useAIOptions.js`
- `services/api.js`

## 다음 작업 추천 순서

1. backend + mock server + app를 실제로 한 번 띄워 end-to-end 확인
2. `demo-bootstrap` 후 `Storage` 탭 데이터 반영 상태 확인
3. Gemma 또는 EXAONE 한쪽 실제 endpoint 연결
4. OCR/STT 메타데이터 저장 구조 추가
5. `App.js` 분리

## 주의사항

- 현재 환경에서는 `fastapi`가 셸에 설치되어 있지 않아, 이 작업 중 전체 서버 실행 검증은 완료되지 않았다.
- provider endpoint가 없으면 `provider_mode`는 `unconfigured` 또는 `mock`으로 떨어진다.
- 이 경우에도 데모 응답은 fallback answer로 유지되도록 설계되어 있다.

## 개인연구록 관련

연구록 초안 파일:

- [research_notes/personal_research_log_2026-04-29.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/personal_research_log_2026-04-29.md)

현재 구현 반영 사항:

- model registry
- persona markdown pack
- provider adapter 구조
- app의 모델/페르소나 선택 UI
- AI demo API 및 demo-bootstrap
