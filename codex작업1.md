# Codex 작업 1 (재개발 갱신)

## 요청 정리

- 기존 편집기 중심 구조를 사실상 무시하고,
- `/Users/chulhyunhwang/Documents/claude/slide_saas/svg-slide-maker` 스킬을 웹서비스로 재정렬,
- 핵심 기능을 **자동 생성(무편집)** 으로 고정:
  - 입력: 웹주소(URL), PDF, 마크다운
  - 출력: HTML 슬라이드 자동 생성 + 즉시 미리보기/다운로드

## 계획 문서 갱신

- `codex계획2.md`를 재작성하여 P0를 아래로 고정:
  - URL/PDF/Markdown 기반 자동 생성
  - 편집 기능은 P1 이후(선택 기능)

## 서버 재개발

적용 파일:
- `src/server/index.ts`
- `src/server/svg-deck.ts` (기존 구현 연동 유지)

핵심 변경:
1. 인증/세션
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- 토큰 세션 TTL 및 만료 정리

2. 자동 생성 전용 API
- `POST /api/generate/from-url`
- `POST /api/generate/from-pdf`
- `POST /api/generate/from-markdown`

3. URL/PDF 입력 처리
- URL: SSRF 방어(내부망/루프백/사설 IP 차단, DNS 재검증)
- URL: HTML만 허용, 과도한 응답 크기 차단
- PDF: `pdf-parse` 기반 텍스트 추출 + 크기 제한(8MB)

4. 생성/내보내기
- 사용자별 생성 동시성 락
- `POST /api/projects/:id/export/html`
- `GET /api/projects/:id/html`
- 템플릿 목록 `GET /api/svg/templates`

5. 프로젝트 관리
- `GET /api/projects`, `GET /api/projects/:id`, `DELETE /api/projects/:id`

## 프론트 전면 재개발

적용 파일:
- `src/client/App.tsx`
- `src/client/index.css`

핵심 변경:
1. 기존 편집기 중심 UI 제거
- 슬라이드 캔버스 편집 흐름을 제거하고 자동 생성 퍼널로 교체

2. 신규 UX 흐름
- 로그인
- 입력 방식 선택(URL/PDF/Markdown)
- 템플릿 선택
- 자동 생성 실행
- 자동 HTML 미리보기(iframe)
- HTML 다운로드
- 생성 히스토리(재미리보기/다운로드/삭제)

3. 디자인 리빌드
- 신규 타이포/컬러/배경/글래스 패널 기반 UI
- 반응형 레이아웃(모바일/데스크톱)
- 생성 상태/성공/오류 피드백 애니메이션

## 테스트/실행환경 정렬

적용 파일:
- `tests/e2e/app.e2e.ts`
- `playwright.config.ts`
- `vite.config.ts`

변경 내용:
1. E2E 시나리오를 신규 UI 기준으로 교체
- 로그인 화면 노출
- 신규 사용자 로그인 후 자동 생성 화면 진입
- URL/PDF/Markdown 모드 전환

2. 로컬 실행 안정화
- Playwright/Vite 주소를 `127.0.0.1`로 정렬

## 의존성

적용 파일:
- `package.json`
- `bun.lock`

추가:
- `pdf-parse`

## 검증 결과

실행 및 통과:
1. `npx tsc --noEmit` ✅
2. `bun run test` ✅
3. `bun run build` ✅
4. `bun run test:e2e` ✅ (3 passed)

## 현재 결과 요약

- 이제 서비스의 중심 기능은 **입력 문서 → LLM 분석 → HTML 슬라이드 자동 생성** 입니다.
- 사용자는 편집 없이 결과를 바로 확인/다운로드할 수 있습니다.
- 기존 편집기 중심 흐름은 메인 동선에서 제거되었습니다.
