"use client";

/**
 * 타임라인 슬라이드 컴포넌트
 * 단계별 흐름을 가로 또는 세로 타임라인으로 표시합니다.
 * 번호, 제목, 설명을 포함합니다.
 */

import { motion, type Variants } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContainer } from "./slide-container";
import type { TimelineSlideProps, TimelineItem } from "@/types/slide";

// 동적 아이콘 렌더러 컴포넌트 - 정적으로 정의된 컴포넌트
function DynamicIcon({
  iconName,
  iconComponent,
  className,
}: {
  iconName?: string;
  iconComponent?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  // 전달받은 컴포넌트가 있으면 사용
  if (iconComponent) {
    const IconComp = iconComponent;
    return <IconComp className={className} aria-hidden="true" />;
  }

  // 아이콘 이름으로 렌더링
  if (iconName) {
    const pascalCase = iconName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const LucideIcon = (LucideIcons as Record<string, unknown>)[pascalCase] as
      | React.ComponentType<{ className?: string }>
      | undefined;

    if (LucideIcon) {
      return <LucideIcon className={className} aria-hidden="true" />;
    }
  }

  return null;
}

// 타임라인 아이템 애니메이션 variants
const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

// 가로 타임라인 아이템 애니메이션
const horizontalItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -30,
  },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

// 라인 애니메이션 variants
const lineVariants: Variants = {
  hidden: {
    scaleX: 0,
  },
  visible: {
    scaleX: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

// 세로 라인 애니메이션
const verticalLineVariants: Variants = {
  hidden: {
    scaleY: 0,
  },
  visible: {
    scaleY: 1,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

// 개별 타임라인 아이템 컴포넌트
function TimelineItemComponent({
  item,
  index,
  total,
  direction,
}: {
  item: TimelineItem;
  index: number;
  total: number;
  direction: "horizontal" | "vertical";
}) {
  const hasIcon = item.icon || item.iconName;
  const isLast = index === total - 1;
  const variants = direction === "horizontal" ? horizontalItemVariants : itemVariants;

  if (direction === "horizontal") {
    return (
      <motion.div
        className="relative flex flex-1 flex-col items-center"
        custom={index}
        variants={variants}
        initial="hidden"
        animate="visible"
      >
        {/* 연결선 (마지막 항목 제외) */}
        {!isLast && (
          <motion.div
            className="absolute left-1/2 top-6 h-0.5 w-full"
            style={{ backgroundColor: "var(--slide-border, #e5e5e5)" }}
            variants={lineVariants}
            initial="hidden"
            animate="visible"
          />
        )}

        {/* 단계 번호/아이콘 */}
        <div
          className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full font-bold"
          style={{
            backgroundColor: "var(--slide-accent, #3b82f6)",
            color: "var(--slide-bg, #ffffff)",
          }}
        >
          {hasIcon ? (
            <DynamicIcon
              iconName={item.iconName}
              iconComponent={item.icon}
              className="h-6 w-6"
            />
          ) : (
            item.step
          )}
        </div>

        {/* 제목 */}
        <h3
          className="mb-2 text-center text-base font-semibold md:text-lg"
          style={{ color: "var(--slide-text, #1a1a1a)" }}
        >
          {item.title}
        </h3>

        {/* 설명 */}
        {item.description && (
          <p
            className="text-center text-sm"
            style={{ color: "var(--slide-textDim, #666666)" }}
          >
            {item.description}
          </p>
        )}
      </motion.div>
    );
  }

  // 세로 방향
  return (
    <motion.div
      className="relative flex items-start gap-4 pl-8"
      custom={index}
      variants={variants}
      initial="hidden"
      animate="visible"
    >
      {/* 세로 연결선 */}
      {!isLast && (
        <motion.div
          className="absolute left-4 top-12 h-full w-0.5"
          style={{ backgroundColor: "var(--slide-border, #e5e5e5)" }}
          variants={verticalLineVariants}
          initial="hidden"
          animate="visible"
        />
      )}

      {/* 단계 번호/아이콘 */}
      <div
        className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
        style={{
          backgroundColor: "var(--slide-accent, #3b82f6)",
          color: "var(--slide-bg, #ffffff)",
        }}
      >
        {hasIcon ? (
          <DynamicIcon
            iconName={item.iconName}
            iconComponent={item.icon}
            className="h-4 w-4"
          />
        ) : (
          item.step
        )}
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 pb-8">
        <h3
          className="mb-2 text-lg font-semibold"
          style={{ color: "var(--slide-text, #1a1a1a)" }}
        >
          {item.title}
        </h3>
        {item.description && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--slide-textDim, #666666)" }}
          >
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function TimelineSlide({
  id,
  title,
  items,
  direction = "horizontal",
  className,
}: TimelineSlideProps) {
  return (
    <SlideContainer className={className} padding="lg">
      {/* 섹션 제목 */}
      {title && (
        <motion.h2
          className={cn(
            "mb-8 text-2xl font-bold md:text-3xl",
            direction === "horizontal" ? "text-center" : ""
          )}
          style={{ color: "var(--slide-text, #1a1a1a)" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {title}
        </motion.h2>
      )}

      {/* 타임라인 컨테이너 */}
      <div
        className={cn(
          direction === "horizontal"
            ? "flex items-start justify-between"
            : "flex flex-col"
        )}
      >
        {items.map((item, index) => (
          <TimelineItemComponent
            key={item.id}
            item={item}
            index={index}
            total={items.length}
            direction={direction}
          />
        ))}
      </div>
    </SlideContainer>
  );
}

export default TimelineSlide;
