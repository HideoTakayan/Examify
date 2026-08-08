import { createTheme, rem } from '@mantine/core';

export const theme = createTheme({
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
  },

  radius: {
    xs: rem(4),
    sm: rem(6),
    md: rem(8),
    lg: rem(12),
    xl: rem(16),
  },
  defaultRadius: 'md',

  colors: {
    // Sleek slate-blue primary (inspired by Linear/Vercel)
    primary: [
      '#F0F4FF',
      '#E0E9FF',
      '#C2D3FF',
      '#96B4FF',
      '#6690FF',
      '#4F72FF',
      '#3B5BDB', // brand
      '#2F4AC8',
      '#2339A0',
      '#182880',
    ],
    neutral: [
      '#FAFAFA',
      '#F4F4F5',
      '#E4E4E7',
      '#D4D4D8',
      '#A1A1AA',
      '#71717A',
      '#52525B',
      '#3F3F46',
      '#27272A',
      '#18181B',
    ],
    success: [
      '#F0FDF4','#DCFCE7','#BBF7D0','#86EFAC',
      '#4ADE80','#22C55E','#16A34A','#15803D','#166534','#14532D',
    ],
    error: [
      '#FFF1F2','#FFE4E6','#FECDD3','#FDA4AF',
      '#FB7185','#F43F5E','#E11D48','#BE123C','#9F1239','#881337',
    ],
    warning: [
      '#FFFBEB','#FEF3C7','#FDE68A','#FCD34D',
      '#FBBF24','#F59E0B','#D97706','#B45309','#92400E','#78350F',
    ],
  },

  primaryColor: 'primary',
  primaryShade: { light: 6, dark: 5 },

  shadows: {
    xs: '0 1px 2px rgba(0,0,0,.05)',
    sm: '0 1px 4px rgba(0,0,0,.07), 0 1px 2px rgba(0,0,0,.04)',
    md: '0 4px 8px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.04)',
    lg: '0 8px 16px rgba(0,0,0,.09), 0 4px 8px rgba(0,0,0,.05)',
    xl: '0 20px 40px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.06)',
  },

  components: {
    Button: {
      defaultProps: { radius: 'md' },
      styles: { root: { fontWeight: 500, letterSpacing: '0.005em' } },
    },
    Card: { defaultProps: { radius: 'lg', shadow: 'sm', withBorder: true } },
    TextInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'sm' } },
    Paper: { defaultProps: { radius: 'lg', shadow: 'sm' } },
    Tooltip: { defaultProps: { radius: 'sm', withArrow: true } },
    Table: { defaultProps: { striped: false, highlightOnHover: true } },
  },
});
