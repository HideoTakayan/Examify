import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Alert, Stack, Title,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';

type SessionSummary = {
  exam_id: string;
  exam_title: string;
  session_id: string;
  student_id: string;
  student_name: string | null;
  status: string;
  grading_status: string;
  submitted_at: string | null;
};

const GradingList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const exams = await examApi.getExams();
        const allSessions: SessionSummary[] = [];

        for (const exam of exams) {
          try {
            const sessionsData = await examApi.getExamSessions(exam.id);
            for (const session of sessionsData) {
              if (session.grading_status === 'pending_manual' || session.status === 'submitted') {
                allSessions.push({
                  exam_id: exam.id,
                  exam_title: exam.title,
                  session_id: session.id,
                  student_id: session.student_id,
                  student_name:
                    session.student_name || session.full_name || session.student_email || session.email || null,
                  status: session.status,
                  grading_status: session.grading_status ?? 'complete',
                  submitted_at: session.submitted_at ?? session.finished_at ?? null,
                });
              }
            }
          } catch {
            // skip exams with no sessions
          }
        }

        setSessions(allSessions);
      } catch {
        setError(t('grading.list_load_failed'));
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
        <Alert color="red" variant="light">{error}</Alert>
      </Box>
    );
  }

  const pendingGrading = sessions.filter((s) => s.grading_status === 'pending_manual');

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Title order={2}>{t('grading.list_title')}</Title>

        {pendingGrading.length > 0 && (
          <Alert color="yellow" variant="light">
            {t('grading.pending_count', { count: pendingGrading.length })}
          </Alert>
        )}

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>{t('grading.exam')}</Table.Th>
                <Table.Th>{t('grading.student')}</Table.Th>
                <Table.Th>{t('grading.status')}</Table.Th>
                <Table.Th>{t('grading.grading_status')}</Table.Th>
                <Table.Th>{t('grading.submitted_at')}</Table.Th>
                <Table.Th>{t('common.actions')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {sessions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center">{t('grading.no_sessions')}</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                sessions.map((session, idx) => (
                  <Table.Tr key={session.session_id}>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{session.exam_title}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{session.student_name || session.student_id}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={session.status === 'submitted' ? 'green' : session.status === 'active' ? 'orange' : 'gray'}>
                        {session.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={session.grading_status === 'pending_manual' ? 'yellow' : 'green'}>
                        {session.grading_status === 'pending_manual' ? t('grading.pending') : t('grading.graded')}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {session.submitted_at ? new Date(session.submitted_at).toLocaleString() : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ButtonLight
                        size="xs"
                        label={t('grading.view')}
                        disabled={false}
                        onClick={() => navigate(`/grading/${session.session_id}`)}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default GradingList;