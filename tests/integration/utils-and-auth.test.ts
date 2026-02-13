/**
 * 인증 모듈 통합 테스트
 * 세션 관리, API 유틸리티, 미들웨어 검증
 */

import { describe, it, expect } from "vitest";
import {
  isValidUrl,
  normalizeUrl,
  extractPlainText,
} from "../../src/lib/scraper";

describe("URL 유틸리티 테스트", () => {
  it("유효한 URL을 인식한다", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("https://example.com/path/to/page")).toBe(true);
    expect(isValidUrl("https://example.com/search?q=test")).toBe(true);
  });

  it("유효하지 않은 URL을 거부한다", () => {
    expect(isValidUrl("not-a-url")).toBe(false);
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("URL을 정규화한다", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});

describe("텍스트 추출 유틸리티 테스트", () => {
  it("마크다운 문법을 제거한다", () => {
    const md = "# 제목\n**굵은** 텍스트\n- 리스트\n[링크](https://example.com)";
    const plain = extractPlainText(md);
    expect(plain).not.toContain("#");
    expect(plain).not.toContain("**");
    expect(plain).not.toContain("-");
    expect(plain).toContain("굵은");
    expect(plain).toContain("링크");
    expect(plain).not.toContain("https://example.com");
  });

  it("코드 블록을 제거한다", () => {
    const md = "텍스트\n```js\nconsole.log('hi')\n```\n더 많은 텍스트";
    const plain = extractPlainText(md);
    expect(plain).not.toContain("console.log");
    expect(plain).toContain("텍스트");
  });

  it("이미지를 제거한다", () => {
    const md = "앞 텍스트 ![이미지](https://img.com/pic.jpg) 뒤 텍스트";
    const plain = extractPlainText(md);
    expect(plain).not.toContain("![");
    expect(plain).toContain("앞 텍스트");
    expect(plain).toContain("뒤 텍스트");
  });

  it("인라인 코드를 제거한다", () => {
    const md = "변수 `x`의 값은 `10`입니다";
    const plain = extractPlainText(md);
    expect(plain).not.toContain("`");
    expect(plain).toContain("변수");
  });
});

describe("테마 시스템 테스트", () => {
  it("기본 테마를 로드할 수 있다", async () => {
    const { defaultTheme } = await import("../../src/lib/themes/default");
    expect(defaultTheme).toBeDefined();
    expect(defaultTheme).toHaveProperty("name");
    expect(defaultTheme).toHaveProperty("light");
    expect(defaultTheme).toHaveProperty("dark");
    expect(defaultTheme.light).toHaveProperty("bg");
    expect(defaultTheme.light).toHaveProperty("accent");
  });

  it("포레스트 테마를 로드할 수 있다", async () => {
    const { forestTheme } = await import("../../src/lib/themes/forest");
    expect(forestTheme).toBeDefined();
    expect(forestTheme).toHaveProperty("name");
  });

  it("오션 테마를 로드할 수 있다", async () => {
    const { oceanTheme } = await import("../../src/lib/themes/ocean");
    expect(oceanTheme).toBeDefined();
    expect(oceanTheme).toHaveProperty("name");
  });

  it("테마 인덱스에서 모든 테마를 내보낸다", async () => {
    const themes = await import("../../src/lib/themes/index");
    expect(themes).toBeDefined();
  });
});

describe("슬라이드 타입 시스템 테스트", () => {
  it("모든 슬라이드 타입이 정의되어 있다", async () => {
    const { generateSlidesFromMarkdown, getSlideIcon } = await import(
      "../../src/lib/slide-generator"
    );

    const types = ["title", "card-grid", "comparison", "timeline", "quote", "table"];
    for (const type of types) {
      const icon = getSlideIcon(type as "title" | "card-grid" | "comparison" | "timeline" | "quote" | "table");
      expect(icon).toBeTruthy();
    }
  });
});
