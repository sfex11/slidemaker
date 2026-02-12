# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

슬라이드 SaaS - 기존 `svg-slide-maker` Claude Code 플러그인을 웹 기반 SaaS 서비스로 확장하는 프로젝트. URL, PDF, 마크다운을 아름다운 슬라이드로 변환하는 플랫폼 구축.

## 기술 스택 (계획)

### 프론트엔드
- Next.js 14 (App Router)
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion (애니메이션)
- TipTap (리치 텍스트 에디터)
- React DnD (드래그 앤 드롭)

### 백엔드
- Node.js 20 + TypeScript
- tRPC (타입 안전 API)
- Prisma ORM
- PostgreSQL
- Redis (캐싱, 세션)
- BullMQ (작업 큐)

### 외부 서비스
- GLM-5 (Z.ai API, 콘텐츠 변환)
- Stripe (결제)
- Resend (이메일)

## 핵심 아키텍처

### 슬라이드 생성 파이프라인
```
입력 소스 (URL/PDF/마크다운) → AI 처리 (GLM-5) → 템플릿 적용 → 출력 (HTML/SVG/PDF/PPTX)
```

### GLM-5 연결 설정
```typescript
// Z.ai API (OpenAI 호환)
const client = new OpenAI({
  apiKey: process.env.ZAI_API_KEY,
  baseURL: "https://api.z.ai/api/coding/paas/v4",
});

// 모델 설정
model: "glm-5"
context_window: 204800  // 200K 토큰
max_tokens: 131072      // 128K 토큰
```

참고: `../glm5_test.py`에서 Python 구현 예시 확인 가능

### 템플릿 시스템
CSS 변수 기반 13개 테마 변수로 라이트/다크 모드 지원:
- bg, surface, surface2, border, text, textDim
- accent, accent2, green, greenDim, orange, teal, pink

### 슬라이드 타입 매핑
| 콘텐츠 패턴 | 슬라이드 타입 |
|-------------|---------------|
| 제목 + 부제 | TitleSlide |
| 3개 항목 나열 | CardGrid cols={3} |
| A vs B 비교 | ComparisonSlide |
| 단계별 흐름 | TimelineSlide |
| 데이터/수치 | TableSlide |
| 인용문 | QuoteSlide |

## 데이터베이스 스키마 핵심

- **User**: 사용자 정보, 구독 상태
- **Project**: 프로젝트 (슬라이드 덱)
- **Slide**: 개별 슬라이드 (type, content JSON)
- **Template**: 템플릿 설정 (theme 변수, 폰트)
- **Export**: 내보내기 기록

## 개발 단계

1. **Phase 1 (MVP)**: 인증, URL/마크다운 → 슬라이드, 기본 템플릿, 편집기, HTML/PDF 내보내기
2. **Phase 2**: PDF 입력, AI 재작성, 프리미엄 템플릿, Stripe 결제, PPTX 내보내기
3. **Phase 3**: 팀 워크스페이스, 실시간 협업, 커스텀 브랜딩, API

## 참고 자산

기존 `svg-slide-maker` 플러그인 (`../svg-slide-maker/`)에서 활용 가능:
- `templates/default.html`: 기본 템플릿 (CSS 변수 시스템)
- `slide-tool.mjs`: 슬라이드 조작 CLI (백엔드 API로 래핑 예정)
- `references/`: 색상, 레이아웃, 애니메이션 레퍼런스
- `skills/`: 파이프라인 로직 (백엔드 워크플로우로 변환 예정)

## 언어 정책

- 한국어 기본
- 기술 용어, 제품명, 고유명사는 원어 유지
