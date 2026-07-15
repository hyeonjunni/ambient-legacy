# Ambient Legacy Prototype

이 프로토타입은 실제 추론 엔진을 포함하지 않는다.  
대신 아래 3가지를 검증하기 위한 최소 구조를 담는다.

- 모델을 직접 선택하는 구조
- Markdown 기반 페르소나를 조합하는 구조
- 검색 결과를 묶어 LLM 입력 패키지로 만드는 구조

## 폴더

- `config/model_registry.json`: 모델 프로필
- `personas/`: Markdown 기반 페르소나 문서
- `sample_data/`: 예시 메모리 청크
- `runtime/prompt_builder.py`: persona + retrieval + query 패키징

## 실행

```bash
python3 prototype/runtime/prompt_builder.py
```

## 의도

실서비스에서는 이 결과를:

- 폰의 온디바이스 Gemma 런타임
- 또는 Family Vault Node의 서버 모델

중 하나에 전달하면 된다.
