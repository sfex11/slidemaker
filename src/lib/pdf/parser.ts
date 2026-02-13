/**
 * PDF 파싱 유틸리티
 * PDF 파일에서 텍스트를 추출하고 마크다운으로 변환합니다.
 */

import pdfParse from "pdf-parse";

/**
 * PDF 파싱 결과
 */
export interface ParsedPdf {
  title: string;
  text: string;
  markdown: string;
  pageCount: number;
  info: PdfInfo;
  error?: string;
}

/**
 * PDF 메타데이터
 */
export interface PdfInfo {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
}

/**
 * PDF 파싱 옵션
 */
export interface PdfParseOptions {
  maxPages?: number; // 최대 파싱 페이지 수 (기본값: 50)
}

/**
 * PDF 파일 크기 제한 (20MB)
 */
const MAX_PDF_SIZE = 20 * 1024 * 1024;

/**
 * PDF Buffer를 파싱하여 텍스트를 추출합니다.
 */
export async function parsePdfBuffer(
  buffer: Buffer,
  options: PdfParseOptions = {}
): Promise<ParsedPdf> {
  const { maxPages = 50 } = options;

  try {
    // 파일 크기 검증
    if (buffer.length > MAX_PDF_SIZE) {
      return {
        title: "",
        text: "",
        markdown: "",
        pageCount: 0,
        info: {},
        error: `PDF 파일이 너무 큽니다. 최대 ${MAX_PDF_SIZE / 1024 / 1024}MB까지 지원합니다.`,
      };
    }

    // pdf-parse 옵션
    const parseOptions: pdfParse.Options = {
      max: maxPages,
    };

    const data = await pdfParse(buffer, parseOptions);

    // 메타데이터 추출
    const info: PdfInfo = {};
    if (data.info) {
      info.title = data.info.Title || undefined;
      info.author = data.info.Author || undefined;
      info.subject = data.info.Subject || undefined;
      info.creator = data.info.Creator || undefined;
      info.producer = data.info.Producer || undefined;
      info.creationDate = data.info.CreationDate || undefined;
    }

    // 텍스트 정리
    const cleanedText = cleanPdfText(data.text);

    // 제목 추출
    const title = info.title || extractTitleFromText(cleanedText);

    // 마크다운 변환
    const markdown = convertTextToMarkdown(cleanedText, title);

    return {
      title,
      text: cleanedText,
      markdown,
      pageCount: data.numpages,
      info,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      title: "",
      text: "",
      markdown: "",
      pageCount: 0,
      info: {},
      error: `PDF 파싱 실패: ${errorMessage}`,
    };
  }
}

/**
 * PDF에서 추출한 텍스트를 정리합니다.
 */
function cleanPdfText(text: string): string {
  let cleaned = text;

  // 과도한 공백 정리
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  // 페이지 번호 패턴 제거 (줄 단독 숫자)
  cleaned = cleaned.replace(/^\s*\d+\s*$/gm, "");

  // 과도한 빈 줄 정리 (3줄 이상 → 2줄)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // 머리글/바닥글 반복 패턴 제거 (동일 텍스트가 여러 번 나타나는 경우)
  cleaned = removeRepeatedHeaders(cleaned);

  // 앞뒤 공백 제거
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * 반복되는 머리글/바닥글을 제거합니다.
 */
function removeRepeatedHeaders(text: string): string {
  const lines = text.split("\n");
  const lineCount = new Map<string, number>();

  // 각 줄의 출현 횟수 카운트
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0 && trimmed.length < 100) {
      lineCount.set(trimmed, (lineCount.get(trimmed) || 0) + 1);
    }
  }

  // 5회 이상 반복되는 짧은 줄은 머리글/바닥글로 판단하여 제거
  const repeatedLines = new Set<string>();
  for (const [line, count] of lineCount) {
    if (count >= 5 && line.length < 80) {
      repeatedLines.add(line);
    }
  }

  if (repeatedLines.size === 0) return text;

  return lines
    .filter((line) => !repeatedLines.has(line.trim()))
    .join("\n");
}

/**
 * 텍스트에서 제목을 추출합니다.
 */
function extractTitleFromText(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length === 0) return "제목 없음";

  // 첫 번째 의미 있는 줄을 제목으로 사용
  const firstLine = lines[0].trim();

  // 제목이 너무 길면 잘라내기
  if (firstLine.length > 100) {
    return firstLine.substring(0, 100) + "...";
  }

  return firstLine;
}

/**
 * 추출된 텍스트를 마크다운으로 변환합니다.
 */
function convertTextToMarkdown(text: string, title: string): string {
  const lines = text.split("\n");
  const markdownLines: string[] = [];

  // 제목 추가
  markdownLines.push(`# ${title}`);
  markdownLines.push("");

  let inList = false;
  let prevLineEmpty = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 빈 줄 처리
    if (line.length === 0) {
      if (!prevLineEmpty) {
        markdownLines.push("");
        prevLineEmpty = true;
      }
      inList = false;
      continue;
    }
    prevLineEmpty = false;

    // 제목과 동일한 줄은 건너뛰기
    if (i < 3 && line === title) continue;

    // 섹션 제목 감지 (대문자로만 이루어진 짧은 줄, 또는 숫자로 시작하는 제목)
    if (isSectionHeading(line, lines[i + 1])) {
      markdownLines.push(`## ${line}`);
      markdownLines.push("");
      continue;
    }

    // 리스트 항목 감지
    const listMatch = line.match(/^[•·\-–—]\s*(.+)$/);
    const numberedListMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (listMatch) {
      markdownLines.push(`- ${listMatch[1]}`);
      inList = true;
      continue;
    }

    if (numberedListMatch) {
      markdownLines.push(`- ${numberedListMatch[1]}`);
      inList = true;
      continue;
    }

    // 일반 텍스트
    if (inList && !line.startsWith(" ")) {
      inList = false;
      markdownLines.push("");
    }

    markdownLines.push(line);
  }

  return markdownLines.join("\n").trim();
}

/**
 * 섹션 제목인지 판단합니다.
 */
function isSectionHeading(line: string, nextLine?: string): boolean {
  // 너무 길면 제목이 아님
  if (line.length > 80) return false;

  // 마침표로 끝나면 제목이 아님
  if (line.endsWith(".") || line.endsWith(",")) return false;

  // 전부 대문자인 경우 (영문)
  if (/^[A-Z\s\d]+$/.test(line) && line.length > 3 && line.length < 60) {
    return true;
  }

  // 숫자 + 점 + 텍스트 패턴 (예: "1. 소개", "2. 방법론")
  if (/^\d+\.\s+[^\d]/.test(line) && line.length < 60) {
    // 다음 줄이 비어있으면 제목일 가능성 높음
    if (!nextLine || nextLine.trim().length === 0) {
      return true;
    }
  }

  return false;
}

/**
 * PDF 파일의 유효성을 검사합니다.
 */
export function validatePdfBuffer(buffer: Buffer): {
  valid: boolean;
  error?: string;
} {
  // PDF 매직 넘버 확인 (%PDF-)
  if (buffer.length < 5) {
    return { valid: false, error: "파일이 너무 작습니다." };
  }

  const header = buffer.subarray(0, 5).toString("ascii");
  if (header !== "%PDF-") {
    return { valid: false, error: "유효한 PDF 파일이 아닙니다." };
  }

  // 파일 크기 확인
  if (buffer.length > MAX_PDF_SIZE) {
    return {
      valid: false,
      error: `PDF 파일이 너무 큽니다. 최대 ${MAX_PDF_SIZE / 1024 / 1024}MB까지 지원합니다.`,
    };
  }

  return { valid: true };
}
