import { handlers } from "@/lib/auth";

/**
 * NextAuth.js API 라우트
 *
 * 모든 인증 요청을 처리:
 * - GET /api/auth/signin - 로그인 페이지
 * - GET /api/auth/signout - 로그아웃 페이지
 * - GET /api/auth/callback/:provider - OAuth 콜백
 * - GET /api/auth/session - 세션 조회
 * - POST /api/auth/signin/:provider - OAuth 로그인 시작
 * - POST /api/auth/signout - 로그아웃 실행
 */

export const { GET, POST } = handlers;
