import { ActionIcon, Group, Text } from '@mantine/core';
import { IconPlayerPlay, IconVolume } from '@tabler/icons-react';
import classes from './ExamTake.module.scss';

type Props = {
  label: string;
  currentTime?: string;
  duration?: string;
};

export function ExamAudioPlayer({
  label,
  currentTime = '00:00',
  duration = '01:45',
}: Props) {
  return (
    <div className={classes.mediaWrap}>
      <div className={classes.audioBar}>
        <ActionIcon variant="filled" color="primary" radius="xl" size="lg" aria-label="Phát">
          <IconPlayerPlay size={22} />
        </ActionIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={classes.audioProgress}>
            <div className={classes.audioProgressFill} />
          </div>
          <Group justify="space-between" mt={6}>
            <Text size="xs" c="dimmed">
              {currentTime} / {duration}
            </Text>
            <Text size="xs" fw={600} c="dimmed">
              {label}
            </Text>
          </Group>
        </div>
        <ActionIcon variant="subtle" color="gray" aria-label="Âm lượng">
          <IconVolume size={20} />
        </ActionIcon>
      </div>
    </div>
  );
}
