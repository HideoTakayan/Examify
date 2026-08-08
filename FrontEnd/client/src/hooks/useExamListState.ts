import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import examApi, { type Exam, type ExamSession, type ForceSubmitSummary } from '@/services/examApi';

type StatusFilter = 'all' | 'not_done' | 'done';

export function useExamListState(opts: {
  isStaff: boolean;
  t: (key: string, options?: any) => string;
}) {
  const { isStaff, t } = opts;
  const location = useLocation();
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [activeSessionCountByExam, setActiveSessionCountByExam] = useState<Record<string, number>>({});
  const [runtimeActiveByExam, setRuntimeActiveByExam] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [startingExamId, setStartingExamId] = useState<string | null>(null);
  const [updatingExamId, setUpdatingExamId] = useState<string | null>(null);
  const [forceSubmittingExamId, setForceSubmittingExamId] = useState<string | null>(null);
  const [retakeGrantExamIds, setRetakeGrantExamIds] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetSearchText = (value: string) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 350);
  };

  const loadExams = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setNotice('');

      const fetchedExams = await examApi.getExams(undefined, undefined, {
        cnttProgramOnly: true,
      });
      setExams(fetchedExams);
      setRuntimeActiveByExam(
        Object.fromEntries(
          fetchedExams.map((exam) => [exam.id, Boolean(exam.runtime_is_active)])
        )
      );
      if (isStaff) {
        setSessions([]);
        const entries = await Promise.all(
          fetchedExams.map(async (exam) => {
            try {
              const examSessions = await examApi.getExamSessions(exam.id);
              const activeCount = examSessions.filter(
                (s) => s.status === 'active' && !s.voided_at
              ).length;
              return [exam.id, activeCount] as const;
            } catch {
              return [exam.id, 0] as const;
            }
          })
        );
        setActiveSessionCountByExam(Object.fromEntries(entries));
      } else {
        const [mySessions, myRetakes] = await Promise.all([
          examApi.getMySessions(),
          examApi.getMyRetakeGrants(),
        ]);
        setSessions(mySessions);
        setRetakeGrantExamIds(new Set(myRetakes.map((g) => g.exam_id)));
        setActiveSessionCountByExam({});
      }
    } catch {
      setError(t('errors.exam_list_failed'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isStaff, t]);

  useEffect(() => {
    if (location.pathname !== '/exams') return;
    void loadExams();
  }, [loadExams, location.pathname]);

  /** Phiên submitted (nếu có) — ưu tiên hơn phiên active mới hơn theo started_at */
  const submittedSessionByExam = useMemo(() => {
    const byExam = new Map<string, ExamSession>();
    for (const s of sessions) {
      if (s.status !== 'submitted' || s.voided_at) continue;
      const prev = byExam.get(s.exam_id);
      const sAt = new Date(s.submitted_at ?? s.started_at).getTime();
      const prevAt = prev ? new Date(prev.submitted_at ?? prev.started_at).getTime() : 0;
      if (!prev || sAt > prevAt) byExam.set(s.exam_id, s);
    }
    return byExam;
  }, [sessions]);

  const latestSessionByExam = useMemo(() => {
    const byExam = new Map<string, ExamSession>();
    for (const s of sessions) {
      const prev = byExam.get(s.exam_id);
      if (!prev) {
        byExam.set(s.exam_id, s);
        continue;
      }
      if (prev.status === 'active' && s.status === 'submitted') {
        byExam.set(s.exam_id, s);
        continue;
      }
      if (prev.status === 'submitted' && s.status === 'active') continue;
      const prevAt = new Date(prev.submitted_at ?? prev.started_at).getTime();
      const sAt = new Date(s.submitted_at ?? s.started_at).getTime();
      if (sAt > prevAt) byExam.set(s.exam_id, s);
    }
    return byExam;
  }, [sessions]);

  const hasSubmitted = useCallback(
    (examId: string) => submittedSessionByExam.has(examId),
    [submittedSessionByExam]
  );

  const hasRetakeGrant = useCallback(
    (examId: string) => retakeGrantExamIds.has(examId),
    [retakeGrantExamIds]
  );

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const matchesText = exam.title.toLowerCase().includes(searchText.toLowerCase());
      const inProgress =
        Boolean(runtimeActiveByExam[exam.id]) || (activeSessionCountByExam[exam.id] ?? 0) > 0;
      const status = isStaff
        ? inProgress
          ? 'not_done'
          : 'done'
        : submittedSessionByExam.has(exam.id)
          ? 'done'
          : 'not_done';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [activeSessionCountByExam, exams, isStaff, runtimeActiveByExam, searchText, statusFilter, submittedSessionByExam]);

  const doneCount = useMemo(() => {
    if (isStaff) {
      return exams.filter((exam) => {
        const inProgress =
          Boolean(runtimeActiveByExam[exam.id]) || (activeSessionCountByExam[exam.id] ?? 0) > 0;
        return !inProgress;
      }).length;
    }
    return submittedSessionByExam.size;
  }, [activeSessionCountByExam, exams, isStaff, runtimeActiveByExam, submittedSessionByExam]);

  const handleForceSubmit = async (examId: string) => {
    const ok = window.confirm(t('exam_list.force_submit_confirm'));
    if (!ok) return;

    setForceSubmittingExamId(examId);
    setError('');

    try {
      const summary: ForceSubmitSummary = await examApi.forceSubmitExam(examId);
      setRuntimeActiveByExam((prev) => ({ ...prev, [examId]: false }));
      setActiveSessionCountByExam((prev) => ({
        ...prev,
        [examId]: 0,
      }));
      setNotice(
        t('exam_list.force_submit_done', {
          active: summary.active_sessions,
          submitted: summary.submitted_sessions,
          failed: summary.failed_sessions,
        })
      );
    } catch {
      setError(t('errors.exam_force_submit_failed'));
    } finally {
      setForceSubmittingExamId(null);
    }
  };

  const handleStartExam = async (exam: Exam) => {
    const ok = window.confirm(`Start bài thi "${exam.title}" trong ${exam.duration_min} phút?`);
    if (!ok) return;

    setStartingExamId(exam.id);
    setError('');
    try {
      await examApi.startExamRuntime(exam.id);
      setRuntimeActiveByExam((prev) => ({ ...prev, [exam.id]: true }));
      setNotice(`Đã bắt đầu bài thi "${exam.title}" (${exam.duration_min} phút). Sinh viên có thể vào làm bài.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Start bài thi thất bại.';
      setError(message);
    } finally {
      setStartingExamId(null);
    }
  };

  const handleUpdateDuration = async (exam: Exam) => {
    const raw = window.prompt('Nhập thời gian làm bài (phút):', String(exam.duration_min));
    if (raw == null) return;
    const duration = Number(raw);
    if (!Number.isFinite(duration) || duration <= 0 || duration > 300) {
      setError('Thời gian thi phải từ 1 đến 300 phút.');
      return;
    }

    setUpdatingExamId(exam.id);
    setError('');
    try {
      const updated = await examApi.updateExam(exam.id, { duration_min: Math.floor(duration) });
      setExams((prev) => prev.map((item) => (item.id === exam.id ? updated : item)));
      setNotice(`Đã cập nhật thời gian "${updated.title}" thành ${updated.duration_min} phút.`);
    } catch {
      setError('Cập nhật thời gian thi thất bại.');
    } finally {
      setUpdatingExamId(null);
    }
  };

  return {
    exams,
    loading,
    error,
    notice,
    searchText,
    setSearchText: handleSetSearchText,
    statusFilter,
    setStatusFilter,
    startingExamId,
    updatingExamId,
    forceSubmittingExamId,
    latestSessionByExam,
    submittedSessionByExam,
    hasSubmitted,
    hasRetakeGrant,
    activeSessionCountByExam,
    runtimeActiveByExam,
    filteredExams,
    doneCount,
    handleStartExam,
    handleUpdateDuration,
    handleForceSubmit,
  };
}
