import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Title,
  Table,
  Loader,
  Text,
  Select,
  Stack,
  Paper,
  Group,
  Badge,
  Alert,
  Button,
  Menu,
  ActionIcon,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconDotsVertical,
  IconPlayerPlay,
  IconPlayerStop,
  IconEdit,
  IconClock,
  IconTrash,
  IconClipboardList,
} from '@tabler/icons-react';
import examApi from '@/services/examApi';
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import { useExamListState } from '@/hooks/useExamListState';
import InputText from '@/components/Input/InputText/InputText';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { isBeforeExamOpens, isPastExamEnd, getExamScheduleParts, canStudentEnterExam, canTeacherManualOpenExam } from '@/utils/examDeadline';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, slicePage } from '@/utils/pagination';
import { enterExamRoom } from '@/utils/enterExamRoom';
import TruncatedText from '@/components/common/TruncatedText';

const SUBJECT_DISPLAY_MAX = 24;

function truncateText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

const ExamList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isStaff = userRole === 'admin' || userRole === 'teacher';
  const {
    exams,
    loading,
    error,
    notice,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    startingExamId,
    forceSubmittingExamId,
    latestSessionByExam,
    hasSubmitted,
    hasRetakeGrant,
    activeSessionCountByExam,
    runtimeActiveByExam,
    filteredExams,
    doneCount,
    handleStartExam,
    handleUpdateDuration,
    handleForceSubmit,
  } = useExamListState({ isStaff, t });

  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(DEFAULT_PAGE_SIZE);

  const handleEnterExam = async (examId: string) => {
    const ok = await enterExamRoom(navigate, examId);
    if (ok) return;
    modals.open({
      centered: true,
      title: t('exam_take.fullscreen_title', 'Yêu cầu toàn màn hình'),
      children: (
        <Stack gap="sm">
          <Text size="sm">
            {t(
              'exam_take.fullscreen_desc',
              'Bạn cần bật chế độ toàn màn hình để bắt đầu làm bài. Hãy bấm lại và chọn “Cho phép” khi trình duyệt hỏi.'
            )}
          </Text>
          <Button onClick={() => modals.closeAll()}>{t('common.ok', 'OK')}</Button>
        </Stack>
      ),
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setListPage(1);
  }, [searchText, statusFilter]);

  const paginatedExams = useMemo(
    () => slicePage(filteredExams, listPage, listPageSize),
    [filteredExams, listPage, listPageSize]
  );

  const handleDeleteExam = (examId: string, examTitle: string) => {
    modals.open({
      title: t('exam_list.confirm_delete_title', 'Xóa bài thi'),
      centered: true,
      children: (
        <Stack gap="md">
          <Text>{t('exam_list.confirm_delete_msg', 'Bạn có chắc muốn xóa bài thi này?')}</Text>
          <Text fw={700}>{examTitle}</Text>
          <Text size="sm" c="red">{t('exam_list.confirm_delete_warn', 'Hành động này không thể hoàn tác.')}</Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="default" onClick={() => modals.closeAll()}>
              {t('common.cancel', 'Hủy')}
            </Button>
            <Button color="red" onClick={async () => {
              try {
                await examApi.deleteExam(examId);
                modals.closeAll();
                window.location.reload();
              } catch {
                modals.closeAll();
              }
            }}>
              {t('common.delete', 'Xóa')}
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

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

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>{t('exam_list.title')}</Title>
          {isStaff && (
            <ButtonFilled
              size="sm"
              color="blue"
              label={t('exam_list.action_create')}
              disabled={false}
              onClick={() => navigate('/exams/new')}
            />
          )}
        </Group>

        <Group grow>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">{t('exam_list.total_exams')}</Text>
            <Text fw={700} size="xl">{exams.length}</Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">
              {isStaff ? t('exam_list.staff_stopped_exams') : t('exam_list.done_exams')}
            </Text>
            <Text fw={700} size="xl">
              {doneCount}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="md">
            <Text size="sm" c="dimmed">
              {isStaff ? t('exam_list.staff_running_exams') : t('exam_list.not_done_exams')}
            </Text>
            <Text fw={700} size="xl">
              {Math.max(0, exams.length - doneCount)}
            </Text>
          </Paper>
        </Group>

        {!!notice && <Alert color="green" variant="light">{notice}</Alert>}

        <Stack gap="sm">
          <InputText
            placeholder={t('common.search_placeholder')}
            value={searchText}
            onChange={(event) => setSearchText(event.currentTarget.value)}
          />
          <Select
            label={t('common.filter_status')}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter((value as 'all' | 'not_done' | 'done') ?? 'all');
              setListPage(1);
            }}
            data={
              isStaff
                ? [
                    { value: 'all', label: t('exam_list.status_all') },
                    { value: 'not_done', label: t('exam_list.status_filter_staff_running') },
                    { value: 'done', label: t('exam_list.status_filter_staff_stopped') },
                  ]
                : [
                    { value: 'all', label: t('exam_list.status_all') },
                    { value: 'not_done', label: t('exam_list.status_not_done') },
                    { value: 'done', label: t('exam_list.status_done') },
                  ]
            }
          />
        </Stack>

        {filteredExams.length === 0 ? (
          <Alert color="blue" variant="light">{t('exam_list.no_results')}</Alert>
        ) : (
          <Paper withBorder radius="md">
            <ListPaginationBar
              page={listPage}
              total={filteredExams.length}
              limit={listPageSize}
              onPageChange={setListPage}
              onLimitChange={(next) => {
                setListPageSize(next);
                setListPage(1);
              }}
            />
            <Table verticalSpacing="sm" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('my_results.index')}</Table.Th>
                  <Table.Th>{t('common.exam')}</Table.Th>
                  <Table.Th>{t('common.subject')}</Table.Th>
                  <Table.Th>{t('common.time_minutes')}</Table.Th>
                  <Table.Th>{t('exam_list.schedule_column')}</Table.Th>
                  {isStaff && <Table.Th>{t('exam_list.active_sessions')}</Table.Th>}
                  <Table.Th>{t('common.status')}</Table.Th>
                  <Table.Th>{t('common.actions')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedExams.map((item, idx) => {
                  const latest = latestSessionByExam.get(item.id);
                  const activeCount = isStaff ? activeSessionCountByExam[item.id] ?? 0 : 0;
                  const runtimeActive = isStaff ? Boolean(runtimeActiveByExam[item.id]) : false;
                  const examInProgress = runtimeActive || activeCount > 0;
                  const studentSubmitted = !isStaff && hasSubmitted(item.id);
                  const canRetake = !isStaff && hasRetakeGrant(item.id);
                  const done = isStaff
                    ? !examInProgress
                    : studentSubmitted && !canRetake;
                  const pastDeadline = isPastExamEnd(item, latest);
                  const staffRunning = isStaff && examInProgress;
                  const staffScheduled =
                    isStaff && !examInProgress && Boolean(item.opens_at) && isBeforeExamOpens(item);
                  const staffEnded =
                    isStaff && !examInProgress && Boolean(item.ends_at ?? item.closes_at) && pastDeadline;
                  const canManualOpen = isStaff && canTeacherManualOpenExam(item) && !examInProgress;
                  const beforeOpens = !isStaff && isBeforeExamOpens(item) && !item.runtime_is_active;
                  const canEnter = canStudentEnterExam(item, latest);
                  const scheduleParts = getExamScheduleParts(item);
                  const subjectName = item.subject_name || '';
                  const rowNavigate = isStaff
                    ? () => navigate(`/exam-sessions/${item.id}`)
                    : () => {
                        if (studentSubmitted && !canRetake) {
                          navigate(`/result/${item.id}`);
                          return;
                        }
                        void handleEnterExam(item.id);
                      };
                  return (
                    <Table.Tr
                      key={item.id}
                      style={{ cursor: 'pointer' }}
                      onClick={rowNavigate}
                    >
                      <Table.Td>{(listPage - 1) * listPageSize + idx + 1}</Table.Td>
                      <Table.Td>
                        <Stack gap={2}>
                          <TruncatedText fw={500} maxWidth={300}>
                            {item.title}
                          </TruncatedText>
                          {item.exam_category && (
                            <Badge
                              size="xs"
                              variant="light"
                              color={
                                item.exam_category === 'practice'
                                  ? 'violet'
                                  : item.exam_category === 'final'
                                  ? 'red'
                                  : 'blue'
                              }
                            >
                              {item.exam_category === 'practice'
                                ? '📝 Thi Thử'
                                : item.exam_category === 'final'
                                ? '🏁 Cuối Kỳ'
                                : '🎓 Giữa Kỳ'}
                            </Badge>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        {subjectName ? (
                          <Tooltip label={subjectName} withArrow multiline maw={320}>
                            <Text size="sm" truncate maw={140}>
                              {truncateText(subjectName, SUBJECT_DISPLAY_MAX)}
                            </Text>
                          </Tooltip>
                        ) : (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{item.duration_min}</Table.Td>
                      <Table.Td>
                        {scheduleParts.start || scheduleParts.end ? (
                          <Stack gap={2}>
                            {scheduleParts.start && (
                              <Text size="xs" lh={1.3}>
                                <Text span c="dimmed" size="xs">
                                  {t('exam_list.schedule_start')}
                                </Text>{' '}
                                {scheduleParts.start}
                              </Text>
                            )}
                            {scheduleParts.end && (
                              <Text size="xs" lh={1.3}>
                                <Text span c="dimmed" size="xs">
                                  {t('exam_list.schedule_end')}
                                </Text>{' '}
                                {scheduleParts.end}
                              </Text>
                            )}
                          </Stack>
                        ) : (
                          <Text size="sm" c="dimmed">—</Text>
                        )}
                      </Table.Td>
                      {isStaff && (
                        <Table.Td>
                          <Badge color={activeCount > 0 ? 'orange' : 'gray'}>
                            {activeCount}
                          </Badge>
                        </Table.Td>
                      )}
                      <Table.Td>
                        <Badge
                          color={
                            isStaff
                              ? staffRunning
                                ? 'orange'
                                : staffScheduled
                                  ? 'blue'
                                  : staffEnded
                                    ? 'gray'
                                    : 'gray'
                              : canRetake
                                ? 'orange'
                                : done
                                  ? 'green'
                                  : 'gray'
                          }
                        >
                          {isStaff
                            ? staffRunning
                              ? t('exam_list.status_staff_running')
                              : staffScheduled
                                ? t('exam_list.status_staff_scheduled')
                                : staffEnded
                                  ? t('exam_list.status_staff_ended')
                                  : t('exam_list.status_staff_stopped')
                            : canRetake
                              ? t('exam_list.status_retake_granted')
                              : done
                                ? t('exam_list.status_done')
                                : t('exam_list.status_not_done')}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {isStaff ? (
                          <Group gap={4} wrap="nowrap">
                            {examInProgress ? (
                              <Button
                                size="xs"
                                color="red"
                                variant="filled"
                                leftSection={<IconPlayerStop size={13} />}
                                loading={forceSubmittingExamId === item.id}
                                onClick={(e) => { e.stopPropagation(); void handleForceSubmit(item.id); }}
                              >
                                {t('exam_list.action_force_submit', 'Ép nộp bài')}
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                color="green"
                                variant="light"
                                leftSection={<IconPlayerPlay size={13} />}
                                loading={startingExamId === item.id}
                                disabled={startingExamId === item.id || !canManualOpen}
                                title={
                                  !canManualOpen && !staffScheduled && Boolean(item.opens_at)
                                    ? t('exam_list.start_auto_hint')
                                    : staffScheduled
                                      ? t('exam_list.start_early_hint', { minutes: item.duration_min })
                                      : t('exam_list.start_runtime_hint')
                                }
                                onClick={(e) => { e.stopPropagation(); void handleStartExam(item); }}
                              >
                                {t('exam_list.action_open_runtime', 'Mở phiên thi')}
                              </Button>
                            )}
                            <Menu shadow="md" width={170} position="bottom-end">
                              <Menu.Target>
                                <ActionIcon variant="subtle" color="gray" size="sm" onClick={(e) => e.stopPropagation()}>
                                  <IconDotsVertical size={15} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconEdit size={13} />} onClick={(e) => { e.stopPropagation(); navigate(`/exams/${item.id}/edit`); }}>
                                  {t('exam_list.action_edit_questions', 'Sửa câu hỏi')}
                                </Menu.Item>
                                <Menu.Item leftSection={<IconClock size={13} />} onClick={(e) => { e.stopPropagation(); void handleUpdateDuration(item); }}>
                                  {t('exam_list.action_set_time', 'Đặt giờ')}
                                </Menu.Item>
                                <Menu.Item leftSection={<IconClipboardList size={13} />} onClick={(e) => { e.stopPropagation(); navigate(`/exam-sessions/${item.id}`); }}>
                                  {t('exam_sessions.action_manage', 'Quản lý phiên thi')}
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item color="red" leftSection={<IconTrash size={13} />} onClick={(e) => { e.stopPropagation(); handleDeleteExam(item.id, item.title); }}>
                                  {t('common.delete', 'Xóa')}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        ) : (
                          <>
                            <ButtonFilled
                              size="xs"
                              color="blue"
                              label={t('exam_list.action_take')}
                              disabled={!canEnter || (studentSubmitted && !canRetake)}
                              title={
                                beforeOpens
                                  ? t('exam_list.take_disabled_not_open')
                                  : studentSubmitted && !canRetake
                                  ? t('exam_list.take_disabled_submitted', 'Bạn đã nộp bài thi này')
                                  : pastDeadline
                                    ? t('exam_list.take_disabled_deadline')
                                    : undefined
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!canEnter || (studentSubmitted && !canRetake)) return;
                                void handleEnterExam(item.id);
                              }}
                            />
                            <ButtonFilled
                              size="xs"
                              style={{ marginLeft: 8 }}
                              color="gray"
                              label={t('exam_list.action_result')}
                              disabled={!studentSubmitted && !canRetake}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/result/${item.id}`);
                              }}
                            />
                          </>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Box>
  );
};

export default ExamList;
