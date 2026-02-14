import React from 'react'
import { ArrowLeft, Save, Download } from 'lucide-react'

interface ToolbarProps {
  projectName?: string
  isLoading?: boolean
  className?: string
}

export function Toolbar({ projectName = '새 프로젝트', isLoading, className }: ToolbarProps) {
  return (
    <div className={`border-b bg-white px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-lg font-semibold text-slate-900">{projectName}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 disabled:opacity-50">
            <Save className="h-4 w-4" />
            저장
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Download className="h-4 w-4" />
            내보내기
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
