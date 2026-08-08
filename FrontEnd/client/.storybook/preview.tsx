import React from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import { theme } from '../src/theme';

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
    (Story, context) => {
      const isDark = context.globals.theme === 'dark';

      return (
        <MantineProvider
          theme={theme}
          forceColorScheme={isDark ? 'dark' : 'light'}
        >
          <Story />
        </MantineProvider>
      );
    },
  ],
};

export default preview;
