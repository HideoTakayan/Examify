import { useEffect, useState } from 'react';
import { Modal, Table, Loader, Alert, Badge, Group, Text, Stack } from '@mantine/core';
import scoreAnalyticsApi, { type ItemAnalysisResult } from '@/services/scoreAnalyticsApi';

export function ItemAnalysisModal({
  examId,
  examTitle,
  opened,
  onClose,
}: {
  examId: string;
  examTitle: string;
  opened: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<ItemAnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!opened) return;
    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await scoreAnalyticsApi.getItemAnalysis(examId);
        if (mounted) {
          setData(res);
          setError('');
        }
      } catch (err: unknown) {
        if (mounted) setError((err as Error).message || 'Lỗi lấy dữ liệu phân tích');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => { mounted = false; };
  }, [opened, examId]);

  return (
    <Modal opened={opened} onClose={onClose} title={<Text fw={600}>Phân tích câu hỏi - {examTitle}</Text>} size="xl">
      {loading ? (
        <Loader />
      ) : error ? (
        <Alert color="red">{error}</Alert>
      ) : (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Câu</Table.Th>
              <Table.Th>Loại</Table.Th>
              <Table.Th>Đáp án đúng</Table.Th>
              <Table.Th>Tỉ lệ đúng</Table.Th>
              <Table.Th>Phân bố lựa chọn / Câu trả lời FIB</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((item) => (
              <Table.Tr key={item.question_id}>
                <Table.Td>{item.question_number}</Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={item.question_type === 'msq' ? 'violet' : item.question_type === 'fib' ? 'orange' : 'teal'}>
                    {item.question_type.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {Array.isArray(item.correct_answer) ? item.correct_answer.join(', ') : item.correct_answer || '—'}
                </Table.Td>
                <Table.Td>
                  <Text fw={600} color={item.correct_rate < 50 ? 'red' : item.correct_rate < 80 ? 'orange' : 'teal'}>
                    {item.correct_rate.toFixed(1)}%
                  </Text>
                  <Text size="xs" c="dimmed">{item.correct_count} / {item.total_attempts}</Text>
                </Table.Td>
                <Table.Td>
                  {item.question_type === 'fib' ? (
                    <Stack gap={2}>
                      {item.fib_answers_count.slice(0, 5).map(fib => (
                        <Group key={fib.answer} justify="space-between" style={{ maxWidth: 200 }}>
                          <Text size="xs" truncate>{fib.answer || '(Trống)'}</Text>
                          <Badge size="xs" variant="outline">{fib.count}</Badge>
                        </Group>
                      ))}
                      {item.fib_answers_count.length > 5 && (
                        <Text size="xs" c="dimmed">...và {item.fib_answers_count.length - 5} câu trả lời khác</Text>
                      )}
                    </Stack>
                  ) : (
                    <Group gap="xs">
                      {Object.entries(item.options_count).map(([opt, count]) => {
                        const isCorrect = Array.isArray(item.correct_answer) 
                          ? item.correct_answer.includes(opt)
                          : item.correct_answer === opt;
                        
                        return (
                          <Badge key={opt} variant={isCorrect ? 'filled' : 'light'} color={isCorrect ? 'teal' : 'gray'}>
                            {opt}: {count}
                          </Badge>
                        );
                      })}
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {data.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5} align="center">Chưa có dữ liệu</Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      )}
    </Modal>
  );
}
