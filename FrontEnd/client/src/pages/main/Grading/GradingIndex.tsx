import { useEffect, useMemo, useState } from 'react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, slicePage } from '@/utils/pagination';
import { useNavigate } from 'react-router-dom';
import {
  Box, Text, Loader, Table, Badge, Paper, Alert, Stack, Group, Select, TextInput,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import examApi, { type Exam } from '@/services/examApi';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import PageHeader from '@/components/PageHeader/PageHeader';
import { IconSearch } from '@tabler/icons-react';

const GradingIndex = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const examList = await examApi.getExams();
        setExams(examList);
      } catch {
        setError(t('errors.session_list_failed', 'Lỗi khi tải dữ liệu'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [t]);

  const subjectOptions = useMemo(() => {
    const uniqueSubjects = new Set<string>();
    exams.forEach((exam) => {
      if (exam.subject_name) uniqueSubjects.add(exam.subject_name);
    });
    return [
      { value: 'all', label: t('grading.filter_all_subjects', 'Tất cả môn học') },
      ...Array.from(uniqueSubjects).sort().map((subject) => ({ value: subject, label: subject })),
    ];
  }, [exams, t]);

  const filteredExams = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    return exams.filter((exam) => {
      const subjectName = exam.subject_name ?? '';
      const examTitle = exam.title ?? '';
      const matchesKeyword = !keywordLower || examTitle.toLowerCase().includes(keywordLower);
      const matchesSubject = subjectFilter === 'all' || subjectName === subjectFilter;
      return matchesKeyword && matchesSubject;
    });
  }, [exams, keyword, subjectFilter]);

  const paginatedExams = useMemo(
    () => slicePage(filteredExams, page, pageSize),
    [filteredExams, page, pageSize]
  );

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="lg">
        <PageHeader title={t('nav.grading', 'Nhập điểm thi giấy')} />

        <Paper withBorder radius="md" p="md">
          <Group justify="space-between" mb="md" wrap="nowrap">
            <TextInput
              placeholder={t('grading.search_placeholder', 'Tìm kiếm bài thi...')}
              leftSection={<IconSearch size={16} />}
              value={keyword}
              onChange={(e) => { setKeyword(e.currentTarget.value); setPage(1); }}
              style={{ flex: 1, maxWidth: 300 }}
            />
            <Group gap="sm">
              <Select
                value={subjectFilter}
                onChange={(val) => { setSubjectFilter(val || 'all'); setPage(1); }}
                data={subjectOptions}
                allowDeselect={false}
                style={{ width: 200 }}
              />
            </Group>
          </Group>

          {loading ? (
            <Box py="xl" style={{ display: 'flex', justifyContent: 'center' }}>
              <Loader />
            </Box>
          ) : error ? (
            <Alert color="red" variant="light">{error}</Alert>
          ) : (
            <>
              <Box style={{ overflowX: 'auto' }}>
                <Table striped highlightOnHover verticalSpacing="sm">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('grading.exam', 'Bài thi')}</Table.Th>
                      <Table.Th>{t('grading.subject', 'Môn học')}</Table.Th>
                      <Table.Th>{t('grading.created_at', 'Ngày tạo')}</Table.Th>
                      <Table.Th>{t('common.actions', 'Thao tác')}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {paginatedExams.length === 0 ? (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text c="dimmed" ta="center" py="md">
                            {t('grading.no_sessions', 'Không có bài thi nào.')}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ) : (
                      paginatedExams.map((exam) => (
                        <Table.Tr key={exam.id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>{exam.title}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge color="blue" variant="light">
                              {exam.subject_name || 'N/A'}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {new Date(exam.created_at).toLocaleDateString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <ButtonLight
                              size="xs"
                              label="Nhập điểm"
                              onClick={() => navigate(`/offline-grades/${exam.id}`)}
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))
                    )}
                  </Table.Tbody>
                </Table>
              </Box>

              {filteredExams.length > 0 && (
                <Box mt="md">
                  <ListPaginationBar
                    page={page}
                    limit={pageSize}
                    total={filteredExams.length}
                    onPageChange={setPage}
                    onLimitChange={setPageSize}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>
      </Stack>
    </Box>
  );
};

export default GradingIndex;