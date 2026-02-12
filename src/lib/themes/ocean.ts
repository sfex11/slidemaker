import { Theme } from '@/types/theme';

/**
 * Ocean 테마
 * 차분하고 전문적인 파란색 계열 테마
 */
export const oceanTheme: Theme = {
  name: 'Ocean',
  id: 'ocean',
  light: {
    bg: '#f0f9ff',
    surface: '#e0f2fe',
    surface2: '#bae6fd',
    border: '#7dd3fc',
    text: '#0c4a6e',
    textDim: '#0369a1',
    accent: '#0284c7',
    accent2: '#0ea5e9',
    green: '#059669',
    greenDim: '#d1fae5',
    orange: '#d97706',
    teal: '#0891b2',
    pink: '#db2777',
  },
  dark: {
    bg: '#0c1929',
    surface: '#0f2942',
    surface2: '#164e63',
    border: '#155e75',
    text: '#f0f9ff',
    textDim: '#7dd3fc',
    accent: '#38bdf8',
    accent2: '#22d3ee',
    green: '#34d399',
    greenDim: '#064e3b',
    orange: '#fbbf24',
    teal: '#06b6d4',
    pink: '#f472b6',
  },
};
