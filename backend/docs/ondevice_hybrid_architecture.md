# Ambient Legacy On-Device Hybrid Architecture

## 목표

Ambient Legacy를 `단일 서버 추론 구조`에서 `하이브리드 분산 추론 구조`로 확장하기 위한 1차 설계 문서다.

핵심 방향은 다음과 같다.

- 가족 공용 정본 데이터와 권한 체계는 백엔드/가족 금고 노드가 유지
- 개인별 추론 경험은 각 기기의 온디바이스 모델이 담당
- 모델은 고정하지 않고 교체 가능한 `model profile` 구조로 관리
- 페르소나는 프롬프트 문자열이 아니라 Markdown 자산으로 유지

## 왜 이 구조가 필요한가

기존 구조의 장점은 단순하다.

- 업로드
- 메타데이터 저장
- 권한 체크
- 클라우드 저장

하지만 유산 서비스 관점에서 다음 문제가 남는다.

- 한 모델에 종속되면 모델 교체 주기를 따라가기 어렵다
- 모든 응답을 서버 추론에 의존하면 데이터 주권 메시지가 약해진다
- 완전 온디바이스만으로 가면 기기 교체와 노후 리스크가 커진다

따라서 아래처럼 계층을 나누는 것이 적절하다.

## 권장 계층

### 1. Family Vault Layer

위치:

- FastAPI backend
- 향후 로컬 홈 서버 또는 맥미니/NAS 옆 노드

역할:

- 정본 원본 파일 저장
- OCR/STT/태깅 파이프라인
- 가족 공용 인덱스
- 권한 필터링
- 백업/복구 기준점

### 2. Personal Edge Layer

위치:

- Android 앱
- 향후 iOS 또는 데스크톱 클라이언트

역할:

- 사용자별 선택 모델 실행
- 최근 기록 기반 로컬 캐시 retrieval
- persona markdown 반영
- 오프라인/저지연 응답

### 3. Model Abstraction Layer

위치:

- backend/app/ai/
- 향후 app/ 쪽 runtime adapter

역할:

- 모델 프로필 선택
- 모델별 prompt adapter 분기
- persona pack 조합
- retrieval evidence 패키징

## 권장 모델 전략

### 공용 기본 모델

- 서버 또는 가족 금고 노드에는 메인 추론 모델을 둔다
- 이 모델은 정본 응답, 장문 검색, 가족 공용 회상 질의에 사용한다

예:

- EXAONE 계열
- 고성능 Gemma 계열

### 개인 선택 모델

- 각 사용자는 자신의 기기에서 사용할 모델을 선택할 수 있다
- 선택 모델은 `quality tier`, `device memory`, `offline support`, `modality support` 기준으로 노출한다

예:

- Gemma 4 E2B
- Gemma 4 E4B
- Gemma 3n E2B
- Gemma 3n E4B

### 핵심 원칙

모델은 교체 가능해야 하고, 서비스 자산은 모델에 종속되면 안 된다.

즉:

- 모델은 바뀌어도
- persona markdown
- memory chunk
- 권한 구조
- retrieval schema

는 유지되어야 한다.

## Persona 설계 원칙

각 인물에 대해 하나의 긴 프롬프트를 저장하지 않고, 아래처럼 나눈다.

- `identity.md`
- `voice.md`
- `timeline.md`
- `relationships.md`
- `memory_policy.md`

이 구조의 장점:

- 장기 수정 가능
- 사용자 검수 용이
- 모델 교체 시 재사용 가능
- 인물별 버전 관리 가능

## Retrieval 설계 원칙

RAG는 한 군데에서만 돌지 않는다.

### L1. Device Cache Retrieval

- 최근 본 기록
- 최근 대화
- 개인 즐겨찾기

### L2. Family Vault Retrieval

- 가족 공용 정본 인덱스
- OCR/STT 기반 근거 기록
- 권한 통과한 chunk만 반환

### L3. Cold Archive Restore

- 장기 백업에서 복원되는 스냅샷
- 기기 교체 시 재시드

## 현재 저장소에서 필요한 리팩터링

### backend

새 책임 추가:

- `app/ai/model_registry.py`
- `app/ai/persona_loader.py`
- `app/ai/prompt_builder.py`

기존 `app/integrations/exaone.py`는 고정 모델 연동 지점이 아니라,  
향후 `provider adapter` 중 하나로 내려가야 한다.

예:

- `app/ai/providers/exaone_provider.py`
- `app/ai/providers/gemma_provider.py`

### app

새 화면 또는 상태 추가:

- 모델 선택
- persona 선택
- 응답 출처 표시
- 오프라인 가능 여부 표시

예시 라벨:

- `이 기기에서 생성됨`
- `가족 금고 기반 응답`
- `복원된 기록 포함`

## 단계별 구현 제안

### 1단계

- 모델 비종속 prompt assembly 도입
- persona markdown 도입
- retrieval evidence 묶기

### 2단계

- Android에서 Gemma 온디바이스 런타임 실험
- 로컬 캐시 retrieval 추가

### 3단계

- Family Vault와 개인 기기 간 동기화
- 기기 교체 복구 흐름 설계

## 현재 판단

`개인 모델 선택 + 개인 페르소나 설정 + 공용 정본 RAG` 조합은 리스크가 큰 방향이 아니라,  
오히려 모델 교체가 빠른 지금 가장 안정적인 방향이다.
