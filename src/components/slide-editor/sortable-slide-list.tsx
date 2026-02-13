"use client";

/**
 * SortableSlideList 컴포넌트
 * 드래그 앤 드롭으로 순서 변경이 가능한 슬라이드 리스트
 */

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableSlideItem } from "./sortable-slide-item";
import { Loader2 } from "lucide-react";
import type { SlideProps } from "@/types/slide";

interface SortableSlideListProps {
  slides: SlideProps[];
  currentIndex: number;
  onSlideSelect: (index: number) => void;
  onReorder: (slides: SlideProps[]) => void | Promise<void>;
  projectId?: string;
}

export function SortableSlideList({
  slides,
  currentIndex,
  onSlideSelect,
  onReorder,
  projectId,
}: SortableSlideListProps) {
  const [isReordering, setIsReordering] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동해야 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = slides.findIndex((slide) => slide.id === active.id);
      const newIndex = slides.findIndex((slide) => slide.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      const newSlides = arrayMove(slides, oldIndex, newIndex);

      // order 속성 업데이트
      const updatedSlides = newSlides.map((slide, index) => ({
        ...slide,
        order: index,
      }));

      setIsReordering(true);

      try {
        // 로컬 상태 먼저 업데이트 (낙관적 업데이트)
        onReorder(updatedSlides);

        // API 호출 (projectId가 있을 경우)
        if (projectId) {
          const response = await fetch(
            `/api/projects/${projectId}/slides/reorder`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                slides: updatedSlides.map((slide, index) => ({
                  id: slide.id,
                  order: index,
                })),
              }),
            }
          );

          if (!response.ok) {
            // 실패 시 원래 순서로 복구
            onReorder(slides);
            throw new Error("슬라이드 순서 변경에 실패했습니다.");
          }
        }
      } catch (error) {
        console.error("슬라이드 재정렬 오류:", error);
        // 에러 발생 시 원래 순서로 복구
        onReorder(slides);
      } finally {
        setIsReordering(false);
      }
    },
    [slides, onReorder, projectId]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  return (
    <div className="relative">
      {/* 로딩 오버레이 */}
      {isReordering && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50">
          <div className="flex items-center gap-2 rounded-lg bg-card px-4 py-2 shadow-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">순서 변경 중...</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={slides.map((slide) => slide.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex justify-center gap-2 overflow-x-auto pb-2">
            {slides.map((slide, index) => (
              <SortableSlideItem
                key={slide.id}
                slide={slide}
                index={index}
                isSelected={index === currentIndex}
                onSelect={onSlideSelect}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* 드래그 안내 메시지 */}
      <p className="mt-2 text-center text-xs text-muted-foreground">
        슬라이드를 드래그하여 순서를 변경할 수 있습니다
      </p>
    </div>
  );
}
