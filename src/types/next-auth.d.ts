import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT, DefaultJWT } from "next-auth/jwt";

/**
 * NextAuth.js 타입 확장
 *
 * 세션과 토큰에 추가 필드를 정의합니다.
 */

// 사용자 타입 확장
declare module "next-auth" {
  interface User extends DefaultUser {
    /** 사용자 고유 ID */
    id?: string;
    /** OAuth 프로바이더 */
    provider?: string;
  }

  interface Session extends DefaultSession {
    user: {
      /** 사용자 고유 ID */
      id: string;
      /** OAuth 프로바이더 */
      provider?: string;
    } & DefaultSession["user"];
  }
}

// JWT 토큰 타입 확장
declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    /** 사용자 고유 ID */
    id?: string;
    /** OAuth 프로바이더 */
    provider?: string;
  }
}
