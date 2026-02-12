import { Theme } from '@/types/theme';

/**
 * Forest 테마
 * 자연스럽고 편안한 녹색 계열 테마
 */
export const forestTheme: Theme = {
  name: 'Forest',
  id: 'forest',
  light: {
    bg: '#f0fdf4',
    surface: '#dcfce7',
    surface2: '#bbf7d0',
    border: '#86efac',
    text: '#14532d',
    textDim: '#166534',
    accent: '#16a34a',
    accent2: '#15803d',
    green: '#22c55e',
    greenDim: '#dcfce7',
    orange: '#ea580c',
    teal: '#0d9488',
    pink: '#db2777',
  },
  dark: {
    bg: '#052e16',
    surface: '#14532d',
    surface2: '#166534',
    border: '#22c55e',
    text: '#f0fdf4',
    textDim: '#86efac',
    accent: '#4ade80',
    accent2: '#22c55e',
    green: '#34d399',
    greenDim: '#064e3b',
    orange: '#fb923c',
    teal: '#2dd4bf',
    pink: '#f472b6',
  },
};
