import { Theme } from '@/types/theme';

/**
 * Default 테마
 * 깔끔하고 범용적인 기본 테마
 */
export const defaultTheme: Theme = {
  name: 'Default',
  id: 'default',
  light: {
    bg: '#ffffff',
    surface: '#f8fafc',
    surface2: '#f1f5f9',
    border: '#e2e8f0',
    text: '#0f172a',
    textDim: '#64748b',
    accent: '#3b82f6',
    accent2: '#8b5cf6',
    green: '#22c55e',
    greenDim: '#dcfce7',
    orange: '#f97316',
    teal: '#14b8a6',
    pink: '#ec4899',
  },
  dark: {
    bg: '#0f172a',
    surface: '#1e293b',
    surface2: '#334155',
    border: '#475569',
    text: '#f8fafc',
    textDim: '#94a3b8',
    accent: '#60a5fa',
    accent2: '#a78bfa',
    green: '#4ade80',
    greenDim: '#166534',
    orange: '#fb923c',
    teal: '#2dd4bf',
    pink: '#f472b6',
  },
};
