# Ambient Legacy Backend API Spec Draft

## 공통 원칙

- 응답 포맷은 JSON
- 인증은 초기에는 Google 로그인 후 발급한 사용자 식별값 기준으로 처리
- 이후 JWT 또는 세션 토큰 방식으로 확장

## 1. Auth

### POST `/auth/google`

- 목적: Google 로그인 후 사용자 정보를 서버에 동기화
- 요청 예시

```json
{
  "google_sub": "1234567890",
  "email": "user@example.com",
  "name": "홍길동",
  "profile_image": "https://example.com/profile.jpg"
}
```

- 응답 예시

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "name": "홍길동"
}
```

## 2. Family

### POST `/families`

- 목적: 가족방 생성

```json
{
  "owner_user_id": "uuid",
  "name": "성빈이네 가족방"
}
```

### POST `/families/join`

- 목적: 초대 코드로 가족방 입장

```json
{
  "user_id": "uuid",
  "invite_code": "A1B2C3"
}
```

### GET `/families/{room_id}`

- 목적: 가족방 상세 조회

### GET `/families/{room_id}/members`

- 목적: 가족방 멤버 목록 조회

## 3. Upload

### POST `/uploads`

- 목적: 업로드 메타데이터 등록

```json
{
  "room_id": "uuid",
  "uploader_user_id": "uuid",
  "type": "image",
  "title": "제주도 가족여행 사진",
  "description": "2018년 여름"
}
```

### POST `/uploads/{upload_id}/file`

- 목적: 파일 업로드 연결 정보 저장 또는 업로드 URL 발급

```json
{
  "storage_bucket": "ambient-legacy",
  "storage_path": "rooms/room-id/uploads/file.jpg",
  "mime_type": "image/jpeg",
  "file_size": 123456,
  "encrypted": true
}
```

### GET `/uploads/{room_id}`

- 목적: 가족방 기준 업로드 목록 조회

### GET `/uploads/detail/{upload_id}`

- 목적: 단일 업로드 상세 조회

## 4. 이후 확장 API

### POST `/pipeline/stt`

- 목적: Whisper 기반 STT 처리

### POST `/pipeline/ocr`

- 목적: OCR 처리

### POST `/pipeline/tagging`

- 목적: EXAONE 또는 경량 모델 기반 태깅 및 요약

### POST `/chat/query`

- 목적: RAG + EXAONE 기반 질의응답

## 구현 우선순위

1. `/auth/google`
2. `/families`
3. `/families/join`
4. `/families/{room_id}`
5. `/families/{room_id}/members`
6. `/uploads`
7. `/uploads/{room_id}`

