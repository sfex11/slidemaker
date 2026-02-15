import React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Canvas } from './canvas'
import { Toolbar } from './toolbar'
import { PropertiesPanel } from './properties-panel'
import { SortableSlideList } from './sortable-slide-list'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
  order?: number
}

interface SlideEditorProps {
  projectId: string
  projectName: string
  slides: Slide[]
  onSlideUpdate: (slideId: string, content: Record<string, unknown>) => void | Promise<void>
  onSlidesReorder?: (orderedSlideIds: string[]) => void | Promise<void>
  onExport?: () => void | Promise<void>
  isExporting?: boolean
}

export function SlideEditor({
  projectId,
  projectName,
  slides,
  onSlideUpdate,
  onSlidesReorder,
  onExport,
  isExporting = false,
}: SlideEditorProps) {
  const [localSlides, setLocalSlides] = React.useState<Slide[]>(slides)
  const [selectedSlideId, setSelectedSlideId] = React.useState<string | null>(slides[0]?.id ?? null)

  React.useEffect(() => {
    setLocalSlides(slides)
  }, [projectId, slides])

  React.useEffect(() => {
    if (localSlides.length === 0) {
      setSelectedSlideId(null)
      return
    }

    if (!selectedSlideId || !localSlides.some(slide => slide.id === selectedSlideId)) {
      setSelectedSlideId(localSlides[0].id)
    }
  }, [localSlides, selectedSlideId])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeId === overId) return

    setLocalSlides((items) => {
      const oldIndex = items.findIndex((item) => item.id === activeId)
      const newIndex = items.findIndex((item) => item.id === overId)
      if (oldIndex < 0 || newIndex < 0) return items

      const nextSlides = arrayMove(items, oldIndex, newIndex)
      if (onSlidesReorder) void onSlidesReorder(nextSlides.map(slide => slide.id))
      return nextSlides
    })
  }, [onSlidesReorder])

  const selectedSlide = localSlides.find(slide => slide.id === selectedSlideId)

  const updateSlide = React.useCallback((content: Record<string, unknown>) => {
    if (!selectedSlideId) return

    setLocalSlides((items) => items.map((item) => (
      item.id === selectedSlideId ? { ...item, content } : item
    )))
    void onSlideUpdate(selectedSlideId, content)
  }, [onSlideUpdate, selectedSlideId])

  return (
    <div className="flex h-full">
      <div className="w-72 border-r bg-slate-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-slate-700">슬라이드</h3>
            <span className="text-xs text-slate-400">{localSlides.length}개</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={localSlides.map(slide => slide.id)} strategy={verticalListSortingStrategy}>
              <SortableSlideList
                slides={localSlides}
                selectedId={selectedSlideId}
                onSelect={setSelectedSlideId}
              />
            </SortableContext>
          </DndContext>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-slate-100">
        <Toolbar projectName={projectName} onExport={() => { void onExport?.() }} isExporting={isExporting} />
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <Canvas slide={selectedSlide} />
        </div>
      </div>

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
