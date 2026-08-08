import { Box, Stack, Text, Button } from '@mantine/core';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        minHeight: 300,
      }}
    >
      <Box
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: '#F0FDFA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          color: '#0D9488',
          fontSize: 36,
        }}
      >
        {icon}
      </Box>
      <Stack gap={8} align="center" style={{ maxWidth: 360 }}>
        <Text fw={600} size="lg" style={{ color: '#1A1A1A' }}>
          {title}
        </Text>
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
          {description}
        </Text>
      </Stack>
      {action && (
        <Button
          variant="light"
          color="teal"
          style={{ marginTop: 24 }}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </Box>
  );
}