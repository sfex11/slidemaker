import React from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

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
  const [localContent, setLocalContent] = React.useState<Record<string, unknown>>({})

  React.useEffect(() => {
    if (slide?.content) {
      setLocalContent({ ...slide.content })
    }
  }, [slide])

  const updateField = (field: string, value: unknown) => {
    const newContent = { ...localContent, [field]: value }
    setLocalContent(newContent)
  }

  const updateArrayItem = (field: string, index: number, value: string) => {
    const arr = [...(localContent[field] as string[] || [])]
    arr[index] = value
    updateField(field, arr)
  }

  const addArrayItem = (field: string, defaultValue: string = '새 항목') => {
    const arr = [...(localContent[field] as string[] || []), defaultValue]
    updateField(field, arr)
  }

  const removeArrayItem = (field: string, index: number) => {
    const arr = [...(localContent[field] as string[] || [])]
    arr.splice(index, 1)
    updateField(field, arr)
  }

  const handleApply = () => {
    onUpdate?.(localContent)
  }

  if (!slide) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <Plus className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-400 font-medium">슬라이드를 선택하세요</p>
          <p className="text-slate-300 text-sm mt-1">속성을 편집할 슬라이드를 선택하세요</p>
        </div>
      </div>
    )
  }

  const renderFields = () => {
    switch (slide.type) {
      case 'title':
        return (
          <>
            <InputField
              label="제목"
              value={(localContent.title as string) || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="프레젠테이션 제목"
            />
            <InputField
              label="부제목"
              value={(localContent.subtitle as string) || ''}
              onChange={(v) => updateField('subtitle', v)}
              placeholder="부제목을 입력하세요"
            />
            <InputField
              label="발표자"
              value={(localContent.author as string) || ''}
              onChange={(v) => updateField('author', v)}
              placeholder="발표자 이름"
            />
          </>
        )

      case 'card-grid':
        const cardItems = (localContent.items as string[]) || ['항목 1', '항목 2', '항목 3']
        return (
          <>
            <InputField
              label="제목"
              value={(localContent.title as string) || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="카드 그리드 제목"
            />
            <SelectField
              label="열 개수"
              value={(localContent.columns as number) || 3}
              onChange={(v) => updateField('columns', v)}
              options={[
                { value: 2, label: '2열' },
                { value: 3, label: '3열' },
                { value: 4, label: '4열' },
              ]}
            />
            <ArrayField
              label="카드 항목"
              items={cardItems}
              onAdd={() => addArrayItem('items', '새 항목')}
              onUpdate={(i, v) => updateArrayItem('items', i, v)}
              onRemove={(i) => removeArrayItem('items', i)}
            />
          </>
        )

      case 'comparison':
        const leftItems = (localContent.leftItems as string[]) || ['항목 1']
        const rightItems = (localContent.rightItems as string[]) || ['항목 1']
        return (
          <>
            <InputField
              label="제목"
              value={(localContent.title as string) || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="비교 제목"
            />
            <div className="border-t pt-4 mt-4">
              <InputField
                label="왼쪽 제목"
                value={(localContent.leftTitle as string) || ''}
                onChange={(v) => updateField('leftTitle', v)}
                placeholder="옵션 A"
              />
              <ArrayField
                label="왼쪽 항목"
                items={leftItems}
                onAdd={() => addArrayItem('leftItems', '새 항목')}
                onUpdate={(i, v) => updateArrayItem('leftItems', i, v)}
                onRemove={(i) => removeArrayItem('leftItems', i)}
              />
            </div>
            <div className="border-t pt-4 mt-4">
              <InputField
                label="오른쪽 제목"
                value={(localContent.rightTitle as string) || ''}
                onChange={(v) => updateField('rightTitle', v)}
                placeholder="옵션 B"
              />
              <ArrayField
                label="오른쪽 항목"
                items={rightItems}
                onAdd={() => addArrayItem('rightItems', '새 항목')}
                onUpdate={(i, v) => updateArrayItem('rightItems', i, v)}
                onRemove={(i) => removeArrayItem('rightItems', i)}
              />
            </div>
          </>
        )

      case 'timeline':
        const timelineItems = (localContent.items as Array<{ title: string; description: string }>) || [
          { title: '단계 1', description: '설명' }
        ]
        return (
          <>
            <InputField
              label="제목"
              value={(localContent.title as string) || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="타임라인 제목"
            />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">타임라인 항목</label>
                <button
                  onClick={() => {
                    const newItems = [...timelineItems, { title: `단계 ${timelineItems.length + 1}`, description: '' }]
                    updateField('items', newItems)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  항목 추가
                </button>
              </div>
              {timelineItems.map((item, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-600 w-6">{i + 1}</span>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const newItems = [...timelineItems]
                        newItems[i] = { ...newItems[i], title: e.target.value }
                        updateField('items', newItems)
                      }}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      placeholder="단계 제목"
                    />
                    {timelineItems.length > 1 && (
                      <button
                        onClick={() => {
                          const newItems = timelineItems.filter((_, idx) => idx !== i)
                          updateField('items', newItems)
                        }}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...timelineItems]
                      newItems[i] = { ...newItems[i], description: e.target.value }
                      updateField('items', newItems)
                    }}
                    className="w-full px-2 py-1 text-sm border rounded resize-none"
                    rows={2}
                    placeholder="설명을 입력하세요"
                  />
                </div>
              ))}
            </div>
          </>
        )

      case 'quote':
        return (
          <>
            <TextareaField
              label="인용문"
              value={(localContent.quote as string) || ''}
              onChange={(v) => updateField('quote', v)}
              placeholder="인용문을 입력하세요"
              rows={4}
            />
            <InputField
              label="발화자"
              value={(localContent.author as string) || ''}
              onChange={(v) => updateField('author', v)}
              placeholder="발화자 이름"
            />
            <InputField
              label="발화자 직함"
              value={(localContent.authorTitle as string) || ''}
              onChange={(v) => updateField('authorTitle', v)}
              placeholder="예: CEO, 작가"
            />
          </>
        )

      case 'table':
        const headers = (localContent.headers as string[]) || ['헤더 1', '헤더 2', '헤더 3']
        const rows = (localContent.rows as string[][]) || [['데이터 1', '데이터 2', '데이터 3']]
        return (
          <>
            <InputField
              label="제목"
              value={(localContent.title as string) || ''}
              onChange={(v) => updateField('title', v)}
              placeholder="표 제목"
            />
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-700">헤더</label>
              {headers.map((header, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={header}
                    onChange={(e) => {
                      const newHeaders = [...headers]
                      newHeaders[i] = e.target.value
                      updateField('headers', newHeaders)
                    }}
                    className="flex-1 px-3 py-2 text-sm border rounded-md"
                    placeholder={`헤더 ${i + 1}`}
                  />
                  {headers.length > 2 && (
                    <button
                      onClick={() => {
                        const newHeaders = headers.filter((_, idx) => idx !== i)
                        const newRows = rows.map(row => row.filter((_, idx) => idx !== i))
                        updateField('headers', newHeaders)
                        updateField('rows', newRows)
                      }}
                      className="p-2 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  updateField('headers', [...headers, `헤더 ${headers.length + 1}`])
                  updateField('rows', rows.map(row => [...row, '']))
                }}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                열 추가
              </button>
            </div>
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">데이터 행</label>
                <button
                  onClick={() => updateField('rows', [...rows, headers.map(() => '')])}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  행 추가
                </button>
              </div>
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  {row.map((cell, j) => (
                    <input
                      key={j}
                      type="text"
                      value={cell}
                      onChange={(e) => {
                        const newRows = [...rows]
                        newRows[i][j] = e.target.value
                        updateField('rows', newRows)
                      }}
                      className="flex-1 px-2 py-1 text-sm border rounded"
                      placeholder={`${i + 1}-${j + 1}`}
                    />
                  ))}
                  {rows.length > 1 && (
                    <button
                      onClick={() => {
                        const newRows = rows.filter((_, idx) => idx !== i)
                        updateField('rows', newRows)
                      }}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )

      default:
        return <p className="text-slate-400">지원하지 않는 슬라이드 타입입니다</p>
    }
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 헤더 */}
      <div className="border-b p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">속성 편집</h2>
            <p className="text-sm text-slate-500 mt-1">
              {slide.type === 'title' && '타이틀 슬라이드'}
              {slide.type === 'card-grid' && '카드 그리드 슬라이드'}
              {slide.type === 'comparison' && '비교 슬라이드'}
              {slide.type === 'timeline' && '타임라인 슬라이드'}
              {slide.type === 'quote' && '인용문 슬라이드'}
              {slide.type === 'table' && '표 슬라이드'}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{slide.id}</span>
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderFields()}
      </div>

      {/* 푸터 */}
      <div className="border-t p-4 bg-slate-50">
        <button
          onClick={handleApply}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        >
          변경사항 적용
        </button>
      </div>
    </div>
  )
}

// 재사용 가능한 입력 필드 컴포넌트들
function InputField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        placeholder={placeholder}
      />
    </div>
  )
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 3
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
        placeholder={placeholder}
        rows={rows}
      />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string
  value: number
  onChange: (value: number) => void
  options: { value: number; label: string }[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function ArrayField({
  label,
  items,
  onAdd,
  onUpdate,
  onRemove
}: {
  label: string
  items: string[]
  onAdd: () => void
  onUpdate: (index: number, value: string) => void
  onRemove: (index: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <button
          onClick={onAdd}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          항목 추가
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-slate-300" />
            <input
              type="text"
              value={item}
              onChange={(e) => onUpdate(i, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder={`${label} ${i + 1}`}
            />
            {items.length > 1 && (
              <button
                onClick={() => onRemove(i)}
                className="p-2 text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PropertiesPanel
