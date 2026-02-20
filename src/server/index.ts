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

interface DeckQualityReport {
  structure: number
  readability: number
  diversity: number
  overall: number
  issues: string[]
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
const MAX_MARKDOWN_BYTES = 2 * 1024 * 1024
const MIN_SOURCE_TEXT_CHARS = 20
const MIN_TARGET_SLIDES = 5
const MAX_TARGET_SLIDES = 12
const QUALITY_FALLBACK_THRESHOLD = 60
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

const sanitizeMarkdownText = (value: string, maxLength = MAX_SOURCE_CHARS) => (
  value
    .replace(/\u0000/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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

const isMarkdownExtension = (filePath: string) => (
  ['.md', '.markdown', '.mdown', '.mkd', '.txt'].includes(path.extname(filePath).toLowerCase())
)

const isMarkdownContentType = (contentType: string) => (
  contentType.includes('text/markdown') ||
  contentType.includes('text/x-markdown') ||
  contentType.includes('application/markdown')
)

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
  let responsePath = safeUrl.pathname
  try {
    responsePath = new URL(response.url).pathname
  } catch {
    // keep fallback path
  }
  const markdownLike = isMarkdownContentType(contentType) || isMarkdownExtension(responsePath)
  const responseSize = Number(response.headers.get('content-length') || 0)
  if (responseSize > MAX_TEXT_SOURCE_BYTES && !contentType.includes('application/pdf')) {
    throw new RequestValidationError('문서 크기가 너무 큽니다', 'SOURCE_TOO_LARGE')
  }

  if (contentType.includes('application/pdf')) {
    const pdfBuffer = Buffer.from(await response.arrayBuffer())
    return extractPdfTextFromBuffer(pdfBuffer)
  }

  if (
    contentType.includes('text/plain') ||
    contentType.includes('text/markdown') ||
    contentType.includes('application/markdown') ||
    contentType.includes('text/x-markdown')
  ) {
    const rawText = await response.text()
    const text = markdownLike ? sanitizeMarkdownText(rawText) : sanitizeText(rawText)
    if (!text || text.length < MIN_SOURCE_TEXT_CHARS) {
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
  if (!text || text.length < MIN_SOURCE_TEXT_CHARS) {
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

const extractMarkdownContent = async (base64: string) => {
  if (!base64) {
    throw new RequestValidationError('마크다운 파일이 비어 있습니다', 'MARKDOWN_EMPTY')
  }

  const normalizedBase64 = base64
    .trim()
    .replace(/^data:[^;]+;base64,/i, '')
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  if (!normalizedBase64 || !/^[A-Za-z0-9+/=]+$/.test(normalizedBase64)) {
    throw new RequestValidationError('마크다운 데이터가 올바르지 않습니다', 'MARKDOWN_INVALID_BASE64')
  }

  const buffer = Buffer.from(normalizedBase64, 'base64')
  if (buffer.byteLength === 0) {
    throw new RequestValidationError('마크다운 데이터가 올바르지 않습니다', 'MARKDOWN_INVALID_BASE64')
  }
  if (buffer.byteLength > MAX_MARKDOWN_BYTES) {
    throw new RequestValidationError('마크다운 파일 크기는 2MB 이하만 지원합니다', 'MARKDOWN_TOO_LARGE')
  }

  const sourceText = sanitizeMarkdownText(buffer.toString('utf-8'))
  if (!sourceText || sourceText.length < MIN_SOURCE_TEXT_CHARS) {
    throw new RequestValidationError('마크다운 본문이 너무 짧습니다', 'SOURCE_TEXT_TOO_SHORT')
  }
  return sourceText
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
    : (isMarkdownExtension(realPath) ? sanitizeMarkdownText(fileText) : sanitizeText(fileText))

  if (!sourceText || sourceText.length < MIN_SOURCE_TEXT_CHARS) {
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

const trimEllipsis = (value: string, maxLength = 120) => (
  value.length > maxLength ? `${value.slice(0, Math.max(maxLength - 3, 1)).trim()}...` : value
)

const toTextValue = (value: unknown, fallback = '', maxLength = 180) => {
  if (typeof value !== 'string') return fallback
  const cleaned = sanitizeText(value, maxLength)
  return cleaned || fallback
}

const toStringList = (value: unknown, maxItems = 6, maxLength = 120): string[] => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (typeof item === 'string') return sanitizeText(item, maxLength)
      if (!item || typeof item !== 'object') return ''
      const typed = item as Record<string, unknown>
      if (typeof typed.title === 'string' && typeof typed.description === 'string') {
        return sanitizeText(`${typed.title}: ${typed.description}`, maxLength)
      }
      if (typeof typed.title === 'string') return sanitizeText(typed.title, maxLength)
      if (typeof typed.description === 'string') return sanitizeText(typed.description, maxLength)
      return ''
    })
    .filter(Boolean)
    .slice(0, maxItems)
}

const toTableRows = (value: unknown, maxRows = 6, maxCols = 6): string[][] => {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (!Array.isArray(row)) return []
      return row
        .slice(0, maxCols)
        .map((cell) => sanitizeText(String(cell ?? ''), 120))
    })
    .filter((row) => row.length > 0)
    .slice(0, maxRows)
}

const dedupeStrings = (values: string[], maxItems = 6) => {
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const value of values) {
    const cleaned = value.trim()
    if (!cleaned) continue
    const key = cleaned.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(cleaned)
    if (deduped.length >= maxItems) break
  }
  return deduped
}

const normalizeSlideType = (rawType: unknown): DeckSlide['type'] => {
  const normalized = typeof rawType === 'string'
    ? rawType.toLowerCase().trim().replace(/[\s_]+/g, '-')
    : ''

  if (['title', 'cover', 'intro', 'closing', 'end', 'ending'].includes(normalized)) return 'title'
  if (['card-grid', 'cards', 'card', 'grid', 'summary', 'bullets', 'list', 'content', 'section'].includes(normalized)) return 'card-grid'
  if (['comparison', 'compare', 'vs', 'pros-cons', 'proscons', 'two-column', 'two-columns'].includes(normalized)) return 'comparison'
  if (['timeline', 'roadmap', 'process', 'steps', 'step', 'flow'].includes(normalized)) return 'timeline'
  if (['quote', 'big-quote', 'citation', 'insight', 'pullquote'].includes(normalized)) return 'quote'
  if (['table', 'data', 'matrix'].includes(normalized)) return 'table'
  return 'card-grid'
}

const normalizeSlideContent = (type: DeckSlide['type'], rawContent: unknown, index: number, projectName: string) => {
  const content = rawContent && typeof rawContent === 'object' && !Array.isArray(rawContent)
    ? rawContent as Record<string, unknown>
    : {}

  switch (type) {
    case 'title': {
      const title = toTextValue(content.title, index === 0 ? projectName : '핵심 정리')
      const subtitle = toTextValue(content.subtitle, index === 0 ? '입력 문서를 기반으로 자동 생성된 슬라이드' : '발표 마무리')
      const author = toTextValue(content.author, 'Auto Slide Foundry')
      const dayLabel = toTextValue(content.dayLabel, index === 0 ? 'GENERATED DECK' : 'WRAP UP')
      return { title, subtitle, author, dayLabel }
    }
    case 'comparison': {
      let leftItems = toStringList(content.leftItems, 5)
      let rightItems = toStringList(content.rightItems, 5)
      const merged = toStringList(content.items, 8)
      if ((leftItems.length === 0 || rightItems.length === 0) && merged.length >= 2) {
        const splitPoint = Math.ceil(merged.length / 2)
        if (leftItems.length === 0) leftItems = merged.slice(0, splitPoint)
        if (rightItems.length === 0) rightItems = merged.slice(splitPoint)
      }
      return {
        title: toTextValue(content.title, '비교 분석'),
        leftTitle: toTextValue(content.leftTitle, '옵션 A'),
        rightTitle: toTextValue(content.rightTitle, '옵션 B'),
        leftItems: leftItems.length > 0 ? leftItems : ['핵심 포인트'],
        rightItems: rightItems.length > 0 ? rightItems : ['핵심 포인트'],
      }
    }
    case 'timeline': {
      const timelineItems = Array.isArray(content.items)
        ? content.items
          .slice(0, 6)
          .map((item, itemIndex) => {
            if (typeof item === 'string') {
              const text = sanitizeText(item, 120)
              if (!text) return null
              return { title: `단계 ${itemIndex + 1}`, description: text }
            }
            if (!item || typeof item !== 'object') return null
            const typed = item as Record<string, unknown>
            const title = toTextValue(typed.title, `단계 ${itemIndex + 1}`, 80)
            const description = toTextValue(typed.description, '', 140)
            return { title, description }
          })
          .filter((item): item is { title: string; description: string } => Boolean(item))
        : []

      if (timelineItems.length === 0) {
        const steps = toStringList(content.steps, 6)
        steps.forEach((step, stepIndex) => {
          timelineItems.push({
            title: `단계 ${stepIndex + 1}`,
            description: step,
          })
        })
      }

      return {
        title: toTextValue(content.title, '진행 단계'),
        items: timelineItems.length > 0 ? timelineItems : [{ title: '단계 1', description: '핵심 과정을 정리합니다.' }],
      }
    }
    case 'quote': {
      const quote = toTextValue(content.quote, toTextValue(content.text, '핵심 메시지를 요약했습니다.'), 220)
      return {
        quote,
        author: toTextValue(content.author, 'Auto Slide Foundry', 80),
      }
    }
    case 'table': {
      const headers = toStringList(content.headers, 6, 50)
      const fallbackHeaders = headers.length > 0 ? headers : toStringList(content.columns, 6, 50)
      let rows = toTableRows(content.rows, 6, Math.max(2, fallbackHeaders.length || 2))
      if (rows.length === 0) rows = toTableRows(content.data, 6, Math.max(2, fallbackHeaders.length || 2))
      const resolvedHeaders = fallbackHeaders.length > 0
        ? fallbackHeaders
        : (rows[0]?.map((_cell, cellIndex) => `항목 ${cellIndex + 1}`) || ['항목', '내용'])

      return {
        title: toTextValue(content.title, '데이터 요약'),
        headers: resolvedHeaders,
        rows: rows.length > 0 ? rows : [['요약', '데이터를 찾지 못했습니다']],
      }
    }
    case 'card-grid':
    default: {
      const items = dedupeStrings([
        ...toStringList(content.items, 6),
        ...toStringList(content.bullets, 6),
        ...toStringList(content.points, 6),
        ...toStringList(content.list, 6),
      ], 6)

      if (items.length === 0) {
        const summary = toTextValue(content.summary, '', 180)
        if (summary) items.push(summary)
      }

      return {
        title: toTextValue(content.title, '핵심 요약'),
        items: items.length > 0 ? items : ['핵심 포인트를 정리했습니다.'],
      }
    }
  }
}

interface MarkdownSection {
  heading: string
  level: number
  bullets: string[]
  ordered: string[]
  paragraphs: string[]
  quotes: string[]
  tableRows: string[][]
}

const stripMarkdownInline = (value: string) => (
  value
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
)

const parseMarkdownTableRow = (line: string): string[] | null => {
  if (!line.startsWith('|') || !line.endsWith('|')) return null
  const cells = line
    .split('|')
    .slice(1, -1)
    .map((cell) => stripMarkdownInline(cell))
  if (cells.length < 2) return null
  const dividerOnly = cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  return dividerOnly ? [] : cells
}

const hasMarkdownSectionContent = (section: MarkdownSection) => (
  section.bullets.length > 0 ||
  section.ordered.length > 0 ||
  section.paragraphs.length > 0 ||
  section.quotes.length > 0 ||
  section.tableRows.length > 0
)

const splitIntoSentences = (text: string) => (
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！？])\s+/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 8)
)

const parseMarkdownSections = (source: string): MarkdownSection[] => {
  const lines = sanitizeMarkdownText(source, MAX_SOURCE_CHARS).split('\n')
  const sections: MarkdownSection[] = []
  let current: MarkdownSection = {
    heading: '개요',
    level: 2,
    bullets: [],
    ordered: [],
    paragraphs: [],
    quotes: [],
    tableRows: [],
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      if (hasMarkdownSectionContent(current) || current.heading !== '개요') {
        sections.push(current)
      }

      current = {
        heading: stripMarkdownInline(headingMatch[2]) || `섹션 ${sections.length + 1}`,
        level: headingMatch[1].length,
        bullets: [],
        ordered: [],
        paragraphs: [],
        quotes: [],
        tableRows: [],
      }
      continue
    }

    const tableRow = parseMarkdownTableRow(line)
    if (tableRow) {
      if (tableRow.length > 0) current.tableRows.push(tableRow)
      continue
    }

    const quoteMatch = line.match(/^>\s*(.+)$/)
    if (quoteMatch) {
      const quote = stripMarkdownInline(quoteMatch[1])
      if (quote) current.quotes.push(trimEllipsis(quote, 220))
      continue
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)$/)
    if (bulletMatch) {
      const bullet = stripMarkdownInline(bulletMatch[1])
      if (bullet) current.bullets.push(trimEllipsis(bullet, 160))
      continue
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (orderedMatch) {
      const step = stripMarkdownInline(orderedMatch[1])
      if (step) current.ordered.push(trimEllipsis(step, 160))
      continue
    }

    const paragraph = stripMarkdownInline(line)
    if (paragraph) current.paragraphs.push(trimEllipsis(paragraph, 220))
  }

  if (hasMarkdownSectionContent(current) || sections.length === 0) {
    sections.push(current)
  }

  return sections
}

const sectionPoints = (section: MarkdownSection, maxItems = 6) => dedupeStrings([
  ...section.bullets,
  ...section.ordered,
  ...section.paragraphs.flatMap((paragraph) => splitIntoSentences(paragraph)),
], maxItems)

const buildSlideFromMarkdownSection = (section: MarkdownSection): DeckSlide => {
  const heading = section.heading || '핵심 내용'
  const points = sectionPoints(section, 8)
  const comparisonHint = /(\bvs\.?\b|비교|장단점|pros|cons|찬반|before|after|대안|옵션)/i.test(heading)
  const timelineHint = /(단계|절차|프로세스|과정|로드맵|timeline|flow)/i.test(heading)

  if (section.tableRows.length >= 2) {
    const headers = section.tableRows[0].slice(0, 6)
    const rows = section.tableRows
      .slice(1, 7)
      .map((row) => Array.from({ length: headers.length }, (_unused, cellIndex) => trimEllipsis(row[cellIndex] || '', 80)))
      .filter((row) => row.some((cell) => cell.length > 0))

    if (headers.length > 1 && rows.length > 0) {
      return {
        type: 'table',
        content: {
          title: heading,
          headers,
          rows,
        }
      }
    }
  }

  if ((timelineHint || section.ordered.length >= 3) && points.length >= 2) {
    const steps = section.ordered.length > 0 ? dedupeStrings(section.ordered, 6) : points.slice(0, 6)
    return {
      type: 'timeline',
      content: {
        title: heading,
        items: steps.map((step, stepIndex) => ({
          title: `단계 ${stepIndex + 1}`,
          description: step,
        })),
      }
    }
  }

  if (comparisonHint && points.length >= 2) {
    const vsMatch = heading.match(/^(.+?)\s+(?:vs\.?|VS|대\s*비|비교)\s+(.+)$/i)
    const splitPoint = Math.ceil(points.length / 2)
    return {
      type: 'comparison',
      content: {
        title: heading,
        leftTitle: vsMatch ? trimEllipsis(vsMatch[1], 40) : '옵션 A',
        rightTitle: vsMatch ? trimEllipsis(vsMatch[2], 40) : '옵션 B',
        leftItems: points.slice(0, splitPoint),
        rightItems: points.slice(splitPoint),
      }
    }
  }

  if (section.quotes.length > 0 && points.length <= 2) {
    return {
      type: 'quote',
      content: {
        quote: section.quotes[0],
        author: heading,
      }
    }
  }

  return {
    type: 'card-grid',
    content: {
      title: heading,
      items: points.length > 0 ? points.slice(0, 6) : ['핵심 포인트를 정리했습니다.'],
    }
  }
}

const normalizeSlides = (rawSlides: DeckSlide[], projectName: string) => {
  const safeSlides = rawSlides
    .filter((slide) => slide && typeof slide === 'object')
    .map((slide, index) => {
      const type = normalizeSlideType(slide.type)
      const content = normalizeSlideContent(type, slide.content, index, projectName)
      return { type, content }
    })
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
      content: normalizeSlideContent('title', { title: projectName }, 0, projectName),
    })
  }

  return safeSlides
}

const buildFallbackSlidesFromMarkdown = (source: string, projectName: string): DeckSlide[] => {
  const sections = parseMarkdownSections(source)
  const summaryPoints = dedupeStrings(sections.flatMap((section) => sectionPoints(section, 4)), 6)
  const quoteCandidate = dedupeStrings(sections.flatMap((section) => section.quotes), 1)[0]
  const subtitleSeed = (
    sections[0]?.paragraphs[0] ||
    sections[0]?.heading ||
    summaryPoints[0] ||
    '입력 마크다운을 분석해 발표 흐름을 생성했습니다.'
  )

  const slides: DeckSlide[] = [
    {
      type: 'title',
      content: {
        title: projectName,
        subtitle: trimEllipsis(subtitleSeed, 90),
      }
    }
  ]

  if (summaryPoints.length > 0) {
    slides.push({
      type: 'card-grid',
      content: {
        title: '문서 핵심 요약',
        items: summaryPoints,
      }
    })
  }

  for (const section of sections) {
    if (!hasMarkdownSectionContent(section)) continue
    if (slides.length >= 8) break
    slides.push(buildSlideFromMarkdownSection(section))
  }

  if (quoteCandidate && slides.length < 9) {
    slides.push({
      type: 'quote',
      content: {
        quote: quoteCandidate,
        author: 'Source Note',
      }
    })
  }

  if (slides.length < 3) {
    slides.push({
      type: 'card-grid',
      content: {
        title: '핵심 포인트',
        items: ['문서 구조를 분석해 핵심 항목을 추출했습니다.'],
      }
    })
  }

  return normalizeSlides(slides, projectName)
}

const buildFallbackSlidesFromPlainText = (source: string, sourceType: SourceType, projectName: string): DeckSlide[] => {
  const normalized = source.replace(/\s+/g, ' ').trim()
  const sentences = dedupeStrings(splitIntoSentences(normalized).map((item) => trimEllipsis(item, 120)), 8)
  const points = sentences.length > 0
    ? sentences
    : dedupeStrings(
      normalized
        .split(/[;•·]\s*| - /)
        .map((part) => trimEllipsis(part.trim(), 120))
        .filter((part) => part.length > 10),
      6
    )

  const slides: DeckSlide[] = [
    {
      type: 'title',
      content: {
        title: projectName,
        subtitle: `${sourceType.toUpperCase()} 입력을 분석해 자동 구성`,
      }
    },
    {
      type: 'card-grid',
      content: {
        title: '핵심 요약',
        items: points.length > 0 ? points.slice(0, 6) : ['입력 문서를 분석해 요약을 생성했습니다.'],
      }
    }
  ]

  if (points.length >= 4) {
    const splitPoint = Math.ceil(points.length / 2)
    slides.push({
      type: 'comparison',
      content: {
        title: '핵심 비교',
        leftTitle: '관점 A',
        rightTitle: '관점 B',
        leftItems: points.slice(0, splitPoint),
        rightItems: points.slice(splitPoint),
      }
    })
  }

  if (points.length >= 3 && slides.length < 5) {
    slides.push({
      type: 'timeline',
      content: {
        title: '핵심 흐름',
        items: points.slice(0, 5).map((point, pointIndex) => ({
          title: `단계 ${pointIndex + 1}`,
          description: point,
        })),
      }
    })
  }

  slides.push({
    type: 'quote',
    content: {
      quote: points[0] || trimEllipsis(normalized, 180) || '입력 문서를 기반으로 핵심 인사이트를 정리했습니다.',
      author: 'Auto Slide Foundry',
    }
  })

  return normalizeSlides(slides, projectName)
}

const buildFallbackSlidesFromSource = (source: string, sourceType: SourceType, projectName: string): DeckSlide[] => {
  if (sourceType === 'markdown') {
    return buildFallbackSlidesFromMarkdown(source, projectName)
  }
  return buildFallbackSlidesFromPlainText(source, sourceType, projectName)
}

const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

const collectTextValues = (value: unknown, bucket: string[]) => {
  if (typeof value === 'string') {
    const cleaned = sanitizeText(value, 260)
    if (cleaned) bucket.push(cleaned)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextValues(item, bucket))
    return
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectTextValues(item, bucket))
  }
}

const slideTextFragments = (slide: DeckSlide) => {
  const texts: string[] = []
  collectTextValues(slide.content, texts)
  return texts
}

const buildSourcePoints = (source: string, maxItems = 10) => {
  const normalized = sanitizeText(source, MAX_SOURCE_CHARS)
  const sentencePoints = dedupeStrings(
    splitIntoSentences(normalized).map((text) => trimEllipsis(text, 120)),
    maxItems
  )
  if (sentencePoints.length > 0) return sentencePoints

  return dedupeStrings(
    normalized
      .split(/\n|[;•·]/)
      .map((text) => trimEllipsis(text.trim(), 120))
      .filter((text) => text.length > 10),
    maxItems
  )
}

const ensureMinimumSlidesCount = (slides: DeckSlide[], source: string, projectName: string) => {
  const targetCount = Math.min(Math.max(MIN_TARGET_SLIDES, 3), MAX_TARGET_SLIDES)
  if (slides.length >= targetCount) return slides.slice(0, MAX_TARGET_SLIDES)

  const repaired = [...slides]
  const points = buildSourcePoints(source, 12)
  let pointer = 0
  while (repaired.length < targetCount) {
    const point = points[pointer % Math.max(points.length, 1)] || `핵심 포인트 ${repaired.length + 1}`
    const pattern = repaired.length % 3

    if (pattern === 0) {
      repaired.push({
        type: 'card-grid',
        content: {
          title: '추가 핵심 요약',
          items: [point],
        }
      })
    } else if (pattern === 1) {
      repaired.push({
        type: 'timeline',
        content: {
          title: '추가 핵심 흐름',
          items: [{ title: `단계 ${pointer + 1}`, description: point }],
        }
      })
    } else {
      repaired.push({
        type: 'quote',
        content: {
          quote: point,
          author: projectName,
        }
      })
    }
    pointer += 1
  }

  return repaired.slice(0, MAX_TARGET_SLIDES)
}

const evaluateSlidesQuality = (slides: DeckSlide[]): DeckQualityReport => {
  const issues: string[] = []

  let structure = 100
  if (slides.length < MIN_TARGET_SLIDES) {
    structure -= 30
    issues.push(`슬라이드 수가 부족합니다 (${slides.length}/${MIN_TARGET_SLIDES}).`)
  }
  if (slides.length > MAX_TARGET_SLIDES) {
    structure -= 12
    issues.push(`슬라이드 수가 많습니다 (${slides.length}/${MAX_TARGET_SLIDES}).`)
  }
  if (slides[0]?.type !== 'title') {
    structure -= 45
    issues.push('첫 슬라이드가 title 구조가 아닙니다.')
  }

  const bodyCount = slides.filter((slide) => ['card-grid', 'comparison', 'timeline', 'table'].includes(slide.type)).length
  if (bodyCount < 2) {
    structure -= 20
    issues.push('핵심 본문 슬라이드가 부족합니다.')
  }

  const endingType = slides[slides.length - 1]?.type
  if (!endingType || !['title', 'quote', 'card-grid'].includes(endingType)) {
    structure -= 8
    issues.push('마무리 슬라이드 구조가 약합니다.')
  }
  structure = clampScore(structure)

  let readability = 100
  let longTextCount = 0
  let denseSlideCount = 0
  let emptySlideCount = 0

  slides.forEach((slide) => {
    const fragments = slideTextFragments(slide)
    if (fragments.length === 0) {
      emptySlideCount += 1
      return
    }

    fragments.forEach((text) => {
      if (text.length > 140) longTextCount += 1
    })

    if (slide.type === 'card-grid') {
      const itemCount = Array.isArray(slide.content.items) ? slide.content.items.length : 0
      if (itemCount > 6) denseSlideCount += 1
    }
    if (slide.type === 'timeline') {
      const itemCount = Array.isArray(slide.content.items) ? slide.content.items.length : 0
      if (itemCount > 6) denseSlideCount += 1
    }
    if (slide.type === 'table') {
      const rowCount = Array.isArray(slide.content.rows) ? slide.content.rows.length : 0
      if (rowCount > 7) denseSlideCount += 1
    }
  })

  readability -= longTextCount * 4
  readability -= denseSlideCount * 8
  readability -= emptySlideCount * 14

  if (longTextCount > 0) issues.push(`긴 문장이 많습니다 (${longTextCount}개).`)
  if (denseSlideCount > 0) issues.push(`과밀 슬라이드가 있습니다 (${denseSlideCount}개).`)
  if (emptySlideCount > 0) issues.push(`내용이 비어 있는 슬라이드가 있습니다 (${emptySlideCount}개).`)
  readability = clampScore(readability)

  const uniqueTypeCount = new Set(slides.map((slide) => slide.type)).size
  let diversity = 40
  if (uniqueTypeCount >= 4) diversity = 100
  else if (uniqueTypeCount === 3) diversity = 85
  else if (uniqueTypeCount === 2) diversity = 65
  if (uniqueTypeCount < 3) {
    issues.push(`슬라이드 타입 다양성이 낮습니다 (${uniqueTypeCount}종).`)
  }
  diversity = clampScore(diversity)

  const overall = clampScore(structure * 0.45 + readability * 0.35 + diversity * 0.2)

  return {
    structure,
    readability,
    diversity,
    overall,
    issues: dedupeStrings(issues, 8),
  }
}

const applyQualitySelfHealing = (
  rawSlides: DeckSlide[],
  source: string,
  sourceType: SourceType,
  projectName: string
) => {
  const normalized = normalizeSlides(rawSlides, projectName).slice(0, MAX_TARGET_SLIDES)
  const repaired = normalizeSlides(
    ensureMinimumSlidesCount(normalized, source, projectName),
    projectName
  ).slice(0, MAX_TARGET_SLIDES)
  const repairedQuality = evaluateSlidesQuality(repaired)

  if (repairedQuality.overall >= QUALITY_FALLBACK_THRESHOLD) {
    return { slides: repaired, quality: repairedQuality }
  }

  const fallback = normalizeSlides(
    ensureMinimumSlidesCount(
      buildFallbackSlidesFromSource(source, sourceType, projectName),
      source,
      projectName
    ),
    projectName
  ).slice(0, MAX_TARGET_SLIDES)
  const fallbackQuality = evaluateSlidesQuality(fallback)

  if (fallbackQuality.overall >= repairedQuality.overall) {
    return { slides: fallback, quality: fallbackQuality }
  }
  return { slides: repaired, quality: repairedQuality }
}

const extractSlidesFromAiResponse = (raw: string): unknown[] => {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('AI 응답이 비어 있습니다')

  const tryParse = (input: string): unknown[] | null => {
    try {
      const parsed = JSON.parse(input)
      if (Array.isArray(parsed)) return parsed
      if (parsed && typeof parsed === 'object') {
        const typed = parsed as Record<string, unknown>
        if (Array.isArray(typed.slides)) return typed.slides
      }
      return null
    } catch {
      return null
    }
  }

  const directParsed = tryParse(trimmed)
  if (directParsed) return directParsed

  const objectMatch = trimmed.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    const parsed = tryParse(objectMatch[0])
    if (parsed) return parsed
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    const parsed = tryParse(arrayMatch[0])
    if (parsed) return parsed
  }

  throw new Error('AI 응답에서 슬라이드 배열을 찾지 못했습니다')
}

const generateSlidesWithAI = async (source: string, sourceType: SourceType, projectName: string): Promise<DeckSlide[]> => {
  if (!process.env.ZAI_API_KEY) {
    return buildFallbackSlidesFromSource(source, sourceType, projectName)
  }

  const systemPrompt = `너는 마크다운/문서 입력을 발표 슬라이드 구조로 바꾸는 컴파일러다.
5~9장의 슬라이드를 JSON 배열로만 출력하라.

허용 타입:
- title
- card-grid
- comparison
- timeline
- quote
- table

타입별 content 필드 규격:
- title: { "title": string, "subtitle": string }
- card-grid: { "title": string, "items": string[] }
- comparison: { "title": string, "leftTitle": string, "rightTitle": string, "leftItems": string[], "rightItems": string[] }
- timeline: { "title": string, "items": [{"title": string, "description": string}] }
- quote: { "quote": string, "author": string }
- table: { "title": string, "headers": string[], "rows": string[][] }

내용 매핑 규칙:
1) heading/섹션 구조를 유지해 흐름을 만든다.
2) vs/장단점/찬반 내용은 comparison을 우선 사용한다.
3) 단계형(번호 목록, 절차)은 timeline을 사용한다.
4) 표나 수치 비교는 table을 사용한다.
5) 핵심 문장/인용은 quote를 사용한다.
6) 각 슬라이드는 한 가지 핵심만 담고 텍스트는 간결하게 유지한다.

출력 규칙:
1) 첫 슬라이드는 반드시 title
2) 한국어로 작성
3) JSON 외 텍스트 금지
4) 코드블록 마크다운 금지`

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
  const parsedSlides = extractSlidesFromAiResponse(content)
  if (!Array.isArray(parsedSlides) || parsedSlides.length === 0) {
    throw new Error('AI 응답 슬라이드가 비어 있습니다')
  }

  const slides = parsedSlides.map((item) => {
    if (!item || typeof item !== 'object') {
      return { type: 'card-grid', content: { title: '요약', items: [] } }
    }

    const typed = item as Record<string, unknown>
    const rawType = typed.type
    const directContent = typed.content
    if (directContent && typeof directContent === 'object' && !Array.isArray(directContent)) {
      return { type: normalizeSlideType(rawType), content: directContent as Record<string, unknown> }
    }

    const { type: _discardType, ...rest } = typed
    return { type: normalizeSlideType(rawType), content: rest as Record<string, unknown> }
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

const createProject = async (
  userId: string,
  name: string,
  sourceType: SourceType,
  sourceLabel: string,
  slides: DeckSlide[],
  quality?: DeckQualityReport
) => {
  const qualityLabel = quality ? ` · Q${quality.overall}` : ''
  const created = await prisma.project.create({
    data: {
      name,
      description: `${sourceType.toUpperCase()} · ${sourceLabel}${qualityLabel}`,
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

    if (!sourceText || sourceText.length < MIN_SOURCE_TEXT_CHARS) {
      throw new RequestValidationError('입력 문서의 내용이 너무 짧습니다', 'SOURCE_TEXT_TOO_SHORT')
    }

    const customName = typeof req.body?.name === 'string' ? req.body.name : undefined
    const projectName = deriveProjectName(effectiveSourceType, projectNameHint, customName)

    const { slides, quality } = await withGenerationLock(userId, async () => {
      let generatedSlides: DeckSlide[]
      try {
        generatedSlides = await generateSlidesWithAI(sourceText, effectiveSourceType, projectName)
      } catch (aiError) {
        console.error(`${effectiveSourceType} AI 생성 실패, 폴백으로 전환:`, aiError)
        generatedSlides = buildFallbackSlidesFromSource(sourceText, effectiveSourceType, projectName)
      }

      return applyQualitySelfHealing(
        generatedSlides,
        sourceText,
        effectiveSourceType,
        projectName
      )
    })

    const project = await createProject(
      userId,
      projectName,
      effectiveSourceType,
      sourceLabel,
      slides,
      quality
    )
    res.json({ project, quality })
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
    const base64 = typeof req.body?.base64 === 'string' ? req.body.base64 : ''
    const fileName = typeof req.body?.fileName === 'string' ? req.body.fileName : 'document.md'
    if (base64.trim()) {
      const sourceText = await extractMarkdownContent(base64)
      const safeFileName = path.basename(fileName || 'document.md')
      return {
        sourceText,
        sourceLabel: safeFileName,
        projectNameHint: safeFileName.replace(/\.(md|markdown|txt)$/i, '') || 'Markdown Deck',
      }
    }

    // Backward compatibility: still accept inline markdown text.
    const markdown = typeof req.body?.markdown === 'string' ? req.body.markdown : ''
    if (!markdown.trim()) throw new RequestValidationError('마크다운 파일을 업로드하세요')
    return {
      sourceText: sanitizeMarkdownText(markdown),
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
