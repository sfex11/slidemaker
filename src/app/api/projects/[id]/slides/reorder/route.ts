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

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/projects/[id]/slides/reorder
 *
 * 슬라이드 순서 일괄 변경
 * 요청 바디:
 * - slides: [{ id: string, order: number }, ...]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id: projectId } = await params;

    if (!isValidCuid(projectId)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    // 프로젝트 소유자 확인
    const isOwner = await verifyOwnership("project", projectId, userId);
    if (!isOwner) {
      return errorResponse("이 프로젝트의 슬라이드 순서를 변경할 권한이 없습니다.", 403);
    }

    const body = await request.json();
    const { slides } = body;

    // 요청 데이터 검증
    if (!Array.isArray(slides) || slides.length === 0) {
      return errorResponse("슬라이드 목록은 비어있을 수 없습니다.", 400);
    }

    // 각 슬라이드 항목 검증
    for (const slide of slides) {
      if (!slide.id || typeof slide.id !== "string") {
        return errorResponse("각 슬라이드 항목에는 id가 필요합니다.", 400);
      }
      if (typeof slide.order !== "number" || slide.order < 0) {
        return errorResponse("각 슬라이드 항목에는 유효한 order 값이 필요합니다.", 400);
      }
    }

    // 중복 order 확인
    const orders = slides.map((s) => s.order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      return errorResponse("슬라이드 순서에 중복이 있습니다.", 400);
    }

    // 프로젝트의 모든 슬라이드 ID 조회
    const existingSlides = await prisma.slide.findMany({
      where: { projectId },
      select: { id: true },
    });
    const existingIds = new Set(existingSlides.map((s) => s.id));

    // 요청된 모든 슬라이드가 해당 프로젝트에 속하는지 확인
    for (const slide of slides) {
      if (!existingIds.has(slide.id)) {
        return errorResponse(`슬라이드 ${slide.id}는 이 프로젝트에 속하지 않습니다.`, 400);
      }
    }

    // 트랜잭션으로 순서 일괄 업데이트
    await prisma.$transaction(
      slides.map((slide) =>
        prisma.slide.update({
          where: { id: slide.id },
          data: { order: slide.order },
        })
      )
    );

    // 업데이트된 슬라이드 목록 반환
    const updatedSlides = await prisma.slide.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return successResponse(updatedSlides);
  } catch (error) {
    return handlePrismaError(error);
  }
}
