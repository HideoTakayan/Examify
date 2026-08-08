import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, Modal, Textarea, Button, ScrollArea, SimpleGrid, Tooltip,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi, { type ExamSession, type ExamRetakeGrant } from '@/services/examApi';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';

type SessionTag = NonNullable<ExamSession['session_tags']>[number];

const TAG_COLORS: Record<SessionTag, string> = {
  submitted: 'green',
  disconnected: 'red',
  violations_exceeded: 'grape',
  retake_pending: 'orange',
  retake_session: 'violet',
  voided: 'gray',
};

function TruncatedBadge({
  label,
  color,
  size = 'sm',
}: {
  label: string;
  color: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <Tooltip label={label} withArrow multiline maw={280}>
      <Badge
        variant="light"
        color={color}
        size={size}
        tt="none"
        style={{
          maxWidth: 100,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'inline-block',
          verticalAlign: 'middle',
        }}
      >
        {label}
      </Badge>
    </Tooltip>
  );
}

const ExamSessions = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [retakeGrants, setRetakeGrants] = useState<ExamRetakeGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [sessionStats, setSessionStats] = useState<ExamSession[]>([]);

  const [retakeOpen, setRetakeOpen] = useState(false);
  const [retakeTarget, setRetakeTarget] = useState<ExamSession | null>(null);
  const [retakeReason, setRetakeReason] = useState('');
  const [retakeSubmitting, setRetakeSubmitting] = useState(false);
  const [revokingGrantId, setRevokingGrantId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!examId) return;
    try {
      setLoading(true);
      setError('');
      const [pageData, grants] = await Promise.all([
        examApi.listExamSessions(examId, {
          limit: pageSize,
          offset: pageToOffset(page, pageSize),
        }),
        examApi.listRetakeGrants(examId),
      ]);
      setSessions(pageData.items);
      setTotal(pageData.total);
      setRetakeGrants(grants);
      if (page === 1) {
        const all = await examApi.listExamSessions(examId, { limit: 500, offset: 0 });
        setSessionStats(all.items);
      }
    } catch {
      setError(t('errors.session_list_failed'));
    } finally {
      setLoading(false);
    }
  }, [examId, page, pageSize, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const approvedGrantByStudent = useMemo(() => {
    const map = new Map<string, ExamRetakeGrant>();
    for (const g of retakeGrants) {
      if (g.status === 'approved') map.set(g.student_id, g);
    }
    return map;
  }, [retakeGrants]);

  const statsSource = sessionStats.length > 0 ? sessionStats : sessions;

  const sessionStatusLabel = (status: ExamSession['status']) => {
    if (status === 'submitted') return t('exam_sessions.status_submitted');
    if (status === 'active') return t('exam_sessions.status_active');
    if (status === 'expired') return t('exam_sessions.status_expired');
    return status;
  };

  const gradingStatusLabel = (grading: ExamSession['grading_status']) => {
    if (grading === 'pending_manual') return t('exam_sessions.pending_manual');
    if (grading === 'complete') return t('exam_sessions.graded');
    return t('exam_sessions.grading_none');
  };

  const tagLabel = (tag: SessionTag) => {
    const key = `exam_sessions.tag_${tag}` as const;
    return t(key);
  };

  const formatScorePair = (score: number | null | undefined, max: number | null | undefined) => {
    if (score == null || max == null) return '—';
    return `${score}/${max}`;
  };

  const summary = useMemo(() => {
    const rows = statsSource.filter((s) => !s.voided_at);
    return {
      submitted: rows.filter((s) => s.status === 'submitted').length,
      active: rows.filter((s) => s.status === 'active').length,
      pendingGrading: rows.filter((s) => s.grading_status === 'pending_manual').length,
      retakeGranted: approvedGrantByStudent.size,
    };
  }, [approvedGrantByStudent.size, statsSource]);

  const openRetakeModal = (session: ExamSession) => {
    setRetakeTarget(session);
    setRetakeReason('');
    setRetakeOpen(true);
  };

  const handleGrantRetake = async () => {
    if (!examId || !retakeTarget) return;
    const reason = retakeReason.trim();
    if (!reason) {
      setError(t('exam_retake.reason_required'));
      return;
    }
    try {
      setRetakeSubmitting(true);
      setError('');
      await examApi.grantRetake(examId, {
        student_id: retakeTarget.student_id,
        reason,
      });
      setNotice(t('exam_retake.grant_success'));
      setRetakeOpen(false);
      setRetakeTarget(null);
      void loadData();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('exam_retake.grant_failed'));
    } finally {
      setRetakeSubmitting(false);
    }
  };

  const handleRevokeRetake = async (grantId: string) => {
    if (!examId) return;
    if (!window.confirm(t('exam_retake.revoke_confirm'))) return;
    try {
      setRevokingGrantId(grantId);
      setError('');
      await examApi.revokeRetake(examId, grantId);
      setNotice(t('exam_retake.revoke_success'));
      void loadData();
    } catch {
      setError(t('exam_retake.revoke_failed'));
    } finally {
      setRevokingGrantId(null);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  const pendingGrading = statsSource.filter(
    (s) => s.grading_status === 'pending_manual' && !s.voided_at
  );
  const versionCountLabel = (() => {
    const map = new Map<string, number>();
    for (const s of statsSource) {
      if (s.voided_at) continue;
      const code = s.version_code ?? '—';
      map.set(code, (map.get(code) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, n]) => `${code}: ${n}`)
      .join(' · ');
  })();

    return (
      <Box className="w-full max-w-[1400px] mx-auto p-4 md:p-6">
      <Stack gap="md">
        <PageHeader
          title={t('exam_sessions.title')}
          subtitle={t('exam_sessions.subtitle')}
          accent="teal"
          action={
            <Group gap="xs">
              <Badge color="blue" size="lg">{total} {t('exam_sessions.total')}</Badge>
              {total > 0 && versionCountLabel && (
                <Badge color="violet" size="lg" variant="light">
                  {versionCountLabel}
                </Badge>
              )}
            </Group>
          }
        />

        {notice && <Alert color="green" variant="light" onClose={() => setNotice('')}>{notice}</Alert>}
        {error && <Alert color="red" variant="light">{error}</Alert>}

        {pendingGrading.length > 0 && (
          <Alert color="yellow" variant="light">
            {t('exam_sessions.pending_grading_alert', { count: pendingGrading.length })}
          </Alert>
        )}

        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">{t('exam_sessions.stat_submitted')}</Text>
            <Text fw={700} size="xl" c="green">{summary.submitted}</Text>
          </Paper>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">{t('exam_sessions.stat_active')}</Text>
            <Text fw={700} size="xl" c="orange">{summary.active}</Text>
          </Paper>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">{t('exam_sessions.stat_pending_grading')}</Text>
            <Text fw={700} size="xl" c="yellow.8">{summary.pendingGrading}</Text>
          </Paper>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">{t('exam_sessions.stat_retake_granted')}</Text>
            <Text fw={700} size="xl" c="violet">{summary.retakeGranted}</Text>
          </Paper>
        </SimpleGrid>

        <Paper withBorder radius="md">
          <ListPaginationBar
            page={page}
            total={total}
            limit={pageSize}
            onPageChange={setPage}
            onLimitChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
          <ScrollArea type="auto" offsetScrollbars>
          <Table striped highlightOnHover layout="fixed" miw={1100}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={48}>#</Table.Th>
                <Table.Th w={220}>{t('exam_sessions.student')}</Table.Th>
                <Table.Th w={72}>{t('exam_sessions.version_code')}</Table.Th>
                <Table.Th w={100}>{t('exam_sessions.status')}</Table.Th>
                <Table.Th w={200}>{t('exam_sessions.tags')}</Table.Th>
                <Table.Th w={120}>{t('exam_sessions.score')}</Table.Th>
                <Table.Th w={130}>{t('exam_sessions.grading_status')}</Table.Th>
                <Table.Th w={150}>{t('exam_sessions.submitted_at')}</Table.Th>
                <Table.Th w={200}>{t('exam_sessions.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.map((session, idx) => {
                const isVoided = Boolean(session.voided_at);
                const approvedGrant = approvedGrantByStudent.get(session.student_id);
                const canGrantRetake =
                  session.status === 'submitted' && !isVoided && !approvedGrant;
                return (
                  <Table.Tr key={session.id} style={isVoided ? { opacity: 0.55 } : undefined}>
                    <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} lineClamp={1}>
                        {session.student_name || session.full_name || session.student_id}
                      </Text>
                      {approvedGrant && (
                        <TruncatedBadge
                          size="xs"
                          color="orange"
                          label={t('exam_retake.grant_pending')}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.version_code ?? '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      {isVoided ? (
                        <TruncatedBadge color="gray" label={t('exam_retake.session_voided')} />
                      ) : (
                        <TruncatedBadge
                          color={
                            session.status === 'submitted'
                              ? 'green'
                              : session.status === 'active'
                                ? 'orange'
                                : 'gray'
                          }
                          label={sessionStatusLabel(session.status)}
                        />
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="wrap">
                        {(session.session_tags ?? []).map((tag) => (
                          <TruncatedBadge
                            key={tag}
                            size="xs"
                            color={TAG_COLORS[tag]}
                            label={tagLabel(tag)}
                          />
                        ))}
                        {(session.session_tags ?? []).length === 0 && (
                          <Text size="xs" c="dimmed">—</Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      {session.previous_score != null &&
                      session.score != null &&
                      !isVoided ? (
                        <Text size="sm" fw={500}>
                          {t('exam_sessions.score_retake_compare', {
                            before: formatScorePair(
                              session.previous_score,
                              session.previous_max_points
                            ),
                            after: formatScorePair(session.score, session.max_points),
                          })}
                        </Text>
                      ) : (
                        <Text size="sm" fw={500}>
                          {formatScorePair(session.score, session.max_points)}
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {!isVoided && (
                        <Tooltip
                          label={gradingStatusLabel(session.grading_status)}
                          withArrow
                          multiline
                          maw={280}
                          disabled={!session.grading_status}
                        >
                          <Text
                            size="sm"
                            c={session.grading_status === 'pending_manual' ? 'yellow.8' : 'green.7'}
                            fw={session.grading_status === 'pending_manual' ? 600 : 500}
                            lineClamp={1}
                            style={{ cursor: 'default' }}
                          >
                            {gradingStatusLabel(session.grading_status)}
                          </Text>
                        </Tooltip>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {session.submitted_at
                          ? new Date(session.submitted_at).toLocaleString()
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={6} align="stretch">
                        {!isVoided && (
                          <Button
                            size="xs"
                            variant="light"
                            color="blue"
                            onClick={() => navigate(`/grading/${session.id}`)}
                          >
                            {session.grading_status === 'complete'
                              ? t('exam_sessions.view_grading_done')
                              : t('exam_sessions.view_grading')}
                          </Button>
                        )}
                        {canGrantRetake && (
                          <Button
                            size="xs"
                            variant="light"
                            color="orange"
                            onClick={() => openRetakeModal(session)}
                          >
                            {t('exam_retake.grant_btn')}
                          </Button>
                        )}
                        {approvedGrant?.superseded_session_id === session.id && (
                          <Button
                            size="xs"
                            variant="subtle"
                            color="red"
                            loading={revokingGrantId === approvedGrant.id}
                            onClick={() => void handleRevokeRetake(approvedGrant.id)}
                          >
                            {t('exam_retake.revoke_btn')}
                          </Button>
                        )}
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
              {sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={9}>
                    <Text c="dimmed" ta="center">{t('exam_sessions.no_sessions')}</Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
          </ScrollArea>
        </Paper>

        <Group>
          <ButtonLight
            size="sm"
            color="gray"
            label={t('common.back')}
            disabled={false}
            onClick={() => navigate('/exams')}
          />
        </Group>
      </Stack>

      <Modal
        opened={retakeOpen}
        onClose={() => setRetakeOpen(false)}
        title={t('exam_retake.modal_title')}
        centered
      >
        <Stack gap="sm">
          <Text size="sm">
            {t('exam_retake.modal_student', {
              name: retakeTarget?.student_name || retakeTarget?.student_id || '—',
            })}
          </Text>
          <Textarea
            label={t('exam_retake.reason_label')}
            placeholder={t('exam_retake.reason_placeholder')}
            value={retakeReason}
            onChange={(e) => setRetakeReason(e.currentTarget.value)}
            minRows={3}
            required
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => setRetakeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button color="orange" loading={retakeSubmitting} onClick={() => void handleGrantRetake()}>
              {t('exam_retake.confirm_btn')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ExamSessions;
