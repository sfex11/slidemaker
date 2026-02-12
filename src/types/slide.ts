/**
 * 슬라이드 관련 타입 정의
 * 다양한 슬라이드 타입과 공통 속성을 정의합니다.
 */

import type { LucideIcon } from "lucide-react";

// 슬라이드 타입 열거형
export type SlideType =
  | "title"
  | "card-grid"
  | "comparison"
  | "timeline"
  | "quote"
  | "table";

// 기본 슬라이드 속성
export interface BaseSlideProps {
  id: string;
  type: SlideType;
  className?: string;
}

// 타이틀 슬라이드 속성
export interface TitleSlideProps extends BaseSlideProps {
  type: "title";
  title: string;
  subtitle?: string;
  presenter?: string;
  date?: string;
  // 배경 그라데이션 옵션
  gradient?: {
    from: string;
    via?: string;
    to: string;
    direction?: "to-r" | "to-l" | "to-t" | "to-b" | "to-tr" | "to-tl" | "to-br" | "to-bl";
  };
  // 배경 이미지 URL
  backgroundImage?: string;
}

// 카드 아이템 타입
export interface CardItem {
  id: string;
  icon?: LucideIcon;
  iconName?: string; // 아이콘 이름 (직렬화용)
  title: string;
  description?: string;
}

// 카드 그리드 슬라이드 속성
export interface CardGridSlideProps extends BaseSlideProps {
  type: "card-grid";
  title?: string;
  cards: CardItem[];
  cols?: 2 | 3 | 4; // 열 수
}

// 비교 항목 타입
export interface ComparisonItem {
  title: string;
  items: string[];
}

// 비교 슬라이드 속성
export interface ComparisonSlideProps extends BaseSlideProps {
  type: "comparison";
  title?: string;
  leftSide: ComparisonItem;
  rightSide: ComparisonItem;
  vsText?: string; // 기본값: "VS"
}

// 타임라인 아이템 타입
export interface TimelineItem {
  id: string;
  step: number;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconName?: string;
}

// 타임라인 슬라이드 속성
export interface TimelineSlideProps extends BaseSlideProps {
  type: "timeline";
  title?: string;
  items: TimelineItem[];
  direction?: "horizontal" | "vertical"; // 가로/세로 방향
}

// 인용문 슬라이드 속성
export interface QuoteSlideProps extends BaseSlideProps {
  type: "quote";
  quote: string;
  author?: string;
  source?: string;
  // 큰 따옴표 아이콘 표시 여부
  showQuotationMarks?: boolean;
}

// 테이블 셀 타입
export interface TableCell {
  content: string;
  align?: "left" | "center" | "right";
  colspan?: number;
}

// 테이블 행 타입
export interface TableRow {
  id: string;
  cells: TableCell[];
  isHeader?: boolean;
}

// 테이블 슬라이드 속성
export interface TableSlideProps extends BaseSlideProps {
  type: "table";
  title?: string;
  headers?: string[];
  rows: TableRow[];
  // 테이블 스타일 옵션
  striped?: boolean;
  bordered?: boolean;
}

// 통합 슬라이드 Props 타입
export type SlideProps =
  | TitleSlideProps
  | CardGridSlideProps
  | ComparisonSlideProps
  | TimelineSlideProps
  | QuoteSlideProps
  | TableSlideProps;

// 슬라이드 데이터 (JSON 직렬화용)
export interface SlideData {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
  order: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

// 슬라이드 테마 변수
export interface SlideTheme {
  // 기본 색상
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textDim: string;
  // 강조 색상
  accent: string;
  accent2: string;
  green: string;
  greenDim: string;
  orange: string;
  teal: string;
  pink: string;
}

// 애니메이션 설정
export interface SlideAnimation {
  duration: number;
  delay?: number;
  staggerChildren?: number;
}

// 슬라이드 컨테이너 속성
export interface SlideContainerProps {
  children: React.ReactNode;
  className?: string;
  // 16:9 비율 강제 여부
  aspectRatio?: boolean;
  // 배경색/테마
  background?: string;
  // 패딩
  padding?: "none" | "sm" | "md" | "lg";
  // 애니메이션 활성화
  animated?: boolean;
  // 애니메이션 설정
  animationConfig?: SlideAnimation;
}
