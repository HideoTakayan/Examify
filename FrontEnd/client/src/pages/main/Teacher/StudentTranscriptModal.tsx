import { useRef } from 'react';
import {
  Modal, Stack, Group, Text, Table, Loader, Box, Divider,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { StudentTranscript } from '@/services/teacherStudentsApi';
import ButtonLight from '@/components/Button/ButtonLight/ButtonLight';
import ButtonFilled from '@/components/Button/ButtonFilled/ButtonFilled';
import { IconDownload, IconMail, IconPrinter } from '@tabler/icons-react';

interface Props {
  opened: boolean;
  onClose: () => void;
  loading: boolean;
  data: StudentTranscript | null;
  onExportHtml: () => void;
  onExportCsv: () => void;
  exportLoading: boolean;
  emailSending?: boolean;
  onSendEmail?: () => void;
}

function CourseTable({
  courses,
  startIndex,
  labels,
}: {
  courses: StudentTranscript['courses'];
  startIndex: number;
  labels: { tt: string; subject: string; credits: string; g10: string; g4: string; letter: string };
}) {
  return (
    <Table withTableBorder withColumnBorders fz="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th w={36} ta="center">{labels.tt}</Table.Th>
          <Table.Th>{labels.subject}</Table.Th>
          <Table.Th w={40} ta="center">{labels.credits}</Table.Th>
          <Table.Th w={48} ta="center">{labels.g10}</Table.Th>
          <Table.Th w={48} ta="center">{labels.g4}</Table.Th>
          <Table.Th w={52} ta="center">{labels.letter}</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {courses.map((c, i) => (
          <Table.Tr key={`${startIndex + i}-${c.subject_name}`}>
            <Table.Td ta="center">{startIndex + i + 1}</Table.Td>
            <Table.Td>{c.subject_name}</Table.Td>
            <Table.Td ta="center">{c.credits}</Table.Td>
            <Table.Td ta="center">{c.grade10.toFixed(1)}</Table.Td>
            <Table.Td ta="center">{c.grade4.toFixed(1)}</Table.Td>
            <Table.Td ta="center">{c.letter}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}

const StudentTranscriptModal = ({
  opened,
  onClose,
  loading,
  data,
  onExportHtml,
  onExportCsv,
  exportLoading,
  emailSending = false,
  onSendEmail,
}: Props) => {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);

  const labels = {
    tt: t('teacher_students.transcript_col_tt'),
    subject: t('teacher_students.transcript_col_subject'),
    credits: t('teacher_students.transcript_col_credits'),
    g10: t('teacher_students.transcript_col_g10'),
    g4: t('teacher_students.transcript_col_g4'),
    letter: t('teacher_students.transcript_col_letter'),
  };

  const handlePrint = () => {
    if (!printRef.current) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html><head><title>${data?.student.full_name ?? ''}</title>
      <style>
        body{font-family:"Times New Roman",serif;font-size:12px;margin:16px}
        h1,h2{text-align:center;margin:4px 0}
        .meta{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;margin:12px 0}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th,td{border:1px solid #333;padding:4px 6px}
        th{background:#eee;text-align:center}
        .cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .sum{margin-top:12px;line-height:1.5}
        .foot{text-align:right;font-style:italic;margin-top:16px}
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  const splitAt = data && data.courses.length > 15
    ? Math.ceil(data.courses.length / 2)
    : data?.courses.length ?? 0;
  const col1 = data?.courses.slice(0, splitAt) ?? [];
  const col2 = data && data.courses.length > 15 ? data.courses.slice(splitAt) : [];
  const twoCols = col2.length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={t('teacher_students.transcript_title')}
      size="xl"
      styles={{ body: { maxHeight: '85vh', overflow: 'auto' } }}
    >
      {loading ? (
        <Box py="xl" className="flex justify-center"><Loader /></Box>
      ) : !data ? null : (
        <Stack gap="md">
          <Group justify="flex-end" gap="xs">
            {onSendEmail && (
              <ButtonFilled
                label={t('teacher_students.send_grade_email')}
                onClick={onSendEmail}
                color="teal"
                size="xs"
                leftSection={<IconMail size={14} />}
                disabled={emailSending}
              />
            )}
            <ButtonLight
              label={t('teacher_students.transcript_export_csv')}
              onClick={onExportCsv}
              color="blue"
              size="xs"
              leftSection={<IconDownload size={14} />}
              disabled={exportLoading}
            />
            <ButtonLight
              label={t('teacher_students.transcript_export_html')}
              onClick={onExportHtml}
              color="gray"
              size="xs"
              leftSection={<IconDownload size={14} />}
              disabled={exportLoading}
            />
            <ButtonFilled
              label={t('teacher_students.transcript_print')}
              onClick={handlePrint}
              color="teal"
              size="xs"
              leftSection={<IconPrinter size={14} />}
              disabled={false}
            />
          </Group>

          <Box
            ref={printRef}
            style={{ fontFamily: '"Times New Roman", serif', fontSize: 13 }}
          >
            <Text ta="center" fw={700} size="sm">TRƯỜNG YOUR UNIVERSITY</Text>
            <Text ta="center" size="xs" mt={4}>Độc lập - Tự do - Hạnh phúc</Text>
            <Text ta="center" fw={700} mt="sm">
              {t('teacher_students.transcript_title').toUpperCase()}
            </Text>
            <Text ta="center" size="xs" c="dimmed" mb="md">
              {t('teacher_students.transcript_subtitle')}
            </Text>

            <Box
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Text size="sm"><b>{t('teacher_students.col_name')}:</b> {data.student.full_name}</Text>
              <Text size="sm"><b>{t('teacher_students.transcript_student_code')}:</b> {data.student.student_code}</Text>
              <Text size="sm"><b>{t('teacher_students.transcript_class')}:</b> {data.student.class_name}</Text>
              <Text size="sm"><b>{t('teacher_students.transcript_intake')}:</b> {data.student.intake_year}</Text>
              <Text size="sm"><b>{t('teacher_students.transcript_major')}:</b> {data.student.major}</Text>
              <Text size="sm"><b>{t('teacher_students.transcript_training')}:</b> {data.student.training_system}</Text>
            </Box>

            {data.courses.length === 0 ? (
              <Text c="dimmed" ta="center" py="md">{t('teacher_students.transcript_empty')}</Text>
            ) : twoCols ? (
              <Box style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <CourseTable courses={col1} startIndex={0} labels={labels} />
                <CourseTable courses={col2} startIndex={col1.length} labels={labels} />
              </Box>
            ) : (
              <CourseTable courses={col1} startIndex={0} labels={labels} />
            )}

            <Divider my="sm" />
            <Stack gap={4}>
              <Text size="sm">
                <b>{t('teacher_students.transcript_gpa4')}:</b> {data.summary.gpa4.toFixed(2)}
              </Text>
              <Text size="sm">
                <b>{t('teacher_students.transcript_gpa10')}:</b> {data.summary.gpa10.toFixed(2)}
              </Text>
              <Text size="sm">
                <b>{t('teacher_students.transcript_total_credits')}:</b> {data.summary.totalCredits}
              </Text>
              <Text size="sm">
                <b>{t('teacher_students.transcript_classification')}:</b> {data.summary.classification}
              </Text>
            </Stack>
            <Text size="xs" ta="right" fs="italic" mt="md">
              Hà Nội, {new Date(data.issued_at).toLocaleDateString('vi-VN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </Box>
        </Stack>
      )}
    </Modal>
  );
};

export default StudentTranscriptModal;
