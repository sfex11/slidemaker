/**
 * 웹 스크래핑 유틸리티
 * Jina Reader API 또는 커스텀 스크래퍼를 사용하여 웹 콘텐츠 추출
 */

const JINA_READER_BASE_URL = "https://r.jina.ai";

/**
 * 웹 콘텐츠 추출 결과
 */
export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  markdown: string;
  error?: string;
}

/**
 * Jina Reader API를 사용하여 URL에서 마크다운 콘텐츠를 추출합니다.
 * @see https://jina.ai/reader/
 */
export async function scrapeWithJinaReader(url: string): Promise<ScrapedContent> {
  try {
    const readerUrl = `${JINA_READER_BASE_URL}/${url}`;

    const response = await fetch(readerUrl, {
      method: "GET",
      headers: {
        Accept: "text/markdown",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Jina Reader API 오류: ${response.status} ${response.statusText}`
      );
    }

    const markdown = await response.text();

    // 타이틀 추출 (첫 번째 H1 또는 첫 번째 줄)
    const titleMatch = markdown.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : extractTitleFromUrl(url);

    return {
      url,
      title,
      content: markdown,
      markdown,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류";
    return {
      url,
      title: "",
      content: "",
      markdown: "",
      error: `웹 스크래핑 실패: ${errorMessage}`,
    };
  }
}

/**
 * URL에서 도메인과 경로를 기반으로 제목을 추출합니다.
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // 경로의 마지막 세그먼트를 제목으로 사용
    const segments = pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";

    // 하이픈/언더스코어를 공백으로 변환하고 대문자로 시작하게
    const title = lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\.\w+$/, "") // 확장자 제거
      .replace(/\b\w/g, (c) => c.toUpperCase());

    return title || urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * URL이 유효한지 검증합니다.
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * URL을 정규화합니다 (프로토콜 추가 등)
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();

  // 프로토콜이 없으면 https 추가
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * 웹 스크래핑 메인 함수
 * Jina Reader API를 사용하여 콘텐츠를 추출합니다.
 */
export async function scrapeUrl(url: string): Promise<ScrapedContent> {
  const normalizedUrl = normalizeUrl(url);

  if (!isValidUrl(normalizedUrl)) {
    return {
      url: normalizedUrl,
      title: "",
      content: "",
      markdown: "",
      error: "유효하지 않은 URL입니다.",
    };
  }

  return scrapeWithJinaReader(normalizedUrl);
}

/**
 * 여러 URL을 동시에 스크래핑합니다.
 */
export async function scrapeUrls(
  urls: string[],
  concurrency: number = 3
): Promise<ScrapedContent[]> {
  const results: ScrapedContent[] = [];

  // 배치로 처리
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(scrapeUrl));
    results.push(...batchResults);
  }

  return results;
}

/**
 * 스크래핑된 콘텐츠에서 텍스트만 추출합니다.
 * 마크다운 문법을 제거하고 순수 텍스트만 반환합니다.
 */
export function extractPlainText(markdown: string): string {
  return (
    markdown
      // 코드 블록 제거
      .replace(/```[\s\S]*?```/g, "")
      // 인라인 코드 제거
      .replace(/`[^`]+`/g, "")
      // 이미지 제거
      .replace(/!\[.*?\]\(.*?\)/g, "")
      // 링크 텍스트만 남기기
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // 헤딩 기호 제거
      .replace(/^#{1,6}\s+/gm, "")
      // 볼드/이탤릭 제거
      .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
      // 인용문 기호 제거
      .replace(/^>\s+/gm, "")
      // 리스트 기호 제거
      .replace(/^[-*+]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      // 수평선 제거
      .replace(/^[-*_]{3,}$/gm, "")
      // HTML 태그 제거
      .replace(/<[^>]+>/g, "")
      // 여러 공백을 하나로
      .replace(/\s+/g, " ")
      .trim()
  );
}
