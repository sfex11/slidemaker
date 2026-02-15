import { motion } from 'framer-motion'
import { Quote, Clock, GitCompare, Table, Grid, Type } from 'lucide-react'

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
}

interface CanvasProps {
  slide?: Slide
  className?: string
}

const toText = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
)

const hasText = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
)

export function Canvas({ slide, className }: CanvasProps) {
  if (!slide) {
    return (
      <div className={`flex items-center justify-center h-full bg-slate-100 rounded-xl ${className ?? ''}`}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-200 flex items-center justify-center">
            <Type className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-400 font-medium">슬라이드를 선택하세요</p>
          <p className="text-slate-300 text-sm mt-1">왼쪽 목록에서 슬라이드를 클릭하세요</p>
        </div>
      </div>
    )
  }

  const { content } = slide

  const renderSlideContent = () => {
    switch (slide.type) {
      case 'title': {
        const title = toText(content.title, '제목 없음')
        const subtitle = toText(content.subtitle)
        const author = toText(content.author)

        return (
          <div className="h-full flex flex-col justify-center items-center text-center px-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold text-slate-900 mb-6"
            >
              {title}
            </motion.h1>
            {hasText(subtitle) && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-2xl text-slate-600 max-w-2xl"
              >
                {subtitle}
              </motion.p>
            )}
            {hasText(author) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-8 text-slate-500"
              >
                {author}
              </motion.p>
            )}
          </div>
        )
      }

      case 'card-grid': {
        const items = Array.isArray(content.items)
          ? content.items.map((item) => toText(item)).filter(Boolean)
          : []
        const cols = typeof content.columns === 'number' ? content.columns : 3

        return (
          <div className="h-full flex flex-col justify-center px-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-900 mb-8 text-center"
            >
              {toText(content.title, '카드 그리드')}
            </motion.h2>
            <div className={`grid gap-4 ${cols === 2 ? 'grid-cols-2' : cols === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {items.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                    <Grid className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-slate-700 font-medium">{item}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )
      }

      case 'comparison': {
        const leftItems = Array.isArray(content.leftItems)
          ? content.leftItems.map((item) => toText(item)).filter(Boolean)
          : ['왼쪽 항목']
        const rightItems = Array.isArray(content.rightItems)
          ? content.rightItems.map((item) => toText(item)).filter(Boolean)
          : ['오른쪽 항목']

        return (
          <div className="h-full flex flex-col justify-center px-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-900 mb-8 text-center"
            >
              {toText(content.title, '비교')}
            </motion.h2>
            <div className="grid grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-6 bg-blue-50 rounded-xl border-2 border-blue-200"
              >
                <h3 className="text-xl font-bold text-blue-700 mb-4 flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  {toText(content.leftTitle, '옵션 A')}
                </h3>
                <ul className="space-y-2">
                  {leftItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="p-6 bg-purple-50 rounded-xl border-2 border-purple-200"
              >
                <h3 className="text-xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                  <GitCompare className="w-5 h-5" />
                  {toText(content.rightTitle, '옵션 B')}
                </h3>
                <ul className="space-y-2">
                  {rightItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-purple-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        )
      }

      case 'timeline': {
        const timelineItems = Array.isArray(content.items)
          ? content.items.map((item) => ({
            title: toText((item as { title?: unknown })?.title),
            description: toText((item as { description?: unknown })?.description),
          }))
          : [{ title: '단계 1', description: '설명' }]

        return (
          <div className="h-full flex flex-col justify-center px-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-900 mb-10 text-center flex items-center justify-center gap-3"
            >
              <Clock className="w-8 h-8 text-blue-500" />
              {toText(content.title, '타임라인')}
            </motion.h2>
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500" />
              <div className="space-y-6">
                {timelineItems.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.15 }}
                    className="flex items-start gap-4 pl-4"
                  >
                    <div className="w-5 h-5 rounded-full bg-white border-4 border-blue-500 z-10 flex-shrink-0" />
                    <div className="flex-1 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <h4 className="font-bold text-slate-800">{item.title || `단계 ${index + 1}`}</h4>
                      <p className="text-slate-600 text-sm mt-1">{item.description || '설명을 입력하세요'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      case 'quote': {
        const quote = toText(content.quote, '인용문을 입력하세요')
        const author = toText(content.author)
        const authorTitle = toText(content.authorTitle)
        const authorImage = toText(content.authorImage)

        return (
          <div className="h-full flex flex-col justify-center items-center px-16">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-3xl"
            >
              <Quote className="w-12 h-12 text-blue-300 mx-auto mb-6" />
              <blockquote className="text-3xl font-medium text-slate-800 leading-relaxed mb-8">
                "{quote}"
              </blockquote>
              {hasText(author) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-center gap-3"
                >
                  {hasText(authorImage) && (
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                      <img src={authorImage} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="font-semibold text-slate-700">{author}</p>
                    {hasText(authorTitle) && (
                      <p className="text-sm text-slate-500">{authorTitle}</p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )
      }

      case 'table': {
        const headers = Array.isArray(content.headers)
          ? content.headers.map((header) => toText(header)).filter(Boolean)
          : ['헤더 1', '헤더 2', '헤더 3']
        const rows = Array.isArray(content.rows)
          ? content.rows.map((row) => (
            Array.isArray(row)
              ? row.map((cell) => toText(cell))
              : []
          ))
          : [['데이터 1', '데이터 2', '데이터 3']]

        return (
          <div className="h-full flex flex-col justify-center px-12">
            <motion.h2
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold text-slate-900 mb-8 text-center flex items-center justify-center gap-3"
            >
              <Table className="w-8 h-8 text-blue-500" />
              {toText(content.title, '표')}
            </motion.h2>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100">
                    {headers.map((header, index) => (
                      <th
                        key={index}
                        className="px-6 py-4 text-left text-sm font-semibold text-slate-700 border-b border-slate-200"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <motion.tr
                      key={rowIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: rowIndex * 0.1 }}
                      className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 text-sm text-slate-600 border-b border-slate-100">
                          {cell}
                        </td>
                      ))}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }

      default:
        return (
          <div className="h-full flex items-center justify-center">
            <p className="text-slate-400">알 수 없는 슬라이드 타입: {slide.type}</p>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`w-full max-w-4xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white ${className ?? ''}`}
    >
      {renderSlideContent()}
    </motion.div>
  )
}

export default Canvas
