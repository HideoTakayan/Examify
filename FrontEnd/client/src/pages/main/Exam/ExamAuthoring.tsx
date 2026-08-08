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
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  ThemeIcon,
  FileInput,
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
  numVersions: string;
};

type QuestionEditFormValues = {
  content: string;
  points: number;
  question_type: 'mcq' | 'essay';
  correct_answer: string;
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
  const { user } = useAuth();
  const [adminClass, setAdminClass] = useState<AdminClassDto | null>(null);
  const pickerCatalogOptions =
    user?.role === 'admin' && adminClass?.id ? { adminClassId: adminClass.id } : undefined;
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
      numVersions: '2',
    },
  });
  const questionEditForm = useForm<QuestionEditFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      content: '',
      points: 1,
      question_type: 'mcq',
      correct_answer: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      media_url: null,
    },
  });
  const [questions, setQuestions] = useState<AuthoringQuestion[]>([]);
  const [numVersionsCount, setNumVersionsCount] = useState(2);
  const [activeVersion, setActiveVersion] = useState(0);
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
          mineClass = await adminClassApi.getMine();
        } catch {
          const list = await adminClassApi.getClasses();
          mineClass =
            list.find((c) => c.display_name.includes('16-02')) ?? list[0] ?? null;
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
            numVersions: String(Math.min(MAX_EXAM_VERSIONS, Math.max(1, existingExam.num_versions ?? 2))),
          };
        });
        if (existingExam) {
          setNumVersionsCount(
            Math.min(MAX_EXAM_VERSIONS, Math.max(1, existingExam.num_versions ?? 2))
          );
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
  }, [examId, pickerSubjects, t]);

  const numVersions = numVersionsCount;

  const versionCodes = useMemo(
    () => Array.from({ length: numVersions }, (_, i) => versionCodeForIndex(i)),
    [numVersions]
  );

  const file = versionFiles[activeVersion];
  const preview = versionPreviews[activeVersion];

  const handleNumVersionsChange = (nextRaw: string | null) => {
    const next = Math.min(MAX_EXAM_VERSIONS, Math.max(1, Number(nextRaw) || 1));
    setNumVersionsCount(next);
    examForm.setFieldValue('numVersions', String(next));
    setActiveVersion((prev) => Math.min(prev, next - 1));
    setQuestions((prev) => prev.filter((q) => (q.version_index ?? 0) < next));
    setEditingQuestionId(null);
  };

  const currentQuestions = useMemo(
    () => questions.filter((q) => (q.version_index ?? 0) === activeVersion),
    [questions, activeVersion]
  );

  const versionCounts = useMemo(() => {
    const counts = Array.from({ length: numVersions }, () => 0);
    for (const q of questions) {
      const v = q.version_index ?? 0;
      if (v >= 0 && v < numVersions) counts[v] += 1;
    }
    return counts;
  }, [questions, numVersions]);

  const versionSummaryText = useMemo(() => {
    const parts = versionCodes.map((code, i) => `${code}: ${versionCounts[i]} câu`);
    const allOk = versionCounts.every((c) => c > 0);
    return allOk ? `${parts.join(' · ')} — ${t('exam_authoring.version_summary_ok')}` : parts.join(' · ');
  }, [versionCodes, versionCounts, t]);

  const versionSegmentData = useMemo(
    () =>
      versionCodes.map((code, i) => ({
        label: `${code} (${versionCounts[i]})`,
        value: String(i),
      })),
    [versionCodes, versionCounts]
  );

  const subjectLabel = useMemo(() => {
    if (!selectedSubjectId) return '';
    const subject = pickerSubjects.find((s) => s.id === selectedSubjectId);
    return subject ? formatSubjectLabel(subject) : '';
  }, [selectedSubjectId, pickerSubjects]);

  const bankLinkedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.question_bank_id && (q.version_index ?? 0) === activeVersion) {
        ids.add(q.question_bank_id);
      }
    }
    return ids;
  }, [questions, activeVersion]);

  const handleAddFromBank = (picked: BankPickTarget[]) => {
    if (!picked.length) return;
    const mapped: AuthoringQuestion[] = picked.map((p) => ({
      content: p.content,
      question_type: p.question_type,
      points: p.points,
      options: p.options,
      correct_answer: p.correct_answer,
      display_order: 0,
      version_index: activeVersion,
      question_bank_id: p.question_bank_id,
      difficulty: p.difficulty,
      chapter: p.chapter ?? undefined,
      answer_hint: p.answer_hint ?? null,
    }));
    setQuestions((prev) => normalizeQuestions([...prev, ...mapped]));
    setNotice(
      t('exam_authoring.question_bank_added', {
        count: mapped.length,
        code: versionCodeForIndex(activeVersion),
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

  const copyQuestionsFromVersion = (fromVersion: number) => {
    const source = questions.filter((q) => (q.version_index ?? 0) === fromVersion);
    if (!source.length) return;
    const copied = source.map((q) => {
      const { id: _id, ...rest } = q;
      return { ...rest, version_index: activeVersion };
    });
    setQuestions((prev) => {
      const kept = prev.filter((q) => (q.version_index ?? 0) !== activeVersion);
      return normalizeQuestions([...kept, ...copied]);
    });
    setNotice(
      t('exam_authoring.notice_copied_version', {
        count: copied.length,
        from: versionCodeForIndex(fromVersion),
        to: versionCodeForIndex(activeVersion),
      })
    );
    setError('');
  };

  const otherVersionWithQuestions = useMemo(() => {
    for (let i = 0; i < numVersions; i += 1) {
      if (i !== activeVersion && versionCounts[i] > 0) return i;
    }
    return -1;
  }, [activeVersion, numVersions, versionCounts]);

  const normalizeQuestions = (items: AuthoringQuestion[]) => {
    const next = items.map((item) => ({ ...item }));
    for (let v = 0; v < numVersions; v += 1) {
      let order = 1;
      for (const item of next) {
        if ((item.version_index ?? 0) === v) {
          item.display_order = order;
          order += 1;
        }
      }
    }
    return next;
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
      const data = await examApi.previewWordImport(file, versionMediaArchives[activeVersion]);
      setVersionPreview(activeVersion, data);
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
      version_index: activeVersion,
      media_url: q.media?.url ?? q.media_url ?? null,
    }));
    setQuestions((prev) => {
      const kept = prev.filter((q) => (q.version_index ?? 0) !== activeVersion);
      return normalizeQuestions([...kept, ...mapped]);
    });
    setNotice(
      t('exam_authoring.notice_confirmed', { count: verifiedQuestions.length }) +
        ` (${versionCodeForIndex(activeVersion)})`
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
      question_type: q.question_type,
      correct_answer: typeof q.correct_answer === 'string' ? q.correct_answer : '',
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
    const { title, description, durationMin: durationMinRaw, opensAt, endsAt, adminClassId, subjectId } = examForm.getValues();
    const durationMin = durationMinRaw;
    if (
      !title.trim() ||
      !adminClassId ||
      !subjectId ||
      (!hasValidSchedule && (!Number.isFinite(Number(durationMin)) || Number(durationMin) <= 0))
    ) {
      setError(t('exam_authoring.error_fill_required'));
      return;
    }
    for (let v = 0; v < numVersions; v += 1) {
      if (versionCounts[v] === 0) {
        setActiveVersion(v);
        const summary = versionCodes.map((code, i) => `${code}: ${versionCounts[i]} câu`).join(', ');
        setError(
          t('exam_authoring.error_need_version_questions', { version: versionCodeForIndex(v) }) +
            ' ' +
            t('exam_authoring.error_need_version_questions_hint', { summary })
        );
        return;
      }
    }
    if ((opensAt && !endsAt) || (!opensAt && endsAt)) {
      setError(t('exam_authoring.error_schedule_incomplete'));
      return;
    }
    if (opensAt && endsAt && new Date(opensAt).getTime() >= new Date(endsAt).getTime()) {
      setError(t('exam_authoring.error_schedule_order'));
      return;
    }

    const duration = hasValidSchedule
      ? computedScheduleDuration!
      : Number(durationMin);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError(t('exam_authoring.error_fill_required'));
      return;
    }

    const schedulePayload = {
      opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (examId) {
        await examApi.updateExam(examId, {
          title: title.trim(),
          duration_min: Math.floor(duration),
          description: description.trim() || null,
          ...schedulePayload,
          num_versions: numVersions,
        });
        const ordered = normalizeQuestions(questions);
        const existing = ordered.filter((q): q is AuthoringQuestion & { id: string } => Boolean(q.id));
        const newQuestions = ordered.filter((question) => !question.id);

        for (const question of existing) {
          await examApi.updateQuestion(examId, question.id, {
            content: question.content,
            question_type: question.question_type,
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
            question_type: question.question_type,
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
        title: title.trim(),
        admin_class_id: adminClassId,
        subject_id: subjectId,
        duration_min: Math.floor(duration),
        description: description.trim() || null,
        ...schedulePayload,
        num_versions: numVersions,
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
                <Select
                  label={t('exam_authoring.num_versions_label')}
                  description={t('exam_authoring.num_versions_desc')}
                  size="sm"
                  allowDeselect={false}
                  disabled={isEditMode}
                  data={[1, 2, 3, 4].map((n) => ({
                    value: String(n),
                    label: t('exam_authoring.num_versions_option', { count: n }),
                  }))}
                  value={String(numVersionsCount)}
                  onChange={(value) => handleNumVersionsChange(value)}
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

          <ExamQuestionBankPicker
            subjectId={selectedSubjectId}
            subjectLabel={subjectLabel}
            versionCode={versionCodeForIndex(activeVersion)}
            alreadyLinkedBankIds={bankLinkedIds}
            onAddQuestions={handleAddFromBank}
          />

          {/* Import từ Word */}
          <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
            <Box style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '10px 16px' }}>
              <Group gap="xs">
                <IconFileWord size={14} color="white" />
                <Text size="sm" fw={600} c="white">
                  {t('exam_authoring.import_for_version', { code: versionCodeForIndex(activeVersion) })}
                </Text>
              </Group>
            </Box>
            <Stack gap="xs" p="sm">
              {numVersions > 1 && (
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={String(activeVersion)}
                  onChange={(v) => {
                    setActiveVersion(Number(v));
                    setEditingQuestionId(null);
                  }}
                  data={versionSegmentData}
                />
              )}
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
                onDrop={(files) => setVersionFile(activeVersion, files[0] ?? null)}
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
                  versionMediaArchives[activeVersion]?.name ?? 'Chọn .zip chứa ảnh/audio/video nếu có'
                }
                accept=".zip,application/zip"
                value={versionMediaArchives[activeVersion]}
                clearable
                onChange={(next) => setVersionMediaArchive(activeVersion, next)}
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
              {file && versionCounts[activeVersion] === 0 && !preview && (
                <Text size="xs" c="orange">
                  {t('exam_authoring.file_selected_not_imported', {
                    code: versionCodeForIndex(activeVersion),
                  })}
                </Text>
              )}
              <Text size="xs" c={versionCounts.every((c) => c > 0) ? 'teal' : 'dimmed'}>
                {versionSummaryText}
              </Text>
            </Stack>
          </Paper>
        </Stack>

        {/* RIGHT COLUMN — Questions list (main content) */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {numVersions > 1 && (
            <SegmentedControl
              mb="sm"
              value={String(activeVersion)}
              onChange={(v) => {
                setActiveVersion(Number(v));
                setEditingQuestionId(null);
              }}
              data={versionSegmentData}
            />
          )}
          {/* Empty state */}
          {currentQuestions.length === 0 && (
            <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
              <Box style={{ background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)', padding: '14px 20px' }}>
                <Text size="sm" fw={600} c="white">
                  {t('exam_authoring.question_list_for_version', { code: versionCodeForIndex(activeVersion) })}
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
                  {t('exam_authoring.empty_version_desc', { code: versionCodeForIndex(activeVersion) })}
                </Text>
                {otherVersionWithQuestions >= 0 && (
                  <Button
                    size="sm"
                    variant="light"
                    color="teal"
                    onClick={() => copyQuestionsFromVersion(otherVersionWithQuestions)}
                  >
                    {t('exam_authoring.btn_copy_from_version', {
                      code: versionCodeForIndex(otherVersionWithQuestions),
                      count: versionCounts[otherVersionWithQuestions],
                    })}
                  </Button>
                )}
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
                          <Badge
                            color={q.question_type === 'mcq' ? 'blue' : 'grape'}
                            size="sm"
                            variant="light"
                          >
                            {q.question_type === 'mcq' ? t('exam_authoring.mcq') : t('exam_authoring.essay')}
                          </Badge>
                          <Badge size="xs" variant="outline" color="gray">{q.points} {t('exam_authoring.points')}</Badge>
                        </Group>
                        <Group gap={4}>
                          {q.correct_answer && typeof q.correct_answer === 'string' && (
                            <Badge size="xs" color="green" variant="light">{t('exam_authoring.correct_answer')}: {q.correct_answer}</Badge>
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
                                { value: 'mcq', label: t('exam_authoring.mcq') },
                                { value: 'essay', label: t('exam_authoring.essay') },
                              ]}
                              key={questionEditForm.key('question_type')}
                              {...questionEditForm.getInputProps('question_type')}
                            />
                            {questionEditForm.getValues().question_type === 'mcq' && (
                              <Select
                                label={t('exam_authoring.form_correct_answer')}
                                size="sm"
                                data={[
                                  { value: 'A', label: 'A' },
                                  { value: 'B', label: 'B' },
                                  { value: 'C', label: 'C' },
                                  { value: 'D', label: 'D' },
                                ]}
                                key={questionEditForm.key('correct_answer')}
                                {...questionEditForm.getInputProps('correct_answer')}
                              />
                            )}
                          </Group>
                          {questionEditForm.getValues().question_type === 'mcq' && (
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
                                    {typeof q.correct_answer === 'string' && q.correct_answer.toUpperCase() === opt && (
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
      </Group>

      {verifyOpened && preview && (
        <ExamImportPreviewModal
          preview={preview}
          mediaArchive={versionMediaArchives[activeVersion]}
          onConfirm={handleVerifyConfirm}
          onClose={() => setVerifyOpened(false)}
        />
      )}
    </Box>
  );
}