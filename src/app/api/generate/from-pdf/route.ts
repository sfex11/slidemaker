/**
 * PDF → 슬라이드 생성 API
 * POST /api/generate/from-pdf
 *
 * PDF 파일을 업로드받아 텍스트를 추출하고 AI로 슬라이드를 생성합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { parsePdfBuffer, validatePdfBuffer } from "@/lib/pdf";
import {
  createSlideGenerationPrompt,
  parseGeneratedSlidesResponse,
  type SlideGenerationOptions,
  type GeneratedSlidesResponse,
} from "@/lib/prompts/slide-generation";
import { generateChatCompletion } from "@/lib/glm5";

/**
 * API 응답 타입
 */
interface ApiResponse {
  success: boolean;
  data?: GeneratedSlidesResponse;
  source?: {
    fileName: string;
    title: string;
    pageCount: number;
    contentLength: number;
  };
  error?: string;
}

/**
 * 최대 파일 크기 (20MB)
 */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse>> {
  try {
    // multipart/form-data 파싱
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const optionsRaw = formData.get("options") as string | null;

    // 파일 검증
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF 파일이 필요합니다.",
        },
        { status: 400 }
      );
    }

    // MIME 타입 검증
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        {
          success: false,
          error: "PDF 파일만 업로드할 수 있습니다.",
        },
        { status: 400 }
      );
    }

    // 파일 크기 검증
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `파일이 너무 큽니다. 최대 ${MAX_FILE_SIZE / 1024 / 1024}MB까지 업로드 가능합니다.`,
        },
        { status: 400 }
      );
    }

    // 옵션 파싱
    let options: SlideGenerationOptions = {};
    if (optionsRaw) {
      try {
        options = JSON.parse(optionsRaw);
      } catch {
        // 옵션 파싱 실패 시 기본값 사용
      }
    }

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // PDF 유효성 검사
    const validation = validatePdfBuffer(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        },
        { status: 400 }
      );
    }

    // PDF 파싱
    const parsedPdf = await parsePdfBuffer(buffer);

    if (parsedPdf.error) {
      return NextResponse.json(
        {
          success: false,
          error: parsedPdf.error,
        },
        { status: 400 }
      );
    }

    if (!parsedPdf.markdown.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "PDF에서 텍스트를 추출할 수 없습니다. 이미지 기반 PDF는 아직 지원하지 않습니다.",
        },
        { status: 400 }
      );
    }

    // 콘텐츠 길이 제한 확인
    const maxContentLength = 100000;
    let content = parsedPdf.markdown;
    if (content.length > maxContentLength) {
      content = content.substring(0, maxContentLength);
    }

    // 슬라이드 생성 프롬프트 생성
    const messages = createSlideGenerationPrompt({
      content,
      source: "pdf",
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
      max_tokens: 8192,
    });

    // AI 응답 파싱
    const slidesData = parseGeneratedSlidesResponse(aiResponse);

    // 성공 응답
    return NextResponse.json({
      success: true,
      data: slidesData,
      source: {
        fileName: file.name,
        title: parsedPdf.title,
        pageCount: parsedPdf.pageCount,
        contentLength: parsedPdf.markdown.length,
      },
    });
  } catch (error) {
    console.error("PDF 슬라이드 생성 오류:", error);

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
