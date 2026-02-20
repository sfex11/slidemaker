# 슬라이드 스킬 핵심 정리

## 1) 수집 범위
- source-prep: 입력 소스(URL/PDF/파일/텍스트) → 번역/정리된 Markdown
- slide-writer: Markdown → HTML/SVG 슬라이드 생성
- template-maker: 템플릿(디자인 시스템/구조/상호작용) 설계 및 검증
- make-deck: 사용자 검토/승인을 포함한 end-to-end 생성 파이프라인

## 2) 공통 규칙 (Rules)
- 언어 일관성: 사용자 언어 기준으로 통일, 고유명사는 원문 유지
- 의미 중심 변환: 단순 문자열 치환이 아니라 문맥/의미 기반 구조화
- 1 slide = 1 concept: 슬라이드 과밀 방지
- 템플릿 계약 준수: 필수 DOM/클래스/JS 함수 유지
- 사후 정합성 보정: 생성 후 fix 단계로 overview/page/active 정리
- Human-in-the-loop: 최종 생성 전 중간 산출물 검토/승인

## 3) 공통 패턴 (Patterns)
- Pipeline: Source → Markdown → (Condensed Brief) → Slides
- Semantic Mapping: 문서 패턴(비교/절차/표/인용/흐름)을 슬라이드 타입으로 매핑
- Contract-first: 템플릿 스켈레톤/토큰/함수 계약을 먼저 고정
- Quality Loop: 생성 → 평가 → 보정 → 재평가

## 4) 품질 기준 (Quality Criteria)
- 콘텐츠 정확성: 사실/수치/출처 유지
- 구조 품질: 논리 흐름, 중복 최소화, 섹션-슬라이드 대응
- 가독성: 제목/본문 길이 제어, 항목 수 제한, 한 슬라이드 한 메시지
- 시각 일관성: 토큰(색/폰트/간격) 준수, 대비 확보
- 상호작용 완성도: 키보드 이동, 오버뷰, 프린트 모드 정상
- 운영 안정성: 생성 실패 시 폴백, 자동 보정, 재현 가능한 출력

## 5) slide-maker에 바로 적용할 핵심
- Markdown 구조 파싱 강화(H2/목록/표/인용/절차)
- 슬라이드 타입 자동 매핑 룰 고도화
- 품질 점수 기반 자동 보정(Self-healing) 루프 추가
- 생성 결과 품질 리포트(구조/가독성/다양성) 표준화
- 템플릿 계약 검증 및 후처리 fix 자동화
