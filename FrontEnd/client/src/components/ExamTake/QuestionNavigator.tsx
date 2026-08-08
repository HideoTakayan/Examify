import { Box, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import classes from './ExamTake.module.scss';
import type { QuestionNavigatorFilter } from './types';

type Props = {
  total: number;
  current: number;
  answered: Set<number>;
  flagged: Set<number>;
  filter: QuestionNavigatorFilter;
  onFilterChange: (f: QuestionNavigatorFilter) => void;
  onSelect: (n: number) => void;
};

export function QuestionNavigator({
  total,
  current,
  answered,
  flagged,
  filter,
  onFilterChange,
  onSelect,
}: Props) {
  const { t } = useTranslation();
  const completed = answered.size;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const visible = Array.from({ length: total }, (_, i) => i + 1).filter((n) => {
    if (filter === 'all') return true;
    if (filter === 'unanswered') return !answered.has(n);
    if (filter === 'flagged') return flagged.has(n);
    return true;
  });

  return (
    <Box className={classes.sidebarCard}>
      <Text fw={700} size="sm">
        {t('question_nav.title')}
      </Text>
      <Group justify="space-between" mt={4}>
        <Text size="xs" c="dimmed">
          {t('question_nav.completed', { completed, total })}
        </Text>
        <Text size="xs" c="dimmed" fw={600}>
          {t('question_nav.percent_done', { percent: pct })}
        </Text>
      </Group>
      <div className={classes.progressBar}>
        <div className={classes.progressBarFill} style={{ width: `${pct}%` }} />
      </div>

      <div className={classes.legend}>
        <div className={classes.legendItem}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: 'var(--mantine-color-primary-6)',
            }}
          />
          {t('question_nav.legend_answered')}
        </div>
        <div className={classes.legendItem}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
          />
          {t('question_nav.legend_unanswered')}
        </div>
        <div className={classes.legendItem}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: '#eff6ff',
              border: '2px solid var(--mantine-color-primary-6)',
            }}
          />
          {t('question_nav.legend_current')}
        </div>
        <div className={classes.legendItem}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 4,
              background: '#fff7ed',
              border: '1px solid #fdba74',
            }}
          />
          {t('question_nav.legend_flagged')}
        </div>
      </div>

      <div className={classes.navGrid} style={{ marginTop: 14 }}>
        {visible.map((n) => {
          const isCurrent = n === current;
          const isAnswered = answered.has(n);
          const isFlagged = flagged.has(n);
          const cellClass = [
            classes.navCell,
            isAnswered ? classes.navCellAnswered : '',
            isCurrent ? classes.navCellCurrent : '',
            isFlagged ? classes.navCellFlagged : '',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={n}
              type="button"
              className={cellClass}
              onClick={() => onSelect(n)}
            >
              {n}
            </button>
          );
        })}
      </div>

      <Text size="xs" c="dimmed" mt="sm">
        {t('question_nav.quick_filter')}
      </Text>
      <div className={classes.filterRow}>
        {(
          [
            ['all', t('question_nav.filter_all')],
            ['unanswered', t('question_nav.filter_unanswered')],
            ['flagged', t('question_nav.filter_flagged')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={classes.filterBtn}
            data-active={filter === key}
            onClick={() => onFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
    </Box>
  );
}
