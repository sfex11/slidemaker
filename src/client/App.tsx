import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, FolderOpen, Palette, Menu, X, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SlideEditor } from '@/components/slide-editor'

// 인증 컨텍스트
const AuthContext = React.createContext<{
  user: { id: string; email: string; name: string } | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}>({ user: null, login: async () => false, logout: () => {} })

import React from 'react'

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

// 대시보드 페이지
function DashboardPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">대시보드</h2>
      <p className="text-muted-foreground mb-6">프로젝트를 선택하거나 새로 만드세요</p>

      <Link to="/projects/new">
        <Button size="lg" className="gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 프로젝트
        </Button>
      </Link>
    </div>
  )
}

// 프로젝트 편집 페이지
function ProjectPage() {
  return (
    <div className="h-[calc(100vh-64px)]">
      <SlideEditor />
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
