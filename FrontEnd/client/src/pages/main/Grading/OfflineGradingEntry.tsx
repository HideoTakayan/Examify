import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Table, Text, Loader, Alert, Stack, Paper, NumberInput, Group, Title, Button } from '@mantine/core';
import examApi from '@/services/examApi';
import { IconCheck, IconAlertCircle } from '@tabler/icons-react';
import PageHeader from '@/components/PageHeader/PageHeader';

const OfflineGradingEntry = () => {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [exam, setExam] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        if (!examId) return;

        // Fetch exam detail
        const fetchedExam = await examApi.getExam(examId);
        setExam(fetchedExam);

        // Fetch students for the subject/class
        // For this we can use the term student enrollments or just use getTeacherStudents with subjectId
        // Wait, examApi doesn't have getExamStudents. Let's see if we have getExamSessions
        const sessions = await examApi.getExamSessions(examId);
        
        // We need all students in the subject, or just map existing sessions?
        // Wait, offline grades are upserted. If we don't have sessions, how do we get the student list?
        // The previous plan: "Hiển thị danh sách toàn bộ Sinh viên của môn học đó (lấy từ term_student_enrollments)."
        // Let's call teacherStudentsApi.getTeacherStudents({ subject_id: fetchedExam.subject_id })
        
        const teacherStudentsApi = (await import('@/services/teacherStudentsApi')).default;
        const res = await teacherStudentsApi.list({ subject_id: fetchedExam.subject_id || undefined, limit: 1000 });
        const classStudents = res.items || [];
        setStudents(classStudents);

        const initGrades: Record<string, number> = {};
        for (const sess of sessions) {
          if (sess.score != null) {
            initGrades[sess.student_id] = Number(sess.score);
          }
        }
        setGrades(initGrades);
      } catch {
        setError("Không thể tải danh sách sinh viên.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccessMsg('');
      const payload = Object.entries(grades).map(([student_id, score]) => ({ student_id, score }));
      await examApi.saveOfflineGrades(examId!, payload);
      setSuccessMsg("Lưu điểm thành công!");
    } catch {
      setError("Lưu điểm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Box p="xl"><Loader /></Box>;
  if (!exam) return <Alert color="red">Không tìm thấy bài thi</Alert>;

  return (
    <Box className="max-w-[1100px] mx-auto p-4">
      <PageHeader title="Nhập điểm thi giấy" />
      <Stack gap="md" mt="md">
        <Group justify="space-between">
          <Box>
            <Title order={3}>{exam.title}</Title>
            <Text c="dimmed">{exam.subject_name}</Text>
          </Box>
          <Group>
            <Button variant="default" onClick={() => navigate('/grading')}>Quay lại</Button>
            <Button color="green" loading={saving} onClick={handleSave}>Lưu bảng điểm</Button>
          </Group>
        </Group>

        {error && <Alert color="red" icon={<IconAlertCircle size={16}/>}>{error}</Alert>}
        {successMsg && <Alert color="green" icon={<IconCheck size={16}/>}>{successMsg}</Alert>}

        <Paper withBorder radius="md" p="sm">
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>STT</Table.Th>
                <Table.Th>Mã SV</Table.Th>
                <Table.Th>Họ và tên</Table.Th>
                <Table.Th>Điểm (0-10)</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {students.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center">Không có sinh viên nào trong môn học này.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                students.map((stu, idx) => (
                  <Table.Tr key={stu.student_id}>
                    <Table.Td>{idx + 1}</Table.Td>
                    <Table.Td>{stu.student_id}</Table.Td>
                    <Table.Td>{stu.student_name}</Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        max={10}
                        decimalScale={2}
                        placeholder="Nhập điểm"
                        value={grades[stu.student_id] ?? ''}
                        onChange={(val) => {
                          setGrades(prev => ({
                            ...prev,
                            [stu.student_id]: typeof val === 'number' ? val : 0
                          }));
                        }}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    </Box>
  );
};

export default OfflineGradingEntry;
