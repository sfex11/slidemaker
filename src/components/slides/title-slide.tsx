"use client";

/**
 * 타이틀 슬라이드 컴포넌트
 * 프레젠테이션의 첫 슬라이드로 사용되며
 * 제목, 부제, 발표자명을 표시합니다.
 */

import { motion, type Variants } from "framer-motion";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContainer, AnimatedItem } from "./slide-container";
import type { TitleSlideProps } from "@/types/slide";

// 그라데이션 방향 매핑
const gradientDirections = {
  "to-r": "bg-gradient-to-r",
  "to-l": "bg-gradient-to-l",
  "to-t": "bg-gradient-to-t",
  "to-b": "bg-gradient-to-b",
  "to-tr": "bg-gradient-to-tr",
  "to-tl": "bg-gradient-to-tl",
  "to-br": "bg-gradient-to-br",
  "to-bl": "bg-gradient-to-bl",
};

// 텍스트 애니메이션 variants
const textVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
};

export function TitleSlide({
  id,
  title,
  subtitle,
  presenter,
  date,
  gradient,
  backgroundImage,
  className,
}: TitleSlideProps) {
  // 그라데이션 스타일 생성
  const gradientClass = gradient
    ? cn(
        gradientDirections[gradient.direction || "to-br"],
        `from-[${gradient.from}]`,
        gradient.via && `via-[${gradient.via}]`,
        `to-[${gradient.to}]`
      )
    : "";

  // 인라인 그라데이션 스타일 (Tailwind 클래스가 동적으로 생성되지 않을 경우)
  const gradientStyle = gradient
    ? {
        background: `linear-gradient(${
          gradient.direction?.replace("to-", "to ") || "to bottom right"
        }, ${gradient.from} 0%, ${gradient.via ? `${gradient.via} 50%, ` : ""}${
          gradient.to
        } 100%)`,
      }
    : {};

  // 배경 이미지 스타일
  const bgImageStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {};

  return (
    <SlideContainer
      className={cn(
        "relative",
        gradient && gradientClass,
        className
      )}
      padding="lg"
      animated={false} // 개별 애니메이션 사용
    >
      {/* 배경 오버레이 (그라데이션 + 이미지 조합) */}
      {backgroundImage && gradient && (
        <div
          className="absolute inset-0"
          style={{
            ...bgImageStyle,
            ...gradientStyle,
          }}
        />
      )}

      {/* 배경 이미지만 있는 경우 */}
      {backgroundImage && !gradient && (
        <div className="absolute inset-0" style={bgImageStyle} />
      )}

      {/* 콘텐츠 */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
        {/* 제목 */}
        <motion.h1
          className="mb-4 text-4xl font-bold md:text-5xl lg:text-6xl"
          style={{
            color: "var(--slide-text, #1a1a1a)",
          }}
          custom={0}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          {title}
        </motion.h1>

        {/* 부제 */}
        {subtitle && (
          <motion.p
            className="mb-8 text-xl md:text-2xl lg:text-3xl"
            style={{
              color: "var(--slide-textDim, #666666)",
            }}
            custom={1}
            variants={textVariants}
            initial="hidden"
            animate="visible"
          >
            {subtitle}
          </motion.p>
        )}

        {/* 발표자 및 날짜 */}
        <motion.div
          className="flex flex-col items-center gap-2"
          custom={2}
          variants={textVariants}
          initial="hidden"
          animate="visible"
        >
          {presenter && (
            <p
              className="text-lg font-medium md:text-xl"
              style={{
                color: "var(--slide-accent, #3b82f6)",
              }}
            >
              {presenter}
            </p>
          )}

          {date && (
            <div
              className="flex items-center gap-2 text-sm md:text-base"
              style={{
                color: "var(--slide-textDim, #666666)",
              }}
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <time dateTime={date}>{date}</time>
            </div>
          )}
        </motion.div>
      </div>

      {/* 장식용 하단 그라데이션 라인 */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 w-full"
        style={{
          background: `linear-gradient(to right, var(--slide-accent, #3b82f6), var(--slide-accent2, #8b5cf6))`,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
      />
    </SlideContainer>
  );
}

export default TitleSlide;
