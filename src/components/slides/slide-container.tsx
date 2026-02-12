"use client";

/**
 * 슬라이드 컨테이너 컴포넌트
 * 모든 슬라이드의 공통 래퍼로 16:9 비율을 유지하고
 * 기본 스타일과 애니메이션을 제공합니다.
 */

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SlideContainerProps, SlideAnimation } from "@/types/slide";

// 기본 애니메이션 설정
const defaultAnimation: SlideAnimation = {
  duration: 0.5,
  staggerChildren: 0.1,
};

// 패딩 크기 매핑
const paddingSizes = {
  none: "",
  sm: "p-4 md:p-6",
  md: "p-6 md:p-8 lg:p-10",
  lg: "p-8 md:p-10 lg:p-12",
};

// Framer Motion variants
const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.98,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const,
      staggerChildren: 0.1,
    },
  },
};

export function SlideContainer({
  children,
  className,
  aspectRatio = true,
  background = "var(--slide-bg, #ffffff)",
  padding = "md",
  animated = true,
  animationConfig = defaultAnimation,
}: SlideContainerProps) {
  const containerClasses = cn(
    // 기본 스타일
    "relative w-full overflow-hidden rounded-lg shadow-lg",
    // 16:9 비율 유지
    aspectRatio && "aspect-video",
    // 패딩
    paddingSizes[padding],
    // 배경 (CSS 변수 지원)
    "bg-[var(--slide-surface,var(--slide-bg,white))]",
    // 텍스트 색상
    "text-[var(--slide-text,#1a1a1a)]",
    className
  );

  // 인라인 스타일 (CSS 변수가 제대로 적용되지 않을 경우 백업)
  const containerStyle = {
    background: background,
  };

  // 애니메이션이 비활성화된 경우
  if (!animated) {
    return (
      <div
        className={containerClasses}
        style={containerStyle}
        role="region"
        aria-label="슬라이드"
      >
        {children}
      </div>
    );
  }

  // 애니메이션이 활성화된 경우
  return (
    <motion.div
      className={containerClasses}
      style={containerStyle}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      role="region"
      aria-label="슬라이드"
    >
      {children}
    </motion.div>
  );
}

// 슬라이드 내부 콘텐츠용 래퍼 (Flex 레이아웃)
export function SlideContent({
  children,
  className,
  direction = "vertical",
  align = "center",
  justify = "center",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "vertical" | "horizontal";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
}) {
  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  };

  return (
    <div
      className={cn(
        "flex h-full w-full",
        direction === "vertical" ? "flex-col" : "flex-row",
        alignClasses[align],
        justifyClasses[justify],
        className
      )}
    >
      {children}
    </div>
  );
}

// 애니메이션된 자식 요소 래퍼
export function AnimatedItem({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        delay,
        ease: "easeOut" as const,
      },
    },
  };

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export default SlideContainer;
