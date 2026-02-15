import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import crypto from 'crypto'
import dns from 'dns/promises'
import net from 'net'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { listSvgTemplates, renderProjectDeckHtml } from './svg-deck'

const app = express()
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT || 3001)
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

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
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
      return
    }
    callback(null, false)
  },
  credentials: true,
}))
app.use(express.json({ limit: '10mb' }))

// 정적 파일 서빙 (프로덕션)
console.log('Client path:', clientPath)
app.use(express.static(clientPath))

// 간단한 세션 (메모리 기반)
const sessions = new Map<string, { userId: string; expires: number }>()
const pruneExpiredSessions = () => {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (session.expires <= now) sessions.delete(token)
  }
}
setInterval(pruneExpiredSessions, 60 * 60 * 1000).unref()

type AuthenticatedRequest = express.Request & { userId: string }

const getUserId = (req: express.Request) => (req as AuthenticatedRequest).userId

const parseSlideContent = (rawContent: string) => {
  try {
    return JSON.parse(rawContent)
  } catch {
    return {}
  }
}

class UrlValidationError extends Error {}

const isPrivateIPv4 = (ip: string) => {
  const octets = ip.split('.').map(Number)
  if (octets.length !== 4 || octets.some(Number.isNaN)) return false

  const [a, b] = octets
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

const isPrivateIPv6 = (ip: string) => {
  const normalized = ip.toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true
  }
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '')
    if (net.isIP(mapped) === 4) return isPrivateIPv4(mapped)
  }
  return false
}

const isPrivateIp = (ip: string) => {
  const ipVersion = net.isIP(ip)
  if (ipVersion === 4) return isPrivateIPv4(ip)
  if (ipVersion === 6) return isPrivateIPv6(ip)
  return true
}

const assertSafePublicUrl = async (rawUrl: string) => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new UrlValidationError('유효한 URL을 입력하세요')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new UrlValidationError('http/https URL만 허용됩니다')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new UrlValidationError('내부 네트워크 주소는 허용되지 않습니다')
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new UrlValidationError('사설/루프백 IP는 허용되지 않습니다')
  }

  let resolved: Array<{ address: string; family: number }>
  try {
    resolved = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new UrlValidationError('URL 호스트를 확인할 수 없습니다')
  }

  if (resolved.length === 0 || resolved.some(record => isPrivateIp(record.address))) {
    throw new UrlValidationError('내부 네트워크 주소는 허용되지 않습니다')
  }

  return parsed
}

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

  ;(req as AuthenticatedRequest).userId = session.userId
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
    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_TTL_MS })

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
    where: { id: getUserId(req) }
  })
  res.json({ user: { id: user?.id, email: user?.email, name: user?.name } })
})

app.get('/api/svg/templates', authMiddleware, (_req, res) => {
  try {
    const templates = listSvgTemplates().map((template) => ({
      id: template.id,
      fileName: template.fileName,
      name: template.name,
      description: template.description,
      author: template.author,
    }))
    res.json({ templates })
  } catch (error) {
    console.error('템플릿 목록 조회 오류:', error)
    res.status(500).json({ error: '템플릿 목록 조회 실패' })
  }
})

// 프로젝트 API
app.get('/api/projects', authMiddleware, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: getUserId(req) },
    include: { slides: { orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' }
  })
  const parsedProjects = projects.map(p => ({
    ...p,
    slides: p.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
  }))
  res.json({ projects: parsedProjects })
})

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: getUserId(req) },
    include: { slides: { orderBy: { order: 'asc' } } }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })
  const parsedProject = {
    ...project,
    slides: project.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
  }
  res.json({ project: parsedProject })
})

app.post('/api/projects', authMiddleware, async (req, res) => {
  const { name, description, slides } = req.body
  const project = await prisma.project.create({
    data: {
      name,
      description,
      userId: getUserId(req),
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
  const parsedProject = {
    ...project,
    slides: project.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
  }
  res.json({ project: parsedProject })
})

app.put('/api/projects/:id', authMiddleware, async (req, res) => {
  const userId = getUserId(req)
  const { name, description } = req.body

  const existingProject = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true }
  })
  if (!existingProject) return res.status(404).json({ error: '프로젝트 없음' })

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { name, description }
  })
  res.json({ project })
})

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  const userId = getUserId(req)

  const existingProject = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true }
  })
  if (!existingProject) return res.status(404).json({ error: '프로젝트 없음' })

  await prisma.project.delete({
    where: { id: req.params.id }
  })
  res.json({ ok: true })
})

app.post('/api/projects/:id/export/html', authMiddleware, async (req, res) => {
  const userId = getUserId(req)
  const templateId = typeof req.body?.templateId === 'string' ? req.body.templateId : undefined

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    include: { slides: { orderBy: { order: 'asc' } } }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })

  try {
    const rendered = renderProjectDeckHtml({
      projectName: project.name,
      slides: project.slides.map((slide) => ({
        type: slide.type,
        content: parseSlideContent(slide.content),
      })),
      templateId,
      footerText: `${project.name} · Slide Maker · ${new Date().toISOString().slice(0, 10)}`,
    })

    const safeName = project.name
      .replace(/[^\w\-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'deck'

    res.json({
      fileName: `${safeName}.html`,
      template: rendered.template,
      html: rendered.html,
    })
  } catch (error) {
    console.error('HTML 내보내기 오류:', error)
    res.status(500).json({ error: 'HTML 내보내기 실패' })
  }
})

// 슬라이드 API
app.post('/api/projects/:projectId/slides', authMiddleware, async (req, res) => {
  const { type, content } = req.body
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, userId: getUserId(req) }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })

  const count = await prisma.slide.count({ where: { projectId: req.params.projectId } })
  const slide = await prisma.slide.create({
    data: { type, content: JSON.stringify(content), order: count, projectId: req.params.projectId }
  })
  res.json({ slide: { ...slide, content } })
})

app.put('/api/slides/:id', authMiddleware, async (req, res) => {
  const userId = getUserId(req)
  const { type, content, order } = req.body

  const existingSlide = await prisma.slide.findFirst({
    where: {
      id: req.params.id,
      project: { userId }
    },
    select: { id: true }
  })
  if (!existingSlide) return res.status(404).json({ error: '슬라이드 없음' })

  const updateData: { type?: string; content?: string; order?: number } = {}
  if (typeof type === 'string') updateData.type = type
  if (typeof content !== 'undefined') updateData.content = JSON.stringify(content)
  if (typeof order === 'number') updateData.order = order

  const slide = await prisma.slide.update({
    where: { id: req.params.id },
    data: updateData
  })
  res.json({ slide: { ...slide, content: typeof content !== 'undefined' ? content : parseSlideContent(slide.content) } })
})

app.delete('/api/slides/:id', authMiddleware, async (req, res) => {
  const userId = getUserId(req)

  const existingSlide = await prisma.slide.findFirst({
    where: {
      id: req.params.id,
      project: { userId }
    },
    select: { id: true }
  })
  if (!existingSlide) return res.status(404).json({ error: '슬라이드 없음' })

  await prisma.slide.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ==========================================
// AI 슬라이드 생성 API
// ==========================================

// URL에서 콘텐츠 추출
async function fetchUrlContent(url: URL): Promise<string> {
  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    redirect: 'follow'
  })
  if (!response.ok) {
    throw new UrlValidationError('웹페이지를 가져오지 못했습니다')
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > 2_000_000) {
    throw new UrlValidationError('웹페이지가 너무 큽니다')
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new UrlValidationError('HTML 페이지 URL만 허용됩니다')
  }

  await assertSafePublicUrl(response.url)
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
    console.log('AI 응답:', aiContent.substring(0, 500))

    // JSON 추출
    const jsonMatch = aiContent.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const rawSlides = JSON.parse(jsonMatch[0])
      // AI 응답을 content로 감싸서 변환
      return rawSlides.map((s: any) => {
        const { type, ...rest } = s
        return {
          type: type || 'title',
          content: rest // type을 제외한 모든 필드를 content로
        }
      })
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

    const safeUrl = await assertSafePublicUrl(url)
    console.log('URL에서 슬라이드 생성:', safeUrl.toString())

    // URL 콘텐츠 추출
    const content = await fetchUrlContent(safeUrl)

    // AI로 슬라이드 생성
    const slides = await generateSlidesWithAI(content, 'url')

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: name || safeUrl.hostname,
        description: `출처: ${safeUrl.toString()}`,
        userId: getUserId(req),
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

    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
    }
    res.json({ project: parsedProject })
  } catch (error) {
    console.error('URL 슬라이드 생성 오류:', error)
    if (error instanceof UrlValidationError) {
      return res.status(400).json({ error: error.message })
    }
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
        userId: getUserId(req),
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

    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
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
        userId: getUserId(req),
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

    const parsedProject = {
      ...project,
      slides: project.slides.map(s => ({ ...s, content: parseSlideContent(s.content) }))
    }
    res.json({ project: parsedProject })
  } catch (error) {
    console.error('텍스트 슬라이드 생성 오류:', error)
    res.status(500).json({ error: '슬라이드 생성 실패' })
  }
})

// SPA 라우팅 (모든 경로를 index.html로)
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 서버 실행 중: http://0.0.0.0:${PORT}`)
})
