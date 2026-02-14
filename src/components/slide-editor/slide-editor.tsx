import React from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Canvas } from './canvas'
import { Toolbar } from './toolbar'
import { PropertiesPanel } from './properties-panel'
import { SortableSlideList } from './sortable-slide-list'

// 슬라이드 타입
interface Slide {
  id: string
  type: 'title' | 'card-grid' | 'comparison' | 'timeline' | 'quote' | 'table'
  content: Record<string, unknown>
}

// 기본 슬라이드
const defaultSlides: Slide[] = [
  { id: '1', type: 'title', content: { title: '프레젠테이션 제목', subtitle: '부제목을 입력하세요' } },
  { id: '2', type: 'card-grid', content: { title: '주요 내용', items: ['항목 1', '항목 2', '항목 3'] } },
]

export function SlideEditor() {
  const [slides, setSlides] = React.useState<Slide[]>(defaultSlides)
  const [selectedSlideId, setSelectedSlideId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSlides((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const selectedSlide = slides.find(s => s.id === selectedSlideId)

  const addSlide = () => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      type: 'title',
      content: { title: '새 슬라이드', subtitle: '' }
    }
    setSlides([...slides, newSlide])
    setSelectedSlideId(newSlide.id)
  }

  const updateSlide = (id: string, content: Record<string, unknown>) => {
    setSlides(slides.map(s => s.id === id ? { ...s, content } : s))
  }

  return (
    <div className="flex h-full">
      {/* 왼쪽: 슬라이드 목록 */}
      <div className="w-64 border-r bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">슬라이드</h3>
          <button
            onClick={addSlide}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            + 추가
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides} strategy={verticalListSortingStrategy}>
            <SortableSlideList
              slides={slides}
              selectedId={selectedSlideId}
              onSelect={setSelectedSlideId}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* 중앙: 캔버스 */}
      <div className="flex-1 flex flex-col">
        <Toolbar isLoading={isLoading} />
        <div className="flex-1 flex items-center justify-center bg-slate-100 p-8">
          <Canvas slide={selectedSlide || slides[0]} />
        </div>
      </div>

      {/* 오른쪽: 속성 패널 */}
      <div className="w-80 border-l bg-white">
        <PropertiesPanel
          slide={selectedSlide || slides[0]}
          onUpdate={(content) => {
            if (selectedSlide) updateSlide(selectedSlide.id, content)
          }}
        />
      </div>
    </div>
  )
}
