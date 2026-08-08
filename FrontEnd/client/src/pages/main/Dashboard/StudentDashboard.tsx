import { Box, Text, Title } from '@mantine/core';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StatsSection from '@/components/StatsSection/StatsSection';
import UpcomingExamsTable from '@/components/UpcomingExamsTable/UpcomingExamsTable';
import PerformanceChart from '@/components/PerformanceChart/PerformanceChart';
import RecentResults from '@/components/RecentResults/RecentResults';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import type { StudentDashboardDto } from '@/services/dashboardApi';
import styles from './Dashboard.module.scss';

type StudentDashboardProps = {
  data: StudentDashboardDto;
};

const StudentDashboard = ({ data }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const userName = localStorage.getItem('user_name') || t('roles.student');
  const locale = useMemo(() => {
    const lang = i18n.resolvedLanguage || i18n.language;
    if (lang === 'en') return 'en-US';
    if (lang === 'ja') return 'ja-JP';
    return 'vi-VN';
  }, [i18n.language, i18n.resolvedLanguage]);
  const formattedDate = useMemo(() => {
    const raw = new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [locale]);

  const examsTaken = useMemo(
    () => data.stats.find((s) => s.key === 'exams_taken')?.value ?? '0',
    [data.stats]
  );
  const upcomingCount = data.upcoming_exams.length;

  return (
    <Box className={styles.page}>
      <Box component="section" className={styles.welcomeBanner} aria-label={t('dashboard.welcome_aria')}>
        <span className={`${styles.decoCircle} ${styles.decoOne}`} />
        <span className={`${styles.decoCircle} ${styles.decoTwo}`} />
        <span className={`${styles.decoCircle} ${styles.decoThree}`} />
        <span className={`${styles.decoCircle} ${styles.decoFour}`} />

        <div className={styles.welcomeContent}>
          <Title order={3} className={styles.welcomeTitle}>
            {t('dashboard.welcome_title', { name: userName })}
          </Title>
          <Text className={styles.welcomeDate}>{formattedDate}</Text>
          <Text className={styles.welcomeText}>
            {t('dashboard.welcome_note_stats', { taken: examsTaken, upcoming: upcomingCount })}
          </Text>

          <div className={styles.welcomeActions}>
            <ButtonFilled
              color="teal"
              size="sm"
              label={t('dashboard.view_schedule')}
              disabled={false}
              onClick={() => navigate('/exams')}
            />
          </div>
        </div>
      </Box>

      <StatsSection stats={data.stats} />

      <Box className={styles.twoColumns}>
        <UpcomingExamsTable exams={data.upcoming_exams} />
        <PerformanceChart data={data.performance_chart} />
      </Box>

      <RecentResults results={data.recent_results} />
    </Box>
  );
};

export default StudentDashboard;
