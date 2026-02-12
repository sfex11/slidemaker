"use client";

import { useSession as useNextAuthSession } from "next-auth/react";
import { signIn, signOut } from "next-auth/react";
import type { SignInOptions, SignOutParams } from "next-auth/react";

/**
 * useSession 훅 래퍼
 *
 * 세션 상태와 인증 액션을 제공하는 커스텀 훅
 */

interface UseAuthReturn {
  // 세션 상태
  /** 현재 세션 데이터 */
  session: ReturnType<typeof useNextAuthSession>["data"];
  /** 로딩 상태 */
  isLoading: boolean;
  /** 인증 여부 */
  isAuthenticated: boolean;
  /** 로그인한 사용자 정보 */
  user: NonNullable<ReturnType<typeof useNextAuthSession>["data"]>["user"] | undefined;

  // 액션
  /** 소셜 로그인 */
  login: (provider?: string, options?: SignInOptions) => Promise<void>;
  /** 로그아웃 */
  logout: (params?: SignOutParams) => Promise<void>;
  /** 세션 갱신 */
  refresh: () => void;
}

/**
 * 인증 상태와 액션을 제공하는 훅
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, login, logout } = useAuth();
 *
 * if (isAuthenticated) {
 *   return <div>안녕하세요, {user?.name}님!</div>;
 * }
 *
 * return <button onClick={() => login("google")}>Google로 로그인</button>;
 * ```
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status, update } = useNextAuthSession();

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  /**
   * 소셜 로그인
   * @param provider - 프로바이더 이름 (google, github)
   * @param options - 로그인 옵션
   */
  const login = async (
    provider?: string,
    options?: SignInOptions
  ): Promise<void> => {
    if (provider) {
      await signIn(provider, options);
    } else {
      // 프로바이더 없으면 기본 로그인 페이지로 이동
      await signIn(undefined, options);
    }
  };

  /**
   * 로그아웃
   * @param params - 로그아웃 파라미터
   */
  const logout = async (params?: SignOutParams): Promise<void> => {
    await signOut(params);
  };

  /**
   * 세션 갱신
   */
  const refresh = (): void => {
    update();
  };

  return {
    session,
    isLoading,
    isAuthenticated,
    user: session?.user,
    login,
    logout,
    refresh,
  };
}

export default useAuth;
