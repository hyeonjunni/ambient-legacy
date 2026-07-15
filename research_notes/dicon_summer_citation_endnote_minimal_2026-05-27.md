# 디지털문화하계 논문 각주/미주 최소 보강안

- 작성일: 2026-05-27 17:36 KST
- 대상 초안: `/Users/hyeonjun/Downloads/[앰비개발] 01팀_26디콘하계_사진추가.pdf`
- 참고 개발계획서: `/Users/hyeonjun/Downloads/02_앰비언트컴퓨팅개발1_개발계획서_01팀_두쫀쿠끊기 (1).pdf`
- 작성 원칙: 논문 본문 내용은 수정하지 않고, 기존 문장 뒤에 IEEE식 인용번호만 추가한다.

## 1. 적용 방식

본문에는 각주처럼 긴 설명을 달지 않고, IEEE 방식에 맞춰 문장 끝에 `[1]`, `[2]`처럼 번호만 붙인다. 논문 끝에는 아래 `미주/참고문헌` 항목을 그대로 붙인다.

예시:

```text
기존 문장. [1]
기존 문장. [1], [2]
```

## 2. 본문에서 수정해야 하는 부분

아래 표의 `수정 방식`은 문장 개작이 아니라, 해당 의미를 가진 기존 문장 끝에 번호만 붙이는 방식이다.

| 위치/내용 단서 | 수정 방식 | 붙일 근거 |
|---|---:|---|
| 서론에서 디지털 유산 서비스의 필요성, 사망 이후의 데이터, 애도/기억/상속 문제를 설명하는 문장 | 문장 끝에 `[1]` 또는 `[1], [2]` 삽입 | 죽음과 HCI, 디지털 유산 연구 흐름 |
| 가족의 사진, 영상, 음성, 텍스트 기록이 유산이 될 수 있다는 문장 | 문장 끝에 `[3]` 삽입 | 디지털 자료를 유산으로 보는 HCI 연구 |
| 가족 단위 기록 보관, 가족방, 세대 간 기록 공유를 설명하는 문장 | 문장 끝에 `[2], [3]` 삽입 | 디지털 유산의 다중 사용자/가족 맥락 |
| 국내에서 사후 디지털 기록, 계정, 플랫폼 약관, 상속, 개인정보 문제가 발생한다는 문장 | 문장 끝에 `[4], [5]` 삽입 | 국내 사후 디지털 기록관리 및 디지털유산 상속 연구 |
| 서비스가 고인의 기록을 가족 구성원이 접근/관리하도록 한다는 문장 | 문장 끝에 `[4], [5]` 삽입 | 사후 기록관리와 상속권/접근권 근거 |
| RAG 기반 회상, 기록 기반 질의응답, 저장된 가족 기록을 검색해 답변한다는 문장 | 문장 끝에 `[6]` 삽입 | RAG 원 논문 |
| 한국어 데이터, 폐쇄형/로컬형 지식 DB, 정보 유출 우려를 줄이는 질의응답 구조를 설명하는 문장 | 문장 끝에 `[7]` 삽입 | 국내 RAG 기반 질의응답 시스템 연구 |
| 음성 기록을 STT로 텍스트화하거나 Whisper를 활용한다는 문장 | 문장 끝에 `[8]` 삽입 | Whisper/STT 기반 논문 |
| Google AI Edge, MediaPipe, Android 온디바이스 LLM 실행 가능성을 언급하는 문장 | 문장 끝에 `[9]` 삽입 | Google AI Edge 공식 문서 |

## 3. 본문 삽입 예시

아래는 새 문장을 추가하지 않고, 기존 문장 끝에 번호만 붙이는 예시다. 실제 초안에서는 같은 의미를 가진 문장 뒤에 번호를 붙이면 된다.

```text
디지털 유산 서비스는 고인의 데이터를 보존하는 것을 넘어 가족의 기억, 애도, 상속, 접근권을 함께 다루는 문제이다. [1], [2]
```

```text
사진, 영상, 음성, 텍스트와 같은 디지털 자료는 가족 구성원에게 의미 있는 유산으로 재구성될 수 있다. [3]
```

```text
국내에서도 사후 디지털 기록의 관리, 플랫폼 약관, 상속권, 개인정보 보호가 주요 쟁점으로 논의되고 있다. [4], [5]
```

```text
본 서비스는 가족 기록을 검색하여 응답을 생성하는 RAG 기반 회상 구조를 지향한다. [6]
```

```text
한국어 가족 기록을 다루는 환경에서는 정보 유출 우려를 줄이고 지식 데이터베이스를 사용자가 직접 관리할 수 있는 구조가 중요하다. [7]
```

```text
음성 기록은 STT 기술을 통해 텍스트 데이터로 변환될 수 있다. [8]
```

```text
Google AI Edge의 MediaPipe LLM Inference API는 Android 환경에서 온디바이스 LLM 실행을 지원한다. [9]
```

## 4. 참고 문헌 (참고자료)

[1] M. Massimi and A. Charise, "Dying, Death, and Mortality: Towards Thanatosensitivity in HCI," *CHI '09 Extended Abstracts on Human Factors in Computing Systems*, pp. 2459~2468, Apr. 2009.

[2] D. T. Doyle and J. R. Brubaker, "Digital Legacy: A Systematic Literature Review," *Proceedings of the ACM on Human-Computer Interaction*, Vol. 7, No. CSCW2, Article 268, pp. 1~26, Sep. 2023.

[3] R. Gulotta, W. Odom, J. Forlizzi, and H. Faste, "Digital Artifacts as Legacy: Exploring the Lifespan and Value of Digital Data," *Proceedings of CHI 2013*, pp. 1813~1822, Apr.-May 2013.

[4] 김진홍, 이해영, "개인의 사후 디지털 기록관리를 위한 정책과 방안," *기록학연구*, No. 72, pp. 165~203, Apr. 2022.

[5] 최현태, "디지털유산 상속 보호에 관한 입법론적 고찰 - 온라인상의 디지털 저작물/유산을 중심으로 -," *법과정책연구*, Vol. 17, No. 3, pp. 209~236, Sep. 2017.

[6] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Kuttler, M. Lewis, W. Yih, T. Rocktaschel, S. Riedel, and D. Kiela, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," *Advances in Neural Information Processing Systems*, Vol. 33, pp. 9459~9474, Dec. 2020.

[7] 이광우, 김수균, "국내 기업을 위한 RAG 구조 기반 질의응답시스템 설계," *한국컴퓨터정보학회논문지*, Vol. 29, No. 7, pp. 81~88, July 2024.

[8] A. Radford, J. W. Kim, T. Xu, G. Brockman, C. McLeavey, and I. Sutskever, "Robust Speech Recognition via Large-Scale Weak Supervision," *Proceedings of the 40th International Conference on Machine Learning*, Vol. 202, pp. 28492~28518, July 2023.

[9] Google AI Edge, "LLM Inference guide for Android," *Google AI for Developers*, Mar. 2026. [Online]. Available: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android

## 5. 참고문헌 설명

[1] 디지털 유산 서비스를 HCI 관점에서 설명할 때 가장 직접적인 배경 문헌이다. 죽음, 사망, 애도, 사후 이용자 상태를 기술 설계에 반영해야 한다는 `thanatosensitivity` 개념을 제안한다. DOI: 10.1145/1520340.1520349. 링크: https://www.dgp.toronto.edu/~mikem/pubs/MassimiCharise-CHI2009.pdf. 접속: 2026-05-27 17:36 KST.

[2] 디지털 유산 연구를 체계적으로 정리한 최신 핵심 문헌이다. 디지털 유산의 정체성, 접근, 처분, 오프라인 유산과의 연결, 다중 사용자/세대 간 맥락을 정리한다. DOI: 10.1145/3610059. 링크: https://par.nsf.gov/biblio/10528675-digital-legacy-systematic-literature-review. 접속: 2026-05-27 17:36 KST.

[3] 사진, 영상, 파일 같은 디지털 자료가 개인과 가족에게 유산적 의미를 갖는다는 점을 뒷받침한다. 초안에서 멀티모달 가족 기록을 단순 저장물이 아니라 가족 유산으로 설명하는 부분의 근거다. DOI: 10.1145/2470654.2466240. 링크: https://rebeccagulotta.com/info/GulottaOdomForlizziFaste-CHI2013.pdf. 접속: 2026-05-27 17:36 KST.

[4] 국내 사후 디지털 기록관리의 정책·제도 문제를 다룬다. 플랫폼 약관, 사후 기록 방치/삭제, 생전 관리 방식, 디지털 계정 관련 유언장 등을 논의하므로 국내 필요성 문장에 붙이기 적합하다. DOI: 10.20923/kjas.2022.72.165. 링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002837637. 접속: 2026-05-27 17:36 KST.

[5] 국내 디지털유산 상속의 법적 성질과 입법 방향을 다룬다. 가족 구성원의 접근권, 관리 권한, 사후 공개 범위, 상속 문제를 설명하는 문장에 붙이면 된다. DOI: 10.17926/kaolp.2017.17.3.209. 링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART002273571. 접속: 2026-05-27 17:36 KST.

[6] RAG의 대표 원 논문이다. 외부 검색 메모리와 생성 모델을 결합해 지식 기반 답변을 생성하는 구조를 제시한다. 가족 기록을 검색 근거로 삼는 회상형 질의응답 설명에 붙인다. 링크: https://papers.nips.cc/paper_files/paper/2020/hash/6b493230205f780e1bc26945df7481e5-Abstract.html. 접속: 2026-05-27 17:36 KST.

[7] 국내 한국어 환경에서 RAG 기반 질의응답시스템을 설계한 논문이다. 한국어 문장 임베딩, 지식 DB, 폐쇄망 동작, 정보 유출 우려 완화 논리를 가족 기록 서비스의 기술 근거로 활용할 수 있다. DOI: 10.9708/jksci.2024.29.07.081. 링크: https://www.kci.go.kr/kciportal/landing/article.kci?arti_id=ART003104515. 접속: 2026-05-27 17:36 KST.

[8] Whisper 계열 음성 인식의 기반 논문이다. 음성 기록을 텍스트화하는 STT 기술 배경에 붙이기 좋다. 링크: https://proceedings.mlr.press/v202/radford23a.html. 접속: 2026-05-27 17:36 KST.

[9] 학술논문은 아니고 Google의 공식 기술문서다. Google AI Edge, MediaPipe LLM Inference, Android 온디바이스 LLM 실행 가능성을 언급할 때 참고자료로만 사용한다. 문서의 최종 업데이트일은 2026-03-31 UTC이다. 링크: https://ai.google.dev/edge/mediapipe/solutions/genai/llm_inference/android. 접속: 2026-05-27 17:36 KST.

## 6. 최종 검토 결과

| 번호 | 검토 결과 | 비고 |
|---|---|---|
| [1] | 실제 학술대회 논문 | ACM CHI Extended Abstracts, DOI 확인 |
| [2] | 실제 학술논문 | PACM HCI 저널 논문, DOI 확인 |
| [3] | 실제 학술대회 논문 | ACM CHI 논문, DOI 확인 |
| [4] | 실제 국내 학술논문 | KCI 등재, DOI 확인 |
| [5] | 실제 국내 학술논문 | KCI 등재, DOI 확인 |
| [6] | 실제 학술대회 논문 | NeurIPS 2020 논문, 공식 페이지 확인 |
| [7] | 실제 국내 학술논문 | KCI 등재, DOI 확인 |
| [8] | 실제 학술대회 논문 | ICML/PMLR 논문, 공식 페이지 확인 |
| [9] | 논문 아님 | Google 공식 기술문서이므로 `참고자료`로만 표기 |

## 7. 최소 수정 체크리스트

- 기존 본문 문장은 그대로 둔다.
- 관련 문장 끝에 `[1]`부터 `[9]`까지 필요한 번호만 붙인다.
- 논문 말미의 기존 예시 참고문헌 `[1]`, `[2]`가 있다면 위 미주/참고문헌으로 교체한다.
- 그림, 구현 범위, 결론 문장은 이번 작업 범위에서는 수정하지 않는다.
