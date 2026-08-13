import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AspectRatio,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Group,
  Image,
  NumberInput,
  Paper,
  Select,
  MultiSelect,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  ThemeIcon,
  FileInput,
  Radio,
  Switch,
} from '@mantine/core';
import { Dropzone, MIME_TYPES } from '@mantine/dropzone';
import {
  IconFileWord,
  IconUpload,
  IconX,
  IconCheck,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import adminClassApi, { type AdminClassDto } from '@/services/adminClassApi';
import useAuth from '@/hooks/useAuth';
import { useSubjectPickerCatalog } from '@/hooks/useSubjectPickerCatalog';
import examApi, { type ExamImportPreview, type ImportedQuestionDraft } from '@/services/examApi';
import ExamImportPreviewModal from '@/components/ExamVerifyModal/ExamImportPreviewModal';
import SubjectCategoryPicker from '@/components/Input/SubjectCategoryPicker';
import { formatSubjectLabel } from '@/components/Input/SubjectCategoryPicker/subjectGrouping';
import ExamQuestionBankPicker, { type BankPickTarget } from '@/pages/main/Exam/ExamQuestionBankPicker';
import { isoToDatetimeLocalInput, scheduleDurationMin } from '@/utils/examDeadline';

const MAX_EXAM_VERSIONS = 4;

function versionCodeForIndex(index: number): string {
  return `D${String(index + 1).padStart(2, '0')}`;
}

type AuthoringQuestion = ImportedQuestionDraft & {
  id?: string;
  question_bank_id?: string;
  version_index: number;
  media?: {
    type: 'image' | 'audio' | 'video';
    filename: string;
    status?: 'found' | 'missing' | 'embedded';
    url?: string;
    source?: 'archive' | 'manual';
  };
  media_url?: string | null;
};

type ExamMetaFormValues = {
  title: string;
  description: string;
  durationMin: number | '';
  opensAt: string;
  endsAt: string;
  adminClassId: string | null;
  subjectId: string | null;
  dynamicNumQuestions: string | '';
  exam_type: 'mcq' | 'essay' | 'msq' | 'fib' | 'mixed';
  requireSeb: boolean;
};

type QuestionEditFormValues = {
  content: string;
  points: number;
  question_type: 'mcq' | 'msq' | 'fib';
  correct_answer: string[];
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  media_url: string | null;
};

function guessMediaType(url: string): 'image' | 'audio' | 'video' {
  const u = (url.split('?')[0] ?? url).toLowerCase();
  if (/\.(mp4|webm|mov|m4v)$/.test(u)) return 'video';
  if (/\.(mp3|wav|ogg|m4a|aac)$/.test(u)) return 'audio';
  return 'image';
}

function mediaUrlFromQuestion(q: AuthoringQuestion): string | null {
  return q.media_url ?? q.media?.url ?? null;
}

function AuthoringMediaPreview({ url }: { url: string }) {
  const mt = guessMediaType(url);
  if (mt === 'image') {
    return (
      <Image src={url} alt="media" radius="md" fit="contain" maw={480} mah={280} />
    );
  }
  if (mt === 'audio') {
    return (
      <Box>
        <audio controls src={url} style={{ width: '100%', maxWidth: 480 }} />
      </Box>
    );
  }
  return (
    <AspectRatio ratio={16 / 9} maw={560}>
      <video controls src={url} style={{ width: '100%' }} />
    </AspectRatio>
  );
}

export default function ExamAuthoring() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const isEditMode = Boolean(examId);
  const { userRole } = useAuth();
  const [adminClass, setAdminClass] = useState<AdminClassDto | null>(null);
  const pickerCatalogOptions =
    userRole === 'admin' && adminClass?.id ? { adminClassId: adminClass.id } : undefined;
  const { groups: pickerGroups, subjects: pickerSubjects, loading: catalogLoading } =
    useSubjectPickerCatalog(pickerCatalogOptions);
  const examForm = useForm<ExamMetaFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      title: '',
      description: '',
      durationMin: 60,
      opensAt: '',
      endsAt: '',
      adminClassId: null,
      subjectId: null,
      dynamicNumQuestions: '',
      exam_type: 'mcq',
      requireSeb: false,
    },
  });
  const questionEditForm = useForm<QuestionEditFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      content: '',
      points: 1,
      question_type: 'mcq',
      correct_answer: [],
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      media_url: null,
    },
  });
  const [questions, setQuestions] = useState<AuthoringQuestion[]>([]);

    const [versionFiles, setVersionFiles] = useState<(File | null)[]>(() =>
    Array.from({ length: MAX_EXAM_VERSIONS }, () => null)
  );
  const [versionMediaArchives, setVersionMediaArchives] = useState<(File | null)[]>(() =>
    Array.from({ length: MAX_EXAM_VERSIONS }, () => null)
  );
  const [versionPreviews, setVersionPreviews] = useState<(ExamImportPreview | null)[]>(() =>
    Array.from({ length: MAX_EXAM_VERSIONS }, () => null)
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verifyOpened, setVerifyOpened] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [scheduleRev, setScheduleRev] = useState(0);
  const [examCategory, setExamCategory] = useState<'midterm' | 'final' | 'practice'>('midterm');
  const [reviewModeDetailed, setReviewModeDetailed] = useState(false);

  const { opensAt: opensAtValue, endsAt: endsAtValue } = examForm.getValues();
  const computedScheduleDuration =
    opensAtValue && endsAtValue ? scheduleDurationMin(opensAtValue, endsAtValue) : null;
  const hasValidSchedule = computedScheduleDuration != null;
  void scheduleRev;

  const syncDurationFromSchedule = (opensAt: string, endsAt: string) => {
    const mins = scheduleDurationMin(opensAt, endsAt);
    if (mins != null) {
      examForm.setFieldValue('durationMin', mins);
    }
    setScheduleRev((n) => n + 1);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [existingExam, existingQuestions] = await Promise.all([
          examId ? examApi.getExam(examId) : Promise.resolve(null),
          examId ? examApi.getQuestions(examId) : Promise.resolve([]),
        ]);
        const subjectList = pickerSubjects;
        let mineClass: AdminClassDto | null = null;
        try {
          const list = await adminClassApi.getClasses();
          mineClass =
            list.find((c) => c.display_name.includes('16-02')) ?? list[0] ?? null;
        } catch {
          // ignore
        }
        setAdminClass(mineClass);
        examForm.setValues((prev) => {
          const adminClassIdNext =
            prev.adminClassId ?? existingExam?.admin_class_id ?? mineClass?.id ?? null;
          const subjectIdNext =
            prev.subjectId ?? existingExam?.subject_id ?? subjectList[0]?.id ?? null;
          setSelectedSubjectId(subjectIdNext);
          if (!existingExam) {
            return { ...prev, adminClassId: adminClassIdNext, subjectId: subjectIdNext };
          }
          return {
            ...prev,
            adminClassId: adminClassIdNext,
            subjectId: subjectIdNext,
            title: existingExam.title,
            description: existingExam.description ?? '',
            durationMin: existingExam.duration_min,
            opensAt: existingExam.opens_at ? isoToDatetimeLocalInput(existingExam.opens_at) : '',
            endsAt: (existingExam.ends_at ?? existingExam.closes_at)
              ? isoToDatetimeLocalInput(
                  (existingExam.ends_at ?? existingExam.closes_at) as string
                )
              : '',
            dynamicNumQuestions: existingExam.dynamic_num_questions != null ? String(existingExam.dynamic_num_questions) : '',
            exam_type: existingExam.exam_type ?? 'mcq',
          };
        });
        if (existingExam) {
          if (existingExam.exam_category) setExamCategory(existingExam.exam_category as 'midterm' | 'final' | 'practice');
          if (existingExam.review_mode_detailed !== undefined) setReviewModeDetailed(existingExam.review_mode_detailed);
          if (existingExam.require_seb !== undefined) examForm.setFieldValue('requireSeb', existingExam.require_seb);
          const opens = existingExam.opens_at
            ? isoToDatetimeLocalInput(existingExam.opens_at)
            : '';
          const ends = (existingExam.ends_at ?? existingExam.closes_at)
            ? isoToDatetimeLocalInput(
                (existingExam.ends_at ?? existingExam.closes_at) as string
              )
            : '';
          if (opens && ends) {
            const mins = scheduleDurationMin(opens, ends);
            if (mins != null) examForm.setFieldValue('durationMin', mins);
            setScheduleRev((n) => n + 1);
          }
        }
        if (existingQuestions.length) {
          setQuestions(
            existingQuestions.map((question, index) => {
              const url = question.media_url ?? null;
              return {
                id: question.id,
                content: question.content,
                question_type: question.question_type,
                points: question.points,
                options: question.options,
                correct_answer: question.correct_answer ?? null,
                difficulty: question.difficulty,
                chapter: question.chapter ?? undefined,
                chapter_label: question.chapter_label ?? null,
                answer_hint: question.answer_hint ?? null,
                display_order: question.display_order ?? index + 1,
                version_index: question.version_index ?? 0,
                question_bank_id: question.question_bank_id ?? undefined,
                media_url: url,
                media: url
                  ? {
                      type: guessMediaType(url),
                      filename: '',
                      status: 'found' as const,
                      url,
                    }
                  : undefined,
              };
            })
          );
        }
      } catch {
        setError(t('exam_authoring.error_load_failed'));
      } finally {
        setLoading(false);
      }
    };

    void loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, pickerSubjects, t]);

  
  
  const file = versionFiles[0];
  const preview = versionPreviews[0];



  const currentQuestions = useMemo(
    () => questions.filter((q) => (q.version_index ?? 0) === 0),
    [questions, 0]
  );

  
  const subjectLabel = useMemo(() => {
    if (!selectedSubjectId) return '';
    const subject = pickerSubjects.find((s) => s.id === selectedSubjectId);
    return subject ? formatSubjectLabel(subject) : '';
  }, [selectedSubjectId, pickerSubjects]);

  const bankLinkedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.question_bank_id && (q.version_index ?? 0) === 0) {
        ids.add(q.question_bank_id);
      }
    }
    return ids;
  }, [questions, 0]);

  const handleAddFromBank = (picked: BankPickTarget[]) => {
    if (!picked.length) return;
    const mapped: AuthoringQuestion[] = picked.map((p) => ({
      content: p.content,
      question_type: p.question_type,
      points: p.points,
      options: p.options,
      correct_answer: p.correct_answer,
      display_order: 0,
      version_index: 0,
      question_bank_id: p.question_bank_id,
      difficulty: p.difficulty,
      chapter: p.chapter ?? undefined,
      answer_hint: p.answer_hint ?? null,
    }));
    setQuestions((prev) => normalizeQuestions([...prev, ...mapped]));
    setNotice(
      t('exam_authoring.question_bank_added', {
        count: mapped.length,
        code: versionCodeForIndex(0),
      })
    );
    setError('');
  };

  const setVersionFile = (versionIdx: number, next: File | null) => {
    setVersionFiles((prev) => {
      const copy = [...prev];
      copy[versionIdx] = next;
      return copy;
    });
    setVersionPreview(versionIdx, null);
  };

  const setVersionMediaArchive = (versionIdx: number, next: File | null) => {
    setVersionMediaArchives((prev) => {
      const copy = [...prev];
      copy[versionIdx] = next;
      return copy;
    });
    setVersionPreview(versionIdx, null);
  };

  const setVersionPreview = (versionIdx: number, next: ExamImportPreview | null) => {
    setVersionPreviews((prev) => {
      const copy = [...prev];
      copy[versionIdx] = next;
      return copy;
    });
  };

  
  
  const normalizeQuestions = (items: AuthoringQuestion[]) => {
    return items.map((item, index) => ({
      ...item,
      display_order: index + 1,
      version_index: 0,
    }));
  };

  const previewWord = async () => {
    if (!file) {
      setError(t('exam_authoring.error_select_file'));
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const data = await examApi.previewWordImport(file, versionMediaArchives[0]);
      setVersionPreview(0, data);
      const meta = examForm.getValues();
      if (data.exam.title && !meta.title) examForm.setFieldValue('title', data.exam.title);
      if (data.exam.description && !meta.description) examForm.setFieldValue('description', data.exam.description);
      if (data.exam.duration_min) examForm.setFieldValue('durationMin', data.exam.duration_min);
    } catch {
      setError(t('exam_authoring.error_read_file'));
    } finally {
      setLoading(false);
    }
  };

  const applyPreviewQuestions = () => {
    if (!preview || !file) return;
    setVerifyOpened(true);
  };

  const handleVerifyConfirm = (verifiedQuestions: ImportedQuestionDraft[]) => {
    const mapped = (verifiedQuestions as AuthoringQuestion[]).map((q) => ({
      ...q,
      version_index: 0,
      media_url: q.media?.url ?? q.media_url ?? null,
    }));
    setQuestions((prev) => {
      const kept = prev.filter((q) => (q.version_index ?? 0) !== 0);
      return normalizeQuestions([...kept, ...mapped]);
    });
    setNotice(
      t('exam_authoring.notice_confirmed', { count: verifiedQuestions.length }) +
        ` (${versionCodeForIndex(0)})`
    );
    setVerifyOpened(false);
  };

  const deleteQuestion = (localIdx: number) => {
    const target = currentQuestions[localIdx];
    if (!target) return;
    setQuestions((prev) => prev.filter((q) => q !== target));
  };

  const startEditQuestion = (q: AuthoringQuestion, idx: number) => {
    setMediaUploadError('');
    setEditingQuestionId(q.id ?? String(idx));
    const url = mediaUrlFromQuestion(q);
    questionEditForm.setValues({
      content: q.content,
      points: q.points,
      question_type: (q.question_type as 'mcq'),
      correct_answer: Array.isArray(q.correct_answer) ? q.correct_answer : typeof q.correct_answer === 'string' ? [q.correct_answer] : [],
      optionA: q.options?.A ?? '',
      optionB: q.options?.B ?? '',
      optionC: q.options?.C ?? '',
      optionD: q.options?.D ?? '',
      media_url: url,
    });
  };

  const cancelEditQuestion = () => {
    setEditingQuestionId(null);
    setMediaUploadError('');
  };

  const handleEditMediaFile = async (file: File | null) => {
    setMediaUploadError('');
    if (!file) {
      questionEditForm.setFieldValue('media_url', null);
      return;
    }
    setMediaUploadLoading(true);
    try {
      const uploaded = await examApi.uploadExamMedia(file);
      const url = uploaded.url;
      questionEditForm.setFieldValue('media_url', url);
    } catch (e: unknown) {
      setMediaUploadError(e instanceof Error ? e.message : t('exam_authoring.error_media_upload'));
    } finally {
      setMediaUploadLoading(false);
    }
  };

  const clearEditMedia = () => {
    questionEditForm.setFieldValue('media_url', null);
    setMediaUploadError('');
  };

  const saveEditQuestion = (localIdx: number) => {
    const v = questionEditForm.getValues();
    const optionsMcq =
      v.question_type === 'mcq'
        ? { A: v.optionA, B: v.optionB, C: v.optionC, D: v.optionD }
        : undefined;
    const globalIdx = questions.findIndex((q) => q === currentQuestions[localIdx]);
    if (globalIdx < 0) return;
    setQuestions((prev) => {
      const next = [...prev];
      const base = prev[globalIdx];
      next[globalIdx] = {
        ...base,
        content: v.content,
        question_type: v.question_type,
        points: v.points,
        options: optionsMcq,
        correct_answer: v.question_type === 'mcq' ? (v.correct_answer || null) : null,
        media_url: v.media_url,
        media: v.media_url
          ? {
              type: guessMediaType(v.media_url),
              filename: '',
              status: 'found' as const,
              source: 'manual' as const,
              url: v.media_url,
            }
          : undefined,
      };
      return next;
    });
    setEditingQuestionId(null);
  };

  const saveExam = async () => {
    const meta = examForm.getValues();
    const dynamicNumQuestions = meta.dynamicNumQuestions;
    if (!meta.title || !meta.durationMin || !meta.adminClassId || !meta.subjectId) {
      setError(t('exam_authoring.error_missing_fields'));
      return;
    }
    if (questions.length === 0) {
      setError(t('exam_authoring.error_no_questions'));
      return;
    }

    if ((meta.opensAt && !meta.endsAt) || (!meta.opensAt && meta.endsAt)) {
      setError(t('exam_authoring.error_schedule_incomplete'));
      return;
    }
    if (meta.opensAt && meta.endsAt && new Date(meta.opensAt).getTime() >= new Date(meta.endsAt).getTime()) {
      setError(t('exam_authoring.error_schedule_order'));
      return;
    }

    const duration = hasValidSchedule
      ? computedScheduleDuration!
      : Number(meta.durationMin);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError(t('exam_authoring.error_fill_required'));
      return;
    }

    const schedulePayload = {
      opens_at: meta.opensAt ? new Date(meta.opensAt).toISOString() : null,
      ends_at: meta.endsAt ? new Date(meta.endsAt).toISOString() : null,
    };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (examId) {
        await examApi.updateExam(examId, {
          title: meta.title.trim(),
          duration_min: Math.floor(duration),
          description: meta.description.trim() || null,
          ...schedulePayload,
          require_seb: meta.requireSeb,
          dynamic_num_questions: dynamicNumQuestions ? Number(dynamicNumQuestions) : null,
          exam_type: 'mcq',
          exam_category: examCategory,
          review_mode_detailed: examCategory === 'practice' ? reviewModeDetailed : false,
        });
        const ordered = normalizeQuestions(questions);
        const existing = ordered.filter((q): q is AuthoringQuestion & { id: string } => Boolean(q.id));
        const newQuestions = ordered.filter((question) => !question.id);

        for (const question of existing) {
          await examApi.updateQuestion(examId, question.id, {
            content: question.content,
            question_type: 'mcq',
            points: question.points,
            options: question.options ?? null,
            correct_answer: question.correct_answer ?? null,
            media_url: question.media_url ?? question.media?.url ?? null,
            difficulty: question.difficulty,
            chapter: question.chapter ?? null,
            chapter_label: question.chapter_label ?? null,
            answer_hint: question.answer_hint ?? null,
            display_order: question.display_order,
          });
        }
        for (const question of newQuestions) {
          await examApi.addQuestion(examId, {
            content: question.content,
            question_type: 'mcq',
            points: question.points,
            options: question.options ?? undefined,
            correct_answer: question.correct_answer ?? undefined,
            media_url: question.media_url ?? question.media?.url ?? null,
            difficulty: question.difficulty,
            chapter: question.chapter ?? null,
            chapter_label: question.chapter_label ?? null,
            answer_hint: question.answer_hint ?? null,
            version_index: question.version_index ?? 0,
            question_bank_id: question.question_bank_id,
          });
        }
        setNotice(
          t('exam_authoring.notice_updated', { existing: existing.length, new: newQuestions.length })
        );
        window.setTimeout(() => navigate('/exams'), 800);
        return;
      }

      const created = await examApi.commitWordImport({
        title: meta.title.trim(),
        admin_class_id: meta.adminClassId,
        subject_id: meta.subjectId,
        duration_min: Math.floor(duration),
        description: meta.description.trim() || null,
        opens_at: schedulePayload.opens_at ?? undefined,
        ends_at: schedulePayload.ends_at ?? undefined,
        created_at: new Date().toISOString(),
        require_seb: meta.requireSeb,
        dynamic_num_questions: dynamicNumQuestions ? Number(dynamicNumQuestions) : null,
        exam_type: 'mcq',
        exam_category: examCategory,
        review_mode_detailed: examCategory === 'practice' ? reviewModeDetailed : false,

        questions: normalizeQuestions(questions).map((q) => ({
          ...q,
          version_index: q.version_index ?? 0,
          media_url: q.media_url ?? q.media?.url ?? null,
          question_bank_id: q.question_bank_id,
        })),
      });
      setNotice(t('exam_authoring.notice_created', { title: created.exam.title, count: created.questions.length }));
      window.setTimeout(() => navigate('/exams'), 800);
    } catch {
      setError(t('exam_authoring.error_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box className="max-w-[1400px] mx-auto p-4">
      {/* Page header */}
      <Group justify="space-between" mb="md" wrap="wrap">
        <Group gap="sm">
          <Title order={2}>{isEditMode ? t('exam_authoring.edit_title') : t('exam_authoring.create_title')}</Title>
          {isEditMode && (
            <Badge size="lg" color="teal" variant="light">{questions.length} {t('exam_authoring.questions')}</Badge>
          )}
        </Group>
        <Group gap="sm">
          <Button variant="default" onClick={() => navigate('/exams')}>{t('common.back')}</Button>
          <Button color="green" loading={saving} onClick={saveExam}>
            {isEditMode ? t('exam_authoring.btn_update') : t('exam_authoring.btn_save')}
          </Button>
        </Group>
      </Group>

      {!!error && <Alert color="red" variant="light" icon={<IconAlertCircle size={16} />} mb="sm">{error}</Alert>}
      {!!notice && <Alert color="green" variant="light" icon={<IconCheck size={16} />} mb="sm">{notice}</Alert>}

      <Alert color="blue" variant="light" mb="sm">
        {t('exam_authoring.multi_version_hint')}
      </Alert>

      {/* Two-column layout */}
      <Group align="flex-start" gap="md" wrap="wrap" style={{ rowGap: '12px' }}>
        {/* LEFT COLUMN — Exam info + Import (compact sidebar) */}
        <Stack gap="sm" style={{ minWidth: 450, flex: '0 0 450px' }}>
          {/* Thông tin bài thi — collapsible */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <Box
              style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', padding: '10px 16px', cursor: 'pointer' }}
              onClick={() => setInfoCollapsed((v) => !v)}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <Text size="sm" fw={600} c="white">{t('exam_authoring.exam_info')}</Text>
                </Group>
                {infoCollapsed ? <IconChevronDown size={14} color="white" /> : <IconChevronUp size={14} color="white" />}
              </Group>
            </Box>
            <Collapse in={!infoCollapsed}>
              <Stack gap="xs" p="sm">
                <TextInput
                  label={t('exam_authoring.exam_title_label')}
                  size="sm"
                  placeholder={t('exam_authoring.exam_title_placeholder')}
                  key={examForm.key('title')}
                  {...examForm.getInputProps('title')}
                />
                <TextInput
                  label={t('exam_authoring.admin_class_label')}
                  size="sm"
                  readOnly
                  value={adminClass?.display_name ?? ''}
                  placeholder={
                    loading
                      ? t('exam_authoring.loading')
                      : t('exam_authoring.no_admin_class')
                  }
                />
                <SubjectCategoryPicker
                  label={t('exam_authoring.subject_label')}
                  size="sm"
                  placeholder={
                    loading || catalogLoading
                      ? t('exam_authoring.loading')
                      : t('exam_authoring.select_subject')
                  }
                  disabled={isEditMode || !adminClass || loading || catalogLoading}
                  catalogLoading={catalogLoading}
                  externalGroups={pickerGroups}
                  value={examForm.getValues().subjectId}
                  onChange={(id) => {
                    examForm.setFieldValue('subjectId', id);
                    setSelectedSubjectId(id);
                  }}
                  error={examForm.errors.subjectId as string | undefined}
                />
                <Select
                  label={t('exam_authoring.type_label')}
                  data={[
                    { value: 'mcq', label: t('exam_authoring.type_mcq') },
                    { value: 'mixed', label: 'Trắc nghiệm & Điền khuyết (Mixed)' },
                  ]}
                  size="sm"
                  key={examForm.key('exam_type')}
                  {...examForm.getInputProps('exam_type')}
                />
                
                {examForm.getValues().exam_type !== 'essay' && (
                  <>
                    <Group grow>
                  <TextInput
                    label={t('exam_authoring.opens_at_label')}
                    description={t('exam_authoring.opens_at_desc')}
                    size="sm"
                    type="datetime-local"
                    key={examForm.key('opensAt')}
                    value={examForm.getValues().opensAt}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      examForm.setFieldValue('opensAt', v);
                      syncDurationFromSchedule(v, examForm.getValues().endsAt);
                    }}
                  />
                  <TextInput
                    label={t('exam_authoring.ends_at_label')}
                    description={t('exam_authoring.ends_at_desc')}
                    size="sm"
                    type="datetime-local"
                    key={examForm.key('endsAt')}
                    value={examForm.getValues().endsAt}
                    onChange={(e) => {
                      const v = e.currentTarget.value;
                      examForm.setFieldValue('endsAt', v);
                      syncDurationFromSchedule(examForm.getValues().opensAt, v);
                    }}
                  />
                </Group>
                {hasValidSchedule ? (
                  <Text size="sm" c="dimmed">
                    {t('exam_authoring.duration_from_schedule', { minutes: computedScheduleDuration })}
                  </Text>
                ) : (
                  <NumberInput
                    label={t('exam_authoring.duration_label')}
                    description={t('exam_authoring.duration_desc')}
                    size="sm"
                    min={1}
                    max={300}
                    key={examForm.key('durationMin')}
                    {...examForm.getInputProps('durationMin')}
                  />
                )}
                <NumberInput
                  label="Số câu hỏi rút ngẫu nhiên (Tùy chọn)"
                  description="Nếu điền, mỗi sinh viên sẽ được bốc ngẫu nhiên số câu này từ đề. Nếu để trống, sinh viên làm tất cả câu hỏi trong đề."
                  size="sm"
                  min={1}
                  disabled={isEditMode}
                  key={examForm.key('dynamicNumQuestions')}
                  {...examForm.getInputProps('dynamicNumQuestions')}
                />
                </>
                )}
                <Select
                  label="Loại kỳ thi"
                  size="sm"
                  disabled={isEditMode}
                  value={examCategory}
                  onChange={(v) => {
                    const cat = (v ?? 'midterm') as 'midterm' | 'final' | 'practice';
                    setExamCategory(cat);
                    if (cat !== 'practice') setReviewModeDetailed(false);
                  }}
                  data={[
                    { value: 'midterm', label: '🎓 Thi Giữa Kỳ' },
                    { value: 'final', label: '🏁 Thi Cuối Kỳ' },
                    { value: 'practice', label: '📝 Thi Thử (Ôn tập)' },
                  ]}
                />

                {examCategory === 'practice' && (
                  <Radio.Group
                    label="Cấu hình kết quả sau khi thi"
                    description="Sinh viên sẽ thấy gì sau khi nộp bài thi thử?"
                    size="sm"
                    value={reviewModeDetailed ? 'detailed' : 'score_only'}
                    onChange={(v) => setReviewModeDetailed(v === 'detailed')}
                  >
                    <Stack gap={6} mt="xs">
                      <Radio value="score_only" label="Chỉ hiển thị điểm số" />
                      <Radio value="detailed" label="Hiển thị điểm + Chi tiết bài làm (đáp án đúng/sai)" />
                    </Stack>
                  </Radio.Group>
                )}

                {examCategory !== 'practice' && (
                  <Text size="xs" c="dimmed" fs="italic">
                    ⚠️ Thi giữa kỳ và cuối kỳ luôn ẩn đáp án chi tiết sau khi thi để bảo mật đề.
                  </Text>
                )}

                <Switch
                  label="Bắt buộc thi bằng phần mềm Safe Exam Browser (SEB)"
                  description="Sinh viên chỉ có thể mở đề thi bằng trình duyệt chống gian lận SEB. Không thể mở bằng Chrome/Edge/Cốc Cốc."
                  size="sm"
                  color="red"
                  key={examForm.key('requireSeb')}
                  {...examForm.getInputProps('requireSeb', { type: 'checkbox' })}
                />

                <Textarea
                  label={t('exam_authoring.description_label')}
                  size="sm"
                  minRows={2}
                  placeholder={t('exam_authoring.description_placeholder')}
                  key={examForm.key('description')}
                  {...examForm.getInputProps('description')}
                />
              </Stack>
            </Collapse>
          </Paper>

          {examForm.getValues().exam_type !== 'essay' && (
            <>
              <ExamQuestionBankPicker
            subjectId={selectedSubjectId}
            subjectLabel={subjectLabel}
            versionCode={versionCodeForIndex(0)}
            alreadyLinkedBankIds={bankLinkedIds}
            onAddQuestions={handleAddFromBank}
          />

          {/* Import từ Word */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <Box style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '10px 16px' }}>
              <Group gap="xs">
                <IconFileWord size={14} color="white" />
                <Text size="sm" fw={600} c="white">
                  Import câu hỏi từ Word
                </Text>
              </Group>
            </Box>
            <Stack gap="xs" p="sm">

              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  {t('exam_authoring.word_import_tags_label')}{' '}
                  <code>[LOAI:TN]</code> <code>[DIEM:0.5]</code> <code>[KHO:DE]</code>
                </Text>
                <Text size="xs" c="dimmed">
                  {t('exam_authoring.word_import_tags_example')}
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  leftSection={<IconFileWord size={12} />}
                  onClick={() => examApi.downloadWordImportTemplate().catch(() => {})}
                >
                  {t('exam_authoring.word_import_download_template')}
                </Button>
              </Stack>
              <Dropzone
                onDrop={(files) => setVersionFile(0, files[0] ?? null)}
                accept={[MIME_TYPES.docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']}
                maxFiles={1}
                radius="md"
                p="xs"
              >
                <Group justify="center" gap="xs" mih={50} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <IconUpload size={20} color="var(--mantine-color-teal-6)" />
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <IconX size={20} color="var(--mantine-color-red-6)" />
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <IconFileWord size={20} color="var(--mantine-color-gray-5)" />
                  </Dropzone.Idle>
                  <div>
                    <Text size="xs" c="dimmed" ta="center">
                      {file ? file.name : t('exam_authoring.dropzone_hint')}
                    </Text>
                    {file && (
                      <Text size="xs" c="teal" ta="center">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </Text>
                    )}
                  </div>
                </Group>
              </Dropzone>
              <FileInput
                size="xs"
                label="ZIP media (tùy chọn)"
                placeholder={
                  versionMediaArchives[0]?.name ?? 'Chọn .zip chứa ảnh/audio/video nếu có'
                }
                accept=".zip,application/zip"
                value={versionMediaArchives[0]}
                clearable
                onChange={(next) => setVersionMediaArchive(0, next)}
              />
              <Group gap="xs">
                <Button size="xs" variant="light" leftSection={<IconFileWord size={12} />} loading={loading} onClick={previewWord} disabled={!file}>
                  {t('exam_authoring.btn_preview')}
                </Button>
                <Button size="xs" variant="light" color="violet" disabled={!preview || !file} onClick={applyPreviewQuestions}>
                  {t('exam_authoring.btn_import')}
                </Button>
              </Group>
              {preview && (
                <Group gap="xs">
                  <Badge color="blue" size="sm">{preview.questions.length} {t('exam_authoring.questions')}</Badge>
                  {preview.parse_summary && preview.parse_summary.needs_review > 0 && (
                    <Badge color="orange" size="sm">{t('exam_authoring.needs_review', { count: preview.parse_summary.needs_review })}</Badge>
                  )}
                  {preview.warnings.length > 0 && (
                    <Badge color="yellow" size="sm">{preview.warnings.length} lưu ý</Badge>
                  )}
                  {preview.errors.map((item, i) => (
                    <Text key={i} size="xs" c="red">{item}</Text>
                  ))}
                  {preview.warnings.map((item, i) => (
                    <Text key={`warning-${i}`} size="xs" c="orange">{item}</Text>
                  ))}
                </Group>
              )}
              {file && questions.length === 0 && !preview && (
                <Text size="xs" c="orange">
                  {t('exam_authoring.file_selected_not_imported', {
                    code: versionCodeForIndex(0),
                  })}
                </Text>
              )}
              
            </Stack>
          </Paper>
            </>
          )}
        </Stack>

        {/* RIGHT COLUMN — Question list (tự mở rộng) */}
        {examForm.getValues().exam_type !== 'essay' && (
        <Box style={{ flex: '1 1 500px', minWidth: 400 }}>

          {/* Empty state */}
          {currentQuestions.length === 0 && (
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              <Box style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', padding: '14px 20px' }}>
                <Text size="sm" fw={600} c="white">
                  Danh sách câu hỏi
                </Text>
              </Box>
              <Stack align="center" gap="sm" py="xl">
                <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                  <IconFileWord size={24} />
                </ThemeIcon>
                <Text fw={500} c="dimmed">
                  {isEditMode ? t('exam_authoring.empty_edit') : t('exam_authoring.empty_create')}
                </Text>
                <Text size="sm" c="dimmed" ta="center" maw={360}>
                  {t('exam_authoring.empty_version_desc', { code: versionCodeForIndex(0) })}
                </Text>

              </Stack>
            </Paper>
          )}

          {/* Questions cards */}
          {currentQuestions.length > 0 && (
            <Stack gap="sm">
              {currentQuestions.map((q, idx) => {
                const isEditing = editingQuestionId === (q.id ?? String(idx));

                return (
                  <Paper key={q.id ?? idx} radius="md" withBorder style={{ overflow: 'hidden' }}>
                    {/* Card header */}
                    <Box
                      style={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        padding: '10px 14px',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      <Group justify="space-between">
                        <Group gap="xs">
                          <Text size="xs" fw={700} c="dimmed">#{idx + 1}</Text>
                          <Badge variant="light" size="sm" color={q.question_type === 'msq' ? 'violet' : q.question_type === 'fib' ? 'orange' : 'teal'}>
                            {q.question_type === 'msq' ? 'MSQ' : q.question_type === 'fib' ? 'FIB' : t('exam_authoring.mcq')}
                          </Badge>
                          <Badge size="xs" variant="outline" color="gray">{q.points} {t('exam_authoring.points')}</Badge>
                        </Group>
                        <Group gap={4}>
                          {q.correct_answer && (Array.isArray(q.correct_answer) ? q.correct_answer.length > 0 : typeof q.correct_answer === 'string') && (
                            <Badge size="xs" color="green" variant="light">{t('exam_authoring.correct_answer')}: {Array.isArray(q.correct_answer) ? q.correct_answer.join(', ') : q.correct_answer}</Badge>
                          )}
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="teal"
                            onClick={() => startEditQuestion(q, idx)}
                          >
                            <IconEdit size={12} />
                          </ActionIcon>
                          <ActionIcon
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={() => deleteQuestion(idx)}
                          >
                            <IconTrash size={12} />
                          </ActionIcon>
                        </Group>
                      </Group>
                    </Box>

                    {/* Card body */}
                    <Box p="sm">
                      {isEditing ? (
                        <Stack gap="xs" key={editingQuestionId ?? idx}>
                          <Textarea
                            label={t('exam_authoring.form_content_label')}
                            size="sm"
                            minRows={2}
                            key={questionEditForm.key('content')}
                            {...questionEditForm.getInputProps('content')}
                          />
                          <Group grow>
                            <NumberInput
                              label={t('exam_authoring.form_points')}
                              size="sm"
                              min={0.5}
                              step={0.5}
                              key={questionEditForm.key('points')}
                              {...questionEditForm.getInputProps('points')}
                            />
                            <Select
                              label={t('exam_authoring.form_type')}
                              size="sm"
                              data={[
                                { value: 'mcq', label: t('exam_authoring.mcq', 'Trắc nghiệm 1 đáp án (MCQ)') },
                                { value: 'msq', label: 'Trắc nghiệm nhiều đáp án (MSQ)' },
                                { value: 'fib', label: 'Điền từ vào chỗ trống (FIB)' },
                              ]}
                              disabled={false}
                              key={questionEditForm.key('question_type')}
                              {...questionEditForm.getInputProps('question_type')}
                              onChange={(v) => {
                                questionEditForm.setFieldValue('question_type', v as 'mcq' | 'msq' | 'fib');
                                questionEditForm.setFieldValue('correct_answer', []);
                              }}
                            />
                            {['mcq', 'msq'].includes(questionEditForm.getValues().question_type) && (
                              <MultiSelect
                                label={t('exam_authoring.form_correct_answer')}
                                size="sm"
                                data={[
                                  { value: 'A', label: 'A' },
                                  { value: 'B', label: 'B' },
                                  { value: 'C', label: 'C' },
                                  { value: 'D', label: 'D' },
                                ]}
                                maxValues={questionEditForm.getValues().question_type === 'mcq' ? 1 : undefined}
                                key={questionEditForm.key('correct_answer')}
                                {...questionEditForm.getInputProps('correct_answer')}
                              />
                            )}
                            {questionEditForm.getValues().question_type === 'fib' && (
                              <TextInput
                                label="Đáp án đúng"
                                placeholder="Cách nhau bằng dấu phẩy nếu nhiều đáp án được chấp nhận"
                                size="sm"
                                value={(questionEditForm.getValues().correct_answer || []).join(', ')}
                                onChange={(e) => {
                                  const val = e.currentTarget.value;
                                  const arr = val.split(',').map(s => s.trim()).filter(Boolean);
                                  questionEditForm.setFieldValue('correct_answer', arr);
                                }}
                              />
                            )}
                          </Group>
                          {['mcq', 'msq'].includes(questionEditForm.getValues().question_type) && (
                            <>
                              <Text size="xs" fw={600} c="dimmed">{t('exam_authoring.form_options')}</Text>
                              {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                <Group key={opt} gap="xs" align="flex-start">
                                  <Text size="xs" fw={700} c="dimmed" style={{ minWidth: 16, paddingTop: 6 }}>{opt}.</Text>
                                  <TextInput
                                    size="xs"
                                    style={{ flex: 1 }}
                                    placeholder={t('exam_authoring.form_option_placeholder', { key: opt })}
                                    key={questionEditForm.key(`option${opt}` as keyof QuestionEditFormValues)}
                                    {...questionEditForm.getInputProps(`option${opt}` as keyof QuestionEditFormValues)}
                                  />
                                </Group>
                              ))}
                            </>
                          )}
                          <Divider label={t('exam_authoring.media_label')} labelPosition="left" my="xs" />
                          <FileInput
                            label={t('exam_authoring.media_upload_label')}
                            description={t('exam_authoring.media_upload_desc')}
                            size="sm"
                            accept="image/*,audio/*,video/*"
                            clearable
                            disabled={mediaUploadLoading}
                            onChange={(f) => void handleEditMediaFile(f)}
                          />
                          {mediaUploadLoading && (
                            <Text size="xs" c="dimmed">{t('exam_authoring.uploading')}</Text>
                          )}
                          {mediaUploadError && (
                            <Text size="xs" c="red">{mediaUploadError}</Text>
                          )}
                          {questionEditForm.getValues().media_url && (
                            <Group gap="xs" align="flex-end">
                              <Button size="xs" variant="light" color="red" onClick={clearEditMedia}>
                                {t('exam_authoring.remove_media')}
                              </Button>
                            </Group>
                          )}
                          {questionEditForm.getValues().media_url && (
                            <AuthoringMediaPreview url={questionEditForm.getValues().media_url!} />
                          )}
                          <Group gap="xs" justify="flex-end">
                            <Button size="xs" variant="default" onClick={cancelEditQuestion}>{t('common.cancel')}</Button>
                            <Button size="xs" color="teal" onClick={() => saveEditQuestion(idx)}>{t('common.save')}</Button>
                          </Group>
                        </Stack>
                      ) : (
                        <>
                          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }} mb="xs">{q.content}</Text>
                          {mediaUrlFromQuestion(q) && (
                            <Box mb="sm" p="xs" style={{ background: '#f8fafc', borderRadius: 8 }}>
                              <Text size="xs" fw={600} c="dimmed" mb={6}>{t('exam_authoring.media')}</Text>
                              <AuthoringMediaPreview url={mediaUrlFromQuestion(q)!} />
                            </Box>
                          )}
                          {q.question_type === 'mcq' && q.options && (
                            <Stack gap={2} pl="sm">
                              {['A', 'B', 'C', 'D'].map((opt) =>
                                q.options?.[opt] ? (
                                  <Group key={opt} gap="xs">
                                    <Text size="xs" fw={700} c="dimmed">{opt}.</Text>
                                    <Text size="xs">{q.options[opt]}</Text>
                                    {((Array.isArray(q.correct_answer) && q.correct_answer.includes(opt)) || (typeof q.correct_answer === 'string' && q.correct_answer.toUpperCase() === opt)) && (
                                      <Badge color="green" size="xs" variant="filled">{t('exam_authoring.correct_answer')}</Badge>
                                    )}
                                  </Group>
                                ) : null
                              )}
                            </Stack>
                          )}
                        </>
                      )}
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </Box>
        )}
      </Group>

      {verifyOpened && preview && (
        <ExamImportPreviewModal
          preview={preview}
          mediaArchive={versionMediaArchives[0]}
          onConfirm={handleVerifyConfirm}
          onClose={() => setVerifyOpened(false)}
        />
      )}
    </Box>
  );
}