import { type ReactNode } from 'react';
import { Box, Paper } from '@mantine/core';
import classes from './ExamTake.module.scss';

export function ExamTakeGateCard({ children }: { children: ReactNode }) {
  return (
    <Box className={classes.centerStage}>
      <Paper withBorder radius="md" p="xl" className={classes.centerCard}>
        {children}
      </Paper>
    </Box>
  );
}
