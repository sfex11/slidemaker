# Slide Maker

AI 기반 프레젠테이션 생성/편집 SaaS입니다.

## Tech Stack

- Client: React 19, Vite, Tailwind CSS, React Router
- Server: Express (Bun runtime)
- DB: Prisma + SQLite
- AI: GLM-5(OpenAI SDK 호환 엔드포인트)

## Requirements

- Bun 1.3+
- Node.js 20+ (도구 호환용)

## Environment Variables

`.env` 또는 `.env.local`:

```bash
DATABASE_URL="file:./dev.db"
ZAI_API_KEY=""
CORS_ORIGIN="http://localhost:3000,http://127.0.0.1:3000"
```

- `ZAI_API_KEY`가 없으면 AI 생성은 기본 샘플 슬라이드로 폴백됩니다.

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
