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
 * GET /api/projects/[id]
 *
 * 특정 프로젝트 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id } = await params;

    if (!isValidCuid(id)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        slides: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            type: true,
            content: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        _count: {
          select: { slides: true, exports: true },
        },
      },
    });

    if (!project) {
      return errorResponse("프로젝트를 찾을 수 없습니다.", 404);
    }

    // 비공개 프로젝트는 소유자만 조회 가능
    if (!project.isPublic && project.userId !== userId) {
      return errorResponse("이 프로젝트에 접근할 권한이 없습니다.", 403);
    }

    return successResponse(project);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * PUT /api/projects/[id]
 *
 * 프로젝트 정보 수정
 * 요청 바디:
 * - name: 프로젝트 이름
 * - description: 프로젝트 설명
 * - isPublic: 공개 여부
 * - thumbnail: 썸네일 이미지 URL
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
      return errorResponse("이 프로젝트를 수정할 권한이 없습니다.", 403);
    }

    const body = await request.json();
    const { name, description, isPublic, thumbnail } = body;

    // 업데이트할 데이터 구성
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return errorResponse("프로젝트 이름은 비워둘 수 없습니다.", 400);
      }
      if (name.length > 100) {
        return errorResponse("프로젝트 이름은 100자 이하여야 합니다.", 400);
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (isPublic !== undefined) {
      updateData.isPublic = Boolean(isPublic);
    }

    if (thumbnail !== undefined) {
      updateData.thumbnail = thumbnail?.trim() || null;
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse("수정할 데이터가 없습니다.", 400);
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { slides: true, exports: true },
        },
      },
    });

    return successResponse(project);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * DELETE /api/projects/[id]
 *
 * 프로젝트 삭제 (연관된 슬라이드, 내보내기 기록도 함께 삭제됨)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
      return errorResponse("이 프로젝트를 삭제할 권한이 없습니다.", 403);
    }

    // 프로젝트 삭제 (cascade로 슬라이드, exports도 함께 삭제됨)
    await prisma.project.delete({
      where: { id },
    });

    return successResponse({ message: "프로젝트가 삭제되었습니다." });
  } catch (error) {
    return handlePrismaError(error);
  }
}
