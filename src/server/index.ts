import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'node:fs/promises'
import crypto from 'crypto'
import dns from 'dns/promises'
import net from 'net'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import { Buffer } from 'node:buffer'
import { listSvgTemplates, renderProjectDeckHtml } from './svg-deck'

type SourceType = 'url' | 'markdown' | 'pdf'

interface DeckSlide {
  type: string
  content: Record<string, unknown>
}

type AuthenticatedRequest = express.Request & { userId: string }

class RequestValidationError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'BAD_REQUEST', status = 400) {
    super(message)
    this.name = 'RequestValidationError'
    this.code = code
    this.status = status
  }
}

const app = express()
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT || 3001)
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const GENERATION_TIMEOUT_MS = 45_000
const MAX_SOURCE_CHARS = 40_000
const MAX_PDF_BYTES = 8 * 1024 * 1024
const MAX_TEXT_SOURCE_BYTES = 2 * 1024 * 1024
const URL_FETCH_TIMEOUT_MS = 12_000
const MAX_URL_FETCH_RETRIES = 2
const allowedFileRoots = (process.env.ALLOWED_FILE_ROOTS || `${process.cwd()},/tmp`)
  .split(',')
  .map((root) => root.trim())
  .filter(Boolean)
  .map((root) => path.resolve(root))

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const glmClient = new OpenAI({
  apiKey: process.env.ZAI_API_KEY || '',
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
})

const isProduction = process.env.NODE_ENV === 'production'
const clientPath = isProduction
  ? path.join(process.cwd(), 'dist/client')
  : path.join(__dirname, '../../dist/client')

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
app.use(express.json({ limit: '20mb' }))
app.use(express.static(clientPath))

const sessions = new Map<string, { userId: string; expires: number }>()
const generationLocks = new Map<string, number>()

const pruneExpiredSessions = () => {
  const now = Date.now()
  for (const [token, session] of sessions.entries()) {
    if (session.expires <= now) sessions.delete(token)
  }
}

setInterval(pruneExpiredSessions, 60 * 60 * 1000).unref()

const getUserId = (req: express.Request) => (req as AuthenticatedRequest).userId

const parseSlideContent = (rawContent: string) => {
  try {
    const parsed = JSON.parse(rawContent)
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

const sanitizeText = (value: string, maxLength = MAX_SOURCE_CHARS) => (
  value
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
)

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const parseRetryAfterMs = (headerValue: string | null) => {
  if (!headerValue) return 0
  const seconds = Number(headerValue)
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, 12_000)
  }

  const dateMs = Date.parse(headerValue)
  if (Number.isNaN(dateMs)) return 0
  const diff = dateMs - Date.now()
  return diff > 0 ? Math.min(diff, 12_000) : 0
}

const extractTextFromHtml = (html: string) => {
  const $ = cheerio.load(html)
  const title = $('title').first().text()
  const metaDescription =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content') ||
    ''

  $('script, style, nav, header, footer, aside, noscript, iframe, svg').remove()

  const selectors = ['article', 'main', '.content', '.post', '.article', '#content']
  let bodyText = ''
  for (const selector of selectors) {
    const el = $(selector).first()
    if (el.length && el.text().length > 200) {
      bodyText = el.text()
      break
    }
  }
  if (!bodyText) bodyText = $('body').text()

  return sanitizeText([title, metaDescription, bodyText].filter(Boolean).join('\n'))
}

const looksLikeBlockedHtml = (html: string) => {
  const snippet = html.slice(0, 12_000)
  const blockedPatterns = [
    /captcha/i,
    /cloudflare/i,
    /bot verification/i,
    /access denied/i,
    /cf-chl/i,
    /are you human/i,
  ]
  return blockedPatterns.some((pattern) => pattern.test(snippet))
}

const isLikelyFilePath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('file://')) return true
  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../') || trimmed.startsWith('~')) return true
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) return true
  if (/^[^/\s]+\.[^/\s]+(\/.*)?$/.test(trimmed)) return false
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed) && /[\\/]/.test(trimmed)) return true
  return false
}

const normalizeInputPath = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (trimmed.startsWith('file://')) {
    try {
      const parsed = new URL(trimmed)
      const decoded = decodeURIComponent(parsed.pathname)
      if (/^\/[A-Za-z]:/.test(decoded)) return decoded.slice(1)
      return decoded
    } catch {
      throw new RequestValidationError('유효한 file:// 경로를 입력하세요', 'INVALID_FILE_URL')
    }
  }

  if (trimmed === '~') return process.env.HOME || trimmed
  if (trimmed.startsWith('~/')) return path.join(process.env.HOME || '', trimmed.slice(2))
  return trimmed
}

const isPathInside = (candidate: string, root: string) => {
  const relative = path.relative(root, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

const resolveSafeFilePath = async (rawInputPath: string) => {
  const normalizedInput = normalizeInputPath(rawInputPath)
  const absolutePath = path.resolve(normalizedInput)

  const allowedByConfiguredRoots = allowedFileRoots.some((root) => isPathInside(absolutePath, root))
  if (!allowedByConfiguredRoots) {
    throw new RequestValidationError(
      `허용된 파일 경로에서만 읽을 수 있습니다. (${allowedFileRoots.join(', ')})`,
      'FILE_PATH_NOT_ALLOWED',
      403
    )
  }

  let realPath: string
  try {
    realPath = await fs.realpath(absolutePath)
  } catch {
    throw new RequestValidationError('파일 경로를 찾을 수 없습니다', 'FILE_NOT_FOUND')
  }

  const allowedByRealPath = allowedFileRoots.some((root) => isPathInside(realPath, root))
  if (!allowedByRealPath) {
    throw new RequestValidationError(
      `허용된 파일 경로에서만 읽을 수 있습니다. (${allowedFileRoots.join(', ')})`,
      'FILE_PATH_NOT_ALLOWED',
      403
    )
  }

  let stats: Awaited<ReturnType<typeof fs.stat>>
  try {
    stats = await fs.stat(realPath)
  } catch {
    throw new RequestValidationError('파일 정보를 읽을 수 없습니다', 'FILE_STAT_FAILED')
  }

  if (!stats.isFile()) {
    throw new RequestValidationError('파일 경로를 입력하세요', 'NOT_A_FILE')
  }

  return { realPath, size: stats.size }
}

const detectSourceTypeByFilePath = (filePath: string): SourceType => {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.pdf') return 'pdf'
  if (ext === '.md' || ext === '.markdown') return 'markdown'
  return 'url'
}

const normalizeInputUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) return trimmed
  const hasExplicitPort = /:[0-9]+(?:\/|$)/.test(trimmed)
  const isIpv4Like = /^\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?(?:\/|$)/.test(trimmed)
  if (hasExplicitPort || isIpv4Like) return `http://${trimmed}`
  return `https://${trimmed}`
}

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: '인증 필요', code: 'AUTH_REQUIRED' })

  const session = sessions.get(token)
  if (!session) return res.status(401).json({ error: '인증 필요', code: 'AUTH_REQUIRED' })

  if (Date.now() > session.expires) {
    sessions.delete(token)
    return res.status(401).json({ error: '세션 만료', code: 'SESSION_EXPIRED' })
  }

  ;(req as AuthenticatedRequest).userId = session.userId
  next()
}

const isPrivateIPv4 = (ip: string) => {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false
  const [a, b] = parts
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  return false
}

const isPrivateIPv6 = (ip: string) => {
  const normalized = ip.toLowerCase()
  if (normalized === '::1' || normalized === '::') return true
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '')
    if (net.isIP(mapped) === 4) return isPrivateIPv4(mapped)
  }
  return false
}

const isPrivateIp = (ip: string) => {
  const version = net.isIP(ip)
  if (version === 4) return isPrivateIPv4(ip)
  if (version === 6) return isPrivateIPv6(ip)
  return true
}

const assertSafePublicUrl = async (rawUrl: string) => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new RequestValidationError('유효한 URL을 입력하세요')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new RequestValidationError('http/https URL만 허용됩니다')
  }

  const hostname = parsed.hostname.toLowerCase()
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new RequestValidationError('내부 네트워크 주소는 허용되지 않습니다')
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new RequestValidationError('사설/루프백 IP는 허용되지 않습니다')
  }

  let resolved: Array<{ address: string }>
  try {
    resolved = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw new RequestValidationError('URL 호스트를 확인할 수 없습니다')
  }

  if (resolved.length === 0 || resolved.some(record => isPrivateIp(record.address))) {
    throw new RequestValidationError('내부 네트워크 주소는 허용되지 않습니다')
  }

  return parsed
}

const fetchWithRetry = async (url: string) => {
  let lastNetworkError: Error | null = null

  for (let attempt = 0; attempt <= MAX_URL_FETCH_RETRIES; attempt += 1) {
    let response: Response
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
        redirect: 'follow',
        headers: {
          'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml,text/plain,application/pdf',
          'accept-language': 'ko,en-US;q=0.9,en;q=0.8'
        }
      })
    } catch (error) {
      lastNetworkError = error instanceof Error ? error : new Error('request failed')
      if (attempt < MAX_URL_FETCH_RETRIES) {
        await sleep(350 * (attempt + 1))
        continue
      }
      break
    }

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_URL_FETCH_RETRIES) {
      const retryAfter = parseRetryAfterMs(response.headers.get('retry-after'))
      await sleep(Math.max(retryAfter, 400 * (attempt + 1)))
      continue
    }

    return response
  }

  if (lastNetworkError?.name === 'TimeoutError') {
    throw new RequestValidationError('웹페이지 요청 시간이 초과되었습니다', 'URL_TIMEOUT')
  }
  throw new RequestValidationError('웹페이지 연결에 실패했습니다', 'URL_CONNECTION_FAILED')
}

const extractPdfTextFromBuffer = async (buffer: Buffer) => {
  if (buffer.byteLength === 0) {
    throw new RequestValidationError('PDF 데이터가 비어 있습니다', 'PDF_EMPTY')
  }
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new RequestValidationError('PDF 크기는 8MB 이하만 지원합니다', 'PDF_TOO_LARGE')
  }

  let PDFParseCtor: new (params: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> }
  try {
    const pdfModule = await import('pdf-parse')
    PDFParseCtor = pdfModule.PDFParse as new (params: { data: Buffer }) => { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> }
  } catch {
    throw new Error('PDF 파서 로드 실패')
  }

  let parsed: { text: string }
  let parser: { getText: () => Promise<{ text: string }>; destroy: () => Promise<void> } | null = null
  try {
    parser = new PDFParseCtor({ data: buffer })
    parsed = await parser.getText()
  } catch {
    throw new RequestValidationError('PDF 텍스트 추출에 실패했습니다', 'PDF_PARSE_FAILED')
  } finally {
    if (parser) {
      await parser.destroy().catch(() => undefined)
    }
  }

  const cleaned = sanitizeText(parsed.text)
  if (!cleaned) throw new RequestValidationError('PDF에서 텍스트를 찾지 못했습니다', 'PDF_TEXT_NOT_FOUND')
  return cleaned
}

const fetchUrlContent = async (rawUrl: string) => {
  const safeUrl = await assertSafePublicUrl(rawUrl)
  const response = await fetchWithRetry(safeUrl.toString())

  if (response.status === 403) {
    throw new RequestValidationError(
      '대상 웹페이지 접근이 차단되었습니다 (HTTP 403). PDF/마크다운 입력을 사용해보세요.',
      'URL_FORBIDDEN'
    )
  }
  if (!response.ok) {
    throw new RequestValidationError(`웹페이지를 가져오지 못했습니다 (HTTP ${response.status})`, 'URL_FETCH_FAILED')
  }

  await assertSafePublicUrl(response.url)

  const contentType = (response.headers.get('content-type') || '').toLowerCase()
  const responseSize = Number(response.headers.get('content-length') || 0)
  if (responseSize > MAX_TEXT_SOURCE_BYTES && !contentType.includes('application/pdf')) {
    throw new RequestValidationError('문서 크기가 너무 큽니다', 'SOURCE_TOO_LARGE')
  }

  if (contentType.includes('application/pdf')) {
    const pdfBuffer = Buffer.from(await response.arrayBuffer())
    return extractPdfTextFromBuffer(pdfBuffer)
  }

  if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
    const text = sanitizeText(await response.text())
    if (!text || text.length < 20) {
      throw new RequestValidationError('문서 본문이 너무 짧습니다', 'SOURCE_TEXT_TOO_SHORT')
    }
    return text
  }

  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new RequestValidationError(`지원하지 않는 콘텐츠 타입입니다: ${contentType || 'unknown'}`, 'UNSUPPORTED_CONTENT_TYPE')
  }

  const html = await response.text()
  if (looksLikeBlockedHtml(html)) {
    throw new RequestValidationError('봇 차단/인증 페이지가 감지되었습니다. PDF/마크다운 입력을 사용해보세요.', 'ANTI_BOT_DETECTED')
  }

  const text = extractTextFromHtml(html)
  if (!text || text.length < 20) {
    throw new RequestValidationError('웹페이지 본문을 추출하지 못했습니다', 'SOURCE_TEXT_TOO_SHORT')
  }
  return text
}

const extractPdfContent = async (base64: string) => {
  if (!base64) {
    throw new RequestValidationError('PDF 파일이 비어 있습니다', 'PDF_EMPTY')
  }

  const buffer = Buffer.from(base64, 'base64')
  if (buffer.byteLength === 0) {
    throw new RequestValidationError('PDF 데이터가 올바르지 않습니다', 'PDF_INVALID_BASE64')
  }

  return extractPdfTextFromBuffer(buffer)
}

interface ResolvedInputSource {
  sourceText: string
  sourceLabel: string
  projectNameHint: string
  sourceType: SourceType
}

const readSourceFromFilePath = async (inputPath: string): Promise<ResolvedInputSource> => {
  const { realPath, size } = await resolveSafeFilePath(inputPath)
  const ext = path.extname(realPath).toLowerCase()
  const baseName = path.basename(realPath)
  const projectNameHint = path.basename(realPath, ext) || 'Local File Deck'
  const sourceType = detectSourceTypeByFilePath(realPath)

  if (size <= 0) {
    throw new RequestValidationError('파일이 비어 있습니다', 'FILE_EMPTY')
  }

  if (ext === '.pdf') {
    const buffer = Buffer.from(await fs.readFile(realPath))
    const sourceText = await extractPdfTextFromBuffer(buffer)
    return { sourceText, sourceLabel: baseName, projectNameHint, sourceType }
  }

  if (size > MAX_TEXT_SOURCE_BYTES) {
    throw new RequestValidationError('텍스트 파일 크기가 너무 큽니다', 'FILE_TOO_LARGE')
  }

  let fileText: string
  try {
    fileText = await fs.readFile(realPath, 'utf-8')
  } catch {
    throw new RequestValidationError('텍스트 파일을 읽지 못했습니다', 'FILE_READ_FAILED')
  }

  const sourceText = (ext === '.html' || ext === '.htm')
    ? extractTextFromHtml(fileText)
    : sanitizeText(fileText)

  if (!sourceText || sourceText.length < 20) {
    throw new RequestValidationError('파일 본문이 너무 짧습니다', 'SOURCE_TEXT_TOO_SHORT')
  }

  return { sourceText, sourceLabel: baseName, projectNameHint, sourceType }
}

const resolveInputSource = async (input: string): Promise<ResolvedInputSource> => {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new RequestValidationError('URL 또는 파일 경로를 입력하세요', 'INPUT_REQUIRED')
  }

  if (isLikelyFilePath(trimmed)) {
    return readSourceFromFilePath(trimmed)
  }

  const normalizedUrl = normalizeInputUrl(trimmed)
  const sourceText = await fetchUrlContent(normalizedUrl)
  return {
    sourceText,
    sourceLabel: normalizedUrl,
    projectNameHint: normalizedUrl,
    sourceType: 'url',
  }
}

const withGenerationLock = async <T>(userId: string, task: () => Promise<T>) => {
  if (generationLocks.has(userId)) {
    throw new RequestValidationError('다른 생성 작업이 진행 중입니다. 잠시 후 다시 시도하세요.')
  }

  generationLocks.set(userId, Date.now())
  try {
    const result = await Promise.race([
      task(),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new RequestValidationError('생성 시간이 초과되었습니다')), GENERATION_TIMEOUT_MS)
      })
    ])
    return result
  } finally {
    generationLocks.delete(userId)
  }
}

const normalizeSlides = (rawSlides: DeckSlide[], projectName: string) => {
  const safeSlides = rawSlides
    .filter(slide => slide && typeof slide === 'object')
    .map((slide) => ({
      type: typeof slide.type === 'string' ? slide.type : 'card-grid',
      content: slide.content && typeof slide.content === 'object' ? slide.content : {},
    }))
    .slice(0, 12)

  if (safeSlides.length === 0) {
    return [
      { type: 'title', content: { title: projectName, subtitle: '자동 생성 결과가 비어 있어 기본 슬라이드를 표시합니다.' } },
      { type: 'card-grid', content: { title: '핵심 포인트', items: ['입력 품질 확인', '텍스트 길이 점검', '다시 생성 시도'] } },
    ]
  }

  if (safeSlides[0].type !== 'title') {
    safeSlides.unshift({
      type: 'title',
      content: {
        title: projectName,
        subtitle: '입력 문서를 기반으로 자동 생성된 슬라이드',
      }
    })
  }

  return safeSlides
}

const buildFallbackSlidesFromSource = (source: string, sourceType: SourceType, projectName: string): DeckSlide[] => {
  const normalized = source.replace(/\s+/g, ' ').trim()
  const parts = normalized
    .split(/[\n\r]+|(?<=[.!?。！？])\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 12)

  const points = (parts.length > 0 ? parts : [normalized])
    .slice(0, 6)
    .map((part) => part.length > 120 ? `${part.slice(0, 117)}...` : part)

  const quoteText = points[0] || normalized.slice(0, 140) || '입력 문서를 기반으로 핵심 내용을 추출했습니다.'

  return normalizeSlides([
    {
      type: 'title',
      content: {
        title: projectName,
        subtitle: `${sourceType.toUpperCase()} 입력 자동 생성 (안전 모드)`,
      }
    },
    {
      type: 'card-grid',
      content: {
        title: '핵심 요약',
        items: points.length > 0 ? points : ['입력 문서를 분석해 요약을 생성했습니다.'],
      }
    },
    {
      type: 'quote',
      content: {
        quote: quoteText,
        author: 'Auto Slide Foundry',
      }
    }
  ], projectName)
}

const generateSlidesWithAI = async (source: string, sourceType: SourceType, projectName: string): Promise<DeckSlide[]> => {
  if (!process.env.ZAI_API_KEY) {
    return normalizeSlides([
      {
        type: 'title',
        content: {
          title: projectName,
          subtitle: 'API 키 미설정으로 기본 자동 생성 결과를 표시합니다.',
        }
      },
      {
        type: 'card-grid',
        content: {
          title: '자동 생성 요약',
          items: [
            `${sourceType.toUpperCase()} 입력이 수신되었습니다`,
            '실제 AI 생성은 ZAI_API_KEY 설정 후 활성화됩니다',
            '템플릿 적용 및 HTML 내보내기는 정상 동작합니다',
          ]
        }
      }
    ], projectName)
  }

  const systemPrompt = `너는 발표 슬라이드를 자동 생성하는 엔진이다.
입력 텍스트를 분석해서 5~9장의 슬라이드를 JSON 배열로만 반환하라.

슬라이드 타입은 아래만 사용한다:
- title
- card-grid
- comparison
- timeline
- quote
- table

규칙:
1) 첫 슬라이드는 반드시 title
2) 각 슬라이드는 핵심 하나만 전달
3) 한국어로 작성
4) type 외 필드는 content로 들어갈 데이터만 포함
5) 절대 코드블록 마크다운을 사용하지 말고 JSON 배열만 출력`

  const userPrompt = `입력 타입: ${sourceType}
프로젝트명: ${projectName}
문서:
${source}`

  const completion = await glmClient.chat.completions.create({
    model: 'glm-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    max_completion_tokens: 4096,
    temperature: 0.35,
  })

  const content = completion.choices[0]?.message?.content || ''
  const jsonMatch = content.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON 배열을 찾지 못했습니다')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    throw new Error('AI 응답 JSON 파싱 실패')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('AI 응답 형식이 배열이 아닙니다')
  }

  const slides = parsed.map((item) => {
    if (!item || typeof item !== 'object') {
      return { type: 'card-grid', content: { title: '요약', items: [] } }
    }

    const typed = item as Record<string, unknown>
    const type = typeof typed.type === 'string' ? typed.type : 'card-grid'
    const directContent = typed.content
    if (directContent && typeof directContent === 'object' && !Array.isArray(directContent)) {
      return { type, content: directContent as Record<string, unknown> }
    }

    const { type: _discardType, ...rest } = typed
    return { type, content: rest as Record<string, unknown> }
  })

  return normalizeSlides(slides, projectName)
}

const deriveProjectName = (sourceType: SourceType, value: string, customName?: string) => {
  if (customName && customName.trim().length > 0) return customName.trim()
  if (sourceType === 'url') {
    try {
      return new URL(value).hostname
    } catch {
      return 'URL Deck'
    }
  }
  if (sourceType === 'pdf') return 'PDF Deck'
  return 'Markdown Deck'
}

const createProject = async (userId: string, name: string, sourceType: SourceType, sourceLabel: string, slides: DeckSlide[]) => {
  const created = await prisma.project.create({
    data: {
      name,
      description: `${sourceType.toUpperCase()} · ${sourceLabel}`,
      userId,
      slides: {
        create: slides.map((slide, index) => ({
          type: slide.type,
          content: JSON.stringify(slide.content),
          order: index,
        }))
      }
    },
    include: { slides: { orderBy: { order: 'asc' } } }
  })

  return {
    ...created,
    slides: created.slides.map((slide) => ({
      ...slide,
      content: parseSlideContent(slide.content),
    }))
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = typeof req.body?.password === 'string' ? req.body.password : ''

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력하세요' })
    }

    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: email.split('@')[0]
        }
      })
    } else {
      const valid = await bcrypt.compare(password, user.password || '')
      if (!valid) return res.status(401).json({ error: '비밀번호가 올바르지 않습니다' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    sessions.set(token, { userId: user.id, expires: Date.now() + SESSION_TTL_MS })
    res.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    console.error('로그인 오류:', error)
    res.status(500).json({ error: '로그인 처리 실패' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) sessions.delete(token)
  res.json({ ok: true })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: getUserId(req) } })
  if (!user) return res.status(404).json({ error: '사용자 없음' })
  res.json({ user: { id: user.id, email: user.email, name: user.name } })
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

app.get('/api/projects', authMiddleware, async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { userId: getUserId(req) },
    include: { slides: { orderBy: { order: 'asc' } } },
    orderBy: { updatedAt: 'desc' },
  })

  const mapped = projects.map((project) => ({
    ...project,
    slides: project.slides.map((slide) => ({
      ...slide,
      content: parseSlideContent(slide.content),
    }))
  }))

  res.json({ projects: mapped })
})

app.get('/api/projects/:id', authMiddleware, async (req, res) => {
  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId: getUserId(req) },
    include: { slides: { orderBy: { order: 'asc' } } }
  })
  if (!project) return res.status(404).json({ error: '프로젝트 없음' })

  res.json({
    project: {
      ...project,
      slides: project.slides.map((slide) => ({
        ...slide,
        content: parseSlideContent(slide.content),
      }))
    }
  })
})

app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
  const userId = getUserId(req)
  const exists = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    select: { id: true }
  })
  if (!exists) return res.status(404).json({ error: '프로젝트 없음' })

  await prisma.project.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

const handleGenerate = async (
  req: express.Request,
  res: express.Response,
  sourceType: SourceType,
  sourceBuilder: () => Promise<{ sourceText: string; sourceLabel: string; projectNameHint: string; sourceType?: SourceType }>
) => {
  const userId = getUserId(req)
  try {
    const {
      sourceText,
      sourceLabel,
      projectNameHint,
      sourceType: resolvedSourceType,
    } = await sourceBuilder()

    const effectiveSourceType = resolvedSourceType || sourceType

    if (!sourceText || sourceText.length < 20) {
      throw new RequestValidationError('입력 문서의 내용이 너무 짧습니다', 'SOURCE_TEXT_TOO_SHORT')
    }

    const customName = typeof req.body?.name === 'string' ? req.body.name : undefined
    const projectName = deriveProjectName(effectiveSourceType, projectNameHint, customName)

    const slides = await withGenerationLock(userId, async () => {
      try {
        return await generateSlidesWithAI(sourceText, effectiveSourceType, projectName)
      } catch (aiError) {
        console.error(`${effectiveSourceType} AI 생성 실패, 폴백으로 전환:`, aiError)
        return buildFallbackSlidesFromSource(sourceText, effectiveSourceType, projectName)
      }
    })

    const project = await createProject(userId, projectName, effectiveSourceType, sourceLabel, slides)
    res.json({ project })
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return res.status(error.status).json({ error: error.message, code: error.code })
    }
    console.error(`${sourceType} 생성 오류:`, error)
    res.status(500).json({ error: '자동 생성 실패', code: 'GENERATION_FAILED' })
  }
}

app.post('/api/generate/from-url', authMiddleware, async (req, res) => {
  await handleGenerate(req, res, 'url', async () => {
    const rawInput = typeof req.body?.url === 'string'
      ? req.body.url
      : (typeof req.body?.input === 'string' ? req.body.input : '')
    const resolved = await resolveInputSource(rawInput)
    return resolved
  })
})

app.post('/api/generate/from-markdown', authMiddleware, async (req, res) => {
  await handleGenerate(req, res, 'markdown', async () => {
    const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : ''
    if (!markdown.trim()) throw new RequestValidationError('마크다운을 입력하세요')
    return {
      sourceText: sanitizeText(markdown),
      sourceLabel: 'markdown',
      projectNameHint: 'Markdown Deck',
    }
  })
})

app.post('/api/generate/from-pdf', authMiddleware, async (req, res) => {
  await handleGenerate(req, res, 'pdf', async () => {
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : ''
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : 'document.pdf'
    const sourceText = await extractPdfContent(base64)
    return {
      sourceText,
      sourceLabel: fileName,
      projectNameHint: fileName.replace(/\.pdf$/i, ''),
    }
  })
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
      footerText: `${project.name} · Auto Deck · ${new Date().toISOString().slice(0, 10)}`
    })

    const safeName = project.name.replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '') || 'deck'
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

app.get('/api/projects/:id/html', authMiddleware, async (req, res) => {
  const userId = getUserId(req)
  const templateId = typeof req.query.templateId === 'string' ? req.query.templateId : undefined

  const project = await prisma.project.findFirst({
    where: { id: req.params.id, userId },
    include: { slides: { orderBy: { order: 'asc' } } }
  })
  if (!project) return res.status(404).send('프로젝트 없음')

  try {
    const rendered = renderProjectDeckHtml({
      projectName: project.name,
      slides: project.slides.map((slide) => ({
        type: slide.type,
        content: parseSlideContent(slide.content),
      })),
      templateId,
      footerText: `${project.name} · Auto Deck · ${new Date().toISOString().slice(0, 10)}`
    })

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(rendered.html)
  } catch (error) {
    console.error('HTML 조회 오류:', error)
    res.status(500).send('HTML 생성 실패')
  }
})

app.get('*', (_req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auto Deck server running: http://0.0.0.0:${PORT}`)
})
