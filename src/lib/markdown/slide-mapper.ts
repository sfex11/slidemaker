/**
 * 슬라이드 타입 매핑
 * 마크다운 토큰을 분석하여 적절한 슬라이드 타입을 결정합니다.
 */

import type { SlideType } from "@/types/slide";
import type { MarkdownToken, HeadingToken, ListToken, BlockquoteToken, TableToken, ParagraphToken } from "./parser";

// 슬라이드 매핑 규칙
export interface SlideMappingRule {
  type: SlideType;
  condition: (tokens: MarkdownToken[], index: number) => boolean;
  confidence: number; // 0-1, 매핑 확신도
}

// 매핑 결과
export interface SlideMappingResult {
  type: SlideType;
  confidence: number;
  tokens: MarkdownToken[];
  metadata?: Record<string, unknown>;
}

// 콘텐츠 패턴 분석 결과
export interface ContentPattern {
  hasTitle: boolean;
  titleLevel: 1 | 2 | 3 | 4 | 5 | 6 | null;
  listCount: number;
  hasBlockquote: boolean;
  hasTable: boolean;
  hasComparison: boolean;
  hasSteps: boolean;
  paragraphCount: number;
}

/**
 * 토큰 배열에서 콘텐츠 패턴을 분석합니다.
 */
export function analyzeContentPattern(tokens: MarkdownToken[]): ContentPattern {
  const pattern: ContentPattern = {
    hasTitle: false,
    titleLevel: null,
    listCount: 0,
    hasBlockquote: false,
    hasTable: false,
    hasComparison: false,
    hasSteps: false,
    paragraphCount: 0,
  };

  for (const token of tokens) {
    switch (token.type) {
      case "heading1":
      case "heading2":
      case "heading3":
      case "heading4":
      case "heading5":
      case "heading6":
        if (!pattern.hasTitle) {
          pattern.hasTitle = true;
          pattern.titleLevel = (token as HeadingToken).level;
        }
        break;

      case "unordered_list":
      case "ordered_list":
        pattern.listCount++;
        // 비교 패턴 확인 (vs, versus, 대 등)
        const listToken = token as ListToken;
        const listContent = listToken.items.map((i) => i.content.toLowerCase()).join(" ");
        if (
          listContent.includes(" vs ") ||
          listContent.includes(" versus ") ||
          listContent.includes(" 대 ")
        ) {
          pattern.hasComparison = true;
        }
        // 단계 패턴 확인 (step, 단계, 숫자로 시작)
        if (
          listContent.includes("step") ||
          listContent.includes("단계") ||
          listToken.ordered
        ) {
          pattern.hasSteps = true;
        }
        break;

      case "blockquote":
        pattern.hasBlockquote = true;
        break;

      case "table":
        pattern.hasTable = true;
        break;

      case "paragraph":
        pattern.paragraphCount++;
        break;
    }
  }

  return pattern;
}

/**
 * 제목 슬라이드인지 확인합니다.
 */
function isTitleSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];

  // 첫 번째 토큰이 H1이고 다음 토큰이 없거나 단락 하나뿐인 경우
  if (token.type === "heading1") {
    const nextToken = tokens[index + 1];

    // 다음 토큰이 없거나 단락 하나만 있는 경우
    if (!nextToken) return true;
    if (nextToken.type === "paragraph" && !tokens[index + 2]) return true;

    // 발표자나 날짜 정보가 있는 단락
    if (nextToken.type === "paragraph") {
      const content = (nextToken as ParagraphToken).content.toLowerCase();
      if (
        content.includes("발표자") ||
        content.includes("presenter") ||
        content.includes("날짜") ||
        content.includes("date") ||
        content.includes("by ") ||
        /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(content)
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 카드 그리드 슬라이드인지 확인합니다.
 */
function isCardGridSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];

  // 리스트 아이템이 2-4개인 경우
  if (token.type === "unordered_list" || token.type === "ordered_list") {
    const listToken = token as ListToken;
    const itemCount = listToken.items.length;

    // 2-4개 아이템은 카드 그리드로 적절
    if (itemCount >= 2 && itemCount <= 4) {
      return true;
    }

    // 각 아이템이 제목과 설명 형태인지 확인
    const hasDescriptions = listToken.items.every((item) => {
      // 콜론이나 대시로 구분된 설명이 있는지 확인
      return item.content.includes(":") || item.content.includes(" - ");
    });

    if (hasDescriptions) return true;
  }

  return false;
}

/**
 * 비교 슬라이드인지 확인합니다.
 */
function isComparisonSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];

  if (token.type === "unordered_list" || token.type === "ordered_list") {
    const listToken = token as ListToken;
    const content = listToken.items.map((i) => i.content.toLowerCase()).join(" ");

    // 비교 키워드 확인
    if (
      content.includes(" vs ") ||
      content.includes(" versus ") ||
      content.includes(" 대 ") ||
      content.includes(" 비교 ")
    ) {
      return true;
    }

    // 두 개의 그룹으로 나뉘어 있는지 확인
    // 예: "A: ... / B: ..." 형태
    const hasTwoGroups = listToken.items.length === 2;
    if (hasTwoGroups) {
      const firstItem = listToken.items[0].content.toLowerCase();
      const secondItem = listToken.items[1].content.toLowerCase();

      // 양쪽 모두 콜론이나 대시로 구분된 경우
      if (
        (firstItem.includes(":") || firstItem.includes(" - ")) &&
        (secondItem.includes(":") || secondItem.includes(" - "))
      ) {
        return true;
      }
    }
  }

  // 두 개의 연속된 리스트가 비교 구조인지 확인
  if (token.type === "heading2" || token.type === "heading3") {
    const nextToken = tokens[index + 1];
    if (nextToken?.type === "unordered_list") {
      const headingContent = (token as HeadingToken).content.toLowerCase();
      const nextHeading = tokens[index + 2];

      if (nextHeading?.type === "heading2" || nextHeading?.type === "heading3") {
        return true;
      }
    }
  }

  return false;
}

/**
 * 타임라인 슬라이드인지 확인합니다.
 */
function isTimelineSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];

  if (token.type === "ordered_list") {
    const listToken = token as ListToken;
    const itemCount = listToken.items.length;

    // 3개 이상의 순서 있는 아이템
    if (itemCount >= 3) {
      return true;
    }

    // 단계 키워드 확인
    const content = listToken.items.map((i) => i.content.toLowerCase()).join(" ");
    if (
      content.includes("step") ||
      content.includes("단계") ||
      content.includes("phase") ||
      content.includes("단") ||
      content.includes("먼저") ||
      content.includes("그 다음") ||
      content.includes("마지막")
    ) {
      return true;
    }
  }

  if (token.type === "unordered_list") {
    const listToken = token as ListToken;
    const content = listToken.items.map((i) => i.content.toLowerCase()).join(" ");

    // 단계 키워드로 시작하는 경우
    if (
      content.includes("step") ||
      content.includes("단계") ||
      content.includes("phase")
    ) {
      return true;
    }
  }

  return false;
}

/**
 * 인용문 슬라이드인지 확인합니다.
 */
function isQuoteSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];

  if (token.type === "blockquote") {
    const blockquoteToken = token as BlockquoteToken;

    // 충분히 긴 인용문
    if (blockquoteToken.content.length > 20) {
      return true;
    }

    // 작성자가 있는 경우
    if (blockquoteToken.author) {
      return true;
    }
  }

  return false;
}

/**
 * 테이블 슬라이드인지 확인합니다.
 */
function isTableSlide(tokens: MarkdownToken[], index: number): boolean {
  const token = tokens[index];
  return token.type === "table";
}

/**
 * 단일 토큰에 대한 슬라이드 타입을 결정합니다.
 */
export function determineSlideType(
  tokens: MarkdownToken[],
  index: number
): SlideMappingResult {
  const token = tokens[index];
  const remainingTokens = tokens.slice(index);

  // 매핑 규칙 순서대로 확인 (우선순위)
  const rules: Array<{
    check: () => boolean;
    type: SlideType;
    confidence: number;
    getTokenCount: () => number;
  }> = [
    {
      check: () => isTitleSlide(tokens, index),
      type: "title",
      confidence: 0.95,
      getTokenCount: () => {
        let count = 1;
        const nextToken = tokens[index + 1];
        if (nextToken?.type === "paragraph") count++;
        return count;
      },
    },
    {
      check: () => isTableSlide(tokens, index),
      type: "table",
      confidence: 0.95,
      getTokenCount: () => 1,
    },
    {
      check: () => isQuoteSlide(tokens, index),
      type: "quote",
      confidence: 0.9,
      getTokenCount: () => 1,
    },
    {
      check: () => isComparisonSlide(tokens, index),
      type: "comparison",
      confidence: 0.85,
      getTokenCount: () => 1,
    },
    {
      check: () => isTimelineSlide(tokens, index),
      type: "timeline",
      confidence: 0.8,
      getTokenCount: () => 1,
    },
    {
      check: () => isCardGridSlide(tokens, index),
      type: "card-grid",
      confidence: 0.75,
      getTokenCount: () => 1,
    },
  ];

  for (const rule of rules) {
    if (rule.check()) {
      const tokenCount = rule.getTokenCount();
      return {
        type: rule.type,
        confidence: rule.confidence,
        tokens: tokens.slice(index, index + tokenCount),
      };
    }
  }

  // 기본값: 카드 그리드 (제목이 있는 경우) 또는 타이틀
  if (token.type.startsWith("heading")) {
    // 다음 토큰 확인
    const nextToken = tokens[index + 1];
    if (nextToken?.type === "unordered_list" || nextToken?.type === "ordered_list") {
      return {
        type: "card-grid",
        confidence: 0.6,
        tokens: tokens.slice(index, index + 2),
      };
    }

    return {
      type: "title",
      confidence: 0.5,
      tokens: [token],
    };
  }

  // 단락만 있는 경우 기본 카드 그리드로 처리
  return {
    type: "card-grid",
    confidence: 0.4,
    tokens: [token],
  };
}

/**
 * 전체 마크다운 토큰을 슬라이드 매핑 결과로 변환합니다.
 */
export function mapTokensToSlides(tokens: MarkdownToken[]): SlideMappingResult[] {
  const results: SlideMappingResult[] = [];
  let index = 0;

  while (index < tokens.length) {
    const result = determineSlideType(tokens, index);
    results.push(result);

    // 사용된 토큰만큼 인덱스 증가
    index += result.tokens.length;
  }

  return results;
}

/**
 * 슬라이드 타입에 대한 설명을 반환합니다.
 */
export function getSlideTypeDescription(type: SlideType): string {
  const descriptions: Record<SlideType, string> = {
    title: "제목 슬라이드 - 프레젠테이션의 시작이나 섹션 구분",
    "card-grid": "카드 그리드 - 항목 나열이나 특징 설명",
    comparison: "비교 슬라이드 - 두 가지 옵션/개념 비교",
    timeline: "타임라인 - 단계별 프로세스나 시간 순서",
    quote: "인용문 슬라이드 - 중요한 인용구나 문구",
    table: "테이블 슬라이드 - 데이터나 정보 표 형식",
  };

  return descriptions[type];
}

/**
 * 슬라이드 타입 매핑 통계를 반환합니다.
 */
export function getMappingStatistics(results: SlideMappingResult[]): {
  total: number;
  byType: Record<SlideType, number>;
  averageConfidence: number;
} {
  const byType: Record<SlideType, number> = {
    title: 0,
    "card-grid": 0,
    comparison: 0,
    timeline: 0,
    quote: 0,
    table: 0,
  };

  let totalConfidence = 0;

  for (const result of results) {
    byType[result.type]++;
    totalConfidence += result.confidence;
  }

  return {
    total: results.length,
    byType,
    averageConfidence: results.length > 0 ? totalConfidence / results.length : 0,
  };
}
