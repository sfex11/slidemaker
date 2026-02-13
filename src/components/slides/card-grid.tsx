"use client";

/**
 * 카드 그리드 슬라이드 컴포넌트
 * 2~4열의 카드 그리드를 표시합니다.
 * 각 카드는 아이콘, 제목, 설명을 포함합니다.
 */

import { motion, type Variants } from "framer-motion";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideContainer } from "./slide-container";
import type { CardGridSlideProps, CardItem } from "@/types/slide";

// 열 수에 따른 그리드 클래스
const gridColsClasses = {
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
};

// 카드 애니메이션 variants
const cardVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: "easeOut" as const,
    },
  }),
};

// 동적 아이콘 렌더러 컴포넌트 - 정적으로 정의된 컴포넌트
function DynamicIcon({
  iconName,
  iconComponent,
  className,
  style,
}: {
  iconName?: string;
  iconComponent?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  className?: string;
  style?: React.CSSProperties;
}) {
  // 전달받은 컴포넌트가 있으면 사용
  if (iconComponent) {
    const IconComp = iconComponent;
    return <IconComp className={className} style={style} aria-hidden="true" />;
  }

  // 아이콘 이름으로 렌더링
  if (iconName) {
    const pascalCase = iconName
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const LucideIcon = (LucideIcons as Record<string, unknown>)[pascalCase] as
      | React.ComponentType<{ className?: string; style?: React.CSSProperties }>
      | undefined;

    if (LucideIcon) {
      return <LucideIcon className={className} style={style} aria-hidden="true" />;
    }
  }

  return null;
}

// 개별 카드 컴포넌트
function Card({
  card,
  index,
}: {
  card: CardItem;
  index: number;
}) {
  const hasIcon = card.icon || card.iconName;

  return (
    <motion.div
      className="flex flex-col items-center rounded-xl p-6 text-center transition-all duration-200 hover:scale-105"
      style={{
        backgroundColor: "var(--slide-surface2, #f5f5f5)",
        border: "1px solid var(--slide-border, #e5e5e5)",
      }}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
      }}
    >
      {/* 아이콘 */}
      {hasIcon && (
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            backgroundColor: "var(--slide-accent, #3b82f6)",
          }}
        >
          <DynamicIcon
            iconName={card.iconName}
            iconComponent={card.icon}
            className="h-7 w-7"
            style={{ color: "var(--slide-bg, #ffffff)" }}
          />
        </div>
      )}

      {/* 제목 */}
      <h3
        className="mb-2 text-lg font-semibold"
        style={{ color: "var(--slide-text, #1a1a1a)" }}
      >
        {card.title}
      </h3>

      {/* 설명 */}
      {card.description && (
        <p
          className="text-sm leading-relaxed"
          style={{ color: "var(--slide-textDim, #666666)" }}
        >
          {card.description}
        </p>
      )}
    </motion.div>
  );
}

export function CardGrid({
  id,
  title,
  cards,
  cols = 3,
  className,
}: CardGridSlideProps) {
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

      {/* 카드 그리드 */}
      <div className={cn("grid gap-6", gridColsClasses[cols])}>
        {cards.map((card, index) => (
          <Card key={card.id} card={card} index={index} />
        ))}
      </div>
    </SlideContainer>
  );
}

export default CardGrid;
