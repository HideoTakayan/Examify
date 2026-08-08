import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Title, Text, Loader, Badge, Paper, Group, Alert, Stack, Accordion, ThemeIcon, Progress,
} from '@mantine/core';
import { IconCheck, IconX, IconClock, IconAlertCircle, IconCircleHalf2 } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { SessionReview } from '@/services/examApi';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import {
  countFullyCorrectQuestions,
  getEssayGradeState,
  getFullyCorrectPercent,
  getQuestionStatusColor,
  getQuestionStatusIcon,
  getSummaryResultTone,
  hasPartialCreditEssay,
  isQuestionFullyCorrect,
  sumEssayScore,
  sumMcqScore,
} from './examResultDisplay';
import { formatScoreScale10Pair, scoreToPointPercent } from '@/utils/formatExamScore';

function formatLearningSummaryMode(
  mode: 'full_wrong_details' | 'chapter_samples' | 'summary_only' | 'all_wrong_summary'
) {
  switch (mode) {
    case 'full_wrong_details':
      return 'Chi tiết toàn bộ câu sai';
    case 'chapter_samples':
      return 'Mẫu câu sai theo chương';
    case 'summary_only':
      return 'Tóm tắt tổng hợp';
    case 'all_wrong_summary':
      return 'Tóm tắt toàn bộ câu sai';
    default:
      return mode;
  }
}

const ExamResult = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [review, setReview] = useState<SessionReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResult = async () => {
      if (!examId) return;
      try {
        setLoading(true);
        const submission = await examApi.getMySubmission(examId);
        if (!submission?.session?.id) {
          setReview(null);
          return;
        }
        const data = await examApi.getSessionReview(submission.session.id);
        setReview(data);
      } catch (err: unknown) {
        const msg =
          err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : undefined;
        setError(msg?.trim() || t('errors.result_load_failed'));
      } finally {
        setLoading(false);
      }
    };

    loadResult();
  }, [examId, t]);

  if (!examId) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>{t('exam_result.invalid_exam')}</Title>
      </Box>
    );
  }

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

  if (!review) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Title order={2}>{t('exam_result.no_result')}</Title>
        <ButtonFilled
          style={{ marginTop: 16 }}
          label={t('common.back_exam_list')}
          disabled={false}
          onClick={() => navigate('/exams')}
        />
      </Box>
    );
  }

  const questions = review.questions;
  const mcqQuestions = questions.filter((q) => q.question_type === 'mcq');
  const essayQuestions = questions.filter((q) => q.question_type === 'essay');
  const hasEssay = essayQuestions.length > 0;
  const hasPendingEssay =
    review.grading_status === 'pending_manual' && hasEssay;
  const totalQuestions = questions.length;
  const fullyCorrectCount = countFullyCorrectQuestions(questions);
  const { earned: mcqScore, max: mcqMax } = sumMcqScore(questions);
  const essayScore = sumEssayScore(questions);
  const fullyCorrectPct = getFullyCorrectPercent(questions);
  const pointPercent =
    review.score != null && review.max_points != null
      ? scoreToPointPercent(review.score, review.max_points)
      : hasPendingEssay && mcqMax > 0
        ? scoreToPointPercent(mcqScore, mcqMax)
        : null;
  const summaryTone = getSummaryResultTone(questions);
  const partialEssay = hasPartialCreditEssay(questions);
  const learningSummary = review.learning_assessment_summary;
  const topWeakChapters = learningSummary?.chapter_summary.slice(0, 3) ?? [];
  const scoreColor =
    summaryTone === 'all_correct'
      ? 'green'
      : summaryTone === 'mixed'
        ? 'yellow'
        : fullyCorrectPct != null && fullyCorrectPct >= 50
          ? 'yellow'
          : 'red';

  const renderStatusIcon = (q: (typeof questions)[0]) => {
    const kind = getQuestionStatusIcon(q);
    const size = 12;
    if (kind === 'clock') return <IconClock size={size} />;
    if (kind === 'partial') return <IconCircleHalf2 size={size} />;
    if (kind === 'check') return <IconCheck size={size} />;
    return <IconX size={size} />;
  };

  const getOptionLabel = (options: Record<string, string> | null, key: string) => {
    if (!options) return key;
    return options[key] ?? key;
  };

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{review.exam.title}</Title>
        <Text size="sm" c="dimmed">{t('exam_result.subtitle')}</Text>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.correct_label')}</Text>
            <Group gap={4} align="center">
              <Text fw={700} size="xl">
                {totalQuestions > 0 ? `${fullyCorrectCount}/${totalQuestions}` : '—'}
              </Text>
              {totalQuestions > 0 && (
                <ThemeIcon
                  color={
                    summaryTone === 'all_correct'
                      ? 'green'
                      : summaryTone === 'mixed'
                        ? 'yellow'
                        : 'red'
                  }
                  size="sm"
                  radius="xl"
                  variant="filled"
                >
                  {summaryTone === 'all_correct' ? (
                    <IconCheck size={12} />
                  ) : summaryTone === 'mixed' ? (
                    <IconCircleHalf2 size={12} />
                  ) : (
                    <IconX size={12} />
                  )}
                </ThemeIcon>
              )}
            </Group>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.score_label')}</Text>
            <Text fw={700} size="xl">
              {review.score != null && review.max_points != null
                ? formatScoreScale10Pair(review.score, review.max_points)
                : hasPendingEssay && mcqMax > 0
                  ? formatScoreScale10Pair(mcqScore, mcqMax)
                  : t('exam_result.pending_score')}
            </Text>
            {hasPendingEssay && review.score == null && (
              <Text size="xs" c="dimmed" mt={4}>
                {t('exam_result.total_score_after_essay')}
              </Text>
            )}
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_result.point_percent_label')}</Text>
            <Group gap="xs" align="center">
              <Text fw={700} size="xl" c={scoreColor}>
                {pointPercent != null ? `${pointPercent}%` : '—'}
              </Text>
              {pointPercent != null && (
                <Progress value={pointPercent} color={scoreColor} size="sm" w={80} />
              )}
            </Group>
            {fullyCorrectPct != null && (
              <Text size="xs" c="dimmed" mt={4}>
                {t('exam_result.question_correct_percent', { pct: fullyCorrectPct })}
              </Text>
            )}
            {hasEssay && !hasPendingEssay && essayScore.earned != null && (
              <Text size="xs" c="dimmed" mt={4}>
                {t('exam_result.essay_score_summary', {
                  earned: essayScore.earned,
                  max: essayScore.max,
                })}
              </Text>
            )}
          </Paper>
        </Group>

        {learningSummary && topWeakChapters.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Stack gap="sm">
              <Box>
                <Text fw={600}>Đánh giá học tập theo chương</Text>
                <Text size="sm" c="dimmed">
                  Sai {learningSummary.wrong_count}/{learningSummary.total_questions} câu (
                  {Math.round(learningSummary.wrong_rate * 100)}%). Chế độ tổng hợp AI:{' '}
                  <strong>{formatLearningSummaryMode(learningSummary.mode)}</strong>
                </Text>
              </Box>

              <Stack gap="xs">
                {topWeakChapters.map((chapter) => (
                  <Paper key={`${chapter.chapter}-${chapter.chapter_label ?? 'none'}`} withBorder radius="md" p="sm">
                    <Group justify="space-between" align="flex-start" wrap="wrap">
                      <Box>
                        <Text fw={600}>
                          {chapter.chapter_label
                            ? `Chương ${chapter.chapter ?? 0}: ${chapter.chapter_label}`
                            : `Chương ${chapter.chapter ?? 0}`}
                        </Text>
                        <Text size="sm" c="dimmed">
                          Sai {chapter.wrong}/{chapter.total} câu ({Math.round(chapter.wrong_rate * 100)}%)
                        </Text>
                      </Box>
                      <Group gap="xs">
                        <Badge color="green" variant="light">Dễ: {chapter.easy_wrong}</Badge>
                        <Badge color="yellow" variant="light">Trung bình: {chapter.medium_wrong}</Badge>
                        <Badge color="red" variant="light">Khó: {chapter.hard_wrong}</Badge>
                      </Group>
                    </Group>
                  </Paper>
                ))}
              </Stack>

              {learningSummary.representative_wrong_items.length > 0 && (
                <Box>
                  <Text fw={500} mb="xs">Câu sai đại diện</Text>
                  <Stack gap="xs">
                    {learningSummary.representative_wrong_items.map((item) => (
                      <Paper key={`${item.q}-${item.chapter ?? 0}-${item.stem.slice(0, 16)}`} withBorder radius="md" p="sm">
                        <Text size="sm" fw={500}>
                          Câu {item.q}
                          {item.chapter_label ? ` - ${item.chapter_label}` : ''}
                        </Text>
                        <Text size="sm" c="dimmed">{item.stem}</Text>
                        {item.explanation_short && (
                          <Text size="xs" mt={4}>
                            Gợi ý: {item.explanation_short}
                          </Text>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Paper>
        )}

        {hasPendingEssay && (
          <Alert color="yellow" variant="light" icon={<IconAlertCircle size={16} />}>
            {t('exam_result.pending_manual')}
          </Alert>
        )}
        {(hasEssay && !hasPendingEssay) || partialEssay ? (
          <Alert color="yellow" variant="light" icon={<IconCircleHalf2 size={16} />}>
            <Text size="sm" fw={600} mb={4}>{t('exam_result.score_legend_title')}</Text>
            <Stack gap={4}>
              <Group gap="xs">
                <ThemeIcon color="green" size="xs" radius="xl"><IconCheck size={10} /></ThemeIcon>
                <Text size="xs">{t('exam_result.legend_full')}</Text>
              </Group>
              <Group gap="xs">
                <ThemeIcon color="yellow" size="xs" radius="xl"><IconCircleHalf2 size={10} /></ThemeIcon>
                <Text size="xs">{t('exam_result.legend_partial')}</Text>
              </Group>
              <Group gap="xs">
                <ThemeIcon color="red" size="xs" radius="xl"><IconX size={10} /></ThemeIcon>
                <Text size="xs">{t('exam_result.legend_wrong')}</Text>
              </Group>
            </Stack>
          </Alert>
        ) : null}

        <Paper withBorder radius="md" p="md">
          <Title order={4} mb="md">{t('exam_result.review_title')}</Title>
          {questions.length === 0 ? (
            <Text c="dimmed">{t('exam_result.no_questions')}</Text>
          ) : (
            <Accordion variant="separated" radius="md" defaultValue={undefined}>
              {questions.map((q, idx) => {
                const isMcq = q.question_type === 'mcq';
                const essayState = !isMcq ? getEssayGradeState(q) : null;
                const isFullyCorrect = isQuestionFullyCorrect(q);
                const pendingGrading = q.pending_grading || essayState === 'pending';
                const pointsEarned = q.points_earned;
                const maxPts = q.max_points;
                const teacherComment = q.teacher_comment;
                const submitted = q.submitted;
                const correctAnswer = q.correct;

                const getSubmittedLabel = () => {
                  if (pendingGrading) return t('exam_result.pending_grade');
                  if (submitted == null || submitted === '') return t('exam_result.not_answered');
                  if (Array.isArray(submitted)) return submitted.join(', ');
                  return String(submitted);
                };

                const formatMcqAnswer = (key: string | null | undefined) => {
                  if (key == null) return '—';
                  const letter = Array.isArray(key) ? key[0] : key;
                  if (!letter) return '—';
                  return `${letter} – ${getOptionLabel(q.options, String(letter))}`;
                };

                return (
                  <Accordion.Item key={q.question_id} value={q.question_id}>
                    <Accordion.Control
                      icon={
                        <ThemeIcon
                          color={getQuestionStatusColor(q)}
                          size="sm"
                          radius="xl"
                          variant="filled"
                        >
                          {renderStatusIcon(q)}
                        </ThemeIcon>
                      }
                    >
                      <Group justify="space-between" pr="md">
                        <Text fw={600} size="sm">{t('exam_result.question_n', { n: idx + 1 })}</Text>
                        <Group gap="xs">
                          <Badge
                            size="xs"
                            color={q.question_type === 'mcq' ? 'blue' : 'violet'}
                            tt="unset"
                            styles={{ label: { textTransform: 'none' } }}
                          >
                            {q.question_type === 'mcq' ? t('exam_result.type_mcq') : t('exam_result.type_essay')}
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {pointsEarned != null ? `${pointsEarned}/${maxPts}` : maxPts} {t('exam_result.points_unit')}
                          </Text>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        <Box>
                          <Text size="sm" fw={600} mb={4}>{t('exam_result.question_content')}</Text>
                          <Text size="sm">{q.content}</Text>
                        </Box>

                        {q.question_type === 'mcq' && q.options && (
                          <Box>
                            <Text size="xs" c="dimmed" mb={6}>{t('exam_result.options_label')}</Text>
                            <Stack gap={4}>
                              {Object.entries(q.options).map(([key, label]) => {
                                const correctKey = Array.isArray(correctAnswer)
                                  ? correctAnswer[0]
                                  : correctAnswer;
                                const isCorrectOption = correctKey != null && key === String(correctKey);
                                const submittedKey = Array.isArray(submitted)
                                  ? submitted[0]
                                  : submitted;
                                const isSubmittedOption =
                                  !pendingGrading &&
                                  submittedKey != null &&
                                  key === String(submittedKey);
                                return (
                                  <Group
                                    key={key}
                                    gap="xs"
                                    p="xs"
                                    style={{
                                      borderRadius: 8,
                                      border: isCorrectOption
                                        ? '2px solid var(--mantine-color-green-6)'
                                        : '1px solid var(--mantine-color-gray-3)',
                                      background: isSubmittedOption
                                        ? 'var(--mantine-color-blue-0)'
                                        : isCorrectOption
                                          ? 'var(--mantine-color-green-0)'
                                          : undefined,
                                    }}
                                  >
                                    <Badge size="sm" w={24} ta="center" color={isCorrectOption ? 'green' : 'gray'}>
                                      {key}
                                    </Badge>
                                    <Text size="sm" style={{ flex: 1 }}>{label}</Text>
                                    {isCorrectOption && (
                                      <Badge color="green" size="xs">{t('exam_result.correct_badge')}</Badge>
                                    )}
                                    {isSubmittedOption && !isCorrectOption && (
                                      <Badge color="red" size="xs">{t('exam_result.wrong_choice')}</Badge>
                                    )}
                                  </Group>
                                );
                              })}
                            </Stack>
                          </Box>
                        )}

                        <Group align="flex-start" gap="xl">
                          <Box style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed" mb={4}>{t('exam_result.your_answer')}</Text>
                            <Text
                              size="sm"
                              fw={500}
                              c={
                                isMcq
                                  ? isFullyCorrect
                                    ? 'green'
                                    : pendingGrading
                                      ? 'yellow'
                                      : 'red'
                                  : essayState === 'partial'
                                    ? 'yellow.8'
                                    : essayState === 'full'
                                      ? 'green'
                                      : pendingGrading
                                        ? 'yellow'
                                        : 'dimmed'
                              }
                            >
                              {isMcq && !pendingGrading
                                ? formatMcqAnswer(
                                    Array.isArray(submitted) ? submitted[0] : (submitted as string | null)
                                  )
                                : getSubmittedLabel()}
                            </Text>
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Text size="xs" c="dimmed" mb={4}>
                              {isMcq
                                ? t('exam_result.correct_answer')
                                : t('exam_result.essay_grading_label')}
                            </Text>
                            <Text
                              size="sm"
                              fw={500}
                              c={
                                isMcq
                                  ? 'green'
                                  : essayState === 'partial'
                                    ? 'yellow.8'
                                    : essayState === 'full'
                                      ? 'green'
                                      : 'dimmed'
                              }
                            >
                              {isMcq
                                ? formatMcqAnswer(
                                    Array.isArray(correctAnswer) ? correctAnswer[0] : (correctAnswer as string | null)
                                  )
                                : pendingGrading
                                  ? t('exam_result.essay_no_correct_yet')
                                  : essayState === 'partial'
                                    ? t('exam_result.essay_partial_grade', {
                                        earned: pointsEarned ?? 0,
                                        max: maxPts,
                                      })
                                    : essayState === 'full'
                                      ? t('exam_result.essay_full_grade')
                                      : t('exam_result.essay_graded_by_teacher')}
                            </Text>
                          </Box>
                        </Group>

                        {(pointsEarned != null || pendingGrading) && (
                          <Group gap="xs">
                            {!pendingGrading && pointsEarned != null && (
                              <Badge
                                color={
                                  isMcq
                                    ? pointsEarned === maxPts
                                      ? 'green'
                                      : 'red'
                                    : pointsEarned === maxPts
                                      ? 'green'
                                      : pointsEarned > 0
                                        ? 'yellow'
                                        : 'red'
                                }
                              >
                                {pointsEarned}/{maxPts} {t('exam_result.points_unit')}
                              </Badge>
                            )}
                            {pendingGrading && (
                              <Badge color="yellow">{t('exam_result.pending_grade')}</Badge>
                            )}
                            {!isMcq && !pendingGrading && essayState === 'partial' && (
                              <Badge color="yellow" variant="light">
                                {t('exam_result.essay_partial_badge')}
                              </Badge>
                            )}
                          </Group>
                        )}

                        {teacherComment && (
                          <Box p="sm" style={{ background: 'var(--mantine-color-blue-0)', borderRadius: 8 }}>
                            <Text size="xs" c="blue" fw={600} mb={4}>{t('exam_result.teacher_comment')}</Text>
                            <Text size="sm">{teacherComment}</Text>
                          </Box>
                        )}

                        {q.explanation && (
                          <Box p="sm" style={{ background: 'var(--mantine-color-teal-0)', borderRadius: 8 }}>
                            <Text size="xs" c="teal" fw={600} mb={4}>{t('exam_result.explanation')}</Text>
                            <Text size="sm">{q.explanation}</Text>
                          </Box>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          )}
        </Paper>

        <Group>
          <ButtonFilled
            label={t('exam_result.view_prediction')}
            disabled={false}
            onClick={() => navigate('/prediction')}
          />
          <ButtonFilled
            label={t('common.back_exam_list')}
            color="gray"
            disabled={false}
            onClick={() => navigate('/exams')}
          />
        </Group>
      </Stack>
    </Box>
  );
};

export default ExamResult;
