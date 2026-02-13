/**
 * 슬라이드 생성 유틸리티
 * 마크다운 토큰과 매핑 결과를 실제 슬라이드 객체로 변환합니다.
 */

import type {
  SlideType,
  SlideProps,
  TitleSlideProps,
  CardGridSlideProps,
  ComparisonSlideProps,
  TimelineSlideProps,
  QuoteSlideProps,
  TableSlideProps,
  CardItem,
  TimelineItem,
  TableRow,
  SlideData,
} from "@/types/slide";

import type {
  MarkdownToken,
  HeadingToken,
  ListToken,
  BlockquoteToken,
  TableToken,
  ParagraphToken,
} from "./markdown/parser";

import type { SlideMappingResult } from "./markdown/slide-mapper";
import { parseMarkdown } from "./markdown/parser";
import { mapTokensToSlides } from "./markdown/slide-mapper";

// 고유 ID 생성 함수
function generateId(): string {
  return `slide_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// 카드 아이템용 ID 생성
function generateCardId(): string {
  return `card_${Math.random().toString(36).substring(2, 9)}`;
}

// 타임라인 아이템용 ID 생성
function generateTimelineId(): string {
  return `timeline_${Math.random().toString(36).substring(2, 9)}`;
}

// 테이블 행용 ID 생성
function generateRowId(): string {
  return `row_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 제목 슬라이드를 생성합니다.
 */
function createTitleSlide(
  tokens: MarkdownToken[]
): TitleSlideProps {
  const headingToken = tokens[0] as HeadingToken;
  const paragraphToken = tokens[1] as ParagraphToken | undefined;

  const slide: TitleSlideProps = {
    id: generateId(),
    type: "title",
    title: headingToken.content,
  };

  // 부제, 발표자, 날짜 추출
  if (paragraphToken) {
    const content = paragraphToken.content;

    // 발표자 추출
    const presenterMatch = content.match(/(?:발표자|presenter|by)[:\s]+(.+?)(?:\n|$)/i);
    if (presenterMatch) {
      slide.presenter = presenterMatch[1].trim();
    }

    // 날짜 추출
    const dateMatch = content.match(/(?:날짜|date)[:\s]+(.+?)(?:\n|$)/i);
    if (dateMatch) {
      slide.date = dateMatch[1].trim();
    }

    // 부제 추출 (발표자/날짜 정보가 없는 텍스트)
    let subtitle = content;
    if (presenterMatch) {
      subtitle = subtitle.replace(presenterMatch[0], "");
    }
    if (dateMatch) {
      subtitle = subtitle.replace(dateMatch[0], "");
    }
    subtitle = subtitle.trim();

    if (subtitle && !presenterMatch && !dateMatch) {
      slide.subtitle = subtitle;
    }
  }

  return slide;
}

/**
 * 카드 그리드 슬라이드를 생성합니다.
 */
function createCardGridSlide(
  tokens: MarkdownToken[]
): CardGridSlideProps {
  const cards: CardItem[] = [];
  let title: string | undefined;

  for (const token of tokens) {
    // 제목이 있는 경우
    if (token.type.startsWith("heading")) {
      title = (token as HeadingToken).content;
      continue;
    }

    // 리스트 처리
    if (token.type === "unordered_list" || token.type === "ordered_list") {
      const listToken = token as ListToken;

      for (const item of listToken.items) {
        const content = item.content;

        // 굵은 텍스트와 일반 텍스트 분리
        const boldMatch = content.match(/\*\*(.+?)\*\*/);
        let cardTitle: string;
        let description: string | undefined;

        if (boldMatch) {
          cardTitle = boldMatch[1];
          description = content.replace(/\*\*(.+?)\*\*/, "").trim();
          // 콜론이나 대시 제거
          description = description.replace(/^[:\-–—]\s*/, "");
        } else {
          // 콜론이나 대시로 구분된 경우
          const separatorMatch = content.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
          if (separatorMatch) {
            cardTitle = separatorMatch[1].trim();
            description = separatorMatch[2].trim();
          } else {
            cardTitle = content;
          }
        }

        cards.push({
          id: generateCardId(),
          title: cardTitle,
          description,
        });
      }
    }
  }

  // 열 수 결정 (아이템 수에 따라)
  let cols: 2 | 3 | 4 = 3;
  if (cards.length <= 2) cols = 2;
  else if (cards.length >= 4) cols = 4;

  return {
    id: generateId(),
    type: "card-grid",
    title,
    cards,
    cols,
  };
}

/**
 * 비교 슬라이드를 생성합니다.
 */
function createComparisonSlide(
  tokens: MarkdownToken[]
): ComparisonSlideProps {
  let title: string | undefined;
  let leftSide = { title: "", items: [] as string[] };
  let rightSide = { title: "", items: [] as string[] };

  for (const token of tokens) {
    // 제목이 있는 경우
    if (token.type.startsWith("heading")) {
      title = (token as HeadingToken).content;
      continue;
    }

    // 리스트 처리
    if (token.type === "unordered_list" || token.type === "ordered_list") {
      const listToken = token as ListToken;

      // 두 개의 아이템인 경우 (각각 왼쪽/오른쪽)
      if (listToken.items.length === 2) {
        const processItem = (content: string): { title: string; items: string[] } => {
          const boldMatch = content.match(/\*\*(.+?)\*\*/);
          let itemTitle: string;
          let itemDescription: string;

          if (boldMatch) {
            itemTitle = boldMatch[1];
            itemDescription = content.replace(/\*\*(.+?)\*\*/, "").trim();
          } else {
            const separatorMatch = content.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
            if (separatorMatch) {
              itemTitle = separatorMatch[1].trim();
              itemDescription = separatorMatch[2].trim();
            } else {
              itemTitle = content;
              itemDescription = "";
            }
          }

          // 콤마로 구분된 항목들 분리
          const items = itemDescription
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          return { title: itemTitle, items };
        };

        leftSide = processItem(listToken.items[0].content);
        rightSide = processItem(listToken.items[1].content);
      }
    }
  }

  return {
    id: generateId(),
    type: "comparison",
    title,
    leftSide,
    rightSide,
    vsText: "VS",
  };
}

/**
 * 타임라인 슬라이드를 생성합니다.
 */
function createTimelineSlide(
  tokens: MarkdownToken[]
): TimelineSlideProps {
  const items: TimelineItem[] = [];
  let title: string | undefined;

  for (const token of tokens) {
    // 제목이 있는 경우
    if (token.type.startsWith("heading")) {
      title = (token as HeadingToken).content;
      continue;
    }

    // 리스트 처리
    if (token.type === "ordered_list" || token.type === "unordered_list") {
      const listToken = token as ListToken;

      listToken.items.forEach((item, index) => {
        const content = item.content;

        // 굵은 텍스트와 일반 텍스트 분리
        const boldMatch = content.match(/\*\*(.+?)\*\*/);
        let itemTitle: string;
        let description: string | undefined;

        if (boldMatch) {
          itemTitle = boldMatch[1];
          description = content.replace(/\*\*(.+?)\*\*/, "").trim();
          // 콜론이나 대시 제거
          description = description.replace(/^[:\-–—]\s*/, "");
        } else {
          // 콜론이나 대시로 구분된 경우
          const separatorMatch = content.match(/^(.+?)\s*[:\-–—]\s*(.+)$/);
          if (separatorMatch) {
            itemTitle = separatorMatch[1].trim();
            description = separatorMatch[2].trim();
          } else {
            itemTitle = content;
          }
        }

        items.push({
          id: generateTimelineId(),
          step: item.index ?? index + 1,
          title: itemTitle,
          description,
        });
      });
    }
  }

  return {
    id: generateId(),
    type: "timeline",
    title,
    items,
    direction: items.length > 4 ? "vertical" : "horizontal",
  };
}

/**
 * 인용문 슬라이드를 생성합니다.
 */
function createQuoteSlide(
  tokens: MarkdownToken[]
): QuoteSlideProps {
  const blockquoteToken = tokens.find((t) => t.type === "blockquote") as BlockquoteToken;

  return {
    id: generateId(),
    type: "quote",
    quote: blockquoteToken?.content ?? "",
    author: blockquoteToken?.author,
    showQuotationMarks: true,
  };
}

/**
 * 테이블 슬라이드를 생성합니다.
 */
function createTableSlide(
  tokens: MarkdownToken[]
): TableSlideProps {
  const tableToken = tokens.find((t) => t.type === "table") as TableToken;
  let title: string | undefined;

  // 제목이 있는 경우
  const headingToken = tokens.find((t) => t.type.startsWith("heading")) as HeadingToken | undefined;
  if (headingToken) {
    title = headingToken.content;
  }

  const rows: TableRow[] = [];

  if (tableToken) {
    // 데이터 행 변환
    for (const row of tableToken.rows) {
      rows.push({
        id: generateRowId(),
        cells: row.map((cell, index) => ({
          content: cell,
          align: tableToken.alignments[index] ?? "left",
        })),
        isHeader: false,
      });
    }
  }

  return {
    id: generateId(),
    type: "table",
    title,
    headers: tableToken?.headers,
    rows,
    striped: true,
    bordered: true,
  };
}

/**
 * 슬라이드 Props를 생성합니다.
 */
export function createSlideProps(
  mappingResult: SlideMappingResult
): SlideProps {
  const { type, tokens } = mappingResult;

  switch (type) {
    case "title":
      return createTitleSlide(tokens);
    case "card-grid":
      return createCardGridSlide(tokens);
    case "comparison":
      return createComparisonSlide(tokens);
    case "timeline":
      return createTimelineSlide(tokens);
    case "quote":
      return createQuoteSlide(tokens);
    case "table":
      return createTableSlide(tokens);
    default:
      // 기본값: 카드 그리드
      return createCardGridSlide(tokens);
  }
}

/**
 * 슬라이드 Props를 SlideData로 변환합니다.
 */
export function slidePropsToData(props: SlideProps, projectId: string): SlideData {
  const { id, type, ...content } = props;

  return {
    id,
    type,
    content: content as Record<string, unknown>,
    order: 0, // 순서는 나중에 설정
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 매핑 결과 배열을 슬라이드 Props 배열로 변환합니다.
 */
export function createSlidesFromMappings(
  mappingResults: SlideMappingResult[]
): SlideProps[] {
  return mappingResults.map((result) =>
    createSlideProps(result)
  );
}

/**
 * 매핑 결과 배열을 SlideData 배열로 변환합니다.
 */
export function createSlideDataFromMappings(
  mappingResults: SlideMappingResult[],
  projectId: string
): SlideData[] {
  return mappingResults.map((result, index) => {
    const props = createSlideProps(result);
    const data = slidePropsToData(props, projectId);
    data.order = index;
    return data;
  });
}

/**
 * 마크다운에서 직접 슬라이드 Props 배열을 생성합니다.
 */
export function generateSlidesFromMarkdown(
  markdown: string
): SlideProps[] {
  const parseResult = parseMarkdown(markdown);
  const mappingResults = mapTokensToSlides(parseResult.tokens);

  return createSlidesFromMappings(mappingResults);
}

/**
 * 슬라이드 타입에 따른 아이콘 이름을 반환합니다.
 */
export function getSlideIcon(type: SlideType): string {
  const icons: Record<SlideType, string> = {
    title: "presentation",
    "card-grid": "layout-grid",
    comparison: "git-compare",
    timeline: "clock",
    quote: "quote",
    table: "table",
  };

  return icons[type];
}

/**
 * 슬라이드 미리보기 텍스트를 생성합니다.
 */
export function getSlidePreviewText(slide: SlideProps): string {
  switch (slide.type) {
    case "title":
      return slide.title;
    case "card-grid":
      return slide.title ?? `${slide.cards.length}개 항목`;
    case "comparison":
      return slide.title ?? `${slide.leftSide.title} vs ${slide.rightSide.title}`;
    case "timeline":
      return slide.title ?? `${slide.items.length}단계`;
    case "quote":
      return slide.quote.substring(0, 50) + (slide.quote.length > 50 ? "..." : "");
    case "table":
      return slide.title ?? `${slide.rows.length}행 테이블`;
    default:
      return "슬라이드";
  }
}
