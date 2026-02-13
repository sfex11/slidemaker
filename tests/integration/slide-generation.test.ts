/**
 * 슬라이드 생성 프롬프트 통합 테스트
 * GLM-5를 사용한 실제 슬라이드 생성 파이프라인을 검증합니다.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  createSlideGenerationPrompt,
  parseGeneratedSlidesResponse,
  determineSlideType,
} from "../../src/lib/prompts/slide-generation";

// 환경변수 직접 설정 (테스트용)
const ZAI_API_KEY = process.env.ZAI_API_KEY || "2c73023a16654857a6f49da0ff99a358.tJSWiUMF0wWsIAMP";

describe("슬라이드 생성 프롬프트 테스트", () => {
  it("URL 소스 프롬프트를 올바르게 생성한다", () => {
    const messages = createSlideGenerationPrompt({
      content: "테스트 콘텐츠입니다.",
      source: "url",
      options: { maxSlides: 5, language: "ko" },
    });

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("웹 페이지에서 추출한");
  });

  it("마크다운 소스 프롬프트를 올바르게 생성한다", () => {
    const messages = createSlideGenerationPrompt({
      content: "# 제목\n내용",
      source: "markdown",
      options: { language: "ko" },
    });

    expect(messages[1].content).toContain("마크다운 형식의 콘텐츠");
  });

  it("PDF 소스 프롬프트를 올바르게 생성한다", () => {
    const messages = createSlideGenerationPrompt({
      content: "PDF에서 추출된 텍스트",
      source: "pdf",
      options: { language: "ko" },
    });

    expect(messages[1].content).toContain("PDF 문서에서 추출한");
  });

  it("영어 프롬프트를 올바르게 생성한다", () => {
    const messages = createSlideGenerationPrompt({
      content: "Test content",
      source: "url",
      options: { language: "en" },
    });

    expect(messages[1].content).toContain("extracted from a web page");
  });

  it("시스템 프롬프트에 슬라이드 타입 가이드가 포함된다", () => {
    const messages = createSlideGenerationPrompt({
      content: "test",
      source: "markdown",
    });

    expect(messages[0].content).toContain("title");
    expect(messages[0].content).toContain("card-grid");
    expect(messages[0].content).toContain("comparison");
    expect(messages[0].content).toContain("timeline");
    expect(messages[0].content).toContain("quote");
    expect(messages[0].content).toContain("table");
  });
});

describe("AI 응답 파싱 테스트", () => {
  it("유효한 JSON 응답을 파싱한다", () => {
    const response = JSON.stringify({
      title: "테스트 프레젠테이션",
      description: "테스트입니다",
      slides: [
        {
          id: "slide-1",
          type: "title",
          title: "제목",
          content: { subtitle: "부제" },
        },
        {
          id: "slide-2",
          type: "card-grid",
          title: "주요 기능",
          content: { cards: [] },
        },
      ],
    });

    const result = parseGeneratedSlidesResponse(response);
    expect(result.title).toBe("테스트 프레젠테이션");
    expect(result.slides).toHaveLength(2);
    expect(result.slides[0].type).toBe("title");
  });

  it("마크다운 코드 블록으로 감싼 JSON을 파싱한다", () => {
    const response = '```json\n{"title": "테스트", "slides": [{"id": "s1", "type": "title", "title": "Hi", "content": {}}]}\n```';
    const result = parseGeneratedSlidesResponse(response);
    expect(result.title).toBe("테스트");
    expect(result.slides).toHaveLength(1);
  });

  it("유효하지 않은 JSON에서 에러를 던진다", () => {
    expect(() => parseGeneratedSlidesResponse("not json")).toThrow();
  });

  it("필수 필드 누락 시 에러를 던진다", () => {
    expect(() => parseGeneratedSlidesResponse('{"name": "test"}')).toThrow();
  });

  it("슬라이드 ID가 없으면 자동 생성한다", () => {
    const response = JSON.stringify({
      title: "테스트",
      slides: [
        { type: "title", title: "제목", content: {} },
      ],
    });

    const result = parseGeneratedSlidesResponse(response);
    expect(result.slides[0].id).toBe("slide-1");
  });
});

describe("슬라이드 타입 결정 유틸리티 테스트", () => {
  it("비교 키워드를 감지한다", () => {
    expect(determineSlideType("React vs Vue")).toBe("comparison");
    expect(determineSlideType("장단점 비교")).toBe("comparison");
  });

  it("타임라인 키워드를 감지한다", () => {
    expect(determineSlideType("1단계: 계획")).toBe("timeline");
    expect(determineSlideType("Step 1: Plan")).toBe("timeline");
  });

  it("인용문 패턴을 감지한다", () => {
    expect(determineSlideType('"인생은 짧다"')).toBe("quote");
  });

  it("데이터 패턴을 감지한다", () => {
    expect(determineSlideType("매출 데이터 30%")).toBe("table");
    expect(determineSlideType("통계 분석")).toBe("table");
  });

  it("기본값은 card-grid이다", () => {
    expect(determineSlideType("일반 텍스트")).toBe("card-grid");
  });
});

// Note: GLM-5 실제 API 테스트는 glm5-api.test.ts에서 Node 환경으로 실행합니다.
// jsdom 환경에서는 OpenAI SDK의 dangerouslyAllowBrowser 제한이 있습니다.
