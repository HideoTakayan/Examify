import { useEffect, useMemo, useState } from 'react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, slicePage } from '@/utils/pagination';
import { useNavigate } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Alert, Stack, Group, Select, TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi from '@/services/examApi';
import type { ExamSession } from '@/services/examApi';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';

const GradingIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [exams, setExams] = useState<Record<string, { title: string; subject_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Fetch all exams to build exam title map
        const examList = await examApi.getExams();
        const map: Record<string, { title: string; subject_name: string | null }> = {};
        examList.forEach((e) => {
          map[e.id] = {
            title: e.title,
            subject_name: e.subject_name ?? null,
          };
        });
        setExams(map);
        // Fetch sessions for all exams that have pending manual grading
        // Since we don't have a global "pending grading sessions" API,
        // we fetch from each exam's sessions endpoint
        const allSessions: ExamSession[] = [];
        for (const exam of examList.slice(0, 20)) {
          try {
            const sess = await examApi.getExamSessions(exam.id);
            const pending = sess.filter((s: ExamSession) => s.grading_status === 'pending_manual');
            allSessions.push(...pending);
          } catch {
            // skip
          }
        }
        setSessions(allSessions);
      } catch {
        setError(t('errors.session_list_failed'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const subjectOptions = useMemo(() => {
    const uniqueSubjects = new Set<string>();
    Object.values(exams).forEach((exam) => {
      if (exam.subject_name) uniqueSubjects.add(exam.subject_name);
    });
    return [
      { value: 'all', label: t('grading.filter_all_subjects') },
      ...Array.from(uniqueSubjects).sort().map((subject) => ({ value: subject, label: subject })),
    ];
  }, [exams, t]);

  const filteredSessions = useMemo(() => {
    const now = Date.now();
    const keywordLower = keyword.trim().toLowerCase();

    return sessions.filter((session) => {
      const examMeta = exams[session.exam_id];
      const subjectName = examMeta?.subject_name ?? null;
      const examTitle = examMeta?.title ?? session.exam_id;
      const studentName =
        session.student_name || session.full_name || session.student_email || session.email || session.student_id;
      const submittedAt = session.submitted_at || session.finished_at || null;

      const matchesKeyword = !keywordLower
        || examTitle.toLowerCase().includes(keywordLower)
        || studentName.toLowerCase().includes(keywordLower)
        || session.student_id.toLowerCase().includes(keywordLower);

      const matchesSubject = subjectFilter === 'all' || subjectName === subjectFilter;

      let matchesTime = true;
      if (timeRange !== 'all' && submittedAt) {
        const submittedTime = new Date(submittedAt).getTime();
        const maxAgeMs = timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000
          : timeRange === '30d' ? 30 * 24 * 60 * 60 * 1000
            : 90 * 24 * 60 * 60 * 1000;
        matchesTime = now - submittedTime <= maxAgeMs;
      } else if (timeRange !== 'all' && !submittedAt) {
        matchesTime = false;
      }

      return matchesKeyword && matchesSubject && matchesTime;
    });
  }, [sessions, exams, keyword, subjectFilter, timeRange]);

  useEffect(() => {
    setPage(1);
  }, [keyword, subjectFilter, timeRange]);

  const paginatedSessions = useMemo(
    () => slicePage(filteredSessions, page, pageSize),
    [filteredSessions, page, pageSize]
  );

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

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('grading.index_title') || 'Danh sách chấm điểm'}
          subtitle={t('grading.index_subtitle') || 'Các bài thi có câu tự luận cần chấm'}
          accent="teal"
        />

        <Group grow align="end">
          <TextInput
            label={t('grading.filter_keyword')}
            placeholder={t('grading.filter_keyword_placeholder')}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            label={t('grading.filter_subject')}
            data={subjectOptions}
            value={subjectFilter}
            onChange={(value) => {
              setSubjectFilter(value || 'all');
              setPage(1);
            }}
          />
          <Select
            label={t('grading.filter_time')}
            data={[
              { value: 'all', label: t('grading.filter_time_all') },
              { value: '7d', label: t('grading.filter_time_7d') },
              { value: '30d', label: t('grading.filter_time_30d') },
              { value: '90d', label: t('grading.filter_time_90d') },
            ]}
            value={timeRange}
            onChange={(value) => {
              setTimeRange(value || 'all');
              setPage(1);
            }}
          />
        </Group>

        {filteredSessions.length === 0 ? (
          <Paper withBorder radius="md" p="xl">
            <Text c="dimmed" ta="center">{t('grading.empty_filtered')}</Text>
          </Paper>
        ) : (
          <Paper withBorder radius="md">
            <ListPaginationBar
              page={page}
              total={filteredSessions.length}
              limit={pageSize}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>#</Table.Th>
                  <Table.Th>{t('dashboard.col_exam')}</Table.Th>
                  <Table.Th>{t('exam_sessions.student')}</Table.Th>
                  <Table.Th>{t('grading.status')}</Table.Th>
                  <Table.Th>{t('grading.score')}</Table.Th>
                  <Table.Th>{t('grading.submitted_at')}</Table.Th>
                  <Table.Th>{t('common.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedSessions.map((session, idx) => (
                  <Table.Tr key={session.id}>
                    <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>{exams[session.exam_id]?.title || session.exam_id}</Text>
                      <Text size="xs" c="dimmed">{exams[session.exam_id]?.subject_name || '—'}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {session.student_name || session.full_name || session.student_email || session.email || session.student_id}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={session.status === 'submitted' ? 'green' : session.status === 'active' ? 'orange' : 'gray'}>
                        {t(`grading.status_${session.status}`, { defaultValue: session.status })}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500}>
                        {session.score != null ? `${session.score}/${session.max_points}` : t('grading.no_score')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {(session.submitted_at || session.finished_at)
                          ? new Date(session.submitted_at || session.finished_at!).toLocaleString()
                          : t('grading.no_score')}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ButtonLight
                        size="xs"
                        label={t('grading.btn_grade') || 'Chấm điểm'}
                        disabled={false}
                        onClick={() => navigate(`/grading/${session.id}`)}
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

export default GradingIndex;