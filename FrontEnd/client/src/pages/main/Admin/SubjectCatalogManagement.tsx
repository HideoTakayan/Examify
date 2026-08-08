import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tabs,
  Alert,
  FileButton,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconSearch, IconFolders, IconDownload, IconUpload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ListPaginationBar } from '@/components/ListPagination';
import { DEFAULT_PAGE_SIZE, pageToOffset } from '@/utils/pagination';
import subjectApi, {
  type SubjectImportPreviewRow,
  resetSubjectCatalogCache,
} from '@/services/subjectApi';
import programApi, { type ProgramDto } from '@/services/programApi';
import subjectGroupApi, { type SubjectGroupDto } from '@/services/subjectGroupApi';
import AssignFromWarehouseModal from './AssignFromWarehouseModal';
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
  subject_group_id?: string | null;
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
  subject_group_id: string | null;
  program_id: string;
  prerequisite_ids: string[];
  is_active: boolean;
}

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

const GroupNameBadge = ({
  groupId,
  groups,
  fallback,
}: {
  groupId?: string | null;
  groups: SubjectGroupDto[];
  fallback?: string | null;
}) => {
  const g = groupId ? groups.find((x) => x.id === groupId) : null;
  const label = g?.name ?? fallback ?? null;
  if (!label) {
    return (
      <Badge size="sm" variant="light" color="gray">
        Chưa phân nhóm
      </Badge>
    );
  }
  return (
    <Badge size="sm" variant="light" color="teal">
      {label}
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

const SubjectCatalogManagementPage = () => {
  const { t } = useTranslation();
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
  const [groups, setGroups] = useState<SubjectGroupDto[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SubjectGroupDto | null>(null);
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('groups');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<SubjectImportPreviewRow[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [programSubjects, setProgramSubjects] = useState<Subject[]>([]);

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

  const refreshCatalog = () => {
    if (selectedProgramId) resetSubjectCatalogCache(selectedProgramId);
    else resetSubjectCatalogCache();
  };

  const loadGroups = useCallback(async () => {
    if (!selectedProgramId) {
      setGroups([]);
      return;
    }
    try {
      setGroupsLoading(true);
      const catalog = await subjectApi.getCatalog(selectedProgramId);
      const list = catalog.groups
        .filter((g) => g.id !== 'other')
        .map(
          (g): SubjectGroupDto => ({
            id: g.id,
            program_id: catalog.program_id,
            code: g.code,
            name: g.name,
            description: g.description,
            sort_order: g.sort_order,
            is_active: true,
            created_at: '',
            subject_count: g.subject_count,
          })
        );
      setGroups(list);
      const flat: Subject[] = [];
      for (const g of catalog.groups) {
        for (const s of g.subjects) {
          flat.push({
            id: s.id,
            name: s.name,
            code: s.code,
            credits: s.credits,
            semester: s.semester,
            category: s.category,
            sub_category: s.sub_category,
            subject_group_id: s.subject_group_id,
            program_id: catalog.program_id,
            is_active: true,
            created_at: '',
          });
        }
      }
      setProgramSubjects(flat);
      setSelectedGroupId((prev) => {
        if (prev && list.some((g) => g.id === prev)) return prev;
        return null;
      });
    } catch {
      setError('Không tải được nhóm môn.');
    } finally {
      setGroupsLoading(false);
    }
  }, [selectedProgramId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      const data = await subjectApi.listSubjects({
        limit: pageSize,
        offset: pageToOffset(page, pageSize),
        search: debouncedSearch || undefined,
        program_id: selectedProgramId ?? undefined,
        subject_group_id: selectedGroupId ?? undefined,
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
      .catch(() => { });
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
        subject_group_id: data.subject_group_id,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
      });
      setCreateOpen(false);
      setNotice('Đã tạo môn học.');
      refreshCatalog();
      void fetchSubjects();
      void loadPrograms();
      void loadGroups();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Không tạo được môn học.');
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
        subject_group_id: data.subject_group_id,
        program_id: data.program_id,
        prerequisite_ids: data.prerequisite_ids,
        is_active: data.is_active,
      });
      setEditOpen(false);
      setNotice('Đã cập nhật môn học.');
      refreshCatalog();
      void fetchSubjects();
      void loadGroups();
    } catch {
      setError('Không cập nhật được môn học.');
    }
  };

  const openGroupCreate = () => {
    setEditingGroup(null);
    setGroupCode('');
    setGroupName('');
    setGroupDesc('');
    setGroupFormOpen(true);
  };

  const openGroupEdit = (g: SubjectGroupDto) => {
    setEditingGroup(g);
    setGroupCode(g.code);
    setGroupName(g.name);
    setGroupDesc(g.description ?? '');
    setGroupFormOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!selectedProgramId || !groupCode.trim() || !groupName.trim()) return;
    try {
      if (editingGroup) {
        await subjectGroupApi.update(
          editingGroup.id,
          {
            code: groupCode.trim(),
            name: groupName.trim(),
            description: groupDesc.trim() || null,
          },
          selectedProgramId
        );
        setNotice('Đã cập nhật nhóm môn.');
      } else {
        const created = await subjectGroupApi.create({
          code: groupCode.trim(),
          name: groupName.trim(),
          description: groupDesc.trim() || null,
          assign_to_program_id: selectedProgramId,
        });
        setSelectedGroupId(created.id);
        setActiveTab('subjects');
        setImportPreview([]);
        setImportFile(null);
        setImportOpen(true);
        setNotice('Đã tạo nhóm môn. Tải file mẫu và import danh sách môn bên dưới.');
      }
      setGroupFormOpen(false);
      refreshCatalog();
      await loadGroups();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Lưu nhóm môn thất bại.');
    }
  };

  const handleDeleteGroup = async (g: SubjectGroupDto) => {
    if (!selectedProgramId) return;
    if (!confirm(`Gỡ nhóm «${g.name}» khỏi chương trình ngành này? (Môn vẫn còn trong kho trường)`)) return;
    try {
      await programApi.unassignGroup(selectedProgramId, g.id);
      if (selectedGroupId === g.id) setSelectedGroupId(null);
      setNotice('Đã gỡ nhóm khỏi ngành.');
      refreshCatalog();
      void loadGroups();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Không xóa được nhóm môn.');
    }
  };

  const programOptions = programs.map((p) => ({
    value: p.id,
    label: `${p.code} — ${p.name} (${p.subject_count ?? 0} môn)`,
  }));

  const subjectsInProgram = programSubjects;

  const subjectsInGroup = selectedGroupId
    ? subjectsInProgram.filter((s) => s.subject_group_id === selectedGroupId)
    : subjectsInProgram;

  const assignedGroupIds = useMemo(
    () => new Set(groups.map((g) => g.id)),
    [groups]
  );

  const groupOptions = groups.map((g) => ({
    value: g.id,
    label: `${g.name} (${g.subject_count ?? 0} môn)`,
  }));

  const selectedProgram = programs.find((p) => p.id === selectedProgramId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const canManageSubjects = Boolean(selectedProgramId && selectedGroupId);

  const openImportModal = () => {
    setImportPreview([]);
    setImportFile(null);
    setImportOpen(true);
  };

  const downloadImportTemplate = async () => {
    try {
      const blob = await subjectApi.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mau-import-mon-hoc.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Không tải được file mẫu.');
    }
  };

  const handleImportPreview = async (file: File | null) => {
    if (!file || !selectedProgramId || !selectedGroupId) return;
    setImportFile(file);
    setError('');
    try {
      const rows = await subjectApi.importPreview(selectedProgramId, selectedGroupId, file);
      setImportPreview(rows);
      if (rows.length === 0) {
        setError('File không có dòng môn hợp lệ. Kiểm tra cột ten_mon.');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Đọc file Excel thất bại.');
      setImportPreview([]);
    }
  };

  const importConfirmable = importPreview.filter((r) => r.status === 'ok');

  const handleImportConfirm = async () => {
    if (!selectedProgramId || !selectedGroupId || importConfirmable.length === 0) return;
    setImporting(true);
    setError('');
    try {
      const result = await subjectApi.importConfirm(
        selectedProgramId,
        selectedGroupId,
        importConfirmable.map((r) => ({
          name: r.name,
          code: r.code,
          credits: r.credits,
          semester: r.semester,
          category: r.category,
        }))
      );
      if (result.failed.length > 0) {
        setNotice(`Đã thêm ${result.created} môn. ${result.failed.length} dòng lỗi.`);
        setError(result.failed.slice(0, 3).map((f) => `${f.name}: ${f.reason}`).join(' · '));
      } else {
        setNotice(`Đã import ${result.created} môn học.`);
      }
      setImportOpen(false);
      setImportPreview([]);
      setImportFile(null);
      refreshCatalog();
      void fetchSubjects();
      void loadGroups();
      void subjectApi.getSubjects().then((list) => setAllSubjects(list as Subject[]));
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Import thất bại.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box className="min-h-[calc(100vh-80px)] p-4 md:p-6">
      <Stack gap="xl" maw={1400} mx="auto">
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="lg">
          <Box>
            <Title order={2}>{t('subject_catalog.title')}</Title>
            <Text c="dimmed" size="sm" mt={4}>
              Kho trường (nhóm + môn) — ngành chỉ gán từ kho qua GET /subjects/catalog.
            </Text>
          </Box>

          <Box>
            <Group gap="sm">
              {/* Nút Chọn từ kho */}
              {selectedProgramId && (
                <Button variant="light" onClick={() => setAssignOpen(true)}>
                  Chọn từ kho
                </Button>
              )}

              {/* Nút Thêm nhóm (nếu đang ở tab groups) */}
              {selectedProgramId && activeTab === 'groups' && (
                <Button leftSection={<IconPlus size={16} />} color="teal" onClick={openGroupCreate}>
                  Thêm nhóm (kho + gán ngành)
                </Button>
              )}

              {/* Các nút dành cho tab subjects */}
              {activeTab === 'subjects' && (
                <>
                  <Button
                    variant="light"
                    leftSection={<IconUpload size={16} />}
                    disabled={!canManageSubjects}
                    onClick={openImportModal}
                  >
                    Import hàng loạt
                  </Button>
                  <ButtonFilled
                    label={t('subject_catalog.add_subject')}
                    leftSection={<IconPlus size={16} />}
                    disabled={!canManageSubjects}
                    onClick={() => setCreateOpen(true)}
                  />
                </>
              )}
            </Group>
          </Box>
        </Group>

        {error && (
          <Badge color="red" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: '10px 12px' }}>
            {error}
          </Badge>
        )}
        {notice && (
          <Badge color="green" size="lg" style={{ whiteSpace: 'normal', height: 'auto', padding: '10px 12px' }}>
            {notice}
          </Badge>
        )}

        <Paper withBorder radius="md" p="lg">
          <Group align="flex-end" wrap="wrap" grow>
            <Select
              label={t('subject_catalog.program')}
              placeholder={t('subject_catalog.select_program')}
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
          </Group>
          {selectedProgram && (
            <Text size="sm" c="dimmed" mt="md" pt={4}>
              Chuyên ngành: <strong>{selectedProgram.name}</strong>
              {selectedGroup && (
                <>
                  {' '}
                  › <strong>{selectedGroup.name}</strong>
                </>
              )}
            </Text>
          )}
        </Paper>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="sm">
            <Tabs.Tab value="groups" leftSection={<IconFolders size={16} />}>
              Nhóm môn
            </Tabs.Tab>
            <Tabs.Tab value="subjects" leftSection={<IconPlus size={16} />}>
              Môn học
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="groups" pt="lg">
            {!selectedProgramId ? (
              <Paper withBorder p="xl" radius="md">
                <Text c="dimmed" ta="center">
                  Chọn chuyên ngành ở trên để quản lý nhóm môn.
                </Text>
              </Paper>
            ) : groupsLoading ? (
              <Loader />
            ) : (
              <Paper withBorder radius="md" p={0}>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" mb="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Mã nhóm</Table.Th>
                      <Table.Th>Tên nhóm môn</Table.Th>
                      <Table.Th>Số môn</Table.Th>
                      <Table.Th>Thao tác</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {groups.map((g) => (
                      <Table.Tr key={g.id}>
                        <Table.Td>
                          <Text ff="monospace" fw={600}>
                            {g.code}
                          </Text>
                        </Table.Td>
                        <Table.Td>{g.name}</Table.Td>
                        <Table.Td>{g.subject_count ?? 0}</Table.Td>
                        <Table.Td>
                          <Group gap={4}>
                            <ActionIcon variant="light" color="blue" onClick={() => openGroupEdit(g)}>
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="teal"
                              title="Thêm môn vào nhóm này"
                              onClick={() => {
                                setSelectedGroupId(g.id);
                                setActiveTab('subjects');
                                openImportModal();
                              }}
                            >
                              <IconPlus size={16} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => void handleDeleteGroup(g)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {groups.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={4}>
                          <Text c="dimmed" ta="center" py="md">
                            Chưa có nhóm môn. Bấm «Thêm nhóm môn».
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="subjects" pt="lg">
            <Stack gap="lg">
            {selectedProgramId && (
              <Group align="flex-end" wrap="wrap" gap="md">
                <Select
                  label="Nhóm môn"
                  placeholder="Chọn nhóm để xem môn"
                  data={groupOptions}
                  value={selectedGroupId}
                  onChange={(v) => {
                    setSelectedGroupId(v);
                    setPage(1);
                  }}
                  searchable
                  style={{ minWidth: 280 }}
                />
                <TextInput
                  label="Tìm môn"
                  placeholder="Tên hoặc mã môn..."
                  leftSection={<IconSearch size={14} />}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.currentTarget.value);
                    setPage(1);
                  }}
                  style={{ minWidth: 260 }}
                />
              </Group>
            )}

            {selectedIds.size > 0 && (
              <Paper withBorder radius="md" p="sm" bg="var(--mantine-color-red-0)">
                <Group gap="md">
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
              </Paper>
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
              <Paper withBorder radius="md" p={0}>
                <Box pt="sm" px="sm">
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
                </Box>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md" mb="md">
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
                          <GroupNameBadge
                            groupId={subject.subject_group_id}
                            groups={groups}
                            fallback={subject.sub_category}
                          />
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
                            Chưa có môn trong nhóm «{selectedGroup?.name ?? 'đã chọn'}». Bấm «Thêm môn học».
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
            </Stack>
          </Tabs.Panel>
        </Tabs>
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
              allSubjects={subjectsInProgram}
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
                defaultGroupId={editingSubject.subject_group_id ?? selectedGroupId}
                allSubjects={subjectsInProgram}
                onSubmit={(data) => void handleUpdate(editingSubject.id, data)}
                onCancel={() => setEditOpen(false)}
              />
            )}
          </Container>
        </ScrollArea>
      </Modal>

      <Modal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import môn học hàng loạt"
        size="xl"
        centered
      >
        <Stack gap="md">
          <Alert color="blue" variant="light">
            Chọn đúng chuyên ngành và nhóm môn trước khi import. File mẫu có cột:{' '}
            <strong>ten_mon</strong> (bắt buộc), ma_mon, tin_chi, hoc_ky, loai.
            {selectedGroup && (
              <>
                {' '}
                Đang import vào nhóm <strong>{selectedGroup.name}</strong>.
              </>
            )}
          </Alert>
          <Group>
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={() => void downloadImportTemplate()}
            >
              Tải file mẫu (.xlsx)
            </Button>
            <FileButton onChange={(f) => void handleImportPreview(f)} accept=".xlsx,.xls">
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={16} />} disabled={!canManageSubjects}>
                  Chọn file Excel
                </Button>
              )}
            </FileButton>
          </Group>
          {importFile && (
            <Text size="sm" c="dimmed">
              {importFile.name}
            </Text>
          )}
          {importPreview.length > 0 && (
            <ScrollArea.Autosize mah={360}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Dòng</Table.Th>
                    <Table.Th>Tên môn</Table.Th>
                    <Table.Th>Mã</Table.Th>
                    <Table.Th>TC</Table.Th>
                    <Table.Th>HK</Table.Th>
                    <Table.Th>Trạng thái</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {importPreview.map((r) => (
                    <Table.Tr key={r.row}>
                      <Table.Td>{r.row}</Table.Td>
                      <Table.Td>{r.name || '—'}</Table.Td>
                      <Table.Td>{r.code || '—'}</Table.Td>
                      <Table.Td>{r.credits}</Table.Td>
                      <Table.Td>{r.semester}</Table.Td>
                      <Table.Td>
                        <Badge color={r.status === 'ok' ? 'green' : 'red'} size="sm">
                          {r.message}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setImportOpen(false)}>
              Hủy
            </Button>
            <Button
              color="teal"
              loading={importing}
              disabled={importConfirmable.length === 0}
              onClick={() => void handleImportConfirm()}
            >
              Xác nhận import ({importConfirmable.length} môn)
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={groupFormOpen}
        onClose={() => setGroupFormOpen(false)}
        title={editingGroup ? 'Sửa nhóm môn' : 'Thêm nhóm môn'}
        size="md"
        centered
      >
        <Stack gap="md">
          <TextInput
            label="Mã nhóm"
            required
            value={groupCode}
            onChange={(e) => setGroupCode(e.currentTarget.value.toLowerCase().replace(/\s/g, '_'))}
            placeholder="VD: software, ai_iot"
            disabled={Boolean(editingGroup)}
            description={editingGroup ? 'Mã nhóm không đổi sau khi tạo' : undefined}
          />
          <TextInput
            label="Tên nhóm môn"
            required
            value={groupName}
            onChange={(e) => setGroupName(e.currentTarget.value)}
            placeholder="VD: Nhóm phần mềm"
          />
          <Textarea
            label="Mô tả"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.currentTarget.value)}
            minRows={2}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setGroupFormOpen(false)}>
              Hủy
            </Button>
            <Button
              color="teal"
              onClick={() => void handleSaveGroup()}
              disabled={!groupCode.trim() || !groupName.trim()}
            >
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>

      {selectedProgramId && selectedProgram && (
        <AssignFromWarehouseModal
          opened={assignOpen}
          onClose={() => setAssignOpen(false)}
          programId={selectedProgramId}
          programName={selectedProgram.name}
          assignedGroupIds={assignedGroupIds}
          onAssigned={() => {
            refreshCatalog();
            void loadGroups();
            void loadPrograms();
            void fetchSubjects();
          }}
        />
      )}
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
  const [subjectGroupId, setSubjectGroupId] = useState<string | null>(
    initial?.subject_group_id ?? defaultGroupId ?? null
  );
  const [programId, setProgramId] = useState(initial?.program_id ?? defaultProgramId ?? '');
  const [formGroups, setFormGroups] = useState<SubjectGroupDto[]>([]);
  const [prerequisiteIds, setPrerequisiteIds] = useState<string[]>(
    initial?.prerequisites?.map((p) => p.id) ?? []
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);

  useEffect(() => {
    if (!programId) {
      setFormGroups([]);
      return;
    }
    void subjectApi
      .getCatalog(programId)
      .then((catalog) =>
        setFormGroups(
          catalog.groups
            .filter((g) => g.id !== 'other')
            .map(
              (g): SubjectGroupDto => ({
                id: g.id,
                program_id: catalog.program_id,
                code: g.code,
                name: g.name,
                description: g.description,
                sort_order: g.sort_order,
                is_active: true,
                created_at: '',
                subject_count: g.subject_count,
              })
            )
        )
      )
      .catch(() => setFormGroups([]));
  }, [programId]);

  const selectedFormGroup = formGroups.find((g) => g.id === subjectGroupId);

  const prereqOptions = allSubjects
    .filter((s) => s.id !== initial?.id)
    .filter((s) => !subjectGroupId || s.subject_group_id === subjectGroupId)
    .map((s) => ({
      value: s.id,
      label: s.code ? `${s.code} — ${s.name}` : s.name,
    }));

  const handleSubmit = () => {
    if (!name.trim() || !programId || !subjectGroupId) return;
    onSubmit({
      name: name.trim(),
      code: code.trim(),
      credits,
      semester,
      category,
      sub_category: selectedFormGroup?.code ?? initial?.sub_category ?? null,
      subject_group_id: subjectGroupId,
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
          if (!initial) setSubjectGroupId(null);
        }}
        searchable
      />
      <Select
        label="2. Nhóm môn"
        description="Cùng nguồn GET /subjects/catalog"
        required
        data={formGroups.map((g) => ({ value: g.id, label: `${g.code} — ${g.name}` }))}
        value={subjectGroupId}
        onChange={setSubjectGroupId}
        searchable
        placeholder={programId ? 'Chọn nhóm môn' : 'Chọn chuyên ngành trước'}
        disabled={!programId || formGroups.length === 0}
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
      {(!programId || !subjectGroupId || !name.trim()) && (
        <Alert color="yellow" variant="light">
          {!programId || !subjectGroupId
            ? 'Chọn chuyên ngành và nhóm môn để lưu.'
            : 'Nhập tên môn học (bắt buộc) để bật nút Lưu.'}
        </Alert>
      )}
      <Group justify="flex-end" mt="xl">
        <Button variant="default" size="md" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          color="teal"
          size="md"
          onClick={handleSubmit}
          disabled={!programId || !subjectGroupId || !name.trim()}
        >
          Lưu
        </Button>
      </Group>
    </Stack>
  );
}

export default SubjectCatalogManagementPage;
