import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Stack, Text, Alert } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconArrowLeft, IconArrowRight, IconArrowsMaximize } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import type { Socket } from 'socket.io-client';
import { ExamTakeHeader } from '@/components/ExamTake/ExamTakeHeader';
import { ExamQuestionPanel } from '@/components/ExamTake/ExamQuestionPanel';
import { QuestionNavigator } from '@/components/ExamTake/QuestionNavigator';
import { isQuestionAnswered } from '@/components/ExamTake/isQuestionAnswered';
import type { MockExamQuestion } from '@/components/ExamTake/types';
import appConfig from '@/configs/app.config';
import examApi, {
  type Exam,
  type SubmitResult,
} from '@/services/examApi';
import {
  formatCountdownHms,
  getExamScheduleParts,
  isBeforeExamOpens,
  msUntilOpensAt,
} from '@/utils/examDeadline';
import { formatExamScore } from '@/utils/formatExamScore';
import { useExamTakeState } from '@/hooks/useExamTakeState';
import useAuth from '@/hooks/useAuth';
import {
  flushAutosaveQueue,
  mergeDraftAnswers,
  queueAutosave,
  readDraftAnswers,
  saveDraftAnswers,
} from '@/services/examAutosaveClient';
import { flushIntegrityQueue, trackIntegrityEvent } from '@/services/examIntegrityClient';
import {
  loadStrikes,
  MAX_INTEGRITY_STRIKES,
  registerStrike,
} from '@/services/examIntegrityStrikes';
import { createExamRealtimeSocket, type ForceSubmitPayload, type ViolationConfirmedPayload } from '@/services/examRealtimeSocket';
import { shouldForceSocketPolling } from '@/utils/socketTransport';
import { formatHms, mapSessionQuestionsToUi, buildSubmitAnswers } from '@/utils/examTakeHelpers';
import { loadViolationFromStorage, saveViolationToStorage, clearViolationStorage } from '@/utils/examTakeStorage';
import { ExamTakeGateCard } from '@/components/ExamTake/ExamTakeGateCard';
import classes from '@/components/ExamTake/ExamTake.module.scss';

type RealtimeHandlers = NonNullable<Parameters<typeof createExamRealtimeSocket>[0]['handlers']>;

const ExamTake = () => {
  const { t } = useTranslation();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const activeExamId = examId ?? 'preview-exam';
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [fullscreenError, setFullscreenError] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);
  const [fsRevision, setFsRevision] = useState(0);
  /** GV đã bật thi (socket) — có thể trước khi startSession API xong */
  const [teacherRuntimeLive, setTeacherRuntimeLive] = useState(false);
  const [examSchedule, setExamSchedule] =
    useState<Pick<Exam, 'opens_at' | 'ends_at' | 'runtime_is_active' | 'require_seb'> | null>(null);
  const examScheduleRef = useRef(examSchedule);
  const [waitNowMs, setWaitNowMs] = useState(() => Date.now());
  const rootRef = useRef<HTMLDivElement>(null);
  /** P0 Fix: Grace period timer ref for fullscreen exit */
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** P0 Fix: Flag to indicate violation is being reported to server */
  const reportingViolationRef = useRef(false);
  const [integrityStrikes, setIntegrityStrikes] = useState(0);
  /** Chỉ dev: production luôn bắt fullscreen (tránh VITE_DISABLE_INTEGRITY trên Vercel). */
  const integrityDisabled =
    import.meta.env.DEV && import.meta.env.VITE_DISABLE_INTEGRITY === 'true';

  const placeholderQuestion = (n: number): MockExamQuestion => ({
    number: n,
    points: 1,
    type: 'mcq',
    prompt: t('exam_take.placeholder_prompt', { number: n }),
    options: [
      { key: 'A', label: t('exam_take.option_label', { letter: 'A' }) },
      { key: 'B', label: t('exam_take.option_label', { letter: 'B' }) },
      { key: 'C', label: t('exam_take.option_label', { letter: 'C' }) },
      { key: 'D', label: t('exam_take.option_label', { letter: 'D' }) },
    ],
  });

  const {
    examData: {
      questions,
      setQuestions,
      questionIdByNumber,
      setQuestionIdByNumber,
      examTitle,
      setExamTitle,
      examSection,
      setExamSection,
      answers,
      setAnswers,
      flagged,
      setFlagged,
      navFilter,
      setNavFilter,
      currentNumber,
      setCurrentNumber,
    },
    boot: { sessionId, setSessionId, bootLoading, setBootLoading, bootError, setBootError, versionCode, setVersionCode, setDeadlineAt },
    runtime: {
      remainingSeconds,
      setRemainingSeconds,
      examStarted,
      setExamStarted,
      realtimeMessage,
      setRealtimeMessage,
      isFullscreen,
      setIsFullscreen,
      focusLeaveCount,
      setFocusLeaveCount,
      connectionStatus,
      setConnectionStatus,
      syncServerTime,
    },
    submit: {
      autoSubmitCountdown,
      setAutoSubmitCountdown,
      autoSubmitted,
      setAutoSubmitted,
      submitting,
      setSubmitting,
      submitFailed,
      setSubmitFailed,
      serverForceSummaryText,
      setServerForceSummaryText,
    },
    integrity: { violationLocked, setViolationLocked, lockReason, setLockReason },
    refs: { remainingRef, sessionStartingRef, violationTriggeredRef, lastViolationAtRef },
  } = useExamTakeState(activeExamId);

  useEffect(() => {
    examScheduleRef.current = examSchedule;
  }, [examSchedule]);

  /** Đếm giờ mở theo lịch khi chờ vào đề */
  useEffect(() => {
    if (
      !examSchedule?.opens_at ||
      teacherRuntimeLive ||
      examStarted ||
      autoSubmitted ||
      violationLocked
    ) {
      return;
    }
    const id = window.setInterval(() => setWaitNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [examSchedule?.opens_at, teacherRuntimeLive, examStarted, autoSubmitted, violationLocked]);

  const inBrowserFullscreen = isFullscreen || Boolean(document.fullscreenElement);

  useEffect(() => {
    const saved = loadStrikes(activeExamId);
    if (sessionId && saved.sessionId === sessionId) {
      setIntegrityStrikes(saved.count);
      setFocusLeaveCount(saved.count);
    } else if (sessionId) {
      setIntegrityStrikes(0);
    }
  }, [activeExamId, sessionId, setFocusLeaveCount]);

  const byNumber = useMemo(() => new Map(questions.map((q) => [q.number, q])), [questions]);
  const resolveQuestion = (n: number): MockExamQuestion => byNumber.get(n) ?? placeholderQuestion(n);
  const total = questions.length;
  const maxQuestionIndex = Math.max(total, 1);

  const applyServerForceSubmit = useCallback(
    (payload?: ForceSubmitPayload) => {
      const serverMessage = payload?.message?.trim() || 'Hệ thống đã tự động nộp bài trên server.';

      const summary = payload?.summary;
      if (summary) {
        setServerForceSummaryText(
          `Tong phien active: ${summary.active_sessions}. Da nop: ${summary.submitted_sessions}. Loi: ${summary.failed_sessions}.`
        );
      } else {
        setServerForceSummaryText('');
      }

      setRealtimeMessage(serverMessage);
      setExamStarted(false);
      setSubmitting(false);
      setSubmitFailed(false);
      setViolationLocked(false);
      setAutoSubmitted(true);

      void flushAutosaveQueue(activeExamId);
      void flushIntegrityQueue(activeExamId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeExamId]
  );

  const submitCurrentSession = useCallback(
    async (source: 'manual' | 'auto') => {
      if (autoSubmitted || submitting) return;
      if (!sessionId) {
        setSubmitFailed(false);
        setRealtimeMessage('Hệ thống đang khởi tạo phiên thi. Vui lòng thử lại sau vài giây.');
        return;
      }

      setSubmitting(true);
      setSubmitFailed(false);

      try {
        await flushAutosaveQueue(activeExamId);
        await flushIntegrityQueue(activeExamId);

        const payload = buildSubmitAnswers(answers, questionIdByNumber, byNumber);
        const result = await examApi.submitSession(sessionId, payload);
        setSubmitResult(result);

        setRealtimeMessage(
          source === 'auto'
            ? 'Hệ thống đã nộp bài tự động thành công.'
            : 'Nộp bài thành công.'
        );
        setServerForceSummaryText('');
      } catch (error: unknown) {
        type ErrorWithStatus = { response?: { status?: number } };
        const responseStatus = (error as ErrorWithStatus)?.response?.status;
        if (source === 'auto' && (responseStatus === 400 || responseStatus === 409)) {
          setSubmitFailed(false);
          setRealtimeMessage('Phiên thi đã được hệ thống kết thúc và nộp bài trên server.');
          setServerForceSummaryText('');
        } else {
          setSubmitFailed(true);
          setRealtimeMessage('Không thể nộp bài lên server. Vui lòng liên hệ giám thị.');
          setServerForceSummaryText('');
        }
      } finally {
        setSubmitting(false);
        setAutoSubmitted(true);
        setViolationLocked(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeExamId,
      answers,
      autoSubmitted,
      byNumber,
      questionIdByNumber,
      sessionId,
      submitting,
    ]
  );

  const ensureSessionStarted = useCallback(async () => {
    if (!examId || sessionStartingRef.current) return;
    if (sessionId && questions.length > 0) {
      setExamStarted(true);
      return;
    }
    sessionStartingRef.current = true;
    setSessionLoading(true);
    try {
      const startData = await examApi.startSession(activeExamId);
      if (!startData.questions?.length) {
        throw new Error('Không có câu hỏi cho mã đề này');
      }

      const { questions: sessionQuestions, idMap } = mapSessionQuestionsToUi(startData.questions);
      setQuestions(sessionQuestions);
      setQuestionIdByNumber(idMap);
      setCurrentNumber(1);
      setSessionId(startData.session.id);
      setVersionCode(startData.version_code ?? null);

      const localDraft = readDraftAnswers(activeExamId);
      const restoredAnswers = mergeDraftAnswers(startData.autosave?.answers, localDraft);
      setAnswers(restoredAnswers);
      saveDraftAnswers(activeExamId, restoredAnswers);

      const classEndsAt =
        startData.runtime_state?.is_active && startData.runtime_state.ends_at
          ? startData.runtime_state.ends_at
          : null;
      setDeadlineAt(classEndsAt ?? startData.deadline_at ?? null);
      if (classEndsAt) {
        syncServerTime(Date.now(), classEndsAt);
      }

      setExamStarted(true);
      setBootError('');
    } catch {
      setBootError('Không thể khởi tạo phiên thi.');
      setExamStarted(false);
    } finally {
      sessionStartingRef.current = false;
      setSessionLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeExamId,
    examId,
    examId,
    questions.length,
    sessionId,
    setBootError,
    setCurrentNumber,
    setDeadlineAt,
    setExamStarted,
    setQuestionIdByNumber,
    setQuestions,
    setSessionId,
    setVersionCode,
    setAnswers,
    syncServerTime,
  ]);

  const requestFullscreen = useCallback(async () => {
    setFullscreenError('');
    const el = document.documentElement;
    const req =
      el.requestFullscreen?.bind(el) ??
      (el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> })
        .webkitRequestFullscreen?.bind(el);
    if (!req) {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', { reason: 'unsupported' });
      return;
    }
    try {
      await req();
    } catch (error) {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error', {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }, [activeExamId, t]);

  const markTeacherRuntimeLive = useCallback(() => {
    setTeacherRuntimeLive(true);
  }, []);

  const forceAutoSubmit = useCallback(() => {
    if (autoSubmitted || submitting) return;
    if (!sessionId) {
      setRealtimeMessage('Hệ thống đang khởi tạo phiên thi, chưa thể tự động nộp bài.');
      return;
    }
    void submitCurrentSession('auto');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitted, sessionId, submitting, submitCurrentSession]);

  const handlersRef = useRef<RealtimeHandlers>({});

  handlersRef.current = {
    onState: (payload) => {
      setConnectionStatus('connected');
      if (payload.status === 'started' && payload.endsAt) {
        syncServerTime(payload.serverNowMs ?? Date.now(), payload.endsAt);
        setAutoSubmitted(false);
        setSubmitFailed(false);
        setViolationLocked(false);
        setRealtimeMessage('');
        violationTriggeredRef.current = false;
        markTeacherRuntimeLive();
        void ensureSessionStarted();
      } else if (payload.status === 'not_started') {
        setTeacherRuntimeLive(false);
        setExamStarted(false);
        const sch = examScheduleRef.current;
        if (sch?.opens_at && !isBeforeExamOpens(sch)) {
          setRealtimeMessage(t('exam_take.waiting_scheduled_desc'));
        } else {
          setRealtimeMessage(t('exam_take.waiting_teacher_desc'));
        }
      } else if (payload.status === 'ended') {
        setTeacherRuntimeLive(false);
        setExamStarted(false);
        setRealtimeMessage(t('exam_take.msg_exam_ended'));
        void forceAutoSubmit();
      }
    },
    onStarted: (payload) => {
      setConnectionStatus('connected');
      syncServerTime(Date.now(), payload.endsAt);
      setAutoSubmitted(false);
      setSubmitFailed(false);
      setViolationLocked(false);
      violationTriggeredRef.current = false;
      setRealtimeMessage(t('exam_take.msg_exam_started'));
      markTeacherRuntimeLive();
      void ensureSessionStarted();
    },
    onFinal15: (payload) => {
      const msg = payload?.message?.trim() || t('exam_take.msg_final_15');
      setRealtimeMessage(msg);
      modals.open({
        centered: true,
        title: t('exam_take.modal_system_notice'),
        children: <Text size="sm">{msg}</Text>,
      });
    },
    onForceSubmit: (payload) => {
      applyServerForceSubmit(payload);
    },
    onAlert: (payload) => {
      const msg = payload?.message?.trim() || t('exam_take.msg_proctor_alert');
      setRealtimeMessage(msg);
    },
    onError: (message) => {
      setRealtimeMessage(t('exam_take.msg_realtime_error', { message }));
    },
    onDisconnect: () => {
      setConnectionStatus('disconnected');
    },
    onReconnecting: () => {
      setConnectionStatus('reconnecting');
    },
    onConnect: () => {
      setConnectionStatus('connected');
    },
    // P0 Fix: Handle server-confirmed violation
    onViolationConfirmed: (payload: ViolationConfirmedPayload) => {
      // Only process if this is for our session
      if (payload.sessionId !== sessionId) return;

      // Update sessionStorage to mark as server-confirmed
      const existingViolation = loadViolationFromStorage(activeExamId);
      if (existingViolation) {
        saveViolationToStorage(activeExamId, {
          ...existingViolation,
          serverConfirmed: true,
        });
      }

      setRealtimeMessage(payload.message);

      if (payload.autoSubmitTriggered) {
        setAutoSubmitted(true);
        setViolationLocked(false);
        clearViolationStorage(activeExamId);
      } else if (payload.sessionStatus === 'violation_locked') {
        setViolationLocked(true);
      }
    },
  };

  // P0 Fix: Enhanced triggerViolationLock - sends to server immediately
  const triggerViolationLock = useCallback(async (
    reason: string,
    violationType: 'fullscreen_exit' | 'visibility_hidden' | 'window_blur' | 'tab_switch' | 'devtools_open' | 'copy_attempt' | 'paste_attempt' | 'context_menu' | 'other' = 'other'
  ) => {
    const now = Date.now();
    if (now - lastViolationAtRef.current < 1200) return;
    lastViolationAtRef.current = now;
    if (violationTriggeredRef.current || reportingViolationRef.current) return;
    violationTriggeredRef.current = true;
    reportingViolationRef.current = true;

    // Set local state immediately for UI feedback
    setLockReason(reason);
    setAutoSubmitCountdown(5);
    setViolationLocked(true);

    // P0 Fix: Save to sessionStorage immediately (persist across reload)
    if (sessionId) {
      saveViolationToStorage(activeExamId, {
        reason,
        sessionId,
        at: now,
        violationType,
        serverConfirmed: false,
      });
    }

    // P0 Fix: Report violation to server immediately
    if (sessionId) {
      try {
        const result = await examApi.reportViolation(sessionId, {
          violation_type: violationType,
          reason,
          client_at: new Date().toISOString(),
          auto_submit: true, // Request server to auto-submit
        });

        // Update sessionStorage with server confirmation
        saveViolationToStorage(activeExamId, {
          reason,
          sessionId,
          at: now,
          violationType,
          serverConfirmed: true,
        });

        // If server already auto-submitted, update UI accordingly
        if (result.auto_submit_triggered) {
          setRealtimeMessage(result.message);
          setAutoSubmitted(true);
          setViolationLocked(false);
          clearViolationStorage(activeExamId);
        }
      } catch (error) {
        console.error('[violation] Failed to report to server:', error);
        // Keep local violation state — will retry on countdown
        setRealtimeMessage('Không thể gửi báo cáo vi phạm. Đang thử lại...');
      }
    }

    reportingViolationRef.current = false;
  }, [activeExamId, lastViolationAtRef, sessionId, setAutoSubmitCountdown, setAutoSubmitted, setLockReason, setRealtimeMessage, setViolationLocked, violationTriggeredRef]);

  /** Cảnh cáo lần 1, 2… — chỉ khóa + auto-submit khi đạt MAX_INTEGRITY_STRIKES. */
  const handleIntegrityStrike = useCallback(
    async (
      reason: string,
      violationType:
        | 'fullscreen_exit'
        | 'visibility_hidden'
        | 'window_blur'
        | 'tab_switch'
        | 'devtools_open'
        | 'copy_attempt'
        | 'paste_attempt'
        | 'context_menu'
        | 'other'
    ) => {
      if (violationTriggeredRef.current || autoSubmitted || !examStarted) return;

      const { record, incremented } = registerStrike(activeExamId, sessionId);
      if (!incremented) return;

      setIntegrityStrikes(record.count);
      setFocusLeaveCount(record.count);

      const integrityType =
        violationType === 'tab_switch'
          ? 'visibility_hidden'
          : violationType === 'devtools_open'
            ? 'context_menu'
            : violationType === 'other'
              ? 'window_blur'
              : violationType;

      void trackIntegrityEvent(activeExamId, integrityType, {
        strike: record.count,
        max_strikes: MAX_INTEGRITY_STRIKES,
        reason,
      });

      if (record.count >= MAX_INTEGRITY_STRIKES) {
        void triggerViolationLock(
          t('exam_take.violation_final_reason', { max: MAX_INTEGRITY_STRIKES }),
          violationType
        );
        return;
      }

      const summary = t('exam_take.violation_warning_message', {
        current: record.count,
        max: MAX_INTEGRITY_STRIKES,
      });
      setRealtimeMessage(summary);

      modals.open({
        centered: true,
        title: t('exam_take.violation_warning_title', {
          current: record.count,
          max: MAX_INTEGRITY_STRIKES,
        }),
        children: (
          <Stack gap="md">
            <Text size="sm">{reason}</Text>
            <Text size="sm" c="dimmed">
              {summary}
            </Text>
            <Button color="orange" onClick={() => modals.closeAll()}>
              {t('exam_take.violation_warning_ack')}
            </Button>
          </Stack>
        ),
      });
    },
    [
      activeExamId,
      autoSubmitted,
      examStarted,
      sessionId,
      setFocusLeaveCount,
      setRealtimeMessage,
      t,
      triggerViolationLock,
      violationTriggeredRef,
    ]
  );

  useEffect(() => {
    let canceled = false;

    const bootstrap = async () => {
      if (!examId) {
        setBootError(t('exam_take.boot_error_exam_id'));
        setBootLoading(false);
        return;
      }

      try {
        setBootLoading(true);
        setBootError('');
        const examData = await examApi.getExam(activeExamId);
        if (canceled) return;

        setExamTitle(examData.title || 'Bài thi');
        setExamSection(examData.subject_name || examData.description || '');
        setQuestions([]);
        setQuestionIdByNumber({});
        setSessionId(null);
        setVersionCode(null);
        setCurrentNumber(1);
        setRemainingSeconds(0);
        setExamStarted(false);
        setExamSchedule({
          opens_at: examData.opens_at ?? null,
          ends_at: examData.ends_at ?? null,
          runtime_is_active: examData.runtime_is_active ?? false,
          require_seb: examData.require_seb ?? false,
        });
        setTeacherRuntimeLive(Boolean(examData.runtime_is_active));
      } catch {
        if (canceled) return;
        setBootError(t('exam_take.boot_error_load'));
      } finally {
        if (!canceled) setBootLoading(false);
      }
    };

    void bootstrap();

    return () => {
      canceled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExamId, examId]);

  useEffect(() => {
    if (
      !examId ||
      !examSchedule?.opens_at ||
      teacherRuntimeLive ||
      examStarted ||
      autoSubmitted
    )
      return;
    const poll = async () => {
      try {
        const e = await examApi.getExam(activeExamId);
        setExamSchedule({
          opens_at: e.opens_at ?? null,
          ends_at: e.ends_at ?? null,
          runtime_is_active: e.runtime_is_active ?? false,
          require_seb: e.require_seb ?? false,
        });
        if (e.runtime_is_active) markTeacherRuntimeLive();
      } catch {
        /* ignore transient poll failures */
      }
    };
    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 5000);
    return () => window.clearInterval(id);
  }, [
    activeExamId,
    autoSubmitted,
    examId,
    examSchedule?.opens_at,
    examStarted,
    markTeacherRuntimeLive,
    teacherRuntimeLive,
  ]);

  useEffect(() => {
    if (currentNumber > maxQuestionIndex) {
      setCurrentNumber(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNumber, maxQuestionIndex]);

  // P0 Fix: Restore violation state from sessionStorage on mount/reload
  useEffect(() => {
    if (!sessionId || integrityDisabled) return;

    const savedViolation = loadViolationFromStorage(activeExamId);
    if (!savedViolation) return;

    // Only restore if it's for the same session
    if (savedViolation.sessionId !== sessionId) {
      clearViolationStorage(activeExamId);
      return;
    }

    // Restore violation state
    violationTriggeredRef.current = true;
    setLockReason(savedViolation.reason);
    setViolationLocked(true);

    if (savedViolation.serverConfirmed) {
      // Server already confirmed — just show locked UI and auto-submit
      setRealtimeMessage('Bài thi đã bị khóa do vi phạm trước đó.');
      void submitCurrentSession('auto').then(() => {
        clearViolationStorage(activeExamId);
      });
    } else {
      // Server hasn't confirmed yet — retry reporting
      setRealtimeMessage('Đang xác nhận vi phạm với server...');
      void examApi.reportViolation(sessionId, {
        violation_type: savedViolation.violationType as 'other',
        reason: savedViolation.reason,
        client_at: new Date(savedViolation.at).toISOString(),
        auto_submit: true,
      }).then((result) => {
        saveViolationToStorage(activeExamId, {
          ...savedViolation,
          serverConfirmed: true,
        });
        if (result.auto_submit_triggered) {
          setAutoSubmitted(true);
          setViolationLocked(false);
          clearViolationStorage(activeExamId);
        }
        setRealtimeMessage(result.message);
      }).catch(() => {
        setRealtimeMessage('Không thể xác nhận vi phạm. Bài thi sẽ bị khóa.');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExamId, integrityDisabled, sessionId, setAutoSubmitted, setLockReason, setRealtimeMessage, setViolationLocked, submitCurrentSession]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!examStarted || autoSubmitted) return;
      setRemainingSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, autoSubmitted]);

  // P0 Fix: Fullscreen change with 3-second grace period
  useEffect(() => {
    if (integrityDisabled) return;

    const onFullscreenChange = () => {
      const full = Boolean(document.fullscreenElement);
      setIsFullscreen(full);
      setFsRevision((n) => n + 1);

      if (full) {
        setFullscreenError('');

        // P0 Fix: User returned to fullscreen within grace period — cancel violation
        if (graceTimerRef.current) {
          clearTimeout(graceTimerRef.current);
          graceTimerRef.current = null;
          void trackIntegrityEvent(activeExamId, 'fullscreen_enter', { recovered: true });
          setRealtimeMessage('Đã quay lại toàn màn hình kịp thời.');
          // Reset violation flags if not yet triggered
          if (!violationTriggeredRef.current) {
            setViolationLocked(false);
          }
        } else {
          void trackIntegrityEvent(activeExamId, 'fullscreen_enter');
        }
      } else {
        // Exited fullscreen
        if (examStarted || full) {
          void trackIntegrityEvent(activeExamId, 'fullscreen_exit');
        }

        // P0 Fix: Grace period 3s before triggering violation
        if (isFullscreen && examStarted && !autoSubmitted && !violationTriggeredRef.current) {
          setRealtimeMessage('Phát hiện thoát toàn màn hình. Quay lại trong 3 giây để tiếp tục...');

          graceTimerRef.current = setTimeout(() => {
            graceTimerRef.current = null;
            // Only trigger if still not in fullscreen after grace period
            if (!document.fullscreenElement && examStarted && !autoSubmitted) {
              void handleIntegrityStrike(
                t('exam_take.violation_reason_fullscreen'),
                'fullscreen_exit'
              );
            }
          }, 3000);
        }
      }
    };

    const onFullscreenError = () => {
      setFullscreenError(t('exam_take.fullscreen_error'));
      void trackIntegrityEvent(activeExamId, 'fullscreen_error');
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('fullscreenerror', onFullscreenError);
    onFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('fullscreenerror', onFullscreenError);
      // Clean up grace timer on unmount
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExamId, autoSubmitted, examStarted, handleIntegrityStrike, integrityDisabled, isFullscreen, setIsFullscreen, setRealtimeMessage, setViolationLocked, t]);

  useEffect(() => {
    if (integrityDisabled) return;
    const onVisibilityChange = () => {
      if (!examStarted || autoSubmitted) return;
      if (document.hidden) {
        void handleIntegrityStrike(t('exam_take.violation_reason_tab'), 'visibility_hidden');
      }
    };
    const onWindowBlur = () => {
      if (!examStarted || autoSubmitted) return;
      void handleIntegrityStrike(t('exam_take.violation_reason_blur'), 'window_blur');
    };
    const onWindowFocus = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'window_focus');
    };
    const onCopy = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'copy_attempt');
    };
    const onPaste = () => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'paste_attempt');
    };
    const onContextMenu = (event: MouseEvent) => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'context_menu');
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!examStarted || autoSubmitted) return;
      const key = event.key.toUpperCase();
      const isDevtools =
        key === 'F12' ||
        (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(key)) ||
        (event.metaKey && event.altKey && ['I', 'J', 'C'].includes(key));
      if (!isDevtools) return;
      event.preventDefault();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!examStarted || autoSubmitted) return;
      void trackIntegrityEvent(activeExamId, 'before_unload');
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExamId, autoSubmitted, examStarted, handleIntegrityStrike, integrityDisabled]);
  useEffect(() => {
    if (!examStarted || !sessionId || autoSubmitted) return;
    saveDraftAnswers(activeExamId, answers);
    queueAutosave(activeExamId, answers);
  }, [activeExamId, answers, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    if (!examStarted || !sessionId || autoSubmitted) return;
    const id = window.setInterval(() => {
      void flushAutosaveQueue(activeExamId);
    }, 15000);
    return () => window.clearInterval(id);
  }, [activeExamId, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    const onOnline = () => {
      if (!examStarted || !sessionId || autoSubmitted) return;
      void flushAutosaveQueue(activeExamId);
      void flushIntegrityQueue(activeExamId);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [activeExamId, autoSubmitted, examStarted, sessionId]);

  useEffect(() => {
    if (integrityDisabled) return;
    if (!examStarted || !sessionId || autoSubmitted) return;
    void trackIntegrityEvent(activeExamId, 'exam_opened', { path: window.location.pathname });
  }, [activeExamId, autoSubmitted, examStarted, integrityDisabled, sessionId]);

  useEffect(() => {
    const token = accessToken;
    if (!token) return;

    let socketRef: Socket | null = createExamRealtimeSocket({
      baseUrl: appConfig.apiURL,
      token,
      examId: activeExamId,
      forcePolling: shouldForceSocketPolling(),
      handlers: {
        onState: (payload) => handlersRef.current.onState?.(payload),
        onStarted: (payload) => handlersRef.current.onStarted?.(payload),
        onFinal15: (payload) => handlersRef.current.onFinal15?.(payload),
        onForceSubmit: (payload) => handlersRef.current.onForceSubmit?.(payload),
        onAlert: (payload) => handlersRef.current.onAlert?.(payload),
        onError: (message) => handlersRef.current.onError?.(message),
        onDisconnect: () => handlersRef.current.onDisconnect?.(),
        onReconnecting: () => handlersRef.current.onReconnecting?.(),
        onConnect: () => handlersRef.current.onConnect?.(),
        // P0 Fix: Handle server-confirmed violation
        onViolationConfirmed: (payload) => handlersRef.current.onViolationConfirmed?.(payload),
      },
    });

    return () => {
      if (!socketRef) return;
      socketRef.emit('exam:leave', { examId: activeExamId });
      socketRef.close();
      socketRef = null;
    };
  }, [activeExamId, accessToken]);

  useEffect(() => {
    if (!teacherRuntimeLive || autoSubmitted || violationLocked || examStarted) return;
    if (!integrityDisabled && !document.fullscreenElement) return;
    void ensureSessionStarted();
  }, [
    teacherRuntimeLive,
    examStarted,
    integrityDisabled,
    autoSubmitted,
    violationLocked,
    fsRevision,
    ensureSessionStarted,
  ]);

  useEffect(() => {
    if (!violationLocked || autoSubmitted) return;
    if (!sessionId) return;
    const id = window.setTimeout(() => {
      if (autoSubmitCountdown <= 1) {
        forceAutoSubmit();
        return;
      }
      setAutoSubmitCountdown((v) => v - 1);
    }, 1000);
    return () => window.clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [violationLocked, autoSubmitCountdown, autoSubmitted, forceAutoSubmit, sessionId]);

  useEffect(() => {
    if (!examStarted || autoSubmitted) return;
    if (!sessionId) return;
    if (remainingSeconds <= 0) {
      forceAutoSubmit();
    }
  }, [examStarted, remainingSeconds, autoSubmitted, forceAutoSubmit, sessionId]);

  useEffect(() => {
    if (!autoSubmitted || submitFailed || !examId) return;
    const id = window.setTimeout(() => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      navigate(`/result/${examId}`, { replace: true });
    }, 3000);
    return () => window.clearTimeout(id);
  }, [autoSubmitted, submitFailed, examId, navigate]);

  const currentQuestion = resolveQuestion(currentNumber);

  const answered = (() => {
    const s = new Set<number>();
    for (let n = 1; n <= total; n += 1) {
      const q = byNumber.get(n) ?? placeholderQuestion(n);
      if (isQuestionAnswered(q, answers)) s.add(n);
    }
    return s;
  })();

  const setAnswer = (key: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentNumber)) next.delete(currentNumber);
      else next.add(currentNumber);
      return next;
    });
  };

  const goPrev = () => setCurrentNumber((n) => Math.max(1, n - 1));
  const goNext = () => setCurrentNumber((n) => Math.min(maxQuestionIndex, n + 1));

  const handleSubmit = () => {
    const modalId = 'exam-submit-confirm';
    const buildSubmitMessage = () => {
      const left = formatHms(remainingRef.current);
      return remainingRef.current > 0
        ? t('exam_take.submit_remaining', { left })
        : t('exam_take.submit_time_up');
    };

    const updateInterval = window.setInterval(() => {
      modals.updateModal({
        modalId,
        title: t('exam_take.submit_title'),
        centered: true,
        children: <Text size="sm">{buildSubmitMessage()}</Text>,
      });
    }, 1000);

    modals.openConfirmModal({
      modalId,
      centered: true,
      title: t('exam_take.submit_title'),
      children: <Text size="sm">{buildSubmitMessage()}</Text>,
      labels: { confirm: t('common.submit_exam'), cancel: t('common.cancel') },
      confirmProps: { color: 'primary' },
      onCancel: () => window.clearInterval(updateInterval),
      onConfirm: () => {
        window.clearInterval(updateInterval);
        void submitCurrentSession('manual');
        modals.closeAll();
      },
      onClose: () => window.clearInterval(updateInterval),
    });
  };

  const waitingScheduleParts = useMemo(
    () =>
      examSchedule
        ? getExamScheduleParts({ ...examSchedule, closes_at: null })
        : { start: null as string | null, end: null as string | null },
    [examSchedule]
  );

  if (bootLoading) {
    return (
      <Box className={`${classes.root} ${classes.rootCentered}`}>
        <ExamTakeGateCard>
          <Text fw={700} size="lg" mb={8}>
            {t('exam_take.boot_loading_title')}
          </Text>
          <Text c="dimmed" size="sm">
            {t('exam_take.boot_loading_desc')}
          </Text>
        </ExamTakeGateCard>
      </Box>
    );
  }

  if (bootError) {
    return (
      <Box className={`${classes.root} ${classes.rootCentered}`}>
        <ExamTakeGateCard>
          <Text fw={700} size="lg" c="red" mb={8}>
            {t('exam_take.boot_error_title')}
          </Text>
          <Text size="sm">{bootError}</Text>
        </ExamTakeGateCard>
      </Box>
    );
  }

  void fsRevision;

  const beforeOpensGate =
    Boolean(examSchedule?.opens_at) &&
    !teacherRuntimeLive &&
    isBeforeExamOpens({ opens_at: examSchedule!.opens_at! }, waitNowMs);

  const scheduledAutoPendingGate =
    Boolean(examSchedule?.opens_at) && !beforeOpensGate && !teacherRuntimeLive;

  const scheduleOpensCountdown =
    examSchedule?.opens_at != null && examSchedule.opens_at !== ''
      ? formatCountdownHms(
          msUntilOpensAt({ opens_at: examSchedule.opens_at }, waitNowMs) ?? 0
        )
      : '';

  const showFullscreenRequired =
    !integrityDisabled &&
    !inBrowserFullscreen &&
    !autoSubmitted &&
    !violationLocked &&
    (teacherRuntimeLive || (examStarted && total > 0));

  const isSeb = /safeexambrowser|seb/i.test(navigator.userAgent);
  const sebWarning = examSchedule?.require_seb && !isSeb;

  const canShowExamShell =
    examStarted && total > 0 && (integrityDisabled || inBrowserFullscreen);

  const showWaitingGate =
    !autoSubmitted &&
    !violationLocked &&
    !showFullscreenRequired &&
    !teacherRuntimeLive &&
    !examStarted &&
    !sessionLoading;

  const isCenteredGateView =
    showWaitingGate ||
    showFullscreenRequired ||
    sessionLoading ||
    autoSubmitted ||
    violationLocked;

  return (
    <Box
      className={`${classes.root}${isCenteredGateView ? ` ${classes.rootCentered}` : ''}`}
      ref={rootRef}
    >
      {autoSubmitted && (
        <ExamTakeGateCard>
          <Text fw={700} size="lg" mb={8}>
            {submitFailed ? t('exam_take.submit_failed_title') : t('exam_take.submit_success_title')}
          </Text>
          <Text c="dimmed" size="sm">
            {submitFailed ? t('exam_take.submit_failed_desc') : t('exam_take.submit_success_desc')}
          </Text>
          {!submitFailed && submitResult && (
            <Box mt="md" ta="left">
              {(() => {
                const essays = submitResult.details.filter((d) => d.question_type === 'essay');
                const mcqScore = submitResult.score;
                const mcqMax = submitResult.session.max_points ?? 10;
                const mcqCorrect = submitResult.correct_count;
                return (
                  <Stack gap={6}>
                    <Text size="sm" fw={600}>{t('exam_take.submit_mcq_graded')}</Text>
                    <Text size="sm">
                      {t('exam_take.submit_mcq_summary', {
                        correct: mcqCorrect,
                        total: submitResult.total_questions,
                        score: formatExamScore(mcqScore),
                        max: formatExamScore(mcqMax),
                      })}
                    </Text>
                    {essays.length > 0 && (
                      <Text size="sm" c="yellow.8">
                        {t('exam_take.submit_essay_pending', { count: essays.length })}
                      </Text>
                    )}
                  </Stack>
                );
              })()}
            </Box>
          )}
          {!submitFailed && examId && (
            <Button
              mt="md"
              variant="light"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                navigate(`/result/${examId}`, { replace: true });
              }}
            >
              {t('exam_take.submit_view_result_now')}
            </Button>
          )}
          {!!serverForceSummaryText && (
            <Text size="sm" mt={8}>
              {serverForceSummaryText}
            </Text>
          )}
        </ExamTakeGateCard>
      )}

      {!autoSubmitted && violationLocked && (
        <ExamTakeGateCard>
          <Text fw={700} size="lg" c="red" mb={8}>
            {t('exam_take.violation_locked_title')}
          </Text>
          <Text size="sm" mb={8}>
            {lockReason}
          </Text>
          <Text c="dimmed" size="sm">
            {t('exam_take.violation_auto_submit', { seconds: autoSubmitCountdown })}
          </Text>
        </ExamTakeGateCard>
      )}

      {showFullscreenRequired && (
        <ExamTakeGateCard>
          <Text fw={700} size="lg" mb={8} c="teal">
            {t('exam_take.exam_started_title')}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {t('exam_take.exam_started_fullscreen_desc')}
          </Text>
          {!!fullscreenError && (
            <Text c="red" size="sm" mb="md">
              {fullscreenError}
            </Text>
          )}
          {!sebWarning && (
            <Button
              size="md"
              color="teal"
              leftSection={<IconArrowsMaximize size={18} />}
              onClick={() => void requestFullscreen()}
            >
              {t('exam_take.exam_started_fullscreen_button')}
            </Button>
          )}
        </ExamTakeGateCard>
      )}
      {!autoSubmitted && !violationLocked && !showFullscreenRequired && sessionLoading && (
        <ExamTakeGateCard>
          <Text fw={700} size="lg" mb={8}>
            {t('exam_take.loading_exam_title')}
          </Text>
          <Text c="dimmed" size="sm">
            {t('exam_take.loading_exam_desc')}
          </Text>
        </ExamTakeGateCard>
      )}
      {showWaitingGate && (
        <ExamTakeGateCard>
          {!integrityDisabled && !inBrowserFullscreen && (
            <Stack gap="sm" mb="lg">
              <Text fw={700} size="lg">
                {t('exam_take.fullscreen_title')}
              </Text>
              <Text c="dimmed" size="sm">
                {t('exam_take.fullscreen_desc')}
              </Text>
              {!!fullscreenError && (
                <Text c="red" size="sm">
                  {fullscreenError}
                </Text>
              )}
              {!sebWarning && (
                <Button
                  color="blue"
                  leftSection={<IconArrowsMaximize size={16} />}
                  onClick={() => void requestFullscreen()}
                >
                  {t('exam_take.fullscreen_button')}
                </Button>
              )}
            </Stack>
          )}
          <Text fw={700} size="lg" mb={8}>
            {beforeOpensGate
              ? t('exam_take.waiting_before_schedule_title')
              : scheduledAutoPendingGate
                ? t('exam_take.waiting_scheduled_title')
                : t('exam_take.waiting_teacher_title')}
          </Text>
          <Text c="dimmed" size="sm" mb="md">
            {beforeOpensGate
              ? t('exam_take.waiting_before_schedule_desc', {
                  start: waitingScheduleParts.start ?? '—',
                  end: waitingScheduleParts.end ?? '—',
                  countdown: scheduleOpensCountdown,
                })
              : scheduledAutoPendingGate
                ? t('exam_take.waiting_scheduled_desc', {
                    end: waitingScheduleParts.end ?? '—',
                  })
                : t('exam_take.waiting_teacher_desc')}
          </Text>
          {sebWarning && (
            <Alert color="red" title="Yêu cầu Trình duyệt Chống gian lận" mb="md" variant="filled">
              Bạn phải tải và mở link này bằng phần mềm <strong>Safe Exam Browser (SEB)</strong> để làm bài thi.
              Trình duyệt hiện tại của bạn không được hỗ trợ.
            </Alert>
          )}
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              navigate('/exams');
            }}
          >
            {t('exam_take.exit_room')}
          </Button>
        </ExamTakeGateCard>
      )}
      {!autoSubmitted && !violationLocked && canShowExamShell && !showFullscreenRequired && (
        <div className={classes.shell}>
          <ExamTakeHeader
            title={examTitle}
            section={examSection}
            remainingLabel={formatHms(remainingSeconds)}
            onSubmit={handleSubmit}
            submitting={submitting}
            versionCode={versionCode}
            connectionStatus={connectionStatus}
          />

          {integrityStrikes > 0 && (
            <Box className={classes.shellSpanAll}>
              <Alert
                color={integrityStrikes >= MAX_INTEGRITY_STRIKES - 1 ? 'orange' : 'yellow'}
                variant="light"
                title={t('exam_take.violation_strike_banner_title', {
                  current: integrityStrikes,
                  max: MAX_INTEGRITY_STRIKES,
                })}
              >
                {t('exam_take.violation_strike_banner_body', {
                  remaining: MAX_INTEGRITY_STRIKES - integrityStrikes,
                })}
              </Alert>
            </Box>
          )}

          <div>
            <ExamQuestionPanel
              question={currentQuestion}
              displayIndex={currentNumber}
              totalQuestions={maxQuestionIndex}
              isFlagged={flagged.has(currentNumber)}
              onToggleFlag={toggleFlag}
              answers={answers}
              onAnswerChange={setAnswer}
            />
            <Box
              className={classes.mainCard}
              mt="md"
              style={{ paddingTop: 12, paddingBottom: 12 }}
            >
              <div className={classes.footerNav} style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}>
                <Button
                  variant="default"
                  radius="md"
                  leftSection={<IconArrowLeft size={18} />}
                  onClick={goPrev}
                  disabled={currentNumber <= 1}
                >
                  {t('exam_take.prev_question')}
                </Button>
                <Button
                  radius="md"
                  rightSection={<IconArrowRight size={18} />}
                  onClick={goNext}
                  disabled={currentNumber >= maxQuestionIndex}
                >
                  {t('exam_take.next_question')}
                </Button>
              </div>
            </Box>
          </div>

          <QuestionNavigator
            total={total}
            current={currentNumber}
            answered={answered}
            flagged={flagged}
            filter={navFilter}
            onFilterChange={setNavFilter}
            onSelect={setCurrentNumber}
          />
        </div>
      )}
      {!autoSubmitted && !isFullscreen && (
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {t('exam_take.leave_count', { count: focusLeaveCount, max: MAX_INTEGRITY_STRIKES })}
        </Text>
      )}
      {!autoSubmitted && realtimeMessage && examStarted && canShowExamShell && (
        <Text size="xs" c="dimmed" ta="center" mt="xs">
          {realtimeMessage}
        </Text>
      )}
    </Box>
  );
};

export default ExamTake;
