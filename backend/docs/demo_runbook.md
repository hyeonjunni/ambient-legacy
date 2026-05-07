# Demo Runbook

## 목적

Ambient Legacy의 `모델 선택 + 페르소나 선택 + AI chat demo API` 흐름을 로컬에서 가장 빠르게 확인하는 절차다.

## 1. 백엔드 환경변수 준비

`.env.example`를 참고해 `backend/.env`를 준비한다.

중요 값:

```env
GEMMA_ENDPOINT_URL=http://127.0.0.1:9001/generate
EXAONE_ENDPOINT_URL=http://127.0.0.1:9001/chat
AI_PROVIDER_TIMEOUT_SECONDS=30
```

## 2. Mock model server 실행

```bash
cd backend
python3 scripts/mock_model_server.py
```

이 서버는 아래 두 경로를 흉내 낸다.

- `POST /generate` : Gemma provider
- `POST /chat` : EXAONE provider

## 3. FastAPI backend 실행

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 4. AI 옵션 조회 확인

### 모델 목록

```bash
curl http://127.0.0.1:8000/api/v1/ai/models
```

### 페르소나 목록

```bash
curl http://127.0.0.1:8000/api/v1/ai/personas
```

### 런타임 상태

```bash
curl http://127.0.0.1:8000/api/v1/ai/runtime-status
```

## 5. Chat demo API 확인

그 전에 데모 데이터 생성:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ai/demo-bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID"
  }'
```

이후 `room_id`를 받아 아래 요청에 사용한다.

```bash
curl -X POST http://127.0.0.1:8000/api/v1/ai/chat-demo \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": "YOUR_ROOM_ID",
    "user_id": "YOUR_USER_ID",
    "model_id": "gemma-4-e2b-device",
    "persona_id": "father-calm",
    "query": "할아버지가 예전에 하셨던 조언을 요약해줘."
  }'
```

응답에서 확인할 필드:

- `answer`
- `provider_name`
- `provider_mode`
- `retrieved_evidence`
- `selected_model`

## 6. 앱 확인 포인트

`Chat` 탭에서 아래가 보이면 wiring이 된 상태다.

- 백엔드에서 내려온 모델 목록
- 백엔드에서 내려온 페르소나 목록
- Provider 상태
- 근거 evidence 목록

## 7. 다음 연결 단계

mock server 대신 실제 런타임을 붙일 때는 아래만 바꾸면 된다.

- `GEMMA_ENDPOINT_URL`
- `EXAONE_ENDPOINT_URL`

나머지 앱/백엔드 상위 구조는 유지한다.
