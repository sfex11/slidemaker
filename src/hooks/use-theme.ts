'use client';

import { useThemeContext } from '@/components/providers/theme-provider';
import { ThemeVariables, ThemeMode, Theme } from '@/types/theme';

/**
 * 테마 사용 훅 반환 타입
 */
interface UseThemeReturn {
  /** 현재 활성화된 테마 */
  theme: Theme;
  /** 현재 모드 ('light' | 'dark' | 'system') */
  mode: ThemeMode;
  /** 실제 적용된 모드 (system인 경우 해석된 값) */
  resolvedMode: 'light' | 'dark';
  /** 현재 모드에 맞는 테마 변수 */
  variables: ThemeVariables;
  /** 테마 변경 함수 */
  setTheme: (themeId: string) => void;
  /** 모드 변경 함수 */
  setMode: (mode: ThemeMode) => void;
  /** 라이트 모드 여부 */
  isLight: boolean;
  /** 다크 모드 여부 */
  isDark: boolean;
  /** 사용 가능한 모든 테마 목록 */
  availableThemes: Theme[];
  /** 특정 색상 변수 값 가져오기 */
  getColor: (key: keyof ThemeVariables) => string;
}

/**
 * 테마 시스템을 사용하기 위한 커스텀 훅
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { variables, isDark, setMode, setTheme, availableThemes } = useTheme();
 *
 *   return (
 *     <div style={{ backgroundColor: variables.bg, color: variables.text }}>
 *       <p>현재 모드: {isDark ? '다크' : '라이트'}</p>
 *       <button onClick={() => setMode(isDark ? 'light' : 'dark')}>
 *         모드 전환
 *       </button>
 *       <select onChange={(e) => setTheme(e.target.value)}>
 *         {availableThemes.map(t => (
 *           <option key={t.id} value={t.id}>{t.name}</option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTheme(): UseThemeReturn {
  const context = useThemeContext();

  const isLight = context.resolvedMode === 'light';
  const isDark = context.resolvedMode === 'dark';

  /**
   * 특정 색상 변수 값 가져오기
   */
  const getColor = (key: keyof ThemeVariables): string => {
    return context.themeVariables[key];
  };

  return {
    theme: context.currentTheme,
    mode: context.mode,
    resolvedMode: context.resolvedMode,
    variables: context.themeVariables,
    setTheme: context.setTheme,
    setMode: context.setMode,
    isLight,
    isDark,
    availableThemes: context.availableThemes,
    getColor,
  };
}

export default useTheme;
