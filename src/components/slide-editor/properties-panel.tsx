import React from 'react'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
}

interface PropertiesPanelProps {
  slide?: Slide
  onUpdate?: (content: Record<string, unknown>) => void
  className?: string
}

export function PropertiesPanel({ slide, onUpdate, className }: PropertiesPanelProps) {
  const [title, setTitle] = React.useState('')
  const [subtitle, setSubtitle] = React.useState('')

  React.useEffect(() => {
    if (slide?.content) {
      setTitle((slide.content.title as string) || '')
      setSubtitle((slide.content.subtitle as string) || '')
    }
  }, [slide])

  const handleUpdate = () => {
    onUpdate?.({ ...slide?.content, title, subtitle })
  }

  if (!slide) {
    return (
      <div className={`p-4 ${className}`}>
        <p className="text-slate-400 text-sm">슬라이드를 선택하세요</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">속성</h2>
        <p className="text-sm text-slate-500">슬라이드 내용을 편집합니다.</p>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">슬라이드 타입</label>
          <p className="text-sm text-slate-500">{slide.type}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="제목 입력"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">부제</label>
          <input
            type="text"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
            placeholder="부제 입력"
          />
        </div>
      </div>

      <div className="border-t p-4">
        <button
          onClick={handleUpdate}
          className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          저장
        </button>
      </div>
    </div>
  )
}

export default PropertiesPanel
