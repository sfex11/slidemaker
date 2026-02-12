/**
 * 슬라이드 컴포넌트 Export
 * 모든 슬라이드 타입과 관련 컴포넌트를 중앙에서 export 합니다.
 */

// 컨테이너 컴포넌트
export {
  SlideContainer,
  SlideContent,
  AnimatedItem,
} from "./slide-container";

// 개별 슬라이드 컴포넌트
export { TitleSlide } from "./title-slide";
export { CardGrid } from "./card-grid";
export { ComparisonSlide } from "./comparison-slide";
export { TimelineSlide } from "./timeline-slide";
export { QuoteSlide } from "./quote-slide";
export { TableSlide } from "./table-slide";

// 타입 재export
export type {
  SlideType,
  BaseSlideProps,
  TitleSlideProps,
  CardItem,
  CardGridSlideProps,
  ComparisonItem,
  ComparisonSlideProps,
  TimelineItem,
  TimelineSlideProps,
  QuoteSlideProps,
  TableCell,
  TableRow,
  TableSlideProps,
  SlideProps,
  SlideData,
  SlideTheme,
  SlideAnimation,
  SlideContainerProps,
} from "@/types/slide";
