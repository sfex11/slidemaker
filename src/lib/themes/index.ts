import { Theme, ThemeVariables } from '@/types/theme';
import { defaultTheme } from './default';
import { oceanTheme } from './ocean';
import { forestTheme } from './forest';

/**
 * 사용 가능한 모든 테마 목록
 */
export const themes: Theme[] = [defaultTheme, oceanTheme, forestTheme];

/**
 * 기본 테마
 */
export const defaultThemeExport = defaultTheme;

/**
 * 테마 ID로 테마 찾기
 * @param themeId - 찾을 테마 ID
 * @returns 테마 객체 또는 undefined
 */
export function getThemeById(themeId: string): Theme | undefined {
  return themes.find((theme) => theme.id === themeId);
}

/**
 * 테마 변수를 CSS 변수 문자열로 변환
 * @param variables - 테마 변수 객체
 * @returns CSS 변수가 포함된 스타일 객체
 */
export function themeVariablesToCss(variables: ThemeVariables): Record<string, string> {
  return {
    '--slide-bg': variables.bg,
    '--slide-surface': variables.surface,
    '--slide-surface2': variables.surface2,
    '--slide-border': variables.border,
    '--slide-text': variables.text,
    '--slide-text-dim': variables.textDim,
    '--slide-accent': variables.accent,
    '--slide-accent2': variables.accent2,
    '--slide-green': variables.green,
    '--slide-green-dim': variables.greenDim,
    '--slide-orange': variables.orange,
    '--slide-teal': variables.teal,
    '--slide-pink': variables.pink,
  };
}

/**
 * CSS 변수로부터 테마 변수 객체 생성
 * computedStyle에서 CSS 변수 값을 읽어올 때 사용
 * @param element - CSS 변수를 읽을 DOM 요소
 * @returns 테마 변수 객체
 */
export function cssToThemeVariables(element: HTMLElement): ThemeVariables {
  const style = getComputedStyle(element);
  return {
    bg: style.getPropertyValue('--slide-bg').trim(),
    surface: style.getPropertyValue('--slide-surface').trim(),
    surface2: style.getPropertyValue('--slide-surface2').trim(),
    border: style.getPropertyValue('--slide-border').trim(),
    text: style.getPropertyValue('--slide-text').trim(),
    textDim: style.getPropertyValue('--slide-text-dim').trim(),
    accent: style.getPropertyValue('--slide-accent').trim(),
    accent2: style.getPropertyValue('--slide-accent2').trim(),
    green: style.getPropertyValue('--slide-green').trim(),
    greenDim: style.getPropertyValue('--slide-green-dim').trim(),
    orange: style.getPropertyValue('--slide-orange').trim(),
    teal: style.getPropertyValue('--slide-teal').trim(),
    pink: style.getPropertyValue('--slide-pink').trim(),
  };
}

export { defaultTheme, oceanTheme, forestTheme };
