"use client";

/**
 * Canvas 컴포넌트
 * 현재 선택된 슬라이드를 16:9 비율로 표시합니다.
 */

import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  TitleSlide,
  CardGrid,
  ComparisonSlide,
  TimelineSlide,
  QuoteSlide,
  TableSlide,
} from "@/components/slides";
import type { SlideProps } from "@/types/slide";
import { themes, themeVariablesToCss } from "@/lib/themes";

interface CanvasProps {
  slide: SlideProps;
  theme: string;
  className?: string;
}

export function Canvas({ slide, theme: themeId, className }: CanvasProps) {
  // 현재 테마 가져오기
  const theme = themes.find((t) => t.id === themeId) || themes[0];
  const themeCssVars = themeVariablesToCss(theme.light);

  // 슬라이드 타입별 렌더링
  const renderSlide = (slideData: SlideProps) => {
    switch (slideData.type) {
      case "title":
        return <TitleSlide {...slideData} />;
      case "card-grid":
        return <CardGrid {...slideData} />;
      case "comparison":
        return <ComparisonSlide {...slideData} />;
      case "timeline":
        return <TimelineSlide {...slideData} />;
      case "quote":
        return <QuoteSlide {...slideData} />;
      case "table":
        return <TableSlide {...slideData} />;
      default:
        return (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">알 수 없는 슬라이드 타입</p>
          </div>
        );
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border",
        "bg-card",
        className
      )}
      style={themeCssVars}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {renderSlide(slide)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default Canvas;
