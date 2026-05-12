# Mac Gemma Setup And GCP Plan

## 결론

목요일 데모 전까지 실제 Gemma를 붙이려면, 가장 현실적인 경로는 아래다.

```text
Galaxy app
-> FastAPI backend on MacBook
-> Gemma runtime endpoint on MacBook
```

즉, 갤럭시 앱 안에 온디바이스 Gemma를 바로 넣는 것보다  
`맥북이 모델 서버 역할을 먼저 맡는 구조`가 더 빠르고 안정적이다.

## 왜 이 경로가 좋은가

- 현재 앱은 이미 backend 호출 구조가 있음
- backend에는 provider adapter 구조가 이미 들어가 있음
- `Ollama` 또는 `GEMMA_ENDPOINT_URL`만 실제 endpoint로 연결하면 됨
- 목요일 전에는 Android 앱 내부 LiteRT-LM 통합보다 리스크가 낮음

## 지금 당신이 해야 할 일

### 1. 팀 내 역할 확정

최소 역할 분담:

- 원본 프로젝트 형: end-to-end 실행 확인
- 당신: 맥북 모델 서버 준비, GCP 프로젝트/계정 정리
- 나: endpoint adapter 맞춤, 코드 수정, 문서 정리

### 2. 맥북에서 어떤 방식으로 Gemma를 띄울지 결정

현실적인 선택지는 두 가지다.

#### A. 데모 안정성 우선

- 목요일은 `mock server`로 시연
- Gemma 실연결은 그 다음

#### B. 실연결 우선

- Gemma 서버를 맥북에서 띄움
- backend가 해당 endpoint 호출

목요일 전 추천은:

1. `mock server`로 end-to-end 먼저 성공
2. 시간이 되면 Gemma 실연결 추가

### 3. 팀용 GCP 구조 결정

중요:

- `개인 Google 계정 하나를 팀이 같이 공유`하는 방식은 비추천
- `팀용 GCP 프로젝트 + 필요한 서비스 계정` 구조가 맞음

권장 구조:

- 개인 Google 계정으로 Google Cloud 로그인
- 팀 공용 `Project` 생성
- Billing 연결
- 서비스 계정 생성
- 앱/백엔드에서는 서비스 계정 사용

즉, "팀용 GCP 계정"보다는 사실상 `팀용 GCP 프로젝트`가 핵심이다.

## 내가 할 수 있는 일

- Gemma / EXAONE provider adapter 구조 유지 및 수정
- 실제 endpoint payload 형식에 맞춰 backend adapter 수정
- `.env` 구조 유지
- 실행 문서와 handoff 문서 보강
- 실행 중 에러 로그 기반 패치

## 당신이 해야 하는 일

### A. 맥북 로컬

1. Python / backend 실행 환경 준비
2. mock server 먼저 실행
3. backend 실행
4. 가능하면 Ollama 설치
5. `gemma4:e2b` 다운로드
6. endpoint URL 확보

### B. 팀 / GCP

1. GCP billing 가능한 주 계정 정하기
2. 팀용 프로젝트 생성
3. 필요한 API/권한 정리
4. 서비스 계정 생성
5. credentials 배포 방식 정하기

## 원본 프로젝트 형이 해야 하는 일

- 갤럭시 앱 실제 빌드/실행
- 앱의 `API_BASE_URL` 또는 서버 주소를 맥북 IP로 맞춤
- 로그인 -> 데모 데이터 준비 -> 질문 전송까지 확인
- 에러 로그/스크린샷 전달

## 맥북에서 해야 할 최소 실행 순서

### 1. backend 환경변수 준비

참고 파일:

- [backend/.env.example](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/.env.example)

최소값:

```env
USE_GCS_MEDIA_STORAGE=false
GEMMA_ENDPOINT_URL=http://127.0.0.1:9001/generate
EXAONE_ENDPOINT_URL=http://127.0.0.1:9001/chat
OLLAMA_BASE_URL=http://127.0.0.1:11434
PREFER_OLLAMA_FOR_GEMMA=true
OLLAMA_GEMMA_E2B_MODEL_NAME=gemma4:e2b
OLLAMA_GEMMA_E4B_MODEL_NAME=gemma4:e4b
AI_PROVIDER_TIMEOUT_SECONDS=30
```

### 2. mock model server 실행

```bash
cd backend
python3 scripts/mock_model_server.py
```

### 3. backend 실행

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. 런타임 상태 확인

```bash
curl http://127.0.0.1:8000/api/v1/ai/runtime-status
```

### 5. 갤럭시 앱에서 맥북 IP 설정

예:

- `http://192.168.x.x:8000/api/v1`

### 6. 앱 시연

1. 로그인
2. Chat 탭 이동
3. `데모 데이터 준비`
4. 모델 선택
5. 페르소나 선택
6. 추천 질문 선택
7. 전송

## Ollama + Gemma 실연결 권장안

목요일 시연 전 권장 모델:

- `gemma4:e2b`

다운로드가 너무 오래 걸리면 대체안:

- `gemma3:1b`

이 경우 `.env`에서 아래만 바꾸면 된다.

```env
OLLAMA_GEMMA_E2B_MODEL_NAME=gemma3:1b
```

실행 구조:

```text
Galaxy app
-> FastAPI backend
-> Ollama /api/chat
-> gemma4:e2b
```

## Gemma 실제 연결 전제의 최소 추가 작업

현재 backend adapter는 다음 계약을 기대한다.

### Gemma provider request

```json
{
  "model_id": "gemma-4-e2b-device",
  "input": "instructions + persona markdown + retrieved evidence + user query"
}
```

### Gemma provider response

```json
{
  "output_text": "생성된 응답"
}
```

즉, 실제 Gemma 서버를 붙이려면 아래 둘 중 하나면 된다.

- 위 계약을 맞춰주는 로컬 API 서버 작성
- 기존 Gemma 실행기를 감싸는 lightweight wrapper API 작성

## GCP는 어디까지 지금 필요한가

목요일 데모만 놓고 보면 `필수는 아님`.

당장 필요한 건:

- 로컬 backend
- 로컬 model server
- 갤럭시 실기기 연결

GCP는 아래 용도로 준비하면 된다.

- 이후 Cloud SQL
- GCS
- 팀 공용 배포 환경
- 서비스 계정 인증

## 팀용 GCP 추천 구조

### 최소 권장안

- 팀 리더 개인 Google 계정으로 GCP 시작
- 팀 공용 프로젝트 1개 생성
- Billing account 연결
- 서비스 계정 1개 생성
- 필요한 팀원에게 IAM 역할 부여

### 권장 리소스

- Project: `ambient-legacy-dev`
- Service Account: `ambient-backend`
- Storage bucket: `ambient-legacy-media-dev`

### 초기 IAM 예시

- Project Owner: 1명만
- Editor 또는 필요한 최소 역할: 개발 팀원
- Service Account User: backend 담당자

## 중요한 오해 정리

### “팀용 GCP 계정 하나 만들면 되지 않나?”

가능은 하지만 권장하지 않는다.

더 좋은 방식:

- 팀원이 각자 Google 계정 사용
- 같은 GCP 프로젝트에 초대
- 서비스 계정은 애플리케이션용으로 따로 사용

## 지금 바로 실행할 우선순위

1. 원본 프로젝트 형에게 end-to-end 실행 부탁
2. 당신은 맥북에서 mock server + backend 먼저 실행
3. 그게 되면 Gemma 실제 endpoint 붙일지 결정
4. 동시에 GCP 팀 프로젝트 생성 여부 확정
