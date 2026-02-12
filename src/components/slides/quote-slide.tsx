"use client";

/**
 * 인용문 슬라이드 컴포넌트
 * 큰 인용문을 강조해서 표시합니다.
 * 저자명과 출처를 포함할 수 있습니다.
 */

import { motion, type Variants } from "framer-motion";
import { Quote as QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContainer } from "./slide-container";
import type { QuoteSlideProps } from "@/types/slide";

// 인용문 애니메이션 variants
const quoteVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

// 저자 정보 애니메이션 variants
const authorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.3,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  },
};

// 따옴표 아이콘 애니메이션 variants
const quoteIconVariants: Variants = {
  hidden: {
    opacity: 0,
    rotate: -15,
    scale: 0.5,
  },
  visible: (side: "left" | "right") => ({
    opacity: 1,
    rotate: side === "left" ? -10 : 10,
    scale: 1,
    transition: {
      delay: side === "left" ? 0.1 : 0.5,
      duration: 0.5,
      type: "spring" as const,
      stiffness: 100,
    },
  }),
};

export function QuoteSlide({
  id,
  quote,
  author,
  source,
  showQuotationMarks = true,
  className,
}: QuoteSlideProps) {
  return (
    <SlideContainer className={className} padding="lg">
      <div className="relative flex h-full flex-col items-center justify-center">
        {/* 왼쪽 따옴표 아이콘 */}
        {showQuotationMarks && (
          <motion.div
            className="absolute -left-2 -top-4 opacity-20 md:-left-4 md:-top-8"
            custom="left"
            variants={quoteIconVariants}
            initial="hidden"
            animate="visible"
            aria-hidden="true"
          >
            <QuoteIcon
              className="h-16 w-16 md:h-24 md:w-24 lg:h-32 lg:w-32"
              style={{ color: "var(--slide-accent, #3b82f6)" }}
            />
          </motion.div>
        )}

        {/* 인용문 */}
        <motion.blockquote
          className="relative z-10 max-w-4xl text-center"
          variants={quoteVariants}
          initial="hidden"
          animate="visible"
        >
          <p
            className="text-xl font-medium leading-relaxed md:text-2xl lg:text-3xl"
            style={{ color: "var(--slide-text, #1a1a1a)" }}
          >
            &ldquo;{quote}&rdquo;
          </p>
        </motion.blockquote>

        {/* 저자 및 출처 */}
        <motion.div
          className="mt-8 flex flex-col items-center gap-2"
          variants={authorVariants}
          initial="hidden"
          animate="visible"
        >
          {/* 저자 */}
          {author && (
            <cite
              className="not-italic text-lg font-semibold md:text-xl"
              style={{ color: "var(--slide-accent, #3b82f6)" }}
            >
              — {author}
            </cite>
          )}

          {/* 출처 */}
          {source && (
            <span
              className="text-sm md:text-base"
              style={{ color: "var(--slide-textDim, #666666)" }}
            >
              {source}
            </span>
          )}
        </motion.div>

        {/* 오른쪽 따옴표 아이콘 */}
        {showQuotationMarks && (
          <motion.div
            className="absolute -bottom-4 -right-2 opacity-20 md:-bottom-8 md:-right-4"
            custom="right"
            variants={quoteIconVariants}
            initial="hidden"
            animate="visible"
            aria-hidden="true"
          >
            <QuoteIcon
              className="h-16 w-16 rotate-180 md:h-24 md:w-24 lg:h-32 lg:w-32"
              style={{ color: "var(--slide-accent, #3b82f6)" }}
            />
          </motion.div>
        )}

        {/* 장식용 하단 라인 */}
        <motion.div
          className="mt-8 h-1 w-24 rounded-full"
          style={{ backgroundColor: "var(--slide-accent, #3b82f6)" }}
          initial={{ width: 0 }}
          animate={{ width: 96 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        />
      </div>
    </SlideContainer>
  );
}

export default QuoteSlide;
