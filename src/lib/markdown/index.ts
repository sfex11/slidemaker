/**
 * 마크다운 모듈
 * 마크다운 파싱, 슬라이드 매핑, 샘플 데이터를 통합하여 제공합니다.
 */

// 파서
export {
  MarkdownParser,
  parseMarkdown,
  stripMarkdownFormatting,
  extractLinks,
  extractImages,
  type MarkdownToken,
  type MarkdownTokenType,
  type TextToken,
  type HeadingToken,
  type ParagraphToken,
  type ListToken,
  type ListItemToken,
  type BlockquoteToken,
  type CodeBlockToken,
  type HorizontalRuleToken,
  type TableToken,
  type LinkToken,
  type ImageToken,
  type ParseResult,
} from "./parser";

// 슬라이드 매핑
export {
  analyzeContentPattern,
  determineSlideType,
  mapTokensToSlides,
  getSlideTypeDescription,
  getMappingStatistics,
  type SlideMappingRule,
  type SlideMappingResult,
  type ContentPattern,
} from "./slide-mapper";

// 샘플
export {
  sampleTitleSlide,
  sampleCardGrid2Cols,
  sampleCardGrid3Cols,
  sampleCardGrid4Cols,
  sampleComparisonSlide,
  sampleTimelineSlide,
  sampleQuoteSlide,
  sampleTableSlide,
  sampleComprehensive,
  sampleProcessSteps,
  sampleDescriptiveList,
  allSamples,
  getSampleByType,
  getSampleNames,
} from "./samples";
