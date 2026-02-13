'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeProvider as NextThemesProvider, useTheme as useNextThemes } from 'next-themes';
import { Theme, ThemeVariables, ThemeMode, ThemeContextValue } from '@/types/theme';
import { themes, getThemeById, themeVariablesToCss } from '@/lib/themes';

/**
 * 테마 컨텍스트
 */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * 테마 컨텍스트 훅
 * @returns 테마 컨텍스트 값
 * @throws 훅이 ThemeProvider 외부에서 사용된 경우 에러
 */
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  /** 기본 테마 ID */
  defaultThemeId?: string;
  /** 기본 모드 */
  defaultMode?: ThemeMode;
  /** localStorage에 테마 저장 시 사용할 키 */
  storageKey?: string;
}

/**
 * 테마 프로바이더 컴포넌트
 * next-themes를 래핑하여 슬라이드 테마 시스템 제공
 */
export function ThemeProvider({
  children,
  defaultThemeId = 'default',
  defaultMode = 'system',
  storageKey = 'slide-theme',
}: ThemeProviderProps) {
  // 현재 선택된 테마 ID
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    // 클라이언트 사이드에서 localStorage에서 복원
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${storageKey}-id`) || defaultThemeId;
    }
    return defaultThemeId;
  });

  // next-themes 사용 (라이트/다크 모드 관리)
  const { theme: mode, setTheme: setNextTheme, resolvedTheme } = useNextThemes();

  /**
   * 현재 테마 객체
   */
  const currentTheme: Theme = useMemo(() => {
    return getThemeById(currentThemeId) || themes[0];
  }, [currentThemeId]);

  /**
   * 현재 모드에 맞는 테마 변수
   */
  const themeVariables: ThemeVariables = useMemo(() => {
    const resolvedMode = resolvedTheme as 'light' | 'dark';
    return resolvedMode === 'dark' ? currentTheme.dark : currentTheme.light;
  }, [currentTheme, resolvedTheme]);

  /**
   * 테마 변경 함수
   */
  const setTheme = useCallback((themeId: string) => {
    const theme = getThemeById(themeId);
    if (theme) {
      setCurrentThemeId(themeId);
      localStorage.setItem(`${storageKey}-id`, themeId);
    }
  }, [storageKey]);

  /**
   * 모드 변경 함수
   */
  const setMode = useCallback((newMode: ThemeMode) => {
    setNextTheme(newMode);
  }, [setNextTheme]);

  // 테마 ID를 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(`${storageKey}-id`, currentThemeId);
  }, [currentThemeId, storageKey]);

  // CSS 변수를 루트 요소에 적용
  useEffect(() => {
    const root = document.documentElement;
    const cssVariables = themeVariablesToCss(themeVariables);

    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [themeVariables]);

  const contextValue: ThemeContextValue = useMemo(
    () => ({
      currentTheme,
      mode: (mode as ThemeMode) || defaultMode,
      resolvedMode: (resolvedTheme as 'light' | 'dark') || 'light',
      themeVariables,
      setTheme,
      setMode,
      availableThemes: themes,
    }),
    [currentTheme, mode, resolvedTheme, themeVariables, defaultMode, setTheme, setMode]
  );

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultMode}
      storageKey={`${storageKey}-mode`}
      enableSystem
    >
      <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>
    </NextThemesProvider>
  );
}
