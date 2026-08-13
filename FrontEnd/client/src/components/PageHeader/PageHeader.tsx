import { Box, Title, Text, Group } from '@mantine/core';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  accent?: 'blue' | 'violet' | 'green' | 'amber' | 'teal';
};

export default function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <Box mb="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Box>
          <Title
            order={2}
            style={{
              fontSize: '1.35rem',
              fontWeight: 600,
              color: 'var(--mantine-color-text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Title>
          {subtitle && (
            <Text
              size="sm"
              c="dimmed"
              mt={4}
              style={{ lineHeight: 1.5 }}
            >
              {subtitle}
            </Text>
          )}
        </Box>
        {action && <Box style={{ flexShrink: 0 }}>{action}</Box>}
      </Group>

      {/* Thin accent underline */}
      <Box
        mt="sm"
        style={{
          height: 1,
          background: 'var(--mantine-color-gray-2)',
          borderRadius: 1,
        }}
      />
    </Box>
  );
}