# Ambient Legacy Backend

이 디렉터리는 Ambient Digital Legacy 프로젝트의 1차 백엔드 설계와 FastAPI 스캐폴드를 담는다.

## 목표

- 모바일 앱이 붙을 실제 API 서버 뼈대 구성
- 사용자, 가족방, 업로드 메타데이터를 서버 기준으로 관리
- Google Cloud Storage 및 Google Cloud SQL 연동을 위한 구조 선행 정리
- 이후 Whisper, OCR, EXAONE, RAG 파이프라인을 붙일 허브 역할 준비

## 현재 포함 내용

- `docs/erd.md`: 1차 ERD 초안
- `docs/api_spec.md`: 1차 API 명세
- `app/`: FastAPI 백엔드 스캐폴드
- `requirements.txt`: 초기 의존성 목록
- `.env.example`: Cloud SQL 및 GCS 환경 변수 예시

## 우선 구현 순서

1. 데이터베이스 연결 설정
2. 사용자 로그인 동기화 API
3. 가족방 생성/입장 API
4. 업로드 메타데이터 저장 API
5. Google Cloud Storage 연동

## Cloud SQL 연결 방향

현재 백엔드는 Google Cloud SQL for PostgreSQL 연결을 기준으로 설계한다.

- 로컬 개발: Cloud SQL Python Connector 또는 로컬 PostgreSQL
- 배포 환경: Cloud Run + Cloud SQL for PostgreSQL
- 인증: Application Default Credentials 또는 서비스 계정

공식 문서:

- Cloud SQL Python Connector: https://cloud.google.com/sql/docs/postgres/connect-connectors
- Cloud Run에서 Cloud SQL 연결: https://cloud.google.com/sql/docs/postgres/connect-run
