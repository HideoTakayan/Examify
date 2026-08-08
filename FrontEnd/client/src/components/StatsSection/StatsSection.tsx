import { SimpleGrid } from '@mantine/core';
import {
  IconChecklist,
  IconStar,
  IconClock,
  IconTrophy,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../StatCard/StatCard';
import type { DashboardStatCard } from '@/services/dashboardApi';

const statKeysOrder = ['exams_taken', 'average_score', 'avg_time', 'class_rank'] as const;

const icons = [
  <IconChecklist key="i0" size={18} />,
  <IconStar key="i1" size={18} />,
  <IconClock key="i2" size={18} />,
  <IconTrophy key="i3" size={18} />,
];

const accents = ['teal', 'green', 'cyan', 'amber'] as const;

type StatsSectionProps = {
  stats: DashboardStatCard[];
};

export default function StatsSection({ stats }: StatsSectionProps) {
  const { t } = useTranslation();

  const titleFor = (key: string) => {
    switch (key) {
      case 'exams_taken':
        return t('stats.taken_total');
      case 'average_score':
        return t('stats.average_score');
      case 'avg_time':
        return t('stats.avg_time');
      case 'class_rank':
        return t('stats.class_rank');
      default:
        return key;
    }
  };

  const ordered = statKeysOrder
    .map((k) => stats.find((s) => s.key === k))
    .filter((x): x is DashboardStatCard => Boolean(x));

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
      {ordered.map((s, idx) => (
        <StatCard
          key={s.key}
          title={titleFor(s.key)}
          value={s.value}
          trend={t('stats.trend_flat')}
          trendDirection={s.trend}
          icon={icons[idx] ?? icons[0]}
          accent={accents[idx] ?? 'teal'}
        />
      ))}
    </SimpleGrid>
  );
}
