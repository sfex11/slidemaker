/**
 * 슬라이드 내보내기 유틸리티
 * HTML, PDF 내보내기 기능을 제공합니다.
 */

import type { SlideType } from "@/types/slide";

// 슬라이드 타입별 렌더링 함수 타입
interface SlideContent {
  id: string;
  type: SlideType;
  content: Record<string, unknown>;
  order: number;
}

// 테마 기본값
const defaultTheme = {
  bg: "#ffffff",
  surface: "#ffffff",
  surface2: "#f5f5f5",
  border: "#e5e5e5",
  text: "#1a1a1a",
  textDim: "#666666",
  accent: "#3b82f6",
  accent2: "#8b5cf6",
  green: "#22c55e",
  greenDim: "#16a34a",
  orange: "#f97316",
  teal: "#14b8a6",
  pink: "#ec4899",
};

/**
 * 슬라이드 HTML 렌더링 (서버 사이드)
 * React 컴포넌트 대신 순수 HTML/CSS로 렌더링
 */
export function renderSlideToHtml(slide: SlideContent, index: number): string {
  const { type, content } = slide;

  switch (type) {
    case "title":
      return renderTitleSlide(content, index);
    case "card-grid":
      return renderCardGridSlide(content, index);
    case "comparison":
      return renderComparisonSlide(content, index);
    case "timeline":
      return renderTimelineSlide(content, index);
    case "quote":
      return renderQuoteSlide(content, index);
    case "table":
      return renderTableSlide(content, index);
    default:
      return `<div class="slide">알 수 없는 슬라이드 타입: ${type}</div>`;
  }
}

// 타이틀 슬라이드 렌더링
function renderTitleSlide(content: Record<string, unknown>, index: number): string {
  const { title, subtitle, presenter, date, gradient, backgroundImage } = content;

  let bgStyle = "";
  let bgOverlay = "";

  if (gradient) {
    const g = gradient as { from: string; to: string; via?: string; direction?: string };
    const direction = g.direction?.replace("to-", "to ") || "to bottom right";
    bgStyle = `background: linear-gradient(${direction}, ${g.from} 0%, ${g.via ? `${g.via} 50%, ` : ""}${g.to} 100%);`;
  }

  if (backgroundImage) {
    bgOverlay = `<div class="slide-bg-image" style="background-image: url(${backgroundImage}); background-size: cover; background-position: center;"></div>`;
  }

  return `
    <div class="slide slide-title" data-index="${index}">
      ${bgOverlay}
      <div class="slide-content">
        <h1 class="title-main">${escapeHtml(String(title || ""))}</h1>
        ${subtitle ? `<p class="title-sub">${escapeHtml(String(subtitle))}</p>` : ""}
        <div class="title-meta">
          ${presenter ? `<p class="presenter">${escapeHtml(String(presenter))}</p>` : ""}
          ${date ? `<p class="date">${escapeHtml(String(date))}</p>` : ""}
        </div>
      </div>
      <div class="slide-accent-line"></div>
    </div>
  `;
}

// 카드 그리드 슬라이드 렌더링
function renderCardGridSlide(content: Record<string, unknown>, index: number): string {
  const { title, cards, cols = 3 } = content;
  const cardsArray = (cards as Array<{ id: string; title: string; description?: string; iconName?: string }>) || [];

  return `
    <div class="slide slide-card-grid" data-index="${index}">
      ${title ? `<h2 class="section-title">${escapeHtml(String(title))}</h2>` : ""}
      <div class="card-grid cols-${cols}">
        ${cardsArray
          .map(
            (card) => `
          <div class="card">
            <div class="card-icon">
              <span class="icon-placeholder"></span>
            </div>
            <h3 class="card-title">${escapeHtml(card.title)}</h3>
            ${card.description ? `<p class="card-desc">${escapeHtml(card.description)}</p>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// 비교 슬라이드 렌더링
function renderComparisonSlide(content: Record<string, unknown>, index: number): string {
  const { title, leftSide, rightSide, vsText = "VS" } = content;
  const left = leftSide as { title: string; items: string[] };
  const right = rightSide as { title: string; items: string[] };

  return `
    <div class="slide slide-comparison" data-index="${index}">
      ${title ? `<h2 class="section-title">${escapeHtml(String(title))}</h2>` : ""}
      <div class="comparison-container">
        <div class="comparison-side left">
          <h3 class="side-title">${escapeHtml(left?.title || "")}</h3>
          <ul class="side-items">
            ${(left?.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <div class="comparison-vs">${escapeHtml(String(vsText))}</div>
        <div class="comparison-side right">
          <h3 class="side-title">${escapeHtml(right?.title || "")}</h3>
          <ul class="side-items">
            ${(right?.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
      </div>
    </div>
  `;
}

// 타임라인 슬라이드 렌더링
function renderTimelineSlide(content: Record<string, unknown>, index: number): string {
  const { title, items, direction = "horizontal" } = content;
  const itemsArray = (items as Array<{ id: string; step: number; title: string; description?: string }>) || [];

  return `
    <div class="slide slide-timeline ${direction}" data-index="${index}">
      ${title ? `<h2 class="section-title">${escapeHtml(String(title))}</h2>` : ""}
      <div class="timeline-container">
        <div class="timeline-line"></div>
        ${itemsArray
          .map(
            (item) => `
          <div class="timeline-item">
            <div class="timeline-marker">
              <span>${item.step}</span>
            </div>
            <div class="timeline-content">
              <h4 class="timeline-title">${escapeHtml(item.title)}</h4>
              ${item.description ? `<p class="timeline-desc">${escapeHtml(item.description)}</p>` : ""}
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;
}

// 인용문 슬라이드 렌더링
function renderQuoteSlide(content: Record<string, unknown>, index: number): string {
  const { quote, author, source, showQuotationMarks = true } = content;

  return `
    <div class="slide slide-quote" data-index="${index}">
      <div class="quote-container">
        ${showQuotationMarks ? '<span class="quote-mark">"</span>' : ""}
        <blockquote class="quote-text">${escapeHtml(String(quote))}</blockquote>
        ${author || source ? `
          <div class="quote-attribution">
            ${author ? `<cite class="quote-author">${escapeHtml(String(author))}</cite>` : ""}
            ${source ? `<span class="quote-source">${escapeHtml(String(source))}</span>` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  `;
}

// 테이블 슬라이드 렌더링
function renderTableSlide(content: Record<string, unknown>, index: number): string {
  const { title, headers, rows, striped = true, bordered = true } = content;
  const rowsArray = (rows as Array<{ id: string; cells: Array<{ content: string; align?: string }>; isHeader?: boolean }>) || [];

  return `
    <div class="slide slide-table" data-index="${index}">
      ${title ? `<h2 class="section-title">${escapeHtml(String(title))}</h2>` : ""}
      <div class="table-container">
        <table class="data-table ${striped ? "striped" : ""} ${bordered ? "bordered" : ""}">
          ${headers ? `
            <thead>
              <tr>
                ${(headers as string[]).map((h) => `<th>${escapeHtml(h)}</th>`).join("")}
              </tr>
            </thead>
          ` : ""}
          <tbody>
            ${rowsArray
              .map(
                (row) => `
              <tr ${row.isHeader ? 'class="header-row"' : ""}>
                ${row.cells.map((cell) => `<td style="text-align: ${cell.align || "left"}">${escapeHtml(cell.content)}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * HTML 이스케이프
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * 전체 슬라이드 덱 HTML 생성
 */
export function generateSlideDeckHtml(
  slides: SlideContent[],
  projectName: string,
  theme: typeof defaultTheme = defaultTheme
): string {
  const slidesHtml = slides.map((slide, index) => renderSlideToHtml(slide, index)).join("\n");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(projectName)}</title>
  <style>
    /* CSS 변수 - 테마 */
    :root {
      --slide-bg: ${theme.bg};
      --slide-surface: ${theme.surface};
      --slide-surface2: ${theme.surface2};
      --slide-border: ${theme.border};
      --slide-text: ${theme.text};
      --slide-text-dim: ${theme.textDim};
      --slide-accent: ${theme.accent};
      --slide-accent2: ${theme.accent2};
      --slide-green: ${theme.green};
      --slide-orange: ${theme.orange};
      --slide-teal: ${theme.teal};
      --slide-pink: ${theme.pink};
    }

    /* 기본 스타일 */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #f0f0f0;
      color: var(--slide-text);
      line-height: 1.6;
    }

    /* 슬라이드 컨테이너 */
    .slide {
      width: 100%;
      aspect-ratio: 16 / 9;
      max-width: 1280px;
      margin: 20px auto;
      background: var(--slide-bg);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      padding: 40px;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }

    @media print {
      .slide {
        margin: 0;
        box-shadow: none;
        border-radius: 0;
        page-break-after: always;
      }
    }

    /* 섹션 제목 */
    .section-title {
      font-size: 2rem;
      font-weight: 700;
      color: var(--slide-text);
      text-align: center;
      margin-bottom: 30px;
    }

    /* 타이틀 슬라이드 */
    .slide-title .slide-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .title-main {
      font-size: 3rem;
      font-weight: 700;
      color: var(--slide-text);
      margin-bottom: 16px;
    }

    .title-sub {
      font-size: 1.5rem;
      color: var(--slide-text-dim);
      margin-bottom: 24px;
    }

    .title-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .presenter {
      font-size: 1.25rem;
      font-weight: 500;
      color: var(--slide-accent);
    }

    .date {
      font-size: 1rem;
      color: var(--slide-text-dim);
    }

    .slide-accent-line {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(to right, var(--slide-accent), var(--slide-accent2));
    }

    /* 카드 그리드 */
    .card-grid {
      display: grid;
      gap: 24px;
      flex: 1;
      align-content: center;
    }

    .card-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .card-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .card-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }

    .card {
      background: var(--slide-surface2);
      border: 1px solid var(--slide-border);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .card-icon {
      width: 56px;
      height: 56px;
      background: var(--slide-accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }

    .icon-placeholder {
      width: 28px;
      height: 28px;
      background: white;
      border-radius: 4px;
    }

    .card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--slide-text);
      margin-bottom: 8px;
    }

    .card-desc {
      font-size: 0.875rem;
      color: var(--slide-text-dim);
      line-height: 1.5;
    }

    /* 비교 슬라이드 */
    .comparison-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 40px;
      flex: 1;
    }

    .comparison-side {
      flex: 1;
      padding: 24px;
      background: var(--slide-surface2);
      border-radius: 12px;
    }

    .side-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--slide-text);
      margin-bottom: 16px;
      text-align: center;
    }

    .side-items {
      list-style: none;
      padding: 0;
    }

    .side-items li {
      padding: 8px 0;
      padding-left: 20px;
      position: relative;
      color: var(--slide-text-dim);
    }

    .side-items li::before {
      content: "";
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 8px;
      height: 8px;
      background: var(--slide-accent);
      border-radius: 50%;
    }

    .comparison-vs {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--slide-accent);
      background: var(--slide-surface2);
      padding: 12px 20px;
      border-radius: 8px;
    }

    /* 타임라인 */
    .slide-timeline.horizontal .timeline-container {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      position: relative;
      padding: 40px 20px 20px;
      flex: 1;
    }

    .timeline-line {
      position: absolute;
      top: 60px;
      left: 40px;
      right: 40px;
      height: 4px;
      background: var(--slide-border);
    }

    .timeline-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 200px;
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .timeline-marker {
      width: 40px;
      height: 40px;
      background: var(--slide-accent);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .timeline-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--slide-text);
      margin-bottom: 8px;
    }

    .timeline-desc {
      font-size: 0.875rem;
      color: var(--slide-text-dim);
    }

    /* 인용문 */
    .slide-quote .quote-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px;
    }

    .quote-mark {
      font-size: 6rem;
      color: var(--slide-accent);
      opacity: 0.3;
      line-height: 1;
      margin-bottom: -40px;
    }

    .quote-text {
      font-size: 1.75rem;
      font-style: italic;
      color: var(--slide-text);
      max-width: 80%;
      line-height: 1.6;
    }

    .quote-attribution {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .quote-author {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--slide-accent);
      font-style: normal;
    }

    .quote-source {
      font-size: 0.875rem;
      color: var(--slide-text-dim);
    }

    /* 테이블 */
    .table-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }

    .data-table.bordered th,
    .data-table.bordered td {
      border: 1px solid var(--slide-border);
    }

    .data-table th {
      background: var(--slide-accent);
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-weight: 600;
    }

    .data-table td {
      padding: 12px 16px;
      color: var(--slide-text);
    }

    .data-table.striped tbody tr:nth-child(even) {
      background: var(--slide-surface2);
    }

    .data-table .header-row {
      background: var(--slide-surface2);
      font-weight: 600;
    }

    /* 프린트용 스타일 */
    @media print {
      body {
        background: white;
      }

      .slide {
        box-shadow: none;
        margin: 0;
        page-break-after: always;
        max-width: none;
        border-radius: 0;
      }
    }

    /* 슬라이드 번호 표시 */
    .slide::after {
      content: attr(data-index);
      position: absolute;
      bottom: 10px;
      right: 20px;
      font-size: 0.75rem;
      color: var(--slide-text-dim);
    }
  </style>
</head>
<body>
  ${slidesHtml}
</body>
</html>`;
}

/**
 * HTML을 PDF로 변환
 * Puppeteer를 동적으로 import합니다 (선택적 의존성)
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  // puppeteer가 선택적 의존성이므로 동적으로 import
  const puppeteer = await import("puppeteer").catch(() => null);

  if (!puppeteer) {
    throw new Error(
      "Puppeteer가 설치되어 있지 않습니다. 'npm install puppeteer'를 실행하세요."
    );
  }

  let browser = null;

  try {
    // Puppeteer 브라우저 실행
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // HTML 콘텐츠 설정
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // PDF 생성
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true, // 16:9 비율에 맞춤
      printBackground: true,
      margin: {
        top: "10mm",
        bottom: "10mm",
        left: "10mm",
        right: "10mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 프로젝트 ID로 내보내기 URL 생성
 */
export function generateExportUrl(exportId: string, format: string): string {
  // 실제 운영에서는 CDN이나 S3 URL을 반환
  // 개발 단계에서는 API 엔드포인트 사용
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/exports/${exportId}/download?format=${format}`;
}
