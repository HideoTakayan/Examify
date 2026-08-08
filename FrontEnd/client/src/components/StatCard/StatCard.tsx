import { Box, Group, Paper, Text } from '@mantine/core';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import styles from './StatCard.module.scss';

type StatCardProps = {
  title: string;
  value: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'flat';
  icon: ReactNode;
  accent?: 'teal' | 'green' | 'cyan' | 'amber';
};

const accentClass: Record<string, string> = {
  teal: 'iconTeal',
  green: 'iconGreen',
  cyan: 'iconCyan',
  amber: 'iconAmber',
};

export default function StatCard({
  title,
  value,
  trend,
  trendDirection = 'up',
  icon,
  accent = 'teal',
}: StatCardProps) {
  const iconClass = accentClass[accent] || accentClass.teal;
  const TrendIcon = trendDirection === 'down' ? IconArrowDownRight : IconArrowUpRight;
  const trendClass =
    trendDirection === 'down'
      ? styles.trendDown
      : trendDirection === 'flat'
        ? styles.trendFlat
        : styles.trendUp;

  return (
    <Paper radius="xl" withBorder p="md" className={styles.card}>
      <Group align="flex-start" gap="md">
        <Box className={`${styles.icon} ${styles[iconClass]}`}>
          {icon}
        </Box>

        <Box className={styles.content}>
          <Text className={styles.value}>{value}</Text>
          <Text className={styles.label}>{title}</Text>

          {trend && trendDirection !== 'flat' && (
            <Group gap={4} className={`${styles.trend} ${trendClass}`}>
              <TrendIcon size={14} />
              <span>{trend}</span>
            </Group>
          )}
          {trend && trendDirection === 'flat' && (
            <Text size="xs" c="dimmed" mt={4}>
              {trend}
            </Text>
          )}
        </Box>
      </Group>
    </Paper>
  );
}
