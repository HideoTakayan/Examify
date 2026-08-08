export type QuestionNavigatorFilter = 'all' | 'unanswered' | 'flagged';

export type McqOption = { key: string; label: string };

export type CompositePart =
  | {
      id: string;
      kind: 'mcq';
      prompt: string;
      badge?: string;
      options: McqOption[];
    }
  | {
      id: string;
      kind: 'essay';
      prompt: string;
      badge?: string;
      placeholder?: string;
      maxWords?: number;
    };

export type FillSegment =
  | { type: 'text'; value: string }
  | { type: 'blank'; id: string; placeholder?: string };

export type MockExamQuestion = {
  /** 1-based index shown in navigator */
  number: number;
  points?: number;
  type: 'mcq' | 'audio_mcq' | 'image_mcq' | 'essay' | 'fill_blank' | 'composite';
  prompt: string;
  /** Ảnh / audio / video từ server (vd. Cloudinary) — mcq & essay */
  media_url?: string | null;
  badge?: string;
  audioClipLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
  options?: McqOption[];
  essay?: {
    placeholder?: string;
    maxWords?: number;
  };
  fillSegments?: FillSegment[];
  /** Video + nhiều câu con trong một màn */
  composite?: {
    videoCaption?: string;
    viewsRemainingBadge?: string;
    parts: CompositePart[];
  };
  sidebarNote?: string;
};

export type MockExamMeta = {
  title: string;
  section: string;
  totalQuestions: number;
  questions: MockExamQuestion[];
};
