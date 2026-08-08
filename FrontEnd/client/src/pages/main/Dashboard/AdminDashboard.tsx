import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Table,
  Title,
  SimpleGrid,
  Paper,
  Text,
  Stack,
  Group,
  Badge,
  Select,
  TextInput,
  Loader,
  Button,
} from '@mantine/core';
import { IconRefresh, IconSearch } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { ListPaginationBar } from '@/components/ListPagination';
import dashboardApi from '@/services/dashboardApi';
import type { StaffDashboardDto, StaffRecentActivityDto } from '@/services/dashboardApi';
import userApi, { type UserAccount } from '@/services/userApi';
import teacherStudentsApi, { type StudentItem } from '@/services/teacherStudentsApi';
import adminClassApi, { type AdminClassDto } from '@/services/adminClassApi';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';

type AdminDashboardProps = {
  data: StaffDashboardDto;
};

const AdminDashboard = ({ data }: AdminDashboardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isAdmin = data.viewer === 'admin';
  const [activityStatus, setActivityStatus] = useState<string>('all');
  const [activityTime, setActivityTime] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [keywordDebounced, setKeywordDebounced] = useState('');
  const [activity, setActivity] = useState<StaffRecentActivityDto[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearchDebounced, setStudentSearchDebounced] = useState('');
  const [studentClassId, setStudentClassId] = useState<string | null>(null);
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [studentTotal, setStudentTotal] = useState(0);
  const [students, setStudents] = useState<(UserAccount | StudentItem)[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [adminClasses, setAdminClasses] = useState<AdminClassDto[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => setKeywordDebounced(keyword.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setPage(1);
  }, [activityStatus, activityTime, keywordDebounced]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setActivityLoading(true);
        setActivityError('');
        const result = await dashboardApi.listActivity({
          limit: pageSize,
          offset: pageToOffset(page, pageSize),
          status: activityStatus === 'all' ? undefined : activityStatus,
          keyword: keywordDebounced || undefined,
          time: activityTime === 'all' ? undefined : activityTime,
        });
        if (!cancelled) {
          setActivity(result.items);
          setTotal(result.total);
        }
      } catch {
        if (!cancelled) setActivityError(t('dashboard.activity_load_error'));
      } finally {
        if (!cancelled) setActivityLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, activityStatus, activityTime, keywordDebounced, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setStudentSearchDebounced(studentSearch.trim());
      setStudentPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [studentSearch]);

  useEffect(() => {
    if (isAdmin) {
      void adminClassApi.getClasses().then(setAdminClasses).catch(() => {});
    }
  }, [isAdmin]);

  const loadStudents = useCallback(async () => {
    try {
      setStudentsLoading(true);
      setStudentsError('');
      const params = {
        limit: studentPageSize,
        offset: pageToOffset(studentPage, studentPageSize),
        search: studentSearchDebounced || undefined,
      };
      if (isAdmin) {
        const result = await userApi.listStudents({
          ...params,
          admin_class_id: studentClassId || undefined,
        });
        setStudents(result.items);
        setStudentTotal(result.total);
      } else {
        const result = await teacherStudentsApi.list(params);
        setStudents(result.items);
        setStudentTotal(result.total);
      }
    } catch {
      setStudentsError(t('errors.user_list_failed'));
    } finally {
      setStudentsLoading(false);
    }
  }, [isAdmin, studentPage, studentPageSize, studentSearchDebounced, studentClassId, t]);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    setStudentPage(1);
  }, [studentClassId]);

  const classFilterOptions = [
    { value: '', label: t('dashboard.filter_class_all') },
    ...adminClasses.map((c) => ({
      value: c.id,
      label: `${c.display_name} (${c.student_count ?? 0})`,
    })),
  ];

  const showStudentSection = isAdmin || data.viewer === 'teacher';

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Group justify="space-between" align="flex-start" mb="md" wrap="wrap">
        <Title order={2}>{t('admin.dashboard_title')}</Title>
        {isAdmin && (
          <ButtonFilled
            label={t('admin.student_management_title')}
            disabled={false}
            onClick={() => navigate('/admin/students')}
            color="teal"
            size="sm"
          />
        )}
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        {data.metrics.map((m) => (
          <Paper key={m.key} radius="md" withBorder p="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
              {t(m.label_key)}
            </Text>
            <Text fw={800} size="xl" mt={4}>
              {m.value}
            </Text>
          </Paper>
        ))}
      </SimpleGrid>

      {showStudentSection && (
        <Stack gap="sm" mb="xl">
          <Group justify="space-between" align="center" wrap="wrap">
            <Title order={4}>{t('admin.student_list_title')}</Title>
            {isAdmin && (
              <Button
                variant="subtle"
                size="compact-sm"
                leftSection={<IconRefresh size={14} />}
                onClick={() => void loadStudents()}
                loading={studentsLoading}
              >
                {t('common.refresh')}
              </Button>
            )}
          </Group>

          <Paper withBorder radius="md" p="sm">
            <Group align="flex-end" wrap="wrap" gap="sm">
              <TextInput
                label={t('dashboard.filter_keyword')}
                placeholder={t('teacher_students.search_placeholder')}
                leftSection={<IconSearch size={14} />}
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.currentTarget.value)}
                style={{ minWidth: 260, flex: '1 1 200px' }}
              />
              {isAdmin && (
                <Select
                  label={t('dashboard.filter_class')}
                  placeholder={t('dashboard.filter_class_all')}
                  data={classFilterOptions}
                  value={studentClassId ?? ''}
                  onChange={(v) => setStudentClassId(v || null)}
                  clearable
                  searchable
                  style={{ minWidth: 220 }}
                />
              )}
            </Group>
          </Paper>

          <Paper withBorder radius="md">
            <ListPaginationBar
              page={studentPage}
              total={studentTotal}
              limit={studentPageSize}
              onPageChange={setStudentPage}
              onLimitChange={(next) => {
                setStudentPageSize(next);
                setStudentPage(1);
              }}
            />
            {studentsLoading ? (
              <Box p="xl" className="flex justify-center">
                <Loader size="sm" />
              </Box>
            ) : studentsError ? (
              <Text size="sm" c="red" p="md">
                {studentsError}
              </Text>
            ) : students.length === 0 ? (
              <Text size="sm" c="dimmed" p="md">
                {t('dashboard.students_empty')}
              </Text>
            ) : (
              <Table highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('my_results.index')}</Table.Th>
                    <Table.Th>{t('admin.full_name')}</Table.Th>
                    <Table.Th>{t('admin.username')}</Table.Th>
                    <Table.Th>{t('admin.email')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {students.map((stu, index) => (
                    <Table.Tr key={stu.id}>
                      <Table.Td>{pageToOffset(studentPage, studentPageSize) + index + 1}</Table.Td>
                      <Table.Td>{stu.full_name || '—'}</Table.Td>
                      <Table.Td>{stu.username}</Table.Td>
                      <Table.Td>{stu.email}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Stack>
      )}

      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={4}>{t('dashboard.recent_activity')}</Title>
          <Badge color={isAdmin ? 'grape' : 'blue'} variant="light">
            {isAdmin ? t('dashboard.role_admin_view') : t('dashboard.role_teacher_view')}
          </Badge>
        </Group>

        <Group grow align="end">
          <TextInput
            label={t('dashboard.filter_keyword')}
            placeholder={t('dashboard.filter_keyword_placeholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.currentTarget.value)}
          />
          <Select
            label={t('dashboard.filter_status')}
            value={activityStatus}
            onChange={(v) => setActivityStatus(v || 'all')}
            data={[
              { value: 'all', label: t('dashboard.filter_all_status') },
              { value: 'submitted', label: t('dashboard.status_submitted') },
              { value: 'active', label: t('dashboard.status_active') },
              { value: 'expired', label: t('dashboard.status_expired') },
            ]}
          />
          <Select
            label={t('dashboard.filter_time')}
            value={activityTime}
            onChange={(v) => setActivityTime(v || 'all')}
            data={[
              { value: 'all', label: t('dashboard.filter_time_all') },
              { value: '7d', label: t('dashboard.filter_time_7d') },
              { value: '30d', label: t('dashboard.filter_time_30d') },
              { value: '90d', label: t('dashboard.filter_time_90d') },
            ]}
          />
        </Group>

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
          {activityLoading ? (
            <Box p="xl" className="flex justify-center">
              <Loader size="sm" />
            </Box>
          ) : activityError ? (
            <Text size="sm" c="red" p="md">
              {activityError}
            </Text>
          ) : activity.length === 0 ? (
            <Text size="sm" c="dimmed" p="md">
              {t('dashboard.activity_empty')}
            </Text>
          ) : (
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('dashboard.col_exam')}</Table.Th>
                  <Table.Th>{t('dashboard.col_student')}</Table.Th>
                  <Table.Th>{t('dashboard.col_status')}</Table.Th>
                  <Table.Th>{t('dashboard.col_updated')}</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {activity.map((row) => (
                  <Table.Tr key={row.session_id}>
                    <Table.Td>{row.exam_title}</Table.Td>
                    <Table.Td>
                      {row.student_name || row.student_email || '—'}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={row.status === 'submitted' ? 'green' : row.status === 'active' ? 'orange' : 'gray'}>
                        {t(`dashboard.status_${row.status}`, { defaultValue: row.status })}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>
                        {new Date(row.updated_at).toLocaleString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>
      </Stack>
    </Box>
  );
};

export default AdminDashboard;
