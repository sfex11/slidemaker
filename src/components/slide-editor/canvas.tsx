import React from 'react'
import { motion } from 'framer-motion'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
}

interface CanvasProps {
  slide?: Slide
  className?: string
}

export function Canvas({ slide, className }: CanvasProps) {
  if (!slide) {
    return (
      <div className={`flex items-center justify-center h-full bg-slate-100 rounded-xl ${className}`}>
        <p className="text-slate-400">슬라이드를 선택하세요</p>
      </div>
    )
  }

  const { content } = slide

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border bg-white ${className}`}
    >
      <div className="h-full p-12 flex flex-col justify-center">
        {slide.type === 'title' && (
          <>
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              {(content.title as string) || '제목 없음'}
            </h1>
            {content.subtitle && (
              <p className="text-xl text-slate-600">
                {content.subtitle as string}
              </p>
            )}
          </>
        )}

        {slide.type === 'card-grid' && (
          <>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {(content.title as string) || '카드 그리드'}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {Array.isArray(content.items) && content.items.map((item: string, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-lg">
                  {item}
                </div>
              ))}
            </div>
          </>
        )}

        {!['title', 'card-grid'].includes(slide.type) && (
          <div className="text-center text-slate-400">
            {slide.type} 슬라이드
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default Canvas
