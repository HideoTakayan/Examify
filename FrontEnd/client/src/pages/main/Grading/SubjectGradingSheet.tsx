import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  NumberInput,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconAlertCircle, IconArrowLeft, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import PageHeader from '@/components/PageHeader/PageHeader';
import gradingApi, { type GradingStudent } from '@/services/gradingApi';

export default function SubjectGradingSheet() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const navigate = useNavigate();

  const [students, setStudents] = useState<GradingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const form = useForm({
    initialValues: {
      grades: {} as Record<string, number | ''>,
    },
  });

  const loadData = async () => {
    if (!offeringId) return;
    try {
      setLoading(true);
      const data = await gradingApi.getOfferingStudents(offeringId);
      setStudents(data);
      
      const initialGrades: Record<string, number | ''> = {};
      data.forEach(s => {
        initialGrades[s.student_id] = s.final_score !== null ? s.final_score : '';
      });
      form.setValues({ grades: initialGrades });
    } catch {
      setError('Không thể tải danh sách sinh viên');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offeringId]);

  const handleSave = async (values: typeof form.values) => {
    if (!offeringId) return;
    try {
      setSaving(true);
      const payload = Object.entries(values.grades).map(([student_id, score]) => ({
        student_id,
        final_score: score === '' ? null : Number(score),
      }));
      await gradingApi.saveGrades(offeringId, { grades: payload });
      window.alert('Thành công: Đã lưu điểm môn học thành công');
      loadData();
    } catch {
      window.alert('Lỗi: Có lỗi xảy ra khi lưu điểm');
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    if (!offeringId) return;
    try {
      setSyncing(true);
      const res = await gradingApi.syncExamGrades(offeringId);
      window.alert(`Đồng bộ hoàn tất: Đã đồng bộ điểm cho ${res.syncedCount} sinh viên từ bài thi trực tuyến`);
      loadData();
    } catch {
      window.alert('Lỗi: Đồng bộ điểm thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const hasOnlineExam = students.some(s => s.online_max_score !== null);

  return (
    <Box className="max-w-[1200px] mx-auto p-4">
      <Stack gap="lg">
        <Group justify="space-between">
          <PageHeader
            title="Bảng điểm môn học"
          />
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate('/grading')}
          >
            Quay lại
          </Button>
        </Group>

        <Paper withBorder radius="md" p="md" pos="relative">
          <LoadingOverlay visible={loading} zIndex={1000} />
          
          {error ? (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          ) : (
            <form onSubmit={form.onSubmit(handleSave)}>
              <Group justify="space-between" mb="md">
                <Text fw={500}>Danh sách sinh viên lớp học phần</Text>
                <Group>
                  {hasOnlineExam && (
                    <Button
                      variant="outline"
                      color="blue"
                      leftSection={<IconRefresh size={16} />}
                      onClick={handleSync}
                      loading={syncing}
                    >
                      Đồng bộ từ bài thi TT
                    </Button>
                  )}
                  <Button
                    type="submit"
                    leftSection={<IconDeviceFloppy size={16} />}
                    loading={saving}
                  >
                    Lưu bảng điểm
                  </Button>
                </Group>
              </Group>

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={100}>Mã SV</Table.Th>
                    <Table.Th>Họ và tên</Table.Th>
                    <Table.Th w={200}>Điểm thi trực tuyến</Table.Th>
                    <Table.Th w={150}>Điểm tổng kết</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {students.map((student) => (
                    <Table.Tr key={student.student_id}>
                      <Table.Td>{student.student_code}</Table.Td>
                      <Table.Td>{student.full_name}</Table.Td>
                      <Table.Td>
                        {student.online_max_score !== null ? (
                          <Text fw={500} c="blue">{student.online_max_score}</Text>
                        ) : (
                          <Text c="dimmed" size="sm">—</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          min={0}
                          max={10}
                          step={0.1}
                          hideControls
                          size="sm"
                          placeholder="Nhập điểm"
                          {...form.getInputProps(`grades.${student.student_id}`)}
                        />
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {students.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={4} ta="center" py="md">
                        <Text c="dimmed">Chưa có sinh viên nào trong lớp</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </form>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
