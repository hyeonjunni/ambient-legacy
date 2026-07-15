# 디지털문화하계 논문 초안 참고문헌/각주 보강안

- 작성일: 2026-05-27 16:44 KST
- 대상 초안: `/Users/hyeonjun/Downloads/[앰비개발] 01팀_26디콘하계_사진추가.pdf`
- 참고 개발계획서: `/Users/hyeonjun/Downloads/02_앰비언트컴퓨팅개발1_개발계획서_01팀_두쫀쿠끊기 (1).pdf`
- 작성 관점: 디지털 유산 서비스 연구자 관점의 문헌 보강 및 초안 비판

## 1. 현재 초안의 연구 주장 정리

초안의 핵심 주장은 다음 세 가지로 압축된다.

1. 가족 기억은 사진, 영상, 음성, 텍스트로 파편화되어 있으며 기존 클라우드 저장소는 맥락 기반 회상에 약하다.
2. 민감한 가족 기록은 외부 생성형 AI API에 그대로 의존하기보다 로컬 LLM/RAG 구조로 처리해야 데이터 주권을 확보할 수 있다.
3. React Native 앱, FastAPI 백엔드, Cloud SQL/GCS, 로컬 LLM 후보를 결합해 가족방 기반 디지털 유산 관리 프로토타입을 구현했다.

이 방향은 타당하지만, 현재 논문은 "구현된 기능", "설계한 기능", "향후 통합할 기능"을 한 문단 안에 섞어 서술하고 있어 학회 심사자가 구현 수준을 과대 주장으로 읽을 위험이 있다.

## 2. 저장소 기준 현재 개발 상황

### 구현됨

- Expo/React Native 기반 Android 앱.
- FastAPI 백엔드.
- Google 로그인 및 프로필 온보딩.
- 가족방 생성, 초대 코드 입장, 구성원 조회, 가족방 삭제.
- 텍스트/이미지/영상 업로드 및 저장소 조회.
- Cloud SQL 기반 사용자/가족방/업로드 메타데이터 관리.
- Google Cloud Storage-ready 미디어 저장 흐름 및 로컬 fallback.
- `/api/v1/ai/models`, `/api/v1/ai/personas`, `/api/v1/ai/demo-bootstrap`, `/api/v1/ai/chat-demo`.
- 모델 선택 UI, 페르소나 선택 UI, provider adapter 구조.
- Gemma/EXAONE/Qwen 등 로컬 모델 비교 실험과 Gemma E2B 중심 LoRA smoke run.

### 아직 구현 또는 검증 전으로 써야 함

- Whisper STT와 OCR은 `backend/app/integrations/whisper.py`, `backend/app/integrations/ocr.py` 기준 빈 문자열 반환 stub 상태.
- 실제 벡터 DB 기반 RAG는 아니며, 현재 demo retrieval은 업로드 제목/설명/태그에 대한 키워드 매칭에 가깝다.
- AES-256 선행 암호화는 설계 주장에 가깝고, 현재 바이너리 업로드 경로는 `encrypted=False`로 저장되는 부분이 확인된다.
- Google AI Edge/MediaPipe LLM Inference는 앱 의존성에 포함되어 있지 않으며, 온디바이스 모델 실행은 연구 검토/후속 범위로 표현해야 한다.
- EXAONE 4.0 "7.7B" 표현은 수정해야 한다. 공식 공개 단위는 EXAONE 3.5 7.8B, EXAONE 4.0 32B/1.2B 계열로 확인된다.

## 3. 본문에 바로 넣을 수 있는 IEEE식 각주 문장

아래 문장은 본문 중 관련 위치에 삽입할 수 있다. IEEE식으로 본문에서는 `[1]`, `[2]`처럼 번호만 달고, 문헌 설명은 마지막 미주/참고문헌에 둔다.

### 연구 배경

가족 디지털 유산 서비스는 단순한 파일 저장소가 아니라 죽음, 애도, 상속, 기억의 재구성이 기술 시스템 안에서 어떻게 발생하는지를 다루는 HCI 문제로 볼 필요가 있다[1].

디지털 유산 연구는 최근 문헌에서 기록의 인코딩, 접근, 처분이라는 생애주기 관점으로 정리되며, 특히 다중 사용자와 세대 간 네트워크가 중요한 연구 공백으로 제시된다[2].

사진과 동영상 같은 디지털 자료는 물리적 유품과 달리 복제, 이동, 삭제가 쉽기 때문에 가족 구성원 사이의 소유감, 통제감, 의미 부여 방식이 기존 유품과 다르게 나타난다[3].

가족 아카이브 연구는 가정 내 기록 정리가 단순한 보관 행위가 아니라 가족 구성원 간 관계와 조직 방식을 드러내는 사회적 실천임을 보여준다[4].

### 연구 필요성 및 윤리

디지털 사후산업은 고인의 데이터가 상업적 가치로 재구성될 수 있다는 점에서, 회상 서비스가 고인의 정보적 정체성을 왜곡하지 않도록 윤리적 통제 장치를 요구한다[5].

국내 연구에서도 사후 디지털 기록은 방치, 삭제, 플랫폼 약관, 상속권, 개인정보 보호가 얽힌 문제로 다뤄지며, 개인이 생전에 관리 방식을 명시하지 않는 경우 유족과 플랫폼 사이의 권리 충돌이 발생할 수 있다고 지적된다[6], [7].

따라서 본 서비스는 고인을 복제하는 감정 자극형 챗봇보다, 실제 기록에 근거한 회상 보조와 가족 구성원별 권한 제어를 우선하는 방향으로 설계되어야 한다.

### 기술 배경

RAG는 파라미터에 저장된 지식만 사용하는 생성 모델의 한계를 보완하기 위해 외부 검색 메모리를 결합하는 방식이며, 근거 제공과 지식 갱신 문제를 해결하기 위한 대표 구조로 제안되었다[8].

한국어 업무 환경을 대상으로 한 국내 RAG 연구도 부정확한 정보 제공과 정보 유출 우려를 완화하기 위해 사용자가 지식 데이터베이스를 직접 관리하고 폐쇄망에서 동작하는 질의응답 구조의 필요성을 제시한다[9].

가족 기록 질의응답에서 할루시네이션을 줄이기 위해서는 답변 생성 전에 검색 근거를 명시하고, 기록에 없는 내용은 없다고 답하도록 하는 시스템 수준의 제약이 필요하다[8], [10].

음성 기록의 텍스트화에는 Whisper와 같은 대규모 약지도 음성 인식 모델이 활용 가능하지만, 가족 대화는 방언, 배경 소음, 다자 화자 문제가 있으므로 자동 결과를 그대로 유산 데이터로 확정하기보다 신뢰도와 사용자 확인 절차를 함께 저장해야 한다[11].

Google AI Edge의 MediaPipe LLM Inference API는 Android에서 온디바이스 LLM 실행을 지원하지만, 공식 문서는 고성능 Android 기기 중심 최적화와 에뮬레이터 비권장 사항을 함께 명시한다. 그러므로 본 연구의 현재 단계에서는 온디바이스 LLM을 핵심 구현 완료 기능이 아니라 후속 실험 범위로 쓰는 것이 정확하다[12].

AI 주권 또는 데이터 주권이라는 표현은 단순히 "클라우드를 안 쓴다"는 의미가 아니라, 데이터 접근, 학습 사용, 저장 위치, 처리 주체, 사용자 통제권을 구체적으로 분리해 설명할 때 연구적 설득력을 갖는다[13].

## 4. 초안에서 고쳐야 할 문장

### 과대 구현 주장

현재 초안 문장:

> 본 논문에서는 ... 서비스를 제안하고 구현하였다.

권장 수정:

> 본 논문에서는 가족방 기반 기록 수집과 저장소 조회가 가능한 모바일 프로토타입을 구현하고, 로컬 LLM/RAG 기반 회상 구조는 provider adapter와 데모 질의응답 흐름을 통해 부분 검증하였다. STT/OCR, 벡터 검색, 온디바이스 추론은 후속 통합 대상으로 남는다.

### EXAONE 모델명

현재 초안 문장:

> EXAONE 4.0(7.7B)

권장 수정:

> EXAONE 3.5 7.8B 또는 EXAONE 4.0 1.2B/32B 등 한국어 지원 로컬 LLM 후보

논문에는 실제 실험에 사용한 모델명을 중심으로 적어야 한다. 저장소의 반복 벤치마크 기준 최종 후보는 Gemma 4 E2B, EXAONE 3.5 7.8B, Qwen 3 8B이며, 기본값은 Gemma 4 E2B로 정리하는 편이 현재 개발 기록과 맞다.

### 암호화

현재 초안 문장:

> AES-256 알고리즘으로 선행 암호화된 후 외부 Google Cloud Storage로 전송된다.

권장 수정:

> 설계상 민감도가 높은 STT/OCR 결과와 원본 미디어는 로컬 암호화 후 객체 저장소에 보관하는 구조를 목표로 한다. 다만 현재 프로토타입에서는 Cloud SQL/GCS-ready 저장 흐름과 접근 제어를 우선 구현했으며, 파일 단위 AES-256 암호화와 키 관리는 후속 구현 항목이다.

### RAG

현재 초안 문장:

> RAG 기반 회상 프로세스가 작동한다.

권장 수정:

> 현재 프로토타입의 AI 질의응답은 가족방 업로드 메타데이터와 태그를 검색 근거로 사용하는 데모 RAG 흐름이며, 향후 OCR/STT 결과와 벡터 인덱스를 결합해 의미 검색 기반 RAG로 확장한다.

### Google AI Edge

현재 초안에 넣을 문장:

> Google AI Edge/MediaPipe LLM Inference는 Android 온디바이스 LLM 실행 가능성을 보여주지만, 고성능 기기 요구와 모델 변환, 배터리/발열 문제가 있어 본 연구에서는 핵심 구조가 아니라 선택적 보조 계층으로 검토한다[12].

## 5. 연구자 관점에서 본 현재 논문의 핵심 문제점

1. 구현 범위가 불명확하다. 앱 화면과 백엔드 기능은 구현되어 있지만, STT/OCR/RAG/AES/온디바이스 LLM은 설계 또는 stub 단계다. 논문은 이 둘을 구분해야 한다.
2. 방법론이 약하다. "프로토타입을 구현하였다"는 주장에는 구현 환경, 테스트 기기, 데이터셋 규모, 시나리오, 평가 기준이 붙어야 한다.
3. 윤리 파트가 부족하다. 디지털 유산 서비스는 사후 개인정보, 유족 접근권, 고인 의사, 미성년 가족 데이터, 감정적 의존을 다루므로 동의와 권한 구조를 별도 절로 제시해야 한다.
4. 문헌이 기능 설명 뒤에 붙어 있을 뿐, 연구 질문을 지지하는 방식으로 연결되지 않는다. "왜 가족방인가", "왜 기록 기반 응답인가", "왜 고인 복제가 아닌 회상 보조인가"가 문헌과 맞물려야 한다.
5. 그림 번호가 충돌한다. 시장 그래프와 앱 흐름도가 모두 그림 1로 보인다. 제출본에서는 그림 번호와 캡션을 재정리해야 한다.
6. "데이터 주권"이 수사적으로 쓰인다. Cloud SQL/GCS를 쓰는 만큼, 클라우드를 배제한다기보다 "클라우드는 저장 계층, 민감 분석과 키 관리는 로컬 계층"이라는 제한된 주권 모델로 정의해야 한다.
7. 모델명과 실험 결과가 불일치한다. 초안의 EXAONE 4.0(7.7B)은 공식 모델 체계 및 저장소 실험 기록과 맞지 않는다.
8. 참고문헌 [1], [2]가 예시 문헌으로 남아 있어 논문 신뢰도를 떨어뜨린다. 실제 인용 문헌으로 교체해야 한다.

## 6. 보강된 미주형 참고문헌

아래 형식은 제출 논문 끝의 참고문헌으로 다듬어 사용할 수 있다. 각 항목에는 사용자가 출처를 추적할 수 있도록 주요 내용, 링크, 접속 시간을 함께 적었다.

[1] M. Massimi and A. Charise, "Dying, Death, and Mortality: Towards Thanatosensitivity in HCI," CHI 2009 Extended Abstracts, 2009, doi: 10.1145/1520340.1520349.  
주요 내용: HCI 설계가 죽음과 사후 이용자 상태를 고려해야 한다는 "thanatosensitivity" 개념을 제안한다. 본 논문의 연구 배경과 윤리적 설계 방향에 직접 연결된다.  
링크: https://www.dgp.toronto.edu/~mikem/pubs/MassimiCharise-CHI2009.pdf  
접속: 2026-05-27 16:44 KST.

[2] D. T. Doyle and J. R. Brubaker, "Digital Legacy: A Systematic Literature Review," Proceedings of the ACM on Human-Computer Interaction, vol. 7, no. CSCW2, Article 268, 2023, doi: 10.1145/3610059.  
주요 내용: 디지털 유산 연구를 정리하며 데이터의 encoding, accessing, dispossessing 생애주기와 다세대 네트워크의 중요성을 제시한다. 본 논문의 가족방/세대 간 기록 구조를 정당화하는 핵심 문헌이다.  
링크: https://par.nsf.gov/biblio/10528675-digital-legacy-systematic-literature-review  
접속: 2026-05-27 16:44 KST.

[3] R. Gulotta, W. Odom, J. Forlizzi, and H. Faste, "Digital Artifacts as Legacy: Exploring the Lifespan and Value of Digital Data," CHI 2013, pp. 1813-1822, 2013, doi: 10.1145/2470654.2466240.  
주요 내용: 디지털 자료가 가족과 세대 간에 어떻게 유산으로 인식되는지 탐색한 연구다. "단순 파일"이 아니라 "의미 있는 상속 자산"으로 기록을 다루는 본 논문 주장에 적합하다.  
링크: https://rebeccagulotta.com/info/GulottaOdomForlizziFaste-CHI2013.pdf  
접속: 2026-05-27 16:44 KST.

[4] D. S. Kirk, S. Izadi, A. Sellen, S. Taylor, R. Banks, and O. Hilliges, "Opening Up the Family Archive," Proceedings of CSCW 2010, pp. 261-270, 2010, doi: 10.1145/1718918.1718968.  
주요 내용: 가정 내 감성적 물건과 기록을 아카이빙하는 기술 probe를 통해 가족 아카이브가 사회적 관계와 정리 방식을 드러낸다는 점을 보인다. 본 연구의 가족방/공동 저장소 설계 근거로 사용할 수 있다.  
링크: https://ait.ethz.ch/familyarchive  
접속: 2026-05-27 16:44 KST.

[5] C. Oehman and L. Floridi, "The Political Economy of Death in the Age of Information: A Critical Approach to the Digital Afterlife Industry," Minds and Machines, vol. 27, pp. 639-662, 2017, doi: 10.1007/s11023-017-9445-2.  
주요 내용: 디지털 사후산업이 고인의 데이터와 정체성을 상업적으로 재구성할 위험을 비판한다. 본 논문에서 고인 재현형 챗봇보다 근거 기반 회상 보조를 택해야 하는 윤리적 근거다.  
링크: https://link.springer.com/article/10.1007/s11023-017-9445-2  
접속: 2026-05-27 16:44 KST.

[6] 김진홍, 이해영, "개인의 사후 디지털 기록관리를 위한 정책과 방안," 기록학연구, no. 72, pp. 165-203, 2022, doi: 10.20923/kjas.2022.72.165.  
주요 내용: 사후 개인 디지털 기록의 방치, 삭제, 플랫폼 정책, 법제도 문제를 분석하고 선제적 관리 방안을 제시한다. 국내 디지털 유산 서비스의 필요성과 정책 배경을 보강한다.  
링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002837637  
접속: 2026-05-27 16:44 KST.

[7] 신동평, "개인정보보호와 디지털 유산 상속에 관한 연구," 석사학위논문, 순천향대학교 대학원, 2017.  
주요 내용: 디지털 유산 상속 과정에서 고인의 인격정보와 개인정보 보호가 왜 필요한지 다룬다. 가족 구성원의 접근권과 고인의 사생활 보호 사이 긴장을 설명하는 데 적합하다.  
링크: https://www.dbpia.co.kr/journal/detail?nodeId=T14471897  
접속: 2026-05-27 16:44 KST.

[8] P. Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," Advances in Neural Information Processing Systems 33, 2020.  
주요 내용: 생성 모델에 외부 검색 메모리를 결합해 지식 집약적 질문에 대응하는 RAG 구조를 제안한다. 본 논문의 "실제 가족 기록 기반 응답" 구조의 핵심 기술 근거다.  
링크: https://papers.nips.cc/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html  
접속: 2026-05-27 16:44 KST.

[9] 이광우, 김수균, "국내 기업을 위한 RAG 구조 기반 질의응답시스템 설계," 한국컴퓨터정보학회논문지, vol. 29, no. 7, pp. 81-88, 2024, doi: 10.9708/jksci.2024.29.07.081.  
주요 내용: 부정확한 정보 제공과 정보 유출 우려를 줄이기 위해 한국어 문장 임베딩, 지식 DB, 폐쇄망 RAG 구조를 설계한다. 가족 데이터의 외부 유출 우려를 낮추는 본 프로젝트의 로컬/폐쇄형 방향과 잘 맞는다.  
링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003104515  
접속: 2026-05-27 16:44 KST.

[10] Z. Ji et al., "Survey of Hallucination in Natural Language Generation," ACM Computing Surveys, vol. 55, no. 12, Article 248, 2023, doi: 10.1145/3571730.  
주요 내용: 자연어 생성의 할루시네이션 유형, 측정, 완화 방법을 정리한다. 본 연구에서 "기록에 없는 기억을 만들지 않는" 프롬프트와 평가 기준을 제안할 때 사용할 수 있다.  
링크: https://dl.acm.org/doi/10.1145/3571730  
접속: 2026-05-27 16:44 KST.

[11] A. Radford et al., "Robust Speech Recognition via Large-Scale Weak Supervision," Proceedings of the 40th International Conference on Machine Learning, PMLR 202, pp. 28492-28518, 2023.  
주요 내용: Whisper 계열의 기반 논문으로, 대규모 다국어/멀티태스크 음성 데이터 기반 STT의 강건성을 제시한다. 가족 음성 기록 전처리 기술 배경으로 사용할 수 있다.  
링크: https://proceedings.mlr.press/v202/radford23a.html  
접속: 2026-05-27 16:44 KST.

[12] Google AI Edge, "LLM Inference guide for Android," Google AI for Developers, last updated 2026-03-31 UTC.  
주요 내용: Android에서 LLM을 온디바이스로 실행하는 MediaPipe LLM Inference API를 설명한다. 고성능 Android 기기 중심 최적화, 멀티모달 입력, LoRA 관련 제한이 명시되어 있어 본 논문의 온디바이스 검토 범위를 정확히 제한하는 근거가 된다.  
링크: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android  
접속: 2026-05-27 16:44 KST.

[13] 이희옥, "인공지능 주권 논의와 데이터 법·정책에 관한 비판적 고찰," 경제규제와 법, vol. 17, no. 2, pp. 51-75, 2024, doi: 10.22732/CeLPU.2024.17.2.51.  
주요 내용: AI 주권/데이터 주권 담론이 기술 패권과 국가 통제 논리로 과도하게 쓰일 수 있음을 비판한다. 본 논문에서 "데이터 주권"을 기술 구조와 사용자 통제권으로 구체화해야 하는 이유를 제공한다.  
링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003146348  
접속: 2026-05-27 16:44 KST.

[14] 최현태, "디지털유산 상속 보호에 관한 입법론적 고찰 - 온라인상의 디지털 저작물/유산을 중심으로 -," 법과정책연구, vol. 17, no. 3, pp. 209-236, 2017, doi: 10.17926/kaolp.2017.17.3.209.  
주요 내용: 디지털유산의 법적 성질과 상속 처리의 불명확성을 다루며 입법 방향을 검토한다. 본 연구의 권한 관리, 가족방 접근 범위, 사후 공개 정책 논의에 적합하다.  
링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002273571  
접속: 2026-05-27 16:44 KST.

## 7. 짧은 결론문 대체안

본 연구는 가족 구성원의 음성, 텍스트, 이미지, 영상 기록을 가족방 단위로 축적하고, 이를 향후 로컬 LLM/RAG 기반 회상 인터페이스로 확장하기 위한 모바일 프로토타입을 제안하였다. 현재 구현 범위는 로그인, 프로필, 가족방, 멀티모달 업로드, 저장소 조회, 모델/페르소나 선택 및 데모 질의응답 흐름이며, STT/OCR 자동 분석, 벡터 인덱싱, 파일 단위 암호화, 온디바이스 LLM 실행은 후속 연구 범위로 남는다. 디지털 유산 연구와 사후 개인정보 논의를 고려할 때, 본 서비스는 고인의 인격을 모방하는 재현형 AI보다 실제 기록에 근거한 회상 보조와 가족 구성원별 접근 통제를 중심으로 발전해야 한다.
