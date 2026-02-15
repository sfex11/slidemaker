import { useState, useEffect } from 'react'
import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, FolderOpen, Palette, Menu, X, LogOut, Globe, FileText, Type, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SlideEditor } from '@/components/slide-editor'

// 인증 컨텍스트
const AuthContext = React.createContext<{
  user: { id: string; email: string; name: string } | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}>({ user: null, login: async () => false, logout: () => {} })

// 프로젝트 타입
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

// 로그인 페이지
function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = React.useContext(AuthContext)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const success = await login(email, password)
    if (!success) {
      setError('로그인 실패')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Slide Maker</h1>
            <p className="text-slate-500 mt-2">AI 기반 슬라이드 생성 플랫폼</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="name@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="********"
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full py-3 text-base"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '로그인'}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            최초 접속 시 자동으로 계정이 생성됩니다
          </p>
        </div>
      </motion.div>
    </div>
  )
}

// 새 프로젝트 생성 모달
function NewProjectModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean
  onClose: () => void
  onSuccess: (project: Project) => void
}) {
  const [mode, setMode] = useState<'url' | 'markdown' | 'text'>('url')
  const [url, setUrl] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('token')
      const endpoints = {
        url: '/api/generate/from-url',
        markdown: '/api/generate/from-markdown',
        text: '/api/generate/from-text'
      }
      const bodies = {
        url: { url, name: name || undefined },
        markdown: { markdown, name: name || undefined },
        text: { text, name: name || undefined }
      }

      const res = await fetch(endpoints[mode], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodies[mode])
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '생성 실패')
      }

      const data = await res.json()
      onSuccess(data.project)
      onClose()
      navigate(`/projects/${data.project.id}`)
    } catch (err: any) {
      setError(err.message || '생성 실패')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">새 프로젝트 만들기</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 모드 탭 */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'url', label: 'URL', icon: Globe },
              { id: 'markdown', label: '마크다운', icon: FileText },
              { id: 'text', label: '텍스트', icon: Type },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setMode(id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  mode === id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[50vh]">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 프로젝트 이름 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              프로젝트 이름 (선택)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="자동 생성됨"
            />
          </div>

          {/* URL 입력 */}
          {mode === 'url' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                웹페이지 URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com/article"
              />
              <p className="text-xs text-slate-400 mt-2">
                웹페이지의 내용을 분석하여 자동으로 슬라이드를 생성합니다.
              </p>
            </div>
          )}

          {/* 마크다운 입력 */}
          {mode === 'markdown' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                마크다운 내용
              </label>
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                rows={12}
                placeholder="# 제목

## 섹션 1
- 내용 1
- 내용 2

## 섹션 2
..."
              />
              <p className="text-xs text-slate-400 mt-2">
                마크다운 형식의 텍스트를 슬라이드로 변환합니다.
              </p>
            </div>
          )}

          {/* 텍스트 입력 */}
          {mode === 'text' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                텍스트 내용
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={12}
                placeholder="프레젠테이션으로 만들고 싶은 내용을 자유롭게 입력하세요..."
              />
              <p className="text-xs text-slate-400 mt-2">
                일반 텍스트를 AI가 분석하여 슬라이드로 변환합니다.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-slate-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (mode === 'url' && !url) || (mode === 'markdown' && !markdown) || (mode === 'text' && !text)}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                슬라이드 생성
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// 대시보드 페이지
function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  const fetchProjects = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('프로젝트 로드 실패:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleDeleteProject = async (id: string) => {
    if (!confirm('이 프로젝트를 삭제하시겠습니까?')) return

    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setProjects(projects.filter(p => p.id !== id))
    } catch (err) {
      console.error('삭제 실패:', err)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold">내 프로젝트</h2>
            <p className="text-slate-500 mt-1">프로젝트를 선택하거나 새로 만드세요</p>
          </div>
          <Button size="lg" className="gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5" />
            새 프로젝트
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-xl">
            <FolderOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 mb-4">아직 프로젝트가 없습니다</p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              첫 프로젝트 만들기
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-slate-300 mb-1">
                      {project.slides.length}
                    </div>
                    <div className="text-xs text-slate-400">슬라이드</div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project.id)
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(project) => {
          setProjects([project, ...projects])
        }}
      />
    </div>
  )
}

// 프로젝트 편집 페이지
function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [templates, setTemplates] = useState<SvgTemplate[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (id) {
      fetchProject()
      fetchTemplates()
    }
  }, [id])

  const fetchProject = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        navigate('/')
        return
      }
      const data = await res.json()
      setProject(data.project)
      setSlides(data.project.slides || [])
    } catch (err) {
      console.error('프로젝트 로드 실패:', err)
      navigate('/')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTemplates = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/svg/templates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error('템플릿 로드 실패:', err)
    }
  }

  const updateSlide = async (slideId: string, content: Record<string, unknown>) => {
    const token = localStorage.getItem('token')
    try {
      await fetch(`/api/slides/${slideId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
      })
      setSlides(slides.map(s => s.id === slideId ? { ...s, content } : s))
    } catch (err) {
      console.error('슬라이드 업데이트 실패:', err)
    }
  }

  const exportProject = async () => {
    if (!id) return

    const token = localStorage.getItem('token')
    const defaultTemplate = templates[0]?.id || 'default'
    const hint = templates.map((template) => template.id).join(', ')
    const selectedTemplate = window.prompt(
      hint ? `템플릿 ID를 선택하세요 (${hint})` : '템플릿 ID를 입력하세요',
      defaultTemplate
    )
    if (selectedTemplate === null) return

    setIsExporting(true)
    try {
      const res = await fetch(`/api/projects/${id}/export/html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ templateId: selectedTemplate.trim() || defaultTemplate })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'HTML 내보내기 실패')
      }

      const data = await res.json()
      const blob = new Blob([data.html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = data.fileName || `${project?.name || 'deck'}.html`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('내보내기 실패:', err)
      const message = err instanceof Error ? err.message : '내보내기 실패'
      window.alert(message)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-slate-400">프로젝트를 찾을 수 없습니다</p>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <SlideEditor
        projectId={project.id}
        projectName={project.name}
        slides={slides}
        onSlideUpdate={updateSlide}
        onExport={exportProject}
        isExporting={isExporting}
      />
    </div>
  )
}

// 헤더
function Header({ onMenuToggle, isSidebarOpen }: { onMenuToggle?: () => void; isSidebarOpen?: boolean }) {
  const location = useLocation()
  const { user, logout } = React.useContext(AuthContext)

  const navItems = [
    { name: '대시보드', href: '/', icon: LayoutDashboard },
    { name: '내 프로젝트', href: '/projects', icon: FolderOpen },
    { name: '템플릿', href: '/templates', icon: Palette },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 md:hidden"
          onClick={onMenuToggle}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <Link to="/" className="flex items-center gap-2 mr-6">
          <motion.div
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="12" y2="16" />
            </svg>
          </motion.div>
          <span className="hidden font-bold text-xl md:inline-block">SlideSaaS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link key={item.href} to={item.href}>
                <motion.div
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4 ml-auto">
          <span className="text-sm text-slate-600">{user?.name}</span>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}

// 보호된 라우트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = React.useContext(AuthContext)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// 메인 레이아웃
function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main>{children}</main>
    </div>
  )
}

// App
function App() {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null)

  useEffect(() => {
    // 저장된 토큰 확인
    const token = localStorage.getItem('token')
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) setUser(data.user)
        })
        .catch(() => localStorage.removeItem('token'))
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('token', data.token)
        setUser(data.user)
        return true
      }
      return false
    } catch {
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout><DashboardPage /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <MainLayout><DashboardPage /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/new" element={
              <ProtectedRoute>
                <MainLayout><div className="p-8"><DashboardPage /></div></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <MainLayout><ProjectPage /></MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/templates" element={
              <ProtectedRoute>
                <MainLayout><DashboardPage /></MainLayout>
              </ProtectedRoute>
            } />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}

export default App
