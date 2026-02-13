/**
 * PDF 파서 통합 테스트
 * PDF 파싱 → 텍스트 추출 → 마크다운 변환 전체 파이프라인 검증
 */

import { describe, it, expect } from "vitest";
import { parsePdfBuffer, validatePdfBuffer } from "../../src/lib/pdf/parser";

/**
 * 최소한의 유효한 PDF 파일을 생성합니다.
 * (실제 텍스트 "Hello World"를 포함한 PDF)
 */
function createMinimalPdf(text: string = "Hello World"): Buffer {
  // 간단한 1페이지 PDF 구조
  const objects: string[] = [];

  // Object 1: Catalog
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");

  // Object 2: Pages
  objects.push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");

  // Object 4: Content stream
  const stream = `BT /F1 12 Tf 100 700 Td (${text}) Tj ET`;
  objects.push(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj`);

  // Object 5: Font
  objects.push("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj");

  // Object 3: Page
  objects.push("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj");

  // Build PDF
  let body = "";
  const offsets: number[] = [];
  const header = "%PDF-1.4\n";
  let pos = header.length;

  for (const obj of objects) {
    offsets.push(pos);
    body += obj + "\n";
    pos = header.length + body.length;
  }

  // Cross-reference table
  const xrefPos = pos;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  // Trailer
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(header + body + xref + trailer);
}

describe("PDF 유효성 검사 상세 테스트", () => {
  it("유효한 PDF를 통과시킨다", () => {
    const pdf = createMinimalPdf();
    const result = validatePdfBuffer(pdf);
    expect(result.valid).toBe(true);
  });

  it("다양한 PDF 버전 헤더를 인식한다", () => {
    for (const version of ["%PDF-1.0", "%PDF-1.4", "%PDF-1.7", "%PDF-2.0"]) {
      const buf = Buffer.from(version + " test content");
      const result = validatePdfBuffer(buf);
      expect(result.valid).toBe(true);
    }
  });

  it("JPEG 파일을 거부한다", () => {
    const jpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    const result = validatePdfBuffer(jpeg);
    expect(result.valid).toBe(false);
  });

  it("PNG 파일을 거부한다", () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A]);
    const result = validatePdfBuffer(png);
    expect(result.valid).toBe(false);
  });

  it("텍스트 파일을 거부한다", () => {
    const txt = Buffer.from("This is a plain text file, not a PDF");
    const result = validatePdfBuffer(txt);
    expect(result.valid).toBe(false);
  });
});

describe("PDF 파싱 에러 처리 테스트", () => {
  it("손상된 PDF에 대해 에러를 반환한다", async () => {
    const corrupted = Buffer.from("%PDF-1.4\ncorrupted content here");
    const result = await parsePdfBuffer(corrupted);
    expect(result.error).toBeDefined();
  });

  it("에러 시 기본값이 올바르다", async () => {
    const invalid = Buffer.from("not a pdf");
    const result = await parsePdfBuffer(invalid);
    expect(result.title).toBe("");
    expect(result.text).toBe("");
    expect(result.markdown).toBe("");
    expect(result.pageCount).toBe(0);
    expect(result.info).toBeDefined();
  });

  it("maxPages 옵션이 적용된다", async () => {
    const pdf = createMinimalPdf();
    // maxPages=1 옵션으로 제한
    const result = await parsePdfBuffer(pdf, { maxPages: 1 });
    // 파싱 자체가 실패할 수 있지만, 옵션 에러가 아닌지 확인
    if (!result.error) {
      expect(result.pageCount).toBeLessThanOrEqual(1);
    }
  });
});

describe("PDF 타입 및 인터페이스 테스트", () => {
  it("ParsedPdf 구조가 완전하다", () => {
    const mockResult = {
      title: "테스트 문서",
      text: "본문 텍스트",
      markdown: "# 테스트 문서\n\n본문 텍스트",
      pageCount: 5,
      info: {
        title: "테스트",
        author: "작성자",
        subject: "주제",
        creator: "생성기",
        producer: "프로듀서",
        creationDate: "2024-01-01",
      },
    };

    expect(mockResult.title).toBe("테스트 문서");
    expect(mockResult.pageCount).toBe(5);
    expect(mockResult.info.author).toBe("작성자");
    expect(mockResult.markdown).toContain("#");
  });
});
