"use client";

/**
 * SortableSlideItem 컴포넌트
 * 드래그 가능한 개별 슬라이드 아이템
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { SlideProps } from "@/types/slide";

interface SortableSlideItemProps {
  slide: SlideProps;
  index: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}

export function SortableSlideItem({
  slide,
  index,
  isSelected,
  onSelect,
}: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slide.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex-shrink-0 rounded-lg border-2 transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      } ${isDragging ? "shadow-lg" : ""}`}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab p-1 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* 슬라이드 썸네일 */}
      <button
        className="flex h-16 w-24 items-center justify-center text-xs text-muted-foreground"
        onClick={() => onSelect(index)}
      >
        <span className="ml-3 font-medium">{index + 1}</span>
      </button>

      {/* 슬라이드 타입 표시 */}
      <div className="absolute bottom-1 right-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">
        {slide.type}
      </div>
    </div>
  );
}
