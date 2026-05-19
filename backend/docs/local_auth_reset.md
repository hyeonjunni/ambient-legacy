# Local Auth Reset Guide

Google 로그인 기반 테스트 데이터를 더 이상 사용하지 않을 때 참고하는 운영 메모입니다.

## 목적

- 기존 Google 기반 사용자 레코드를 신규 아이디/비밀번호 계정과 연결하지 않음
- 테스트 환경에서 기존 가족방/업로드 데이터를 완전히 비우고 새 로그인 구조로 다시 시작할 때 사용

## 권장 순서

1. 백엔드 서버를 중지합니다.
2. 데이터베이스에서 기존 테스트 데이터를 정리합니다.
3. 앱에서 `ambient.accessToken`, `ambient.currentUser`를 포함한 로컬 저장값을 삭제합니다.
4. 백엔드 서버를 다시 실행한 뒤 신규 회원가입으로 시작합니다.

## 참고 SQL 예시

아래 SQL은 개발/테스트 환경에서만 사용해야 합니다.

```sql
DELETE FROM upload_files;
DELETE FROM uploads;
DELETE FROM family_members;
DELETE FROM family_rooms;
DELETE FROM users;
```

Google 기반 사용자만 선택적으로 정리하려면, `username` 또는 `password_hash`가 비어 있는 레코드를 기준으로 별도 정리 절차를 작성하는 것이 안전합니다.

## 주의

- 운영 데이터에는 그대로 적용하면 안 됩니다.
- 이미지/영상이 로컬 저장소 또는 GCS에 남아 있을 수 있으므로, 필요하면 저장소 정리도 함께 수행해야 합니다.
