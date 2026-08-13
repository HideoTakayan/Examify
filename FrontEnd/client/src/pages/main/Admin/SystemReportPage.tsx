import { useEffect, useState } from 'react';
import {
  Box, Text, Loader, SimpleGrid, Paper, Stack, Badge, Table, Progress,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import apiClient from '@/services/apiClient';
import StatCard from '@/components/StatCard/StatCard';
import { IconUsers, IconBook, IconClipboardList, IconUserCheck } from '@tabler/icons-react';
import PageHeader from '@/components/PageHeader/PageHeader';

type SystemReport = {
  overview: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    total_sessions: number;
    total_classes: number;
  };
  session_stats: {
    total_submitted: number;
    total_active: number;
    total_expired: number;
    completion_rate: number;
    pass_rate: number;
    avg_score: number | null;
  };
  integrity_stats: {
    violations_last_24h: number;
    top_violation_type: string | null;
    flagged_sessions: number;
  };
  pending_grading: number;
  recent_exams: Array<{
    exam_id: string;
    title: string;
    opens_at: string | null;
    ends_at: string | null;
    active_sessions: number;
    submitted_today: number;
  }>;
};

const formatExamTime = (iso: string | null, emptyLabel: string) => {
  if (!iso) return emptyLabel;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return emptyLabel;
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const SystemReportPage = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<SystemReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<{ success: boolean; data: SystemReport }>('/system-report');
        setData(res.data.data);
      } catch {
        setError('Không tải được báo cáo hệ thống.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Text color="red">{error || 'No data'}</Text>
      </Box>
    );
  }

  const ov = data.overview;
  const ss = data.session_stats;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('system_report.title')}
          subtitle={t('system_report.subtitle')}
          accent="teal"
        />

        <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
          <StatCard title={t('system_report.accounts')} value={String(ov.total_accounts)} icon={<IconUsers size={18} />} accent="teal" />
          <StatCard title={t('system_report.students')} value={String(ov.total_students)} icon={<IconUserCheck size={18} />} accent="green" />
          <StatCard title={t('system_report.teachers')} value={String(ov.total_teachers)} icon={<IconBook size={18} />} accent="cyan" />
          <StatCard title={t('system_report.exams')} value={String(ov.total_exams)} icon={<IconClipboardList size={18} />} accent="amber" />
          <StatCard title={t('system_report.sessions')} value={String(ov.total_sessions)} icon={<IconClipboardList size={18} />} accent="teal" />
          <StatCard title={t('system_report.classes')} value={String(ov.total_classes)} icon={<IconBook size={18} />} accent="amber" />
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.completion_rate')}</Text>
            <Progress value={ss.completion_rate} color="green" size="lg" radius="sm" mt="sm" />
            <Text size="sm" mt={4}>{ss.completion_rate}% đã nộp</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.pass_rate')}</Text>
            <Progress value={ss.pass_rate} color="teal" size="lg" radius="sm" mt="sm" />
            <Text size="sm" mt={4}>{ss.pass_rate}% đạt (≥60%)</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.avg_score')}</Text>
            <Text fw={800} size="xl" mt="sm">
              {ss.avg_score != null ? `${Math.round(ss.avg_score)}%` : '—'}
            </Text>
          </Paper>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.active_sessions')}</Text>
            <Text fw={800} size="xl" c="orange">{ss.total_active}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.pending_grading')}</Text>
            <Text fw={800} size="xl" c={data.pending_grading > 0 ? 'yellow' : undefined}>
              {data.pending_grading}
              {data.pending_grading > 0 && ' đang chờ chấm'}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="xs" c="dimmed" fw={600}>{t('system_report.violations_24h')}</Text>
            <Text fw={800} size="xl" c="red">{data.integrity_stats.violations_last_24h}</Text>
            {data.integrity_stats.top_violation_type && (
              <Text size="xs" c="dimmed">Top: {data.integrity_stats.top_violation_type}</Text>
            )}
          </Paper>
        </SimpleGrid>

        <Paper withBorder radius="md" p="md">
          <Stack gap={4} mb="sm">
            <Text fw={600}>{t('system_report.upcoming_exams')}</Text>
            <Text size="xs" c="dimmed">{t('system_report.upcoming_exams_hint')}</Text>
          </Stack>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('exam_list.title')}</Table.Th>
                <Table.Th>{t('system_report.col_opens_at')}</Table.Th>
                <Table.Th>{t('system_report.col_ends_at')}</Table.Th>
                <Table.Th>{t('system_report.col_active_sessions')}</Table.Th>
                <Table.Th>{t('system_report.submitted_today')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.recent_exams.map((exam) => (
                <Table.Tr key={exam.exam_id}>
                  <Table.Td><Text size="sm" lineClamp={1}>{exam.title}</Text></Table.Td>
                  <Table.Td>
                    <Text size="sm" c={exam.opens_at ? undefined : 'dimmed'}>
                      {formatExamTime(exam.opens_at, t('system_report.no_schedule'))}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c={exam.ends_at ? undefined : 'dimmed'}>
                      {formatExamTime(exam.ends_at, t('system_report.no_schedule'))}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={exam.active_sessions > 0 ? 'orange' : 'gray'}>
                      {exam.active_sessions}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={exam.submitted_today > 0 ? 'green' : 'gray'}>
                      {exam.submitted_today}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
              {data.recent_exams.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" ta="center">{t('system_report.no_exams')}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default SystemReportPage;
