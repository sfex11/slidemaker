# Codex 작업 1

## 작업 개요

요청하신 우선순위에 따라 아래 순서로 전체 개선을 완료했습니다.

1. 보안 개선 (소유권 검증, SSRF 방어, 세션/CORS 강화)
2. 프론트 구조/타입 정리
3. 테스트 체계 복구
4. 문서(README) 교체

## 1) 보안 개선

### 소유권 검증(IDOR 방지)

- 프로젝트 수정/삭제 시 로그인 사용자 소유 여부 확인 후 처리
- 슬라이드 수정/삭제 시 프로젝트 소유자 기준으로 권한 확인

적용 파일:
- `src/server/index.ts`

주요 위치:
- `app.put('/api/projects/:id')`
- `app.delete('/api/projects/:id')`
- `app.put('/api/slides/:id')`
- `app.delete('/api/slides/:id')`

### SSRF 방어

- URL 입력에 대해 다음 검증 추가:
  - `http/https`만 허용
  - `localhost`, `.local`, 사설/루프백 IP 차단
  - DNS lookup 결과가 내부망이면 차단
  - fetch 이후 최종 응답 URL도 재검증
  - HTML 응답만 허용, 과대 응답 크기 제한

적용 파일:
- `src/server/index.ts`

### 세션/CORS 강화

- 세션 토큰 생성 방식 개선: `crypto.randomBytes(32)` 사용
- 만료 세션 정리 루프 추가
- CORS 허용 출처 제한(`CORS_ORIGIN` 환경변수 기반)

적용 파일:
- `src/server/index.ts`

## 2) 프론트 구조/타입 정리

### 중복 에디터 구현 제거

- `App.tsx` 내부의 중복 `EnhancedSlideEditor/Canvas/PropertiesPanel` 제거
- 단일 `SlideEditor` 경로로 통합

적용 파일:
- `src/client/App.tsx`

### SlideEditor 재작성

- 서버에서 받은 `projectId/projectName/slides`를 입력으로 처리
- 로컬 편집 상태 동기화
- 드래그 정렬 이벤트 타입 정리(`DragEndEvent`)
- 슬라이드 업데이트 콜백 정리

적용 파일:
- `src/components/slide-editor/slide-editor.tsx`

### Canvas 타입 안정화

- `unknown` 값을 직접 렌더링하지 않도록 문자열 변환 헬퍼 도입
- 슬라이드별 렌더링 분기에서 안전한 텍스트 처리

적용 파일:
- `src/components/slide-editor/canvas.tsx`

### 기타 정리

- 미사용 import/변수 정리
- alias/컴파일 범위 정리

적용 파일:
- `src/components/slide-editor/sortable-slide-item.tsx`
- `src/components/slide-editor/sortable-slide-list.tsx`
- `src/components/slide-editor/toolbar.tsx`
- `tsconfig.json`

## 3) 테스트 체계 복구

### 단위 테스트

- `bun test`에서 바로 실행되도록 테스트를 의존성 최소화 형태로 정리
- `tests/setup.ts`를 현재 테스트 환경 기준으로 간소화

적용 파일:
- `tests/unit/react.test.tsx`
- `tests/setup.ts`

### E2E 테스트

- 기존 앱과 맞지 않는 E2E 스펙 제거
- 현재 라우트/플로우 기준 E2E 재작성
- Playwright 설정에서 `*.e2e.ts`만 대상으로 제한

적용 파일:
- `tests/e2e/app.e2e.ts` (신규)
- `playwright.config.ts`
- 삭제: `tests/e2e/app.spec.ts`, `tests/e2e/deep.spec.ts`, `tests/e2e/example.spec.ts`

### 스크립트/의존성

- 테스트 스크립트 추가:
  - `test`
  - `test:unit`
  - `test:e2e`
- `@playwright/test` 추가 및 lockfile 반영

적용 파일:
- `package.json`
- `bun.lock`

## 4) 문서 교체

- Next.js 템플릿 README 삭제
- 실제 스택(Vite + Express + Bun + Prisma) 기준 README 작성

적용 파일:
- `README.md`

## 빌드/검증 결과

실행 및 통과:

1. `npx tsc --noEmit` ✅
2. `bun run test` ✅
3. `bun run build` ✅
4. `bun run test:e2e` ✅ (3 passed)

## 변경 파일 요약

- 보안/서버: `src/server/index.ts`
- 앱/에디터: `src/client/App.tsx`, `src/components/slide-editor/*`
- 타입/빌드 설정: `tsconfig.json`, `tailwind.config.js`
- 테스트: `tests/setup.ts`, `tests/unit/react.test.tsx`, `tests/e2e/app.e2e.ts`, `playwright.config.ts`
- 의존성/스크립트: `package.json`, `bun.lock`
- 문서: `README.md`
