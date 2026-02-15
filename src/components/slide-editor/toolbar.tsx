import { ArrowLeft, Save, Download } from 'lucide-react'

interface ToolbarProps {
  projectName?: string
  onExport?: () => void
  isExporting?: boolean
  className?: string
}

export function Toolbar({ projectName = '새 프로젝트', onExport, isExporting = false, className }: ToolbarProps) {
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
          <button type="button" className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-slate-50 disabled:opacity-50">
            <Save className="h-4 w-4" />
            저장
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? '내보내는 중...' : '내보내기'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
