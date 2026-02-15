import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

export interface DeckSlide {
  type: string
  content: Record<string, unknown>
}

export interface SvgTemplateInfo {
  id: string
  fileName: string
  name: string
  description: string
  author: string
  path: string
}

interface RenderDeckOptions {
  projectName: string
  slides: DeckSlide[]
  templateId?: string
  footerText?: string
}

const metaContent = (html: string, metaName: string, fallback = '') => {
  const escapedName = metaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = html.match(new RegExp(`<meta\\s+name="${escapedName}"\\s+content="([^"]*)"`, 'i'))
  return match ? match[1] : fallback
}

const slugify = (value: string) => (
  value
    .toLowerCase()
    .trim()
    .replace(/\.html$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'template'
)

const escapeHtml = (value: string) => (
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
)

const escapeJsString = (value: string) => (
  value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '')
    .replace(/\n/g, ' ')
)

const toText = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
)

const toStringArray = (value: unknown, fallback: string[] = []) => {
  if (!Array.isArray(value)) return fallback
  const values = value
    .map((item) => toText(item).trim())
    .filter(Boolean)
  return values.length > 0 ? values : fallback
}

const resolveSvgSlideMakerRoot = () => {
  const candidates = [
    process.env.SVG_SLIDE_MAKER_ROOT,
    path.resolve(process.cwd(), '../svg-slide-maker'),
    path.resolve(process.cwd(), 'svg-slide-maker'),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, 'templates')) && existsSync(path.join(candidate, 'slide-tool.mjs'))) {
      return candidate
    }
  }

  throw new Error('svg-slide-maker root를 찾을 수 없습니다. SVG_SLIDE_MAKER_ROOT를 설정하세요.')
}

const templatesDir = () => path.join(resolveSvgSlideMakerRoot(), 'templates')

const findMatchingDivClose = (html: string, openTagEnd: number) => {
  let depth = 1
  let cursor = openTagEnd

  while (cursor < html.length && depth > 0) {
    const nextOpen = html.indexOf('<div', cursor)
    const nextClose = html.indexOf('</div>', cursor)

    if (nextClose === -1) break

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1
      cursor = nextOpen + 4
      continue
    }

    depth -= 1
    if (depth === 0) return nextClose
    cursor = nextClose + 6
  }

  throw new Error('템플릿의 slide-container 종료 태그를 찾지 못했습니다.')
}

const replaceSlideContainer = (html: string, slidesHtml: string) => {
  const containerRegexes = [
    /(<div\b[^>]*class="slide-container"[^>]*id="slides"[^>]*>)([\s\S]*?)(<\/div>\s*<script>)/i,
    /(<div\b[^>]*id="slides"[^>]*class="slide-container"[^>]*>)([\s\S]*?)(<\/div>\s*<script>)/i,
  ]

  for (const regex of containerRegexes) {
    if (regex.test(html)) {
      return html.replace(regex, (_match, head, _inner, tail) => `${head}\n\n${slidesHtml}\n\n${tail}`)
    }
  }

  const openMatch = /<div\b[^>]*class="slide-container"[^>]*>/i.exec(html)
  if (!openMatch || typeof openMatch.index !== 'number') {
    throw new Error('템플릿에서 slide-container를 찾지 못했습니다.')
  }

  const containerStart = openMatch.index
  const openTagEnd = containerStart + openMatch[0].length
  const closeStart = findMatchingDivClose(html, openTagEnd)

  const head = html.slice(0, openTagEnd)
  const tail = html.slice(closeStart)
  return `${head}\n\n${slidesHtml}\n\n${tail}`
}

const normalizeSlideType = (type: string) => {
  if (type === 'card-grid') return 'cards'
  return type
}

const slideTitle = (slide: DeckSlide, index: number) => {
  const contentTitle = toText(slide.content.title).trim()
  if (contentTitle) return contentTitle

  switch (slide.type) {
    case 'title': return index === 0 ? '제목 슬라이드' : '마무리'
    case 'card-grid': return '핵심 항목'
    case 'comparison': return '비교'
    case 'timeline': return '타임라인'
    case 'quote': return '핵심 인용'
    case 'table': return '데이터'
    default: return '슬라이드'
  }
}

const renderTitleSlide = (slide: DeckSlide, index: number, projectName: string) => {
  const title = escapeHtml(toText(slide.content.title, index === 0 ? projectName : '감사합니다'))
  const subtitle = escapeHtml(toText(slide.content.subtitle, index === 0 ? 'SVG Slide Maker Web Service' : 'Slide Maker'))
  const author = escapeHtml(toText(slide.content.author, 'Slide Maker'))
  const label = escapeHtml(toText(slide.content.dayLabel, index === 0 ? 'GENERATED DECK' : 'WRAP UP'))
  const today = new Date().toISOString().slice(0, 10)
  const headingId = index === 0 ? 'titleH1' : undefined

  return `
<div class="slide title-slide${index === 0 ? ' active' : ''}">
  <div class="day-label">${label}</div>
  <h1${headingId ? ` id="${headingId}"` : ''}>${title}</h1>
  <div class="subtitle">${subtitle}</div>
  <div class="meta-info">
    <span>${author}</span>
    <span>|</span>
    <span>${today}</span>
  </div>
</div>`.trim()
}

const renderCardGridSlide = (slide: DeckSlide, index: number) => {
  const header = escapeHtml(slideTitle(slide, index))
  const items = Array.isArray(slide.content.items) ? slide.content.items : []
  const renderedCards = items.slice(0, 6).map((item, itemIndex) => {
    if (typeof item === 'string') {
      return `
      <div class="concept-card">
        <h3 style="color:var(--accent)">항목 ${itemIndex + 1}</h3>
        <p>${escapeHtml(item)}</p>
      </div>`.trim()
    }

    if (item && typeof item === 'object') {
      const titled = item as { title?: unknown; description?: unknown }
      return `
      <div class="concept-card">
        <h3 style="color:var(--accent)">${escapeHtml(toText(titled.title, `항목 ${itemIndex + 1}`))}</h3>
        <p>${escapeHtml(toText(titled.description))}</p>
      </div>`.trim()
    }

    return ''
  }).filter(Boolean).join('\n')

  return `
<div class="slide content-slide${index === 0 ? ' active' : ''}">
  <div class="slide-header">${header}</div>
  <div class="concept-grid">
    ${renderedCards}
  </div>
</div>`.trim()
}

const renderComparisonSlide = (slide: DeckSlide, index: number) => {
  const header = escapeHtml(slideTitle(slide, index))
  const leftTitle = escapeHtml(toText(slide.content.leftTitle, '옵션 A'))
  const rightTitle = escapeHtml(toText(slide.content.rightTitle, '옵션 B'))
  const leftItems = toStringArray(slide.content.leftItems, ['강점'])
  const rightItems = toStringArray(slide.content.rightItems, ['강점'])

  const leftList = leftItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const rightList = rightItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('')

  return `
<div class="slide content-slide${index === 0 ? ' active' : ''}">
  <div class="slide-header">${header}</div>
  <div class="comparison">
    <div class="col">
      <h3 style="color:var(--accent)">${leftTitle}</h3>
      <ul>${leftList}</ul>
    </div>
    <div class="col">
      <h3 style="color:var(--accent2)">${rightTitle}</h3>
      <ul>${rightList}</ul>
    </div>
  </div>
</div>`.trim()
}

const renderTimelineSlide = (slide: DeckSlide, index: number) => {
  const header = escapeHtml(slideTitle(slide, index))
  const items = Array.isArray(slide.content.items)
    ? slide.content.items.slice(0, 6).map((item, itemIndex) => {
      const typed = item as { title?: unknown; description?: unknown }
      return `
      <div class="timeline-item">
        <h3>${escapeHtml(toText(typed.title, `단계 ${itemIndex + 1}`))}</h3>
        <p>${escapeHtml(toText(typed.description, '설명을 입력하세요'))}</p>
      </div>`.trim()
    }).join('\n')
    : `
      <div class="timeline-item">
        <h3>단계 1</h3>
        <p>설명을 입력하세요</p>
      </div>`.trim()

  return `
<div class="slide content-slide${index === 0 ? ' active' : ''}">
  <div class="slide-header">${header}</div>
  <div class="timeline">
    ${items}
  </div>
</div>`.trim()
}

const renderQuoteSlide = (slide: DeckSlide, index: number) => {
  const quote = escapeHtml(toText(slide.content.quote, '핵심 메시지를 입력하세요.'))
  const source = escapeHtml(toText(slide.content.author, ''))
  return `
<div class="slide${index === 0 ? ' active' : ''}">
  <div class="big-quote">
    <div class="quote-body">
      ${quote}
      ${source ? `<span class="source">— ${source}</span>` : ''}
    </div>
  </div>
</div>`.trim()
}

const renderTableSlide = (slide: DeckSlide, index: number) => {
  const header = escapeHtml(slideTitle(slide, index))
  const headers = toStringArray(slide.content.headers, ['항목', '값'])
  const rows = Array.isArray(slide.content.rows)
    ? slide.content.rows.map((row) => {
      if (!Array.isArray(row)) return []
      return row.map((cell) => escapeHtml(toText(cell)))
    })
    : []

  const headHtml = headers.map((head) => `<th>${escapeHtml(head)}</th>`).join('')
  const rowsHtml = rows.length > 0
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')
    : `<tr><td>${escapeHtml('데이터')}</td><td>${escapeHtml('-')}</td></tr>`

  return `
<div class="slide content-slide${index === 0 ? ' active' : ''}">
  <div class="slide-header">${header}</div>
  <table class="styled-table">
    <thead>
      <tr>${headHtml}</tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
</div>`.trim()
}

const renderSummarySlide = (slide: DeckSlide, index: number) => {
  const header = escapeHtml(slideTitle(slide, index))
  const fallbackItems = toStringArray(slide.content.items, [])
  const summaryItems = fallbackItems.length > 0
    ? fallbackItems
    : [toText(slide.content.summary, '핵심 요약을 입력하세요')]

  const listHtml = summaryItems.map((item, itemIndex) => (
    `<li><span class="num">${String(itemIndex + 1).padStart(2, '0')}</span><span>${escapeHtml(item)}</span></li>`
  )).join('')

  return `
<div class="slide content-slide${index === 0 ? ' active' : ''}">
  <div class="slide-header">${header}</div>
  <ul class="summary-list">${listHtml}</ul>
</div>`.trim()
}

const renderSlide = (slide: DeckSlide, index: number, projectName: string) => {
  switch (slide.type) {
    case 'title':
      return renderTitleSlide(slide, index, projectName)
    case 'card-grid':
      return renderCardGridSlide(slide, index)
    case 'comparison':
      return renderComparisonSlide(slide, index)
    case 'timeline':
      return renderTimelineSlide(slide, index)
    case 'quote':
      return renderQuoteSlide(slide, index)
    case 'table':
      return renderTableSlide(slide, index)
    default:
      return renderSummarySlide(slide, index)
  }
}

export const listSvgTemplates = (): SvgTemplateInfo[] => {
  const dir = templatesDir()
  const files = readdirSync(dir)
    .filter((file) => file.endsWith('.html'))
    .sort()

  return files.map((fileName) => {
    const fullPath = path.join(dir, fileName)
    const html = readFileSync(fullPath, 'utf-8')
    const name = metaContent(html, 'template-name', fileName.replace(/\.html$/i, ''))
    const description = metaContent(html, 'template-description', '')
    const author = metaContent(html, 'template-author', '')
    return {
      id: slugify(fileName),
      fileName,
      name,
      description,
      author,
      path: fullPath,
    }
  })
}

const selectTemplate = (templates: SvgTemplateInfo[], templateId?: string) => {
  if (!templateId) {
    return templates.find((template) => template.fileName === 'default.html') || templates[0]
  }

  const normalized = slugify(templateId)
  return templates.find((template) => (
    template.id === normalized ||
    template.fileName === templateId ||
    slugify(template.name) === normalized
  ))
}

const replaceOverviewArrays = (html: string, slides: DeckSlide[]) => {
  const titles = slides.map((slide, index) => slideTitle(slide, index))
  const types = slides.map((slide) => normalizeSlideType(slide.type))

  const titleSnippet = `const titles = [\n    ${titles.map((title) => `'${escapeJsString(title)}'`).join(',\n    ')}\n  ]`
  const typeSnippet = `const types = [\n    ${types.map((type) => `'${escapeJsString(type)}'`).join(',\n    ')}\n  ]`

  let updated = html
  updated = updated.replace(/const titles = \[[\s\S]*?\]/, titleSnippet)
  updated = updated.replace(/const types = \[[\s\S]*?\]/, typeSnippet)
  return updated
}

export const renderProjectDeckHtml = ({
  projectName,
  slides,
  templateId,
  footerText,
}: RenderDeckOptions) => {
  const templates = listSvgTemplates()
  if (templates.length === 0) {
    throw new Error('사용 가능한 템플릿이 없습니다.')
  }

  const template = selectTemplate(templates, templateId)
  if (!template) {
    throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`)
  }

  const sourceHtml = readFileSync(template.path, 'utf-8')
  const safeSlides = slides.length > 0
    ? slides
    : [{ type: 'title', content: { title: projectName, subtitle: '빈 프로젝트' } }]
  const renderedSlides = safeSlides.map((slide, index) => renderSlide(slide, index, projectName)).join('\n\n')
  const today = new Date().toISOString().slice(0, 10)
  const footer = escapeHtml(footerText || `Slide Maker · ${projectName} · ${today}`)

  let html = replaceSlideContainer(sourceHtml, renderedSlides)
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(projectName)}</title>`)
  html = html.replace(/(<span class="footer-center-text">)([\s\S]*?)(<\/span>)/i, `$1${footer}$3`)
  html = html.replace(/(<div class="footer-page"[^>]*>)([\s\S]*?)(<\/div>)/i, `$1 1 / ${safeSlides.length}$3`)
  html = replaceOverviewArrays(html, safeSlides)

  return {
    html,
    template: {
      id: template.id,
      fileName: template.fileName,
      name: template.name,
      description: template.description,
      author: template.author,
    }
  }
}
