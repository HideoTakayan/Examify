import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Title, Table, Loader, Text, Paper, Group, Badge, Stack, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { Exam, ExamSession } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import TruncatedText from '@/components/common/TruncatedText';
import { formatScoreScale10Pair } from '@/utils/formatExamScore';

const MyResults = () => {
  const { t, i18n } = useTranslation();
  const [results, setResults] = useState<ExamSession[]>([]);
  const [examNameMap, setExamNameMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage || i18n.language;
  const locale = lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'vi-VN';

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [sessions, exams] = await Promise.all([
          examApi.getMySessions(),
          examApi.getExams(),
        ]);
        setResults(sessions);
        const map = (exams as Exam[]).reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.title;
          return acc;
        }, {});
        setExamNameMap(map);
      } catch {
        setError(t('errors.result_load_failed'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  const completed = results.filter((s) => s.status !== 'active');

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('my_results.title')}</Title>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('my_results.total_attempts')}</Text>
            <Text fw={700} size="xl">{results.length}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('my_results.completed')}</Text>
            <Text fw={700} size="xl">{completed.length}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('my_results.pending_manual')}</Text>
            <Text fw={700} size="xl">
              {completed.filter((s) => s.grading_status === 'pending_manual').length}
            </Text>
          </Paper>
        </Group>

        {completed.length === 0 ? (
          <Alert color="blue" variant="light">
            {t('my_results.empty')}
          </Alert>
        ) : (
          <Paper withBorder radius="md" p="sm">
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('my_results.index')}</Table.Th>
                  <Table.Th>{t('my_results.exam')}</Table.Th>
                  <Table.Th>{t('my_results.score')}</Table.Th>
                  <Table.Th>{t('my_results.time')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>{t('my_results.action')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {completed.map((item, idx) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>
                      <TruncatedText fw={500} maxWidth={320}>
                        {examNameMap[item.exam_id] || item.exam_id}
                      </TruncatedText>
                    </Table.Td>
                    <Table.Td>
                      {item.score != null && item.max_points != null
                        ? formatScoreScale10Pair(item.score, item.max_points)
                        : '—'}
                    </Table.Td>
                    <Table.Td>{new Date(item.started_at).toLocaleString(locale)}</Table.Td>
                    <Table.Td>
                      <Badge color={item.grading_status === 'pending_manual' ? 'yellow' : 'green'}>
                        {item.grading_status === 'pending_manual'
                          ? t('my_results.pending_manual')
                          : t('my_results.done')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <ButtonFilled
                        size="xs"
                        label={t('my_results.view')}
                        disabled={false}
                        onClick={() => navigate(`/result/${item.exam_id}`)}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default MyResults;
