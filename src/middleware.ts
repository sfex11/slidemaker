import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * 인증 미들웨어
 *
 * 보호된 라우트:
 * - / (루트) - 대시보드
 * - /dashboard/* - 대시보드
 * - /projects/* - 프로젝트 관리
 * - /settings/* - 사용자 설정
 * - /api/protected/* - 보호된 API
 * - /create - 슬라이드 생성
 * - /preview - 슬라이드 미리보기
 */

// 보호된 경로 패턴
const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/settings",
  "/api/protected",
  "/create",
  "/preview",
];

// 인증 없이 접근 가능한 경로
const publicRoutes = [
  "/login",
  "/signup",
  "/auth/error",
  "/api/auth",
];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // 루트 경로도 보호 (대시보드)
  const isRootPath = nextUrl.pathname === "/";

  // 현재 경로가 보호된 경로인지 확인
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // 현재 경로가 공개 경로인지 확인
  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(route)
  );

  // 정적 리소스는 무시
  if (
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname.startsWith("/favicon") ||
    nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 보호된 경로에 로그인 없이 접근 시 로그인 페이지로 리다이렉트
  if ((isProtectedRoute || isRootPath) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin);
    // 로그인 후 원래 페이지로 돌아가기 위해 callbackUrl 저장
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 로그인 상태에서 로그인/회원가입 페이지 접근 시 대시보드로 리다이렉트
  if (
    isLoggedIn &&
    (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")
  ) {
    const dashboardUrl = new URL("/dashboard", nextUrl.origin);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
});

// 미들웨어가 실행될 경로 설정
export const config = {
  matcher: [
    /*
     * 다음 경로를 제외한 모든 경로에서 실행:
     * - _next/static (정적 파일)
     * - _next/image (이미지 최적화)
     * - favicon.ico (파비콘)
     * - 공개 폴더의 정적 파일
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
