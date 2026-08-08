import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, type UseFormReturnType } from '@mantine/form';
import {
  Modal,
  Box,
  Paper,
  Group,
  Stack,
  Text,
  Title,
  Badge,
  SimpleGrid,
  ThemeIcon,
  SegmentedControl,
  Image,
  AspectRatio,
  Button,
  Select,
  NumberInput,
  Textarea,
  Alert,
  Loader,
  FileInput,
  ActionIcon,
} from '@mantine/core';
import {
  IconCheck,
  IconAlertCircle,
  IconWand,
  IconPhoto,
  IconMicrophone,
  IconVideo,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import type { ExamImportPreview, ImportedQuestionDraft } from '@/services/examApi';
import examApi from '@/services/examApi';
import {
  draftsToFormValues,
  formRowToDraft,
  type ImportPreviewFormValues,
} from './importPreviewForm';

interface ExamImportPreviewModalProps {
  preview: ExamImportPreview;
  mediaArchive?: File | null;
  onConfirm: (questions: ImportedQuestionDraft[]) => void;
  onClose: () => void;
}

const TYPE_META: Record<string, { color: string; label: string }> = {
  mcq: { color: 'blue', label: 'TN' },
  essay: { color: 'grape', label: 'TL' },
  'TN-ANH': { color: 'orange', label: 'TN-ANH' },
  'TN-AUDIO': { color: 'violet', label: 'TN-AUDIO' },
  'TN-VIDEO': { color: 'red', label: 'TN-VIDEO' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  DE: 'teal',
  TRUNGBINH: 'yellow',
  KHO: 'red',
};

type MediaPreview = {
  url: string;
  type: 'image' | 'audio' | 'video';
  name: string;
};

type ChapterOption = {
  value: string;
  label: string;
  chapterLabel: string;
};

function QuestionCard({
  form,
  idx,
  q,
  onDelete,
  mediaPreview,
  mediaFile,
  onMediaChange,
  uploading,
  uploadError,
  chapterOptions,
}: {
  form: UseFormReturnType<ImportPreviewFormValues>;
  idx: number;
  q: ImportPreviewFormValues['questions'][number];
  onDelete: () => void;
  mediaPreview?: MediaPreview;
  mediaFile?: File | null;
  onMediaChange: (idx: number, file: File | null) => void;
  uploading?: boolean;
  uploadError?: string;
  chapterOptions: ChapterOption[];
}) {
  const base = `questions.${idx}` as const;
  const meta = TYPE_META[q.question_type] || TYPE_META.mcq;
  const confidence = q.ai_confidence ?? 100;
  const isMcq = q.question_type === 'mcq';
  const difficultyKey = (q.difficulty || 'DE') as keyof typeof DIFFICULTY_COLORS;
  const confidenceColor = confidence >= 80 ? 'teal' : confidence >= 60 ? 'yellow' : 'red';
  const mediaUrl = mediaPreview?.url || q.media?.url;
  const mediaType = mediaPreview?.type || q.media?.type;
  const mediaName = mediaPreview?.name || q.media?.filename;
  const needsMediaUpload = q.media?.status === 'missing' && !mediaPreview;
  const mediaFromArchive = q.media?.source === 'archive' && Boolean(q.media?.url);
  const mediaFromManualUpload = q.media?.source === 'manual' && Boolean(q.media?.url);
  const chapterMissing = q.chapter == null;

  const handleTypeChange = (value: string) => {
    if (value === q.question_type) return;
    form.setFieldValue(`${base}.question_type`, value as 'mcq' | 'essay');
    if (value === 'mcq') {
      form.setFieldValue(`${base}.correct_answer`, 'A');
    } else {
      form.setFieldValue(`${base}.correct_answer`, '');
    }
  };

  return (
    <Paper withBorder radius="lg" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap="xs" wrap="wrap">
            <Badge variant="filled" color={meta.color}>
              #{q.display_order}
            </Badge>
            <Badge variant="light" color={meta.color}>
              {meta.label}
            </Badge>
            <Badge variant="light" color="gray">
              {q.points} pts
            </Badge>
            <Badge variant="light" color={DIFFICULTY_COLORS[difficultyKey]}>
              {q.difficulty === 'DE' ? 'Dễ' : q.difficulty === 'TRUNGBINH' ? 'Trung bình' : 'Khó'}
            </Badge>
            <Badge variant="light" color="gray">
              {q.chapter != null
                ? q.chapter_label
                  ? `Ch.${q.chapter} - ${q.chapter_label}`
                  : `Ch.${q.chapter}`
                : 'Chưa chọn chương'}
            </Badge>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Badge variant="light" color={confidenceColor}>
              {confidence}%
            </Badge>
            <Badge
              variant="light"
              color={q.needs_review ? 'red' : 'teal'}
              leftSection={q.needs_review ? <IconAlertCircle size={12} /> : <IconCheck size={12} />}
            >
              {q.needs_review ? 'Review' : 'OK'}
            </Badge>
            <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete} title="Xóa câu hỏi">
              <IconTrash size={14} />
            </ActionIcon>
          </Group>
        </Group>

        <Textarea
          size="sm"
          minRows={4}
          autosize
          maxRows={12}
          variant="unstyled"
          w="100%"
          styles={{ root: { width: '100%' }, wrapper: { width: '100%' }, input: { width: '100%' } }}
          key={form.key(`${base}.content`)}
          {...form.getInputProps(`${base}.content`)}
        />

        <Group gap="sm" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              Loại câu
            </Text>
            <SegmentedControl
              size="xs"
              value={q.question_type}
              onChange={handleTypeChange}
              data={[
                { value: 'mcq', label: 'Trắc nghiệm' },
                { value: 'essay', label: 'Tự luận' },
              ]}
            />
          </Stack>

          <FileInput
            size="xs"
            label="Tải media"
            placeholder="Chọn ảnh/audio/video"
            value={mediaFile ?? null}
            accept="image/*,audio/*,video/*"
            clearable
            onChange={(file) => onMediaChange(idx, file)}
          />
        </Group>

        {uploading && (
          <Text size="xs" c="dimmed">
            Đang tải media lên Cloudinary...
          </Text>
        )}
        {uploadError && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            {uploadError}
          </Alert>
        )}

        {q.media && (
          <Group gap="xs" wrap="wrap">
            <Badge
              variant="light"
              color="yellow"
              leftSection={
                q.media.type === 'image' ? (
                  <IconPhoto size={12} />
                ) : q.media.type === 'audio' ? (
                  <IconMicrophone size={12} />
                ) : (
                  <IconVideo size={12} />
                )
              }
            >
              {q.media.filename}
            </Badge>
            {mediaFromArchive && (
              <Badge variant="light" color="teal">
                Tự gán từ ZIP
              </Badge>
            )}
            {mediaFromManualUpload && (
              <Badge variant="light" color="blue">
                Tải tay
              </Badge>
            )}
          </Group>
        )}

        {mediaUrl && mediaType === 'image' && (
          <Image src={mediaUrl} alt={mediaName || 'media'} radius="md" fit="contain" maw={520} mah={280} />
        )}
        {mediaUrl && mediaType === 'audio' && (
          <Box>
            <audio controls src={mediaUrl} style={{ width: '100%' }} />
          </Box>
        )}
        {mediaUrl && mediaType === 'video' && (
          <AspectRatio ratio={16 / 9} maw={720}>
            <video controls src={mediaUrl} style={{ width: '100%' }} />
          </AspectRatio>
        )}
        {needsMediaUpload && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            Thiếu file {q.media?.type ?? 'media'} - vui lòng tải lên.
          </Alert>
        )}

        {isMcq ? (
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
            {(['A', 'B', 'C', 'D'] as const).map((key) => (
              <Paper key={key} withBorder radius="md" p="xs">
                <Group align="flex-start" gap="xs" wrap="nowrap" w="100%">
                  <ThemeIcon size={22} radius="sm" variant="light" color="gray" style={{ flexShrink: 0 }}>
                    <Text size="xs" fw={700}>
                      {key}
                    </Text>
                  </ThemeIcon>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Textarea
                      size="xs"
                      minRows={1}
                      variant="unstyled"
                      w="100%"
                      styles={{
                        root: { width: '100%' },
                        wrapper: { width: '100%' },
                        input: { width: '100%' },
                      }}
                      key={form.key(`${base}.option${key}`)}
                      {...form.getInputProps(`${base}.option${key}`)}
                    />
                  </Box>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        ) : (
          <Box>
            <Text size="xs" c="dimmed" fw={700} tt="uppercase">
              Gợi ý / đáp án mẫu
            </Text>
            <Textarea
              size="xs"
              minRows={2}
              w="100%"
              placeholder="Nhập gợi ý / đáp án mẫu..."
              key={form.key(`${base}.answer_hint`)}
              {...form.getInputProps(`${base}.answer_hint`)}
            />
          </Box>
        )}

        <Group gap="sm" align="flex-end" wrap="wrap">
          <Select
            size="xs"
            label="Độ khó"
            key={form.key(`${base}.difficulty`)}
            {...form.getInputProps(`${base}.difficulty`)}
            data={[
              { value: 'DE', label: 'Dễ' },
              { value: 'TRUNGBINH', label: 'Trung bình' },
              { value: 'KHO', label: 'Khó' },
            ]}
          />
          {chapterOptions.length > 0 ? (
            <Select
              size="xs"
              label="Chương"
              placeholder="Chọn chương"
              data={chapterOptions}
              value={q.chapter != null ? String(q.chapter) : null}
              onChange={(value) => {
                const selected = chapterOptions.find((item) => item.value === value) ?? null;
                form.setFieldValue(`${base}.chapter`, value ? Number(value) : null);
                form.setFieldValue(`${base}.chapter_label`, selected?.chapterLabel ?? null);
              }}
              allowDeselect={false}
            />
          ) : (
            <NumberInput
              size="xs"
              label="Chương"
              min={1}
              placeholder="Bắt buộc khai báo CHUONG trong file Word"
              value={q.chapter}
              disabled
            />
          )}
          {isMcq && (
            <Select
              size="xs"
              label="Đáp án đúng"
              key={form.key(`${base}.correct_answer`)}
              {...form.getInputProps(`${base}.correct_answer`)}
              data={['A', 'B', 'C', 'D', 'A,B', 'A,C', 'B,D', 'A,B,C', 'A,B,D', 'B,C,D', 'A,C,D', 'A,B,C,D']}
              allowDeselect={false}
            />
          )}
        </Group>

        {q.needs_review && q.review_reason && (
          <Alert color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            {q.review_reason}
          </Alert>
        )}
        {chapterMissing && chapterOptions.length > 0 && (
          <Alert color="orange" variant="light" icon={<IconAlertCircle size={14} />}>
            Câu này chưa được gán chương. Hãy chọn một chương từ danh sách đã khai báo trong file Word.
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

export default function ExamImportPreviewModal({
  preview,
  mediaArchive = null,
  onConfirm,
  onClose,
}: ExamImportPreviewModalProps) {
  const [, setFormTick] = useState(0);
  const [currentPreview, setCurrentPreview] = useState<ExamImportPreview>(preview);
  const [confirmError, setConfirmError] = useState('');
  const form = useForm<ImportPreviewFormValues>({
    mode: 'uncontrolled',
    initialValues: draftsToFormValues(preview.questions),
    onValuesChange: () => {
      setFormTick((n) => n + 1);
      setConfirmError('');
    },
  });

  const [recomposing, setRecomposing] = useState(false);
  const [recomposeError, setRecomposeError] = useState('');
  const [recomposeFile, setRecomposeFile] = useState<File | null>(null);
  const [recomposeArchiveFile, setRecomposeArchiveFile] = useState<File | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<Record<number, File | null>>({});
  const [mediaPreviews, setMediaPreviews] = useState<Record<number, MediaPreview>>({});
  const [mediaUploading, setMediaUploading] = useState<Record<number, boolean>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<number, string>>({});
  const mediaPreviewRef = useRef<Record<number, MediaPreview>>({});
  const mediaUploadTokenRef = useRef<Record<number, string>>({});

  const questions = form.getValues().questions;
  const needsReviewCount = questions.filter((q) => q.needs_review).length;
  const mcqCount = questions.filter((q) => q.question_type === 'mcq').length;
  const essayCount = questions.filter((q) => q.question_type === 'essay').length;
  const chapterDefinitions = currentPreview.chapter_definitions ?? [];
  const chapterOptions = useMemo<ChapterOption[]>(
    () =>
      chapterDefinitions.map((item) => ({
        value: String(item.chapter),
        label: `Ch.${item.chapter} - ${item.label}`,
        chapterLabel: item.label,
      })),
    [chapterDefinitions]
  );
  const chapterLabelByNumber = useMemo(
    () => new Map(chapterDefinitions.map((item) => [item.chapter, item.label])),
    [chapterDefinitions]
  );
  const hasChapterDefinitions = chapterDefinitions.length > 0;
  const invalidChapterCount = questions.filter(
    (q) => q.chapter == null || !chapterLabelByNumber.has(q.chapter)
  ).length;

  useEffect(() => {
    mediaPreviewRef.current = mediaPreviews;
  }, [mediaPreviews]);

  useEffect(
    () => () => {
      Object.values(mediaPreviewRef.current).forEach((item) => {
        if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
      });
    },
    []
  );

  const detectMediaType = (file: File): MediaPreview['type'] | null => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return null;
  };

  const patchQuestionMedia = (idx: number, media: ImportedQuestionDraft['media']) => {
    form.setFieldValue(`questions.${idx}.media`, media);
    form.setFieldValue(`questions.${idx}.media_url`, media?.url ?? null);
  };

  const handleMediaChange = async (idx: number, file: File | null) => {
    setMediaFiles((prev) => ({ ...prev, [idx]: file }));
    setMediaErrors((prev) => {
      const next = { ...prev };
      delete next[idx];
      return next;
    });
    setMediaUploading((prev) => ({ ...prev, [idx]: false }));

    const type = file ? detectMediaType(file) : null;

    setMediaPreviews((prev) => {
      const next = { ...prev };
      const existing = next[idx];
      if (existing?.url?.startsWith('blob:')) URL.revokeObjectURL(existing.url);

      if (!file || !type) {
        delete next[idx];
        return next;
      }

      next[idx] = { url: URL.createObjectURL(file), type, name: file.name };
      return next;
    });

    if (!file || !type) {
      delete mediaUploadTokenRef.current[idx];
      patchQuestionMedia(idx, null);
      return;
    }

    patchQuestionMedia(idx, {
      type,
      filename: file.name,
      status: 'embedded',
      source: 'manual',
    });

    const token = `${file.name}-${file.size}-${file.lastModified}`;
    mediaUploadTokenRef.current[idx] = token;
    setMediaUploading((prev) => ({ ...prev, [idx]: true }));

    try {
      const uploaded = await examApi.uploadExamMedia(file, { scope: 'preview-temp' });
      if (mediaUploadTokenRef.current[idx] !== token) return;

      patchQuestionMedia(idx, {
        type,
        filename: file.name,
        status: 'found',
        source: 'manual',
        url: uploaded.url,
      });

      setMediaPreviews((prev) => {
        const next = { ...prev };
        const existing = next[idx];
        if (existing?.url?.startsWith('blob:')) URL.revokeObjectURL(existing.url);
        next[idx] = { url: uploaded.url, type, name: file.name };
        return next;
      });
    } catch (err: unknown) {
      if (mediaUploadTokenRef.current[idx] !== token) return;
      const message = err instanceof Error ? err.message : 'Không thể tải media lên Cloudinary.';
      setMediaErrors((prev) => ({ ...prev, [idx]: message }));
    } finally {
      if (mediaUploadTokenRef.current[idx] === token) {
        setMediaUploading((prev) => ({ ...prev, [idx]: false }));
      }
    }
  };

  const handleRecompose = async () => {
    if (!recomposeFile) {
      setShowFileUpload(true);
      return;
    }
    setRecomposing(true);
    setRecomposeError('');
    try {
      const result = await examApi.aiRecomposeExam({
        file: recomposeFile,
        mediaArchive: recomposeArchiveFile ?? mediaArchive ?? null,
        examInfo: currentPreview.exam,
      });
      setCurrentPreview(result);
      const nextValues = draftsToFormValues(result.questions);
      form.setInitialValues(nextValues);
      form.setValues(nextValues);
      form.reset();
      setShowFileUpload(false);
      setRecomposeFile(null);
      setRecomposeArchiveFile(null);
      setConfirmError('');
      setMediaFiles({});
      setMediaPreviews({});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI xử lý thất bại. Thử lại.';
      setRecomposeError(message);
    } finally {
      setRecomposing(false);
    }
  };

  const handleConfirm = () => {
    const rows = form.getValues().questions;
    if (!hasChapterDefinitions) {
      setConfirmError(
        'File Word chưa khai báo danh sách CHUONG ở đầu file. Bắt buộc thêm CHUONG 1 : ... trước khi import.'
      );
      return;
    }
    const invalidIndex = rows.findIndex(
      (row) => row.chapter == null || !chapterLabelByNumber.has(row.chapter)
    );
    if (invalidIndex >= 0) {
      setConfirmError(
        `Câu ${invalidIndex + 1} chưa có chương hợp lệ. Hãy chọn chương từ danh sách đã khai báo trong file Word.`
      );
      return;
    }
    const normalizedRows = rows.map((row) => ({
      ...row,
      chapter: row.chapter,
      chapter_label:
        row.chapter != null ? chapterLabelByNumber.get(row.chapter) ?? row.chapter_label ?? null : null,
    }));
    setConfirmError('');
    onConfirm(normalizedRows.map((row) => formRowToDraft(row)));
  };

  const handleDeleteQuestion = (idx: number) => {
    const current = form.getValues().questions;
    const updated = current.filter((_, i) => i !== idx).map((q, i) => ({
      ...q,
      display_order: i + 1,
    }));
    form.setValues({ questions: updated });
    setMediaFiles((prev: Record<number, File | null>) => {
      const next: Record<number, File | null> = {};
      Object.keys(prev)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((key) => {
          const k = Number(key);
          if (k < idx) next[k] = prev[k];
          else if (k > idx) next[k - 1] = prev[k];
        });
      return next;
    });
    setMediaPreviews((prev: Record<number, MediaPreview>) => {
      const next: Record<number, MediaPreview> = {};
      Object.keys(prev)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((key) => {
          const k = Number(key);
          if (k < idx) next[k] = prev[k];
          else if (k > idx) next[k - 1] = prev[k];
        });
      return next;
    });
  };

  const handleAddQuestion = () => {
    const current = form.getValues().questions;
    const newOrder = current.length + 1;
    form.setValues({
      questions: [
        ...current,
        {
          content: '',
          question_type: 'mcq',
          points: 1,
          optionA: '',
          optionB: '',
          optionC: '',
          optionD: '',
          correct_answer: 'A',
          difficulty: 'DE',
          chapter: null,
          chapter_label: null,
          answer_hint: '',
          display_order: newOrder,
          ai_confidence: 100,
          needs_review: false,
          review_reason: null,
          media: null,
          media_url: null,
        },
      ],
    });
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={null}
      size="95%"
      fullScreen
      styles={{
        body: {
          padding: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        },
        content: { height: '100vh' },
        header: { display: 'none' },
      }}
    >
      <Paper radius={0} p="sm" withBorder>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Stack gap={4} style={{ flex: 1 }}>
            <Title order={4}>{currentPreview.exam.title || 'Xem trước đề thi'}</Title>
            <Group gap="xs" wrap="wrap">
              {currentPreview.exam.duration_min && (
                <Badge variant="light" color="gray">
                  {currentPreview.exam.duration_min} phút
                </Badge>
              )}
              <Badge variant="light" color="gray">
                {questions.length} câu
              </Badge>
              <Badge variant="light" color="blue">
                TN {mcqCount}
              </Badge>
              <Badge variant="light" color="green">
                TL {essayCount}
              </Badge>
              {needsReviewCount > 0 && (
                <Badge variant="light" color="red">
                  {needsReviewCount} cần xem lại
                </Badge>
              )}
              {currentPreview.parse_summary && (
                <Text size="xs" c="dimmed">
                  Parse {currentPreview.parse_summary.parse_time_ms}ms
                </Text>
              )}
              {hasChapterDefinitions && (
                <Badge variant="light" color="grape">
                  {chapterDefinitions.length} chương khai báo
                </Badge>
              )}
            </Group>
          </Stack>

          <Group gap="xs" wrap="nowrap">
            {showFileUpload && (
              <>
                <FileInput
                  size="xs"
                  placeholder="Chọn file docx..."
                  accept=".docx"
                  value={recomposeFile}
                  onChange={setRecomposeFile}
                  style={{ minWidth: 160 }}
                />
                <FileInput
                  size="xs"
                  placeholder={mediaArchive ? 'Giữ ZIP hiện tại hoặc chọn ZIP mới' : 'Chọn file zip (tùy chọn)'}
                  accept=".zip,application/zip"
                  value={recomposeArchiveFile}
                  onChange={setRecomposeArchiveFile}
                  clearable
                  style={{ minWidth: 200 }}
                />
              </>
            )}
            <Button
              size="xs"
              variant="light"
              color="teal"
              leftSection={recomposing ? <Loader size={12} color="#fff" /> : <IconWand size={12} />}
              onClick={handleRecompose}
              disabled={recomposing || (showFileUpload && !recomposeFile)}
            >
              AI Sửa Lại
            </Button>
            <Button
              size="xs"
              color="cyan"
              onClick={handleConfirm}
              disabled={!hasChapterDefinitions || invalidChapterCount > 0}
            >
              Xác nhận ({questions.length})
            </Button>
            <Button size="xs" variant="default" onClick={onClose}>
              Hủy
            </Button>
          </Group>
        </Group>

        {recomposeError && (
          <Alert mt="xs" color="red" variant="light">
            {recomposeError}
          </Alert>
        )}
        {mediaArchive && (
          <Alert mt="xs" color="teal" variant="light" icon={<IconCheck size={14} />}>
            Đã có file ZIP media đi kèm từ bước xem trước. Nếu cần, bạn có thể chọn ZIP mới khi bấm AI Sửa Lại.
          </Alert>
        )}
        {!hasChapterDefinitions && (
          <Alert mt="xs" color="orange" variant="light" icon={<IconAlertCircle size={14} />}>
            Regex hiện chưa nhận ra danh sách chương từ file Word này. Bạn vẫn có thể bấm `AI Sửa Lại`
            để AI thử bóc tách từ nội dung gốc, nhưng chỉ được `Xác nhận` khi đã có danh sách CHUONG hợp lệ.
          </Alert>
        )}
        {hasChapterDefinitions && (
          <Alert mt="xs" color={invalidChapterCount > 0 ? 'orange' : 'teal'} variant="light">
            {invalidChapterCount > 0
              ? `Còn ${invalidChapterCount} câu chưa có chương hợp lệ. Hãy chọn chương bằng dropdown trước khi xác nhận.`
              : `Đã nhận ${chapterDefinitions.length} chương từ file Word. Các câu hỏi sẽ chỉ được chọn trong danh sách chương này.`}
          </Alert>
        )}
        {confirmError && (
          <Alert mt="xs" color="red" variant="light" icon={<IconAlertCircle size={14} />}>
            {confirmError}
          </Alert>
        )}
        {currentPreview.warnings.length > 0 && (
          <Alert mt="xs" color="yellow" variant="light" icon={<IconAlertCircle size={14} />}>
            <Stack gap={4}>
              {currentPreview.warnings.map((warning, index) => (
                <Text key={index} size="sm">
                  {warning}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}
      </Paper>

      <Box style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '16px 32px' }}>
        <Button
          size="sm"
          variant="light"
          color="teal"
          leftSection={<IconPlus size={14} />}
          onClick={handleAddQuestion}
          mb="md"
        >
          Thêm câu hỏi
        </Button>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {questions.map((q, idx) => (
            <QuestionCard
              key={`${q.display_order}-${idx}`}
              form={form}
              idx={idx}
              q={q}
              onDelete={() => handleDeleteQuestion(idx)}
              mediaPreview={mediaPreviews[idx]}
              mediaFile={mediaFiles[idx] ?? null}
              onMediaChange={handleMediaChange}
              uploading={mediaUploading[idx]}
              uploadError={mediaErrors[idx]}
              chapterOptions={chapterOptions}
            />
          ))}
        </SimpleGrid>
      </Box>
    </Modal>
  );
}
