import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  verifyOwnership,
  handlePrismaError,
  isValidCuid,
} from "@/lib/api-utils";
import {
  generateSlideDeckHtml,
  generatePdfFromHtml,
  generateExportUrl,
} from "@/lib/export-utils";
import { v4 as uuidv4 } from "uuid";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// 지원하는 내보내기 포맷
const SUPPORTED_FORMATS = ["html", "pdf"] as const;
type ExportFormat = (typeof SUPPORTED_FORMATS)[number];

/**
 * POST /api/projects/[id]/export
 *
 * 프로젝트 슬라이드 내보내기
 * 요청 바디:
 * - format: 내보내기 포맷 (html, pdf)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    // 소유자 확인
    const isOwner = await verifyOwnership("project", id, userId);
    if (!isOwner) {
      return errorResponse("이 프로젝트를 내보낼 권한이 없습니다.", 403);
    }

    // 요청 바디 파싱
    const body = await request.json();
    const { format = "html" } = body;

    // 포맷 검증
    if (!SUPPORTED_FORMATS.includes(format as ExportFormat)) {
      return errorResponse(
        `지원하지 않는 포맷입니다. 지원 포맷: ${SUPPORTED_FORMATS.join(", ")}`,
        400
      );
    }

    // 프로젝트와 슬라이드 조회
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!project) {
      return errorResponse("프로젝트를 찾을 수 없습니다.", 404);
    }

    if (project.slides.length === 0) {
      return errorResponse("내보낼 슬라이드가 없습니다.", 400);
    }

    // 내보내기 레코드 생성 (processing 상태)
    const exportId = uuidv4();
    const exportRecord = await prisma.export.create({
      data: {
        id: exportId,
        format: format as string,
        url: "", // 처리 완료 후 업데이트
        status: "processing",
        projectId: id,
      },
    });

    try {
      // 슬라이드 데이터 변환
      const slidesData = project.slides.map((slide) => ({
        id: slide.id,
        type: slide.type as "title" | "card-grid" | "comparison" | "timeline" | "quote" | "table",
        content: slide.content as Record<string, unknown>,
        order: slide.order,
      }));

      // HTML 생성
      const html = generateSlideDeckHtml(slidesData, project.name);

      let downloadUrl: string;
      let fileContent: string | Buffer;

      if (format === "html") {
        // HTML 내보내기
        fileContent = html;
        // 실제 운영에서는 파일을 S3/CDN에 저장
        // 개발 단계에서는 메모리에 저장하고 API로 서빙
        downloadUrl = generateExportUrl(exportId, "html");

        // 파일 저장 (개발용 - 실제로는 S3 업로드)
        // 여기서는 간단히 URL만 반환
      } else if (format === "pdf") {
        // PDF 내보내기
        fileContent = await generatePdfFromHtml(html);
        downloadUrl = generateExportUrl(exportId, "pdf");
      } else {
        throw new Error(`지원하지 않는 포맷: ${format}`);
      }

      // 내보내기 레코드 업데이트 (completed 상태)
      const updatedExport = await prisma.export.update({
        where: { id: exportId },
        data: {
          url: downloadUrl,
          status: "completed",
        },
      });

      // 파일 콘텐츠를 임시 저장 (실제 운영에서는 S3 사용)
      // 개발용: 전역 캐시에 저장
      globalThis.__exportCache = globalThis.__exportCache || new Map();
      globalThis.__exportCache.set(exportId, {
        content: fileContent,
        format,
        createdAt: Date.now(),
      });

      return successResponse({
        export: updatedExport,
        downloadUrl,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24시간 유효
      });
    } catch (exportError) {
      // 내보내기 실패 시 상태 업데이트
      await prisma.export.update({
        where: { id: exportId },
        data: {
          status: "failed",
          url: "",
        },
      });

      console.error("[Export Error]", exportError);
      return errorResponse(
        exportError instanceof Error
          ? exportError.message
          : "내보내기 중 오류가 발생했습니다.",
        500
      );
    }
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * GET /api/projects/[id]/export
 *
 * 프로젝트의 내보내기 기록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    // 소유자 확인
    const isOwner = await verifyOwnership("project", id, userId);
    if (!isOwner) {
      return errorResponse("이 프로젝트의 내보내기 기록을 조회할 권한이 없습니다.", 403);
    }

    // 내보내기 기록 조회 (최신순)
    const exports = await prisma.export.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return successResponse({
      exports,
      total: exports.length,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
