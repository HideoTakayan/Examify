import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Stack,
  Group,
  Text,
  Table,
  Paper,
  Badge,
  Modal,
  TextInput,
  Textarea,
  Button,
  Loader,
  MultiSelect,
  ActionIcon,
  Switch,
} from '@mantine/core';
import { IconPlus, IconTrash, IconEdit, IconUsers } from '@tabler/icons-react';
import PageHeader from '@/components/PageHeader/PageHeader';
import programApi, { type ProgramDto } from '@/services/programApi';
import userApi from '@/services/userApi';

const ProgramManagement = () => {
  const [programs, setPrograms] = useState<ProgramDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [editing, setEditing] = useState<ProgramDto | null>(null);
  const [teacherProgram, setTeacherProgram] = useState<ProgramDto | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [allTeachers, setAllTeachers] = useState<{ value: string; label: string }[]>([]);
  const [assignedTeacherIds, setAssignedTeacherIds] = useState<string[]>([]);
  const [savingTeachers, setSavingTeachers] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setPrograms(await programApi.getPrograms());
      setError('');
    } catch {
      setError('Không tải được danh sách chuyên ngành.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void userApi.getUsers({ role: 'teacher', limit: 500 }).then((list) => {
      setAllTeachers(
        list.map((t) => ({
          value: t.id,
          label: `${t.full_name || t.username} (${t.email})`,
        }))
      );
    });
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
    setFormOpen(true);
  };

  const openEdit = (p: ProgramDto) => {
    setEditing(p);
    setCode(p.code);
    setName(p.name);
    setDescription(p.description ?? '');
    setIsActive(p.is_active);
    setFormOpen(true);
  };

  const openTeachers = async (p: ProgramDto) => {
    setTeacherProgram(p);
    setTeacherOpen(true);
    try {
      const assigned = await programApi.getTeachers(p.id);
      setAssignedTeacherIds(assigned.map((t) => t.id));
    } catch {
      setError('Không tải được danh sách giảng viên.');
    }
  };

  const handleSave = async () => {
    if (!code.trim() || !name.trim()) return;
    try {
      if (editing) {
        await programApi.updateProgram(editing.id, {
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
          is_active: isActive,
        });
        setNotice('Đã cập nhật chuyên ngành.');
      } else {
        await programApi.createProgram({
          code: code.trim(),
          name: name.trim(),
          description: description.trim() || null,
        });
        setNotice('Đã tạo chuyên ngành.');
      }
      setFormOpen(false);
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Lưu chuyên ngành thất bại.');
    }
  };

  const handleDelete = async (p: ProgramDto) => {
    if (!confirm(`Xóa chuyên ngành «${p.name}»?`)) return;
    try {
      await programApi.deleteProgram(p.id);
      setNotice('Đã xóa chuyên ngành.');
      void load();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Không xóa được chuyên ngành.');
    }
  };

  const handleSaveTeachers = async () => {
    if (!teacherProgram) return;
    try {
      setSavingTeachers(true);
      await programApi.setTeachers(teacherProgram.id, assignedTeacherIds);
      setNotice(`Đã phân quyền ${assignedTeacherIds.length} giảng viên cho ngành ${teacherProgram.name}.`);
      setTeacherOpen(false);
      void load();
    } catch {
      setError('Lưu phân quyền giảng viên thất bại.');
    } finally {
      setSavingTeachers(false);
    }
  };

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <PageHeader
        title="Quản lý chuyên ngành"
        subtitle="CRUD chuyên ngành đào tạo và gán giảng viên được phép quản lý ngành đó"
        accent="teal"
      />

      {notice && (
        <Badge color="green" mb="md" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
          {notice}
        </Badge>
      )}
      {error && (
        <Badge color="red" mb="md" style={{ whiteSpace: 'normal', height: 'auto', padding: 8 }}>
          {error}
        </Badge>
      )}

      <Group justify="flex-end" mb="md">
        <Button leftSection={<IconPlus size={16} />} color="teal" onClick={openCreate}>
          Thêm chuyên ngành
        </Button>
      </Group>

      {loading ? (
        <Loader />
      ) : (
        <Paper withBorder radius="md">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã</Table.Th>
                <Table.Th>Tên chuyên ngành</Table.Th>
                <Table.Th>Môn</Table.Th>
                <Table.Th>Giảng viên</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th>Thao tác</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {programs.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Text ff="monospace" fw={600}>
                      {p.code}
                    </Text>
                  </Table.Td>
                  <Table.Td>{p.name}</Table.Td>
                  <Table.Td>{p.subject_count ?? 0}</Table.Td>
                  <Table.Td>{p.teacher_count ?? 0}</Table.Td>
                  <Table.Td>
                    <Badge color={p.is_active ? 'green' : 'gray'} size="sm">
                      {p.is_active ? 'Hoạt động' : 'Tạm dừng'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <ActionIcon variant="light" color="blue" onClick={() => openEdit(p)}>
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="teal" onClick={() => void openTeachers(p)}>
                        <IconUsers size={16} />
                      </ActionIcon>
                      <ActionIcon variant="light" color="red" onClick={() => void handleDelete(p)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {programs.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" ta="center" py="lg">
                      Chưa có chuyên ngành. Bấm «Thêm chuyên ngành».
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      )}

      <Modal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Sửa chuyên ngành' : 'Thêm chuyên ngành'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Mã ngành"
            required
            value={code}
            onChange={(e) => setCode(e.currentTarget.value.toUpperCase())}
          />
          <TextInput label="Tên chuyên ngành" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
          <Textarea label="Mô tả" value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
          {editing && (
            <Switch label="Đang hoạt động" checked={isActive} onChange={(e) => setIsActive(e.currentTarget.checked)} />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setFormOpen(false)}>
              Hủy
            </Button>
            <Button color="teal" onClick={() => void handleSave()} disabled={!code.trim() || !name.trim()}>
              Lưu
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={teacherOpen}
        onClose={() => setTeacherOpen(false)}
        title={teacherProgram ? `Phân quyền giảng viên — ${teacherProgram.name}` : 'Phân quyền giảng viên'}
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Giảng viên được chọn có thể quản lý môn, đề thi và sinh viên thuộc chuyên ngành này (theo quyền hệ thống).
          </Text>
          <MultiSelect
            label="Giảng viên"
            data={allTeachers}
            value={assignedTeacherIds}
            onChange={setAssignedTeacherIds}
            searchable
            clearable
            placeholder="Chọn giảng viên"
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTeacherOpen(false)}>
              Hủy
            </Button>
            <Button color="teal" loading={savingTeachers} onClick={() => void handleSaveTeachers()}>
              Lưu phân quyền
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
};

export default ProgramManagement;
