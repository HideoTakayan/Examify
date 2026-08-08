import { ActionIcon, Box, Text } from '@mantine/core';
import {
  IconMaximize,
  IconPlayerPlay,
  IconPlayerSkipForward,
  IconVolume,
} from '@tabler/icons-react';
import classes from './ExamTake.module.scss';

type Props = {
  caption?: string;
  badge?: string;
  currentTime?: string;
  duration?: string;
};

export function ExamVideoPlayer({
  caption,
  badge,
  currentTime = '0:37',
  duration = '2:23',
}: Props) {
  return (
    <div className={classes.mediaWrap}>
      <div className={classes.videoFrame}>
        {badge && <span className={classes.videoBadge}>{badge}</span>}
        <ActionIcon variant="white" color="dark" radius="xl" size={56} aria-label="Phát video">
          <IconPlayerPlay size={32} />
        </ActionIcon>
      </div>
      <div className={classes.videoControls}>
        <div className={classes.audioProgress} style={{ flex: 1 }}>
          <div className={classes.audioProgressFill} style={{ width: '28%' }} />
        </div>
        <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {currentTime} / {duration}
        </Text>
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconVolume size={16} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconPlayerSkipForward size={16} />
        </ActionIcon>
        <ActionIcon variant="subtle" color="gray" size="sm">
          <IconMaximize size={16} />
        </ActionIcon>
      </div>
      {caption && (
        <Box px="sm" py="xs" bg="gray.0">
          <Text size="sm" c="dimmed">
            {caption}
          </Text>
        </Box>
      )}
    </div>
  );
}
