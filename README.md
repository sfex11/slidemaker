# Slide Maker

AI 기반 프레젠테이션 생성/편집 SaaS입니다.

## Tech Stack

- Client: React 19, Vite, Tailwind CSS, React Router
- Server: Express (Bun runtime)
- DB: Prisma + SQLite
- AI: GLM-5(OpenAI SDK 호환 엔드포인트)
- SVG Deck Engine: `svg-slide-maker` templates + `slide-tool.mjs` 구조 호환

## Requirements

- Bun 1.3+
- Node.js 20+ (도구 호환용)

## Environment Variables

`.env` 또는 `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
ZAI_API_KEY=""
CORS_ORIGIN="http://localhost:3000,http://127.0.0.1:3000"
SVG_SLIDE_MAKER_ROOT="../svg-slide-maker"
ALLOWED_FILE_ROOTS="/home/ubuntu/slidemaker,/tmp"
```

- `ZAI_API_KEY`가 없으면 AI 생성은 기본 샘플 슬라이드로 폴백됩니다.
- `SVG_SLIDE_MAKER_ROOT`는 템플릿(`templates/*.html`)을 읽을 루트 경로입니다.
- `ALLOWED_FILE_ROOTS`는 `/api/generate/from-url`에서 허용할 서버 파일 경로 루트(쉼표 구분)입니다.

## Install

```bash
bun install
```

## Run (Development)

```bash
bun run dev
```

- Client: `http://localhost:3000`
- Server API: `http://localhost:3001`

## Build & Start

```bash
bun run build
bun run start
```

## Database

```bash
bun run db:generate
bun run db:push
```

## Test

```bash
bun run test        # unit
bun run test:e2e    # playwright
```

## SVG Slide Maker API

- `GET /api/svg/templates`
  - 사용 가능한 템플릿 목록 조회
- `POST /api/generate/from-url`
  - URL 또는 서버 파일 경로(`file://`, `/abs/path`, `./relative/path`) 입력 자동 감지
- `POST /api/projects/:id/export/html`
  - 프로젝트 슬라이드를 템플릿 기반 HTML deck으로 내보내기
  - body 예시: `{ "templateId": "default" }`

## Project Structure

```text
src/
  client/            # Vite React 앱
  server/            # Express API 서버
  components/
    slide-editor/    # 슬라이드 편집 UI
    ui/              # 공용 UI 컴포넌트
  lib/               # 유틸리티
prisma/
  schema.prisma      # DB 스키마
```
