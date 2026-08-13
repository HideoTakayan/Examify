import { useState, useEffect } from 'react';
import { Card, Tabs, Table, Text, Title, Group, Loader, Center, Box, ScrollArea, Grid, Stack, Divider, Select } from '@mantine/core';
import { IconBooks, IconChartBar, IconUser, IconId, IconCalendar, IconGenderMale, IconActivity, IconUsers, IconStar } from '@tabler/icons-react';
import apiClient from '@/services/apiClient';

interface SubjectInfo {
  subject_id: string;
  subject_code: string;
  subject_name: string;
  credits: number;
  score10: number | null;
  score4: number | null;
  letter: string;
  status: string;
  group_code: string;
  isConditional?: boolean;
}

interface SemesterSummary {
  totalCredits: number;
  accumulatedCredits: number;
  gpa10: string;
  gpa4: string;
  cumulativeGpa10: string;
  cumulativeGpa4: string;
}

interface Semester {
  title: string;
  semester: string;
  year: number;
  subjects: SubjectInfo[];
  summary: SemesterSummary;
}

interface Block {
  code: string;
  name: string;
  totalCredits: number;
  compulsoryCredits: number;
  accumulatedCredits: number;
  subjects: SubjectInfo[];
}

interface TranscriptData {
  semesters: Semester[];
  blocks: Block[];
}

export default function GradeLookup() {
  const [data, setData] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTranscript = async () => {
      try {
        const response = await apiClient.get('/student/transcript');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching transcript', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTranscript();
  }, []);

  if (loading) {
    return (
      <Center h="100%">
        <Loader size="xl" variant="dots" />
      </Center>
    );
  }

  if (!data) return null;

  const totalCreditsRequired = data.blocks.reduce((acc, b) => acc + b.totalCredits, 0);
  const totalCompulsoryRequired = data.blocks.reduce((acc, b) => acc + b.compulsoryCredits, 0);
  const totalAccumulated = data.blocks.reduce((acc, b) => acc + b.accumulatedCredits, 0);
  const totalTaken = data.semesters.reduce((acc, sem) => acc + sem.summary.totalCredits, 0);

  return (
    <Box p="md" bg="var(--mantine-color-gray-0)" style={{ minHeight: '100vh' }}>
      <Grid>
        {/* SIDEBAR */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Stack gap="md">
            {/* THÔNG TIN SINH VIÊN */}
            <Card withBorder radius="md" p="md" shadow="sm">
              <Select
                data={['Công nghệ thông tin Việt Nhật']}
                defaultValue="Công nghệ thông tin Việt Nhật"
                mb="md"
              />
              <Stack gap="xs">
                <Group wrap="nowrap">
                  <IconUser size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Họ tên:</Text>
                  <Text size="sm" fw={600}>Sinh viên 01</Text>
                </Group>
                <Group wrap="nowrap">
                  <IconId size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Mã số:</Text>
                  <Text size="sm" fw={600}>1671020001</Text>
                </Group>
                <Group wrap="nowrap">
                  <IconCalendar size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Ngày sinh:</Text>
                  <Text size="sm" fw={600}>01/01/2005</Text>
                </Group>
                <Group wrap="nowrap">
                  <IconGenderMale size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Giới tính:</Text>
                  <Text size="sm" fw={600}>Nam</Text>
                </Group>
                <Group wrap="nowrap">
                  <IconActivity size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Trạng thái:</Text>
                  <Text size="sm" fw={600}>Đang học</Text>
                </Group>
                <Group wrap="nowrap">
                  <IconUsers size={16} color="gray" />
                  <Text size="sm" c="dimmed" w={80}>Lớp:</Text>
                  <Text size="sm" fw={600}>K17-CNTTVJ_1</Text>
                </Group>
              </Stack>
            </Card>

            {/* ĐIỂM MỚI */}
            <Card withBorder radius="md" p="0" shadow="sm">
              <Box bg="orange" p="sm">
                <Group gap="xs">
                  <IconStar size={20} color="white" />
                  <Text fw={700} c="white">ĐIỂM MỚI</Text>
                </Group>
              </Box>
              <Box p="sm">
                {data.semesters.length > 0 && data.semesters[0].subjects.length > 0 ? (
                  <Group justify="space-between" align="center">
                    <Text size="sm">{data.semesters[0].subjects[0].subject_name} - {data.semesters[0].subjects[0].subject_code}</Text>
                    <Text fw={700} c="green">{data.semesters[0].subjects[0].score10?.toFixed(1) || '-'}</Text>
                  </Group>
                ) : (
                  <Text size="sm" c="dimmed">Chưa có điểm mới</Text>
                )}
              </Box>
            </Card>

            {/* TỔNG ĐIỂM */}
            <Card withBorder radius="md" p="0" shadow="sm">
              <Box bg="var(--mantine-color-gray-2)" p="sm">
                <Group gap="xs">
                  <IconChartBar size={20} color="black" />
                  <Text fw={700}>TỔNG ĐIỂM</Text>
                </Group>
              </Box>
              {data.semesters.length > 0 ? (
                <Box p="sm">
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Tổng số tín chỉ</Text>
                    <Text size="sm" fw={600}>{totalTaken}</Text>
                  </Group>
                  <Divider mb="xs" />
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Tổng số tín chỉ tích lũy</Text>
                    <Text size="sm" fw={600}>{totalAccumulated}</Text>
                  </Group>
                  <Divider mb="xs" />
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Điểm trung bình hệ 10</Text>
                    <Text size="sm" fw={600}>{data.semesters[0].summary.cumulativeGpa10}</Text>
                  </Group>
                  <Divider mb="xs" />
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Điểm trung bình hệ 4</Text>
                    <Text size="sm" fw={600} c="blue">{data.semesters[0].summary.cumulativeGpa4}</Text>
                  </Group>
                  <Divider mb="xs" />
                  <Group justify="space-between" mb="xs">
                    <Text size="sm">Điểm trung bình tích lũy hệ 10</Text>
                    <Text size="sm" fw={600}>{data.semesters[0].summary.cumulativeGpa10}</Text>
                  </Group>
                  <Divider mb="xs" />
                  <Group justify="space-between">
                    <Text size="sm">Điểm trung bình tích lũy hệ 4</Text>
                    <Text size="sm" fw={600} c="blue">{data.semesters[0].summary.cumulativeGpa4}</Text>
                  </Group>
                </Box>
              ) : (
                <Box p="sm">
                  <Text size="sm" c="dimmed">Chưa có dữ liệu</Text>
                </Box>
              )}
            </Card>
          </Stack>
        </Grid.Col>

        {/* MAIN CONTENT */}
        <Grid.Col span={{ base: 12, md: 9 }}>
      
      <Tabs defaultValue="transcript" variant="outline" radius="md">
        <Tabs.List mb="md">
          <Tabs.Tab value="transcript" leftSection={<IconChartBar size={16} />}>
            Bảng điểm theo kỳ
          </Tabs.Tab>
          <Tabs.Tab value="knowledge-blocks" leftSection={<IconBooks size={16} />}>
            Khối kiến thức
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="transcript">
          {data.semesters.map((sem, idx) => (
            <Card key={idx} withBorder radius="md" p="0" mb="xl" shadow="sm">
              <Box p="md" bg="var(--mantine-color-blue-9)" c="white">
                <Title order={5}>{sem.title}</Title>
              </Box>
              <ScrollArea>
                <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>STT</Table.Th>
                      <Table.Th>Mã học phần</Table.Th>
                      <Table.Th>Tên học phần</Table.Th>
                      <Table.Th>Số tín chỉ</Table.Th>
                      <Table.Th>Lần học</Table.Th>
                      <Table.Th>Lần thi</Table.Th>
                      <Table.Th>Điểm hệ 10</Table.Th>
                      <Table.Th>Điểm hệ 4</Table.Th>
                      <Table.Th>Điểm chữ</Table.Th>
                      <Table.Th>Đánh giá</Table.Th>
                      <Table.Th>Ghi chú</Table.Th>
                      <Table.Th>Chi tiết</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sem.subjects.map((sub, sIdx) => (
                      <Table.Tr key={sub.subject_code}>
                        <Table.Td>{sIdx + 1}</Table.Td>
                        <Table.Td><Text fw={500}>{sub.subject_code}</Text></Table.Td>
                        <Table.Td>{sub.subject_name}</Table.Td>
                        <Table.Td>{sub.credits}</Table.Td>
                        <Table.Td>1</Table.Td>
                        <Table.Td>1</Table.Td>
                        <Table.Td>{sub.score10 !== null ? sub.score10.toFixed(1) : ''}</Table.Td>
                        <Table.Td>{sub.score4 !== null ? sub.score4.toFixed(1) : ''}</Table.Td>
                        <Table.Td>
                          {sub.isConditional ? (
                            <Text fw={600}>{sub.letter}</Text>
                          ) : (
                            <Text fw={600}>{sub.letter}</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text c={sub.status === 'Đạt' ? "green" : "red"} fw={500}>
                            {sub.status}
                          </Text>
                        </Table.Td>
                        <Table.Td></Table.Td>
                        <Table.Td>
                          <Text c="blue" style={{ cursor: 'pointer' }}>Chi tiết</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
              
              <Box p="md" bg="var(--mantine-color-gray-0)" mt="sm" style={{ borderTop: '1px solid var(--mantine-color-gray-3)' }}>
                <Grid>
                  <Grid.Col span={6}>
                    <Group justify="space-between" mb={4} pr="xl">
                      <Text c="dimmed" size="sm">Tổng tín chỉ</Text>
                      <Text fw={500}>{sem.summary.totalCredits}</Text>
                    </Group>
                    <Group justify="space-between" mb={4} pr="xl">
                      <Text c="dimmed" size="sm">Điểm trung bình hệ 10</Text>
                      <Text fw={500}>{sem.summary.gpa10}</Text>
                    </Group>
                    <Group justify="space-between" pr="xl">
                      <Text c="dimmed" size="sm">Điểm trung bình tích lũy hệ 10</Text>
                      <Text fw={500}>{sem.summary.cumulativeGpa10}</Text>
                    </Group>
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <Group justify="space-between" mb={4} pl="xl">
                      <Text c="dimmed" size="sm">Tổng số tín chỉ tích lũy</Text>
                      <Text fw={500}>{sem.summary.accumulatedCredits}</Text>
                    </Group>
                    <Group justify="space-between" mb={4} pl="xl">
                      <Text c="dimmed" size="sm">Điểm trung bình hệ 4</Text>
                      <Text fw={500}>{sem.summary.gpa4}</Text>
                    </Group>
                    <Group justify="space-between" pl="xl">
                      <Text c="dimmed" size="sm">Điểm trung bình tích lũy hệ 4</Text>
                      <Text fw={500}>{sem.summary.cumulativeGpa4}</Text>
                    </Group>
                  </Grid.Col>
                </Grid>
              </Box>
            </Card>
          ))}
        </Tabs.Panel>

        <Tabs.Panel value="knowledge-blocks">
          <Card withBorder radius="md" p="0" shadow="sm" mb="xl">
            <Box p="md" bg="var(--mantine-color-gray-0)">
              <Title order={4}>Tổng điểm theo khối</Title>
            </Box>
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="md" horizontalSpacing="md">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>STT</Table.Th>
                    <Table.Th>Mã khối</Table.Th>
                    <Table.Th>Tên khối</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Tổng số tín chỉ</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Tổng số tín bắt buộc</Table.Th>
                    <Table.Th style={{ textAlign: 'center' }}>Tổng số tín đã tích lũy</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.blocks.map((block, idx) => (
                    <Table.Tr key={block.code}>
                      <Table.Td>{idx + 1}</Table.Td>
                      <Table.Td><Text fw={700}>{block.code}</Text></Table.Td>
                      <Table.Td>{block.name}</Table.Td>
                      <Table.Td align="center"><Text fw={600}>{block.totalCredits}</Text></Table.Td>
                      <Table.Td align="center"><Text fw={600}>{block.compulsoryCredits}</Text></Table.Td>
                      <Table.Td align="center">
                        <Text fw={600} c={block.accumulatedCredits >= block.compulsoryCredits ? 'green' : 'orange'}>
                          {block.accumulatedCredits}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr bg="var(--mantine-color-gray-1)">
                    <Table.Td colSpan={3}><Text fw={700}>Tổng</Text></Table.Td>
                    <Table.Td align="center"><Text fw={700}>{totalCreditsRequired}</Text></Table.Td>
                    <Table.Td align="center"><Text fw={700}>{totalCompulsoryRequired}</Text></Table.Td>
                    <Table.Td align="center"><Text fw={700} c="blue">{totalAccumulated}</Text></Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>

          <Card withBorder radius="md" p="0" shadow="sm">
             <Box p="md" bg="var(--mantine-color-gray-0)">
              <Title order={4}>Tổng hợp chi tiết theo khối và học phần</Title>
            </Box>
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mã khối</Table.Th>
                    <Table.Th>Tên khối</Table.Th>
                    <Table.Th>STT</Table.Th>
                    <Table.Th>Mã học phần</Table.Th>
                    <Table.Th>Tên học phần</Table.Th>
                    <Table.Th>Số tín chỉ</Table.Th>
                    <Table.Th>Điểm</Table.Th>
                    <Table.Th>Đánh giá</Table.Th>
                    <Table.Th>Điểm quy đổi</Table.Th>
                    <Table.Th>Điểm chữ</Table.Th>
                    <Table.Th>Kết quả</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.blocks.map((block) => {
                    return block.subjects.map((sub, sIdx) => (
                      <Table.Tr key={sub.subject_code}>
                        {sIdx === 0 && (
                          <>
                            <Table.Td rowSpan={block.subjects.length} style={{ verticalAlign: 'top', paddingTop: '12px' }}>
                              <Text fw={700}>{block.code}</Text>
                            </Table.Td>
                            <Table.Td rowSpan={block.subjects.length} style={{ verticalAlign: 'top', paddingTop: '12px' }}>
                              <Text fw={500}>{block.name}</Text>
                            </Table.Td>
                          </>
                        )}
                        <Table.Td>{sIdx + 1}</Table.Td>
                        <Table.Td>{sub.subject_code}</Table.Td>
                        <Table.Td>{sub.subject_name}</Table.Td>
                        <Table.Td>{sub.credits}</Table.Td>
                        <Table.Td>{sub.score10 !== null ? sub.score10.toFixed(1) : ''}</Table.Td>
                        <Table.Td>{sub.status === 'Chưa học' ? '' : 'Đạt'}</Table.Td>
                        <Table.Td>{sub.score4 !== null ? sub.score4.toFixed(1) : ''}</Table.Td>
                        <Table.Td>
                           <Text fw={600} size="sm">{sub.letter}</Text>
                        </Table.Td>
                        <Table.Td>
                          {sub.status === 'Đạt' ? (
                            <Text c="green" size="sm" fw={600}>Hoàn thành</Text>
                          ) : sub.status === 'Không đạt' ? (
                            <Text c="red" size="sm" fw={600}>Không đạt</Text>
                          ) : (
                            <Text c="gray" size="sm"></Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ));
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Tabs.Panel>
      </Tabs>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
