import { useEffect, useState, useCallback, useMemo } from 'react';
import { Box, Title, Text, Progress, Table, Loader, Paper, Group, Alert, Stack, Badge, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi, {
  type PredictionResult,
  type PredictionRecomputeSummary,
  type PredictionEligibility,
} from '@/services/examApi';
import type { SubjectDto } from '@/services/subjectApi';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker';
import { useSubjectPickerCatalog } from '@/hooks/useSubjectPickerCatalog';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import TruncatedText from '@/components/common/TruncatedText';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';

type HistoryRow = {
  subjectId: string | null;
  subject: string;
  score: number;
  grade: string;
  semester: number | null;
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeSubjectsById(list: SubjectDto[]): SubjectDto[] {
  const seen = new Set<string>();
  const out: SubjectDto[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

const Prediction = () => {
  const { t } = useTranslation();

  const formatChapterLabel = (chapter?: number | null, chapterLabel?: string | null): string => {
    if (chapterLabel && typeof chapter === 'number') {
      return t('prediction.chapter_format', { chapter, label: chapterLabel });
    }
    if (chapterLabel) return chapterLabel;
    if (typeof chapter === 'number') return t('prediction.chapter_number_only', { chapter });
    return t('prediction.chapter_unassigned');
  };
  const navigate = useNavigate();
  const { userRole } = useAuth();

  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [pastGrades, setPastGrades] = useState<HistoryRow[]>([]);
  const { groups: pickerGroups, subjects: flatSubjects, loading: catalogLoading } =
    useSubjectPickerCatalog();
  const [targetSubjectId, setTargetSubjectId] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<PredictionEligibility | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [recomputeLoading, setRecomputeLoading] = useState(false);
  const [recomputeSummary, setRecomputeSummary] = useState<PredictionRecomputeSummary | null>(null);
  const [recomputeError, setRecomputeError] = useState('');

  const completedSubjectIds = useMemo(
    () => new Set(pastGrades.map((row) => row.subjectId).filter((id): id is string => Boolean(id))),
    [pastGrades]
  );

  const completedSubjectNames = useMemo(
    () => new Set(pastGrades.map((row) => normalizeName(row.subject)).filter(Boolean)),
    [pastGrades]
  );

  const highestCompletedSemester = useMemo(() => {
    let maxSemester = 0;
    for (const row of pastGrades) {
      if (row.semester != null && row.semester > maxSemester) {
        maxSemester = row.semester;
        continue;
      }
      const matchedSubject =
        (row.subjectId ? flatSubjects.find((subject) => subject.id === row.subjectId) : null) ??
        flatSubjects.find((subject) => normalizeName(subject.name) === normalizeName(row.subject));
      if (matchedSubject && matchedSubject.semester > maxSemester) {
        maxSemester = matchedSubject.semester;
      }
    }
    return maxSemester;
  }, [flatSubjects, pastGrades]);

  const predictionGroups = useMemo(
    () =>
      pickerGroups
        .map((group) => ({
          ...group,
          subjects: group.subjects.filter((subject) => {
            const alreadyCompleted =
              completedSubjectIds.has(subject.id) || completedSubjectNames.has(normalizeName(subject.name));
            if (alreadyCompleted) return false;
            if (highestCompletedSemester > 0 && subject.semester > 0) {
              return subject.semester > highestCompletedSemester;
            }
            return true;
          }),
        }))
        .filter((group) => group.subjects.length > 0),
    [completedSubjectIds, completedSubjectNames, highestCompletedSemester, pickerGroups]
  );

  const availablePredictionSubjects = useMemo(
    () => dedupeSubjectsById(predictionGroups.flatMap((group) => group.subjects)),
    [predictionGroups]
  );

  const hasFuturePredictionTargets = availablePredictionSubjects.length > 0;
  const hasSessionPrediction = Boolean(predictionResult);

  const selectedSubject = useMemo(
    () => availablePredictionSubjects.find((s) => s.id === targetSubjectId) ?? null,
    [availablePredictionSubjects, targetSubjectId]
  );

  const loadStudentView = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const history = await examApi.getMyPredictionHistory();
      const rows: HistoryRow[] = history.map((row) => ({
        subjectId: row.subject_id,
        subject: row.subject,
        score: row.score,
        grade: row.grade,
        semester: row.semester,
      }));

      setPastGrades(rows);

      if (rows.length === 0) {
        setError(t('prediction.no_data'));
        setLoading(false);
        return;
      }

    } catch {
      setError(t('errors.prediction_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void examApi.clearMyPredictionCache().catch(() => undefined);
    return () => {
      setPredictionResult(null);
      setTargetSubjectId(null);
      setEligibility(null);
      setGenerateError('');
      void examApi.clearMyPredictionCache().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (!targetSubjectId) return;
    if (availablePredictionSubjects.some((subject) => subject.id === targetSubjectId)) return;
    setTargetSubjectId(null);
    setEligibility(null);
  }, [availablePredictionSubjects, targetSubjectId]);

  useEffect(() => {
    if (userRole === 'admin') {
      setLoading(false);
      return;
    }
    void loadStudentView();
  }, [userRole, loadStudentView]);

  useEffect(() => {
    if (!targetSubjectId) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    setEligibilityLoading(true);
    void examApi
      .getPredictionEligibility(targetSubjectId)
      .then((data) => {
        if (!cancelled) setEligibility(data);
      })
      .catch(() => {
        if (!cancelled) setEligibility(null);
      })
      .finally(() => {
        if (!cancelled) setEligibilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetSubjectId]);

  const handleGenerate = async () => {
    if (!targetSubjectId) return;
    setGenerateLoading(true);
    setGenerateError('');
    try {
      const result = await examApi.generateMyPrediction(targetSubjectId);
      setPredictionResult(result);
    } catch (e: unknown) {
      const resp = e as { response?: { status?: number; data?: { message?: string; code?: string } } };
      const status = resp.response?.status;
      const msg = resp.response?.data?.message;
      if (status === 408 || resp.response?.data?.code === 'prediction_timeout') {
        setGenerateError(t('prediction.generate_timeout'));
      } else {
        setGenerateError(msg || t('errors.prediction_failed'));
      }
    } finally {
      setGenerateLoading(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputeLoading(true);
    setRecomputeError('');
    setRecomputeSummary(null);
    try {
      const summary = await examApi.adminRecomputeAllPredictions();
      setRecomputeSummary(summary);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
          ? (e as { response: { data: { message: string } } }).response.data.message
          : t('errors.prediction_failed');
      setRecomputeError(msg);
    } finally {
      setRecomputeLoading(false);
    }
  };

  const canGenerate =
    hasFuturePredictionTargets &&
    Boolean(targetSubjectId) &&
    eligibility?.eligible === true &&
    !generateLoading &&
    !eligibilityLoading;

  const overviewRemark =
    predictionResult?.learning_assessment?.remark?.trim() ||
    predictionResult?.overall_advice?.trim() ||
    predictionResult?.just_completed?.analysis?.trim() ||
    '';

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (userRole === 'admin') {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Stack gap="md">
          <Title order={2}>{t('prediction.title')}</Title>
          <Text c="dimmed">{t('prediction.admin_intro')}</Text>
          <Alert color="blue" variant="light">
            {t('prediction.admin_note')}
          </Alert>
          <Button loading={recomputeLoading} onClick={() => void handleRecompute()}>
            {t('prediction.admin_recompute')}
          </Button>
          {recomputeError && (
            <Alert color="red" variant="light">
              {recomputeError}
            </Alert>
          )}
          {recomputeSummary && (
            <Paper withBorder radius="md" p="md">
              <Text fw={600} mb="sm">{t('prediction.admin_summary_title')}</Text>
              <Text size="sm">
                {t('prediction.admin_summary_line', {
                  total: recomputeSummary.total_students,
                  computed: recomputeSummary.computed,
                  skipped: recomputeSummary.skipped_no_data,
                  failed: recomputeSummary.failed,
                })}
              </Text>
            </Paper>
          )}
          <ButtonFilled
            style={{ marginTop: 8 }}
            label={t('common.back_main')}
            disabled={false}
            onClick={() => navigate('/main')}
          />
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Alert color="red" variant="light">
          {error}
        </Alert>
        <ButtonFilled style={{ marginTop: 8 }} label={t('common.back_main')} disabled={false} onClick={() => navigate('/main')} />
      </Box>
    );
  }

  const targetPrediction =
    predictionResult?.predictions.find(
      (p) => p.subject === predictionResult.target_subject || p.subject === selectedSubject?.name
    ) ?? predictionResult?.predictions[0];
  const forecastSubjectName =
    predictionResult?.target_subject ?? targetPrediction?.subject ?? selectedSubject?.name ?? '—';
  const forecastScore =
    predictionResult?.learning_assessment?.quantitative?.predicted_score ??
    targetPrediction?.predicted_score ??
    0;
  const forecastGrade =
    predictionResult?.learning_assessment?.quantitative?.predicted_grade ??
    targetPrediction?.grade ??
    '—';

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('prediction.title')}</Title>
        <Text c="dimmed">{t('prediction.subtitle_student')}</Text>

        {!hasFuturePredictionTargets && (
          <Alert color="blue" variant="light" title={t('prediction.assessment_only_title')}>
            <Text size="sm">{t('prediction.no_future_subjects')}</Text>
            {highestCompletedSemester > 0 && (
              <Text size="sm" mt="xs">
                {t('prediction.latest_completed_semester', { semester: highestCompletedSemester })}
              </Text>
            )}
          </Alert>
        )}

        {hasFuturePredictionTargets && (
          <>
            <SubjectCategoryPicker
              label={t('prediction.target_subject_label')}
              placeholder={t('prediction.target_subject_placeholder')}
              externalGroups={predictionGroups}
              catalogLoading={catalogLoading}
              searchMode="global"
              value={targetSubjectId}
              onChange={setTargetSubjectId}
              helperText={
                highestCompletedSemester > 0
                  ? t('prediction.target_subject_helper', { semester: highestCompletedSemester })
                  : undefined
              }
              required
            />

            {eligibilityLoading && (
              <Text size="sm" c="dimmed">{t('prediction.checking_eligibility')}</Text>
            )}

            {eligibility && !eligibility.eligible && (
              <Alert color="orange" variant="light" title={t('prediction.insufficient_title')}>
                {eligibility.message}
                {eligibility.missing_prerequisites.length > 0 && (
                  <Text size="sm" mt="xs">
                    {t('prediction.missing_prereq', {
                      list: eligibility.missing_prerequisites.join(', '),
                    })}
                  </Text>
                )}
              </Alert>
            )}

            {eligibility?.eligible && (
              <Alert color="green" variant="light">
                {eligibility.message}
                {eligibility.group_labels.length > 0 && (
                  <Text size="xs" mt={4} c="dimmed">
                    {t('prediction.group_hint', { groups: eligibility.group_labels.join(', ') })}
                  </Text>
                )}
              </Alert>
            )}

            <Group>
              <Button loading={generateLoading} disabled={!canGenerate} onClick={() => void handleGenerate()}>
                {predictionResult ? t('prediction.regenerate') : t('prediction.generate')}
              </Button>
            </Group>

            {generateError && (
              <Alert color="red" variant="light">
                {generateError}
              </Alert>
            )}
          </>
        )}

        {hasSessionPrediction && predictionResult?.target_subject && (
          <Text size="sm" c="dimmed">
            {t('prediction.result_for', { subject: predictionResult.target_subject })}
          </Text>
        )}

        {hasSessionPrediction && predictionResult?.just_completed && (
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed" mb="xs">{t('prediction.context_exam')}</Text>
            <Group justify="space-between" mb="xs">
              <Text fw={600}>{predictionResult.just_completed.subject}</Text>
              <Badge>{predictionResult.just_completed.grade}</Badge>
            </Group>
            <Text size="sm" c="dimmed">
              {predictionResult.just_completed.score}/10 — {predictionResult.just_completed.vs_class_avg}
            </Text>
          </Paper>
        )}

        {hasSessionPrediction &&
          (predictionResult?.learning_assessment || overviewRemark) && (
          <Paper withBorder radius="md" p="md">
            <Text fw={700} mb="md">{t('prediction.assessment_title')}</Text>
            <Stack gap="sm">
              {overviewRemark && (
              <Box>
                <Text size="sm" c="dimmed">{t('prediction.assessment_remark')}</Text>
                <Text size="sm" mt={4}>{overviewRemark}</Text>
              </Box>
              )}
              {predictionResult?.learning_assessment?.weaknesses &&
                predictionResult.learning_assessment.weaknesses.length > 0 && (
                <Box>
                  <Text size="sm" c="dimmed">{t('prediction.assessment_weaknesses')}</Text>
                  <Stack gap={4} mt={4}>
                    {predictionResult.learning_assessment.weaknesses.map((line, i) => (
                      <Text key={i} size="sm">• {line}</Text>
                    ))}
                  </Stack>
                </Box>
              )}
              {predictionResult?.learning_assessment?.advice &&
                predictionResult.learning_assessment.advice.length > 0 && (
                <Alert color="blue" variant="default" title={t('prediction.advice_title')}>
                  <Stack gap={4}>
                    {predictionResult.learning_assessment.advice.map((line, i) => (
                      <Text key={i} size="sm">• {line}</Text>
                    ))}
                  </Stack>
                </Alert>
              )}
            </Stack>
          </Paper>
        )}

        {hasSessionPrediction && (predictionResult?.learning_assessment?.quantitative || targetPrediction) && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.forecast_title')}</Text>
            <Group grow>
              <Paper withBorder radius="md" p="md">
                <Text size="sm" c="dimmed">{t('prediction.predicted_score_label')}</Text>
                <Group gap="xs" align="flex-end">
                  <Text fw={700} size="xl">
                    {forecastScore.toFixed(1)}/10
                  </Text>
                  <Badge color="blue">
                    {forecastGrade}
                  </Badge>
                </Group>
                {targetPrediction && (
                  <Progress
                    value={targetPrediction.predicted_score * 10}
                    mt="xs"
                    color={
                      targetPrediction.predicted_score >= 8
                        ? 'green'
                        : targetPrediction.predicted_score >= 6
                          ? 'blue'
                          : 'orange'
                    }
                  />
                )}
              </Paper>
              {predictionResult?.learning_assessment?.quantitative && (
                <Paper withBorder radius="md" p="md">
                  <Text size="sm" c="dimmed">{t('prediction.class_avg_label')}</Text>
                  <Text fw={700} size="xl">
                    {predictionResult.learning_assessment.quantitative.class_avg.toFixed(1)}/10
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    {t('prediction.percentile_label')}:{' '}
                    {predictionResult.learning_assessment.quantitative.percentile}%
                  </Text>
                </Paper>
              )}
              {targetPrediction && !predictionResult?.learning_assessment?.quantitative && (
                <Paper withBorder radius="md" p="md">
                  <Text size="sm" c="dimmed">{t('prediction.readiness')}</Text>
                  <Text fw={700} size="xl">
                    {targetPrediction.confidence >= 0.8
                      ? t('prediction.readiness_high')
                      : targetPrediction.confidence >= 0.6
                        ? t('prediction.readiness_medium')
                        : t('prediction.readiness_low')}
                  </Text>
                  <Text size="xs" c="dimmed" mt="xs">
                    R² ≈ {targetPrediction.confidence.toFixed(2)}
                  </Text>
                </Paper>
              )}
            </Group>
            <Alert color="yellow" variant="light" mt="md">
              <Text size="sm" fw={600}>
                {t('prediction.forecast_reference_subject', { subject: forecastSubjectName })}
                : {forecastScore.toFixed(1)} / 10
              </Text>
              <Text size="sm" mt={4}>
                {t('prediction.forecast_reference_notice')}
              </Text>
            </Alert>
            {targetPrediction?.reasoning && (
              <Text size="xs" c="dimmed" mt="sm" lineClamp={4}>
                {targetPrediction.reasoning}
              </Text>
            )}
          </Paper>
        )}

        {hasSessionPrediction &&
          !predictionResult?.learning_assessment &&
          predictionResult?.improvement &&
          predictionResult.improvement.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.improvement_title')}</Text>
            <Stack gap={4}>
              {predictionResult.improvement.map((line, i) => (
                <Text key={i} size="sm">• {line}</Text>
              ))}
            </Stack>
          </Paper>
        )}

        {hasSessionPrediction && predictionResult?.weak_chapters && predictionResult.weak_chapters.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.weak_chapters_title')}</Text>
            <Stack gap="xs">
              {predictionResult.weak_chapters.map((item, i) => (
                <Box key={`${item.label}-${i}`}>
                  <Text size="sm" fw={500}>
                    {item.label}
                  </Text>
                  <Text size="sm" c="dimmed">
                    {t('prediction.weak_chapter_wrong', {
                      count: item.wrong_count,
                      questions: item.question_numbers
                        .map((q) => t('prediction.question_short', { q }))
                        .join(', '),
                    })}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {hasSessionPrediction && predictionResult?.wrong_summary && predictionResult.wrong_summary.length > 0 && (
          <Paper withBorder radius="md" p="md">
            <Text fw={600} mb="sm">{t('prediction.wrong_summary_title')}</Text>
            <Stack gap="xs">
              {predictionResult.wrong_summary.map((w) => (
                <Box key={w.q}>
                  <Text size="sm" fw={500}>{t('prediction.wrong_item', { q: w.q })}</Text>
                  <Text size="xs" c="dimmed">
                    {formatChapterLabel(w.chapter, w.chapter_label)}
                  </Text>
                  <Text size="sm" c="dimmed">{w.stem}</Text>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        {pastGrades.length > 0 && (
          <Paper withBorder radius="md" p="sm">
            <Text fw={600} mb="sm">{t('prediction.history')}</Text>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('prediction.subject')}</Table.Th>
                  <Table.Th>{t('prediction.score')}</Table.Th>
                  <Table.Th>{t('prediction.grade')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pastGrades.map((item, i) => (
                  <Table.Tr key={item.subjectId ?? `${item.subject}-${i}`}>
                    <Table.Td>
                      <TruncatedText maxWidth={360}>{item.subject}</TruncatedText>
                    </Table.Td>
                    <Table.Td>{item.score > 0 ? `${item.score}/10` : '—'}</Table.Td>
                    <Table.Td>
                      <Badge size="sm">{item.grade}</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        <ButtonFilled
          style={{ marginTop: 8 }}
          label={t('common.back_main')}
          disabled={false}
          onClick={() => navigate('/main')}
        />
      </Stack>
    </Box>
  );
};

export default Prediction;
