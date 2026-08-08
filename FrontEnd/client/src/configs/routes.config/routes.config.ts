import { lazyWithRetry as lazy } from '@/utils/lazyWithRetry';
import {
  IconBooks,
  IconCalendarStats,
  IconFileAnalytics,
  IconGauge,
  IconLock,
  IconNotes,
  IconPencilCheck,
  IconSchool,
  IconFolders,
} from '@tabler/icons-react';
import authRoute from './authRoute';
import type { NavGroup, Routes } from '@/@types/routes';

export const publicRoutes: Routes = [
  ...authRoute,
  {
    key: 'reset-password',
    path: '/reset-password',
    component: lazy(() => import('@/pages/auth/ResetPassword/ResetPassword')),
    authority: ['user', 'admin', 'teacher'],
  },
];

export const navGroups: NavGroup[] = [
  {
    key: 'exams',
    labelKey: 'nav.exams',
    icon: IconFileAnalytics,
    order: 2,
  },
  {
    key: 'student_management',
    labelKey: 'nav.student_management',
    icon: IconCalendarStats,
    order: 7,
  },
  {
    key: 'user_management',
    labelKey: 'nav.user_management',
    icon: IconCalendarStats,
    order: 6,
  },
  {
    key: 'admin_tools',
    labelKey: 'nav.admin_tools',
    icon: IconGauge,
    order: 8,
  },
  {
    key: 'my_results',
    labelKey: 'nav.my_results',
    icon: IconNotes,
    order: 10,
  },
  {
    key: 'security',
    labelKey: 'nav.security',
    icon: IconLock,
    order: 11,
  },
];

export const protectedRoutes: Routes = [
  {
    key: 'main',
    path: '/main',
    component: lazy(() => import('@/pages/main/Dashboard/Dashboard')),
    authority: ['user', 'admin', 'teacher'],
    nav: {
      labelKey: 'nav.main',
      position: 'main',
      icon: IconGauge,
      order: 1,
    },
  },
  {
    key: 'exam-list',
    path: '/exams',
    component: lazy(() => import('@/pages/main/Exam/ExamList')),
    authority: ['user', 'teacher'],
    nav: {
      labelKey: 'nav.exam_list',
      position: 'sub',
      groupKey: 'exams',
      order: 1,
    },
  },
  {
    key: 'exam-authoring',
    path: '/exams/new',
    component: lazy(() => import('@/pages/main/Exam/ExamAuthoring')),
    authority: ['teacher'],
    nav: {
      labelKey: 'nav.exam_create',
      position: 'sub',
      groupKey: 'exams',
      order: 2,
    },
  },
  {
    key: 'exam-authoring-edit',
    path: '/exams/:examId/edit',
    component: lazy(() => import('@/pages/main/Exam/ExamAuthoring')),
    authority: ['teacher'],
  },
  {
    key: 'exam-take',
    path: '/exam/:examId',
    component: lazy(() => import('@/pages/main/Exam/ExamTake')),
    authority: ['user', 'admin', 'teacher'],
  },
  {
    key: 'exam-result',
    path: '/result/:examId',
    component: lazy(() => import('@/pages/main/Exam/ExamResult')),
    authority: ['user', 'admin', 'teacher'],
  },
  {
    key: 'prediction',
    path: '/prediction',
    component: lazy(() => import('@/pages/main/Exam/Prediction')),
    authority: ['user'],
    nav: {
      labelKey: 'nav.prediction',
      position: 'main',
      icon: IconFileAnalytics,
      order: 9,
    },
  },
  {
    key: 'my-results',
    path: '/my-results',
    component: lazy(() => import('@/pages/main/Exam/MyResults')),
    authority: ['user'],
    nav: {
      labelKey: 'nav.my_results',
      position: 'sub',
      groupKey: 'my_results',
      order: 1,
    },
  },
  {
    key: 'grade-lookup',
    path: '/grade-lookup',
    component: lazy(() => import('@/pages/student/GradeLookup')),
    authority: ['user'],
    nav: {
      labelKey: 'nav.grade_lookup',
      position: 'sub',
      groupKey: 'my_results',
      order: 2,
    },
  },
  {
    key: 'change-password-required',
    path: '/change-password-required',
    component: lazy(() => import('@/pages/auth/ChangePasswordRequired/ChangePasswordRequired')),
    authority: ['user', 'teacher'],
  },
  {
    key: 'profile',
    path: '/profile',
    component: lazy(() => import('@/pages/main/Profile/Profile')),
    authority: ['user', 'admin', 'teacher'],
    nav: {
      labelKey: 'nav.change_password',
      position: 'sub',
      groupKey: 'security',
      order: 1,
    },
  },
  {
    key: 'student-management',
    path: '/admin/students',
    component: lazy(() => import('@/pages/main/Admin/StudentManagement')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.user_list',
      position: 'sub',
      groupKey: 'user_management',
      order: 1,
    },
  },
  {
    key: 'admin-class-management',
    path: '/admin/admin-classes',
    component: lazy(() => import('@/pages/main/Admin/AdminClassManagement')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.admin_class_management',
      position: 'sub',
      groupKey: 'user_management',
      order: 2,
    },
  },
  {
    key: 'teacher-students',
    path: '/teacher/students',
    component: lazy(() => import('@/pages/main/Teacher/TeacherStudents')),
    authority: ['teacher'],
    nav: {
      labelKey: 'nav.teacher_student_list',
      position: 'sub',
      groupKey: 'student_management',
      order: 2,
    },
  },
  // --- Index pages (no param, list view) ---
  {
    key: 'grading',
    path: '/grading',
    component: lazy(() => import('@/pages/main/Grading/GradingIndex')),
    authority: ['teacher'],
    nav: {
      labelKey: 'nav.grading',
      position: 'main',
      icon: IconPencilCheck,
      order: 5,
    },
  },
  // --- Detail pages (with param) ---
  {
    key: 'grading-session',
    path: '/grading/:sessionId',
    component: lazy(() => import('@/pages/main/Grading/Grading')),
    authority: ['teacher'],
  },
  {
    key: 'exam-sessions',
    path: '/exam-sessions',
    component: lazy(() => import('@/pages/main/Exam/ExamSessions')),
    authority: ['admin', 'teacher'],
  },
  {
    key: 'question-bank',
    path: '/question-bank',
    component: lazy(() => import('@/pages/main/Exam/QuestionBank')),
    authority: ['teacher'],
    nav: {
      labelKey: 'nav.question_bank',
      position: 'main',
      icon: IconBooks,
      order: 4,
    },
  },
  {
    key: 'program-management',
    path: '/admin/programs',
    component: lazy(() => import('@/pages/main/Admin/ProgramManagement')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.program_management',
      position: 'main',
      icon: IconSchool,
      order: 3,
    },
  },
  {
    key: 'subject-catalog',
    path: '/admin/subject-catalog',
    component: lazy(() => import('@/pages/main/Admin/SubjectCatalogManagement')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.subject_catalog',
      position: 'main',
      icon: IconFolders,
      order: 4,
    },
  },
  {
    key: 'subject-management-legacy',
    path: '/admin/subjects',
    component: lazy(() => import('@/pages/main/Admin/SubjectCatalogManagement')),
    authority: ['admin'],
  },
  {
    key: 'exam-sessions-detail',
    path: '/exam-sessions/:examId',
    component: lazy(() => import('@/pages/main/Exam/ExamSessions')),
    authority: ['admin', 'teacher'],
  },
  {
    key: 'password-reset-management',
    path: '/admin/password-resets',
    component: lazy(() => import('@/pages/main/Admin/PasswordResetManagement')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.password_reset',
      position: 'sub',
      groupKey: 'admin_tools',
      order: 3,
    },
  },
  {
    key: 'score-analytics',
    path: '/score-analytics',
    component: lazy(() => import('@/pages/main/Exam/ScoreAnalytics')),
    authority: ['admin', 'teacher'],
    nav: {
      labelKey: 'nav.score_analytics',
      position: 'main',
      icon: IconFileAnalytics,
      order: 6,
    },
  },
  {
    key: 'audit-log',
    path: '/admin/audit-logs',
    component: lazy(() => import('@/pages/main/Admin/AuditLogPage')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.audit_logs',
      position: 'sub',
      groupKey: 'admin_tools',
      order: 1,
    },
  },
  {
    key: 'system-report',
    path: '/admin/system-report',
    component: lazy(() => import('@/pages/main/Admin/SystemReportPage')),
    authority: ['admin'],
    nav: {
      labelKey: 'nav.system_report',
      position: 'sub',
      groupKey: 'admin_tools',
      order: 2,
    },
  },
];