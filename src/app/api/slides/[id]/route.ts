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

// 유효한 슬라이드 타입
const VALID_SLIDE_TYPES = ["title", "card-grid", "comparison", "timeline", "quote", "table"];

/**
 * GET /api/slides/[id]
 *
 * 특정 슬라이드 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    const slide = await prisma.slide.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            userId: true,
            isPublic: true,
          },
        },
      },
    });

    if (!slide) {
      return errorResponse("슬라이드를 찾을 수 없습니다.", 404);
    }

    // 비공개 프로젝트의 슬라이드는 소유자만 조회 가능
    if (!slide.project.isPublic && slide.project.userId !== userId) {
      return errorResponse("이 슬라이드에 접근할 권한이 없습니다.", 403);
    }

    return successResponse(slide);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/slides/[id]
 *
 * 슬라이드 수정
 * 요청 바디:
 * - type: 슬라이드 타입
 * - content: 슬라이드 내용 JSON
 * - notes: 발표자 노트
 * - order: 슬라이드 순서 (주의: 순서 변경은 reorder API 사용 권장)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    // 슬라이드 소유자 확인
    const isOwner = await verifyOwnership("slide", id, userId);
    if (!isOwner) {
      return errorResponse("이 슬라이드를 수정할 권한이 없습니다.", 403);
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
        return errorResponse("슬라이드 순서는 0 이상의 숫자여야 합니다.", 400);
      }

      // 현재 슬라이드 정보 조회
      const currentSlide = await prisma.slide.findUnique({
        where: { id },
        select: { projectId: true, order: true },
      });

      if (currentSlide && currentSlide.order !== order) {
        // 새 순서가 이미 존재하는지 확인
        const existingSlide = await prisma.slide.findUnique({
          where: {
            projectId_order: {
              projectId: currentSlide.projectId,
              order,
            },
          },
        });

        if (existingSlide) {
          return errorResponse(
            "해당 순서는 이미 사용 중입니다. 슬라이드 순서 변경은 /api/projects/[id]/slides/reorder API를 사용해주세요.",
            409
          );
        }
      }

      updateData.order = order;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("수정할 데이터가 없습니다.", 400);
    }

    const slide = await prisma.slide.update({
      where: { id },
      data: updateData,
    });

    return successResponse(slide);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/slides/[id]
 *
 * 슬라이드 삭제
 * 삭제 후 나머지 슬라이드의 순서를 자동으로 재정렬
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 슬라이드 ID입니다.", 400);
    }

    // 슬라이드 소유자 확인
    const isOwner = await verifyOwnership("slide", id, userId);
    if (!isOwner) {
      return errorResponse("이 슬라이드를 삭제할 권한이 없습니다.", 403);
    }

    // 삭제할 슬라이드 정보 조회
    const slide = await prisma.slide.findUnique({
      where: { id },
      select: { projectId: true, order: true },
    });

    if (!slide) {
      return errorResponse("삭제할 슬라이드를 찾을 수 없습니다.", 404);
    }

    // 트랜잭션으로 삭제 및 순서 재정렬
    await prisma.$transaction([
      // 슬라이드 삭제
      prisma.slide.delete({ where: { id } }),
      // 삭제된 순서 이후의 슬라이드들 순서 앞으로 이동
      prisma.slide.updateMany({
        where: {
          projectId: slide.projectId,
          order: { gt: slide.order },
        },
        data: {
          order: { decrement: 1 },
        },
      }),
    ]);

    return successResponse({ message: "슬라이드가 삭제되었습니다." });
  } catch (error) {
    return handlePrismaError(error);
  }
}
