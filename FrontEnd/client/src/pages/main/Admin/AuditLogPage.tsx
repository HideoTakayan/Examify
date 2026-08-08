import { useCallback, useEffect, useState } from 'react';
import {
  Box, Text, Loader, Table, Badge, Paper, Group, Stack, Select, Alert, Center,
} from '@mantine/core';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/utils/pagination';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState/EmptyState';
import apiClient from '@/services/apiClient';
import PageHeader from '@/components/PageHeader/PageHeader';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';

type AuditLogItem = {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  actor_name: string | null;
  actor_email: string | null;
  created_at: string;
};

const ACTION_COLORS: Record<string, string> = {
  login: 'blue',
  create_account: 'green',
  delete_account: 'red',
  grade_session: 'cyan',
  force_submit_exam: 'orange',
  create_exam: 'green',
  delete_exam: 'red',
  submit_exam: 'gray',
  password_reset_approve: 'yellow',
};

const ACTION_LABELS: Record<string, string> = {
  login: 'Đăng nhập',
  create_account: 'Tạo tài khoản',
  delete_account: 'Xóa tài khoản',
  grade_session: 'Chấm điểm',
  force_submit_exam: 'Nộp bài cưỡng chế',
  create_exam: 'Tạo đề thi',
  delete_exam: 'Xóa đề thi',
  submit_exam: 'Nộp bài',
  password_reset_approve: 'Duyệt đặt lại MK',
};

const ACTION_FILTER_OPTIONS = [
  { value: 'login', label: 'Đăng nhập' },
  { value: 'create_account', label: 'Tạo tài khoản' },
  { value: 'grade_session', label: 'Chấm điểm' },
  { value: 'force_submit_exam', label: 'Nộp bài cưỡng chế' },
  { value: 'password_reset_approve', label: 'Duyệt đặt lại MK' },
];

const AuditLogPage = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = useCallback(async (pageNum: number, limit: number, showSpinner: boolean) => {
    try {
      if (showSpinner) setRefreshing(true);
      const params: Record<string, string | number> = {
        limit,
        offset: (pageNum - 1) * limit,
      };
      if (actionFilter) params.action = actionFilter;
      const res = await apiClient.get<{
        success: boolean;
        data: { items: AuditLogItem[]; total: number };
      }>('/audit-logs', { params });
      setLogs(res.data.data.items);
      setTotal(res.data.data.total);
      setError('');
    } catch {
      setError('Không tải được nhật ký hệ thống.');
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    void load(page, pageSize, !initialLoading);
    // initialLoading chỉ dùng cho lần tải đầu — không đưa vào deps để tránh fetch 2 lần
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, actionFilter, load]);

  const handleRefresh = () => {
    void load(page, pageSize, true);
  };

  const handleFilterChange = (value: string | null) => {
    setActionFilter(value);
    setPage(1);
  };

  const handlePageSizeChange = (next: number) => {
    setPageSize(next);
    setPage(1);
  };

  if (initialLoading) {
    return (
      <Box className="max-w-[1100px] mx-auto p-4">
        <Center py="xl">
          <Loader />
        </Center>
      </Box>
    );
  }

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <Stack gap="md">
        <PageHeader
          title={t('audit_log.title')}
          subtitle={t('audit_log.subtitle')}
          accent="teal"
        />

        {error && <Alert color="red" variant="light">{error}</Alert>}

        <Paper withBorder radius="md">
          <Box
            px="sm"
            py="xs"
            style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}
          >
            <Group justify="space-between" wrap="wrap" gap="sm" align="flex-end">
              <Select
                label={t('audit_log.filter_action')}
                placeholder={t('audit_log.filter_all_actions')}
                clearable
                value={actionFilter}
                onChange={handleFilterChange}
                data={ACTION_FILTER_OPTIONS}
                style={{ minWidth: 220, flex: '1 1 200px', maxWidth: 280 }}
              />
              <Group gap="sm" wrap="wrap" align="flex-end">
                <Select
                  label={t('pagination.page_size_label')}
                  data={PAGE_SIZE_OPTIONS.map((n) => ({
                    value: String(n),
                    label: t('pagination.page_size_option', { size: n }),
                  }))}
                  value={String(pageSize)}
                  allowDeselect={false}
                  w={120}
                  onChange={(v) => {
                    if (!v) return;
                    handlePageSizeChange(Number(v));
                  }}
                />
                <ButtonLight
                  size="sm"
                  label={t('common.refresh')}
                  loading={refreshing}
                  disabled={refreshing}
                  onClick={handleRefresh}
                />
              </Group>
            </Group>
          </Box>

          <Box pos="relative" style={{ minHeight: 120 }}>
            {refreshing && (
              <Center
                pos="absolute"
                inset={0}
                style={{ zIndex: 2, background: 'color-mix(in srgb, var(--mantine-color-body) 70%, transparent)' }}
              >
                <Loader size="sm" />
              </Center>
            )}
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={48}>#</Table.Th>
                  <Table.Th w={160}>{t('audit_log.time')}</Table.Th>
                  <Table.Th>{t('audit_log.actor')}</Table.Th>
                  <Table.Th w={160}>{t('audit_log.action')}</Table.Th>
                  <Table.Th>{t('audit_log.resource')}</Table.Th>
                  <Table.Th w={120}>IP</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logs.map((log, idx) => (
                  <Table.Tr key={log.id}>
                    <Table.Td>{(page - 1) * pageSize + idx + 1}</Table.Td>
                    <Table.Td>
                      <Text size="sm">{new Date(log.created_at).toLocaleString('vi-VN')}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={500}>{log.actor_name || log.actor_id || 'Hệ thống'}</Text>
                        {log.actor_email && <Text size="xs" c="dimmed">{log.actor_email}</Text>}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={ACTION_COLORS[log.action] ?? 'gray'} size="sm" variant="light">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {log.resource_type
                          ? `${log.resource_type}${log.resource_id ? ` (${log.resource_id.slice(0, 8)}…)` : ''}`
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" ff="monospace">
                        {log.ip_address
                          || (typeof log.details?.ip_address === 'string' ? log.details.ip_address : null)
                          || '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {logs.length === 0 && !refreshing && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <EmptyState
                        icon={<Text style={{ fontSize: 28 }}>📋</Text>}
                        title={t('audit_log.empty_title', { defaultValue: 'Chưa có nhật ký' })}
                        description={t('audit_log.empty_desc', { defaultValue: 'Không có bản ghi hoạt động nào được ghi nhận.' })}
                      />
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Box>

          <ListPaginationBar
            page={page}
            total={total}
            limit={pageSize}
            onPageChange={setPage}
            showPageSize={false}
            bordered={false}
          />
        </Paper>
      </Stack>
    </Box>
  );
};

export default AuditLogPage;
