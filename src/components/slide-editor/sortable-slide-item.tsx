import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
}

interface SortableSlideItemProps {
  slide: Slide
  isSelected?: boolean
  onSelect?: (id: string) => void
}

export function SortableSlideItem({ slide, isSelected, onSelect }: SortableSlideItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex-shrink-0 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20'
          : 'border-slate-200 hover:border-blue-300'
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
      onClick={() => onSelect?.(slide.id)}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab p-1 opacity-0 group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-slate-400" />
      </div>

      <div className="flex h-16 w-24 items-center justify-center text-xs text-slate-500">
        <span className="ml-3 font-medium">{slide.type === 'title' ? '📊' : slide.type === 'card-grid' ? '📝' : '📄'}</span>
      </div>

      <div className="absolute bottom-1 right-1 rounded bg-slate-100 px-1 text-[10px] text-slate-500">
        {slide.type}
      </div>
    </div>
  )
}

export default SortableSlideItem
