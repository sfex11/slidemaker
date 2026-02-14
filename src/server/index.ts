import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import path from 'path'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// 현재 디렉토리 기준 경로 설정
const isProduction = process.env.NODE_ENV === 'production'
const clientPath = isProduction
  ? path.join(process.cwd(), 'dist/client')
  : path.join(__dirname, '../../dist/client')

// 미들웨어
app.use(cors())
app.use(express.json())

// 정적 파일 서빙 (프로덕션)
console.log('Client path:', clientPath)
app.use(express.static(clientPath))

// 간단한 세션 (메모리 기반)
const sessions = new Map<string, { userId: string; expires: number }>()

// 인증 미들웨어
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: '인증 필요' })
  }

  const session = sessions.get(token)!
  if (Date.now() > session.expires) {
    sessions.delete(token)
    return res.status(401).json({ error: '세션 만료' })
  }

  ;(req as any).userId = session.userId
  next()
}

// 로그인 API
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요' })
    }

    // 사용자 찾기 또는 생성 (최초 접속 시 자동 생성)
    let user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      // 최초 접속: 새 계정 생성
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: { email, password: hashedPassword, name: email.split('@')[0] }
      })
      console.log('새 사용자 생성:', email)
    } else {
      // 기존 사용자: 비밀번호 확인
      const valid = await bcrypt.compare(password, user.password || '')
      if (!valid) {
        return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' })
      }
    }

    // 세션 토큰 생성
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
    sessions.set(token, { userId: user.id, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }) // 7일

    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    console.error('로그인 오류:', error)
    res.status(500).json({ error: '서버 오류' })
  }
})

// 로그아웃 API
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) sessions.delete(token)
  res.json({ ok: true })
})

// 내 정보 API
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: (req as any).userId }
  })
  res.json({ user: { id: user?.id, email: user?.email, name: user?.name } })
})

// 프로젝트 API
app.get('/api/projects', authMiddleware, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: (req as any).userId },
    orderBy: { updatedAt: 'desc' }
  })
  res.json({ projects })
})

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, description } = req.body
  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId: (req as any).userId
    }
  })
  res.json({ project })
})

// SPA 라우팅 (모든 경로를 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버 실행 중: http://0.0.0.0:${PORT}`)
})
