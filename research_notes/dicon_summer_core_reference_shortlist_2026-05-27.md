# 디지털문화하계 논문 핵심 참고문헌 압축안

- 작성일: 2026-05-27
- 목적: 남은 지면이 적은 제출본용으로 참고문헌을 3~4개, 최대 5~6개로 압축
- 기준: 기존 초안의 핵심 주장인 `디지털 유산`, `국내 사후 기록관리`, `기록 기반 RAG`, `음성/STT 또는 온디바이스 LLM`에 직접 근거가 되는 문헌만 유지

## 1. 최종 추천: 4개 버전

가장 무난한 구성이다. 디지털 유산 연구, 국내 연구, RAG 기술, 음성 기록 처리를 각각 하나씩 받쳐준다.

참고 문헌 (참고자료)

[1] D. T. Doyle and J. R. Brubaker, "Digital Legacy: A Systematic Literature Review," *Proceedings of the ACM on Human-Computer Interaction*, Vol. 7, No. CSCW2, Article 268, pp. 1~26, Sep. 2023.

[2] 김진홍, 이해영, "개인의 사후 디지털 기록관리를 위한 정책과 방안," *기록학연구*, No. 72, pp. 165~203, Apr. 2022.

[3] P. Lewis, E. Perez, A. Piktus, F. Petroni, V. Karpukhin, N. Goyal, H. Kuttler, M. Lewis, W. Yih, T. Rocktaschel, S. Riedel, and D. Kiela, "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks," *Advances in Neural Information Processing Systems*, Vol. 33, pp. 9459~9474, Dec. 2020.

[4] A. Radford, J. W. Kim, T. Xu, G. Brockman, C. McLeavey, and I. Sutskever, "Robust Speech Recognition via Large-Scale Weak Supervision," *Proceedings of the 40th International Conference on Machine Learning*, Vol. 202, pp. 28492~28518, July 2023.

### 4개 버전 설명

[1]은 디지털 유산 연구 전체를 압축해서 대표할 수 있으므로, Massimi와 Gulotta를 모두 넣기 어려울 때 가장 먼저 남겨야 한다.

[2]는 국내 연구 논문 중 가장 직접적으로 맞는다. 사후 디지털 기록관리, 플랫폼 정책, 법·제도, 개인 기록관리 문제를 모두 다루므로 국내 맥락 근거로 충분하다.

[3]은 RAG 원 논문이므로 기술 구조의 핵심 근거다. 가족 기록을 검색 근거로 활용해 응답을 생성한다는 문장에는 이 문헌 하나가 가장 강하다.

[4]는 음성 기록, STT, Whisper를 본문에서 언급할 때 필요하다. 초안에서 음성 기록 비중이 낮다면 [4] 대신 아래 [5] 또는 [6]으로 바꿔도 된다.

## 2. 5개 버전: 사진/영상 유산성 강조 시

사진, 영상, 텍스트 기록을 "가족 유산"으로 다루는 논지가 강하면 아래 [5]를 추가한다.

[5] R. Gulotta, W. Odom, J. Forlizzi, and H. Faste, "Digital Artifacts as Legacy: Exploring the Lifespan and Value of Digital Data," *Proceedings of CHI 2013*, pp. 1813~1822, Apr.-May 2013.

추가 이유: 초안 제목과 자료가 `사진추가` 중심이고, 가족의 사진/영상/디지털 자료가 유산이 되는 근거를 직접 제공한다.

## 3. 6개 버전: Google AI Edge 참고자료 대체

Google AI Edge 공식문서는 논문이 아니므로, 참고문헌 칸을 아끼려면 빼는 것이 맞다. 온디바이스 LLM 근거가 꼭 필요하면 공식문서 대신 아래 실제 ICML 논문으로 바꾼다.

[6] Z. Liu, C. Zhao, F. Iandola, C. Lai, Y. Tian, I. Fedorov, Y. Xiong, E. Chang, Y. Shi, R. Krishnamoorthi, L. Lai, and V. Chandra, "MobileLLM: Optimizing Sub-billion Parameter Language Models for On-Device Use Cases," *Proceedings of the 41st International Conference on Machine Learning*, Vol. 235, pp. 32431~32454, July 2024.

대체 표시:

```text
기존 참고자료: Google AI Edge, "LLM Inference guide for Android" -> 삭제 또는 각주 설명용으로만 사용
대체 논문: [6] MobileLLM: Optimizing Sub-billion Parameter Language Models for On-Device Use Cases
```

## 4. 삭제 우선순위

공간이 부족하면 아래 순서로 뺀다.

1. Google AI Edge 공식문서: 논문이 아니므로 참고문헌에서는 가장 먼저 제외. 단, 정확히 MediaPipe API명을 언급해야 하면 본문 각주나 설명자료로만 사용.
2. Massimi and Charise, 2009: 중요한 이론 논문이지만, Doyle and Brubaker 2023이 디지털 유산 연구 전체를 최신 문헌검토로 포괄하므로 제한된 지면에서는 제외 가능.
3. 최현태, 2017: 디지털유산 상속 법제 논문으로 의미는 있으나, 국내 맥락은 김진홍·이해영 2022가 더 넓고 초안 주제와 직접 맞는다.
4. 이광우, 김수균, 2024: 국내 RAG 논문이지만, RAG 자체의 핵심 근거는 Lewis et al. 2020이 더 강하다. 국내 기술 논문을 꼭 넣어야 하는 경우에만 [4] 또는 [5] 대신 사용.
5. Radford et al. 2023: 음성/STT가 본문에서 짧게만 언급되면 제외 가능. 음성 기록이 핵심 기능이면 유지.
6. Gulotta et al. 2013: 사진/영상 기록의 유산성을 강조하면 유지. 지면이 4개뿐이면 Doyle and Brubaker 2023으로 통합해도 된다.

## 5. 상황별 선택안

### 3개만 가능할 때

[1] Doyle and Brubaker 2023  
[2] 김진홍, 이해영 2022  
[3] Lewis et al. 2020

### 4개 가능할 때

[1] Doyle and Brubaker 2023  
[2] 김진홍, 이해영 2022  
[3] Lewis et al. 2020  
[4] Radford et al. 2023

단, 음성/STT보다 사진/영상 유산성이 더 중요하면 [4]를 Gulotta et al. 2013으로 교체한다.

### 5개 가능할 때

[1] Doyle and Brubaker 2023  
[2] 김진홍, 이해영 2022  
[3] Lewis et al. 2020  
[4] Radford et al. 2023  
[5] Gulotta et al. 2013

### 6개 가능할 때

[1] Doyle and Brubaker 2023  
[2] 김진홍, 이해영 2022  
[3] Lewis et al. 2020  
[4] Radford et al. 2023  
[5] Gulotta et al. 2013  
[6] Liu et al. 2024, MobileLLM

## 6. 최종 판단

제출본 공간이 정말 부족하면 4개 버전을 권장한다. 초안에서 `음성 기록`보다 `사진/영상 기록`이 더 눈에 띈다면 [4] Radford를 [5] Gulotta로 바꾸는 편이 논문 흐름에는 더 자연스럽다.
