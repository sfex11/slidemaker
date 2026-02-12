/**
 * 슬라이드 테마 시스템 타입 정의
 * CSS 변수 기반 템플릿 시스템에서 사용하는 타입들
 */

/**
 * 테마 변수 인터페이스
 * 13개의 CSS 변수로 구성된 색상 시스템
 */
export interface ThemeVariables {
  /** 기본 배경색 */
  bg: string;
  /** 표면 색상 (카드, 패널 등) */
  surface: string;
  /** 2차 표면 색상 (중첩된 요소) */
  surface2: string;
  /** 테두리 색상 */
  border: string;
  /** 기본 텍스트 색상 */
  text: string;
  /** 흐린 텍스트 색상 (설명, 메타 정보) */
  textDim: string;
  /** 강조 색상 (주요 액션) */
  accent: string;
  /** 2차 강조 색상 */
  accent2: string;
  /** 녹색 (성공, 긍정) */
  green: string;
  /** 흐린 녹색 (배경용) */
  greenDim: string;
  /** 주황색 (경고, 주의) */
  orange: string;
  /** 청록색 (정보) */
  teal: string;
  /** 분홍색 (특별 강조) */
  pink: string;
}

/**
 * 테마 인터페이스
 * 라이트/다크 모드를 모두 지원하는 테마 정의
 */
export interface Theme {
  /** 테마 이름 (표시용) */
  name: string;
  /** 테마 ID (고유 식별자) */
  id: string;
  /** 라이트 모드 변수 */
  light: ThemeVariables;
  /** 다크 모드 변수 */
  dark: ThemeVariables;
}

/**
 * 테마 모드 타입
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 테마 컨텍스트 값 인터페이스
 */
export interface ThemeContextValue {
  /** 현재 활성화된 테마 */
  currentTheme: Theme;
  /** 현재 모드 ('light' | 'dark' | 'system') */
  mode: ThemeMode;
  /** 실제 적용된 모드 (system인 경우 해석된 값) */
  resolvedMode: 'light' | 'dark';
  /** 현재 모드에 맞는 테마 변수 */
  themeVariables: ThemeVariables;
  /** 테마 변경 함수 */
  setTheme: (themeId: string) => void;
  /** 모드 변경 함수 */
  setMode: (mode: ThemeMode) => void;
  /** 사용 가능한 모든 테마 목록 */
  availableThemes: Theme[];
}
