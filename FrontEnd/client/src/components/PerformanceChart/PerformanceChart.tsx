import { useMemo } from 'react';
import { Paper, Text, Stack, Box, ScrollArea } from '@mantine/core';
import { LineChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import type { PerformancePointDto } from '@/services/dashboardApi';
import styles from './PerformanceChart.module.scss';

type PerformanceChartProps = {
  data: PerformancePointDto[];
};

const LABEL_MIN_WIDTH = 88;

export default function PerformanceChart({ data }: PerformanceChartProps) {
  const { t } = useTranslation();

  const hasClassAvg = data.some((row) => row.class_avg != null && Number.isFinite(row.class_avg));

  const chartData = useMemo(
    () =>
      hasClassAvg
        ? data.map((row) => ({
            subject: row.label,
            score: row.score,
            classAvg:
              row.class_avg != null && Number.isFinite(row.class_avg) ? row.class_avg : row.score,
          }))
        : data.map((row) => ({
            subject: row.label,
            score: row.score,
          })),
    [data, hasClassAvg]
  );

  const chartWidth = Math.max(520, chartData.length * LABEL_MIN_WIDTH);
  const canScroll = chartData.length > 4;

  return (
    <Paper radius="xl" withBorder p="lg" style={{ height: '100%' }}>
      <Stack gap={2} mb="md">
        <Text fw={700} size="lg">
          {t('performance.title')}
        </Text>
        <Text size="sm" c="dimmed">
          {t('performance.subtitle')}
        </Text>
      </Stack>

      {chartData.length === 0 ? (
        <Text size="sm" c="dimmed" py="xl">
          {t('dashboard.chart_empty')}
        </Text>
      ) : (
        <>
          <ScrollArea
            className={styles.chartScroll}
            type={canScroll ? 'hover' : 'never'}
            offsetScrollbars={canScroll}
            scrollbars="x"
            w="100%"
          >
            <Box className={styles.chartInner} style={{ width: chartWidth }}>
              <LineChart
                h={260}
                w={chartWidth}
                data={chartData}
                dataKey="subject"
                series={
                  hasClassAvg
                    ? [
                        { name: 'score', color: 'teal.6', label: t('performance.score') },
                        { name: 'classAvg', color: 'gray.5', label: t('performance.class_avg') },
                      ]
                    : [{ name: 'score', color: 'teal.6', label: t('performance.score') }]
                }
                type="gradient"
                gradientStops={[
                  { offset: 0, color: 'teal.6' },
                  { offset: 100, color: 'teal.0' },
                ]}
                curveType="monotone"
                withLegend
                withTooltip
                withDots
                strokeWidth={2.5}
                gridAxis="y"
                tickLine="y"
                textColor="dimmed"
                yAxisProps={{
                  domain: [0, 10],
                  ticks: [0, 2, 4, 6, 8, 10],
                  tick: { fill: 'var(--mantine-color-dimmed)' },
                }}
                xAxisProps={{
                  interval: 0,
                  angle: -32,
                  textAnchor: 'end',
                  height: 72,
                  tick: { fontSize: 11, fill: 'var(--mantine-color-dimmed)' },
                }}
                lineProps={(series) =>
                  hasClassAvg && series.name === 'classAvg' ? { strokeDasharray: '6 4' } : {}
                }
                valueFormatter={(value) =>
                  typeof value === 'number' ? value.toFixed(1) : String(value)
                }
              />
            </Box>
          </ScrollArea>
          {canScroll && (
            <Text size="xs" c="dimmed" className={styles.scrollHint}>
              {t('performance.scroll_hint')}
            </Text>
          )}
        </>
      )}
    </Paper>
  );
}
