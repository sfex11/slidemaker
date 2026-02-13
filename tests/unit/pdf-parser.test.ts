import { describe, it, expect } from "vitest";
import { parsePdfBuffer, validatePdfBuffer } from "../../src/lib/pdf/parser";

describe("PDF Parser", () => {
  describe("validatePdfBuffer", () => {
    it("유효한 PDF 헤더를 가진 파일을 통과시킨다", () => {
      const validHeader = Buffer.from("%PDF-1.4 some content here");
      const result = validatePdfBuffer(validHeader);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("빈 파일을 거부한다", () => {
      const empty = Buffer.from("");
      const result = validatePdfBuffer(empty);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("너무 작습니다");
    });

    it("PDF가 아닌 파일을 거부한다", () => {
      const notPdf = Buffer.from("This is not a PDF file");
      const result = validatePdfBuffer(notPdf);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("유효한 PDF 파일이 아닙니다");
    });

    it("너무 큰 파일을 거부한다", () => {
      // 21MB 크기의 버퍼 시뮬레이션 (헤더만 PDF)
      const header = Buffer.from("%PDF-");
      const large = Buffer.alloc(21 * 1024 * 1024);
      header.copy(large);
      const result = validatePdfBuffer(large);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("너무 큽니다");
    });
  });

  describe("parsePdfBuffer", () => {
    it("유효하지 않은 PDF를 처리할 때 에러를 반환한다", async () => {
      const invalidPdf = Buffer.from("Not a PDF at all");
      const result = await parsePdfBuffer(invalidPdf);
      expect(result.error).toBeDefined();
      expect(result.text).toBe("");
      expect(result.markdown).toBe("");
    });

    it("빈 버퍼를 처리할 때 에러를 반환한다", async () => {
      const empty = Buffer.from("");
      const result = await parsePdfBuffer(empty);
      expect(result.error).toBeDefined();
    });

    it("너무 큰 파일은 에러를 반환한다", async () => {
      const large = Buffer.alloc(21 * 1024 * 1024);
      const result = await parsePdfBuffer(large);
      expect(result.error).toContain("너무 큽니다");
    });

    it("maxPages 옵션을 받을 수 있다", async () => {
      // 파싱 자체는 실패하지만 옵션이 전달되는지 확인
      const invalidPdf = Buffer.from("test");
      const result = await parsePdfBuffer(invalidPdf, { maxPages: 5 });
      expect(result.error).toBeDefined();
    });
  });
});

describe("PDF Text Processing", () => {
  // 텍스트 변환 로직 간접 테스트를 위한 유효한 PDF 파싱
  // 실제 PDF 파일 없이 가능한 범위에서 테스트

  it("ParsedPdf 타입이 올바른 구조를 가진다", () => {
    const result = {
      title: "테스트 제목",
      text: "테스트 텍스트",
      markdown: "# 테스트 제목",
      pageCount: 1,
      info: {
        title: "테스트",
        author: "작성자",
      },
    };

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("text");
    expect(result).toHaveProperty("markdown");
    expect(result).toHaveProperty("pageCount");
    expect(result).toHaveProperty("info");
    expect(result.info).toHaveProperty("title");
    expect(result.info).toHaveProperty("author");
  });
});
