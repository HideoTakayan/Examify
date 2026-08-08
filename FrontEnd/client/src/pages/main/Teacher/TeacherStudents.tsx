import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box, Table, Title, Paper, Text, Stack, Group, Badge, Modal, Loader, Alert,
  Tabs, Tooltip, ActionIcon, Select, Checkbox,
} from '@mantine/core';
import {
  IconDownload, IconMail, IconPencil,
  IconReportAnalytics,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import teacherStudentsApi from '@/services/teacherStudentsApi';
import type { StudentItem, GradeRow, GradeExamOption, StudentTranscript } from '@/services/teacherStudentsApi';
import StudentTranscriptModal from '@/pages/main/Teacher/StudentTranscriptModal';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import InputText from '@/components/Input/InputText/InputText';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import PageHeader from '@/components/PageHeader/PageHeader';
import { formatScoreScale10Pair, scoreToPointPercent } from '@/utils/formatExamScore';

const TeacherStudents = () => {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    full_name: '',
    username: '',
    email: '',
    is_active: true,
  });
  const [editErr, setEditErr] = useState('');

  const [gradeRows, setGradeRows] = useState<GradeRow[]>([]);
  const [gradeTotal, setGradeTotal] = useState(0);
  const [gradeSubmittedCount, setGradeSubmittedCount] = useState(0);
  const [gradeClassTotal, setGradeClassTotal] = useState(0);
  const [gradePage, setGradePage] = useState(1);
  const [gradePageSize, setGradePageSize] = useState(DEFAULT_PAGE_SIZE);
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeSearchDebounced, setGradeSearchDebounced] = useState('');
  const [gradeExams, setGradeExams] = useState<GradeExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [className, setClassName] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState('');
  const [emailResultError, setEmailResultError] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptData, setTranscriptData] = useState<StudentTranscript | null>(null);
  const [transcriptStudentId, setTranscriptStudentId] = useState<string | null>(null);
  const [transcriptExportLoading, setTranscriptExportLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => { setSearchDebounced(search.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setGradeSearchDebounced(gradeSearch.trim());
      setGradePage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [gradeSearch]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const r = await teacherStudentsApi.list({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: searchDebounced || undefined,
      });
      setStudents(r.items);
      setTotal(r.total);
    } catch {
      setError(t('errors.user_list_failed'));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, t]);

  useEffect(() => { void loadStudents(); }, [loadStudents]);

  const openEdit = (s: StudentItem) => {
    setEditForm({
      id: s.id,
      full_name: s.full_name ?? '',
      username: s.username,
      email: s.email,
      is_active: s.is_active,
    });
    setEditErr('');
    setEditOpen(true);
  };

  const handleEdit = async () => {
    setEditErr('');
    if (!editForm.username.trim() || !editForm.email.trim()) {
      setEditErr(t('teacher_students.edit_validation'));
      return;
    }
    try {
      await teacherStudentsApi.update(editForm.id, {
        full_name: editForm.full_name.trim() || undefined,
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        is_active: editForm.is_active,
      });
      setEditOpen(false);
      void loadStudents();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditErr(msg || t('errors.user_update_failed'));
    }
  };

  const loadGradeExams = useCallback(async () => {
    try {
      const data = await teacherStudentsApi.getGradeExams();
      setClassName(data.class_name);
      setGradeExams(data.exams);
      setSelectedExamId((prev) => prev ?? data.exams[0]?.id ?? null);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    }
  }, [t]);

  const loadGradeReport = useCallback(async (examId: string | null) => {
    if (!examId) {
      setGradeRows([]);
      setGradeTotal(0);
      setGradeSubmittedCount(0);
      setGradeClassTotal(0);
      return;
    }
    try {
      setGradeLoading(true);
      const r = await teacherStudentsApi.getGradeReport(examId, {
        limit: gradePageSize,
        offset: pageToOffset(gradePage, gradePageSize),
        search: gradeSearchDebounced || undefined,
      });
      setGradeRows(r.items);
      setGradeTotal(r.total);
      setGradeSubmittedCount(r.submitted_count);
      setGradeClassTotal(r.class_student_total);
      setClassName(r.class_name);
    } catch {
      setError(t('teacher_students.grade_load_error'));
    } finally {
      setGradeLoading(false);
    }
  }, [gradePage, gradePageSize, gradeSearchDebounced, t]);

  useEffect(() => {
    if (selectedExamId) void loadGradeReport(selectedExamId);
  }, [selectedExamId, loadGradeReport]);

  useEffect(() => {
    setGradePage(1);
    setGradeSearch('');
    setGradeSearchDebounced('');
  }, [selectedExamId]);

  const handleExportCsv = async () => {
    if (!selectedExamId) return;
    try {
      setExportLoading(true);
      await teacherStudentsApi.downloadGradeExport(selectedExamId);
    } catch {
      setError(t('teacher_students.export_error'));
    } finally {
      setExportLoading(false);
    }
  };

  const pageStudentIds = useMemo(() => students.map((s) => s.id), [students]);
  const allPageSelected =
    pageStudentIds.length > 0 && pageStudentIds.every((id) => selectedStudentIds.has(id));
  const somePageSelected = pageStudentIds.some((id) => selectedStudentIds.has(id));

  const toggleSelectAllOnPage = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageStudentIds.forEach((id) => next.delete(id));
      } else {
        pageStudentIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleStudentSelected = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendTranscriptEmails = async (studentIds?: string[]) => {
    const count = studentIds?.length ?? 0;
    const confirmKey = studentIds?.length
      ? 'teacher_students.confirm_send_email_selected'
      : 'teacher_students.confirm_send_email';
    if (!window.confirm(t(confirmKey, { count }))) return;
    try {
      setEmailSending(true);
      setEmailResult('');
      setEmailResultError(false);
      const r = await teacherStudentsApi.sendGradeEmail(studentIds);
      setEmailResult(t('teacher_students.email_sent_result', { sent: r.sent, total: r.total }));
      setEmailResultError(false);
      if (studentIds?.length) {
        setSelectedStudentIds((prev) => {
          const next = new Set(prev);
          studentIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    } catch (e: unknown) {
      const apiMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEmailResult(apiMsg || t('teacher_students.email_send_error'));
      setEmailResultError(true);
    } finally {
      setEmailSending(false);
    }
  };

  const handleSendEmail = () => void sendTranscriptEmails();
  const handleSendSelectedEmail = () => {
    const ids = Array.from(selectedStudentIds);
    if (!ids.length) return;
    void sendTranscriptEmails(ids);
  };

  const openTranscript = async (studentId: string) => {
    setTranscriptStudentId(studentId);
    setTranscriptOpen(true);
    setTranscriptData(null);
    try {
      setTranscriptLoading(true);
      const data = await teacherStudentsApi.getTranscript(studentId);
      setTranscriptData(data);
    } catch {
      setError(t('teacher_students.transcript_load_error'));
      setTranscriptOpen(false);
    } finally {
      setTranscriptLoading(false);
    }
  };

  const handleTranscriptExport = async (format: 'html' | 'csv') => {
    if (!transcriptStudentId) return;
    try {
      setTranscriptExportLoading(true);
      const code = transcriptData?.student.student_code ?? 'bang_diem';
      await teacherStudentsApi.downloadTranscriptExport(
        transcriptStudentId,
        format,
        format === 'csv' ? `bang_diem_${code}.csv` : undefined
      );
    } catch {
      setError(t('teacher_students.export_error'));
    } finally {
      setTranscriptExportLoading(false);
    }
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title={t('teacher_students.title')}
        subtitle={t('teacher_students.subtitle')}
        accent="teal"
      />

      <Tabs defaultValue="list" onChange={(v) => { if (v === 'grades') void loadGradeExams(); }}>
        <Tabs.List mb="md">
          <Tabs.Tab value="list">{t('teacher_students.tab_list')}</Tabs.Tab>
          <Tabs.Tab value="grades">{t('teacher_students.tab_grades')}</Tabs.Tab>
        </Tabs.List>

        {/* Tab: Danh sách */}
        <Tabs.Panel value="list">
          <Stack gap="md">
            <Group justify="space-between" wrap="wrap">
              <InputText
                placeholder={t('teacher_students.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ maxWidth: 320 }}
              />
              <Group gap="xs">
                {selectedStudentIds.size > 0 && (
                  <ButtonFilled
                    label={t('teacher_students.send_grades_btn', { count: selectedStudentIds.size })}
                    disabled={emailSending}
                    onClick={handleSendSelectedEmail}
                    color="teal"
                    size="sm"
                    leftSection={<IconMail size={16} />}
                  />
                )}
              </Group>
            </Group>
            {emailResult && (
              <Text size="sm" c={emailResultError ? 'red' : 'teal'}>
                {emailResult}
              </Text>
            )}

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <Paper withBorder radius="md">
              <ListPaginationBar
                page={page}
                total={total}
                limit={pageSize}
                onPageChange={setPage}
                onLimitChange={(n) => { setPageSize(n); setPage(1); }}
              />
              {loading ? (
                <Box p="xl" className="flex justify-center"><Loader size="sm" /></Box>
              ) : (
                <Table highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>
                        <Checkbox
                          checked={allPageSelected}
                          indeterminate={!allPageSelected && somePageSelected}
                          onChange={toggleSelectAllOnPage}
                          aria-label={t('teacher_students.select_all_page')}
                        />
                      </Table.Th>
                      <Table.Th>#</Table.Th>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_email')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_status')}</Table.Th>
                      <Table.Th>{t('common.actions')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {students.map((s, idx) => (
                      <Table.Tr key={s.id} bg={selectedStudentIds.has(s.id) ? 'var(--mantine-color-teal-light)' : undefined}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedStudentIds.has(s.id)}
                            onChange={() => toggleStudentSelected(s.id)}
                            aria-label={t('teacher_students.select_student', { name: s.full_name || s.username })}
                          />
                        </Table.Td>
                        <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                        <Table.Td><Text size="sm" ff="monospace">{s.username}</Text></Table.Td>
                        <Table.Td>{s.full_name || '—'}</Table.Td>
                        <Table.Td>{s.email}</Table.Td>
                        <Table.Td>
                          <Badge color={s.is_active ? 'green' : 'gray'} size="sm">
                            {s.is_active ? t('teacher_students.active') : t('teacher_students.inactive')}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <Tooltip label={t('teacher_students.edit_student')}>
                              <ActionIcon color="blue" variant="light" onClick={() => openEdit(s)}>
                                <IconPencil size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label={t('teacher_students.transcript_btn')}>
                              <ActionIcon
                                color="teal"
                                variant="light"
                                onClick={() => void openTranscript(s.id)}
                              >
                                <IconReportAnalytics size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {!loading && students.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Text c="dimmed" ta="center" py="md">{t('teacher_students.empty')}</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        {/* Tab: Bảng điểm */}
        <Tabs.Panel value="grades">
          <Stack gap="md">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Stack gap="xs" style={{ flex: 1, minWidth: 260 }}>
                <Title order={4}>{t('teacher_students.grade_title', { class: className })}</Title>
                <Select
                  label={t('teacher_students.select_exam')}
                  placeholder={t('teacher_students.select_exam_placeholder')}
                  data={gradeExams.map((e) => ({
                    value: e.id,
                    label: `${e.title} (${e.submitted_count} ${t('teacher_students.submitted_short')})`,
                  }))}
                  value={selectedExamId}
                  onChange={(v) => setSelectedExamId(v)}
                  allowDeselect={false}
                  searchable
                />
              </Stack>
              <Group gap="xs">
                <ButtonLight
                  label={exportLoading ? '...' : t('teacher_students.export_detail_csv')}
                  onClick={handleExportCsv}
                  color="blue"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  disabled={!selectedExamId || exportLoading}
                />
                <ButtonFilled
                  label={emailSending ? '...' : t('teacher_students.send_email')}
                  onClick={handleSendEmail}
                  color="teal"
                  size="sm"
                  leftSection={<IconMail size={16} />}
                  disabled={emailSending || gradeSubmittedCount === 0}
                />
              </Group>
            </Group>

            {emailResult && <Alert color={emailResult.includes('error') ? 'red' : 'green'} variant="light">{emailResult}</Alert>}

            {!selectedExamId ? (
              <Text c="dimmed">{t('teacher_students.select_exam_placeholder')}</Text>
            ) : (
              <Paper withBorder radius="md" p="sm">
                <Group justify="space-between" mb="sm" wrap="wrap">
                  <Text size="sm" c="dimmed">
                    {t('teacher_students.grade_summary', {
                      submitted: gradeSubmittedCount,
                      total: gradeClassTotal,
                    })}
                  </Text>
                  <InputText
                    placeholder={t('teacher_students.grade_search_placeholder')}
                    value={gradeSearch}
                    onChange={(e) => setGradeSearch(e.currentTarget.value)}
                    style={{ maxWidth: 320 }}
                  />
                </Group>
                <ListPaginationBar
                  page={gradePage}
                  total={gradeTotal}
                  limit={gradePageSize}
                  onPageChange={setGradePage}
                  onLimitChange={(n) => { setGradePageSize(n); setGradePage(1); }}
                />
                {gradeLoading ? (
                  <Box p="xl" className="flex justify-center"><Loader size="sm" /></Box>
                ) : (
                <Table highlightOnHover verticalSpacing="sm" striped>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('teacher_students.col_code')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_name')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_version')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_score')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_score_percent')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_date')}</Table.Th>
                      <Table.Th>{t('teacher_students.col_grading')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {gradeRows.map((r) => {
                      const pctVal = scoreToPointPercent(r.score, r.max_points);
                      const pct = pctVal != null ? pctVal.toFixed(1) : '—';
                      const hasSession = Boolean(r.session_id);
                      return (
                        <Table.Tr key={r.student_id} style={hasSession ? undefined : { opacity: 0.65 }}>
                          <Table.Td><Text size="sm" ff="monospace">{r.username}</Text></Table.Td>
                          <Table.Td>{r.full_name || '—'}</Table.Td>
                          <Table.Td>{r.version_code || '—'}</Table.Td>
                          <Table.Td>
                            {hasSession ? formatScoreScale10Pair(r.score, r.max_points) : '—'}
                          </Table.Td>
                          <Table.Td>{hasSession ? pct : '—'}</Table.Td>
                          <Table.Td>
                            {r.submitted_at
                              ? new Date(r.submitted_at).toLocaleDateString('vi-VN')
                              : '—'}
                          </Table.Td>
                          <Table.Td>
                            {hasSession ? (
                              <Badge
                                size="sm"
                                color={r.grading_status === 'complete' ? 'green' : 'yellow'}
                                variant="light"
                              >
                                {r.grading_status === 'complete'
                                  ? t('teacher_students.grading_done')
                                  : t('teacher_students.grading_pending')}
                              </Badge>
                            ) : (
                              <Badge size="sm" color="gray" variant="light">
                                {t('teacher_students.not_submitted')}
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })}
                    {!gradeLoading && gradeRows.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={7}>
                          <Text c="dimmed" ta="center" py="md">
                            {gradeSearchDebounced
                              ? t('teacher_students.grade_search_empty')
                              : t('teacher_students.empty')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
                )}
              </Paper>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <StudentTranscriptModal
        opened={transcriptOpen}
        onClose={() => setTranscriptOpen(false)}
        loading={transcriptLoading}
        data={transcriptData}
        exportLoading={transcriptExportLoading}
        emailSending={emailSending}
        onExportHtml={() => void handleTranscriptExport('html')}
        onExportCsv={() => void handleTranscriptExport('csv')}
        onSendEmail={
          transcriptStudentId
            ? () => void sendTranscriptEmails([transcriptStudentId])
            : undefined
        }
      />

      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('teacher_students.edit_modal_title')}
      >
        <Stack gap="sm">
          <InputText
            label={t('teacher_students.col_name')}
            value={editForm.full_name}
            onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.currentTarget.value }))}
          />
          <InputText
            label={t('teacher_students.col_code')}
            value={editForm.username}
            onChange={(e) => setEditForm((p) => ({ ...p, username: e.currentTarget.value }))}
          />
          <InputText
            label={t('common.email')}
            value={editForm.email}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.currentTarget.value }))}
          />
          <Select
            label={t('teacher_students.col_status')}
            value={editForm.is_active ? 'active' : 'inactive'}
            onChange={(v) => setEditForm((p) => ({ ...p, is_active: v === 'active' }))}
            data={[
              { value: 'active', label: t('teacher_students.status_active') },
              { value: 'inactive', label: t('teacher_students.status_inactive') },
            ]}
            allowDeselect={false}
          />
          {editErr && <Text c="red" size="sm">{editErr}</Text>}
          <ButtonFilled label={t('common.save')} disabled={false} onClick={handleEdit} color="teal" />
        </Stack>
      </Modal>

    </Box>
  );
};

export default TeacherStudents;
