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
 * GET /api/projects/[id]/slides
 *
 * 프로젝트의 슬라이드 목록 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { id: projectId } = await params;

    if (!isValidCuid(projectId)) {
      return errorResponse("유효하지 않은 프로젝트 ID입니다.", 400);
    }

    // 프로젝트 존재 및 권한 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true, isPublic: true },
    });

    if (!project) {
      return errorResponse("프로젝트를 찾을 수 없습니다.", 404);
    }

    // 비공개 프로젝트는 소유자만 접근 가능
    if (!project.isPublic && project.userId !== userId) {
      return errorResponse("이 프로젝트에 접근할 권한이 없습니다.", 403);
    }

    // 슬라이드 목록 조회
    const slides = await prisma.slide.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
    });

    return successResponse(slides);
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * POST /api/projects/[id]/slides
 *
 * 새 슬라이드 생성
 * 요청 바디:
 * - type: 슬라이드 타입 (필수)
 * - content: 슬라이드 내용 JSON (필수)
 * - notes: 발표자 노트 (선택)
 * - order: 슬라이드 순서 (선택, 지정하지 않으면 마지막 순서)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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
      return errorResponse("이 프로젝트에 슬라이드를 추가할 권한이 없습니다.", 403);
    }

    const body = await request.json();
    const { type, content, notes, order } = body;

    // 필수 필드 검증
    if (!type || !VALID_SLIDE_TYPES.includes(type)) {
      return errorResponse(
        `유효한 슬라이드 타입을 지정해주세요. 허용된 타입: ${VALID_SLIDE_TYPES.join(", ")}`,
        400
      );
    }

    if (!content || typeof content !== "object") {
      return errorResponse("슬라이드 내용(content)은 필수이며 JSON 객체여야 합니다.", 400);
    }

    // 슬라이드 순서 결정
    let slideOrder = order;
    if (slideOrder === undefined) {
      // 마지막 순서 + 1
      const lastSlide = await prisma.slide.findFirst({
        where: { projectId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      slideOrder = (lastSlide?.order ?? -1) + 1;
    }

    // 순서 중복 체크
    const existingSlide = await prisma.slide.findUnique({
      where: {
        projectId_order: {
          projectId,
          order: slideOrder,
        },
      },
    });

    if (existingSlide) {
      // 해당 순서 이후의 슬라이드들을 한 칸씩 뒤로 이동
      await prisma.slide.updateMany({
        where: {
          projectId,
          order: { gte: slideOrder },
        },
        data: {
          order: { increment: 1 },
        },
      });
    }

    // 슬라이드 생성
    const slide = await prisma.slide.create({
      data: {
        type,
        content,
        notes: notes?.trim() || null,
        order: slideOrder,
        projectId,
      },
    });

    return successResponse(slide, 201);
  } catch (error) {
    return handlePrismaError(error);
  }
}
