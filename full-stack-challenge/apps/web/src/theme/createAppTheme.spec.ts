import { getContrastRatio } from '@mui/material/styles';
import { createAppTheme } from './createAppTheme';

describe('createAppTheme', () => {
  it.each(['light', 'dark'] as const)('builds the %s palette', (mode) => {
    expect(createAppTheme(mode).palette.mode).toBe(mode);
  });

  it.each(['light', 'dark'] as const)(
    'keeps text readable (WCAG AA) in %s mode',
    (mode) => {
      const { palette } = createAppTheme(mode);
      const pairs: Array<[string, string]> = [
        [palette.text.primary, palette.background.default],
        [palette.text.primary, palette.background.paper],
        [palette.text.secondary, palette.background.paper],
        [palette.primary.contrastText, palette.primary.main],
        [palette.secondary.contrastText, palette.secondary.main],
      ];
      for (const [foreground, background] of pairs) {
        expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    },
  );
});
