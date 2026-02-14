import React from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Canvas } from './canvas'
import { Toolbar } from './toolbar'
import { PropertiesPanel } from './properties-panel'
import { SortableSlideList } from './sortable-slide-list'
import { Plus, Layout, Type, Grid, GitCompare, Clock, Quote, Table } from 'lucide-react'

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

const slideTypes = [
  { type: 'title', label: '타이틀', icon: Type },
  { type: 'card-grid', label: '카드 그리드', icon: Grid },
  { type: 'comparison', label: '비교', icon: GitCompare },
  { type: 'timeline', label: '타임라인', icon: Clock },
  { type: 'quote', label: '인용문', icon: Quote },
  { type: 'table', label: '표', icon: Table },
] as const

export function SlideEditor() {
  const [slides, setSlides] = React.useState<Slide[]>(defaultSlides)
  const [selectedSlideId, setSelectedSlideId] = React.useState<string | null>(slides[0]?.id || null)

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

  const addSlide = (type: Slide['type']) => {
    const newSlide: Slide = {
      id: Date.now().toString(),
      type,
      content: type === 'title'
        ? { title: '새 슬라이드', subtitle: '' }
        : type === 'card-grid'
        ? { title: '카드 그리드', items: ['항목 1', '항목 2', '항목 3'] }
        : { title: '새 슬라이드' }
    }
    setSlides([...slides, newSlide])
    setSelectedSlideId(newSlide.id)
  }

  const deleteSlide = (id: string) => {
    const newSlides = slides.filter(s => s.id !== id)
    setSlides(newSlides)
    if (selectedSlideId === id) {
      setSelectedSlideId(newSlides[0]?.id || null)
    }
  }

  const updateSlide = (content: Record<string, unknown>) => {
    if (selectedSlideId) {
      setSlides(slides.map(s => s.id === selectedSlideId ? { ...s, content } : s))
    }
  }

  return (
    <div className="flex h-full">
      {/* 왼쪽: 슬라이드 목록 */}
      <div className="w-72 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-slate-700">슬라이드</h3>
            <span className="text-xs text-slate-400">{slides.length}개</span>
          </div>

          {/* 슬라이드 타입 버튼들 */}
          <div className="grid grid-cols-3 gap-1">
            {slideTypes.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => addSlide(type)}
                className="flex flex-col items-center gap-1 p-2 text-xs text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title={label}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 슬라이드 리스트 */}
        <div className="flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={slides.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <SortableSlideList
                slides={slides}
                selectedId={selectedSlideId}
                onSelect={setSelectedSlideId}
              />
            </SortableContext>
          </DndContext>
        </div>

        {/* 슬라이드 삭제 버튼 */}
        {selectedSlideId && slides.length > 1 && (
          <div className="p-4 border-t">
            <button
              onClick={() => deleteSlide(selectedSlideId)}
              className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              슬라이드 삭제
            </button>
          </div>
        )}
      </div>

      {/* 중앙: 캔버스 */}
      <div className="flex-1 flex flex-col bg-slate-100">
        <Toolbar projectName="내 프레젠테이션" />
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <Canvas slide={selectedSlide} />
        </div>
      </div>

      {/* 오른쪽: 속성 패널 */}
      <div className="w-80 border-l bg-white flex flex-col">
        <PropertiesPanel
          slide={selectedSlide}
          onUpdate={updateSlide}
        />
      </div>
    </div>
  )
}

export default SlideEditor
