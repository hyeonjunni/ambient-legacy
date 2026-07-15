# GCP Tagging Memory

## 1. 현재 상태
- `Cloud SQL` 연결 성공
- `GCS` 연결 성공
- `ADC`는 `gcloud auth application-default login`으로 구성됨
- `Ollama + Gemma` 경로 정상
- `RAG형 demo chat` 정상

## 2. 실제 확인된 것
- GCS 버킷: `ambient-legacy-hanshin-team01`
- 임시 PNG 업로드 후 삭제 스모크 테스트 성공
- 데모 이미지 파일 1개가 실제로 GCS에 저장됨
- 태그 저장/복원 round-trip 성공

## 3. 태그 저장 방식
- DB migration 없이 빠르게 적용하기 위해 `uploads.description`에 태그 메타 블록을 삽입
- 형식:
  - `[[tags:검증,태깅,gcp-demo]] 태그 round-trip 확인용`
- 서버가 응답 시 description과 tags를 다시 분리해 반환
- GCS object metadata에도 태그를 같이 넣음

## 4. 추가된 기능
- `POST /api/v1/system/health/gcp/storage-smoke-test`
  - 임시 이미지 업로드
  - 존재 확인
  - 즉시 삭제
- `POST /api/v1/ai/demo-bootstrap`
  - 태그 포함 demo records 생성
  - 이미지 1개는 실제 binary file까지 생성
  - `seeded_files` 반환
- 업로드 API
  - `tags` 입력 지원
- 앱 UI
  - 업로드 modal에서 태그 입력 가능
  - 저장소 카드에서 태그 chip 표시
  - Chat 탭에 `Cloud SQL / GCS / 태그 / Gemma` 파이프라인 카드 추가

## 5. 중요한 파일
- [uploads.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/api/routes/uploads.py)
- [system.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/api/routes/system.py)
- [ai.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/api/routes/ai.py)
- [demo_service.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/ai/demo_service.py)
- [upload.py](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/backend/app/schemas/upload.py)
- [App.js](/Users/hyeonjun/Documents/Codex/2026-04-28/files-mentioned-by-the-user-01/ambient-legacy/app/App.js)

## 6. 직접 검증 결과 요약
- smoke test:
  - `uploaded: true`
  - `deleted: true`
- demo bootstrap:
  - 기존 room 재사용
  - `seeded_files`는 이미지 파일이 새로 생길 때만 증가
- tag round-trip:
  - 입력 태그 `['검증', '태깅', 'gcp-demo']`
  - 응답 태그 그대로 복원

## 7. 남은 일
- 앱 APK 재빌드 후 실기기 확인
- 이미지 OCR 결과를 실제 태그/description에 자동 반영
- 영상 OCR/STT 파이프라인 추가
- description 메타블록 방식 대신 정식 `upload_tags` 테이블로 migration 검토
