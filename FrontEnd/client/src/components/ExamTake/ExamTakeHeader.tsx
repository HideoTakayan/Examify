import { Avatar, Badge, Button, Group, Text } from '@mantine/core';
import { IconCheck, IconClock, IconSchool, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import classes from './ExamTake.module.scss';

type Props = {
  title: string;
  section: string;
  remainingLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  versionCode?: string | null;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
};

const statusConfig = {
  connected: { color: 'green', label: 'Kết nối', icon: IconWifi },
  connecting: { color: 'yellow', label: 'Đang kết nối', icon: IconWifi },
  disconnected: { color: 'red', label: 'Mất kết nối', icon: IconWifiOff },
  reconnecting: { color: 'orange', label: 'Đang kết nối lại', icon: IconWifiOff },
};

export function ExamTakeHeader({ title, section, remainingLabel, onSubmit, submitting = false, versionCode, connectionStatus = 'connected' }: Props) {
  const { t } = useTranslation();
  const status = statusConfig[connectionStatus];
  const StatusIcon = status.icon;

  return (
    <header className={classes.header}>
      <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
        <div className={classes.titleBlock}>
          <IconSchool size={28} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div className={classes.title}>{title}</div>
            <div className={classes.subtitle}>{section}</div>
            {versionCode && (
              <Text size="xs" c="primary" fw={700} style={{ letterSpacing: 2 }}>
                ĐỀ {versionCode}
              </Text>
            )}
          </div>
        </div>
      </Group>

      <Group gap="md" wrap="wrap" justify="flex-end">
        <Group gap={6}>
          <StatusIcon size={14} color={`var(--mantine-color-${status.color}-6)`} />
          <Badge size="xs" color={status.color} variant="light">{status.label}</Badge>
        </Group>
        <div className={classes.timerPill}>
          <IconClock size={18} />
          <Text span fw={700} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {remainingLabel}
          </Text>
          <Text span size="xs" c="dimmed" tt="uppercase" fw={600}>
            {t('exam_header.remaining')}
          </Text>
        </div>
        <Group gap="sm" wrap="nowrap">
          <Button
            leftSection={<IconCheck size={18} />}
            radius="md"
            size="md"
            onClick={onSubmit}
            loading={submitting}
            disabled={submitting}
          >
            {t('exam_header.submit')}
          </Button>
          <Avatar radius="xl" size="md" color="primary">
            HV
          </Avatar>
        </Group>
      </Group>
    </header>
  );
}
