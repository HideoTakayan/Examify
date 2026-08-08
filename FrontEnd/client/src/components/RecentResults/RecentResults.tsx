import { Paper, Group, Text, Table, Badge } from '@mantine/core';
import { IconClipboardList } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import ButtonTransparent from '@/components/Button/ButtonTransparent/ButtonTransparent';
import TruncatedText from '@/components/common/TruncatedText';
import type { RecentResultDto } from '@/services/dashboardApi';
import styles from './RecentResults.module.scss';

const levelStyles: Record<RecentResultDto['level'], { badgeColor: string; scoreColor: string }> = {
  excellent: { badgeColor: 'green', scoreColor: '#16A34A' },
  good: { badgeColor: 'teal', scoreColor: '#0D9488' },
  fair: { badgeColor: 'yellow', scoreColor: '#D97706' },
  poor: { badgeColor: 'red', scoreColor: '#DC2626' },
};

type RecentResultsProps = {
  results: RecentResultDto[];
};

export default function RecentResults({ results }: RecentResultsProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const levelLabels: Record<RecentResultDto['level'], string> = {
    excellent: t('recent_results.level_excellent'),
    good: t('recent_results.level_good'),
    fair: t('recent_results.level_fair'),
    poor: t('recent_results.level_poor'),
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '—';
    const lang = i18n.resolvedLanguage || i18n.language;
    const loc = lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'vi-VN';
    return d.toLocaleDateString(loc);
  };

  const displayScore = (pct: number | null) => {
    if (pct == null || !Number.isFinite(pct)) return '—';
    return (pct / 10).toFixed(1);
  };

  return (
    <Paper radius="xl" withBorder p="md">
      <Group mb="md" justify="space-between">
        <Group gap="xs">
          <IconClipboardList size={20} color="#0D9488" />
          <Text fw={700} size="lg">
            {t('recent_results.title')}
          </Text>
        </Group>

        <ButtonTransparent
          size="sm"
          label={t('common.view_all')}
          disabled={false}
          onClick={() => navigate('/exams')}
        />
      </Group>

      {results.length === 0 ? (
        <Text size="sm" c="dimmed">
          {t('dashboard.results_empty')}
        </Text>
      ) : (
        <Table className={styles.table} highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('recent_results.subject')}</Table.Th>
              <Table.Th>{t('recent_results.date')}</Table.Th>
              <Table.Th>{t('recent_results.score')}</Table.Th>
              <Table.Th>{t('recent_results.time')}</Table.Th>
              <Table.Th>{t('recent_results.level')}</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {results.map((result) => {
              const style = levelStyles[result.level];
              const levelText = levelLabels[result.level];
              return (
                <Table.Tr key={`${result.exam_id}-${result.date_iso}`}>
                  <Table.Td className={styles.subject}>
                    <TruncatedText fw={600} size="sm" maxWidth={200}>
                      {result.subject}
                    </TruncatedText>
                  </Table.Td>
                  <Table.Td>{formatDate(result.date_iso)}</Table.Td>
                  <Table.Td>
                    <span className={styles.score} style={{ color: style.scoreColor }}>
                      {displayScore(result.score_percent)}
                    </span>
                    <span className={styles.scoreSuffix}>{t('recent_results.score_suffix')}</span>
                  </Table.Td>
                  <Table.Td>
                    {result.time_used_min != null
                      ? t('recent_results.minutes_format', {
                          used: result.time_used_min,
                          total: result.time_total_min,
                        })
                      : '—'}
                  </Table.Td>
                  <Table.Td>
                    <Badge color={style.badgeColor} variant="light" size="sm">
                      {levelText}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ButtonLight
                      size="xs"
                      label={t('common.details')}
                      disabled={false}
                      onClick={() => navigate(`/result/${result.exam_id}`)}
                    />
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}
