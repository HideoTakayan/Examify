import { useEffect, useState, useRef, useCallback } from 'react';
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Alert, Stack, TextInput, Select, Button, Modal, Tooltip,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconUsers, IconAlertCircle, IconSend } from '@tabler/icons-react';
import examApi, { type ExamProctoringData } from '@/services/examApi';
import { MAX_INTEGRITY_STRIKES } from '@/services/examIntegrityStrikes';
import appConfig from '@/configs/app.config';
import { createProctoringSocket, requestPresence, sendGroupBroadcast, leaveProctoring, type PresencePayload } from '@/services/proctoringSocket';
import { shouldForceSocketPolling } from '@/utils/socketTransport';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';
import type { Socket } from 'socket.io-client';

type ProctoringSession = ExamProctoringData['sessions'][number];

const POLL_INTERVAL_MS = 10_000;

const EVENT_LABELS: Record<string, string> = {
  exam_opened: 'Mở đề',
  fullscreen_enter: 'Vào fullscreen',
  fullscreen_exit: 'Thoát fullscreen',
  fullscreen_error: 'Lỗi fullscreen',
  visibility_hidden: 'Chuyển tab',
  window_blur: 'Mất focus',
  window_focus: 'Quay lại',
  copy_attempt: 'Copy',
  paste_attempt: 'Paste',
  context_menu: 'Menu chuột phải',
  before_unload: 'Thoát trang',
};

const ProctoringDashboard = () => {
  const { t } = useTranslation();
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ExamProctoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [socketError, setSocketError] = useState('');
  const [examTitle, setExamTitle] = useState('');
  const [alertingSession, setAlertingSession] = useState<string | null>(null);
  const [forceSubmittingAll, setForceSubmittingAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [presence, setPresence] = useState<PresencePayload | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting'|'connected'|'disconnected'|'reconnecting'>('connecting');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastGroup, setBroadcastGroup] = useState<'all'|'violators'|'active'>('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [realtimeAlert, setRealtimeAlert] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const { accessToken } = useAuth();

  const refreshProctoring = useCallback(async (opts?: { silent?: boolean }) => {
    if (!examId) return;
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setRefreshing(true);
      const [d, examMeta] = await Promise.all([
        examApi.getExamProctoring(examId),
        examApi.getExam(examId).catch(() => null),
      ]);
      setData(d);
      if (examMeta?.title) setExamTitle(examMeta.title);
      setError('');
    } catch {
      if (!silent) setError(t('proctoring.load_failed'));
    } finally {
      if (!silent) setRefreshing(false);
    }
  }, [examId, t]);

  useEffect(() => {
    if (!examId) return;
    const load = async () => {
      setLoading(true);
      await refreshProctoring();
      setLoading(false);
    };
    void load();
  }, [examId, refreshProctoring]);

  // Poll định kỳ để cập nhật phiên / vi phạm (kể cả khi chưa có SV active)
  useEffect(() => {
    if (!examId) return;
    refreshTimerRef.current = window.setInterval(() => {
      void refreshProctoring({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => {
      if (refreshTimerRef.current != null) {
        window.clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [examId, refreshProctoring]);

  // Proctoring socket
  useEffect(() => {
    if (!examId || !accessToken) return;

    const socket = createProctoringSocket({
      baseUrl: appConfig.apiURL,
      token: accessToken,
      examId,
      forcePolling: shouldForceSocketPolling(),
      handlers: {
        onConnect: () => {
          setConnectionStatus('connected');
          setSocketError('');
          requestPresence(socket, examId);
        },
        onDisconnect: () => setConnectionStatus('disconnected'),
        onReconnecting: () => setConnectionStatus('reconnecting'),
        onPresenceUpdate: (p) => setPresence(p),
        onIntegrityUpdate: () => {
          void refreshProctoring({ silent: true });
        },
        onGroupAlert: (p) => {
          setRealtimeAlert(p.message);
          setTimeout(() => setRealtimeAlert(null), 5000);
        },
        onBroadcastSent: () => {
          setBroadcastOpen(false);
          setBroadcastMessage('');
        },
        onError: (msg) => setSocketError(`${t('proctoring.socket_error')}: ${msg}`),
      },
    });
    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        leaveProctoring(socketRef.current, examId);
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [examId, accessToken, refreshProctoring, t]);

  const handleBroadcast = useCallback(() => {
    if (!socketRef.current || !broadcastMessage.trim()) return;
    sendGroupBroadcast(socketRef.current, examId!, broadcastGroup, broadcastMessage);
  }, [examId, broadcastGroup, broadcastMessage]);

  const handleForceSubmit = async (sessionId: string, studentLabel: string) => {
    if (!examId) return;
    const ok = window.confirm(
      t('proctoring.force_submit_one_confirm', { name: studentLabel })
    );
    if (!ok) return;
    try {
      setAlertingSession(sessionId);
      await examApi.forceSubmitSession(sessionId);
      await refreshProctoring({ silent: true });
    } catch {
      setError(t('proctoring.force_submit_failed'));
    } finally {
      setAlertingSession(null);
    }
  };

  const handleForceSubmitAll = async () => {
    if (!examId) return;
    const ok = window.confirm(t('proctoring.force_submit_all_confirm'));
    if (!ok) return;
    try {
      setForceSubmittingAll(true);
      await examApi.forceSubmitExam(examId);
      await refreshProctoring({ silent: true });
    } catch {
      setError(t('proctoring.force_submit_failed'));
    } finally {
      setForceSubmittingAll(false);
    }
  };

  const getViolationBadge = (count: number) => {
    if (count === 0) return <Badge color="gray" size="sm">{t('proctoring.violation_none')}</Badge>;
    if (count < MAX_INTEGRITY_STRIKES) {
      return <Badge color="yellow" size="sm">{t('proctoring.violation_count', { count })}</Badge>;
    }
    return <Badge color="red" size="sm">{t('proctoring.violation_count', { count })}</Badge>;
  };

  const getStatusBadge = (status: ProctoringSession['status']) => {
    const map: Record<string, { color: string; labelKey: string }> = {
      active: { color: 'orange', labelKey: 'proctoring.status_active' },
      submitted: { color: 'green', labelKey: 'proctoring.status_submitted' },
      expired: { color: 'gray', labelKey: 'proctoring.status_expired' },
    };
    const { color, labelKey } = map[status] ?? { color: 'gray', labelKey: status };
    return <Badge color={color} size="sm">{t(labelKey)}</Badge>;
  };

  if (loading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Loader />
      </Box>
    );
  }

  if (error && !data) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Alert color="red" variant="light">{error}</Alert>
      </Box>
    );
  }

  if (!data) return null;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        {socketError && (
          <Alert color="orange" variant="light" title={t('proctoring.socket_error')}>
            {socketError}
          </Alert>
        )}
        <PageHeader
          title={examTitle || t('proctoring.title')}
          subtitle={t('proctoring.subtitle')}
          accent="teal"
          action={
            <ButtonLight
              size="sm"
              label={t('common.back')}
              disabled={false}
              onClick={() => navigate(-1)}
            />
          }
        />

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('proctoring.total_sessions')}</Text>
            <Text fw={700} size="xl">{data.total_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('proctoring.active')}</Text>
            <Text fw={700} size="xl" c="orange">{data.active_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('proctoring.submitted')}</Text>
            <Text fw={700} size="xl" c="green">{data.submitted_sessions}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('proctoring.expired')}</Text>
            <Text fw={700} size="xl" c="gray">{data.expired_sessions}</Text>
          </Paper>
        </Group>

        {data.active_sessions > 0 && (
          <Alert color="orange" variant="light">
            {t('proctoring.active_alert', { count: data.active_sessions })}
          </Alert>
        )}

        {/* Presence indicator + Broadcast button */}
        <Group justify="space-between">
          <Group gap="sm">
            {presence && (
              <Tooltip label={t('proctoring.presence_tooltip', {
                teachers: presence.teachers,
                admins: presence.admins,
                students: presence.students,
              })}>
                <Badge leftSection={<IconUsers size={14} />} color="teal" size="lg" variant="light">
                  {t('proctoring.presence_count', { count: presence.total })}
                </Badge>
              </Tooltip>
            )}
            <Badge
              color={
                connectionStatus === 'connected' ? 'green'
                : connectionStatus === 'reconnecting' ? 'orange'
                : connectionStatus === 'connecting' ? 'yellow'
                : 'red'
              }
              size="sm"
              variant="light"
            >
              {connectionStatus === 'connected' ? t('proctoring.live') : connectionStatus}
            </Badge>
            {refreshing && (
              <Badge size="sm" variant="light" color="blue">{t('proctoring.refreshing')}</Badge>
            )}
            {realtimeAlert && (
              <Alert color="blue" variant="light" p="xs" py={4} px="sm">
                <Text size="xs">{realtimeAlert}</Text>
              </Alert>
            )}
          </Group>
          <Button
            size="sm"
            variant="outline"
            color="red"
            loading={forceSubmittingAll}
            disabled={forceSubmittingAll || (data?.active_sessions ?? 0) === 0}
            onClick={() => void handleForceSubmitAll()}
          >
            {t('proctoring.force_submit_all')}
          </Button>
          <Button
            size="sm"
            leftSection={<IconSend size={14} />}
            onClick={() => setBroadcastOpen(true)}
            variant="light"
            color="teal"
          >
            {t('proctoring.broadcast_button')}
          </Button>
        </Group>

        {/* Broadcast modal */}
        <Modal opened={broadcastOpen} onClose={() => setBroadcastOpen(false)} title={t('proctoring.broadcast_title')} centered>
          <Stack gap="sm">
            <Select
              label={t('proctoring.broadcast_group')}
              value={broadcastGroup}
              onChange={(v) => setBroadcastGroup(v as 'all' | 'violators' | 'active')}
              data={[
                { value: 'all', label: t('proctoring.broadcast_all') },
                { value: 'active', label: t('proctoring.broadcast_active') },
                { value: 'violators', label: t('proctoring.broadcast_violators') },
              ]}
            />
            <TextInput
              label={t('proctoring.broadcast_message')}
              placeholder={t('proctoring.broadcast_placeholder')}
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            />
            <Button onClick={handleBroadcast} color="teal" disabled={!broadcastMessage.trim()}>
              Gửi
            </Button>
          </Stack>
        </Modal>

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('proctoring.student')}</Table.Th>
                <Table.Th>{t('proctoring.status')}</Table.Th>
                <Table.Th>{t('proctoring.started_at')}</Table.Th>
                <Table.Th>{t('proctoring.score')}</Table.Th>
                <Table.Th>{t('proctoring.violations')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.sessions.map((session, idx) => (
                <React.Fragment key={session.session_id}>
                  <Table.Tr>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>{session.student_name || session.student_id}</Text>
                        <Text size="xs" c="dimmed">{session.student_email || '—'}</Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>{getStatusBadge(session.status)}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(session.started_at).toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {session.score != null ? `${session.score}/${session.max_points}` : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>{getViolationBadge(session.violation_count)}</Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ButtonLight
                          size="xs"
                          color={expandedRow === session.session_id ? 'blue' : 'gray'}
                          label={expandedRow === session.session_id ? 'Ẩn log' : 'Xem log'}
                          disabled={false}
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === session.session_id ? null : session.session_id
                            )
                          }
                        />
                        {session.status === 'active' && (
                          <ButtonFilled
                            size="xs"
                            color="red"
                            label={t('proctoring.force_submit_one')}
                            loading={alertingSession === session.session_id}
                            disabled={alertingSession === session.session_id}
                            onClick={() =>
                              void handleForceSubmit(
                                session.session_id,
                                session.student_name || session.student_id
                              )
                            }
                          />
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  {expandedRow === session.session_id && (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Paper withBorder radius="sm" p="sm" bg="gray.0">
                          <Text size="xs" fw={600} mb="xs">Nhật ký vi phạm</Text>
                          {session.violations.length === 0 ? (
                            <Text size="xs" c="dimmed">Không có vi phạm.</Text>
                          ) : (
                            <Stack gap={4}>
                              {session.violations.map((v, vi) => (
                                <Group key={vi} gap="xs">
                                  <Badge size="xs" color="red" variant="light">
                                    {EVENT_LABELS[v.event_type] || v.event_type}
                                  </Badge>
                                  <Text size="xs">{new Date(v.client_at).toLocaleString()}</Text>
                                </Group>
                              ))}
                            </Stack>
                          )}
                        </Paper>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </React.Fragment>
              ))}
              {data.sessions.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">{t('proctoring.no_sessions')}</Text>
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

export default ProctoringDashboard;
