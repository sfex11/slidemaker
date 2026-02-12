"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import { ReactNode } from "react";

/**
 * NextAuth 세션 프로바이더
 *
 * 애플리케이션 최상위에서 감싸서 사용:
 * ```tsx
 * <SessionProvider>
 *   <App />
 * </SessionProvider>
 * ```
 */

interface SessionProviderProps {
  children: ReactNode;
  /** 초기 세션 데이터 (SSR에서 사용) */
  session?: Session | null;
  /** 세션 리프레시 간격 (초) */
  refetchInterval?: number;
  /** 윈도우 포커스 시 세션 리프레시 여부 */
  refetchOnWindowFocus?: boolean;
}

export function SessionProvider({
  children,
  session,
  refetchInterval = 5 * 60, // 기본 5분마다 리프레시
  refetchOnWindowFocus = true,
}: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      session={session}
      refetchInterval={refetchInterval}
      refetchOnWindowFocus={refetchOnWindowFocus}
    >
      {children}
    </NextAuthSessionProvider>
  );
}

export default SessionProvider;
