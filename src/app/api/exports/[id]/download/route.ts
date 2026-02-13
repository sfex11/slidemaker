import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, isValidCuid } from "@/lib/api-utils";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/exports/[id]/download
 *
 * 내보내기 파일 다운로드
 * 쿼리 파라미터:
 * - format: 내보내기 포맷 (html, pdf)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 내보내기 ID입니다.", 400);
    }

    // 내보내기 기록 조회
    const exportRecord = await prisma.export.findUnique({
      where: { id },
    });

    if (!exportRecord) {
      return errorResponse("내보내기 기록을 찾을 수 없습니다.", 404);
    }

    if (exportRecord.status !== "completed") {
      return errorResponse(
        exportRecord.status === "processing"
          ? "내보내기가 아직 처리 중입니다."
          : "내보내기에 실패했습니다.",
        400
      );
    }

    // 캐시에서 파일 콘텐츠 가져오기
    const cache = globalThis.__exportCache as Map<string, { content: string | Buffer; format: string; createdAt: number }> | undefined;
    const cachedData = cache?.get(id);

    if (!cachedData) {
      return errorResponse("파일이 만료되었습니다. 다시 내보내기를 요청해주세요.", 410);
    }

    // 파일 만료 확인 (24시간)
    const isExpired = Date.now() - cachedData.createdAt > 24 * 60 * 60 * 1000;
    if (isExpired) {
      cache?.delete(id);
      return errorResponse("파일이 만료되었습니다. 다시 내보내기를 요청해주세요.", 410);
    }

    const { content, format } = cachedData;

    // Content-Type 및 파일명 설정
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case "html":
        contentType = "text/html; charset=utf-8";
        fileExtension = "html";
        break;
      case "pdf":
        contentType = "application/pdf";
        fileExtension = "pdf";
        break;
      default:
        return errorResponse("지원하지 않는 파일 형식입니다.", 400);
    }

    // 파일명 생성 (프로젝트명_날짜)
    const fileName = `slides_${new Date().toISOString().split("T")[0]}.${fileExtension}`;

    // 응답 헤더 설정
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    headers.set("Cache-Control", "private, max-age=3600"); // 1시간 캐시

    // 파일 반환
    if (Buffer.isBuffer(content)) {
      return new NextResponse(new Uint8Array(content), {
        status: 200,
        headers,
      });
    } else {
      return new NextResponse(content as string, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error("[Download Error]", error);
    return errorResponse("파일 다운로드 중 오류가 발생했습니다.", 500);
  }
}
