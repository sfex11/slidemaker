import { useState } from 'react'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        setIsLoggedIn(true)
      } else {
        const data = await res.json()
        setError(data.error || '로그인 실패')
      }
    } catch {
      setError('서버 오류')
    }
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Slide Maker</h1>
          <p style={styles.subtitle}>AI 기반 슬라이드 생성 플랫폼</p>

          <form onSubmit={handleLogin} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}

            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />

            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button}>
              로그인
            </button>
          </form>

          <p style={styles.hint}>최초 접속 시 자동으로 계정이 생성됩니다</p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.dashboard}>
      <header style={styles.header}>
        <h1>Slide Maker</h1>
        <button onClick={() => setIsLoggedIn(false)} style={styles.logoutBtn}>
          로그아웃
        </button>
      </header>

      <main style={styles.main}>
        <h2>대시보드</h2>
        <p>프로젝트를 선택하거나 새로 만드세요</p>

        <button style={styles.newProjectBtn}>
          + 새 프로젝트
        </button>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '16px',
  },
  button: {
    padding: '14px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    background: '#fef2f2',
    padding: '12px',
    borderRadius: '8px',
    textAlign: 'center',
  },
  hint: {
    color: '#999',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '16px',
  },
  dashboard: {
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  header: {
    background: '#fff',
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  logoutBtn: {
    padding: '8px 16px',
    background: '#f5f5f5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  main: {
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  newProjectBtn: {
    padding: '16px 32px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
  },
}

export default App
