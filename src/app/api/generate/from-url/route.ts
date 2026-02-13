/**
 * URL → 슬라이드 생성 API
 * POST /api/generate/from-url
 *
 * 웹 URL을 입력받아 콘텐츠를 스크래핑하고 AI로 슬라이드를 생성합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl, isValidUrl, normalizeUrl } from "@/lib/scraper";
import {
  createSlideGenerationPrompt,
  parseGeneratedSlidesResponse,
  type SlideGenerationOptions,
  type GeneratedSlidesResponse,
} from "@/lib/prompts/slide-generation";
import { generateChatCompletion } from "@/lib/glm5";

/**
 * 요청 바디 타입
 */
interface RequestBody {
  url: string;
  options?: SlideGenerationOptions;
}

/**
 * API 응답 타입
 */
interface ApiResponse {
  success: boolean;
  data?: GeneratedSlidesResponse;
  source?: {
    url: string;
    title: string;
    contentLength: number;
  };
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    // 요청 바디 파싱
    const body: RequestBody = await request.json();
    const { url, options = {} } = body;

    // URL 검증
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "URL이 필요합니다.",
        },
        { status: 400 }
      );
    }

    const normalizedUrl = normalizeUrl(url);

    if (!isValidUrl(normalizedUrl)) {
      return NextResponse.json(
        {
          success: false,
          error: "유효하지 않은 URL 형식입니다.",
        },
        { status: 400 }
      );
    }

    // 웹 스크래핑
    const scrapedContent = await scrapeUrl(normalizedUrl);

    if (scrapedContent.error) {
      return NextResponse.json(
        {
          success: false,
          error: scrapedContent.error,
        },
        { status: 400 }
      );
    }

    if (!scrapedContent.markdown.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "웹 페이지에서 콘텐츠를 추출할 수 없습니다.",
        },
        { status: 400 }
      );
    }

    // 슬라이드 생성 프롬프트 생성
    const messages = createSlideGenerationPrompt({
      content: scrapedContent.markdown,
      source: "url",
      options: {
        maxSlides: 10,
        language: "ko",
        includeTitleSlide: true,
        ...options,
      },
    });

    // GLM-5 API 호출
    const aiResponse = await generateChatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 8192, // 긴 응답을 위해 충분한 토큰 할당
    });

    // AI 응답 파싱
    const slidesData = parseGeneratedSlidesResponse(aiResponse);

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: slidesData,
      source: {
        url: normalizedUrl,
        title: scrapedContent.title,
        contentLength: scrapedContent.markdown.length,
      },
    });
  } catch (error) {
    console.error("URL 슬라이드 생성 오류:", error);

    const errorMessage =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

    // 환경변수 누락 오류 특별 처리
    if (errorMessage.includes("ZAI_API_KEY")) {
      return NextResponse.json(
        {
          success: false,
          error: "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: `슬라이드 생성 실패: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET 요청은 허용하지 않음
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "GET 메서드는 지원하지 않습니다. POST 요청을 사용하세요.",
    },
    { status: 405 }
  );
}
