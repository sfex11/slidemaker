import React from 'react'
import { SortableSlideItem } from './sortable-slide-item'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
}

interface SortableSlideListProps {
  slides: Slide[]
  selectedId?: string | null
  onSelect?: (id: string) => void
}

export function SortableSlideList({ slides, selectedId, onSelect }: SortableSlideListProps) {
  if (slides.length === 0) {
    return (
      <div className="text-center text-slate-400 text-sm py-8">
        슬라이드가 없습니다
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {slides.map((slide, index) => (
        <SortableSlideItem
          key={slide.id}
          slide={slide}
          isSelected={selectedId === slide.id}
          onSelect={onSelect}
        />
      ))}
      <p className="text-center text-xs text-slate-400 mt-2">
        슬라이드를 드래그하여 순서를 변경할 수 있습니다
      </p>
    </div>
  )
}

export default SortableSlideList
