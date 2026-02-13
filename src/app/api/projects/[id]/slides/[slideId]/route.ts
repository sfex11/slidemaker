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
  params: Promise<{ id: string; slideId: string }>;
}

// 유효한 슬라이드 타입
const VALID_SLIDE_TYPES = ["title", "card-grid", "comparison", "timeline", "quote", "table"];

/**
 * GET /api/projects/[id]/slides/[slideId]
 *
 * 특정 슬라이드 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id: projectId, slideId } = await params;

    if (!isValidCuid(projectId)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    if (!isValidCuid(slideId)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    // 슬라이드 조회
    const slide = await prisma.slide.findUnique({
      where: { id: slideId },
      include: { project: { select: { userId: true, isPublic: true } } },
    });

    if (!slide) {
      return errorResponse("슬라이드를 찾을 수 없습니다.", 404);
    }

    // 프로젝트 ID 일치 확인
    if (slide.projectId !== projectId) {
      return errorResponse("슬라이드가 해당 프로젝트에 속하지 않습니다.", 400);
    }

    // 비공개 프로젝트는 소유자만 조회 가능
    if (!slide.project.isPublic && slide.project.userId !== userId) {
      return errorResponse("이 슬라이드에 접근할 권한이 없습니다.", 403);
    }

    return successResponse(slide);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/projects/[id]/slides/[slideId]
 *
 * 슬라이드 수정
 * 요청 바디:
 * - type: 슬라이드 타입 (선택)
 * - content: 슬라이드 내용 JSON (선택)
 * - notes: 발표자 노트 (선택)
 * - order: 슬라이드 순서 (선택)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id: projectId, slideId } = await params;

    if (!isValidCuid(projectId)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    if (!isValidCuid(slideId)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    // 프로젝트 소유자 확인
    const isOwner = await verifyOwnership("project", projectId, userId);
    if (!isOwner) {
      return errorResponse("이 슬라이드를 수정할 권한이 없습니다.", 403);
    }

    // 슬라이드 존재 확인
    const existingSlide = await prisma.slide.findUnique({
      where: { id: slideId },
    });

    if (!existingSlide) {
      return errorResponse("슬라이드를 찾을 수 없습니다.", 404);
    }

    if (existingSlide.projectId !== projectId) {
      return errorResponse("슬라이드가 해당 프로젝트에 속하지 않습니다.", 400);
    }

    const body = await request.json();
    const { type, content, notes, order } = body;

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (type !== undefined) {
      if (!VALID_SLIDE_TYPES.includes(type)) {
        return errorResponse(
          `유효한 슬라이드 타입을 지정해주세요. 허용된 타입: ${VALID_SLIDE_TYPES.join(", ")}`,
          400
        );
      }
      updateData.type = type;
    }

    if (content !== undefined) {
      if (typeof content !== "object") {
        return errorResponse("슬라이드 내용(content)은 JSON 객체여야 합니다.", 400);
      }
      updateData.content = content;
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null;
    }

    if (order !== undefined) {
      if (typeof order !== "number" || order < 0) {
        return errorResponse("순서(order)는 0 이상의 숫자여야 합니다.", 400);
      }
      updateData.order = order;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("수정할 데이터가 없습니다.", 400);
    }

    // 슬라이드 업데이트
    const slide = await prisma.slide.update({
      where: { id: slideId },
      data: updateData,
    });

    return successResponse(slide);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/projects/[id]/slides/[slideId]
 *
 * 슬라이드 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id: projectId, slideId } = await params;

    if (!isValidCuid(projectId)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    if (!isValidCuid(slideId)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    // 프로젝트 소유자 확인
    const isOwner = await verifyOwnership("project", projectId, userId);
    if (!isOwner) {
      return errorResponse("이 슬라이드를 삭제할 권한이 없습니다.", 403);
    }

    // 슬라이드 존재 확인
    const existingSlide = await prisma.slide.findUnique({
      where: { id: slideId },
    });

    if (!existingSlide) {
      return errorResponse("슬라이드를 찾을 수 없습니다.", 404);
    }

    if (existingSlide.projectId !== projectId) {
      return errorResponse("슬라이드가 해당 프로젝트에 속하지 않습니다.", 400);
    }

    // 슬라이드 삭제
    await prisma.slide.delete({
      where: { id: slideId },
    });

    // 삭제된 슬라이드 이후의 슬라이드 순서 재정렬
    await prisma.slide.updateMany({
      where: {
        projectId,
        order: { gt: existingSlide.order },
      },
      data: {
        order: { decrement: 1 },
      },
    });

    return successResponse({ message: "슬라이드가 삭제되었습니다." });
  } catch (error) {
    return handlePrismaError(error);
  }
}
