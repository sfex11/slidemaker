/**
 * 마크다운 → 슬라이드 생성 API
 * POST /api/generate/from-markdown
 *
 * 마크다운 텍스트를 입력받아 AI로 슬라이드를 생성합니다.
 */

import { NextRequest, NextResponse } from "next/server";
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
  markdown: string;
  title?: string; // 선택적 제목 오버라이드
  options?: SlideGenerationOptions;
}

/**
 * API 응답 타입
 */
interface ApiResponse {
  success: boolean;
  data?: GeneratedSlidesResponse;
  input?: {
    contentLength: number;
    title?: string;
  };
  error?: string;
}

/**
 * 마크다운 콘텐츠 전처리
 */
function preprocessMarkdown(markdown: string): string {
  let processed = markdown;

  // 과도한 빈 줄 정리
  processed = processed.replace(/\n{3,}/g, "\n\n");

  // 앞뒤 공백 제거
  processed = processed.trim();

  return processed;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    // 요청 바디 파싱
    const body: RequestBody = await request.json();
    const { markdown, title, options = {} } = body;

    // 마크다운 검증
    if (!markdown || typeof markdown !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "마크다운 콘텐츠가 필요합니다.",
        },
        { status: 400 }
      );
    }

    // 콘텐츠 길이 제한 확인 (GLM-5 컨텍스트 윈도우 고려)
    const maxContentLength = 100000; // 약 100KB
    if (markdown.length > maxContentLength) {
      return NextResponse.json(
        {
          success: false,
          error: `콘텐츠가 너무 깁니다. 최대 ${Math.floor(maxContentLength / 1000)}KB까지 입력 가능합니다.`,
        },
        { status: 400 }
      );
    }

    // 마크다운 전처리
    const processedMarkdown = preprocessMarkdown(markdown);

    // 최소 콘텐츠 확인
    if (processedMarkdown.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error: "슬라이드를 생성하기에 콘텐츠가 부족합니다. 더 많은 내용을 입력해주세요.",
        },
        { status: 400 }
      );
    }

    // 제목이 제공된 경우 마크다운 앞에 추가
    let finalMarkdown = processedMarkdown;
    if (title) {
      // 기존 H1 헤딩이 있는지 확인
      const hasH1 = /^#\s+.+$/m.test(processedMarkdown);
      if (!hasH1) {
        finalMarkdown = `# ${title}\n\n${processedMarkdown}`;
      }
    }

    // 슬라이드 생성 프롬프트 생성
    const messages = createSlideGenerationPrompt({
      content: finalMarkdown,
      source: "markdown",
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
      input: {
        contentLength: markdown.length,
        title: title || slidesData.title,
      },
    });
  } catch (error) {
    console.error("마크다운 슬라이드 생성 오류:", error);

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

    // JSON 파싱 오류 특별 처리
    if (errorMessage.includes("파싱") || errorMessage.includes("JSON")) {
      return NextResponse.json(
        {
          success: false,
          error: "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.",
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
