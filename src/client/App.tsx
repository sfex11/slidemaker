import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  FileUp,
  Globe2,
  Loader2,
  LogOut,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react'

type SourceMode = 'url' | 'pdf' | 'markdown'

interface User {
  id: string
  email: string
  name: string
}

interface Slide {
  id: string
  type: string
  content: Record<string, unknown>
  order: number
}

interface Project {
  id: string
  name: string
  description?: string
  slides: Slide[]
  createdAt: string
  updatedAt: string
}

interface SvgTemplate {
  id: string
  fileName: string
  name: string
  description: string
  author: string
}

interface PreviewState {
  projectId: string
  projectName: string
  fileName: string
  html: string
  templateName: string
  blobUrl: string
}

interface ApiError extends Error {
  status?: number
}

const STORAGE_TOKEN_KEY = 'slidesaas_token'

const modeLabels: Record<SourceMode, string> = {
  url: '웹주소',
  pdf: 'PDF',
  markdown: '마크다운',
}

const endpointByMode: Record<SourceMode, string> = {
  url: '/api/generate/from-url',
  pdf: '/api/generate/from-pdf',
  markdown: '/api/generate/from-markdown',
}

function App() {
  const [authReady, setAuthReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [templates, setTemplates] = useState<SvgTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const [sourceMode, setSourceMode] = useState<SourceMode>('url')
  const [projectName, setProjectName] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [markdownInput, setMarkdownInput] = useState('')
  const [pdfFileName, setPdfFileName] = useState('')
  const [pdfBase64, setPdfBase64] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [busyProjectId, setBusyProjectId] = useState<string | null>(null)

  const previewBlobRef = useRef<string | null>(null)

  const activeTemplateName = useMemo(() => {
    if (!selectedTemplateId) return 'Default'
    return templates.find((template) => template.id === selectedTemplateId)?.name || 'Default'
  }, [selectedTemplateId, templates])

  const latestProject = projects[0]
  const canGenerate = (
    !isGenerating &&
    (
      (sourceMode === 'url' && urlInput.trim().length > 0) ||
      (sourceMode === 'markdown' && markdownInput.trim().length > 0) ||
      (sourceMode === 'pdf' && pdfBase64.length > 0)
    )
  )

  const clearPreview = () => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current)
      previewBlobRef.current = null
    }
    setPreview(null)
  }

  const clearSession = () => {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    setToken(null)
    setUser(null)
    setProjects([])
    setTemplates([])
    setSelectedTemplateId('')
    setSuccessMessage('')
    setActionError('')
    clearPreview()
  }

  const requestJson = async <T,>(path: string, init: RequestInit = {}, overrideToken?: string): Promise<T> => {
    const headers = new Headers(init.headers || {})
    const authToken = overrideToken ?? token

    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (authToken) {
      headers.set('Authorization', `Bearer ${authToken}`)
    }

    const response = await fetch(path, { ...init, headers })
    if (!response.ok) {
      let message = '요청 처리에 실패했습니다'
      try {
        const errorPayload = await response.json() as { error?: string }
        if (errorPayload.error) message = errorPayload.error
      } catch {
        // ignore parse errors
      }

      const apiError = new Error(message) as ApiError
      apiError.status = response.status
      throw apiError
    }

    return response.json() as Promise<T>
  }

  const openPreview = (payload: { projectId: string; projectName: string; fileName: string; html: string; templateName: string }) => {
    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current)
      previewBlobRef.current = null
    }

    const blob = new Blob([payload.html], { type: 'text/html;charset=utf-8' })
    const blobUrl = URL.createObjectURL(blob)
    previewBlobRef.current = blobUrl

    setPreview({
      ...payload,
      blobUrl,
    })
  }

  const triggerDownload = (fileName: string, html: string) => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)

    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    URL.revokeObjectURL(downloadUrl)
  }

  const loadWorkspace = async (authToken: string) => {
    setWorkspaceLoading(true)
    setActionError('')

    try {
      const [projectsResult, templatesResult] = await Promise.all([
        requestJson<{ projects: Project[] }>('/api/projects', { method: 'GET' }, authToken),
        requestJson<{ templates: SvgTemplate[] }>('/api/svg/templates', { method: 'GET' }, authToken),
      ])

      setProjects(projectsResult.projects || [])
      setTemplates(templatesResult.templates || [])
      setSelectedTemplateId((prev) => prev || templatesResult.templates?.[0]?.id || '')
    } catch (error) {
      const typedError = error as ApiError
      if (typedError.status === 401) {
        clearSession()
      } else {
        setActionError(typedError.message || '작업공간을 불러오지 못했습니다')
      }
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const exportProjectDeck = async (
    projectId: string,
    options?: { openInPreview?: boolean; download?: boolean; quiet?: boolean }
  ) => {
    const openInPreview = options?.openInPreview ?? true
    const download = options?.download ?? false
    const quiet = options?.quiet ?? false

    setBusyProjectId(projectId)
    try {
      const result = await requestJson<{
        fileName: string
        html: string
        template: { id: string; name: string }
      }>(`/api/projects/${projectId}/export/html`, {
        method: 'POST',
        body: JSON.stringify({
          templateId: selectedTemplateId || undefined,
        }),
      })

      const project = projects.find((item) => item.id === projectId)
      if (openInPreview && project) {
        openPreview({
          projectId,
          projectName: project.name,
          fileName: result.fileName,
          html: result.html,
          templateName: result.template.name,
        })
      }

      if (download) {
        triggerDownload(result.fileName, result.html)
      }

      return result
    } catch (error) {
      if (!quiet) {
        const typedError = error as ApiError
        setActionError(typedError.message || 'HTML 내보내기에 실패했습니다')
      }
      throw error
    } finally {
      setBusyProjectId(null)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm('이 프로젝트를 삭제하시겠습니까?')
    if (!confirmed) return

    setBusyProjectId(projectId)
    try {
      await requestJson<{ ok: boolean }>(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })

      setProjects((prev) => prev.filter((project) => project.id !== projectId))
      if (preview?.projectId === projectId) {
        clearPreview()
      }
      setSuccessMessage('프로젝트를 삭제했습니다.')
    } catch (error) {
      const typedError = error as ApiError
      setActionError(typedError.message || '프로젝트 삭제에 실패했습니다')
    } finally {
      setBusyProjectId(null)
    }
  }

  const fileToBase64 = async (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('PDF 파일을 읽을 수 없습니다'))
        return
      }

      const base64 = reader.result.includes(',') ? reader.result.split(',')[1] : reader.result
      resolve(base64)
    }

    reader.onerror = () => reject(new Error('PDF 파일 읽기 실패'))
    reader.readAsDataURL(file)
  })

  const handlePdfChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setPdfFileName('')
      setPdfBase64('')
      return
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setActionError('PDF 파일만 업로드할 수 있습니다.')
      event.target.value = ''
      return
    }

    try {
      const encoded = await fileToBase64(file)
      setPdfFileName(file.name)
      setPdfBase64(encoded)
      setActionError('')
    } catch (error) {
      const typedError = error as Error
      setActionError(typedError.message || 'PDF 처리에 실패했습니다.')
      setPdfFileName('')
      setPdfBase64('')
      event.target.value = ''
    }
  }

  const handleGenerate = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setActionError('')
    setSuccessMessage('')

    try {
      const payload: Record<string, string | undefined> = {
        name: projectName.trim() || undefined,
      }

      if (sourceMode === 'url') {
        payload.url = urlInput.trim()
      }
      if (sourceMode === 'markdown') {
        payload.markdown = markdownInput.trim()
      }
      if (sourceMode === 'pdf') {
        payload.base64 = pdfBase64
        payload.fileName = pdfFileName || 'document.pdf'
      }

      const result = await requestJson<{ project: Project }>(endpointByMode[sourceMode], {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setProjects((prev) => [result.project, ...prev.filter((project) => project.id !== result.project.id)])
      setSuccessMessage(`${modeLabels[sourceMode]} 입력으로 자동 생성을 완료했습니다.`)

      await exportProjectDeck(result.project.id, { openInPreview: true, download: false, quiet: true })

      if (sourceMode === 'url') setUrlInput('')
      if (sourceMode === 'markdown') setMarkdownInput('')
      if (sourceMode === 'pdf') {
        setPdfFileName('')
        setPdfBase64('')
      }
      setProjectName('')
    } catch (error) {
      const typedError = error as ApiError
      setActionError(typedError.message || '슬라이드 생성에 실패했습니다')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLogout = async () => {
    try {
      await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore logout failure and clear local session anyway
    }

    clearSession()
  }

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoginLoading(true)
    setLoginError('')

    try {
      const result = await requestJson<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      }, '')

      localStorage.setItem(STORAGE_TOKEN_KEY, result.token)
      setToken(result.token)
      setUser(result.user)
      setLoginPassword('')
      await loadWorkspace(result.token)
    } catch (error) {
      const typedError = error as ApiError
      setLoginError(typedError.message || '로그인에 실패했습니다')
    } finally {
      setLoginLoading(false)
      setAuthReady(true)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setSuccessMessage('')
    }, 3500)

    return () => clearTimeout(timer)
  }, [successMessage])

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      const savedToken = localStorage.getItem(STORAGE_TOKEN_KEY)
      if (!savedToken) {
        if (mounted) setAuthReady(true)
        return
      }

      try {
        const me = await requestJson<{ user: User }>('/api/auth/me', { method: 'GET' }, savedToken)
        if (!mounted) return

        setToken(savedToken)
        setUser(me.user)
        await loadWorkspace(savedToken)
      } catch {
        if (mounted) clearSession()
      } finally {
        if (mounted) setAuthReady(true)
      }
    }

    void bootstrap()

    return () => {
      mounted = false
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current)
      }
    }
  }, [])

  if (!authReady) {
    return (
      <div className="splash-screen">
        <Loader2 className="spin" size={28} />
        <p>서비스 초기화 중...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="login-page">
        <div className="orb orb-one" />
        <div className="orb orb-two" />
        <motion.section
          className="login-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="badge">AUTO SLIDE ENGINE</p>
          <h1>Auto Slide Foundry</h1>
          <p className="description">웹주소, PDF, 마크다운을 업로드하면 편집 없이 즉시 HTML 슬라이드를 생성합니다.</p>

          <form onSubmit={handleLogin} className="login-form">
            <label>
              이메일
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="username"
                required
              />
            </label>

            <label>
              비밀번호
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>

            {loginError && (
              <p className="error-inline">
                <AlertTriangle size={16} />
                {loginError}
              </p>
            )}

            <button className="primary-button" type="submit" disabled={loginLoading}>
              {loginLoading ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
              {loginLoading ? '로그인 중...' : '시작하기'}
            </button>
          </form>

          <p className="hint">처음 로그인하면 계정이 자동 생성됩니다.</p>
        </motion.section>
      </div>
    )
  }

  return (
    <div className="app-page">
      <div className="grain" />
      <header className="top-bar">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            <p className="brand-title">Auto Slide Foundry</p>
            <p className="brand-subtitle">No-edit HTML deck generation</p>
          </div>
        </div>

        <div className="top-actions">
          <div className="user-chip">
            <span>{user.name || user.email}</span>
            <small>{user.email}</small>
          </div>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            <LogOut size={16} />
            로그아웃
          </button>
        </div>
      </header>

      <main className="workspace-grid">
        <motion.section
          className="panel generator-panel"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="panel-head">
            <h2>
              <Sparkles size={18} />
              자동 생성
            </h2>
            <p>입력만 주고 바로 결과를 받는 퍼널</p>
          </div>

          <div className="mode-tabs" role="tablist" aria-label="입력 방식">
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === 'url'}
              className={sourceMode === 'url' ? 'active' : ''}
              onClick={() => setSourceMode('url')}
            >
              <Globe2 size={16} /> URL
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === 'pdf'}
              className={sourceMode === 'pdf' ? 'active' : ''}
              onClick={() => setSourceMode('pdf')}
            >
              <FileUp size={16} /> PDF
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sourceMode === 'markdown'}
              className={sourceMode === 'markdown' ? 'active' : ''}
              onClick={() => setSourceMode('markdown')}
            >
              <FileText size={16} /> Markdown
            </button>
          </div>

          <label className="field">
            프로젝트 이름 (선택)
            <input
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="비워두면 입력 기반으로 자동 이름 지정"
            />
          </label>

          <AnimatePresence mode="wait">
            {sourceMode === 'url' && (
              <motion.div
                key="url"
                className="field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <span>웹 주소</span>
                <input
                  type="url"
                  value={urlInput}
                  onChange={(event) => setUrlInput(event.target.value)}
                  placeholder="https://example.com/article"
                />
                <small>본문을 추출해 핵심 메시지를 자동 구성합니다.</small>
              </motion.div>
            )}

            {sourceMode === 'pdf' && (
              <motion.div
                key="pdf"
                className="field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <span>PDF 파일</span>
                <label className="file-drop">
                  <input type="file" accept="application/pdf" onChange={handlePdfChange} />
                  <FileUp size={16} />
                  {pdfFileName ? pdfFileName : 'PDF 업로드'}
                </label>
                <small>파일 텍스트를 분석해 5~9장 슬라이드를 생성합니다.</small>
              </motion.div>
            )}

            {sourceMode === 'markdown' && (
              <motion.div
                key="markdown"
                className="field"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <span>마크다운 본문</span>
                <textarea
                  rows={10}
                  value={markdownInput}
                  onChange={(event) => setMarkdownInput(event.target.value)}
                  placeholder={'# 제목\n\n## 핵심 포인트\n- 항목 1\n- 항목 2'}
                />
                <small>문단 구조를 기준으로 타이틀/비교/테이블 슬라이드를 자동 배치합니다.</small>
              </motion.div>
            )}
          </AnimatePresence>

          <label className="field">
            템플릿
            <select
              value={selectedTemplateId}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
              disabled={templates.length === 0}
            >
              {templates.length === 0 && <option value="">기본 템플릿</option>}
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <small>현재 선택: {activeTemplateName}</small>
          </label>

          <button type="button" className="primary-button" onClick={handleGenerate} disabled={!canGenerate}>
            {isGenerating ? <Loader2 className="spin" size={18} /> : <Wand2 size={18} />}
            {isGenerating ? '생성 중...' : 'HTML 슬라이드 자동 생성'}
          </button>

          <AnimatePresence>
            {actionError && (
              <motion.p
                className="status error"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <AlertTriangle size={16} />
                {actionError}
              </motion.p>
            )}
            {successMessage && (
              <motion.p
                className="status success"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
              >
                <CheckCircle2 size={16} />
                {successMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        <section className="right-column">
          <motion.section
            className="panel preview-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
          >
            <div className="panel-head preview-head">
              <h2>
                <Eye size={18} />
                자동 미리보기
              </h2>
              {preview && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => triggerDownload(preview.fileName, preview.html)}
                >
                  <Download size={16} /> HTML 다운로드
                </button>
              )}
            </div>

            {preview ? (
              <div className="preview-shell">
                <div className="preview-meta">
                  <strong>{preview.projectName}</strong>
                  <span>{preview.templateName}</span>
                </div>
                <iframe title="deck-preview" src={preview.blobUrl} />
              </div>
            ) : (
              <div className="preview-empty">
                <Sparkles size={20} />
                <p>생성 완료 후 자동으로 HTML 프리뷰가 열립니다.</p>
              </div>
            )}
          </motion.section>

          <motion.section
            className="panel history-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
          >
            <div className="panel-head">
              <h2>생성 히스토리</h2>
              <p>{workspaceLoading ? '불러오는 중...' : `${projects.length}개 프로젝트`}</p>
            </div>

            {workspaceLoading ? (
              <div className="history-empty">
                <Loader2 className="spin" size={20} />
                <p>프로젝트를 불러오고 있습니다.</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="history-empty">
                <FileText size={20} />
                <p>아직 생성된 프로젝트가 없습니다.</p>
              </div>
            ) : (
              <ul className="history-list">
                {projects.map((project, index) => (
                  <motion.li
                    key={project.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                  >
                    <div>
                      <strong>{project.name}</strong>
                      <small>{new Date(project.updatedAt).toLocaleString('ko-KR')}</small>
                    </div>

                    <div className="row-actions">
                      <button
                        type="button"
                        onClick={() => {
                          void exportProjectDeck(project.id, { openInPreview: true, download: false })
                        }}
                        disabled={busyProjectId === project.id}
                        title="미리보기"
                      >
                        {busyProjectId === project.id ? <Loader2 className="spin" size={15} /> : <Eye size={15} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void exportProjectDeck(project.id, { openInPreview: false, download: true })
                        }}
                        disabled={busyProjectId === project.id}
                        title="다운로드"
                      >
                        <Download size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void handleDeleteProject(project.id)
                        }}
                        disabled={busyProjectId === project.id}
                        title="삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}

            {latestProject && (
              <p className="footnote">최근 생성: <strong>{latestProject.name}</strong> · {latestProject.slides.length} slides</p>
            )}
          </motion.section>
        </section>
      </main>
    </div>
  )
}

export default App
