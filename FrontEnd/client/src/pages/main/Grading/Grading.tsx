import { Fragment, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, Divider, Collapse,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { GradingPayload } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import PageHeader from '@/components/PageHeader/PageHeader';
import { answerKey } from '@/utils/gradingMcq';

// GradeDraft removed
const Grading = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GradingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMcq, setExpandedMcq] = useState<Set<string>>(new Set());

  const toggleMcqQuestion = (questionId: string) => {
    setExpandedMcq((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      try {
        setLoading(true);
        const d = await examApi.getSessionGrading(sessionId);
        setData(d);
      } catch {
        setError(t('errors.grading_load_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId, t]);

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
        <Alert color="red" variant="light">{error || t('errors.grading_load_failed')}</Alert>
        <ButtonFilled style={{ marginTop: 16 }} label={t('common.back')} onClick={() => navigate('/grading')} />
      </Box>
    );
  }

  const mcqQuestions = data.graded_details.filter((d) => d.question_type === 'mcq');

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Box>
            <PageHeader
              title={t('grading.title')}
              subtitle={data.exam.title}
              accent="teal"
            />
          </Box>
          <Badge color={data.session.grading_status === 'complete' ? 'green' : 'yellow'} size="lg">
            {data.session.grading_status === 'complete' ? t('grading.graded') : t('grading.pending')}
          </Badge>
        </Group>

        {/* Student info */}
        <Paper withBorder radius="md" p="md">
          <Text fw={600}>{data.student.full_name || data.student.email || 'Student'}</Text>
          <Text size="sm" c="dimmed">{data.student.email}</Text>
          <Divider my="sm" />
          <Group gap="xl">
            <Box>
              <Text size="sm" c="dimmed">{t('grading.score')}</Text>
              <Text fw={700} size="lg">
                {data.session.score != null
                  ? (() => {
                      const score = Number(data.session.score ?? 0);
                      const maxPoints = Number(data.session.max_points || 1);
                      const val = (score / maxPoints) * 10;
                      const formatted = val.toFixed(2);
                      return `${formatted.padStart(4, '0')} / 10`;
                    })()
                  : '—'}
              </Text>
              <Text size="xs" c="dimmed">
                Raw: {data.session.score}/{data.session.max_points}
              </Text>
            </Box>
            <Box>
              <Text size="sm" c="dimmed">{t('grading.submitted_at')}</Text>
              <Text fw={500}>{data.session.submitted_at ? new Date(data.session.submitted_at).toLocaleString() : '—'}</Text>
            </Box>
          </Group>
        </Paper>

        {/* MCQ summary */}
        {mcqQuestions.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('grading.mcq_summary')}</Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{t('grading.question')}</Table.Th>
                  <Table.Th>{t('grading.answer')}</Table.Th>
                  <Table.Th>{t('grading.correct_answer')}</Table.Th>
                  <Table.Th>{t('grading.status')}</Table.Th>
                  <Table.Th>{t('grading.points')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mcqQuestions.map((detail, idx) => {
                  const q = data.questions.find((q) => q.id === detail.question_id);
                  const content = q?.content || '...';
                  const isExpanded = expandedMcq.has(detail.question_id);
                  const submittedKey = answerKey(detail.submitted);
                  const correctKey = answerKey(detail.correct);
                  const optionEntries = q?.options ? Object.entries(q.options) : [];

                  return (
                    <Fragment key={detail.question_id}>
                      <Table.Tr
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        onClick={() => toggleMcqQuestion(detail.question_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleMcqQuestion(detail.question_id);
                          }
                        }}
                        style={{
                          cursor: 'pointer',
                          background: isExpanded
                            ? 'var(--mantine-color-gray-0)'
                            : undefined,
                          transition: 'background-color 220ms ease',
                        }}
                      >
                        <Table.Td>{idx + 1}</Table.Td>
                        <Table.Td style={{ maxWidth: 320 }}>
                          <Text size="sm" lineClamp={2}>
                            {content}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{submittedKey ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{correctKey ?? '—'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={detail.is_correct ? 'green' : 'red'}>
                            {detail.is_correct ? t('grading.correct') : t('grading.wrong')}
                          </Badge>
                        </Table.Td>
                        <Table.Td fw={500}>
                          {detail.points_earned ?? 0}/{detail.max_points}
                        </Table.Td>
                      </Table.Tr>
                      <Table.Tr>
                        <Table.Td
                          colSpan={6}
                          p={0}
                          style={{
                            padding: 0,
                            borderBottom: isExpanded ? undefined : 'none',
                          }}
                        >
                          <Collapse in={isExpanded} transitionDuration={280} transitionTimingFunction="ease">
                            <Box
                              p="md"
                              style={{
                                background: 'var(--mantine-color-gray-0)',
                                borderTop: '1px solid var(--mantine-color-gray-2)',
                              }}
                            >
                            <Stack gap="sm">
                              <Box>
                                <Text size="xs" c="dimmed" mb={4}>
                                  {t('grading.question')}
                                </Text>
                                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                                  {content}
                                </Text>
                              </Box>
                              {optionEntries.length > 0 ? (
                                <Box>
                                  <Text size="xs" c="dimmed" mb={6}>
                                    {t('exam_result.options_label')}
                                  </Text>
                                  <Stack gap={6}>
                                    {optionEntries.map(([key, label]) => {
                                      const optKey = key.toUpperCase();
                                      const isCorrect = correctKey === optKey;
                                      const isSubmitted =
                                        submittedKey === optKey && submittedKey != null;
                                      return (
                                        <Group
                                          key={key}
                                          gap="xs"
                                          p="xs"
                                          wrap="nowrap"
                                          align="flex-start"
                                          style={{
                                            borderRadius: 8,
                                            border: isCorrect
                                              ? '2px solid var(--mantine-color-green-6)'
                                              : '1px solid var(--mantine-color-gray-3)',
                                            background: isSubmitted
                                              ? 'var(--mantine-color-blue-0)'
                                              : isCorrect
                                                ? 'var(--mantine-color-green-0)'
                                                : undefined,
                                          }}
                                        >
                                          <Badge
                                            size="sm"
                                            w={28}
                                            ta="center"
                                            color={isCorrect ? 'green' : 'gray'}
                                            variant={isCorrect ? 'filled' : 'light'}
                                          >
                                            {key}
                                          </Badge>
                                          <Text size="sm" style={{ flex: 1 }}>
                                            {label}
                                          </Text>
                                          {isSubmitted && (
                                            <Badge size="xs" color="blue" variant="light">
                                              {t('grading.answer')}
                                            </Badge>
                                          )}
                                        </Group>
                                      );
                                    })}
                                  </Stack>
                                </Box>
                              ) : (
                                <Text size="xs" c="dimmed">
                                  {t('grading.no_options')}
                                </Text>
                              )}
                            </Stack>
                            </Box>
                          </Collapse>
                        </Table.Td>
                      </Table.Tr>
                    </Fragment>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        {mcqQuestions.length === 0 && (
          <Alert color="blue" variant="light">{t('grading.no_questions')}</Alert>
        )}

        <Group>
          <ButtonFilled
            label={t('common.back')}
            color="gray"
            onClick={() => navigate('/grading')}
          />
        </Group>
      </Stack>
    </Box>
  );
};

export default Grading;