import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

/**
 * NextAuth.js v5 인증 설정
 *
 * 지원 프로바이더:
 * - Google OAuth
 * - GitHub OAuth
 *
 * PrismaAdapter 활성화됨 - 데이터베이스에 세션 및 계정 정보 저장
 */

export const { handlers, signIn, signOut, auth } = NextAuth({
  // 어댑터 설정 - Prisma 사용
  adapter: PrismaAdapter(prisma),

  // 프로바이더 설정
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],

  // 세션 전략 설정
  // PrismaAdapter 사용 시에도 JWT 전략 사용 (성능상 권장)
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
  },

  // 페이지 설정
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },

  // 콜백 함수
  callbacks: {
    // JWT 토큰 생성 시 호출
    async jwt({ token, user, account, trigger, session }) {
      // 초기 로그인 시 사용자 정보를 토큰에 추가
      if (user) {
        token.id = user.id;
        token.provider = account?.provider;
      }
      // 세션 업데이트 시 (예: 사용자가 이름 변경)
      if (trigger === "update" && session) {
        token.name = session.name;
        token.email = session.email;
      }
      return token;
    },

    // 세션 조회 시 호출
    async session({ session, token }) {
      // 토큰의 사용자 정보를 세션에 추가
      if (session.user) {
        session.user.id = token.id as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },

    // 로그인 성공 여부 결정
    async signIn() {
      // 특정 도메인만 허용 등의 추가 검증 로직
      // 예: if (account?.provider === "google" && profile?.email?.endsWith("@company.com")) {
      //   return true;
      // }
      return true;
    },
  },

  // 이벤트 로깅
  events: {
    async signIn(message) {
      console.log("[Auth] 로그인 성공:", message.user?.email);
    },
    async signOut(message) {
      // JWT 세션 사용 시 token 속성 확인
      if ("token" in message && message.token) {
        console.log("[Auth] 로그아웃:", message.token.email);
      }
    },
    async createUser(message) {
      console.log("[Auth] 신규 사용자 생성:", message.user?.email);
      // 신규 사용자 생성 시 무료 구독 자동 생성
      if (message.user.id) {
        try {
          await prisma.subscription.create({
            data: {
              userId: message.user.id,
              plan: "free",
              status: "active",
            },
          });
          console.log("[Auth] 무료 구독 생성 완료:", message.user.email);
        } catch (error) {
          console.error("[Auth] 구독 생성 실패:", error);
        }
      }
    },
  },

  // 디버그 모드 (개발 환경에서만 활성화)
  debug: process.env.NODE_ENV === "development",
});
