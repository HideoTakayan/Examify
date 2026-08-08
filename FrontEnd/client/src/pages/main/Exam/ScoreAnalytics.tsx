import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Text, Loader, Paper, Group, Stack, Alert, SimpleGrid, Select, Table, Badge,
} from '@mantine/core';
import '@mantine/core/styles.css';
import { BarChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import adminClassApi, { type AdminClassDto } from '@/services/adminClassApi';
import scoreAnalyticsApi, {
  type SubjectOption,
  type SubjectScoreAnalytics,
} from '@/services/scoreAnalyticsApi';
import EmptyState from '@/components/EmptyState/EmptyState';
import PageHeader from '@/components/PageHeader/PageHeader';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker';
import { useSubjectPickerCatalog } from '@/hooks/useSubjectPickerCatalog';
import useAuth from '@/hooks/useAuth';
import { formatExamScore } from '@/utils/formatExamScore';

const ALL_CLASSES = '__all__';

function formatGrade10(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${formatExamScore(value)}/10`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${formatExamScore(value)}%`;
}

const ScoreAnalytics = () => {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const { groups: pickerGroups, loading: catalogLoading } = useSubjectPickerCatalog();

  const [classesLoading, setClassesLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');

  const [classes, setClasses] = useState<AdminClassDto[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<SubjectScoreAnalytics | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        setError('');
        const list = await adminClassApi.getClasses();
        setClasses(list);
        if (isAdmin) {
          setSelectedClassId(ALL_CLASSES);
        } else if (list.length === 1) {
          setSelectedClassId(list[0].id);
        } else {
          setSelectedClassId(null);
        }
      } catch {
        setError(t('score_analytics.load_failed'));
      } finally {
        setClassesLoading(false);
      }
    };
    void loadClasses();
  }, [isAdmin, t]);

  const resolvedClassId = useMemo(() => {
    if (selectedClassId === ALL_CLASSES) return null;
    return selectedClassId;
  }, [selectedClassId]);

  useEffect(() => {
    setSelectedSubjectId(null);
    setAnalytics(null);
  }, [selectedClassId]);

  const loadSubjects = useCallback(async () => {
    if (!isAdmin && !resolvedClassId) {
      setSubjects([]);
      setSelectedSubjectId(null);
      return;
    }
    try {
      setSubjectsLoading(true);
      setError('');
      const list = await scoreAnalyticsApi.getSubjects(resolvedClassId);
      setSubjects(list);
      setSelectedSubjectId((prev) =>
        prev && list.some((s) => s.subject_id === prev) ? prev : list[0]?.subject_id ?? null
      );
    } catch {
      setError(t('score_analytics.load_failed'));
      setSubjects([]);
      setSelectedSubjectId(null);
    } finally {
      setSubjectsLoading(false);
    }
  }, [isAdmin, resolvedClassId, t]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!selectedSubjectId) {
        setAnalytics(null);
        return;
      }
      if (!isAdmin && !resolvedClassId) {
        setAnalytics(null);
        return;
      }
      try {
        setAnalyticsLoading(true);
        setError('');
        const data = await scoreAnalyticsApi.getBySubject(selectedSubjectId, resolvedClassId);
        setAnalytics(data);
      } catch {
        setError(t('score_analytics.load_failed'));
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };
    void loadAnalytics();
  }, [selectedSubjectId, resolvedClassId, isAdmin, t]);

  const classOptions = useMemo(() => {
    const opts = classes.map((c) => ({ value: c.id, label: c.display_name }));
    if (isAdmin) {
      return [{ value: ALL_CLASSES, label: t('score_analytics.all_classes') }, ...opts];
    }
    return opts;
  }, [classes, isAdmin, t]);

  const analyticsSubjectIds = useMemo(
    () => new Set(subjects.map((s) => s.subject_id)),
    [subjects]
  );

  const filteredPickerGroups = useMemo(
    () =>
      pickerGroups
        .map((group) => ({
          ...group,
          subjects: group.subjects.filter((s) => analyticsSubjectIds.has(s.id)),
        }))
        .filter((group) => group.subjects.length > 0),
    [pickerGroups, analyticsSubjectIds]
  );

  const selectedSubjectMeta = useMemo(
    () => subjects.find((s) => s.subject_id === selectedSubjectId) ?? null,
    [subjects, selectedSubjectId]
  );

  const chartData = useMemo(
    () =>
      analytics?.buckets.map((b) => ({
        bucket: b.range_label,
        count: b.count,
      })) ?? [],
    [analytics]
  );

  const noManagedClass = !isAdmin && classes.length === 0;
  const needsClassPick = !isAdmin && classes.length > 1 && !selectedClassId;
  const isLoading = classesLoading || subjectsLoading || analyticsLoading;

  if (classesLoading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('score_analytics.title')}
          subtitle={t('score_analytics.subtitle')}
          accent="teal"
        />

        {error && (
          <Alert color="red" variant="light">{error}</Alert>
        )}

        {noManagedClass ? (
          <Alert color="yellow" variant="light">
            {t('score_analytics.no_managed_class')}
          </Alert>
        ) : (
          <Group grow align="end">
            <Select
              label={isAdmin ? t('score_analytics.filter_class') : t('score_analytics.my_class')}
              placeholder={t('score_analytics.select_class')}
              data={classOptions}
              value={selectedClassId}
              onChange={setSelectedClassId}
              disabled={!isAdmin && classes.length <= 1}
              searchable
            />
            <SubjectCategoryPicker
              label={t('score_analytics.filter_subject')}
              placeholder={t('score_analytics.select_subject')}
              externalGroups={filteredPickerGroups}
              catalogLoading={catalogLoading || subjectsLoading}
              searchMode="global"
              value={selectedSubjectId}
              onChange={setSelectedSubjectId}
              disabled={needsClassPick || subjects.length === 0 || subjectsLoading}
              helperText={undefined}
            />
          </Group>
        )}

        {needsClassPick && (
          <Alert color="blue" variant="light">
            {t('score_analytics.pick_class_first')}
          </Alert>
        )}

        {isLoading && !classesLoading && (
          <Group justify="center" py="md">
            <Loader size="sm" />
          </Group>
        )}

        {!isLoading && analytics && analytics.summary.total_sessions > 0 && (
          <Stack gap="md">
            <Group gap="xs">
              <Badge variant="light" color="teal">{analytics.class_name}</Badge>
              <Badge variant="light" color="blue">{analytics.subject_name}</Badge>
            </Group>

            <SimpleGrid cols={{ base: 2, sm: 5 }} spacing="sm">
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">{t('score_analytics.sessions_total')}</Text>
                <Text fw={700} size="xl">{analytics.summary.total_sessions}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">{t('score_analytics.avg')}</Text>
                <Text fw={700} size="xl">{formatGrade10(analytics.summary.avg_grade10)}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">{t('score_analytics.min')}</Text>
                <Text fw={700} size="xl">{formatGrade10(analytics.summary.min_grade10)}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">{t('score_analytics.max')}</Text>
                <Text fw={700} size="xl">{formatGrade10(analytics.summary.max_grade10)}</Text>
              </Paper>
              <Paper withBorder p="sm" radius="md">
                <Text size="xs" c="dimmed">{t('score_analytics.pass_rate')}</Text>
                <Text fw={700} size="xl">{formatPercent(analytics.summary.pass_rate)}</Text>
              </Paper>
            </SimpleGrid>

            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">{t('score_analytics.histogram_title')}</Text>
              {chartData.some((d) => d.count > 0) ? (
                <BarChart
                  h={320}
                  data={chartData}
                  dataKey="bucket"
                  series={[{ name: 'count', color: 'teal.6' }]}
                  tickLine="xy"
                  gridAxis="xy"
                  xAxisLabel={t('score_analytics.grade10_bucket')}
                  yAxisLabel={t('score_analytics.sessions_count')}
                />
              ) : (
                <Text size="sm" c="dimmed">{t('score_analytics.no_data')}</Text>
              )}
            </Paper>

            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">{t('score_analytics.exam_breakdown')}</Text>
              {analytics.exams.length === 0 ? (
                <Text size="sm" c="dimmed">{t('score_analytics.no_exam_data')}</Text>
              ) : (
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('score_analytics.exam_title')}</Table.Th>
                      <Table.Th>{t('score_analytics.sessions_count')}</Table.Th>
                      <Table.Th>{t('score_analytics.avg')}</Table.Th>
                      <Table.Th>{t('score_analytics.min')}</Table.Th>
                      <Table.Th>{t('score_analytics.max')}</Table.Th>
                      <Table.Th>{t('score_analytics.pass_rate')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {analytics.exams.map((exam) => (
                      <Table.Tr key={exam.exam_id}>
                        <Table.Td>{exam.exam_title}</Table.Td>
                        <Table.Td>{exam.submitted_count}</Table.Td>
                        <Table.Td>{formatGrade10(exam.avg_grade10)}</Table.Td>
                        <Table.Td>{formatGrade10(exam.min_grade10)}</Table.Td>
                        <Table.Td>{formatGrade10(exam.max_grade10)}</Table.Td>
                        <Table.Td>{formatPercent(exam.pass_rate)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        )}

        {!isLoading && !noManagedClass && !needsClassPick && selectedSubjectId && analytics?.summary.total_sessions === 0 && (
          <EmptyState
            icon={<Text style={{ fontSize: 36 }}>📊</Text>}
            title={t('score_analytics.empty_title')}
            description={t('score_analytics.empty_desc')}
          />
        )}

        {!isLoading && !noManagedClass && subjects.length === 0 && !needsClassPick && (
          <EmptyState
            icon={<Text style={{ fontSize: 36 }}>📊</Text>}
            title={t('score_analytics.no_subjects_title')}
            description={t('score_analytics.no_subjects_desc')}
          />
        )}
      </Stack>
    </Box>
  );
};

export default ScoreAnalytics;
