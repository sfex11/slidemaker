import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3001

// GLM-5 클라이언트 설정
const glmClient = new OpenAI({
  apiKey: process.env.ZAI_API_KEY || '',
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
})

// 현재 디렉토리 기준 경로 설정
const isProduction = process.env.NODE_ENV === 'production'
const clientPath = isProduction
  ? path.join(process.cwd(), 'dist/client')
  : path.join(__dirname, '../../dist/client')

// 미들웨어
app.use(cors())
app.use(express.json({ limit: '10mb' }))

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
    include: { slides: { orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' }
  })
  // content 파싱
  const parsedProjects = projects.map(p => ({
    ...p,
    slides: p.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
  }))
  res.json({ projects: parsedProjects })
})

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: (req as any).userId },
    include: { slides: { orderBy: { order: 'asc' } } }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })
  // content 파싱
  const parsedProject = {
    ...project,
    slides: project.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
  }
  res.json({ project: parsedProject })
})

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, description, slides } = req.body
  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId: (req as any).userId,
      slides: slides ? {
        create: slides.map((s: any, i: number) => ({
          type: s.type,
          content: JSON.stringify(s.content),
          order: i
        }))
      } : undefined
    },
    include: { slides: true }
  })
  // content 파싱
  const parsedProject = {
    ...project,
    slides: project.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
  }
  res.json({ project: parsedProject })
})

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  const { name, description } = req.body
  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { name, description }
  })
  res.json({ project })
})

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  await prisma.project.delete({
    where: { id: req.params.id }
  })
  res.json({ ok: true })
})

// 슬라이드 API
app.post('/api/projects/:projectId/slides', authMiddleware, async (req, res) => {
  const { type, content } = req.body
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: (req as any).userId }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })

  const count = await prisma.slide.count({ where: { projectId: req.params.projectId } })
  const slide = await prisma.slide.create({
    data: { type, content: JSON.stringify(content), order: count, projectId: req.params.projectId }
  })
  res.json({ slide: { ...slide, content } })
})

app.put('/api/slides/:id', authMiddleware, async (req, res) => {
  const { type, content, order } = req.body
  const slide = await prisma.slide.update({
    where: { id: req.params.id },
    data: { type, content: JSON.stringify(content), order }
  })
  res.json({ slide: { ...slide, content } })
})

app.delete('/api/slides/:id', authMiddleware, async (req, res) => {
  await prisma.slide.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ==========================================
// AI 슬라이드 생성 API
// ==========================================

// URL에서 콘텐츠 추출
async function fetchUrlContent(url: string): Promise<string> {
  const response = await fetch(url)
  const html = await response.text()
  const $ = cheerio.load(html)

  // 불필요한 요소 제거
  $('script, style, nav, header, footer, aside, .ads, .comments').remove()

  // 메인 콘텐츠 추출
  let content = ''
  const selectors = ['article', 'main', '.content', '.post', '.article', '#content']
  for (const sel of selectors) {
    const el = $(sel).first()
    if (el.length && el.text().length > 200) {
      content = el.text()
      break
    }
  }
  if (!content) {
    content = $('body').text()
  }

  // 텍스트 정리
  return content
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .substring(0, 15000) // 토큰 제한
}

// GLM-5로 슬라이드 생성
async function generateSlidesWithAI(source: string, sourceType: 'url' | 'markdown' | 'text'): Promise<any[]> {
  if (!process.env.ZAI_API_KEY) {
    // API 키가 없으면 기본 슬라이드 반환
    return [
      { type: 'title', content: { title: '새 프레젠테이션', subtitle: 'API 키를 설정하세요' } },
      { type: 'card-grid', content: { title: '주요 내용', items: ['항목 1', '항목 2', '항목 3'] } }
    ]
  }

  const systemPrompt = `당신은 프레젠테이션 슬라이드를 만드는 전문가입니다.
주어진 ${sourceType === 'url' ? '웹페이지' : sourceType === 'markdown' ? '마크다운' : '텍스트'} 내용을 분석하여 프레젠테이션 슬라이드로 변환하세요.

## 슬라이드 타입
1. title: 타이틀 슬라이드 (title, subtitle, author)
2. card-grid: 카드 그리드 (title, items: string[], columns: 2|3|4)
3. comparison: 비교 슬라이드 (title, leftTitle, leftItems: string[], rightTitle, rightItems: string[])
4. timeline: 타임라인 (title, items: [{title, description}])
5. quote: 인용문 (quote, author, authorTitle)
6. table: 표 (title, headers: string[], rows: string[][])

## 규칙
- 한국어로 작성
- 각 슬라이드는 한 가지 핵심 개념만 전달 (1슬라이드 = 1개념)
- 첫 번째는 반드시 title 타입
- 총 5-10개 슬라이드 생성
- JSON 배열 형식으로만 응답`

  const userPrompt = `다음 ${sourceType === 'url' ? '웹페이지' : sourceType === 'markdown' ? '마크다운' : '텍스트'}를 슬라이드로 변환하세요:

\`\`\`
${source}
\`\`\`

JSON 배열로만 응답하세요.`

  try {
    const completion = await glmClient.chat.completions.create({
      model: 'glm-5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 4096,
      temperature: 0.7,
    })

    const aiContent = completion.choices[0]?.message?.content || ''

    // JSON 추출
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const slides = JSON.parse(jsonMatch[0])
      // content가 undefined인 경우 기본값 설정
      return slides.map((s: any) => ({
        type: s.type || 'title',
        content: s.content || {}
      }))
    }

    throw new Error('JSON 파싱 실패')
  } catch (error) {
    console.error('AI 생성 오류:', error)
    // 폴백: 기본 슬라이드
    return [
      { type: 'title', content: { title: '프레젠테이션', subtitle: '자동 생성됨' } },
      { type: 'card-grid', content: { title: '주요 내용', items: ['첫 번째 항목', '두 번째 항목', '세 번째 항목'] } }
    ]
  }
}

// URL에서 슬라이드 생성
app.post('/api/generate/from-url', authMiddleware, async (req, res) => {
  try {
    const { url, name } = req.body

    if (!url) {
      return res.status(400).json({ error: 'URL을 입력하세요' })
    }

    console.log('URL에서 슬라이드 생성:', url)

    // URL 콘텐츠 추출
    const content = await fetchUrlContent(url)

    // AI로 슬라이드 생성
    const slides = await generateSlidesWithAI(content, 'url')

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: name || new URL(url).hostname,
        description: `출처: ${url}`,
        userId: (req as any).userId,
        slides: {
          create: slides.map((s: any, i: number) => ({
            type: s.type,
            content: JSON.stringify(s.content),
            order: i
          }))
        }
      },
      include: { slides: { orderBy: { order: 'asc' } } }
    })

    // content 파싱 후 반환
    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
    }
    res.json({ project: parsedProject })
  } catch (error) {
    console.error('URL 슬라이드 생성 오류:', error)
    res.status(500).json({ error: '슬라이드 생성 실패' })
  }
})

// 마크다운에서 슬라이드 생성
app.post('/api/generate/from-markdown', authMiddleware, async (req, res) => {
  try {
    const { markdown, name } = req.body

    if (!markdown) {
      return res.status(400).json({ error: '마크다운을 입력하세요' })
    }

    console.log('마크다운에서 슬라이드 생성')

    // AI로 슬라이드 생성
    const slides = await generateSlidesWithAI(markdown, 'markdown')

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: name || '새 프레젠테이션',
        description: '마크다운에서 생성',
        userId: (req as any).userId,
        slides: {
          create: slides.map((s: any, i: number) => ({
            type: s.type,
            content: JSON.stringify(s.content),
            order: i
          }))
        }
      },
      include: { slides: { orderBy: { order: 'asc' } } }
    })

    // content 파싱 후 반환
    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
    }
    res.json({ project: parsedProject })
  } catch (error) {
    console.error('마크다운 슬라이드 생성 오류:', error)
    res.status(500).json({ error: '슬라이드 생성 실패' })
  }
})

// 텍스트에서 슬라이드 생성
app.post('/api/generate/from-text', authMiddleware, async (req, res) => {
  try {
    const { text, name } = req.body

    if (!text) {
      return res.status(400).json({ error: '텍스트를 입력하세요' })
    }

    console.log('텍스트에서 슬라이드 생성')

    // AI로 슬라이드 생성
    const slides = await generateSlidesWithAI(text, 'text')

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: name || '새 프레젠테이션',
        description: '텍스트에서 생성',
        userId: (req as any).userId,
        slides: {
          create: slides.map((s: any, i: number) => ({
            type: s.type,
            content: JSON.stringify(s.content),
            order: i
          }))
        }
      },
      include: { slides: { orderBy: { order: 'asc' } } }
    })

    // content 파싱 후 반환
    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: JSON.parse(s.content) }))
    }
    res.json({ project: parsedProject })
  } catch (error) {
    console.error('텍스트 슬라이드 생성 오류:', error)
    res.status(500).json({ error: '슬라이드 생성 실패' })
  }
})

// SPA 라우팅 (모든 경로를 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버 실행 중: http://0.0.0.0:${PORT}`)
})
