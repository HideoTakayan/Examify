import { useState } from 'react';
import {
  Modal,
  Box,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  Button,
  Paper,
  Table,
  TextInput,
  NumberInput,
  Select,
  Textarea,
  Alert,
  Progress,
  Divider,
  ScrollArea,
  SimpleGrid,
  ActionIcon,
  Loader,
  AspectRatio,
} from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ExamImportPreview, ImportedQuestionDraft } from '@/services/examApi';
import examApi from '@/services/examApi';

interface ExamVerifyModalProps {
  preview: ExamImportPreview | null;
  onConfirm: (questions: ImportedQuestionDraft[]) => void;
  onClose: () => void;
  onRecompose?: (result: ExamImportPreview) => void;
}

const TYPE_COLORS: Record<string, string> = {
  mcq: 'blue',
  essay: 'green',
  'TN-ANH': 'orange',
  'TN-AUDIO': 'violet',
  'TN-VIDEO': 'red',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  DE: 'green',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

const TYPE_LABELS: Record<string, string> = {
  mcq: 'TN',
  essay: 'TL',
  'TN-ANH': 'TN-ANH',
  'TN-AUDIO': 'TN-AUDIO',
  'TN-VIDEO': 'TN-VIDEO',
};

function QuestionCard({
  q,
  selected,
  onSelect,
  onChange,
}: {
  q: ImportedQuestionDraft;
  selected: boolean;
  onSelect: () => void;
  onChange: (updated: ImportedQuestionDraft) => void;
}) {
  const { t } = useTranslation();

  return (
    <Paper
      withBorder
      p="sm"
      mb="xs"
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--mantine-color-blue-5))' : undefined,
        borderWidth: selected ? 2 : 1,
      }}
      onClick={onSelect}
    >
      <Group justify="space-between" mb={4}>
        <Group gap={4}>
          <Badge color={TYPE_COLORS[q.question_type] || 'gray'} size="sm">
            {TYPE_LABELS[q.question_type] || q.question_type}
          </Badge>
          <Badge color={DIFFICULTY_COLORS[q.difficulty || 'DE'] || 'gray'} size="sm" variant="outline">
            {q.difficulty || 'DE'}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">{q.points} điểm</Text>
      </Group>
      <Text size="sm" lineClamp={2}>{q.content || '(trống)'}</Text>
      {q.needs_review && (
        <Alert color="red" variant="light" mt={4} py={4}>
          <Text size="xs">{q.review_reason || 'Cần xem lại'}</Text>
        </Alert>
      )}
      {q.media && (
        <Text size="xs" c="orange" mt={2}>
          📎 {q.media.type}: {q.media.filename} ({q.media.status})
        </Text>
      )}
      {q.ai_confidence != null && (
        <Group gap={4} mt={4}>
          <Text size="xs" c="dimmed">AI confidence:</Text>
          <Progress
            value={q.ai_confidence}
            color={q.ai_confidence >= 80 ? 'green' : q.ai_confidence >= 60 ? 'yellow' : 'red'}
            size="xs"
            style={{ flex: 1 }}
          />
          <Text size="xs">{q.ai_confidence}%</Text>
        </Group>
      )}
    </Paper>
  );
}

function QuestionDetail({
  q,
  onChange,
}: {
  q: ImportedQuestionDraft;
  onChange: (updated: ImportedQuestionDraft) => void;
}) {
  const { t } = useTranslation();

  const update = (field: keyof ImportedQuestionDraft, value: any) => {
    onChange({ ...q, [field]: value });
  };

  return (
    <Stack gap="sm">
      <Group grow>
        <Select
          label="Loại câu"
          value={q.question_type}
          onChange={(v) => update('question_type', v)}
          data={[
            { value: 'mcq', label: 'Trắc nghiệm (TN)' },
            { value: 'essay', label: 'Tự luận (TL)' },
          ]}
        />
        <NumberInput
          label="Điểm"
          min={0.25}
          value={q.points}
          onChange={(v) => update('points', typeof v === 'number' ? v : q.points)}
        />
        <Select
          label="Độ khó"
          value={q.difficulty || 'DE'}
          onChange={(v) => update('difficulty', v)}
          data={[
            { value: 'DE', label: 'Dễ' },
            { value: 'TRUNGBINH', label: 'TB' },
            { value: 'KHO', label: 'Khó' },
          ]}
        />
        <NumberInput
          label="Chương"
          min={1}
          value={q.chapter || 1}
          onChange={(v) => update('chapter', typeof v === 'number' ? v : 1)}
        />
      </Group>

      <Textarea
        label="Nội dung câu hỏi"
        value={q.content}
        onChange={(e) => update('content', e.currentTarget.value)}
        minRows={3}
      />

      {q.question_type === 'mcq' && (
        <Stack gap="xs">
          <Text size="sm" fw={500}>Đáp án</Text>
          {['A', 'B', 'C', 'D'].map((key) => (
            <TextInput
              key={key}
              label={key}
              value={(q.options && q.options[key]) ? q.options[key] : ''}
              onChange={(e) => {
                const opts = q.options ? { ...q.options } : {};
                opts[key] = e.currentTarget.value;
                if (!e.currentTarget.value) delete opts[key];
                update('options', opts);
              }}
            />
          ))}
          <Select
            label="Đáp án đúng"
            value={Array.isArray(q.correct_answer) ? q.correct_answer.join(',') : (q.correct_answer || '')}
            onChange={(v) => update('correct_answer', v || null)}
            data={['A', 'B', 'C', 'D', 'A,B', 'A,C', 'B,D', 'A,B,C', 'A,B,D', 'B,C,D', 'A,C,D', 'A,B,C,D']}
            allowDeselect={false}
          />
        </Stack>
      )}

      {q.question_type === 'essay' && (
        <Textarea
          label="Gợi ý đáp án"
          value={q.answer_hint || ''}
          onChange={(e) => update('answer_hint', e.currentTarget.value)}
          minRows={2}
        />
      )}

      {q.media && (
        <Paper withBorder p="sm">
          <Text size="sm" fw={500} mb="xs">Media: {q.media.type}</Text>
          <Text size="sm" c="dimmed">File: {q.media.filename}</Text>
          <Badge color={q.media.status === 'found' ? 'green' : q.media.status === 'embedded' ? 'blue' : 'red'} size="sm">
            {q.media.status}
          </Badge>
        </Paper>
      )}
    </Stack>
  );
}

export default function ExamVerifyModal({
  preview,
  onConfirm,
  onClose,
  onRecompose,
}: ExamVerifyModalProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [questions, setQuestions] = useState<ImportedQuestionDraft[]>(preview?.questions || []);
  const [filter, setFilter] = useState<'all' | 'review' | 'ok'>('all');
  const [recomposing, setRecomposing] = useState(false);
  const [recomposeError, setRecomposeError] = useState('');

  if (!preview) return null;

  const selected = questions[selectedIndex];

  const filteredQuestions = questions.filter((q) => {
    if (filter === 'review') return q.needs_review;
    if (filter === 'ok') return !q.needs_review;
    return true;
  });

  const needsReviewCount = questions.filter((q) => q.needs_review).length;
  const canConfirm = needsReviewCount === 0;

  const handleRecompose = async () => {
    setRecomposing(true);
    setRecomposeError('');
    try {
      const result = await examApi.aiRecomposeExam({ questions, examInfo: preview.exam });
      setQuestions(result.questions);
      setSelectedIndex(0);
      if (onRecompose) onRecompose(result);
    } catch (err: any) {
      setRecomposeError(err?.message || 'AI xử lý thất bại. Thử lại.');
    } finally {
      setRecomposing(false);
    }
  };

  const handleConfirm = () => {
    onConfirm(questions);
  };

  const updateQuestion = (idx: number, updated: ImportedQuestionDraft) => {
    const newQuestions = [...questions];
    newQuestions[idx] = { ...updated, needs_review: false, review_reason: null };
    setQuestions(newQuestions);
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={null}
      size="95%"
      fullScreen
      styles={{ body: { padding: 0, height: '100vh' }, content: { height: '100vh' } }}
    >
      <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box style={{ background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)', padding: '16px 24px', color: '#fff' }}>
          <Group justify="space-between" align="center">
            <Box>
              <Title order={3} style={{ color: '#fff' }}>{preview.exam.title || 'Xem lại đề thi'}</Title>
              <Text size="sm" style={{ opacity: 0.85 }}>
                {questions.length} câu hỏi
                {needsReviewCount > 0 && ` · ${needsReviewCount} cần xem lại`}
              </Text>
            </Box>
            <Group gap="sm">
              <Button
                variant="white"
                color="blue"
                leftSection={recomposing ? <Loader size={14} /> : '🤖'}
                onClick={handleRecompose}
                disabled={recomposing}
              >
                AI Sửa Lại
              </Button>
              <Button
                color="green"
                disabled={!canConfirm}
                onClick={handleConfirm}
              >
                Xác nhận Import ({questions.length})
              </Button>
              <Button variant="white" color="gray" onClick={onClose}>Hủy</Button>
            </Group>
          </Group>
          {recomposeError && <Alert color="red" mt="sm">{recomposeError}</Alert>}
        </Box>

        {/* Body */}
        <Box style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar */}
          <Box style={{ width: 320, borderRight: '1px solid var(--mantine-color-gray-3)', display: 'flex', flexDirection: 'column' }}>
            <Box p="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <Select
                size="xs"
                value={filter}
                onChange={(v) => setFilter(v as 'all' | 'review' | 'ok')}
                data={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'review', label: `Cần xem lại (${needsReviewCount})` },
                  { value: 'ok', label: 'Đã OK' },
                ]}
              />
            </Box>
            <ScrollArea style={{ flex: 1 }} p="sm">
              {filteredQuestions.length === 0 ? (
                <Text c="dimmed" size="sm" ta="center" mt="md">Không có câu nào.</Text>
              ) : (
                filteredQuestions.map((q, i) => {
                  const globalIdx = questions.indexOf(q);
                  return (
                    <QuestionCard
                      key={`${globalIdx}-${q.display_order}`}
                      q={q}
                      selected={globalIdx === selectedIndex}
                      onSelect={() => setSelectedIndex(globalIdx)}
                      onChange={(updated) => updateQuestion(globalIdx, updated)}
                    />
                  );
                })
              )}
            </ScrollArea>
          </Box>

          {/* Main Content */}
          <Box style={{ flex: 1, overflow: 'auto', padding: 24 }}>
            {selected ? (
              <Paper withBorder radius="md" p="md">
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Badge color={TYPE_COLORS[selected.question_type] || 'gray'} size="lg">
                      {TYPE_LABELS[selected.question_type] || selected.question_type}
                    </Badge>
                    <Badge color={DIFFICULTY_COLORS[selected.difficulty || 'DE'] || 'gray'} size="lg" variant="outline">
                      {selected.difficulty || 'DE'}
                    </Badge>
                    <Text size="sm" c="dimmed">Chương {selected.chapter || 1}</Text>
                  </Group>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{selected.points} điểm</Text>
                    {selected.ai_confidence != null && (
                      <Badge
                        color={selected.ai_confidence >= 80 ? 'green' : selected.ai_confidence >= 60 ? 'yellow' : 'red'}
                        variant="light"
                      >
                        AI {selected.ai_confidence}%
                      </Badge>
                    )}
                  </Group>
                </Group>

                <QuestionDetail
                  q={selected}
                  onChange={(updated) => updateQuestion(selectedIndex, updated)}
                />
              </Paper>
            ) : (
              <Text c="dimmed" ta="center">Chọn một câu hỏi để xem chi tiết.</Text>
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
