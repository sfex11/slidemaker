"use client";

/**
 * 테이블 슬라이드 컴포넌트
 * 데이터를 테이블 형태로 표시합니다.
 * 헤더, 행, 셀을 포함하며 스트라이프 및 테두리 옵션을 지원합니다.
 */

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { SlideContainer } from "./slide-container";
import type { TableSlideProps, TableRow, TableCell } from "@/types/slide";

// 테이블 애니메이션 variants
const tableVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      staggerChildren: 0.05,
    },
  },
};

// 행 애니메이션 variants
const rowVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
    },
  },
};

// 셀 정렬 클래스
const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// 개별 셀 컴포넌트
function TableCellComponent({
  cell,
  isHeader = false,
}: {
  cell: TableCell;
  isHeader?: boolean;
}) {
  const CellTag = isHeader ? "th" : "td";

  return (
    <CellTag
      className={cn(
        "px-4 py-3 text-sm md:text-base",
        alignClasses[cell.align || "left"],
        isHeader && "font-semibold"
      )}
      style={{
        color: isHeader
          ? "var(--slide-text, #1a1a1a)"
          : "var(--slide-textDim, #666666)",
      }}
      colSpan={cell.colspan}
    >
      {cell.content}
    </CellTag>
  );
}

// 테이블 행 컴포넌트
function TableRowComponent({
  row,
  isStriped,
  isBordered,
  rowIndex,
}: {
  row: TableRow;
  isStriped: boolean;
  isBordered: boolean;
  rowIndex: number;
}) {
  const isHeader = row.isHeader || rowIndex === 0;
  const isStripedRow = isStriped && !isHeader && rowIndex % 2 === 0;

  return (
    <motion.tr
      className={cn(
        "transition-colors duration-150",
        isHeader && "bg-[var(--slide-surface2,#f5f5f5)]",
        isStripedRow && "bg-[var(--slide-surface,#fafafa)]",
        isBordered && "border-b border-[var(--slide-border,#e5e5e5)]",
        !isHeader && "hover:bg-[var(--slide-surface2,#f0f0f0)]"
      )}
      variants={rowVariants}
    >
      {row.cells.map((cell, cellIndex) => (
        <TableCellComponent
          key={cellIndex}
          cell={cell}
          isHeader={isHeader}
        />
      ))}
    </motion.tr>
  );
}

export function TableSlide({
  id,
  title,
  headers,
  rows,
  striped = true,
  bordered = true,
  className,
}: TableSlideProps) {
  // 헤더 행 생성 (headers prop이 제공된 경우)
  const headerRow: TableRow | null = headers
    ? {
        id: "header-row",
        cells: headers.map((header) => ({
          content: header,
          align: "center" as const,
        })),
        isHeader: true,
      }
    : null;

  // 실제 렌더링할 행들
  const renderRows = headerRow ? [headerRow, ...rows] : rows;

  return (
    <SlideContainer className={className} padding="lg">
      {/* 섹션 제목 */}
      {title && (
        <motion.h2
          className="mb-6 text-2xl font-bold md:text-3xl"
          style={{ color: "var(--slide-text, #1a1a1a)" }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {title}
        </motion.h2>
      )}

      {/* 테이블 컨테이너 (스크롤 가능) */}
      <div className="overflow-x-auto">
        <motion.table
          className="w-full min-w-[600px]"
          style={{
            borderCollapse: bordered ? "collapse" : "separate",
          }}
          variants={tableVariants}
          initial="hidden"
          animate="visible"
        >
          <tbody>
            {renderRows.map((row, index) => (
              <TableRowComponent
                key={row.id}
                row={row}
                isStriped={striped}
                isBordered={bordered}
                rowIndex={index}
              />
            ))}
          </tbody>
        </motion.table>
      </div>

      {/* 테이블 하단 그림자 (시각적 구분) */}
      <motion.div
        className="mt-4 h-px w-full"
        style={{ backgroundColor: "var(--slide-border, #e5e5e5)" }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      />
    </SlideContainer>
  );
}

export default TableSlide;
