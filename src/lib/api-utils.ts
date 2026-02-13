import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API 유틸리티 함수들
 *
 * 일관된 API 응답 형식과 인증 확인을 위한 헬퍼 함수들
 */

// ============================================
// 타입 정의
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  provider?: string;
};

// ============================================
// 응답 헬퍼 함수
// ============================================

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * 에러 응답 생성
 */
export function errorResponse(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

/**
 * 페이지네이션 응답 생성
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================
// 인증 헬퍼 함수
// ============================================

/**
 * 현재 세션의 사용자 확인
 *
 * @returns 사용자 정보 또는 null
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return session.user as SessionUser;
}

/**
 * 인증된 사용자 ID 반환
 *
 * @returns 사용자 ID 또는 인증되지 않은 경우 에러 응답
 */
export async function requireAuth(): Promise<string | NextResponse<ApiResponse>> {
  const user = await getCurrentUser();

  if (!user) {
    return errorResponse("인증이 필요합니다.", 401);
  }

  return user.id;
}

/**
 * 사용자가 리소스 소유자인지 확인
 */
export async function verifyOwnership(
  resourceType: "project" | "slide" | "template",
  resourceId: string,
  userId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case "project": {
        const project = await prisma.project.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return project?.userId === userId;
      }
      case "slide": {
        const slide = await prisma.slide.findUnique({
          where: { id: resourceId },
          select: { project: { select: { userId: true } } },
        });
        return slide?.project.userId === userId;
      }
      case "template": {
        const template = await prisma.template.findUnique({
          where: { id: resourceId },
          select: { authorId: true },
        });
        return template?.authorId === userId;
      }
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// ============================================
// 검증 헬퍼 함수
// ============================================

/**
 * CUID 형식 검증
 */
export function isValidCuid(id: string): boolean {
  return /^c[a-z0-9]{24}$/.test(id);
}

/**
 * 페이지네이션 파라미터 검증 및 정제
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * 정렬 파라미터 검증
 */
export function parseSort(
  searchParams: URLSearchParams,
  allowedFields: string[],
  defaultField = "createdAt",
  defaultOrder: "asc" | "desc" = "desc"
): { orderBy: Record<string, "asc" | "desc"> } {
  const sortField = searchParams.get("sort") || defaultField;
  const sortOrder = (searchParams.get("order") as "asc" | "desc") || defaultOrder;

  if (!allowedFields.includes(sortField)) {
    return { orderBy: { [defaultField]: defaultOrder } };
  }

  return { orderBy: { [sortField]: sortOrder } };
}

// ============================================
// 에러 처리
// ============================================

/**
 * Prisma 에러를 사용자 친화적 메시지로 변환
 */
export function handlePrismaError(error: unknown): NextResponse<ApiResponse> {
  console.error("[Prisma Error]", error);

  if (error instanceof Error) {
    // Unique constraint violation
    if (error.message.includes("Unique constraint")) {
      return errorResponse("이미 존재하는 리소스입니다.", 409);
    }

    // Foreign key constraint
    if (error.message.includes("Foreign key constraint")) {
      return errorResponse("참조하는 리소스가 존재하지 않습니다.", 400);
    }

    // Record not found
    if (error.message.includes("Record to delete does not exist")) {
      return errorResponse("삭제할 리소스를 찾을 수 없습니다.", 404);
    }

    if (error.message.includes("Record to update does not exist")) {
      return errorResponse("수정할 리소스를 찾을 수 없습니다.", 404);
    }
  }

  return errorResponse("서버 오류가 발생했습니다.", 500);
}

/**
 * API 핸들러 래퍼 (에러 처리 자동화)
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiResponse>> {
  return handler().catch((error) => handlePrismaError(error));
}
