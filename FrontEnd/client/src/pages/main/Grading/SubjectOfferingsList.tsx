import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Select,
  Button,
  LoadingOverlay,
  Alert,
  Badge,
  Pagination,
} from '@mantine/core';
import { IconSearch, IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader/PageHeader';
import gradingApi, { type GradingOffering } from '@/services/gradingApi';

export default function SubjectOfferingsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [offerings, setOfferings] = useState<GradingOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [keyword, setKeyword] = useState('');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await gradingApi.getOfferings();
        setOfferings(data);
      } catch {
        setError(t('errors.fetch_failed', 'Lỗi khi tải dữ liệu'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const semesterOptions = useMemo(() => {
    const sems = new Set<string>();
    offerings.forEach(o => sems.add(o.semester_name));
    return [
      { value: 'all', label: t('common.all', 'Tất cả') },
      ...Array.from(sems).sort().map(s => ({ value: s, label: s })),
    ];
  }, [offerings, t]);

  const filtered = useMemo(() => {
    let list = offerings;
    if (selectedSemester !== 'all') {
      list = list.filter(o => o.semester_name === selectedSemester);
    }
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      list = list.filter(o => 
        o.subject_name.toLowerCase().includes(q) || 
        o.subject_code.toLowerCase().includes(q) ||
        o.section_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [offerings, keyword, selectedSemester]);

  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="lg">
        <PageHeader title={t('grading.subject_grading', 'Quản lý điểm môn học')} />

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="md" wrap="nowrap">
            <TextInput
              placeholder={t('common.search_placeholder', 'Tìm kiếm môn học...')}
              leftSection={<IconSearch size={16} />}
              value={keyword}
              onChange={(e) => { setKeyword(e.currentTarget.value); setPage(1); }}
              w={300}
            />
            <Select
              data={semesterOptions}
              value={selectedSemester}
              onChange={(v) => { setSelectedSemester(v || 'all'); setPage(1); }}
              w={200}
            />
          </Group>

          <Box pos="relative" mih={300}>
            <LoadingOverlay visible={loading} zIndex={1000} />
            {error && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
                {error}
              </Alert>
            )}
            {!error && (
              <>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('common.subject', 'Môn học')}</Table.Th>
                      <Table.Th>Học kỳ</Table.Th>
                      <Table.Th>Lớp / Nhóm</Table.Th>
                      <Table.Th>Sĩ số</Table.Th>
                      <Table.Th>{t('common.actions', 'Thao tác')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginated.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text c="dimmed" ta="center" py="md">
                            {t('grading.no_sessions', 'Không có dữ liệu')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      paginated.map((o) => (
                        <Table.Tr key={o.id}>
                          <Table.Td>
                            <Text fw={500} size="sm">{o.subject_name}</Text>
                            <Text size="xs" c="dimmed">{o.subject_code}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light">{o.semester_name} - {o.year}</Badge>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="outline" color="gray">{o.section_name}</Badge>
                          </Table.Td>
                          <Table.Td>{o.student_count}</Table.Td>
                          <Table.Td>
                            <Button
                              variant="subtle"
                              size="xs"
                              rightSection={<IconArrowRight size={14} />}
                              onClick={() => navigate(`/grading/offering/${o.id}`)}
                            >
                              Nhập điểm
                            </Button>
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
                
                {filtered.length > itemsPerPage && (
                  <Group justify="center" mt="md">
                    <Pagination
                      total={Math.ceil(filtered.length / itemsPerPage)}
                      value={page}
                      onChange={setPage}
                    />
                  </Group>
                )}
              </>
            )}
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
