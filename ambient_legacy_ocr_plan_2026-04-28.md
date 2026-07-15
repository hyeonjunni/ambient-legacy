# Ambient Legacy 이번 주차 OCR 구현 문서

## 1. 문서 목적

이 문서는 디지털 유산 서비스 프로토타입 `ambient-legacy`에서 이번 주차에 우선 구현할 `사진 OCR`과 `영상 OCR`의 범위, 처리 흐름, 저장 구조, 테스트 기준을 정리한 실행 문서다.  
추가로 `google-ai-edge/gallery`를 검토하여 우리 앱에 바로 가져올 수 있는 부분과 참고만 해야 하는 부분을 구분한다.

## 2. 현재 프로젝트 맥락 요약

연구록과 저장소 내용을 기준으로 보면 현재 프로젝트 방향은 아래와 같다.

- 핵심 서비스: 가족의 음성, 텍스트, 이미지, 영상을 디지털 유산으로 저장하고 검색 가능하게 만드는 서비스
- 현재 기술 방향: 모바일 앱 + FastAPI 백엔드 + 클라우드 저장소 + 로컬/경량 LLM 기반 검색형 응답
- 이번 단계 목표: 고도화된 페르소나 재현보다 `기록 저장`, `메타데이터 추출`, `검색/RAG 연결`을 먼저 안정화
- 이번 주 OCR의 역할: 이미지/영상 안의 텍스트를 추출해 사람이 직접 적지 않은 정보도 검색 대상으로 바꾸는 것

`ambient-legacy` 저장소의 백엔드 README에는 FastAPI 서버가 이후 `Whisper`, `OCR`, `EXAONE`, `RAG`를 붙일 허브 역할을 하도록 설계되어 있다고 적혀 있다.  
즉, 이번 주 OCR 작업은 현재 프로젝트 방향과 잘 맞는다.

## 3. 이번 주차 구현 목표

이번 주에는 아래 4가지를 달성하면 충분하다.

1. 이미지 업로드 시 OCR 수행
2. 영상 업로드 시 일정 간격으로 프레임을 추출해 OCR 수행
3. OCR 결과를 원본과 분리된 메타데이터로 저장
4. 추출 텍스트를 이후 검색/RAG에서 사용할 수 있는 형태로 정리

이번 주에는 아래까지는 욕심내지 않는 것이 좋다.

- 문서 레이아웃 분석
- 자막 추적 고도화
- OCR 후 자연어 요약 고도화
- 영상 전 구간 실시간 OCR
- 고정밀 멀티모달 추론 통합

## 4. 권장 기술 선택

### 4.1 1차 권장안

- 이미지 OCR: `EasyOCR`
- 영상 프레임 추출: `OpenCV`
- 백엔드: `FastAPI`
- 저장 방식: 원본 파일과 별도 `analysis metadata` 저장

이 조합이 이번 주차에 가장 현실적인 이유는 다음과 같다.

- Python 백엔드에 붙이기 쉽다
- 이미지 OCR 결과를 빠르게 확인할 수 있다
- 영상도 "프레임 추출 -> 이미지 OCR" 흐름으로 같은 코드 자산을 재사용할 수 있다
- 학교 프로젝트 범위에서 설치/운영 부담이 비교적 낮다

### 4.2 보류 후보

- `PaddleOCR`

PaddleOCR은 더 강력하지만 지금 단계에서는 무겁다.  
문서 이미지, PDF, 복잡한 레이아웃 분석이 필요해질 때 2차 후보로 올리는 것이 적절하다.

## 5. 구현 범위

### 5.1 이미지 OCR

입력:

- jpg
- jpeg
- png
- heic 변환본 또는 서버 업로드 시 표준 포맷으로 변환된 이미지

출력:

- 추출 텍스트 전체
- 텍스트 블록별 confidence
- bbox
- 키워드 후보

처리 흐름:

1. 사용자가 이미지를 업로드
2. 백엔드가 파일 저장
3. OCR 작업 큐 또는 동기 함수 실행
4. EasyOCR로 텍스트 추출
5. 결과를 메타데이터 JSON 또는 DB 테이블에 저장
6. 추출 텍스트를 검색/RAG용 텍스트 필드로 정규화

### 5.2 영상 OCR

입력:

- mp4
- mov
- m4v

출력:

- 프레임별 추출 텍스트
- frame index
- timestamp
- confidence
- 필요 시 대표 텍스트 병합본

처리 흐름:

1. 사용자가 영상을 업로드
2. 백엔드가 원본 저장
3. OpenCV로 2~3초 간격 프레임 추출
4. 각 프레임에 EasyOCR 적용
5. 동일/유사 문구는 병합
6. timestamp 포함 메타데이터 저장
7. 검색 시 영상 전체가 아니라 특정 장면으로 연결 가능하게 구성

## 6. 권장 파이프라인

### 6.1 이미지 OCR 파이프라인

```text
이미지 업로드
-> 파일 저장
-> OCR 실행(EasyOCR)
-> blocks[text, confidence, bbox] 추출
-> extracted_text 병합
-> keywords 생성
-> metadata 저장
```

### 6.2 영상 OCR 파이프라인

```text
영상 업로드
-> 파일 저장
-> OpenCV VideoCapture 로딩
-> 2~3초 간격 프레임 추출
-> 프레임별 OCR(EasyOCR)
-> timestamp/frame_index 포함 결과 생성
-> 중복 텍스트 병합
-> video_ocr metadata 저장
```

## 7. 메타데이터 설계안

### 7.1 이미지 OCR 메타데이터 예시

```json
{
  "metadata_type": "image_ocr",
  "asset_id": "img_001",
  "extracted_text": "2024 가족 송년회",
  "confidence_score": 0.87,
  "keywords": ["가족", "송년회", "2024"],
  "analysis_result": {
    "blocks": [
      {
        "text": "2024 가족 송년회",
        "confidence": 0.87,
        "bbox": [[32, 41], [280, 41], [280, 86], [32, 86]]
      }
    ]
  }
}
```

### 7.2 영상 OCR 메타데이터 예시

```json
{
  "metadata_type": "video_ocr",
  "asset_id": "video_001",
  "extracted_text": "생일 축하합니다\n2024 가족 송년회",
  "confidence_score": 0.78,
  "keywords": ["생일", "가족", "송년회"],
  "analysis_result": {
    "frames": [
      {
        "timestamp": 3.0,
        "frame_index": 90,
        "text": "생일 축하합니다",
        "confidence": 0.81
      },
      {
        "timestamp": 12.0,
        "frame_index": 360,
        "text": "2024 가족 송년회",
        "confidence": 0.75
      }
    ]
  }
}
```

### 7.3 검색/RAG용 정규화 필드

OCR 결과는 그대로 저장하는 것과 별도로 아래 필드를 따로 두는 것이 좋다.

- `search_text`: OCR 결과를 공백 정리한 검색용 텍스트
- `keywords`: 행사명, 날짜, 장소명 등 핵심 토큰
- `low_confidence`: 기준 이하 confidence 포함 여부
- `language_hint`: `ko`, `en`, `mixed`

## 8. FastAPI 연결 방식 제안

현재 `ambient-legacy` 백엔드는 FastAPI 허브 역할을 지향하고 있으므로, 이번 주에는 아래 수준으로 붙이면 된다.

### 8.1 API 제안

- `POST /uploads/image`
  - 이미지 업로드
  - 업로드 직후 OCR 작업 수행 또는 작업 등록

- `POST /uploads/video`
  - 영상 업로드
  - 프레임 OCR 작업 수행 또는 작업 등록

- `GET /assets/{asset_id}/metadata`
  - OCR 포함 분석 메타데이터 조회

- `GET /search?q=...`
  - OCR 텍스트까지 포함한 검색

### 8.2 서비스 레이어 제안

- `services/ocr_image.py`
- `services/ocr_video.py`
- `services/metadata_normalizer.py`

권장 책임 분리는 아래와 같다.

- `ocr_image.py`: 이미지 OCR 실행
- `ocr_video.py`: 프레임 추출 + 영상 OCR
- `metadata_normalizer.py`: OCR 결과를 검색/RAG용 구조로 정리

## 9. 구현 순서 제안

### 9.1 이번 주 우선순위

1. 이미지 OCR 단독 성공
2. 이미지 OCR 메타데이터 저장 성공
3. 영상에서 프레임 추출 성공
4. 영상 프레임 OCR 성공
5. timestamp 포함 저장 성공
6. 검색에서 OCR 텍스트 조회 성공

### 9.2 실제 작업 단위

1. EasyOCR 설치 및 로컬 테스트
2. OpenCV 설치 및 샘플 영상 프레임 추출
3. 이미지 OCR 함수 작성
4. 영상 OCR 함수 작성
5. 메타데이터 스키마 정의
6. 업로드 API와 연결
7. 간단 검색 API 또는 DB 조회 연동

## 10. 테스트 계획

### 10.1 이미지 테스트

- 큰 글자가 있는 행사 사진
- 한글 간판 사진
- 현수막 사진
- 일부 흐릿한 사진

성공 기준:

- 텍스트 1개 이상 추출
- confidence 저장
- bbox 저장
- extracted_text 생성

### 10.2 영상 테스트

- 자막이 있는 짧은 영상
- 행사 현수막이 보이는 영상
- 흔들림이 있는 영상

성공 기준:

- 텍스트가 있는 프레임을 최소 1회 이상 감지
- timestamp 저장
- frame_index 저장
- 유사 텍스트가 과도하게 중복 저장되지 않음

### 10.3 운영 기준

- confidence가 너무 낮은 결과는 `확정 텍스트`가 아니라 `후보 텍스트`로 구분
- OCR 실패 시 원본 저장은 성공해야 함
- 영상 길이가 길면 샘플링 간격을 늘려 처리 시간 제어

## 11. Google AI Edge Gallery 활용 가능성 검토

## 결론

`Google AI Edge Gallery`는 `이번 주 OCR 기능 자체`를 바로 구현하는 도구라기보다,  
`온디바이스 멀티모달 입력 구조`와 `모델 선택 UX`를 참고하기에 좋은 샘플이다.

즉:

- OCR 구현용 핵심 엔진으로 바로 쓰기: 부적합
- 향후 멀티모달 AI 기능 구조 참고: 적합
- 앱 UX/모델 선택/입력 전처리 방식 참고: 적합
- 현재 `ambient-legacy`에 통째로 이식: 비추천

### 11.1 왜 OCR 엔진으로는 부적합한가

`gallery`는 본질적으로 전용 OCR 라이브러리 프로젝트가 아니다.  
주요 초점은 아래에 있다.

- 모바일에서 온디바이스 LLM 실행
- 모델 다운로드 및 관리
- 이미지/오디오를 모델 프롬프트에 붙이는 멀티모달 추론
- Function calling 기반 액션 구조

즉, `문자 인식 정확도` 자체를 위해 설계된 툴이 아니라  
`이미지나 오디오를 받아 LLM이 이해하게 하는 앱 구조`에 가깝다.

이번 주 필요한 것은 아래다.

- 이미지 속 글자 추출
- 영상 프레임 속 글자 추출
- confidence와 위치/시간 저장

이 요구에는 `EasyOCR + OpenCV`가 더 직접적이다.

### 11.2 그래도 참고할 가치가 큰 부분

`gallery`에서 참고할 수 있는 부분은 꽤 있다.

#### A. 멀티모달 입력 흐름

Google AI Edge 문서 기준으로 Android LLM Inference API는 텍스트와 함께 이미지, 오디오 입력을 세션에 추가할 수 있다.  
이 구조는 우리 서비스의 장기 방향과 잘 맞는다.

우리 앱에 적용 가능한 해석:

- 이미지 업로드 후 OCR 텍스트만 저장하는 데서 끝내지 않고
- 나중에는 `이미지 + OCR 텍스트 + 사용자 질문`을 함께 모델에 넣어
- "이 사진이 어떤 행사인지", "사진 속 문구가 무엇을 의미하는지"를 보강할 수 있다

#### B. 모델 선택 UX

`gallery`의 `model_allowlist.json`은 모델별로 다음 정보를 함께 관리한다.

- 모델 이름
- 파일 이름
- 메모리 요구량
- 입력 가능 modality
- 기본 generation config

이 방식은 우리 앱에도 유용하다.  
지금 당장 온디바이스 모델을 쓰지 않더라도, 나중에 아래처럼 확장할 수 있다.

- OCR 전용 경량 파이프라인
- 이미지 설명용 멀티모달 모델
- 음성 전사용 모델
- 검색형 질의응답용 EXAONE

즉 모델을 코드에 하드코딩하기보다 `설정 테이블`로 분리하는 구조는 충분히 참고할 가치가 있다.

#### C. 전처리 후 AI 입력 구조

사용자가 말한 핵심은 "영상, 이미지, 음성 전처리 후 AI가 알아먹게 하는 구조"인데,  
이 부분은 `gallery`에서 가장 참고할 만하다.

우리 서비스에 맞게 바꾸면 다음과 같은 구조가 된다.

```text
원본 업로드
-> 전처리
-> 구조화 메타데이터 생성
-> AI 입력용 패키징
-> 모델 질의
```

매체별로 보면:

- 이미지: 원본 이미지 -> OCR -> bbox/텍스트 -> 필요 시 이미지 설명 모델 입력
- 영상: 원본 영상 -> 프레임 추출 -> 프레임 OCR -> timestamp 정리 -> 대표 장면 요약
- 음성: 원본 음성 -> STT -> 화자/시간 단위 정리 -> 검색/RAG 입력

이 구조 자체는 `gallery` 철학과 잘 맞는다.

### 11.3 바로 가져오지 말아야 하는 이유

다만 현재 프로젝트에 바로 이식하기 어려운 이유도 명확하다.

- `ambient-legacy`는 현재 FastAPI 백엔드 중심 허브 구조
- `gallery`는 Android 온디바이스 앱 중심 구조
- `gallery`는 MediaPipe/LiteRT 계열 모델 포맷과 모바일 실행 환경을 전제로 함
- 현재 팀의 주력 추론 방향은 EXAONE + 로컬 서버 + 검색형 응답

즉 아키텍처 중심이 다르다.

우리 프로젝트의 현재 핵심은:

- 원본 저장
- OCR/STT/메타데이터 추출
- 권한 관리
- 검색/RAG

반면 `gallery`는:

- 모바일 기기에서 모델 실행
- 멀티모달 프롬프트
- 모델 관리
- 사용자 체험

그래서 이번 주에 `gallery`를 붙이는 것보다  
`gallery에서 좋은 패턴만 가져오는 방식`이 가장 현실적이다.

## 12. 최종 권장안

### 12.1 이번 주 실행안

이번 주에는 아래처럼 가는 것이 가장 좋다.

1. `EasyOCR + OpenCV`로 사진/영상 OCR 완성
2. FastAPI 업로드 흐름에 OCR 메타데이터 저장 연결
3. OCR 결과를 검색/RAG용 텍스트 필드로 정규화
4. `gallery`는 직접 통합하지 말고 구조만 참고

### 12.2 다음 주 확장안

OCR이 안정화되면 다음 단계로 아래를 검토할 수 있다.

1. 이미지 OCR 후 멀티모달 요약
2. 영상 프레임 OCR + 장면 설명 결합
3. 음성 STT와 OCR 결과를 함께 검색하는 통합 retrieval
4. 모델 설정 테이블 분리
5. 온디바이스 멀티모달 기능의 일부를 모바일 앱에서 실험

### 12.3 한 줄 판단

이번 주의 정답은 `gallery를 통째로 쓰는 것`이 아니라  
`OCR은 EasyOCR/OpenCV로 구현하고, gallery의 멀티모달 전처리/모델관리 아이디어를 구조 참고용으로 가져오는 것`이다.

## 13. 참고 링크

- Ambient Legacy 저장소: https://github.com/sungbin3120/ambient-legacy
- Ambient Legacy backend README: https://github.com/sungbin3120/ambient-legacy/tree/main/backend
- Google AI Edge Gallery: https://github.com/google-ai-edge/gallery
- Google AI Edge Gallery README: https://github.com/google-ai-edge/gallery/blob/main/README.md
- Google AI Edge Gallery development notes: https://github.com/google-ai-edge/gallery/blob/main/DEVELOPMENT.md
- Google AI Edge LLM Inference Android guide: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android
