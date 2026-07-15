# Thursday Demo Memory

## 1. 목표
- `ambient-legacy`를 목요일 데모 기준으로 `모델 선택 + 페르소나 선택 + 가족 기억 근거 기반 응답` 흐름까지 시연한다.
- 완전한 `폰 내부 온디바이스 추론`이 아니라, `갤럭시 앱 + 맥북 backend + 맥북 Gemma(Ollama)` 구조로 먼저 성공시킨다.

## 2. 절대 잊으면 안 되는 판단
- 이 프로젝트의 핵심은 `모델 하나`가 아니라 `가족 데이터 + 페르소나 + 기억 구조`다.
- 그래서 방향은 `단일 중앙 모델`보다 `하이브리드 분산 추론`이다.
- 현재 데모에서는:
  - `정본 데이터/권한/공용 retrieval`은 backend
  - `모델 선택/페르소나 선택`은 app
  - `실제 Gemma 추론`은 Mac의 Ollama
- 아직 `갤럭시 앱에서 모델 다운로드 후 직접 온디바이스 실행`은 구현되지 않았다.

## 3. 현재 구현 완료 범위

### App
- `Chat` 탭에 모델 선택 UI 추가
- 페르소나 선택 UI 추가
- 선택값 `AsyncStorage` 저장
- backend에서 `/ai/models`, `/ai/personas` 동적 로드
- `데모 데이터 준비` 버튼 추가
- 추천 질문 프리셋 추가
- `/ai/chat-demo` 실제 호출 연결
- 응답, evidence, provider 상태 표시

### Backend
- `GET /api/v1/ai/models`
- `GET /api/v1/ai/personas`
- `GET /api/v1/ai/runtime-status`
- `POST /api/v1/ai/demo-bootstrap`
- `POST /api/v1/ai/chat-demo`
- provider adapter 구조 추가:
  - `mock`
  - `gemma`
  - `exaone`
  - `ollama`
- persona markdown 로드
- retrieval evidence 조합
- prompt package 조립
- SQLite 로컬 데모 구동 지원

### Gemma 실행
- Mac에 `Ollama` 설치 완료
- `gemma4:e2b` 다운로드 완료
- Ollama 직접 API 호출로 한국어 응답 확인 완료
- backend에서 `Gemma -> Ollama` 경로 연결 완료

## 4. 핵심 파일

### App
- [App.js](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/app/App.js)

### Backend AI
- [ai.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/api/routes/ai.py)
- [ai.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/schemas/ai.py)
- [demo_service.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/demo_service.py)
- [model_registry.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/model_registry.py)
- [persona_loader.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/persona_loader.py)
- [prompt_builder.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/prompt_builder.py)
- [provider_factory.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/provider_factory.py)
- [ollama_provider.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/providers/ollama_provider.py)

### Config
- [.env](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/.env)
- [.env.example](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/.env.example)
- [config.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/core/config.py)
- [database.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/core/database.py)
- [main.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/main.py)

### 문서
- [NEXT_AGENT_HANDOFF.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/NEXT_AGENT_HANDOFF.md)
- [demo_runbook.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/demo_runbook.md)
- [thursday_demo_scope.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/thursday_demo_scope.md)
- [mac_gemma_setup_and_gcp_plan.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/mac_gemma_setup_and_gcp_plan.md)
- [provider_contracts.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/docs/provider_contracts.md)

### 연구록
- [personal_research_log_2026-04-29.md](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/research_notes/personal_research_log_2026-04-29.md)

## 5. Git 상태
- 작업 브랜치: `feature/thursday-demo-ai-flow`
- 로컬 커밋:
  - `e4f7a2d` `Add Thursday demo AI flow scaffolding`
  - `985763d` `Add Ollama-based Gemma runtime path`
- 사용자 fork 원격 push 완료

## 6. 지금 실제로 확인된 실행 상태

### Backend
- `uvicorn` startup 정상 확인됨
- `curl http://127.0.0.1:8000/api/v1/ai/runtime-status` 정상 응답 확인됨
- Mac IP 확인값: `10.60.3.18`
- 앱이 붙을 API 주소:
  - `http://10.60.3.18:8000/api/v1`

### Ollama
- 서버 정상
- `gemma4:e2b` 로컬 응답 확인 완료
- 현재 구조상 `gemma-4-e2b-device` 선택 시 Ollama Gemma 경로를 타게 설계됨

## 7. 현재 남은 가장 큰 막힘
- Android release APK 빌드 단계에서 `debug.keystore` 파일이 없어 실패 중
- 최신 핵심 에러:
  - `Execution failed for task ':app:validateSigningRelease'`
  - `debug.keystore not found for signing config 'debug'`

## 8. 지금 바로 해야 하는 명령

### 1) debug keystore 생성
```bash
cd "/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/app/android/app"
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

### 2) APK 다시 빌드
```bash
cd "/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/app/android"
./gradlew assembleRelease
```

### 3) backend 실행
```bash
cd "/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4) Ollama 실행
```bash
env HOME='/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/.ollama-home' OLLAMA_MODELS='/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/.ollama-models' /opt/homebrew/opt/ollama/bin/ollama serve
```

## 9. 목요일 데모 성공 조건
- 앱 설치 성공
- 로그인 가능
- `Chat` 탭 진입 가능
- `데모 데이터 준비` 동작
- 모델/페르소나 선택 가능
- 질문 전송 시 응답 도착
- evidence 보임
- `Gemma 실제 구동`이라고 설명 가능

## 10. 데모 때 솔직하게 말해야 하는 것
- 현재는 `완전 온디바이스 AI`가 아니라 `하이브리드 분산 추론` 데모다
- 앱 내부에서 모델 파일을 직접 다운받아 실행하는 단계는 아직 아니다
- 하지만 `모델 선택`, `페르소나 분리`, `retrieval`, `Gemma 실추론 경로`는 이미 분리 설계돼 있어 이후 확장이 가능하다

## 11. 다음 우선순위
1. `debug.keystore` 생성 후 APK 빌드 성공
2. 갤럭시 실기기 설치
3. 앱에서 Mac backend 주소 입력
4. end-to-end 시연 확인
5. 여유가 있으면 OCR 결과를 retrieval evidence에 연결
