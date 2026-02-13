import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  successResponse,
  errorResponse,
  requireAuth,
  parsePagination,
  parseSort,
  handlePrismaError,
} from "@/lib/api-utils";

/**
 * GET /api/projects
 *
 * 사용자의 프로젝트 목록 조회
 * 쿼리 파라미터:
 * - page: 페이지 번호 (기본 1)
 * - limit: 페이지당 항목 수 (기본 20, 최대 100)
 * - sort: 정렬 필드 (createdAt, updatedAt, name)
 * - order: 정렬 순서 (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const { searchParams } = new URL(request.url);
    const { page, limit, skip } = parsePagination(searchParams);
    const { orderBy } = parseSort(searchParams, ["createdAt", "updatedAt", "name"], "updatedAt", "desc");

    // 프로젝트 목록 조회
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { userId },
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { slides: true, exports: true },
          },
        },
      }),
      prisma.project.count({ where: { userId } }),
    ]);

    return successResponse({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}

/**
 * POST /api/projects
 *
 * 새 프로젝트 생성
 * 요청 바디:
 * - name: 프로젝트 이름 (필수)
 * - description: 프로젝트 설명 (선택)
 * - isPublic: 공개 여부 (기본 false)
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth();
    if (typeof userId !== "string") return userId;

    const body = await request.json();
    const { name, description, isPublic } = body;

    // 필수 필드 검증
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return errorResponse("프로젝트 이름은 필수입니다.", 400);
    }

    if (name.length > 100) {
      return errorResponse("프로젝트 이름은 100자 이하여야 합니다.", 400);
    }

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPublic: isPublic ?? false,
        userId,
      },
      include: {
        _count: {
          select: { slides: true, exports: true },
        },
      },
    });

    return successResponse(project, 201);
  } catch (error) {
    return handlePrismaError(error);
  }
}
