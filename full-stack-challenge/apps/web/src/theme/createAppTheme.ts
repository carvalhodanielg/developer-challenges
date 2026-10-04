import { createTheme, type Theme } from '@mui/material/styles';
import type { ColorMode } from '../features/ui/uiSlice';

/** Width of the navigation drawer from `md` up. */
export const DRAWER_WIDTH = 240;

/**
 * The only place colours are defined. Every pair below keeps text at 4.5:1
 * or more against its background (WCAG AA) in its own mode.
 */
const palettes = {
  light: {
    primary: { main: '#1565c0' }, // 5.7:1 with white text
    secondary: { main: '#00695c' },
    background: { default: '#f5f7fa', paper: '#ffffff' },
  },
  dark: {
    primary: { main: '#90caf9' }, // over 9:1 with dark text and on the paper
    secondary: { main: '#80cbc4' },
    background: { default: '#0f1214', paper: '#171b1f' },
  },
} as const;

export function createAppTheme(mode: ColorMode): Theme {
  return createTheme({
    palette: { mode, ...palettes[mode] },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Honour the OS setting: no animated transitions for users who
          // asked for less motion (drawer slide, ripples, progress).
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
    },
  });
}
