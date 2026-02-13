/**
 * 마크다운 파서
 * 마크다운 텍스트를 토큰으로 변환합니다.
 * 외부 의존성 없이 순수 TypeScript로 구현되었습니다.
 */

// 마크다운 토큰 타입
export type MarkdownTokenType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "paragraph"
  | "unordered_list"
  | "ordered_list"
  | "list_item"
  | "blockquote"
  | "code_block"
  | "inline_code"
  | "horizontal_rule"
  | "table"
  | "table_header"
  | "table_row"
  | "table_cell"
  | "text"
  | "bold"
  | "italic"
  | "link"
  | "image";

// 기본 토큰 인터페이스
export interface BaseToken {
  type: MarkdownTokenType;
  raw: string;
  children?: MarkdownToken[];
}

// 텍스트 토큰
export interface TextToken extends BaseToken {
  type: "text";
  content: string;
}

// 제목 토큰
export interface HeadingToken extends BaseToken {
  type:
    | "heading1"
    | "heading2"
    | "heading3"
    | "heading4"
    | "heading5"
    | "heading6";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: string;
}

// 단락 토큰
export interface ParagraphToken extends BaseToken {
  type: "paragraph";
  content: string;
}

// 리스트 토큰
export interface ListToken extends BaseToken {
  type: "unordered_list" | "ordered_list";
  ordered: boolean;
  items: ListItemToken[];
}

// 리스트 아이템 토큰
export interface ListItemToken extends BaseToken {
  type: "list_item";
  content: string;
  index?: number; // 순서 있는 리스트의 경우
}

// 인용문 토큰
export interface BlockquoteToken extends BaseToken {
  type: "blockquote";
  content: string;
  author?: string;
}

// 코드 블록 토큰
export interface CodeBlockToken extends BaseToken {
  type: "code_block";
  code: string;
  language?: string;
}

// 수평선 토큰
export interface HorizontalRuleToken extends BaseToken {
  type: "horizontal_rule";
}

// 테이블 토큰
export interface TableToken extends BaseToken {
  type: "table";
  headers: string[];
  rows: string[][];
  alignments: ("left" | "center" | "right")[];
}

// 링크 토큰
export interface LinkToken extends BaseToken {
  type: "link";
  text: string;
  url: string;
}

// 이미지 토큰
export interface ImageToken extends BaseToken {
  type: "image";
  alt: string;
  url: string;
}

// 통합 토큰 타입
export type MarkdownToken =
  | TextToken
  | HeadingToken
  | ParagraphToken
  | ListToken
  | ListItemToken
  | BlockquoteToken
  | CodeBlockToken
  | HorizontalRuleToken
  | TableToken
  | LinkToken
  | ImageToken;

// 파싱 결과
export interface ParseResult {
  tokens: MarkdownToken[];
  raw: string;
}

/**
 * 마크다운 파서 클래스
 */
export class MarkdownParser {
  private lines: string[] = [];
  private currentIndex = 0;

  /**
   * 마크다운 텍스트를 파싱합니다.
   */
  parse(markdown: string): ParseResult {
    this.lines = markdown.split("\n");
    this.currentIndex = 0;
    const tokens: MarkdownToken[] = [];

    while (this.currentIndex < this.lines.length) {
      const token = this.parseNextToken();
      if (token) {
        tokens.push(token);
      }
    }

    return {
      tokens,
      raw: markdown,
    };
  }

  /**
   * 다음 토큰을 파싱합니다.
   */
  private parseNextToken(): MarkdownToken | null {
    if (this.currentIndex >= this.lines.length) {
      return null;
    }

    const line = this.lines[this.currentIndex];

    // 빈 줄 스킵
    if (line.trim() === "") {
      this.currentIndex++;
      return null;
    }

    // 코드 블록 확인
    if (line.trim().startsWith("```")) {
      return this.parseCodeBlock();
    }

    // 수평선 확인
    if (this.isHorizontalRule(line)) {
      this.currentIndex++;
      return {
        type: "horizontal_rule",
        raw: line,
      } as HorizontalRuleToken;
    }

    // 테이블 확인
    if (this.isTableStart(line)) {
      return this.parseTable();
    }

    // 제목 확인
    const heading = this.parseHeading(line);
    if (heading) {
      this.currentIndex++;
      return heading;
    }

    // 인용문 확인
    if (line.trim().startsWith(">")) {
      return this.parseBlockquote();
    }

    // 순서 없는 리스트 확인
    if (this.isUnorderedListItem(line)) {
      return this.parseUnorderedList();
    }

    // 순서 있는 리스트 확인
    if (this.isOrderedListItem(line)) {
      return this.parseOrderedList();
    }

    // 일반 단락
    return this.parseParagraph();
  }

  /**
   * 제목을 파싱합니다.
   */
  private parseHeading(line: string): HeadingToken | null {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (!match) return null;

    const level = match[1].length as 1 | 2 | 3 | 4 | 5 | 6;
    const content = match[2].trim();

    const typeMap: Record<number, HeadingToken["type"]> = {
      1: "heading1",
      2: "heading2",
      3: "heading3",
      4: "heading4",
      5: "heading5",
      6: "heading6",
    };

    return {
      type: typeMap[level],
      level,
      content,
      raw: line,
    };
  }

  /**
   * 코드 블록을 파싱합니다.
   */
  private parseCodeBlock(): CodeBlockToken {
    const startLine = this.currentIndex;
    const firstLine = this.lines[startLine].trim();
    const language = firstLine.slice(3).trim() || undefined;

    this.currentIndex++;
    const codeLines: string[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      if (line.trim() === "```") {
        this.currentIndex++;
        break;
      }
      codeLines.push(line);
      this.currentIndex++;
    }

    return {
      type: "code_block",
      code: codeLines.join("\n"),
      language,
      raw: this.lines.slice(startLine, this.currentIndex).join("\n"),
    };
  }

  /**
   * 인용문을 파싱합니다.
   */
  private parseBlockquote(): BlockquoteToken {
    const lines: string[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      if (!line.trim().startsWith(">")) break;

      lines.push(line.replace(/^>\s?/, ""));
      this.currentIndex++;
    }

    const content = lines.join(" ").trim();
    let author: string | undefined;

    // 마지막 대시 뒤의 텍스트를 작성자로 간주
    const dashMatch = content.match(/(.+?)\s*[-—]\s*(.+)$/);
    if (dashMatch) {
      return {
        type: "blockquote",
        content: dashMatch[1].trim(),
        author: dashMatch[2].trim(),
        raw: lines.map((l) => `> ${l}`).join("\n"),
      };
    }

    return {
      type: "blockquote",
      content,
      raw: lines.map((l) => `> ${l}`).join("\n"),
    };
  }

  /**
   * 순서 없는 리스트를 파싱합니다.
   */
  private parseUnorderedList(): ListToken {
    const items: ListItemToken[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      if (!this.isUnorderedListItem(line)) break;

      const content = line.replace(/^[\s]*[-*+]\s+/, "").trim();
      items.push({
        type: "list_item",
        content,
        raw: line,
      });
      this.currentIndex++;
    }

    return {
      type: "unordered_list",
      ordered: false,
      items,
      raw: items.map((i) => i.raw).join("\n"),
    };
  }

  /**
   * 순서 있는 리스트를 파싱합니다.
   */
  private parseOrderedList(): ListToken {
    const items: ListItemToken[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      if (!this.isOrderedListItem(line)) break;

      const match = line.match(/^[\s]*(\d+)\.\s+(.+)$/);
      if (match) {
        items.push({
          type: "list_item",
          content: match[2].trim(),
          index: parseInt(match[1], 10),
          raw: line,
        });
      }
      this.currentIndex++;
    }

    return {
      type: "ordered_list",
      ordered: true,
      items,
      raw: items.map((i) => i.raw).join("\n"),
    };
  }

  /**
   * 단락을 파싱합니다.
   */
  private parseParagraph(): ParagraphToken {
    const lines: string[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];

      // 빈 줄이거나 특수 문자로 시작하면 단락 종료
      if (
        line.trim() === "" ||
        line.startsWith("#") ||
        line.startsWith(">") ||
        line.startsWith("-") ||
        line.startsWith("*") ||
        line.startsWith("+") ||
        this.isOrderedListItem(line) ||
        this.isHorizontalRule(line) ||
        line.trim().startsWith("```")
      ) {
        break;
      }

      lines.push(line.trim());
      this.currentIndex++;
    }

    const content = lines.join(" ");

    return {
      type: "paragraph",
      content,
      raw: lines.join("\n"),
    };
  }

  /**
   * 테이블을 파싱합니다.
   */
  private parseTable(): TableToken {
    const headerLine = this.lines[this.currentIndex];
    const headers = this.parseTableRow(headerLine);

    this.currentIndex++;

    // 구분선 파싱 (정렬 정보 포함)
    const separatorLine = this.lines[this.currentIndex];
    const alignments = this.parseTableAlignment(separatorLine);
    this.currentIndex++;

    // 데이터 행 파싱
    const rows: string[][] = [];
    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex];
      if (!line.includes("|")) break;

      rows.push(this.parseTableRow(line));
      this.currentIndex++;
    }

    return {
      type: "table",
      headers,
      rows,
      alignments,
      raw: this.lines.slice(this.currentIndex - rows.length - 2, this.currentIndex).join("\n"),
    };
  }

  /**
   * 테이블 행을 파싱합니다.
   */
  private parseTableRow(line: string): string[] {
    return line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, arr) => index > 0 && index < arr.length - 1 || cell !== "");
  }

  /**
   * 테이블 정렬을 파싱합니다.
   */
  private parseTableAlignment(line: string): ("left" | "center" | "right")[] {
    return line.split("|").map((cell) => {
      const trimmed = cell.trim();
      if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center";
      if (trimmed.endsWith(":")) return "right";
      return "left";
    }).filter((_, index, arr) => index > 0 && index < arr.length - 1 || _ !== "left");
  }

  /**
   * 수평선인지 확인합니다.
   */
  private isHorizontalRule(line: string): boolean {
    const trimmed = line.trim();
    return (
      trimmed === "---" ||
      trimmed === "***" ||
      trimmed === "___" ||
      /^[-]{3,}$/.test(trimmed) ||
      /^[*]{3,}$/.test(trimmed) ||
      /^[_]{3,}$/.test(trimmed)
    );
  }

  /**
   * 테이블 시작인지 확인합니다.
   */
  private isTableStart(line: string): boolean {
    if (!line.includes("|")) return false;

    // 다음 줄이 구분선인지 확인
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.lines.length) return false;

    const nextLine = this.lines[nextIndex].trim();
    return /^[-:|]+$/.test(nextLine);
  }

  /**
   * 순서 없는 리스트 아이템인지 확인합니다.
   */
  private isUnorderedListItem(line: string): boolean {
    return /^[\s]*[-*+]\s+/.test(line);
  }

  /**
   * 순서 있는 리스트 아이템인지 확인합니다.
   */
  private isOrderedListItem(line: string): boolean {
    return /^[\s]*\d+\.\s+/.test(line);
  }
}

/**
 * 마크다운 텍스트를 파싱하는 헬퍼 함수
 */
export function parseMarkdown(markdown: string): ParseResult {
  const parser = new MarkdownParser();
  return parser.parse(markdown);
}

/**
 * 인라인 마크다운 요소를 제거하고 순수 텍스트를 반환합니다.
 */
export function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // 굵은 텍스트
    .replace(/\*(.+?)\*/g, "$1") // 기울임 텍스트
    .replace(/__(.+?)__/g, "$1") // 굵은 텍스트 (_)
    .replace(/_(.+?)_/g, "$1") // 기울임 텍스트 (_)
    .replace(/`(.+?)`/g, "$1") // 인라인 코드
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // 링크
    .replace(/!\[(.+?)\]\(.+?\)/g, "$1"); // 이미지
}

/**
 * 텍스트에서 링크를 추출합니다.
 */
export function extractLinks(text: string): Array<{ text: string; url: string }> {
  const links: Array<{ text: string; url: string }> = [];
  const regex = /\[(.+?)\]\((.+?)\)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
    });
  }

  return links;
}

/**
 * 텍스트에서 이미지를 추출합니다.
 */
export function extractImages(text: string): Array<{ alt: string; url: string }> {
  const images: Array<{ alt: string; url: string }> = [];
  const regex = /!\[(.+?)\]\((.+?)\)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    images.push({
      alt: match[1],
      url: match[2],
    });
  }

  return images;
}
