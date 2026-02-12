"use client";

/**
 * 비교 슬라이드 컴포넌트
 * 두 가지 항목을 나란히 비교하는 A vs B 구조의 슬라이드입니다.
 * VS 아이콘/텍스트가 중앙에 배치됩니다.
 */

import { motion, type Variants } from "framer-motion";
import { Check, X, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContainer } from "./slide-container";
import type { ComparisonSlideProps } from "@/types/slide";

// 사이드 컨테이너 애니메이션 variants
const sideVariants: Variants = {
  hidden: (direction: "left" | "right") => ({
    opacity: 0,
    x: direction === "left" ? -50 : 50,
  }),
  visible: (direction: "left" | "right") => ({
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  }),
};

// VS 아이콘 애니메이션 variants
const vsVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      delay: 0.3,
      duration: 0.5,
      type: "spring",
      stiffness: 200,
    },
  },
};

// 아이템 리스트 애니메이션 variants
const itemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.2 + i * 0.1,
      duration: 0.3,
    },
  }),
};

// 비교 사이드 컴포넌트
function ComparisonSide({
  item,
  side,
  isPositive = true,
}: {
  item: { title: string; items: string[] };
  side: "left" | "right";
  isPositive?: boolean;
}) {
  const Icon = isPositive ? Check : X;
  const iconColor = isPositive
    ? "var(--slide-green, #22c55e)"
    : "var(--slide-orange, #f97316)";

  return (
    <motion.div
      className="flex flex-1 flex-col"
      custom={side}
      variants={sideVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 사이드 제목 */}
      <h3
        className="mb-6 text-center text-xl font-bold md:text-2xl"
        style={{ color: "var(--slide-text, #1a1a1a)" }}
      >
        {item.title}
      </h3>

      {/* 항목 리스트 */}
      <ul className="space-y-3">
        {item.items.map((text, index) => (
          <motion.li
            key={index}
            className="flex items-start gap-3"
            custom={index}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Icon
              className="mt-0.5 h-5 w-5 flex-shrink-0"
              style={{ color: iconColor }}
              aria-hidden="true"
            />
            <span
              className="text-sm md:text-base"
              style={{ color: "var(--slide-textDim, #666666)" }}
            >
              {text}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

// VS 디바이더 컴포넌트
function VsDivider({ text = "VS" }: { text?: string }) {
  return (
    <motion.div
      className="flex flex-shrink-0 items-center justify-center px-4 md:px-8"
      variants={vsVariants}
      initial="hidden"
      animate="visible"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold shadow-lg md:h-20 md:w-20 md:text-xl"
        style={{
          backgroundColor: "var(--slide-accent, #3b82f6)",
          color: "var(--slide-bg, #ffffff)",
        }}
      >
        {text}
      </div>
    </motion.div>
  );
}

export function ComparisonSlide({
  id,
  title,
  leftSide,
  rightSide,
  vsText = "VS",
  className,
}: ComparisonSlideProps) {
  return (
    <SlideContainer className={className} padding="lg">
      {/* 섹션 제목 */}
      {title && (
        <motion.h2
          className="mb-8 text-center text-2xl font-bold md:text-3xl"
          style={{ color: "var(--slide-text, #1a1a1a)" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {title}
        </motion.h2>
      )}

      {/* 비교 레이아웃 */}
      <div className="flex flex-col items-center gap-8 md:flex-row md:gap-4">
        {/* 왼쪽 (A) */}
        <ComparisonSide item={leftSide} side="left" isPositive={true} />

        {/* VS 디바이더 */}
        <VsDivider text={vsText} />

        {/* 오른쪽 (B) */}
        <ComparisonSide item={rightSide} side="right" isPositive={false} />
      </div>

      {/* 하단 구분선 */}
      <motion.div
        className="mt-8 h-px w-full"
        style={{ backgroundColor: "var(--slide-border, #e5e5e5)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      />
    </SlideContainer>
  );
}

export default ComparisonSlide;
