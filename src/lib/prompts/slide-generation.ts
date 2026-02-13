/**
 * 슬라이드 생성 프롬프트 템플릿
 * 마크다운/URL 콘텐츠를 슬라이드 구조로 변환하는 프롬프트
 */

import type { SlideType } from "@/types/slide";

/**
 * 슬라이드 생성 요청 타입
 */
export interface SlideGenerationRequest {
  content: string;
  source: "url" | "markdown" | "text";
  options?: SlideGenerationOptions;
}

/**
 * 슬라이드 생성 옵션
 */
export interface SlideGenerationOptions {
  maxSlides?: number; // 최대 슬라이드 수 (기본값: 10)
  language?: "ko" | "en"; // 출력 언어 (기본값: "ko")
  style?: "professional" | "casual" | "creative"; // 스타일
  includeTitleSlide?: boolean; // 타이틀 슬라이드 포함 여부
}

/**
 * AI가 생성한 슬라이드 구조
 */
export interface GeneratedSlide {
  id: string;
  type: SlideType;
  title?: string;
  content: Record<string, unknown>;
  notes?: string; // 발표자 노트
}

/**
 * AI 응답 형식
 */
export interface GeneratedSlidesResponse {
  title: string; // 프레젠테이션 전체 제목
  description?: string; // 프레젠테이션 설명
  slides: GeneratedSlide[];
}

/**
 * 슬라이드 타입 설명 (프롬프트용)
 */
const SLIDE_TYPE_DESCRIPTIONS: Record<SlideType, string> = {
  title:
    "타이틀 슬라이드: 프레젠테이션의 시작을 알리는 슬라이드. title, subtitle(선택), presenter(선택), date(선택) 필드 포함",
  "card-grid":
    "카드 그리드 슬라이드: 2-4개의 항목을 나열하는 슬라이드. title(선택), cards 배열(각 카드는 title, description 포함), cols(2-4) 필드 포함",
  comparison:
    "비교 슬라이드: 두 가지를 비교하는 슬라이드. title(선택), leftSide/rightSide 객체(각각 title, items 배열 포함), vsText(선택) 필드 포함",
  timeline:
    "타임라인 슬라이드: 단계별 흐름을 보여주는 슬라이드. title(선택), items 배열(각 항목은 step, title, description 포함) 필드 포함",
  quote:
    "인용문 슬라이드: 중요한 인용문이나 핵심 문구를 강조. quote, author(선택), source(선택) 필드 포함",
  table:
    "테이블 슬라이드: 데이터/수치를 표 형태로 표시. title(선택), headers 배열, rows 배열(각 행은 cells 배열 포함) 필드 포함",
};

/**
 * 시스템 프롬프트 템플릿
 */
function getSystemPrompt(options: SlideGenerationOptions): string {
  const language = options.language || "ko";
  const langInstruction =
    language === "ko"
      ? "모든 텍스트는 한국어로 작성하세요."
      : "Write all text in English.";

  return `당신은 프레젠테이션 슬라이드를 생성하는 전문 AI 어시스턴트입니다.
주어진 콘텐츠를 분석하여 가장 적절한 형식의 슬라이드로 변환하세요.

## 슬라이드 타입 가이드

각 콘텐츠 패턴에 맞는 슬라이드 타입을 선택하세요:

1. **title**: 프레젠테이션의 시작, 새 섹션의 시작
2. **card-grid**: 2-4개의 관련 항목 나열, 기능 소개, 장점 설명
3. **comparison**: 두 가지 개념/제품/방법 비교, 장단점 대조
4. **timeline**: 단계별 프로세스, 역사적 흐름, 로드맵
5. **quote**: 중요한 인용문, 핵심 문구, 강조할 문장
6. **table**: 데이터 비교, 수치, 스펙 비교

## 슬라이드 타입 상세 명세

${Object.entries(SLIDE_TYPE_DESCRIPTIONS)
  .map(([type, desc]) => `- **${type}**: ${desc}`)
  .join("\n")}

## 슬라이드 구성 원칙

1. 첫 번째 슬라이드는 항상 타이틀 슬라이드여야 합니다.
2. 각 슬라이드는 하나의 핵심 메시지를 전달해야 합니다.
3. 텍스트는 간결하고 명확하게 작성하세요.
4. 너무 많은 정보를 한 슬라이드에 담지 마세요.
5. 시각적 계층 구조를 고려하세요.

## 출력 규칙

${langInstruction}
- JSON 형식으로만 응답하세요.
- 추가 설명이나 마크다운 코드 블록 표시 없이 순수 JSON만 출력하세요.
- 각 슬라이드에 고유한 id를 부여하세요 (예: "slide-1", "slide-2").
- 최대 ${options.maxSlides || 10}개 슬라이드를 생성하세요.`;
}

/**
 * 사용자 프롬프트 템플릿
 */
function getUserPrompt(
  content: string,
  source: "url" | "markdown" | "text",
  options: SlideGenerationOptions
): string {
  const language = options.language || "ko";
  const sourceDescription =
    source === "url"
      ? language === "ko"
        ? "다음은 웹 페이지에서 추출한 콘텐츠입니다."
        : "The following content was extracted from a web page."
      : source === "markdown"
        ? language === "ko"
          ? "다음은 마크다운 형식의 콘텐츠입니다."
          : "The following content is in markdown format."
        : language === "ko"
          ? "다음은 텍스트 콘텐츠입니다."
          : "The following is text content.";

  const instructionText =
    language === "ko"
      ? "위 콘텐츠를 바탕으로 프레젠테이션 슬라이드를 생성하세요."
      : "Generate presentation slides based on the content above.";

  const responseFormatText =
    language === "ko"
      ? `응답 형식:
{
  "title": "프레젠테이션 제목",
  "description": "프레젠테이션에 대한 간단한 설명 (선택)",
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "슬라이드 제목",
      "content": { ... },
      "notes": "발표자 노트 (선택)"
    }
  ]
}`
      : `Response format:
{
  "title": "Presentation Title",
  "description": "Brief description (optional)",
  "slides": [
    {
      "id": "slide-1",
      "type": "title",
      "title": "Slide Title",
      "content": { ... },
      "notes": "Speaker notes (optional)"
    }
  ]
}`;

  return `${sourceDescription}

---
${content}
---

${instructionText}

${responseFormatText}`;
}

/**
 * 슬라이드 생성 프롬프트 메시지 생성
 */
export function createSlideGenerationPrompt(
  request: SlideGenerationRequest
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const options = request.options || {};

  return [
    {
      role: "system",
      content: getSystemPrompt(options),
    },
    {
      role: "user",
      content: getUserPrompt(request.content, request.source, options),
    },
  ];
}

/**
 * 슬라이드 재작성/수정 프롬프트
 */
export function createSlideRewritePrompt(
  slide: GeneratedSlide,
  instruction: string,
  options: SlideGenerationOptions = {}
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const language = options.language || "ko";

  return [
    {
      role: "system",
      content: `당신은 프레젠테이션 슬라이드를 편집하는 AI 어시스턴트입니다.
사용자의 지시에 따라 슬라이드 콘텐츠를 수정하세요.
${
  language === "ko"
    ? "모든 텍스트는 한국어로 작성하세요."
    : "Write all text in English."
}
JSON 형식으로만 응답하세요.`,
    },
    {
      role: "user",
      content: `다음 슬라이드를 수정하세요:

현재 슬라이드:
${JSON.stringify(slide, null, 2)}

수정 지시사항: ${instruction}

수정된 슬라이드를 JSON 형식으로 반환하세요.`,
    },
  ];
}

/**
 * 슬라이드 추가 생성 프롬프트
 */
export function createAddSlidesPrompt(
  existingSlides: GeneratedSlide[],
  topic: string,
  count: number = 1,
  options: SlideGenerationOptions = {}
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const language = options.language || "ko";

  return [
    {
      role: "system",
      content: `당신은 프레젠테이션 슬라이드를 생성하는 AI 어시스턴트입니다.
기존 슬라이드와 자연스럽게 이어지는 새 슬라이드를 생성하세요.
${
  language === "ko"
    ? "모든 텍스트는 한국어로 작성하세요."
    : "Write all text in English."
}
JSON 배열 형식으로만 응답하세요.`,
    },
    {
      role: "user",
      content: `현재 프레젠테이션 슬라이드:

${existingSlides.map((s) => `- ${s.type}: ${s.title || "제목 없음"}`).join("\n")}

주제 "${topic}"에 대해 ${count}개의 추가 슬라이드를 생성하세요.
기존 슬라이드와 중복되지 않고 자연스럽게 이어지는 내용으로 작성하세요.

응답 형식 (JSON 배열):
[
  {
    "id": "slide-new-1",
    "type": "slide-type",
    "title": "슬라이드 제목",
    "content": { ... },
    "notes": "발표자 노트 (선택)"
  }
]`,
    },
  ];
}

/**
 * AI 응답 파싱
 */
export function parseGeneratedSlidesResponse(
  response: string
): GeneratedSlidesResponse {
  try {
    // JSON 블록 추출 시도
    let jsonString = response;

    // 마크다운 코드 블록에서 JSON 추출
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonString);

    // 응답 형식 검증
    if (!parsed.title || !Array.isArray(parsed.slides)) {
      throw new Error("유효하지 않은 응답 형식입니다.");
    }

    // 각 슬라이드 검증 및 정규화
    parsed.slides = parsed.slides.map((slide: GeneratedSlide, index: number) => ({
      id: slide.id || `slide-${index + 1}`,
      type: slide.type || "card-grid",
      title: slide.title,
      content: slide.content || {},
      notes: slide.notes,
    }));

    return parsed as GeneratedSlidesResponse;
  } catch (error) {
    throw new Error(
      `슬라이드 응답 파싱 실패: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`
    );
  }
}

/**
 * 슬라이드 타입 매핑 유틸리티
 * 콘텐츠 패턴을 분석하여 적절한 슬라이드 타입 결정
 */
export function determineSlideType(content: string): SlideType {
  const lowerContent = content.toLowerCase();

  // 비교 패턴 감지
  if (
    lowerContent.includes(" vs ") ||
    lowerContent.includes(" versus ") ||
    lowerContent.includes(" 비교") ||
    lowerContent.includes("장단점")
  ) {
    return "comparison";
  }

  // 타임라인/단계 패턴 감지
  if (
    lowerContent.includes("단계") ||
    lowerContent.includes("step") ||
    lowerContent.includes("단계별") ||
    /\d+\.\s/.test(content)
  ) {
    return "timeline";
  }

  // 인용문 패턴 감지
  if (
    content.includes('"') ||
    content.includes("'") ||
    lowerContent.includes("인용") ||
    lowerContent.includes("말했다")
  ) {
    return "quote";
  }

  // 테이블/데이터 패턴 감지
  if (
    lowerContent.includes("데이터") ||
    lowerContent.includes("수치") ||
    lowerContent.includes("통계") ||
    lowerContent.includes("%")
  ) {
    return "table";
  }

  // 기본값: 카드 그리드
  return "card-grid";
}
