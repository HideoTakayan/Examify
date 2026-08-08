import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Title,
  Table,
  Modal,
  Group,
  Stack,
  Text,
  Loader,
  Badge,
  Paper,
  ActionIcon,
  TextInput,
  Textarea,
  NumberInput,
  Select,
  Switch,
  MultiSelect,
  Button,
  Container,
  ScrollArea,
  Divider,
  Checkbox,
  CloseButton,
  ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch, IconSchool, IconInfoCircle } from '@tabler/icons-react';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import subjectApi from '@/services/subjectApi';
import programApi, { type ProgramDto } from '@/services/programApi';
import useAuth from '@/hooks/useAuth';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category?: string | null;
  program_id?: string | null;
  prerequisites?: { id: string; name: string; code: string }[];
  is_active: boolean;
  created_at: string;
}

interface SubjectFormData {
  name: string;
  code: string;
  credits: number;
  semester: number;
  category: string;
  sub_category: string | null;
  program_id: string;
  prerequisite_ids: string[];
  is_active: boolean;
}

const SUB_CATEGORIES = [
  { value: 'math', label: 'Đại số / Toán' },
  { value: 'english', label: 'Tiếng Anh' },
  { value: 'programming', label: 'Lập trình' },
  { value: 'software_eng', label: 'Phần mềm' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'network', label: 'Mạng' },
  { value: 'soft_skills', label: 'Kỹ năng mềm' },
  { value: 'national_defense', label: 'Quốc phòng' },
  { value: 'internship', label: 'Thực tập' },
];

const SUB_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  SUB_CATEGORIES.map((c) => [c.value, c.label])
);

const subCategoryLabel = (value: string | null | undefined) =>
  value ? (SUB_CATEGORY_LABELS[value] ?? value) : '—';

const CATEGORIES = [
  { value: 'general', label: 'Tổng quát' },
  { value: 'programming', label: 'Lập trình' },
  { value: 'math', label: 'Toán' },
  { value: 'english', label: 'Tiếng Anh' },
  { value: 'network', label: 'Mạng' },
  { value: 'ai_ml', label: 'AI / ML' },
  { value: 'software_eng', label: 'Công nghệ phần mềm' },
];

const fullScreenModalProps = {
  fullScreen: true,
  transitionProps: { transition: 'slide-up' as const, duration: 200 },
  padding: 0,
};

const SubCategoryBadge = ({ subCategory }: { subCategory: string | null | undefined }) => {
  if (!subCategory) {
    return (
      <Badge size="sm" variant="light" color="gray">
        Chưa phân nhóm
      </Badge>
    );
  }
  const colors: Record<string, string> = {
    math: 'violet',
    english: 'green',
    programming: 'blue',
    software_eng: 'teal',
    ai: 'red',
    network: 'orange',
    soft_skills: 'cyan',
    national_defense: 'gray',
    internship: 'grape',
  };
  return (
    <Badge size="sm" variant="light" color={colors[subCategory] || 'gray'}>
      {subCategoryLabel(subCategory)}
    </Badge>
  );
};

const CategoryBadge = ({ category }: { category: string }) => {
  const colors: Record<string, string> = {
    general: 'gray',
    programming: 'blue',
    math: 'violet',
    english: 'green',
    network: 'orange',
    ai_ml: 'red',
    software_eng: 'teal',
  };
  const labels: Record<string, string> = {
    general: 'Tổng quát',
    programming: 'Lập trình',
    math: 'Toán',
    english: 'Tiếng Anh',
    network: 'Mạng',
    ai_ml: 'AI/ML',
    software_eng: 'CNPM',
  };
  return (
    <Badge size="sm" variant="light" color={colors[category] || 'gray'}>
      {labels[category] || category}
    </Badge>
  );
};

const SubjectManagementPage = () => {
  const { accessToken } = useAuth();
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [programCreateOpen, setProgramCreateOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      const list = await programApi.getPrograms();
      setPrograms(list);
      setSelectedProgramId((prev) => {
        if (prev && list.some((p) => p.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setError('Không tải được danh sách chuyên ngành.');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (accessToken) void loadPrograms();
  }, [accessToken, loadPrograms]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await subjectApi.listSubjects({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: debouncedSearch || undefined,
        program_id: selectedProgramId ?? undefined,
        sub_category: selectedGroupId ?? undefined,
      });
      setSubjects(data.items as Subject[]);
      setTotal(data.total);
    } catch {
      setError('Không tải được danh sách môn học.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, page, pageSize, debouncedSearch, selectedProgramId, selectedGroupId]);

  useEffect(() => {
    void fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, debouncedSearch, selectedProgramId, selectedGroupId]);

  useEffect(() => {
    if (!accessToken) return;
    void subjectApi
      .getSubjects()
      .then((list) => setAllSubjects(list as Subject[]))
      .catch(() => {});
  }, [accessToken]);

  const pageIds = subjects.map((s) => s.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Xóa ${ids.length} môn đã chọn? Môn đang dùng trong đề thi hoặc lớp học sẽ không xóa được.`
      )
    ) {
      return;
    }
    setBulkDeleting(true);
    setError('');
    try {
      const result = await subjectApi.bulkDeleteSubjects(ids);
      setSelectedIds(new Set());
      if (result.failed.length > 0) {
        setNotice(`Đã xóa ${result.deleted} môn. ${result.failed.length} môn không xóa được.`);
        setError(
          result.failed
            .slice(0, 5)
            .map((f) => f.reason)
            .join(' · ')
        );
      } else {
        setNotice(`Đã xóa ${result.deleted} môn học.`);
      }
      void fetchSubjects();
      void loadPrograms();
      void subjectApi.getSubjects().then((list) => setAllSubjects(list as Subject[]));
    } catch {
      setError('Xóa hàng loạt thất bại.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa môn học này? Hành động này không thể hoàn tác.')) return;
    try {
      await subjectApi.deleteSubject(id);
      setNotice('Đã xóa môn học.');
      void fetchSubjects();
      void loadPrograms();
    } catch {
      setError('Không xóa được môn học.');
    }
  };

  const openEdit = async (subject: Subject) => {
    try {
      const detail = await subjectApi.getSubject(subject.id);
      setEditingSubject(detail as Subject);
      setEditOpen(true);
    } catch {
      setEditingSubject(subject);
      setEditOpen(true);
    }
  };

  const handleCreate = async (data: SubjectFormData) => {
    try {
      await subjectApi.createSubject({
        name: data.name,
        code: data.code,
        credits: data.credits,
        semester: data.semester,
        category: data.category,
        sub_category: data.sub_category,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
      });
      setCreateOpen(false);
      setNotice('Đã tạo môn học.');
      void fetchSubjects();
      void loadPrograms();
    } catch {
      setError('Không tạo được môn học.');
    }
  };

  const handleUpdate = async (id: string, data: SubjectFormData) => {
    try {
      await subjectApi.updateSubject(id, {
        name: data.name,
        code: data.code,
        credits: data.credits,
        semester: data.semester,
        category: data.category,
        sub_category: data.sub_category,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
        is_active: data.is_active,
      });
      setEditOpen(false);
      setNotice('Đã cập nhật môn học.');
      void fetchSubjects();
    } catch {
      setError('Không cập nhật được môn học.');
    }
  };

  const handleCreateProgram = async (code: string, name: string, description: string) => {
    try {
      const created = await programApi.createProgram({
        code,
        name,
        description: description || null,
      });
      setProgramCreateOpen(false);
      setNotice(`Đã tạo chuyên ngành ${created.name}.`);
      await loadPrograms();
      setSelectedProgramId(created.id);
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' &&
        e !== null &&
        'response' in e &&
        typeof (e as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (e as { response: { data: { error: string } } }).response.data.error
          : 'Không tạo được chuyên ngành.';
      setError(msg);
    }
  };

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name} (${p.subject_count ?? 0} môn)`,
  }));

  const subjectsInProgram = selectedProgramId
    ? allSubjects.filter((s) => s.program_id === selectedProgramId)
    : [];

  const subjectsInGroup = selectedGroupId
    ? subjectsInProgram.filter((s) => s.sub_category === selectedGroupId)
    : subjectsInProgram;

  const groupOptions = selectedProgramId
    ? SUB_CATEGORIES.map((g) => {
        const n = subjectsInProgram.filter((s) => s.sub_category === g.value).length;
        return { value: g.value, label: `${g.label} (${n} môn)` };
      })
    : [];

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const canManageSubjects = Boolean(selectedProgramId && selectedGroupId);

  return (
    <Box className="min-h-[calc(100vh-80px)] p-4">
      <Stack gap="md" maw={1400} mx="auto">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Box>
            <Title order={2}>Quản lý môn học</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Thứ tự: Chuyên ngành → Nhóm môn → Môn học. Chọn đủ 2 bước đầu để thêm hoặc lọc môn.
            </Text>
          </Box>
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconSchool size={16} />}
              onClick={() => setProgramCreateOpen(true)}
            >
              Thêm chuyên ngành
            </Button>
            <ButtonFilled
              label="Thêm môn học"
              leftSection={<IconPlus size={16} />}
              disabled={!canManageSubjects}
              onClick={() => setCreateOpen(true)}
            />
          </Group>
        </Group>

        {error && (
          <Badge color="red" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
            {error}
          </Badge>
        )}
        {notice && (
          <Badge color="green" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
            {notice}
          </Badge>
        )}

        <Paper withBorder radius="md" p="md">
          <Group gap="xs" mb="md" wrap="wrap">
            <Badge variant={selectedProgramId ? 'filled' : 'outline'} color="teal" size="lg">
              1. Chuyên ngành
            </Badge>
            <Text c="dimmed" size="sm">
              ›
            </Text>
            <Badge
              variant={selectedGroupId ? 'filled' : 'outline'}
              color={selectedProgramId ? 'teal' : 'gray'}
              size="lg"
            >
              2. Nhóm môn
            </Badge>
            <Text c="dimmed" size="sm">
              ›
            </Text>
            <Badge
              variant={canManageSubjects ? 'filled' : 'outline'}
              color={canManageSubjects ? 'teal' : 'gray'}
              size="lg"
            >
              3. Môn học
            </Badge>
          </Group>

          <Group align="flex-end" wrap="wrap" grow>
            <Select
              label="1. Chuyên ngành"
              placeholder="Chọn ngành"
              data={programOptions}
              value={selectedProgramId}
              onChange={(v) => {
                setSelectedProgramId(v);
                setSelectedGroupId(null);
                setPage(1);
              }}
              searchable
              style={{ minWidth: 220, flex: 1 }}
            />
            <Select
              label="2. Nhóm môn"
              placeholder={selectedProgramId ? 'Chọn nhóm môn' : 'Chọn ngành trước'}
              data={groupOptions}
              value={selectedGroupId}
              onChange={(v) => {
                setSelectedGroupId(v);
                setPage(1);
              }}
              disabled={!selectedProgramId}
              searchable
              style={{ minWidth: 220, flex: 1 }}
            />
            <TextInput
              label="3. Tìm môn"
              placeholder="Tên hoặc mã môn..."
              leftSection={<IconSearch size={14} />}
              value={search}
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
              disabled={!selectedProgramId}
              style={{ minWidth: 200, flex: 1 }}
            />
          </Group>

          {selectedProgram && selectedGroupId && (
            <Text size="sm" c="dimmed" mt="sm">
              Đang xem: <strong>{selectedProgram.name}</strong> ›{' '}
              <strong>{subCategoryLabel(selectedGroupId)}</strong>
            </Text>
          )}
        </Paper>

        {selectedIds.size > 0 && (
          <Group>
            <Text size="sm" c="dimmed">
              Đã chọn {selectedIds.size} môn
            </Text>
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              loading={bulkDeleting}
              onClick={() => void handleBulkDelete()}
            >
              Xóa đã chọn
            </Button>
            <Button variant="subtle" size="compact-sm" onClick={() => setSelectedIds(new Set())}>
              Bỏ chọn
            </Button>
          </Group>
        )}

        {!selectedProgramId ? (
          <Paper withBorder radius="md" p="xl">
            <Text c="dimmed" ta="center">
              Bước 1: Chọn hoặc tạo chuyên ngành để bắt đầu.
            </Text>
          </Paper>
        ) : !selectedGroupId ? (
          <Paper withBorder radius="md" p="xl">
            <Text c="dimmed" ta="center">
              Bước 2: Chọn nhóm môn trong ngành{' '}
              <strong>{selectedProgram?.name ?? ''}</strong> để xem danh sách môn.
            </Text>
          </Paper>
        ) : loading ? (
          <Loader />
        ) : (
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
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={44}>
                    <Checkbox
                      checked={allPageSelected}
                      indeterminate={somePageSelected && !allPageSelected}
                      onChange={toggleSelectAllPage}
                      aria-label="Chọn tất cả trang này"
                    />
                  </Table.Th>
                  <Table.Th>Tên môn</Table.Th>
                  <Table.Th>Mã</Table.Th>
                  <Table.Th>Tín chỉ</Table.Th>
                  <Table.Th>Học kỳ</Table.Th>
                  <Table.Th>Nhóm môn</Table.Th>
                  <Table.Th>Loại</Table.Th>
                  <Table.Th>Tiên quyết</Table.Th>
                  <Table.Th>Trạng thái</Table.Th>
                  <Table.Th>Thao tác</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {subjects.map((subject) => (
                  <Table.Tr
                    key={subject.id}
                    bg={selectedIds.has(subject.id) ? 'var(--mantine-color-teal-light)' : undefined}
                  >
                    <Table.Td>
                      <Checkbox
                        checked={selectedIds.has(subject.id)}
                        onChange={() => toggleSelectRow(subject.id)}
                        aria-label={`Chọn ${subject.name}`}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{subject.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {subject.code || '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{subject.credits}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{subject.semester}</Text>
                    </Table.Td>
                    <Table.Td>
                      <SubCategoryBadge subCategory={subject.sub_category} />
                    </Table.Td>
                    <Table.Td>
                      <CategoryBadge category={subject.category} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" lineClamp={2}>
                        {(subject.prerequisites?.length ?? 0) > 0
                          ? subject.prerequisites!.map((p) => p.name).join(', ')
                          : '—'}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={subject.is_active ? 'green' : 'gray'} size="sm">
                        {subject.is_active ? 'Hoạt động' : 'Không hoạt động'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <ActionIcon variant="subtle" color="blue" onClick={() => void openEdit(subject)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon variant="subtle" color="red" onClick={() => void handleDelete(subject.id)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
                {subjects.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={10}>
                      <Text c="dimmed" ta="center" py="lg">
                        Chưa có môn trong nhóm «{subCategoryLabel(selectedGroupId)}». Bấm «Thêm môn học».
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>

      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm môn học"
        {...fullScreenModalProps}
      >
        <ScrollArea h="100vh" type="auto">
          <Container size="md" py="xl" pb={80}>
            <SubjectForm
              programs={programs}
              defaultProgramId={selectedProgramId}
              defaultGroupId={selectedGroupId}
              allSubjects={subjectsInGroup}
              onSubmit={(data) => void handleCreate(data)}
              onCancel={() => setCreateOpen(false)}
            />
          </Container>
        </ScrollArea>
      </Modal>

      <Modal opened={editOpen} onClose={() => setEditOpen(false)} title="Sửa môn học" {...fullScreenModalProps}>
        <ScrollArea h="100vh" type="auto">
          <Container size="md" py="xl" pb={80}>
            {editingSubject && (
              <SubjectForm
                initial={editingSubject}
                programs={programs}
                defaultProgramId={editingSubject.program_id ?? selectedProgramId}
                defaultGroupId={editingSubject.sub_category ?? selectedGroupId}
                allSubjects={subjectsInProgram}
                onSubmit={(data) => void handleUpdate(editingSubject.id, data)}
                onCancel={() => setEditOpen(false)}
              />
            )}
          </Container>
        </ScrollArea>
      </Modal>

      <Modal
        opened={programCreateOpen}
        onClose={() => setProgramCreateOpen(false)}
        size="lg"
        radius="md"
        padding={0}
        centered
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.45, blur: 4 }}
      >
        <ProgramForm
          onSubmit={(code, name, desc) => void handleCreateProgram(code, name, desc)}
          onCancel={() => setProgramCreateOpen(false)}
        />
      </Modal>
    </Box>
  );
};

type SubjectFormProps = {
  initial?: Subject;
  programs: ProgramDto[];
  defaultProgramId: string | null;
  defaultGroupId?: string | null;
  allSubjects: Subject[];
  onSubmit: (data: SubjectFormData) => void;
  onCancel: () => void;
};

function SubjectForm({
  initial,
  programs,
  defaultProgramId,
  defaultGroupId,
  allSubjects,
  onSubmit,
  onCancel,
}: SubjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [code, setCode] = useState(initial?.code ?? '');
  const [credits, setCredits] = useState<number>(initial?.credits ?? 0);
  const [semester, setSemester] = useState<number>(initial?.semester ?? 0);
  const [category, setCategory] = useState(initial?.category ?? 'general');
  const [subCategory, setSubCategory] = useState<string | null>(
    initial?.sub_category ?? defaultGroupId ?? null
  );
  const [programId, setProgramId] = useState(initial?.program_id ?? defaultProgramId ?? '');
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(
    initial?.prerequisites?.map((p) => p.id) ?? []
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  const prereqOptions = allSubjects
    .filter((s) => s.id !== initial?.id && s.program_id === programId)
    .filter((s) => !subCategory || s.sub_category === subCategory)
    .map((s) => ({
      value: s.id,
      label: s.code ? `${s.code} — ${s.name}` : s.name,
    }));

  const handleSubmit = () => {
    if (!name.trim() || !programId || !subCategory) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
      sub_category: subCategory,
      program_id: programId,
      prerequisite_ids: prerequisiteIds,
      is_active: isActive,
    });
  };

  return (
    <Stack gap="lg">
      <Title order={3}>{initial ? 'Sửa môn học' : 'Thêm môn học mới'}</Title>
      <Text c="dimmed" size="sm">
        Thứ tự: Chuyên ngành → Nhóm môn → Thông tin môn
      </Text>
      <Divider />
      <Select
        label="1. Chuyên ngành"
        description="Ngành đào tạo (CNTT, Du lịch, …)"
        required
        data={programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
        value={programId || null}
        onChange={(v) => {
          setProgramId(v ?? '');
          if (!initial) setSubCategory(null);
        }}
        searchable
      />
      <Select
        label="2. Nhóm môn"
        description="Nhóm học phần trong chuyên ngành"
        required
        data={SUB_CATEGORIES}
        value={subCategory}
        onChange={setSubCategory}
        searchable
        placeholder="Chọn nhóm môn"
        disabled={!programId}
      />
      <Divider label="3. Thông tin môn" labelPosition="left" />
      <TextInput
        label="Tên môn học"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
        size="md"
        placeholder="Ví dụ: Nghiệp vụ lễ tân"
      />
      <TextInput
        label="Mã môn"
        value={code}
        onChange={(e) => setCode(e.currentTarget.value)}
        size="md"
        placeholder="Ví dụ: DL101"
      />
      <Group grow>
        <NumberInput label="Tín chỉ" value={credits} onChange={(v) => setCredits(Number(v))} min={0} step={0.5} size="md" />
        <NumberInput label="Học kỳ" value={semester} onChange={(v) => setSemester(Number(v))} min={-1} size="md" />
      </Group>
      <Select
        label="Loại chi tiết"
        description="Phân loại bổ sung (đại cương, nền tảng, …)"
        value={category}
        onChange={(v) => setCategory(v ?? 'general')}
        data={CATEGORIES}
        size="md"
      />
      <MultiSelect
        label="Môn tiên quyết"
        description="Cùng chuyên ngành và nhóm môn"
        data={prereqOptions}
        value={prerequisiteIds}
        onChange={setPrerequisiteIds}
        searchable
        clearable
        size="md"
        placeholder="Chọn môn phụ thuộc"
      />
      {initial && (
        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Hoạt động
          </Text>
          <Switch checked={isActive} onChange={(e) => setIsActive(e.currentTarget.checked)} />
        </Group>
      )}
      <Group justify="flex-end" mt="xl">
        <Button variant="default" size="md" onClick={onCancel}>
          Hủy
        </Button>
        <Button color="teal" size="md" onClick={handleSubmit} disabled={!programId || !subCategory || !name.trim()}>
          Lưu
        </Button>
      </Group>
    </Stack>
  );
}

const PROGRAM_EXAMPLES = [
  { code: 'CNTT', name: 'Công nghệ thông tin', color: 'teal' as const },
  { code: 'DL', name: 'Du lịch', color: 'cyan' as const },
  { code: 'KT', name: 'Kế toán', color: 'violet' as const },
];

function ProgramForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (code: string, name: string, description: string) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const canSubmit = code.trim().length > 0 && name.trim().length > 0;

  const applyExample = (exampleCode: string, exampleName: string) => {
    setCode(exampleCode);
    setName(exampleName);
  };

  return (
    <Stack gap={0}>
      <Box
        px="lg"
        py="md"
        style={{
          background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)',
          borderRadius: 'var(--mantine-radius-md) var(--mantine-radius-md) 0 0',
        }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" align="flex-start" wrap="nowrap">
            <ThemeIcon size={44} radius="md" variant="white" color="teal">
              <IconSchool size={24} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={4}>
              <Title order={3} c="white" fw={700}>
                Thêm chuyên ngành mới
              </Title>
              <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                Tạo ngành đào tạo, sau đó thêm môn học và đề thi cho ngành đó.
              </Text>
            </Stack>
          </Group>
          <CloseButton
            size="md"
            variant="transparent"
            c="white"
            onClick={onCancel}
            aria-label="Đóng"
          />
        </Group>
      </Box>

      <Box px="lg" py="md">
        <Paper withBorder radius="md" p="md" bg="var(--mantine-color-gray-0)">
          <Group gap="xs" mb="xs" wrap="nowrap">
            <IconInfoCircle size={18} style={{ color: 'var(--mantine-color-teal-6)', flexShrink: 0 }} />
            <Text size="sm" fw={600}>
              Gợi ý mã ngành (bấm để điền nhanh)
            </Text>
          </Group>
          <Group gap="xs">
            {PROGRAM_EXAMPLES.map((ex) => (
              <Badge
                key={ex.code}
                size="lg"
                variant="light"
                color={ex.color}
                style={{ cursor: 'pointer' }}
                onClick={() => applyExample(ex.code, ex.name)}
              >
                {ex.code} — {ex.name}
              </Badge>
            ))}
          </Group>
          <Text size="xs" c="dimmed" mt="sm">
            CNTT đã có sẵn trong hệ thống. Mã ngành viết hoa, không trùng ngành khác.
          </Text>
        </Paper>

        <Stack gap="md" mt="lg">
          <TextInput
            label="Mã ngành"
            description="2–10 ký tự, dùng trong danh sách và báo cáo"
            required
            size="md"
            placeholder="VD: DL, KT, QTKD"
            value={code}
            onChange={(e) => setCode(e.currentTarget.value.toUpperCase().replace(/\s/g, ''))}
            maxLength={10}
            styles={{ input: { fontFamily: 'var(--mantine-font-family-monospace)', fontWeight: 600 } }}
          />
          <TextInput
            label="Tên chuyên ngành"
            description="Tên đầy đủ hiển thị cho admin và giảng viên"
            required
            size="md"
            placeholder="VD: Quản trị du lịch"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <Textarea
            label="Mô tả"
            description="Tuỳ chọn — ghi chú nội bộ"
            size="md"
            placeholder="Ghi chú cho quản trị viên…"
            value={description}
            onChange={(e) => setDescription(e.currentTarget.value)}
            minRows={3}
            autosize
            maxRows={5}
          />
        </Stack>
      </Box>

      <Box
        px="lg"
        py="md"
        style={{
          borderTop: '1px solid var(--mantine-color-gray-3)',
          background: 'var(--mantine-color-gray-0)',
          borderRadius: '0 0 var(--mantine-radius-md) var(--mantine-radius-md)',
        }}
      >
        <Group justify="space-between" wrap="wrap">
          <Text size="xs" c="dimmed">
            {canSubmit ? 'Sẵn sàng tạo chuyên ngành' : 'Nhập mã và tên chuyên ngành để tiếp tục'}
          </Text>
          <Group gap="sm">
            <Button variant="default" size="md" onClick={onCancel}>
              Hủy
            </Button>
            <Button
              color="teal"
              size="md"
              leftSection={<IconPlus size={18} />}
              onClick={() => onSubmit(code.trim(), name.trim(), description.trim())}
              disabled={!canSubmit}
            >
              Tạo chuyên ngành
            </Button>
          </Group>
        </Group>
      </Box>
    </Stack>
  );
}

export default SubjectManagementPage;
